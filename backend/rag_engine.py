# backend/rag_engine.py
import os
import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import numpy as np
import google.generativeai as genai
import pickle
from sklearn.metrics.pairwise import cosine_similarity
import json
import trafilatura
import re
import yt_dlp
import whisper

# --- Configuration ---
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
VECTOR_STORES_DIR = os.path.join(os.path.dirname(__file__), 'vector_stores')
TEMP_AUDIO_DIR = os.path.join(os.path.dirname(__file__), 'temp_audio')

if not os.path.exists(VECTOR_STORES_DIR):
    os.makedirs(VECTOR_STORES_DIR)
if not os.path.exists(TEMP_AUDIO_DIR):
    os.makedirs(TEMP_AUDIO_DIR)

if not os.path.exists(VECTOR_STORES_DIR):
    os.makedirs(VECTOR_STORES_DIR)

# --- Core Functions ---

def process_pdf_and_get_chunks(pdf_file_stream):
    """
    Loads a PDF, extracts text, and splits it into chunks.
    """
    reader = PyPDF2.PdfReader(pdf_file_stream)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    return chunks

def process_url(url):
    """
    Detects the URL type (YouTube or generic web page), processes it, 
    and returns the text chunks and a title.
    """
    # YouTube URL detection
    youtube_regex = r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    is_youtube_url = re.match(youtube_regex, url)

    if is_youtube_url:
        try:
            # --- YouTube Processing ---
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(TEMP_AUDIO_DIR, '%(id)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_id = info.get('id')
                ext = info.get('ext')
                title = info.get('title', 'YouTube Video')
                temp_audio_path = os.path.join(TEMP_AUDIO_DIR, f"{video_id}.mp3")

            # Transcribe with Whisper
            model = whisper.load_model("base") # "base" is a good balance of speed and accuracy
            result = model.transcribe(temp_audio_path)
            text = result['text']

            # Clean up the temporary audio file
            os.remove(temp_audio_path)

        except Exception as e:
            print(f"Error processing YouTube URL: {e}")
            return None, None
    else:
        # --- Generic Web Page Processing ---
        downloaded = trafilatura.fetch_url(url)
        if downloaded is None:
            return None, None
        
        text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        metadata = trafilatura.extract_metadata(downloaded)
        title = metadata.title if metadata and metadata.title else (url.split('/')[-1] or url)

    if not text:
        return None, None

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    return chunks, title


def get_all_text_for_course(document_models):
    """
    Loads and concatenates all text chunks from a list of document models.
    """
    full_text = ""
    for doc in document_models:
        chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
        if os.path.exists(chunks_path):
            with open(chunks_path, 'rb') as f:
                chunks = pickle.load(f)
                full_text += f"\n\n--- Content from {doc.filename} ---\n"
                full_text += "\n".join(chunks)
    return full_text

def create_vector_store(chunks, course_id, document_id):
    """
    Takes text chunks, generates embeddings, and saves them to files specific to a document.
    """
    try:
        model = SentenceTransformer(EMBEDDING_MODEL)
        embeddings = model.encode(chunks, convert_to_tensor=False)

        if len(embeddings) == 0:
            return None

        course_vector_dir = os.path.join(VECTOR_STORES_DIR, f"course_{course_id}")
        os.makedirs(course_vector_dir, exist_ok=True)
        
        vector_path = os.path.join(course_vector_dir, f"doc_{document_id}_vectors.pkl")
        chunks_path = os.path.join(course_vector_dir, f"doc_{document_id}_chunks.pkl")

        with open(vector_path, 'wb') as f:
            pickle.dump(embeddings, f)

        with open(chunks_path, 'wb') as f:
            pickle.dump(chunks, f)

        return os.path.abspath(vector_path)

    except Exception as e:
        print(f"Error creating vector store: {e}")
        return None

def query_rag(question, course_id, document_models):
    """
    Performs RAG using the saved vector stores for all documents in a course.
    """
    try:
        if not document_models:
            return "No course materials found. Please ask the instructor to upload documents."

        all_chunks_with_metadata = []
        all_embeddings = []

        for doc in document_models:
            if os.path.exists(doc.vector_store_path):
                chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
                if os.path.exists(chunks_path):
                    with open(doc.vector_store_path, 'rb') as f:
                        embeddings = pickle.load(f)
                        all_embeddings.append(embeddings)
                    with open(chunks_path, 'rb') as f:
                        chunks = pickle.load(f)
                        for chunk in chunks:
                            all_chunks_with_metadata.append({
                                "document_id": doc.id,
                                "filename": doc.filename,
                                "content": chunk
                            })

        if not all_embeddings:
            return "Could not load any course materials. Please check the uploaded documents."

        all_doc_embeddings = np.vstack(all_embeddings)

        model = SentenceTransformer(EMBEDDING_MODEL)
        question_embedding = model.encode([question])

        similarities = cosine_similarity(question_embedding, all_doc_embeddings)
        k = 5 # Increased K for better context with gemini-2.5-flash
        top_k_indices = np.argsort(similarities[0])[-k:][::-1]

        # Build context with metadata
        context_with_sources = []
        for i in top_k_indices:
            chunk_info = all_chunks_with_metadata[i]
            context_with_sources.append({
                "source_id": chunk_info["document_id"],
                "source_filename": chunk_info["filename"],
                "content": chunk_info["content"]
            })

        return generate_answer(question, context_with_sources)

    except Exception as e:
        print(f"Error during RAG query: {e}")
        return {"answer": "An error occurred while processing your question.", "sources": []}


def generate_answer(question, context_with_sources):
    """
    Generates an answer using the Gemini model based on the provided context and returns sources.
    """
    try:
        # Create a unique list of sources for citation mapping
        unique_sources = []
        source_map = {}
        citation_counter = 1
        
        full_context_text = ""
        for item in context_with_sources:
            source_key = f"{item['source_id']}-{item['source_filename']}"
            if source_key not in source_map:
                source_map[source_key] = citation_counter
                unique_sources.append({
                    "document_id": item['source_id'],
                    "filename": item['source_filename'],
                    "citation_number": citation_counter
                })
                citation_counter += 1
            
            # Add content to the full context text, referencing its citation number
            full_context_text += f"Source [{source_map[source_key]}]: {item['source_filename']}\n---\n{item['content']}\n---\n\n"

    
        prompt = f"""
        You are a helpful and knowledgeable tutor. Your students will ask you questions about the course materials.
        Answer the user's question based *only* on the provided context.
        For each piece of information you use, cite the source document using the format [citation_number].
        The citation number corresponds to the source provided in the context, e.g., Source [1]: filename.
        If the answer is not found in the context, say "I'm sorry, I can't find the answer in the provided documents."

        Context:
        {full_context_text}

        Question:
        {question}

        Answer:
        """
        model = genai.GenerativeModel('gemini-2.5-flash')
        print(f"Prompt length: {len(prompt)} characters")
        response = model.generate_content(prompt)
        print(f"Raw Gemini response: {response}")
        
        if not response.text or not response.parts:
            print("Gemini model returned an empty or invalid response.")
            return {"answer": "I apologize, but I couldn't generate a response at this time. Please try again.", "sources": []}

        # Extract the answer text
        answer_text = response.text
        print(f"Extracted answer text length: {len(answer_text)}")

        # Return both the answer and the unique sources
        return {"answer": answer_text, "sources": unique_sources}

    except Exception as e:
        print(f"Error generating answer: {e}")
        return {"answer": "An error occurred while generating the answer.", "sources": []}

def search_documents(search_query, course_id, document_models):
    """
    Performs a search across all documents in a course and returns matching text chunks.
    """
    try:
        if not document_models:
            return []

        all_chunks_with_metadata = []
        all_embeddings = []

        for doc in document_models:
            if os.path.exists(doc.vector_store_path):
                chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
                if os.path.exists(chunks_path):
                    with open(doc.vector_store_path, 'rb') as f:
                        embeddings = pickle.load(f)
                        all_embeddings.append(embeddings)
                    with open(chunks_path, 'rb') as f:
                        chunks = pickle.load(f)
                        for i, chunk in enumerate(chunks):
                            all_chunks_with_metadata.append({
                                "source": doc.filename,
                                "content": chunk,
                                "page_number": i + 1 # Simple approximation
                            })

        if not all_embeddings:
            return []

        all_doc_embeddings = np.vstack(all_embeddings)

        model = SentenceTransformer(EMBEDDING_MODEL)
        query_embedding = model.encode([search_query])

        similarities = cosine_similarity(query_embedding, all_doc_embeddings)
        # Return top 10 results for a search query
        top_k_indices = np.argsort(similarities[0])[-10:][::-1]

        search_results = []
        for i in top_k_indices:
            search_results.append(all_chunks_with_metadata[i])
        
        return search_results

    except Exception as e:
        print(f"Error during document search: {e}")
        return []


def generate_quiz_from_docs(document_models):
    """
    Generates a quiz based on the content of all provided documents.
    """
    try:
        if not document_models:
            return {"error": "No documents found to generate a quiz from."}

        full_context = ""
        # To avoid making the context too large, we'll take a sample of chunks from each document
        for doc in document_models:
            chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            if os.path.exists(chunks_path):
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                    # Add the first 5 chunks of each document to the context
                    full_context += f"Source: {doc.filename}\n---\n" + "\n".join(chunks[:5]) + "\n---\n\n"
        
        if not full_context.strip():
            return {"error": "Could not extract any text from the documents."}

        prompt = f"""
        You are a helpful assistant designed to create educational quizzes. Based on the following context from multiple documents, generate a quiz with exactly 5 multiple-choice questions.

        Instructions:
        1.  The questions should cover key concepts from the provided text.
        2.  For each question, provide 4 options (A, B, C, D).
        3.  Clearly indicate the correct answer for each question.
        4.  Return the result as a single, valid JSON object. Do not include any text or formatting outside of the JSON object.
        5.  The JSON object should be an array of question objects, where each object has the following keys: "question", "options", "answer".
        6.  The "options" key should hold an object with keys "A", "B", "C", "D".

        **Context from course materials:**
        ---
        {full_context}
        ---

        **JSON Output:**
        """
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Clean the response to get only the JSON part
        json_response_text = response.text.strip().replace("```json", "").replace("```", "")
        
        quiz_data = json.loads(json_response_text)
        return {"quiz": quiz_data}

    except Exception as e:
        print(f"Error generating quiz: {e}")
        return {"error": "Failed to generate quiz. The AI may have returned an invalid format."}


def delete_document_from_course(vector_store_path):
    """
    Deletes a document's vector store files based on the provided path.
    """
    try:
        # The path from the DB is the source of truth
        if not vector_store_path or not os.path.exists(vector_store_path):
            return True, "Vector store path not found or already deleted."

        vector_path = vector_store_path
        chunks_path = vector_path.replace('_vectors.pkl', '_chunks.pkl')
        
        if os.path.exists(vector_path):
            os.remove(vector_path)
        
        if os.path.exists(chunks_path):
            os.remove(chunks_path)
            
        return True, "Vector data deleted successfully."

    except Exception as e:
        print(f"Error deleting document vectors: {e}")
        return False, f"Error deleting vector data: {e}"

def generate_study_guide_from_text(full_text):
    """
    Generates a study guide by streaming from the Gemini model.
    """
    prompt = f"""
    You are an expert academic assistant. Based on the entire text from the course materials provided below, generate a comprehensive study guide.

    The study guide should be well-structured and include the following sections:
    1.  **High-Level Summary:** A one-paragraph overview of the entire course material.
    2.  **Key Concepts & Definitions:** A detailed glossary of the most important terms, concepts, and definitions.
    3.  **Detailed Topic Summaries:** A section-by-section summary of the main topics covered in the documents.
    4.  **Potential Discussion Questions:** A list of 5-7 thought-provoking questions that could be used for discussion or exam preparation.

    Format the output using Markdown for clear headings, lists, and emphasis.

    **Course Materials:**
    ---
    {full_text}
    ---

    **Study Guide:**
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    response_stream = model.generate_content(prompt, stream=True)
    
    for chunk in response_stream:
        if chunk.text:
            yield chunk.text