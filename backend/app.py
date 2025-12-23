# backend/app.py
import os
import json
import secrets
import logging
import bleach
from functools import wraps
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, redirect
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from . import rag_engine # Import the RAG engine

from dotenv import load_dotenv

load_dotenv(override=False)

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

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
app.config['SECRET_KEY'] = str(os.environ.get('JWT_SECRET_KEY', 'super-secret-key-for-intelli-tutor'))  # For Flask session (OAuth)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'data'))
app.config['UPLOAD_FOLDER'] = os.path.join(DATA_DIR, 'uploads')
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
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "100 per hour"],
    storage_uri="memory://"
)

# --- Google OAuth Configuration ---
from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')


# --- Error Codes ---
class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    AUTH_ERROR = "AUTH_ERROR"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    SERVER_ERROR = "SERVER_ERROR"

def api_error(message, code, status=400, details=None):
    """Standard error response format"""
    response = {"error": message, "code": code}
    if details:
        response["details"] = details
    return jsonify(response), status

def sanitize_input(text):
    """Sanitize user input to prevent XSS"""
    if text is None:
        return None
    return bleach.clean(str(text), strip=True)

def validate_pdf_file(filepath):
    """Validate PDF by checking magic bytes"""
    try:
        with open(filepath, 'rb') as f:
            header = f.read(5)
            return header == b'%PDF-'
    except Exception:
        return False

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(150), nullable=True)
    last_name = db.Column(db.String(150), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    avatar = db.Column(db.String(300), nullable=True)
    notification_preferences = db.Column(JSON, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)  # Nullable for Google OAuth users
    google_id = db.Column(db.String(256), nullable=True, unique=True)  # Google OAuth ID
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
    vector_store_path = db.Column(db.String(300), nullable=True)  # Nullable until processing complete
    uploaded_at = db.Column(db.DateTime, server_default=db.func.now())
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    source_type = db.Column(db.String(50), nullable=False, default='pdf') # 'pdf', 'url', 'youtube'
    source_url = db.Column(db.String(500), nullable=True)
    # Processing status: 'pending', 'processing', 'ready', 'error'
    processing_status = db.Column(db.String(20), nullable=False, default='pending')
    error_message = db.Column(db.Text, nullable=True)

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

# --- New Models for Chat History & Flashcards ---

class ChatMessage(db.Model):
    """Stores chat messages for conversation history"""
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    sources = db.Column(JSON, nullable=True)  # For AI messages with citations
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class FlashcardDeck(db.Model):
    """A collection of flashcards for a course"""
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    cards = db.relationship('Flashcard', backref='deck', lazy=True, cascade="all, delete-orphan")

class Flashcard(db.Model):
    """Individual flashcard with spaced repetition (SM-2) fields"""
    id = db.Column(db.Integer, primary_key=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('flashcard_deck.id', ondelete='CASCADE'), nullable=False)
    front = db.Column(db.Text, nullable=False)  # Question side
    back = db.Column(db.Text, nullable=False)   # Answer side
    source_info = db.Column(db.Text, nullable=True)  # JSON with source document and page
    # SM-2 Spaced Repetition fields
    ease_factor = db.Column(db.Float, default=2.5)
    interval = db.Column(db.Integer, default=1)  # Days until next review
    repetitions = db.Column(db.Integer, default=0)
    next_review = db.Column(db.DateTime, nullable=True)
    last_reviewed = db.Column(db.DateTime, nullable=True)


class StudySession(db.Model):
    """Tracks study time per course for analytics"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Integer, default=0)  # Total seconds studied
    activity_type = db.Column(db.String(50), default='chat')  # 'chat', 'quiz', 'flashcards', 'study_guide'
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class CourseShare(db.Model):
    """Shareable links for courses"""
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    share_token = db.Column(db.String(64), unique=True, nullable=False)  # Unique share token
    permission = db.Column(db.String(20), default='read')  # 'read' or 'edit'
    expires_at = db.Column(db.DateTime, nullable=True)  # Optional expiration
    access_count = db.Column(db.Integer, default=0)  # Track how many times accessed
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class CourseGlossary(db.Model):
    """Auto-extracted glossary terms for a course"""
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    term = db.Column(db.String(200), nullable=False)
    definition = db.Column(db.Text, nullable=False)
    related_terms = db.Column(JSON, nullable=True)  # List of related term strings
    source_document = db.Column(db.String(200), nullable=True)  # Which doc it came from
    created_at = db.Column(db.DateTime, server_default=db.func.now())

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

# --- Health Check Endpoint (for Docker) ---
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Docker/Kubernetes."""
    return jsonify({"status": "healthy", "service": "intelli-tutor-backend"}), 200

# --- API Endpoints ---
@app.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    email = sanitize_input(data.get('email'))
    password = data.get('password')

    if not email or not password:
        return api_error("Email and password are required", ErrorCode.VALIDATION_ERROR)

    if User.query.filter_by(email=email).first():
        return api_error("Email already registered", ErrorCode.VALIDATION_ERROR, 409)

    new_user = User(email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    logger.info(f"New user registered: {email}")

    return jsonify({"msg": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and user.password_hash and user.check_password(password):
        print(f"User ID for token: {user.id}, type: {type(user.id)}")
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token), 200

    return jsonify({"msg": "Bad email or password"}), 401


# --- Google OAuth Endpoints ---

@app.route('/auth/google')
def google_login():
    """Redirect to Google OAuth login"""
    # Get the callback URL based on environment
    callback_url = request.url_root.rstrip('/') + '/auth/google/callback'
    return google.authorize_redirect(callback_url)


@app.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        
        if not user_info:
            # Fallback: fetch user info manually
            resp = google.get('https://www.googleapis.com/oauth2/v3/userinfo')
            user_info = resp.json()
        
        google_id = user_info.get('sub')
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        picture = user_info.get('picture', '')
        
        if not email:
            return redirect(f"{FRONTEND_URL}/login?error=no_email")
        
        # Check if user exists by google_id or email
        user = User.query.filter_by(google_id=google_id).first()
        if not user:
            user = User.query.filter_by(email=email).first()
        
        if user:
            # Update google_id if not set (existing email user now using Google)
            if not user.google_id:
                user.google_id = google_id
            # Update avatar if not set
            if not user.avatar and picture:
                user.avatar = picture
            db.session.commit()
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                first_name=first_name,
                last_name=last_name,
                avatar=picture,
                password_hash=None  # No password for Google-only users
            )
            db.session.add(user)
            db.session.commit()
        
        # Generate JWT token
        access_token = create_access_token(identity=str(user.id))
        
        # Redirect to frontend with token
        return redirect(f"{FRONTEND_URL}/auth/callback?token={access_token}")
        
    except Exception as e:
        logger.error(f"Google OAuth error: {str(e)}")
        return redirect(f"{FRONTEND_URL}/login?error=oauth_failed")


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
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
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
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
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
        # Store only the relative path in the database
        relative_avatar_path = os.path.join('avatars', filename)
        user.avatar = relative_avatar_path
        db.session.commit()
        return jsonify({"msg": "Avatar updated successfully", "avatar_path": relative_avatar_path}), 200


# --- Intelli-Tutor Endpoints ---

@app.route('/courses', methods=['POST'])
@jwt_required()
def create_course():
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    question = sanitize_input(data.get('question'))
    document_ids = data.get('document_ids') # Optional list of document IDs
    stream = data.get('stream', False)  # Enable streaming if requested

    if not question:
        return api_error("Question is required", ErrorCode.VALIDATION_ERROR)

    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)

    # Filter documents that have vector stores (ready for querying)
    documents_to_search = [d for d in course.documents if d.vector_store_path]
    if document_ids:
        documents_to_search = [doc for doc in documents_to_search if doc.id in document_ids]

    if not documents_to_search:
        return api_error("No processed documents available for chat", ErrorCode.PROCESSING_ERROR)

    # Save user message
    user_message = ChatMessage(
        course_id=course_id,
        user_id=current_user_id,
        role='user',
        content=question
    )
    db.session.add(user_message)
    
    # If streaming requested, use SSE
    if stream:
        # Commit user message first before streaming
        db.session.commit()
        
        # Extract document data before generator to avoid SQLAlchemy detached object issues
        docs_data = [{
            'id': d.id,
            'filename': d.filename,
            'vector_store_path': d.vector_store_path
        } for d in documents_to_search]
        
        def generate():
            try:
                for chunk_data in rag_engine.query_rag_stream(question, course_id, docs_data):
                    if isinstance(chunk_data, dict):
                        # Final response with sources
                        sources = chunk_data.get('sources', [])
                        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
                    else:
                        # Text chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_data})}\n\n"
                
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                logger.error(f"Streaming chat error: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        })
    
    # Non-streaming response
    try:
        answer_data = rag_engine.query_rag(question, course_id, documents_to_search)
        
        # Save AI message
        ai_message = ChatMessage(
            course_id=course_id,
            user_id=current_user_id,
            role='assistant',
            content=answer_data.get("answer", ""),
            sources=answer_data.get("sources", [])
        )
        db.session.add(ai_message)
        db.session.commit()
        
        return jsonify({"answer": answer_data["answer"], "sources": answer_data["sources"]}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Chat error: {str(e)}")
        return api_error("Failed to process chat", ErrorCode.PROCESSING_ERROR, 500)


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
    current_user_id = int(get_jwt_identity())
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"msg": "Course not found"}), 404

    try:
        # Get optional parameters from request body
        data = request.get_json() or {}
        difficulty = data.get('difficulty', 'medium')  # easy, medium, hard
        count = data.get('count', 5)  # 5, 10, 15, 20
        # Question types: mcq, true_false, fill_blank (no short_answer/essay by default)
        question_types = data.get('question_types', ['mcq', 'true_false', 'fill_blank'])
        
        # Validate parameters
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'medium'
        if count not in [5, 10, 15, 20]:
            count = 5
        
        # Validate question types
        valid_types = ['mcq', 'true_false', 'fill_blank']
        question_types = [t for t in question_types if t in valid_types]
        if not question_types:
            question_types = ['mcq']  # Default to MCQ only
        
        # Pass parameters to quiz generation engine
        quiz_data = rag_engine.generate_quiz_from_docs(
            course.documents, 
            difficulty=difficulty, 
            count=count,
            question_types=question_types
        )
        
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
    current_user_id = int(get_jwt_identity())
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


@app.route('/courses/<int:course_id>/mind-map', methods=['POST'])
@jwt_required()
def generate_mind_map(course_id):
    """Generate a mind map from course documents."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    topic = data.get('topic')  # Optional topic to focus on
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    # Get documents with vector stores
    documents_to_use = [d for d in course.documents if d.vector_store_path]
    
    if not documents_to_use:
        return api_error("No processed documents available", ErrorCode.PROCESSING_ERROR)
    
    try:
        # Extract document data to avoid SQLAlchemy detached object issues
        docs_data = [{
            'id': d.id,
            'filename': d.filename,
            'vector_store_path': d.vector_store_path
        } for d in documents_to_use]
        
        mind_map_data = rag_engine.generate_mind_map(docs_data, topic=topic)
        
        return jsonify({
            "nodes": mind_map_data.get("nodes", []),
            "edges": mind_map_data.get("edges", []),
            "central_topic": mind_map_data.get("central_topic", "Mind Map"),
            "course_name": course.name
        }), 200
    except Exception as e:
        logger.error(f"Mind map generation error: {str(e)}")
        return api_error("Failed to generate mind map", ErrorCode.PROCESSING_ERROR, 500)


@app.route('/courses/<int:course_id>/quizzes/history', methods=['GET'])
@jwt_required()
def get_quiz_history(course_id):
    current_user_id = int(get_jwt_identity())
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

    print(f"DEBUG: Received request for study guide generation for course {course_id}")

    if not course:
        print(f"DEBUG: Course {course_id} not found.")
        return jsonify({"msg": "Course not found"}), 404

    try:
        print(f"DEBUG: Calling get_all_text_for_course for course {course_id}...")
        full_text = rag_engine.get_all_text_for_course(course.documents)
        print(f"DEBUG: Finished get_all_text_for_course. Full text length: {len(full_text) if full_text else 0}")

        if not full_text or not full_text.strip():
            print(f"DEBUG: No content found for course {course_id} to generate a study guide.")
            return Response("No content found for this course to generate a study guide.", status=404, mimetype='text/plain')

        print(f"DEBUG: Calling generate_study_guide_from_text for course {course_id}...")
        # Use the new function from rag_engine to handle streaming
        stream = rag_engine.generate_study_guide_from_text(full_text)
        print(f"DEBUG: Finished generate_study_guide_from_text for course {course_id}. Returning response.")
        
        return Response(stream_with_context(stream), mimetype='text/plain')

    except Exception as e:
        print(f"ERROR: Exception in generate_study_guide route for course {course_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"msg": "An error occurred while generating the study guide."}), 500


# --- Notes Endpoints ---

@app.route('/notes', methods=['POST'])
@jwt_required()
def create_note():
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
    notes = Note.query.filter_by(course_id=course_id, user_id=current_user_id).all()
    return jsonify([{"id": n.id, "title": n.title, "content": n.content, "created_at": n.created_at} for n in notes]), 200

@app.route('/notes/<int:note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    current_user_id = int(get_jwt_identity())
    note = Note.query.get(note_id)

    if not note:
        return jsonify({"msg": "Note not found"}), 404

    if note.user_id != current_user_id:
        return jsonify({"msg": "Unauthorized"}), 403

    data = request.get_json()
    note.title = data.get('title', note.title)
    note.content = data.get('content', note.content)
    db.session.commit()

    return jsonify({"msg": "Note updated successfully"}), 200

@app.route('/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    current_user_id = int(get_jwt_identity())
    note = Note.query.get(note_id)

    if not note:
        return jsonify({"msg": "Note not found"}), 404

    if note.user_id != current_user_id:
        return jsonify({"msg": "Unauthorized"}), 403

    db.session.delete(note)
    db.session.commit()

    return jsonify({"msg": "Note deleted successfully"}), 200

@app.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
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
    current_user_id = int(get_jwt_identity())
    
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


# --- Chat History Endpoints ---

@app.route('/courses/<int:course_id>/chat-history', methods=['GET'])
@jwt_required()
def get_chat_history(course_id):
    """Get chat history for a course"""
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    messages = ChatMessage.query.filter_by(
        course_id=course_id, 
        user_id=current_user_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return jsonify([{
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "sources": msg.sources,
        "created_at": msg.created_at.isoformat()
    } for msg in messages]), 200

@app.route('/courses/<int:course_id>/chat-history', methods=['DELETE'])
@jwt_required()
def clear_chat_history(course_id):
    """Clear chat history for a course"""
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    num_deleted = ChatMessage.query.filter_by(
        course_id=course_id, 
        user_id=current_user_id
    ).delete()
    db.session.commit()
    
    return jsonify({"msg": f"Cleared {num_deleted} messages"}), 200


# --- Flashcard Endpoints ---

@app.route('/courses/<int:course_id>/generate-flashcards', methods=['POST'])
@jwt_required()
def generate_flashcards(course_id):
    """Generate flashcards using AI from course documents"""
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    if not course.documents:
        return api_error("No documents in course", ErrorCode.VALIDATION_ERROR)
    
    data = request.get_json() or {}
    count = min(data.get('count', 10), 30)  # Max 30 cards
    topic = data.get('topic')  # Optional focus topic
    
    try:
        # Get documents with vector stores
        documents_to_use = [d for d in course.documents if d.vector_store_path]
        
        if not documents_to_use:
            return api_error("No processed documents available", ErrorCode.PROCESSING_ERROR)
        
        # Extract document data for rag_engine
        document_data = [{
            'id': d.id,
            'filename': d.filename,
            'vector_store_path': d.vector_store_path
        } for d in documents_to_use]
        
        # Generate flashcards using AI (now with source citations and difficulty)
        difficulty = data.get('difficulty', 'medium')
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'medium'
        flashcard_data = rag_engine.generate_flashcards(document_data, count, topic=topic, difficulty=difficulty)
        
        # Create deck
        deck_name = f"Flashcards ({difficulty.title()}): {topic}" if topic else f"Flashcards ({difficulty.title()}) for {course.name}"
        deck = FlashcardDeck(
            course_id=course_id,
            user_id=current_user_id,
            name=deck_name
        )
        db.session.add(deck)
        db.session.flush()
        
        # Create cards with source info stored in a metadata field (JSON)
        for card in flashcard_data:
            source_info = json.dumps({
                'source': card.get('source', 'Unknown'),
                'page': card.get('page')
            })
            flashcard = Flashcard(
                deck_id=deck.id,
                front=card.get('front', ''),
                back=card.get('back', ''),
                next_review=datetime.utcnow()
            )
            # Store source in the existing model (we'll add to response)
            flashcard.source_info = source_info  # This will be handled dynamically
            db.session.add(flashcard)
        
        db.session.commit()
        
        create_notification(
            current_user_id,
            f"Generated {len(flashcard_data)} flashcards for '{course.name}'",
            'success',
            course_id
        )
        
        return jsonify({
            "deck_id": deck.id,
            "count": len(flashcard_data),
            "cards": flashcard_data,  # Return cards with source info
            "msg": "Flashcards generated successfully"
        }), 201
        
    except Exception as e:
        logger.error(f"Flashcard generation error: {str(e)}")
        return api_error("Failed to generate flashcards", ErrorCode.PROCESSING_ERROR, 500, {"detail": str(e)})


@app.route('/flashcards/explain', methods=['POST'])
@jwt_required()
def explain_flashcard():
    """Get a detailed explanation of a flashcard answer"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    card_front = data.get('front')
    card_back = data.get('back')
    course_id = data.get('course_id')
    
    if not all([card_front, card_back, course_id]):
        return api_error("Missing front, back, or course_id", ErrorCode.VALIDATION_ERROR)
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    # Get documents with vector stores
    documents_to_use = [d for d in course.documents if d.vector_store_path]
    document_data = [{
        'id': d.id,
        'filename': d.filename,
        'vector_store_path': d.vector_store_path
    } for d in documents_to_use]
    
    try:
        explanation = rag_engine.explain_flashcard(card_front, card_back, document_data)
        return jsonify({"explanation": explanation}), 200
    except Exception as e:
        logger.error(f"Flashcard explain error: {str(e)}")
        return api_error("Failed to explain flashcard", ErrorCode.PROCESSING_ERROR, 500)


@app.route('/flashcards/regenerate', methods=['POST'])
@jwt_required()
def regenerate_flashcard():
    """Regenerate a single flashcard"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    course_id = data.get('course_id')
    existing_cards = data.get('existing_cards', [])
    topic = data.get('topic')
    
    if not course_id:
        return api_error("Missing course_id", ErrorCode.VALIDATION_ERROR)
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    # Get documents with vector stores
    documents_to_use = [d for d in course.documents if d.vector_store_path]
    document_data = [{
        'id': d.id,
        'filename': d.filename,
        'vector_store_path': d.vector_store_path
    } for d in documents_to_use]
    
    try:
        new_card = rag_engine.regenerate_single_flashcard(existing_cards, document_data, topic=topic)
        if new_card:
            return jsonify({"card": new_card}), 200
        else:
            return api_error("Failed to generate new card", ErrorCode.PROCESSING_ERROR, 500)
    except Exception as e:
        logger.error(f"Flashcard regenerate error: {str(e)}")
        return api_error("Failed to regenerate flashcard", ErrorCode.PROCESSING_ERROR, 500)



@app.route('/courses/<int:course_id>/flashcards', methods=['GET'])
@jwt_required()
def get_flashcards(course_id):
    """Get all flashcard decks and cards for a course"""
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    decks = FlashcardDeck.query.filter_by(course_id=course_id, user_id=current_user_id).all()
    
    result = []
    for deck in decks:
        cards_due = Flashcard.query.filter(
            Flashcard.deck_id == deck.id,
            (Flashcard.next_review <= datetime.utcnow()) | (Flashcard.next_review == None)
        ).count()
        
        result.append({
            "id": deck.id,
            "name": deck.name,
            "created_at": deck.created_at.isoformat(),
            "total_cards": len(deck.cards),
            "cards_due": cards_due,
            "cards": [{
                "id": card.id,
                "front": card.front,
                "back": card.back,
                "ease_factor": card.ease_factor,
                "interval": card.interval,
                "repetitions": card.repetitions,
                "next_review": card.next_review.isoformat() if card.next_review else None,
                "last_reviewed": card.last_reviewed.isoformat() if card.last_reviewed else None,
                "source": (json.loads(card.source_info).get('source') if card.source_info else None),
                "page": (json.loads(card.source_info).get('page') if card.source_info else None)
            } for card in deck.cards]
        })
    
    return jsonify(result), 200

@app.route('/flashcards/<int:card_id>/review', methods=['POST'])
@jwt_required()
def review_flashcard(card_id):
    """Submit a flashcard review with SM-2 algorithm"""
    current_user_id = int(get_jwt_identity())
    card = Flashcard.query.get(card_id)
    
    if not card:
        return api_error("Flashcard not found", ErrorCode.NOT_FOUND, 404)
    
    # Verify ownership through deck -> course
    deck = FlashcardDeck.query.get(card.deck_id)
    if not deck or deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    data = request.get_json()
    quality = data.get('quality', 3)  # 0-5 scale (0=forgot, 5=perfect)
    quality = max(0, min(5, quality))
    
    # SM-2 Algorithm
    if quality < 3:
        # Failed - reset
        card.repetitions = 0
        card.interval = 1
    else:
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.ease_factor)
        
        card.repetitions += 1
    
    # Update ease factor
    card.ease_factor = max(1.3, card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    card.last_reviewed = datetime.utcnow()
    card.next_review = datetime.utcnow() + timedelta(days=card.interval)
    
    db.session.commit()
    
    return jsonify({
        "card_id": card.id,
        "next_review": card.next_review.isoformat(),
        "interval": card.interval,
        "ease_factor": card.ease_factor
    }), 200


@app.route('/flashcards/<int:card_id>', methods=['DELETE'])
@jwt_required()
def delete_flashcard(card_id):
    """Delete a single flashcard"""
    current_user_id = int(get_jwt_identity())
    card = Flashcard.query.get(card_id)
    
    if not card:
        return api_error("Flashcard not found", ErrorCode.NOT_FOUND, 404)
    
    # Verify ownership through deck -> user relationship
    deck = FlashcardDeck.query.get(card.deck_id)
    if not deck or deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    db.session.delete(card)
    db.session.commit()
    
    return jsonify({"msg": "Flashcard deleted successfully"}), 200


@app.route('/flashcards/decks/<int:deck_id>', methods=['DELETE'])
@jwt_required()
def delete_flashcard_deck(deck_id):
    """Delete an entire flashcard deck (cascades to all cards)"""
    current_user_id = int(get_jwt_identity())
    deck = FlashcardDeck.query.get(deck_id)
    
    if not deck:
        return api_error("Deck not found", ErrorCode.NOT_FOUND, 404)
    
    if deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    card_count = len(deck.cards)
    db.session.delete(deck)  # Cascades to delete all cards due to relationship
    db.session.commit()
    
    return jsonify({
        "msg": f"Deck deleted with {card_count} cards"
    }), 200


@app.route('/flashcards/<int:card_id>', methods=['PUT'])
@jwt_required()
def update_flashcard(card_id):
    """Edit a flashcard's front/back content"""
    current_user_id = int(get_jwt_identity())
    card = Flashcard.query.get(card_id)
    
    if not card:
        return api_error("Flashcard not found", ErrorCode.NOT_FOUND, 404)
    
    # Verify ownership
    deck = FlashcardDeck.query.get(card.deck_id)
    if not deck or deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    data = request.get_json() or {}
    
    if 'front' in data:
        card.front = sanitize_input(data['front'])
    if 'back' in data:
        card.back = sanitize_input(data['back'])
    
    db.session.commit()
    
    return jsonify({
        "msg": "Flashcard updated",
        "card": {
            "id": card.id,
            "front": card.front,
            "back": card.back
        }
    }), 200


# --- Flashcard Export Endpoints ---

@app.route('/flashcards/decks/<int:deck_id>/export/pdf', methods=['GET'])
@jwt_required()
def export_flashcards_pdf(deck_id):
    """Export flashcard deck as styled PDF using ReportLab"""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.units import inch
    
    current_user_id = int(get_jwt_identity())
    deck = FlashcardDeck.query.get(deck_id)
    
    if not deck:
        return api_error("Deck not found", ErrorCode.NOT_FOUND, 404)
    if deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    try:
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=20,
            alignment=1  # center
        )
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.gray,
            spaceAfter=30,
            alignment=1
        )
        question_style = ParagraphStyle(
            'Question',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=5
        )
        answer_style = ParagraphStyle(
            'Answer',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333')
        )
        
        # Build content
        story = []
        
        # Header
        story.append(Paragraph(f"📚 {deck.name}", title_style))
        story.append(Paragraph(f"{len(deck.cards)} Flashcards | Generated by Intelli-Tutor", subtitle_style))
        story.append(Spacer(1, 20))
        
        # Cards
        for i, card in enumerate(deck.cards, 1):
            # Create a table for each card
            card_data = [
                [Paragraph(f"<b>Card {i}</b>", styles['Normal'])],
                [Paragraph(f"<b>Q:</b> {card.front}", question_style)],
                [Paragraph(f"<b>A:</b> {card.back}", answer_style)]
            ]
            
            card_table = Table(card_data, colWidths=[6.5*inch])
            card_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8f9fa')),
                ('BACKGROUND', (0, 2), (-1, 2), colors.white),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#eee')),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ]))
            
            story.append(card_table)
            story.append(Spacer(1, 15))
        
        # Footer
        story.append(Spacer(1, 20))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.gray, alignment=1)
        story.append(Paragraph(f"Created with Intelli-Tutor • {datetime.utcnow().strftime('%B %d, %Y')}", footer_style))
        
        # Build PDF
        doc.build(story)
        pdf_buffer.seek(0)
        
        from flask import send_file
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{deck.name.replace(' ', '_')}.pdf"
        )
    except Exception as e:
        logger.error(f"PDF export error: {str(e)}")
        return api_error(f"Failed to generate PDF: {str(e)}", ErrorCode.PROCESSING_ERROR, 500)


