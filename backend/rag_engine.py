# backend/rag_engine.py
import os
import PyPDF2
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import numpy as np
import pickle
from sklearn.metrics.pairwise import cosine_similarity
import json
import trafilatura
import re
import yt_dlp

# Import LLM provider abstraction
try:
    from llm_provider import get_provider
except ImportError:
    from .llm_provider import get_provider

# Whisper is optional - only needed for YouTube transcription
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    whisper = None
    WHISPER_AVAILABLE = False
    print("Warning: whisper not available. YouTube transcription disabled.")

# --- Configuration ---
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'data'))
VECTOR_STORES_DIR = os.path.join(DATA_DIR, 'vector_stores')
TEMP_AUDIO_DIR = os.path.join(DATA_DIR, 'temp_audio')

if not os.path.exists(VECTOR_STORES_DIR):
    os.makedirs(VECTOR_STORES_DIR)
if not os.path.exists(TEMP_AUDIO_DIR):
    os.makedirs(TEMP_AUDIO_DIR)

if not os.path.exists(VECTOR_STORES_DIR):
    os.makedirs(VECTOR_STORES_DIR)

# --- Core Functions ---

def process_pdf_and_get_chunks(pdf_file_stream):
    """
    Loads a PDF, extracts text with page tracking, and splits it into chunks with metadata.
    Returns list of dicts: [{"text": str, "page": int, "chunk_index": int}, ...]
    """
    reader = PyPDF2.PdfReader(pdf_file_stream)
    
    # Extract text page by page with page numbers
    pages_text = []
    for page_num, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages_text.append({"text": page_text, "page": page_num})

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    
    # Process each page and track which page each chunk came from
    chunks_with_metadata = []
    chunk_index = 0
    
    for page_info in pages_text:
        page_chunks = text_splitter.split_text(page_info["text"])
        for chunk in page_chunks:
            chunks_with_metadata.append({
                "text": chunk,
                "page": page_info["page"],
                "chunk_index": chunk_index
            })
            chunk_index += 1
    
    return chunks_with_metadata

def process_url(url):
    """
    Detects the URL type (YouTube or generic web page), processes it, 
    and returns the text chunks and a title.
    """
    # YouTube URL detection
    youtube_regex = r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    youtube_match = re.match(youtube_regex, url)

    if youtube_match:
        try:
            # Extract video ID from URL
            video_id = youtube_match.group(6)
            
            # Get video title using yt-dlp (no download needed)
            ydl_opts = {'quiet': True, 'no_download': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'YouTube Video')
            
            # Try to get transcript using youtube-transcript-api
            try:
                from youtube_transcript_api import YouTubeTranscriptApi
                
                # Try to get transcript (auto-generated or manual)
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                
                # Prefer manually created transcripts, fallback to auto-generated
                try:
                    transcript = transcript_list.find_manually_created_transcript(['en', 'en-US', 'en-GB'])
                except:
                    transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
                
                # Fetch the transcript
                transcript_data = transcript.fetch()
                text = " ".join([entry['text'] for entry in transcript_data])
                
                print(f"Successfully extracted YouTube transcript for: {title} ({len(text)} chars)")
                
            except Exception as transcript_error:
                print(f"YouTube transcript error: {transcript_error}")
                
                # Fallback: Try whisper if available
                if WHISPER_AVAILABLE:
                    print("Falling back to whisper transcription...")
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
                        ydl.download([url])
                    
                    temp_audio_path = os.path.join(TEMP_AUDIO_DIR, f"{video_id}.mp3")
                    model = whisper.load_model("base")
                    result = model.transcribe(temp_audio_path)
                    text = result['text']
                    os.remove(temp_audio_path)
                else:
                    return None, f"Could not get YouTube transcript. Video may not have captions enabled."

        except Exception as e:
            error_message = str(e)
            if "Sign in to confirm you're not a bot" in error_message or "confirm your age" in error_message:
                print(f"Error processing YouTube URL: YouTube bot detection/sign-in required. {error_message}")
                return None, "YouTube bot detection or sign-in required. Cannot process this video."
            else:
                print(f"Error processing YouTube URL: {error_message}")
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
    print("DEBUG: Starting get_all_text_for_course...")
    for doc in document_models:
        chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
        if os.path.exists(chunks_path):
            try:
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                    full_text += f"\n\n--- Content from {doc.filename} ---\n"
                    full_text += "\n".join(chunks)
                    print(f"DEBUG: Added chunks from {doc.filename}. Current full_text length: {len(full_text)}")
            except Exception as e:
                print(f"ERROR: Failed to load chunks from {chunks_path}: {e}")
        else:
            print(f"DEBUG: Chunks file not found for document {doc.id}: {chunks_path}")
    print(f"DEBUG: Finished get_all_text_for_course. Final full_text length: {len(full_text)}")
    return full_text

