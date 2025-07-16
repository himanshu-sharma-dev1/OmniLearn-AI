# backend/app.py
import os
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from flask_mail import Mail, Message
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import rag_engine # Import the RAG engine

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuration ---
instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
os.makedirs(instance_path, exist_ok=True)

# Use PostgreSQL in production (Docker), but SQLite for local development
if 'DATABASE_URL' in os.environ:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "app.db")}'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = str(os.environ.get('JWT_SECRET_KEY', 'super-secret-key-for-intelli-tutor'))
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USERNAME')

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# --- Initialization ---
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
mail = Mail(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(150), nullable=True)
    last_name = db.Column(db.String(150), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    avatar = db.Column(db.String(300), nullable=True)
    notification_preferences = db.Column(JSON, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    reset_token = db.Column(db.String(128), nullable=True)
    reset_token_expiration = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('courses', lazy=True))
    documents = db.relationship('Document', backref='course', lazy=True, cascade="all, delete-orphan")

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(150), nullable=False) # For PDF, the original filename; for URL, the title
    filepath = db.Column(db.String(300), nullable=True) # Nullable for URL-based documents
    vector_store_path = db.Column(db.String(300), nullable=False)
    uploaded_at = db.Column(db.DateTime, server_default=db.func.now())
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    source_type = db.Column(db.String(50), nullable=False, default='pdf') # 'pdf', 'url', 'youtube'
    source_url = db.Column(db.String(500), nullable=True)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), nullable=False) # e.g., 'success', 'error', 'info'
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=True) # Optional

class QuizAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    responses = db.relationship('QuizQuestionResponse', backref='attempt', lazy=True, cascade="all, delete-orphan")

class QuizQuestionResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_attempt_id = db.Column(db.Integer, db.ForeignKey('quiz_attempt.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    selected_option = db.Column(db.String(200), nullable=False)
    correct_option = db.Column(db.String(200), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)

def create_notification(user_id, message, type, course_id=None):
    new_notification = Notification(
        user_id=user_id,
        message=message,
        type=type,
        course_id=course_id
    )
    db.session.add(new_notification)
    db.session.commit()

# --- Database CLI Command ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    with app.app_context():
        db.create_all()
    print("Initialized the database.")

# --- API Endpoints ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"msg": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 409

    new_user = User(email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        print(f"User ID for token: {user.id}, type: {type(user.id)}")
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token), 200

    return jsonify({"msg": "Bad email or password"}), 401


@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    user = User.query.filter_by(email=email).first()

    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiration = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()

        # Generate the reset URL using an environment variable for flexibility
        with app.app_context():
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            reset_url = f"{frontend_url}/reset-password/{token}"

        msg = Message(
            "Password Reset Request",
            recipients=[user.email],
            html=f"<p>Click this link to reset your password: <a href='{reset_url}'>{reset_url}</a></p>"
        )
        try:
            mail.send(msg)
            app.logger.info(f"Password reset email sent to {user.email}")
        except Exception as e:
            app.logger.error(f"Failed to send email: {e}", exc_info=True)
            return jsonify({"msg": "Failed to send password reset email"}), 500

    # Return a generic message to prevent email enumeration
    return jsonify({"msg": "If your email is in our system, you will receive a password reset link."}), 200


@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    password = data.get('password')

    user = User.query.filter_by(reset_token=token).first()

    if user and user.reset_token_expiration > datetime.utcnow():
        user.set_password(password)
        user.reset_token = None
        user.reset_token_expiration = None
        db.session.commit()
        return jsonify({"msg": "Password has been reset successfully."}), 200
    
    return jsonify({"msg": "Invalid or expired token."}), 400


@app.route('/profile', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if request.method == 'GET':
        return jsonify({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "bio": user.bio,
            "email": user.email,
            "avatar": user.avatar,
            "notification_preferences": user.notification_preferences
        }), 200
    
    elif request.method == 'PUT':
        data = request.get_json()
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.bio = data.get('bio', user.bio)
        user.notification_preferences = data.get('notification_preferences', user.notification_preferences)
        new_email = data.get('email')
        new_password = data.get('password')

        if new_email:
            if User.query.filter_by(email=new_email).first() and new_email != user.email:
                return jsonify({"msg": "Email already in use"}), 409
            user.email = new_email
        
        if new_password:
            user.set_password(new_password)
        
        db.session.commit()
        return jsonify({"msg": "Profile updated successfully"}), 200

    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Account deleted successfully"}), 200

@app.route('/profile/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if 'avatar' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['avatar']
    
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename)
        avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], 'avatars', filename)
        os.makedirs(os.path.dirname(avatar_path), exist_ok=True)
        file.save(avatar_path)
        user.avatar = avatar_path
        db.session.commit()
        return jsonify({"msg": "Avatar updated successfully", "avatar_path": avatar_path}), 200


# --- Intelli-Tutor Endpoints ---

@app.route('/courses', methods=['POST'])
@jwt_required()
def create_course():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    course_name = data.get('name')

    if not course_name:
        return jsonify({"msg": "Course name is required"}), 400

    new_course = Course(name=course_name, user_id=current_user_id)
    db.session.add(new_course)
    db.session.commit()

    return jsonify({"msg": "Course created successfully", "course_id": new_course.id}), 201

@app.route('/courses', methods=['GET'])
@jwt_required()
def get_courses():
    current_user_id = get_jwt_identity()
    courses = Course.query.filter_by(user_id=current_user_id).all()
    courses_data = []
    for c in courses:
        documents_data = [{"id": doc.id, "filename": doc.filename} for doc in c.documents]
        courses_data.append({
            "id": c.id, 
            "name": c.name, 
            "user_id": c.user_id,
            "documents": documents_data
        })
    return jsonify(courses_data), 200


@app.route('/courses/<int:course_id>', methods=['GET'])
@jwt_required()
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    documents_data = [{"id": doc.id, "filename": doc.filename} for doc in course.documents]
    course_data = {
        "id": course.id,
        "name": course.name,
        "user_id": course.user_id,
        "documents": documents_data
    }
    return jsonify(course_data), 200


@app.route('/courses/<int:course_id>/add-source', methods=['POST'])
@jwt_required()
def add_source(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.get_or_404(course_id)

    if course.user_id != current_user_id:
        return jsonify({"msg": "You are not the owner of this course"}), 403

    source_type = request.form.get('source_type')
    
    if source_type == 'pdf':
        if 'file' not in request.files:
            return jsonify({"msg": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"msg": "No selected file"}), 400

        if file and file.filename.endswith('.pdf'):
            filename = secure_filename(file.filename)
            course_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"course_{course_id}")
            os.makedirs(course_upload_dir, exist_ok=True)
            filepath = os.path.abspath(os.path.join(course_upload_dir, filename))
            file.save(filepath)

            try:
                chunks = rag_engine.process_pdf_and_get_chunks(filepath)
                new_document = Document(
                    filename=filename,
                    filepath=filepath,
                    vector_store_path="",
                    course_id=course_id,
                    source_type='pdf'
                )
                db.session.add(new_document)
                db.session.commit()

                vector_store_path = rag_engine.create_vector_store(chunks, course_id, new_document.id)
                new_document.vector_store_path = vector_store_path
                db.session.commit()
                create_notification(current_user_id, f"Document '{filename}' processed successfully!", "success", course_id)
                return jsonify({"msg": "PDF processed and indexed successfully"}), 200
            except Exception as e:
                db.session.rollback()
                if os.path.exists(filepath): os.remove(filepath)
                create_notification(current_user_id, f"Failed to process PDF '{filename}': {str(e)}", "error", course_id)
                return jsonify({"msg": f"Failed to process {filename}: {str(e)}"}), 500
        else:
            return jsonify({"msg": "Invalid file type. Only PDF is supported."}), 400

    elif source_type == 'url':
        url = request.form.get('url')
        if not url:
            return jsonify({"msg": "No URL provided"}), 400
        
        try:
            chunks, title = rag_engine.process_url(url)
            if not chunks:
                return jsonify({"msg": "Could not extract content from the URL."}), 400

            new_document = Document(
                filename=title,
                vector_store_path="",
                course_id=course_id,
                source_type='url',
                source_url=url
            )
            db.session.add(new_document)
            db.session.commit()

            vector_store_path = rag_engine.create_vector_store(chunks, course_id, new_document.id)
            new_document.vector_store_path = vector_store_path
            db.session.commit()
            create_notification(current_user_id, f"URL '{title}' processed successfully!", "success", course_id)
            return jsonify({"msg": "URL processed and indexed successfully"}), 200
        except Exception as e:
            db.session.rollback()
            create_notification(current_user_id, f"Failed to process URL: {str(e)}", "error", course_id)
            return jsonify({"msg": f"Failed to process URL: {str(e)}"}), 500
    
    elif source_type == 'youtube':
        url = request.form.get('url')
        if not url:
            return jsonify({"msg": "No URL provided"}), 400
        
        try:
            chunks, title = rag_engine.process_url(url)
            if not chunks:
                return jsonify({"msg": "Could not extract content from the YouTube video."}), 400

            new_document = Document(
                filename=title,
                vector_store_path="",
                course_id=course_id,
                source_type='youtube',
                source_url=url
            )
            db.session.add(new_document)
            db.session.commit()

            vector_store_path = rag_engine.create_vector_store(chunks, course_id, new_document.id)
            new_document.vector_store_path = vector_store_path
            db.session.commit()
            create_notification(current_user_id, f"YouTube video '{title}' processed successfully!", "success", course_id)
            return jsonify({"msg": "YouTube video processed and indexed successfully"}), 200
        except Exception as e:
            db.session.rollback()
            create_notification(current_user_id, f"Failed to process YouTube video: {str(e)}", "error", course_id)
            return jsonify({"msg": f"Failed to process YouTube video: {str(e)}"}), 500
            
    else:
        return jsonify({"msg": "Invalid source type specified"}), 400


@app.route('/courses/<int:course_id>/chat', methods=['POST'])
@jwt_required()
def chat_with_course(course_id):
    data = request.get_json()
    question = data.get('question')
    document_ids = data.get('document_ids') # Optional list of document IDs

    if not question:
        return jsonify({"msg": "Question is required"}), 400

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    # Filter documents if specific IDs are provided
    documents_to_search = course.documents
    if document_ids:
        documents_to_search = [doc for doc in course.documents if doc.id in document_ids]

    answer_data = rag_engine.query_rag(question, course_id, documents_to_search)
    
    if "answer" in answer_data and "sources" in answer_data:
        return jsonify({"answer": answer_data["answer"], "sources": answer_data["sources"]}), 200
    else:
        # This case should ideally not be hit if rag_engine.query_rag always returns expected format
        return jsonify({"answer": "An unexpected error occurred in RAG engine.", "sources": []}), 500


@app.route('/courses/<int:course_id>/search', methods=['GET'])
@jwt_required()
def search_in_course(course_id):
    search_query = request.args.get('query')

    if not search_query:
        return jsonify({"msg": "Search query is required"}), 400

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    search_results = rag_engine.search_documents(search_query, course_id, course.documents)
    
    return jsonify(search_results), 200


@app.route('/courses/<int:course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.get(course_id)

    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.user_id != current_user_id:
        return jsonify({"msg": "Unauthorized: You are not the owner of this course"}), 403

    data = request.get_json()
    new_name = data.get('name')

    if not new_name or not new_name.strip():
        return jsonify({"msg": "New course name cannot be empty"}), 400

    course.name = new_name.strip()
    db.session.commit()

    return jsonify({"msg": "Course updated successfully", "name": course.name}), 200


@app.route('/courses/<int:course_id>', methods=['DELETE'])
@jwt_required()
def delete_course(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.get(course_id)

    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.user_id != current_user_id:
        return jsonify({"msg": "Unauthorized: You are not the owner of this course"}), 403

    try:
        # Create notification BEFORE deleting the course
        create_notification(current_user_id, f"Course '{course.name}' has been deleted.", "info", course_id=course.id)

        # Clean up directories
        course_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"course_{course_id}")
        course_vector_dir = os.path.join(rag_engine.VECTOR_STORES_DIR, f"course_{course_id}")

        if os.path.exists(course_upload_dir):
            import shutil
            shutil.rmtree(course_upload_dir)
        
        if os.path.exists(course_vector_dir):
            import shutil
            shutil.rmtree(course_vector_dir)

        db.session.delete(course)
        db.session.commit()

        return jsonify({"msg": "Course deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        error_message = str(e)[:490] # Truncate error message to fit in DB
        print(f"Error deleting course {course_id}: {e}")
        create_notification(current_user_id, f"Failed to delete Course '{course.name}': {error_message}", "error", course_id)
        return jsonify({"msg": "An error occurred during deletion."}), 500


@app.route('/courses/<int:course_id>/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(course_id, document_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.get(course_id)
    
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    if course.user_id != current_user_id:
        return jsonify({"msg": "Unauthorized: You are not the owner of this course"}), 403

    document = Document.query.get(document_id)

    if not document or document.course_id != course_id:
        return jsonify({"msg": "Document not found in this course"}), 404

    try:
        # 1. Delete the physical file
        if os.path.exists(document.filepath):
            os.remove(document.filepath)

        # 2. Delete the vector store files
        rag_engine.delete_document_from_course(document.vector_store_path)

        # 3. Delete the document from the database
        db.session.delete(document)
        db.session.commit()
        
        create_notification(current_user_id, f"Document '{document.filename}' was deleted from '{course.name}'.", "info", course_id)

        return jsonify({"msg": "Document deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting document {document_id}: {e}")
        create_notification(current_user_id, f"Failed to delete document '{document.filename}': {str(e)}", "error", course_id)
        return jsonify({"msg": "An error occurred during deletion."}), 500


@app.route('/courses/<int:course_id>/generate-quiz', methods=['POST'])
@jwt_required()
def generate_quiz(course_id):
    current_user_id = get_jwt_identity()
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    try:
        # We pass all documents to the quiz generation engine
        quiz_data = rag_engine.generate_quiz_from_docs(course.documents)
        
        if "error" in quiz_data:
            create_notification(current_user_id, f"Failed to generate quiz for Course '{course.name}': {quiz_data['error']}", "error", course_id)
            return jsonify(quiz_data), 500
            
        create_notification(current_user_id, f"Quiz for Course '{course.name}' generated successfully!", "success", course_id)
        return jsonify(quiz_data), 200

    except Exception as e:
        create_notification(current_user_id, f"An unexpected error occurred while generating quiz for Course '{course.name}': {str(e)}", "error", course_id)
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route('/courses/<int:course_id>/quizzes/submit', methods=['POST'])
@jwt_required()
def submit_quiz(course_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    responses = data.get('responses') # Expecting a list of {question, selected_option, correct_option}

    if not responses:
        return jsonify({"msg": "No responses provided"}), 400

    total_questions = len(responses)
    correct_answers = 0
    
    new_attempt = QuizAttempt(
        user_id=current_user_id,
        course_id=course_id,
        score=0 # Placeholder score
    )
    db.session.add(new_attempt)
    db.session.flush() # Flush to get the ID for the new_attempt

    for res in responses:
        is_correct = res['selected_option'] == res['correct_option']
        if is_correct:
            correct_answers += 1
        
        question_response = QuizQuestionResponse(
            quiz_attempt_id=new_attempt.id,
            question_text=res['question'],
            selected_option=res['selected_option'],
            correct_option=res['correct_option'],
            is_correct=is_correct
        )
        db.session.add(question_response)

    new_attempt.score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    
    db.session.commit()

    return jsonify({
        "msg": "Quiz submitted successfully",
        "attempt_id": new_attempt.id,
        "score": new_attempt.score
    }), 201


@app.route('/courses/<int:course_id>/quizzes/history', methods=['GET'])
@jwt_required()
def get_quiz_history(course_id):
    current_user_id = get_jwt_identity()
    attempts = QuizAttempt.query.filter_by(user_id=current_user_id, course_id=course_id).order_by(QuizAttempt.timestamp.desc()).all()

    history_data = []
    for attempt in attempts:
        responses_data = [{
            "question_text": res.question_text,
            "selected_option": res.selected_option,
            "correct_option": res.correct_option,
            "is_correct": res.is_correct
        } for res in attempt.responses]
        
        history_data.append({
            "id": attempt.id,
            "score": attempt.score,
            "timestamp": attempt.timestamp.isoformat(),
            "responses": responses_data
        })

    return jsonify(history_data), 200

@app.route('/courses/<int:course_id>/generate-study-guide', methods=['POST'])
@jwt_required()
def generate_study_guide(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.get(course_id)

    if not course:
        return jsonify({"msg": "Course not found"}), 404
    # Note: We are allowing any logged-in user to generate a study guide, not just the user.
    # You could add `if course.user_id != current_user_id:` to restrict it.

    try:
        full_text = rag_engine.get_all_text_for_course(course.documents)
        if not full_text or not full_text.strip():
            return Response("No content found for this course to generate a study guide.", status=404, mimetype='text/plain')

        # Use the new function from rag_engine to handle streaming
        stream = rag_engine.generate_study_guide_from_text(full_text)
        
        return Response(stream_with_context(stream), mimetype='text/plain')

    except Exception as e:
        print(f"Error generating study guide for course {course_id}: {e}")
        # Log the full error for debugging
        import traceback
        traceback.print_exc()
        return jsonify({"msg": "An error occurred while generating the study guide."}), 500


# --- Notes Endpoints ---

@app.route('/notes', methods=['POST'])
@jwt_required()
def create_note():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    course_id = data.get('course_id')

    if not all([title, content, course_id]):
        return jsonify({"msg": "Missing title, content, or course_id"}), 400

    new_note = Note(
        title=title,
        content=content,
        course_id=course_id,
        user_id=current_user_id
    )
    db.session.add(new_note)
    db.session.commit()

    return jsonify({"msg": "Note created successfully", "note_id": new_note.id}), 201

@app.route('/courses/<int:course_id>/notes', methods=['GET'])
@jwt_required()
def get_notes_for_course(course_id):
    current_user_id = get_jwt_identity()
    notes = Note.query.filter_by(course_id=course_id, user_id=current_user_id).all()
    return jsonify([{"id": n.id, "title": n.title, "content": n.content, "created_at": n.created_at} for n in notes]), 200

@app.route('/notes/<int:note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    current_user_id = get_jwt_identity()
    note = Note.query.get(note_id)

    if not note:
        return jsonify({"msg": "Note not found"}), 404

    if str(note.user_id) != str(current_user_id):
        return jsonify({"msg": "Unauthorized"}), 403

    data = request.get_json()
    note.title = data.get('title', note.title)
    note.content = data.get('content', note.content)
    db.session.commit()

    return jsonify({"msg": "Note updated successfully"}), 200

@app.route('/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    current_user_id = get_jwt_identity()
    note = Note.query.get(note_id)

    if not note:
        return jsonify({"msg": "Note not found"}), 404

    if str(note.user_id) != str(current_user_id):
        return jsonify({"msg": "Unauthorized"}), 403

    db.session.delete(note)
    db.session.commit()

    return jsonify({"msg": "Note deleted successfully"}), 200

@app.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=current_user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([
        {
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
            "course_id": n.course_id
        } for n in notifications
    ]), 200

@app.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    current_user_id = get_jwt_identity()
    notification = Notification.query.get(notification_id)

    if not notification:
        return jsonify({"msg": "Notification not found"}), 404

    if str(notification.user_id) != str(current_user_id):
        return jsonify({"msg": "Unauthorized"}), 403

    notification.is_read = True
    db.session.commit()

    return jsonify({"msg": "Notification marked as read"}), 200


@app.route('/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    current_user_id = get_jwt_identity()
    notification = Notification.query.get(notification_id)

    if not notification:
        return jsonify({"msg": "Notification not found"}), 404

    if str(notification.user_id) != str(current_user_id):
        return jsonify({"msg": "Unauthorized"}), 403

    db.session.delete(notification)
    db.session.commit()

    return jsonify({"msg": "Notification deleted"}), 200


@app.route('/notifications', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    current_user_id = get_jwt_identity()
    
    try:
        num_deleted = Notification.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        return jsonify({"msg": f"{num_deleted} notifications deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting notifications", "error": str(e)}), 500


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- Main Execution ---
if __name__ == '__main__':
    app.debug = True # Explicitly set debug mode
    app.run(host='0.0.0.0', port=5001)