@app.route('/flashcards/decks/<int:deck_id>/export/csv', methods=['GET'])
@jwt_required()
def export_flashcards_csv(deck_id):
    """Export flashcard deck as CSV"""
    import csv
    from io import StringIO
    
    current_user_id = int(get_jwt_identity())
    deck = FlashcardDeck.query.get(deck_id)
    
    if not deck:
        return api_error("Deck not found", ErrorCode.NOT_FOUND, 404)
    if deck.user_id != current_user_id:
        return api_error("Unauthorized", ErrorCode.AUTH_ERROR, 403)
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Front (Question)', 'Back (Answer)', 'Ease Factor', 'Interval (Days)', 'Next Review'])
    
    # Card rows
    for card in deck.cards:
        writer.writerow([
            card.front,
            card.back,
            card.ease_factor,
            card.interval,
            card.next_review.isoformat() if card.next_review else 'Not scheduled'
        ])
    
    output.seek(0)
    
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename={deck.name.replace(" ", "_")}.csv'
        }
    )


# --- Chat History PDF Export ---

@app.route('/courses/<int:course_id>/chat/export/pdf', methods=['GET'])
@jwt_required()
def export_chat_pdf(course_id):
    """Export chat history as styled PDF"""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.units import inch
    
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    # Get chat messages
    messages = ChatMessage.query.filter_by(
        course_id=course_id, 
        user_id=current_user_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    if not messages:
        return api_error("No chat history to export", ErrorCode.NOT_FOUND, 404)
    
    try:
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'Title', parent=styles['Heading1'],
            fontSize=24, textColor=colors.HexColor('#667eea'),
            spaceAfter=20, alignment=1
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', parent=styles['Normal'],
            fontSize=12, textColor=colors.gray,
            spaceAfter=30, alignment=1
        )
        user_style = ParagraphStyle(
            'User', parent=styles['Normal'],
            fontSize=11, textColor=colors.HexColor('#1a1a1a'),
            leftIndent=10, spaceAfter=5
        )
        ai_style = ParagraphStyle(
            'AI', parent=styles['Normal'],
            fontSize=11, textColor=colors.HexColor('#333333'),
            leftIndent=10, spaceAfter=5
        )
        
        story = []
        story.append(Paragraph(f"💬 Chat History: {course.name}", title_style))
        story.append(Paragraph(f"{len(messages)} Messages | Exported from Intelli-Tutor", subtitle_style))
        story.append(Spacer(1, 20))
        
        for msg in messages:
            is_user = msg.sender == 'user'
            msg_data = [[Paragraph(f"<b>{'You' if is_user else '🤖 AI'}</b>", styles['Normal'])],
                        [Paragraph(msg.text[:1000] if len(msg.text) > 1000 else msg.text, user_style if is_user else ai_style)]]
            
            msg_table = Table(msg_data, colWidths=[6.5*inch])
            msg_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea') if is_user else colors.HexColor('#10b981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8f9fa')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(msg_table)
            story.append(Spacer(1, 10))
        
        story.append(Spacer(1, 20))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.gray, alignment=1)
        story.append(Paragraph(f"Exported from Intelli-Tutor • {datetime.utcnow().strftime('%B %d, %Y')}", footer_style))
        
        doc.build(story)
        pdf_buffer.seek(0)
        
        from flask import send_file
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"chat_{course.name.replace(' ', '_')}.pdf"
        )
    except Exception as e:
        logger.error(f"Chat PDF export error: {str(e)}")
        return api_error(f"Failed to generate PDF: {str(e)}", ErrorCode.PROCESSING_ERROR, 500)