def create_vector_store(chunks, course_id, document_id):
    """
    Takes text chunks (with optional metadata), generates embeddings, and saves them.
    Supports both plain text chunks (list of strings) and metadata chunks 
    (list of dicts with 'text', 'page', 'chunk_index' keys).
    """
    try:
        # Handle both formats: plain strings or dicts with metadata
        if chunks and isinstance(chunks[0], dict):
            # New format with metadata
            text_chunks = [c["text"] for c in chunks]
            metadata = chunks  # Keep full metadata
        else:
            # Legacy format: plain strings
            text_chunks = chunks
            metadata = [{"text": c, "page": None, "chunk_index": i} for i, c in enumerate(chunks)]
        
        model = SentenceTransformer(EMBEDDING_MODEL)
        embeddings = model.encode(text_chunks, convert_to_tensor=False)

        if len(embeddings) == 0:
            return None

        course_vector_dir = os.path.join(VECTOR_STORES_DIR, f"course_{course_id}")
        os.makedirs(course_vector_dir, exist_ok=True)
        
        vector_path = os.path.join(course_vector_dir, f"doc_{document_id}_vectors.pkl")
        chunks_path = os.path.join(course_vector_dir, f"doc_{document_id}_chunks.pkl")

        with open(vector_path, 'wb') as f:
            pickle.dump(embeddings, f)

        # Save metadata along with chunks
        with open(chunks_path, 'wb') as f:
            pickle.dump(metadata, f)

        return os.path.abspath(vector_path)

    except Exception as e:
        print(f"Error creating vector store: {e}")
        return None

def query_rag(question, course_id, document_models):
    """
    Performs RAG using the saved vector stores for all documents in a course.
    Returns answer with proper citations including page numbers when available.
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
                            # Handle both old format (plain strings) and new format (dicts with metadata)
                            if isinstance(chunk, dict):
                                all_chunks_with_metadata.append({
                                    "document_id": doc.id,
                                    "filename": doc.filename,
                                    "content": chunk.get("text", ""),
                                    "page": chunk.get("page"),
                                    "chunk_index": chunk.get("chunk_index")
                                })
                            else:
                                # Legacy format: plain string
                                all_chunks_with_metadata.append({
                                    "document_id": doc.id,
                                    "filename": doc.filename,
                                    "content": chunk,
                                    "page": None,
                                    "chunk_index": None
                                })

        if not all_embeddings:
            print("DEBUG: No embeddings loaded for RAG query.")
            return {"answer": "Could not load any course materials. Please ensure documents are uploaded and processed.", "sources": []}

        all_doc_embeddings = np.vstack(all_embeddings)

        model = SentenceTransformer(EMBEDDING_MODEL)
        question_embedding = model.encode([question])

        similarities = cosine_similarity(question_embedding, all_doc_embeddings)
        k = 5 # Increased K for better context
        top_k_indices = np.argsort(similarities[0])[-k:][::-1]

        # Build context with metadata including page numbers
        context_with_sources = []
        for i in top_k_indices:
            chunk_info = all_chunks_with_metadata[i]
            context_with_sources.append({
                "source_id": chunk_info["document_id"],
                "source_filename": chunk_info["filename"],
                "content": chunk_info["content"],
                "page": chunk_info.get("page"),
                "chunk_index": chunk_info.get("chunk_index")
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
        # Now includes page numbers when available
        unique_sources = []
        source_map = {}
        citation_counter = 1
        pages_per_source = {}  # Track pages used per source
        
        full_context_text = ""
        for item in context_with_sources:
            source_key = f"{item['source_id']}-{item['source_filename']}"
            page_num = item.get('page')
            
            if source_key not in source_map:
                source_map[source_key] = citation_counter
                pages_per_source[source_key] = set()
                unique_sources.append({
                    "document_id": item['source_id'],
                    "filename": item['source_filename'],
                    "citation_number": citation_counter,
                    "pages": [],  # Will be populated with unique pages
                    "snippet": item['content'][:200] + "..." if len(item['content']) > 200 else item['content']  # Text preview for tooltip
                })
                citation_counter += 1
            
            # Track pages for this source
            if page_num:
                pages_per_source[source_key].add(page_num)
            
            # Build context text with page reference
            page_ref = f" (Page {page_num})" if page_num else ""
            full_context_text += f"Source [{source_map[source_key]}]: {item['source_filename']}{page_ref}\n---\n{item['content']}\n---\n\n"
        
        # Add collected pages to unique_sources
        for source in unique_sources:
            key = f"{source['document_id']}-{source['filename']}"
            source['pages'] = sorted(list(pages_per_source.get(key, set())))

    
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
        llm = get_provider()
        print(f"Prompt length: {len(prompt)} characters")
        response_text = llm.generate(prompt)
        print(f"Raw LLM response length: {len(response_text)}")
        
        if not response_text:
            print("LLM returned an empty response.")
            return {"answer": "I apologize, but I couldn't generate a response at this time. Please try again.", "sources": []}

        # Extract the answer text
        answer_text = response_text
        print(f"Extracted answer text length: {len(answer_text)}")

        # Return both the answer and the unique sources
        return {"answer": answer_text, "sources": unique_sources}

    except Exception as e:
        print(f"Error generating answer: {e}")
        return {"answer": "An error occurred while generating the answer.", "sources": []}


def query_rag_stream(question, course_id, document_data):
    """
    Streaming version of query_rag - yields text chunks as they're generated.
    Yields strings for text chunks, and a dict with 'sources' at the end.
    
    Args:
        document_data: List of dicts with 'id', 'filename', 'vector_store_path' keys
    """
    try:
        if not document_data:
            yield "No documents available to query."
            yield {"sources": []}
            return

        # Load all chunks and embeddings (same as query_rag)
        all_chunks_with_metadata = []
        all_embeddings = []
        
        for doc in document_data:
            # Handle both dict objects and SQLAlchemy models
            vector_store_path = doc.get('vector_store_path') if isinstance(doc, dict) else doc.vector_store_path
            doc_id = doc.get('id') if isinstance(doc, dict) else doc.id
            doc_filename = doc.get('filename') if isinstance(doc, dict) else doc.filename
            
            if not vector_store_path or not os.path.exists(vector_store_path):
                continue
            
            chunks_path = vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            
            if os.path.exists(vector_store_path) and os.path.exists(chunks_path):
                with open(vector_store_path, 'rb') as f:
                    embeddings = pickle.load(f)
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                
                for i, chunk in enumerate(chunks):
                    chunk_text = chunk['text'] if isinstance(chunk, dict) else chunk
                    page_num = chunk.get('page') if isinstance(chunk, dict) else None
                    all_chunks_with_metadata.append({
                        "document_id": doc_id,
                        "document_filename": doc_filename,
                        "text": chunk_text,
                        "page": page_num
                    })
                all_embeddings.append(embeddings)

        if not all_embeddings:
            yield "Could not load any course materials."
            yield {"sources": []}
            return

        all_doc_embeddings = np.vstack(all_embeddings)
        
        model = SentenceTransformer(EMBEDDING_MODEL)
        question_embedding = model.encode([question])
        
        similarities = cosine_similarity(question_embedding, all_doc_embeddings)
        k = 5
        top_k_indices = np.argsort(similarities[0])[-k:][::-1]

        # Build context with sources
        unique_sources = []
        source_map = {}
        citation_counter = 1
        full_context_text = ""
        
        for i in top_k_indices:
            item = all_chunks_with_metadata[i]
            source_key = f"{item['document_id']}-{item['document_filename']}"
            
            if source_key not in source_map:
                source_map[source_key] = citation_counter
                unique_sources.append({
                    "document_id": item['document_id'],
                    "filename": item['document_filename'],
                    "citation_number": citation_counter,
                    "snippet": item['text'][:200] + "..." if len(item['text']) > 200 else item['text']
                })
                citation_counter += 1
            
            page_ref = f" (Page {item['page']})" if item.get('page') else ""
            full_context_text += f"Source [{source_map[source_key]}]: {item['document_filename']}{page_ref}\n---\n{item['text']}\n---\n\n"

        prompt = f"""
        You are a helpful and knowledgeable tutor. Answer the question based on the provided context.
        Cite sources using [citation_number] format.
        If the answer is not in the context, say so.

        Context:
        {full_context_text}

        Question: {question}

        Answer:
        """
        
        llm = get_provider()
        for chunk in llm.generate_stream(prompt):
            yield chunk
        
        # Yield sources at the end
        yield {"sources": unique_sources}

    except Exception as e:
        print(f"Error in streaming RAG: {e}")
        yield f"An error occurred: {str(e)}"
        yield {"sources": []}

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


def generate_quiz_from_docs(document_models, difficulty='medium', count=5, question_types=None):
    """
    Generates a quiz based on the content of all provided documents.
    
    Args:
        document_models: List of document models containing vector store paths
        difficulty: 'easy', 'medium', or 'hard' - affects question complexity
        count: Number of questions to generate (5, 10, 15, or 20)
        question_types: List of types to include ['mcq', 'true_false', 'fill_blank']
    """
    # Default question types if not specified
    if question_types is None:
        question_types = ['mcq', 'true_false', 'fill_blank']
    
    try:
        if not document_models:
            return {"error": "No documents found to generate a quiz from."}

        full_context = ""
        # Adjust chunk count based on question count
        chunks_per_doc = max(3, count // len(document_models) + 2)
        
        for doc in document_models:
            chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            if os.path.exists(chunks_path):
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                    # Extract text from chunks (chunks are dicts with 'text' key)
                    chunk_texts = [c['text'] if isinstance(c, dict) else c for c in chunks[:chunks_per_doc]]
                    full_context += f"Source: {doc.filename}\n---\n" + "\n".join(chunk_texts) + "\n---\n\n"
        
        if not full_context.strip():
            print("DEBUG: Full context for quiz generation is empty.")
            return {"error": "Could not extract any text from the documents."}

        # Adjust prompt based on difficulty level
        difficulty_instructions = {
            'easy': """
        - Focus on basic recall and comprehension questions
        - Questions should test understanding of main concepts
        - Avoid complex reasoning or obscure details
        - Wrong options should be clearly distinguishable from the correct answer""",
            'medium': """
        - Mix of recall and application questions
        - Questions should test understanding and ability to apply concepts
        - Include some questions that require connecting ideas
        - Wrong options should be plausible but distinguishable""",
            'hard': """
        - Focus on analysis, application, and synthesis
        - Questions should require deep understanding and reasoning
        - Include questions that connect multiple concepts
        - Wrong options should be subtle and require careful consideration
        - Include edge cases and nuanced distinctions"""
        }

        # Build type-specific prompt based on user selection
        type_names = {
            'mcq': 'Multiple Choice',
            'true_false': 'True/False',
            'fill_blank': 'Fill in the Blank'
        }
        
        selected_types_str = ', '.join([type_names.get(t, t) for t in question_types])
        questions_per_type = max(1, count // len(question_types))

        prompt = f"""
        You are an expert educational assessment designer. Based on the following context, generate a quiz with exactly {count} questions at {difficulty.upper()} difficulty level.

        **IMPORTANT: Generate ONLY these question types: {selected_types_str}**
        Distribute questions evenly among the selected types (~{questions_per_type} per type).
        
        DO NOT generate short answer or essay questions.

        Difficulty Guidelines for {difficulty.upper()}:
        {difficulty_instructions.get(difficulty, difficulty_instructions['medium'])}

        **Question Type Formats:**

        1. MCQ (Multiple Choice):
        {{
            "type": "mcq",
            "question": "What is...?",
            "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
            "answer": "B",
            "explanation": "..."
        }}

        2. True/False:
        {{
            "type": "true_false",
            "question": "Statement to evaluate...",
            "answer": "True" or "False",
            "explanation": "..."
        }}

        3. Fill in the Blank (use ___ for blank):
        {{
            "type": "fill_blank",
            "question": "The process of ___ converts...",
            "answer": "photosynthesis",
            "explanation": "...",
            "acceptable_answers": ["photosynthesis", "photo-synthesis"]
        }}

        **Context from course materials:**
        ---
        {full_context}
        ---

        Return ONLY a valid JSON array. No markdown, no explanation outside JSON.
        """
        
        llm = get_provider()
        response_text = llm.generate(prompt)
        
        print(f"DEBUG: Raw LLM quiz response (difficulty={difficulty}, count={count}): {response_text[:500]}...")

        # Robustly extract the JSON part
        json_match = re.search(r"```json\n(.*?)""```", response_text, re.DOTALL)
        if json_match:
            json_response_text = json_match.group(1).strip()
        else:
            # Try to find JSON array directly
            json_response_text = response_text.strip()
            # Remove any leading/trailing non-JSON content
            if json_response_text.startswith('['):
                pass
            elif '[' in json_response_text:
                json_response_text = json_response_text[json_response_text.index('['):]
                if ']' in json_response_text:
                    json_response_text = json_response_text[:json_response_text.rindex(']')+1]
        
        quiz_data = json.loads(json_response_text)
        
        # Count question types for stats
        type_counts = {}
        for q in quiz_data:
            qtype = q.get('type', 'mcq')
            type_counts[qtype] = type_counts.get(qtype, 0) + 1
        
        return {
            "quiz": quiz_data, 
            "difficulty": difficulty, 
            "count": len(quiz_data),
            "question_types": type_counts
        }

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
    print(f"DEBUG: Study guide full_text length: {len(full_text)}")

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
    print(f"DEBUG: Study guide prompt length: {len(prompt)} characters")

    llm = get_provider()
    try:
        for chunk in llm.generate_stream(prompt):
            print(f"DEBUG: Received chunk: {chunk[:100]}...") # Log first 100 chars of each chunk
            yield chunk
    except Exception as e:
        import traceback
        print(f"ERROR: Exception during study guide streaming: {e}")
        traceback.print_exc()
        yield f"Error: An unexpected error occurred during study guide generation: {e}"


def generate_flashcards(document_data, count=10, topic=None, difficulty='medium'):
    """
    Generates flashcards from document content using AI.
    Returns a list of dictionaries with 'front', 'back', 'source', and 'page' keys.
    
    Args:
        document_data: List of dicts with 'id', 'filename', 'vector_store_path'
        count: Number of flashcards to generate
        topic: Optional topic to focus flashcards on
        difficulty: 'easy', 'medium', or 'hard' - affects question complexity
    """
    import json
    
    # Load all chunks from vector stores with source tracking
    all_chunks_with_source = []
    for doc in document_data:
        vector_path = doc.get('vector_store_path')
        if not vector_path:
            continue
            
        chunks_file = vector_path.replace('_vectors.pkl', '_chunks.pkl')
        if os.path.exists(chunks_file):
            try:
                with open(chunks_file, 'rb') as f:
                    chunks = pickle.load(f)
                    for chunk in chunks:
                        if isinstance(chunk, dict):
                            all_chunks_with_source.append({
                                'text': chunk.get('text', ''),
                                'page': chunk.get('page'),
                                'source': doc.get('filename', 'Unknown')
                            })
                        else:
                            all_chunks_with_source.append({
                                'text': chunk,
                                'page': None,
                                'source': doc.get('filename', 'Unknown')
                            })
            except Exception as e:
                print(f"Error loading chunks from {chunks_file}: {e}")
    
    if not all_chunks_with_source:
        return []
    
    # Limit to first 50 chunks to avoid token limits
    sampled_chunks = all_chunks_with_source[:50]
    
    # Build content with source references
    content_parts = []
    sources_info = {}
    for i, chunk in enumerate(sampled_chunks):
        source = chunk['source']
        page = chunk.get('page', 'N/A')
        content_parts.append(f"[Source: {source}, Page: {page}]\n{chunk['text'][:600]}")
        if source not in sources_info:
            sources_info[source] = []
        if page and page not in sources_info[source]:
            sources_info[source].append(page)
    
    combined_text = "\n\n---\n\n".join(content_parts)
    
    topic_instruction = f"Focus specifically on the topic: '{topic}'. Only create flashcards related to this topic." if topic else ""
    
    # Build list of available sources for the prompt
    source_list = ", ".join([f'"{s}"' for s in sources_info.keys()])
    
    # Difficulty-based instructions
    difficulty_instructions = {
        'easy': """