# --- Study Guide PDF Export ---

@app.route('/courses/<int:course_id>/study-guide/export/pdf', methods=['POST'])
@jwt_required()
def export_study_guide_pdf(course_id):
    """Export study guide content as styled PDF"""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import inch
    
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    data = request.get_json() or {}
    content = data.get('content', '')
    
    if not content:
        return api_error("No content provided", ErrorCode.VALIDATION_ERROR, 400)
    
    try:
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'Title', parent=styles['Heading1'],
            fontSize=24, textColor=colors.HexColor('#667eea'),
            spaceAfter=20, alignment=1
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', parent=styles['Normal'],
            fontSize=12, textColor=colors.gray,
            spaceAfter=30, alignment=1
        )
        body_style = ParagraphStyle(
            'Body', parent=styles['Normal'],
            fontSize=11, textColor=colors.HexColor('#333333'),
            spaceAfter=10, leading=16
        )
        heading_style = ParagraphStyle(
            'Heading', parent=styles['Heading2'],
            fontSize=14, textColor=colors.HexColor('#667eea'),
            spaceBefore=15, spaceAfter=10
        )
        
        story = []
        story.append(Paragraph(f"📖 Study Guide: {course.name}", title_style))
        story.append(Paragraph("Generated by Intelli-Tutor AI", subtitle_style))
        story.append(Spacer(1, 20))
        
        # Parse markdown-like content
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 8))
            elif line.startswith('# '):
                story.append(Paragraph(f"<b>{line[2:]}</b>", heading_style))
            elif line.startswith('## '):
                story.append(Paragraph(f"<b>{line[3:]}</b>", heading_style))
            elif line.startswith('### '):
                story.append(Paragraph(f"<b>{line[4:]}</b>", body_style))
            elif line.startswith('- '):
                story.append(Paragraph(f"• {line[2:]}", body_style))
            elif line.startswith('* '):
                story.append(Paragraph(f"• {line[2:]}", body_style))
            else:
                story.append(Paragraph(line, body_style))
        
        story.append(Spacer(1, 30))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.gray, alignment=1)
        story.append(Paragraph(f"Generated with Intelli-Tutor • {datetime.utcnow().strftime('%B %d, %Y')}", footer_style))
        
        doc.build(story)
        pdf_buffer.seek(0)
        
        from flask import send_file
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"study_guide_{course.name.replace(' ', '_')}.pdf"
        )
    except Exception as e:
        logger.error(f"Study guide PDF export error: {str(e)}")
        return api_error(f"Failed to generate PDF: {str(e)}", ErrorCode.PROCESSING_ERROR, 500)