DIFFICULTY: EASY
- Create simple recall questions testing basic definitions and facts
- Questions should require only recognition, not deep understanding
- Answers should be short and direct (1-2 sentences)
- Use "What is...", "Define...", "Name..." style questions
- Focus on terminology and straightforward concepts
""",
        'medium': """
DIFFICULTY: MEDIUM  
- Create questions that test understanding and application
- Questions should require connecting concepts
- Answers should explain the "why" not just the "what"
- Use "Explain...", "How does...", "Compare..." style questions
- Include some cause-and-effect relationships
""",
        'hard': """
DIFFICULTY: HARD
- Create analytical questions requiring synthesis and evaluation
- Questions should require integrating multiple concepts
- Answers should demonstrate deep understanding
- Use "Analyze...", "Evaluate...", "What would happen if..." style questions
- Include complex relationships and edge cases
- Require critical thinking and application to novel situations
"""
    }
    
    difficulty_text = difficulty_instructions.get(difficulty, difficulty_instructions['medium'])
    
    prompt = f"""
You are an expert educator creating flashcards for students. Based on the text below, generate {count} high-quality flashcards.

{topic_instruction}

{difficulty_text}

RULES:
- Each flashcard should have a clear, concise question on the front and a complete answer on the back
- Make questions appropriate for the specified difficulty level
- IMPORTANT: Include the source document name and page number for each card

AVAILABLE SOURCES: {source_list}

OUTPUT FORMAT (IMPORTANT - return ONLY valid JSON):
[
  {{"front": "Question 1?", "back": "Answer 1", "source": "document_name.pdf", "page": 5}},
  {{"front": "Question 2?", "back": "Answer 2", "source": "document_name.pdf", "page": 12}}
]

**Source Material:**
---
{combined_text}
---

Generate {count} {difficulty.upper()}-level flashcards as JSON:
"""
    
    llm = get_provider()
    try:
        response_text = llm.generate(prompt)
        response_text = response_text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        flashcards = json.loads(response_text)
        
        # Validate structure and ensure source info
        default_source = list(sources_info.keys())[0] if sources_info else "Unknown"
        validated = []
        for card in flashcards:
            if isinstance(card, dict) and 'front' in card and 'back' in card:
                validated.append({
                    'front': str(card['front']).strip(),
                    'back': str(card['back']).strip(),
                    'source': str(card.get('source', default_source)),
                    'page': card.get('page')
                })
        
        return validated[:count]  # Limit to requested count
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error in flashcard generation: {e}")
        print(f"Response was: {response_text[:500]}...")
        return []
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        return []


def explain_flashcard(card_front, card_back, document_data):
    """
    Provides a deeper explanation of a flashcard answer with source citations.
    """
    import json
    
    # Load relevant content from documents
    all_content = []
    for doc in document_data:
        vector_path = doc.get('vector_store_path')
        if not vector_path:
            continue
        chunks_file = vector_path.replace('_vectors.pkl', '_chunks.pkl')
        if os.path.exists(chunks_file):
            try:
                with open(chunks_file, 'rb') as f:
                    chunks = pickle.load(f)
                    for chunk in chunks[:10]:  # Limit chunks per doc
                        text = chunk.get('text', chunk) if isinstance(chunk, dict) else chunk
                        all_content.append(f"[{doc.get('filename')}]: {text[:400]}")
            except:
                pass
    
    context = "\n".join(all_content[:15])
    
    prompt = f"""