# --- Document Status Endpoint ---


@app.route('/courses/<int:course_id>/documents/<int:document_id>/status', methods=['GET'])
@jwt_required()
def get_document_status(course_id, document_id):
    """Get processing status of a document"""
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    document = Document.query.filter_by(id=document_id, course_id=course_id).first()
    
    if not document:
        return api_error("Document not found", ErrorCode.NOT_FOUND, 404)
    
    return jsonify({
        "id": document.id,
        "filename": document.filename,
        "processing_status": document.processing_status,
        "error_message": document.error_message
    }), 200


# --- Analytics Endpoints ---

@app.route('/analytics/summary', methods=['GET'])
@jwt_required()
def get_analytics_summary():
    """Get overall analytics summary for the current user"""
    current_user_id = int(get_jwt_identity())
    
    # Get study time per course (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    study_sessions = db.session.query(
        StudySession.course_id,
        db.func.sum(StudySession.duration_seconds).label('total_seconds')
    ).filter(
        StudySession.user_id == current_user_id,
        StudySession.created_at >= thirty_days_ago
    ).group_by(StudySession.course_id).all()
    
    # Get quiz attempts and average scores
    quiz_attempts = QuizAttempt.query.filter_by(user_id=current_user_id).all()
    quiz_scores = [a.score for a in quiz_attempts]
    avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
    
    # Get courses for study time breakdown
    courses = Course.query.filter_by(user_id=current_user_id).all()
    course_map = {c.id: c.name for c in courses}
    
    study_time_by_course = [
        {
            "course_id": cs[0],
            "course_name": course_map.get(cs[0], "Unknown"),
            "total_minutes": round(cs[1] / 60, 1) if cs[1] else 0
        }
        for cs in study_sessions
    ]
    
    # Calculate learning streak (consecutive days with activity)
    streak = calculate_learning_streak(current_user_id)
    
    # Get quiz history for trend chart (last 10 quizzes)
    recent_quizzes = QuizAttempt.query.filter_by(
        user_id=current_user_id
    ).order_by(QuizAttempt.timestamp.desc()).limit(10).all()
    
    quiz_trend = [
        {
            "date": q.timestamp.isoformat(),
            "score": q.score,
            "course_id": q.course_id
        }
        for q in reversed(recent_quizzes)
    ]
    
    return jsonify({
        "total_study_minutes": round(sum(cs[1] or 0 for cs in study_sessions) / 60, 1),
        "total_quizzes": len(quiz_attempts),
        "average_quiz_score": round(avg_quiz_score, 1),
        "learning_streak_days": streak,
        "study_time_by_course": study_time_by_course,
        "quiz_score_trend": quiz_trend,
        "total_courses": len(courses)
    }), 200


def calculate_learning_streak(user_id):
    """Calculate current learning streak (consecutive days)"""
    today = datetime.utcnow().date()
    streak = 0
    
    # Get all unique dates with activity (study sessions, quizzes, flashcard reviews)
    activity_dates = set()
    
    # Study sessions
    sessions = StudySession.query.filter_by(user_id=user_id).all()
    for s in sessions:
        activity_dates.add(s.created_at.date())
    
    # Quiz attempts
    quizzes = QuizAttempt.query.filter_by(user_id=user_id).all()
    for q in quizzes:
        activity_dates.add(q.timestamp.date())
    
    # Count consecutive days from today backwards
    current_date = today
    while current_date in activity_dates:
        streak += 1
        current_date -= timedelta(days=1)
    
    return streak


@app.route('/analytics/log-session', methods=['POST'])
@jwt_required()
def log_study_session():
    """Log a study session for analytics"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    course_id = data.get('course_id')
    duration_seconds = data.get('duration_seconds', 0)
    activity_type = data.get('activity_type', 'chat')
    
    if not course_id:
        return api_error("course_id is required", ErrorCode.VALIDATION_ERROR)
    
    session = StudySession(
        user_id=current_user_id,
        course_id=course_id,
        start_time=datetime.utcnow() - timedelta(seconds=duration_seconds),
        end_time=datetime.utcnow(),
        duration_seconds=duration_seconds,
        activity_type=activity_type
    )
    db.session.add(session)
    db.session.commit()
    
    return jsonify({"msg": "Session logged", "session_id": session.id}), 201


@app.route('/analytics/daily-activity', methods=['GET'])
@jwt_required()
def get_daily_activity():
    """Get daily activity for the last 30 days (for streak calendar)"""
    current_user_id = int(get_jwt_identity())
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Get activity by date
    daily_activity = {}
    
    # Study sessions
    sessions = StudySession.query.filter(
        StudySession.user_id == current_user_id,
        StudySession.created_at >= thirty_days_ago
    ).all()
    
    for s in sessions:
        date_key = s.created_at.date().isoformat()
        if date_key not in daily_activity:
            daily_activity[date_key] = {"minutes": 0, "quizzes": 0, "flashcards": 0}
        daily_activity[date_key]["minutes"] += round(s.duration_seconds / 60, 1)
    
    # Quiz attempts
    quizzes = QuizAttempt.query.filter(
        QuizAttempt.user_id == current_user_id,
        QuizAttempt.timestamp >= thirty_days_ago
    ).all()
    
    for q in quizzes:
        date_key = q.timestamp.date().isoformat()
        if date_key not in daily_activity:
            daily_activity[date_key] = {"minutes": 0, "quizzes": 0, "flashcards": 0}
        daily_activity[date_key]["quizzes"] += 1
    
    return jsonify(daily_activity), 200


# --- Course Sharing Endpoints ---

@app.route('/courses/<int:course_id>/share', methods=['POST'])
@jwt_required()
def create_share_link(course_id):
    """Create a shareable link for a course"""
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found or not owned by you", ErrorCode.NOT_FOUND, 404)
    
    data = request.get_json() or {}
    permission = data.get('permission', 'read')
    expires_in_days = data.get('expires_in_days', None)
    
    # Generate unique token
    import secrets
    share_token = secrets.token_urlsafe(32)
    
    expires_at = None
    if expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    share = CourseShare(
        course_id=course_id,
        created_by=current_user_id,
        share_token=share_token,
        permission=permission,
        expires_at=expires_at
    )
    db.session.add(share)
    db.session.commit()
    
    return jsonify({
        "share_token": share_token,
        "share_url": f"/shared/{share_token}",
        "permission": permission,
        "expires_at": expires_at.isoformat() if expires_at else None
    }), 201


@app.route('/courses/<int:course_id>/shares', methods=['GET'])
@jwt_required()
def get_course_shares(course_id):
    """Get all share links for a course"""
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    shares = CourseShare.query.filter_by(course_id=course_id, is_active=True).all()
    
    return jsonify([{
        "id": s.id,
        "share_token": s.share_token,
        "permission": s.permission,
        "access_count": s.access_count,
        "created_at": s.created_at.isoformat(),
        "expires_at": s.expires_at.isoformat() if s.expires_at else None
    } for s in shares]), 200


@app.route('/courses/<int:course_id>/share/<share_id>', methods=['DELETE'])
@jwt_required()
def revoke_share_link(course_id, share_id):
    """Revoke a share link"""
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    share = CourseShare.query.filter_by(id=share_id, course_id=course_id).first()
    if not share:
        return api_error("Share link not found", ErrorCode.NOT_FOUND, 404)
    
    share.is_active = False
    db.session.commit()
    
    return jsonify({"msg": "Share link revoked"}), 200


@app.route('/shared/<share_token>', methods=['GET'])
def access_shared_course(share_token):
    """Access a shared course (no auth required for read-only)"""
    share = CourseShare.query.filter_by(share_token=share_token, is_active=True).first()
    
    if not share:
        return api_error("Invalid or expired share link", ErrorCode.NOT_FOUND, 404)
    
    # Check expiration
    if share.expires_at and share.expires_at < datetime.utcnow():
        return api_error("Share link has expired", ErrorCode.FORBIDDEN, 403)
    
    # Increment access count
    share.access_count += 1
    db.session.commit()
    
    course = Course.query.get(share.course_id)
    documents = Document.query.filter_by(course_id=share.course_id).all()
    owner = User.query.get(course.user_id)
    
    return jsonify({
        "course": {
            "id": course.id,
            "name": course.name
        },
        "documents": [{
            "id": d.id,
            "filename": d.filename,
            "source_type": d.source_type
        } for d in documents],
        "permission": share.permission,
        "owner_name": owner.first_name or owner.email.split('@')[0] if owner else "Unknown"
    }), 200


# --- Shared Course Chat (No Auth Required) ---

@app.route('/shared/<share_token>/chat', methods=['POST'])
def shared_course_chat(share_token):
    """Chat with AI for a shared course (no auth, no history saved)"""
    # Validate share token
    share = CourseShare.query.filter_by(share_token=share_token, is_active=True).first()
    
    if not share:
        return api_error("Invalid or expired share link", ErrorCode.NOT_FOUND, 404)
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        return api_error("Share link has expired", ErrorCode.FORBIDDEN, 403)
    
    data = request.get_json()
    question = data.get('question', '').strip()
    
    if not question:
        return api_error("Question is required", ErrorCode.VALIDATION_ERROR, 400)
    
    # Get course and documents
    course = Course.query.get(share.course_id)
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    documents = Document.query.filter_by(course_id=share.course_id).all()
    
    if not documents:
        return api_error("No documents available for chat", ErrorCode.NOT_FOUND, 404)
    
    # Streaming response (match format of authenticated endpoint)
    if data.get('stream', False):
        # Get document data in the format rag_engine expects
        docs_data = [{
            'id': d.id,
            'filename': d.filename,
            'vector_store_path': d.vector_store_path
        } for d in documents]
        
        def generate():
            try:
                for chunk_data in rag_engine.query_rag_stream(question, share.course_id, docs_data):
                    if isinstance(chunk_data, dict):
                        # Final response with sources
                        sources = chunk_data.get('sources', [])
                        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
                    else:
                        # Text chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_data})}\n\n"
                
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                logger.error(f"Shared chat streaming error: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        })
    
    # Non-streaming response
    try:
        answer_data = rag_engine.query_rag(question, share.course_id, documents)
        # Note: We don't save messages for shared access
        return jsonify({"answer": answer_data["answer"], "sources": answer_data["sources"]}), 200
    except Exception as e:
        logger.error(f"Shared chat error: {str(e)}")
        return api_error("Failed to process chat", ErrorCode.PROCESSING_ERROR, 500)


# --- Shared Course Study Guide (No Auth Required) ---

@app.route('/shared/<share_token>/study-guide', methods=['POST'])
def shared_course_study_guide(share_token):
    """Generate study guide for a shared course (no auth)"""
    # Validate share token
    share = CourseShare.query.filter_by(share_token=share_token, is_active=True).first()
    
    if not share:
        return api_error("Invalid or expired share link", ErrorCode.NOT_FOUND, 404)
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        return api_error("Share link has expired", ErrorCode.FORBIDDEN, 403)
    
    # Get course and documents
    course = Course.query.get(share.course_id)
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    documents = Document.query.filter_by(course_id=share.course_id).all()
    
    if not documents:
        return api_error("No documents available", ErrorCode.NOT_FOUND, 404)
    
    try:
        # Get all text from documents (same as authenticated endpoint)
        full_text = rag_engine.get_all_text_for_course(documents)
        
        if not full_text or not full_text.strip():
            return Response("No content found for this course to generate a study guide.", status=404, mimetype='text/plain')
        
        # Generate study guide with streaming (same as authenticated endpoint)
        stream = rag_engine.generate_study_guide_from_text(full_text)
        
        return Response(stream_with_context(stream), mimetype='text/plain', headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        })
    except Exception as e:
        logger.error(f"Shared study guide error: {str(e)}")
        return api_error(f"Failed to generate study guide: {str(e)}", ErrorCode.PROCESSING_ERROR, 500)


# --- Glossary Endpoints ---

@app.route('/courses/<int:course_id>/extract-concepts', methods=['POST'])
@jwt_required()
def extract_course_concepts(course_id):
    """Extract key concepts from course documents and build glossary"""
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    documents = Document.query.filter_by(course_id=course_id).all()
    if not documents:
        return api_error("No documents in course", ErrorCode.VALIDATION_ERROR)
    
    # Use rag_engine to extract concepts
    concepts = rag_engine.extract_concepts_from_docs(documents)
    
    if not concepts:
        return api_error("Could not extract concepts", ErrorCode.INTERNAL_ERROR, 500)
    
    # Clear old glossary and save new
    CourseGlossary.query.filter_by(course_id=course_id).delete()
    
    for concept in concepts:
        glossary_entry = CourseGlossary(
            course_id=course_id,
            term=concept.get('term', ''),
            definition=concept.get('definition', ''),
            related_terms=concept.get('related_terms', []),
            source_document=concept.get('source', None)
        )
        db.session.add(glossary_entry)
    
    db.session.commit()
    
    return jsonify({
        "msg": "Concepts extracted successfully",
        "count": len(concepts),
        "concepts": concepts
    }), 200


@app.route('/courses/<int:course_id>/glossary', methods=['GET'])
@jwt_required()
def get_course_glossary(course_id):
    """Get all glossary terms for a course"""
    current_user_id = int(get_jwt_identity())
    
    # Allow access if owner or has share access
    course = Course.query.get(course_id)
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    glossary = CourseGlossary.query.filter_by(course_id=course_id).order_by(CourseGlossary.term).all()
    
    return jsonify([{
        "id": g.id,
        "term": g.term,
        "definition": g.definition,
        "related_terms": g.related_terms or [],
        "source_document": g.source_document
    } for g in glossary]), 200


# --- Essay Grading Endpoint ---

@app.route('/courses/<int:course_id>/grade-essay', methods=['POST'])
@jwt_required()
def grade_essay(course_id):
    """Grade an essay/short answer using AI"""
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return api_error("Course not found", ErrorCode.NOT_FOUND, 404)
    
    data = request.get_json()
    question = data.get('question', '')
    student_answer = data.get('answer', '')
    rubric = data.get('rubric', None)  # Optional custom rubric
    
    if not question or not student_answer:
        return api_error("Question and answer are required", ErrorCode.VALIDATION_ERROR)
    
    documents = Document.query.filter_by(course_id=course_id).all()
    
    result = rag_engine.grade_essay_response(
        question=question,
        student_answer=student_answer,
        document_models=documents,
        custom_rubric=rubric
    )
    
    return jsonify(result), 200


# --- Main Execution ---
if __name__ == '__main__':
    app.debug = True # Explicitly set debug mode
    app.run(host='0.0.0.0', port=5001)