You are an expert tutor explaining a concept in depth. A student has a flashcard and wants a deeper understanding.

FLASHCARD:
Question: {card_front}
Answer: {card_back}

SOURCE MATERIAL:
{context}

Provide a detailed explanation that:
1. Expands on the answer with more context and examples
2. Explains WHY this is important or how it connects to other concepts
3. Provides any relevant details from the source material
4. Mentions which source document this information comes from

Keep the explanation clear and educational (2-3 paragraphs max).
"""
    
    llm = get_provider()
    try:
        explanation = llm.generate(prompt)
        return explanation.strip()
    except Exception as e:
        return f"Unable to generate explanation: {str(e)}"


def regenerate_single_flashcard(existing_cards, document_data, topic=None):
    """
    Generates a single new flashcard that's different from existing ones.
    """
    import json
    
    # Get existing questions to avoid duplicates
    existing_questions = [card.get('front', '') for card in existing_cards]
    
    # Load content
    all_content = []
    sources = []
    for doc in document_data:
        vector_path = doc.get('vector_store_path')
        if not vector_path:
            continue
        chunks_file = vector_path.replace('_vectors.pkl', '_chunks.pkl')
        if os.path.exists(chunks_file):
            try:
                with open(chunks_file, 'rb') as f:
                    chunks = pickle.load(f)
                    sources.append(doc.get('filename', 'Unknown'))
                    for chunk in chunks[:10]:
                        text = chunk.get('text', chunk) if isinstance(chunk, dict) else chunk
                        page = chunk.get('page') if isinstance(chunk, dict) else None
                        all_content.append(f"[{doc.get('filename')}, Page {page}]: {text[:400]}")
            except:
                pass
    
    context = "\n".join(all_content[:20])
    existing_str = "\n".join([f"- {q}" for q in existing_questions])
    topic_instruction = f"Focus on the topic: '{topic}'." if topic else ""
    
    prompt = f"""
Generate ONE new flashcard based on the source material.
{topic_instruction}

AVOID these existing questions (create something different):
{existing_str}

SOURCE MATERIAL:
{context}

Return ONLY valid JSON for a single flashcard:
{{"front": "New question?", "back": "Answer", "source": "filename.pdf", "page": 5}}
"""
    
    llm = get_provider()
    try:
        response_text = llm.generate(prompt).strip()
        if "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        card = json.loads(response_text)
        return {
            'front': str(card.get('front', '')).strip(),
            'back': str(card.get('back', '')).strip(),
            'source': str(card.get('source', sources[0] if sources else 'Unknown')),
            'page': card.get('page')
        }
    except Exception as e:
        print(f"Error regenerating flashcard: {e}")
        return None


def extract_concepts_from_docs(document_models, max_concepts=30):
    """
    Extract key concepts/terms from course documents to build a glossary.
    Returns a list of {term, definition, related_terms, source} objects.
    """
    try:
        # Gather text from all documents
        full_context = ""
        for doc in document_models:
            chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            if os.path.exists(chunks_path):
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                    # Get first few chunks from each doc
                    for chunk in chunks[:5]:
                        if isinstance(chunk, dict):
                            full_context += f"[{doc.filename}] {chunk.get('text', '')}\n\n"
                        else:
                            full_context += f"[{doc.filename}] {chunk}\n\n"
        
        if not full_context.strip():
            return []
        
        prompt = f"""
        You are an expert educator. Analyze the following course material and extract the {max_concepts} most important key terms, concepts, and definitions.

        For each concept, provide:
        1. term: The key term/concept name
        2. definition: A clear, concise definition (1-2 sentences)
        3. related_terms: List of 1-3 related terms from the material
        4. source: Which document it came from (use the filename in brackets)

        **Course Material:**
        ---
        {full_context[:15000]}
        ---

        Return ONLY a valid JSON array. Example:
        [
            {{
                "term": "Photosynthesis",
                "definition": "The process by which plants convert light energy into chemical energy.",
                "related_terms": ["chlorophyll", "glucose", "carbon dioxide"],
                "source": "biology_ch1.pdf"
            }}
        ]
        """
        
        llm = get_provider()
        response_text = llm.generate(prompt)
        response_text = response_text.strip()
        
        # Extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        # Find JSON array
        if '[' in response_text:
            response_text = response_text[response_text.index('['):]
            if ']' in response_text:
                response_text = response_text[:response_text.rindex(']')+1]
        
        concepts = json.loads(response_text)
        
        # Validate structure
        validated = []
        for c in concepts:
            if isinstance(c, dict) and 'term' in c and 'definition' in c:
                validated.append({
                    'term': str(c.get('term', '')).strip(),
                    'definition': str(c.get('definition', '')).strip(),
                    'related_terms': c.get('related_terms', []),
                    'source': c.get('source', None)
                })
        
        return validated[:max_concepts]
        
    except Exception as e:
        print(f"Error extracting concepts: {e}")
        return []


def grade_essay_response(question, student_answer, document_models, custom_rubric=None):
    """
    Grade a student's essay/short answer using AI with course context.
    Returns score, feedback, and rubric breakdown.
    """
    try:
        # Get relevant context from documents
        context = ""
        for doc in document_models:
            chunks_path = doc.vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            if os.path.exists(chunks_path):
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                    for chunk in chunks[:3]:
                        if isinstance(chunk, dict):
                            context += chunk.get('text', '') + "\n"
                        else:
                            context += str(chunk) + "\n"
        
        rubric = custom_rubric or """
        **Grading Rubric (100 points):**
        - Content Accuracy (40 points): Correctness of information based on course material
        - Understanding (25 points): Demonstrates comprehension of key concepts
        - Completeness (20 points): Addresses all parts of the question
        - Clarity (15 points): Clear, well-organized response
        """
        
        prompt = f"""
        You are an expert educator grading a student's response. Grade the following answer based on the course material and rubric provided.

        **Question:** {question}

        **Student's Answer:** {student_answer}

        **Course Context (Reference Material):**
        {context[:5000]}

        {rubric}

        **Instructions:**
        1. Evaluate the answer against the course material
        2. Provide a score out of 100
        3. Give specific, constructive feedback
        4. Break down the score by rubric category

        Return your evaluation as JSON:
        {{
            "score": <0-100>,
            "grade_letter": "<A/B/C/D/F>",
            "feedback": "<Overall feedback>",
            "strengths": ["<strength 1>", "<strength 2>"],
            "improvements": ["<area 1>", "<area 2>"],
            "rubric_breakdown": {{
                "content_accuracy": {{"score": <0-40>, "comment": "<...>"}},
                "understanding": {{"score": <0-25>, "comment": "<...>"}},
                "completeness": {{"score": <0-20>, "comment": "<...>"}},
                "clarity": {{"score": <0-15>, "comment": "<...>"}}
            }}
        }}
        """
        
        llm = get_provider()
        response_text = llm.generate(prompt)
        response_text = response_text.strip()
        
        # Extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        result = json.loads(response_text)
        
        # Ensure required fields
        return {
            "score": result.get("score", 0),
            "grade_letter": result.get("grade_letter", "N/A"),
            "feedback": result.get("feedback", ""),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "rubric_breakdown": result.get("rubric_breakdown", {})
        }
        
    except Exception as e:
        print(f"Error grading essay: {e}")
        return {
            "score": 0,
            "grade_letter": "N/A",
            "feedback": f"Error grading response: {str(e)}",
            "strengths": [],
            "improvements": [],
            "rubric_breakdown": {}
        }


def generate_mind_map(document_models, topic=None):
    """
    Generate a mind map structure from course documents.
    Returns nodes and edges for visualization.
    
    Args:
        document_models: List of document objects or dicts with id, filename, vector_store_path
        topic: Optional topic to focus the mind map on
    
    Returns:
        {
            "nodes": [{"id": str, "label": str, "type": str, "description": str}],
            "edges": [{"source": str, "target": str, "label": str}],
            "central_topic": str
        }
    """
    try:
        # Gather content from documents
        all_content = []
        
        for doc in document_models:
            # Handle both dict and model objects
            if isinstance(doc, dict):
                vector_store_path = doc.get('vector_store_path')
                doc_filename = doc.get('filename', 'Unknown')
            else:
                vector_store_path = doc.vector_store_path
                doc_filename = doc.filename
            
            if not vector_store_path or not os.path.exists(vector_store_path):
                continue
            
            chunks_path = vector_store_path.replace('_vectors.pkl', '_chunks.pkl')
            
            if os.path.exists(chunks_path):
                with open(chunks_path, 'rb') as f:
                    chunks = pickle.load(f)
                
                # Sample chunks for mind map generation (limit to avoid token limit)
                sample_size = min(10, len(chunks))
                sampled_chunks = chunks[:sample_size]
                
                for chunk in sampled_chunks:
                    chunk_text = chunk['text'] if isinstance(chunk, dict) else chunk
                    all_content.append(f"[{doc_filename}]: {chunk_text[:500]}")
        
        if not all_content:
            return {
                "nodes": [{"id": "1", "label": "No Content", "type": "central", "description": "Upload documents to generate mind map"}],
                "edges": [],
                "central_topic": "No Content Available"
            }
        
        combined_content = "\n\n".join(all_content[:15])  # Limit content
        
        topic_instruction = f"Focus specifically on the topic: '{topic}'" if topic else "Identify the main topic from the content"
        
        prompt = f'''
Analyze the following educational content and create a mind map structure.
{topic_instruction}

Content:
{combined_content}

Generate a mind map with the following structure. Return ONLY valid JSON, no other text:

{{
    "central_topic": "Main topic/subject name",
    "nodes": [
        {{"id": "1", "label": "Central Topic", "type": "central", "description": "Brief description"}},
        {{"id": "2", "label": "Main Concept 1", "type": "main", "description": "Brief description"}},
        {{"id": "3", "label": "Sub-concept 1.1", "type": "sub", "description": "Brief description"}},
        {{"id": "4", "label": "Sub-concept 1.2", "type": "sub", "description": "Brief description"}},
        {{"id": "5", "label": "Main Concept 2", "type": "main", "description": "Brief description"}},
        {{"id": "6", "label": "Sub-concept 2.1", "type": "sub", "description": "Brief description"}},
        {{"id": "7", "label": "Main Concept 3", "type": "main", "description": "Brief description"}},
        {{"id": "8", "label": "Sub-concept 3.1", "type": "sub", "description": "Brief description"}}
    ],
    "edges": [
        {{"source": "1", "target": "2", "label": "includes"}},
        {{"source": "2", "target": "3", "label": "has"}},
        {{"source": "2", "target": "4", "label": "has"}},
        {{"source": "1", "target": "5", "label": "includes"}},
        {{"source": "5", "target": "6", "label": "has"}},
        {{"source": "1", "target": "7", "label": "includes"}},
        {{"source": "7", "target": "8", "label": "has"}}
    ]
}}

Rules:
1. Create 8-15 nodes covering main concepts and key sub-topics
2. Node types: "central" (1 only), "main" (3-5), "sub" (rest)
3. Edges connect parent concepts to child concepts
4. Include meaningful relationship labels (includes, leads to, requires, etc.)
5. Make labels concise (2-4 words max)
6. Return ONLY the JSON, no markdown code blocks
'''
        
        llm = get_provider()
        response = llm.generate(prompt)
        
        # Parse JSON from response
        response_text = response.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = re.sub(r'^```(?:json)?\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)
        
        result = json.loads(response_text)
        
        return {
            "nodes": result.get("nodes", []),
            "edges": result.get("edges", []),
            "central_topic": result.get("central_topic", "Mind Map")
        }
        
    except json.JSONDecodeError as e:
        print(f"Error parsing mind map JSON: {e}")
        print(f"Response was: {response_text[:500]}")
        return {
            "nodes": [{"id": "1", "label": "Error", "type": "central", "description": "Failed to parse AI response"}],
            "edges": [],
            "central_topic": "Error"
        }
    except Exception as e:
        print(f"Error generating mind map: {e}")
        return {
            "nodes": [{"id": "1", "label": "Error", "type": "central", "description": str(e)}],
            "edges": [],
            "central_topic": "Error"
        }
