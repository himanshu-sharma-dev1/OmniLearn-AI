# Intelli-Tutor System Architecture

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack Details](#technology-stack-details)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Design](#database-design)
6. [RAG Pipeline Architecture](#rag-pipeline-architecture)
7. [Authentication Flow](#authentication-flow)
8. [File Processing Pipeline](#file-processing-pipeline)
9. [Deployment Architecture](#deployment-architecture)
10. [Data Flow Diagrams](#data-flow-diagrams)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     React Frontend (Vite)                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  Dashboard  │  │    Chat     │  │    Quiz     │  │   Profile   │   │  │
│  │  │    Page     │  │  Interface  │  │   Modal     │  │    Page     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              shadcn/ui Component Library + Tailwind CSS          │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API (JSON)
                                      │ JWT Authentication
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Flask Backend Server                              │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   Auth       │  │   Course     │  │   AI/RAG     │                 │  │
│  │  │   Endpoints  │  │   Endpoints  │  │   Endpoints  │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │           Flask Extensions (CORS, JWT, SQLAlchemy, Mail)          │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│     DATA LAYER          │ │   AI/ML LAYER   │ │     EXTERNAL SERVICES       │
│                         │ │                 │ │                             │
│ ┌─────────────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────────────────┐ │
│ │  PostgreSQL/SQLite  │ │ │ │   Gemini    │ │ │ │    Google Gemini API    │ │
│ │  (Relational Data)  │ │ │ │   API       │ │ │ └─────────────────────────┘ │
│ └─────────────────────┘ │ │ └─────────────┘ │ │                             │
│                         │ │                 │ │ ┌─────────────────────────┐ │
│ ┌─────────────────────┐ │ │ ┌─────────────┐ │ │ │     SMTP Mail Server    │ │
│ │   Vector Stores     │ │ │ │Sentence     │ │ │ └─────────────────────────┘ │
│ │   (Pickle Files)    │ │ │ │Transformers │ │ │                             │
│ └─────────────────────┘ │ │ └─────────────┘ │ │ ┌─────────────────────────┐ │
│                         │ │                 │ │ │   YouTube (yt-dlp)      │ │
│ ┌─────────────────────┐ │ │ ┌─────────────┐ │ │ └─────────────────────────┘ │
│ │   File Uploads      │ │ │ │   Whisper   │ │ │                             │
│ │   (PDFs, Avatars)   │ │ │ │   (Audio)   │ │ │                             │
│ └─────────────────────┘ │ │ └─────────────┘ │ │                             │
└─────────────────────────┘ └─────────────────┘ └─────────────────────────────┘
```

---

## Technology Stack Details

### Frontend Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React** | 18.x | UI Framework | Component-based architecture, large ecosystem, excellent developer experience |
| **Vite** | 5.x | Build Tool | Lightning-fast HMR, native ES modules, superior DX over CRA |
| **TypeScript** | 5.x | Type Safety | Compile-time error detection, better IDE support, self-documenting code |
| **Tailwind CSS** | 3.x | Styling | Utility-first approach, rapid prototyping, consistent design tokens |
| **shadcn/ui** | Latest | Component Library | Accessible, customizable, not a dependency but copied into project |
| **Lucide React** | Latest | Icons | Consistent icon set, tree-shakeable, React-native |
| **React Router** | 6.x | Routing | Declarative routing, nested routes, protected route patterns |
| **Axios** | 1.x | HTTP Client | Interceptors, request cancellation, automatic JSON parsing |

### Backend Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Flask** | 3.x | Web Framework | Lightweight, flexible, perfect for REST APIs with Python |
| **Gunicorn** | 21.x | WSGI Server | Production-ready, multi-worker support, battle-tested |
| **SQLAlchemy** | 2.x | ORM | Powerful query builder, migrations support, database agnostic |
| **Flask-JWT-Extended** | 4.x | Authentication | JWT handling, token refresh, identity management |
| **Flask-CORS** | 4.x | CORS Handling | Cross-origin requests from frontend |
| **Flask-Migrate** | 4.x | DB Migrations | Alembic integration, version control for schema |
| **Flask-Mail** | 0.9.x | Email | SMTP integration for password reset emails |
| **Werkzeug** | 3.x | Utilities | Secure password hashing, file handling |

### AI/ML Technologies

| Technology | Model/Version | Purpose | Why Chosen |
|------------|--------------|---------|------------|
| **Google Gemini** | gemini-2.5-flash | Text Generation | Fast, capable, good context window, cost-effective |
| **SentenceTransformers** | all-MiniLM-L6-v2 | Embeddings | 384-dim vectors, fast inference, good semantic similarity |
| **LangChain** | 0.1.x | Text Splitting | RecursiveCharacterTextSplitter for intelligent chunking |
| **OpenAI Whisper** | base | Audio Transcription | Accurate, multilingual, handles noisy audio |
| **yt-dlp** | Latest | YouTube Download | More maintained fork of youtube-dl |
| **trafilatura** | Latest | Web Scraping | Clean text extraction from web pages |
| **PyPDF2** | 3.x | PDF Parsing | Pure Python, no external dependencies |
| **scikit-learn** | 1.x | Similarity | cosine_similarity for vector matching |

### Database/Storage

| Technology | Purpose | Location |
|------------|---------|----------|
| **PostgreSQL** | Production Database | Docker container or cloud |
| **SQLite** | Local Development DB | `backend/instance/app.db` |
| **Pickle Files** | Vector Storage | `backend/data/vector_stores/course_{id}/` |
| **File System** | Uploads | `backend/data/uploads/course_{id}/` |

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── App.tsx                 # Main router and layout
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styles + Tailwind directives
│   ├── apiClient.js            # Axios instance with interceptors
│   ├── vite-env.d.ts           # Vite type definitions
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── LoginPage.jsx       # Authentication
│   │   ├── DashboardPage.jsx   # Course listing
│   │   ├── CoursePage.jsx      # Course details
│   │   ├── ChatInterface.jsx   # AI chat
│   │   ├── QuizModal.jsx       # Quiz taking
│   │   ├── StudyGuidePage.jsx  # Study guide viewer
│   │   ├── ProfilePage.jsx     # User settings
│   │   ├── Notes.jsx           # Notes sidebar
│   │   ├── SourcesPanel.jsx    # Document sources
│   │   ├── CommandPalette.jsx  # Cmd+K interface
│   │   └── ...
│   │
│   ├── hooks/
│   │   └── use-toast.js        # Toast notification hook
│   │
│   ├── contexts/               # React contexts (if any)
│   ├── lib/                    # Utility functions
│   └── assets/                 # Static assets
│
├── public/                     # Static files served as-is
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── Dockerfile
```

### Component Hierarchy

```
App.tsx
├── BrowserRouter
│   └── AppContent
│       ├── CommandPalette (global Cmd+K)
│       ├── Routes
│       │   ├── LoginPage
│       │   ├── ForgotPasswordPage
│       │   ├── ResetPasswordPage
│       │   └── PrivateRoute wrapper
│       │       ├── DashboardPage
│       │       │   └── CourseCard (multiple)
│       │       ├── CoursePage
│       │       │   ├── AddSourceModal
│       │       │   ├── QuizModal
│       │       │   └── QuizHistory
│       │       ├── ChatInterface
│       │       │   ├── SourcesPanel
│       │       │   ├── Notes
│       │       │   ├── SearchResults
│       │       │   └── AIMessageContent
│       │       ├── StudyGuidePage
│       │       └── ProfilePage
│       └── Toaster (global notifications)
```

### State Management

The application uses local component state with React hooks:

| State Type | Location | Persistence |
|------------|----------|-------------|
| Authentication Token | `localStorage` | Browser persistent |
| Chat History | `sessionStorage` | Per-session, per-course |
| Course Data | Component state | Fetched on mount |
| User Profile | Component state | Fetched on mount |
| UI State (modals, panels) | Component state | Ephemeral |

### API Client Configuration

```javascript
// apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Backend Architecture

### Directory Structure

```
backend/
├── app.py                      # Main Flask application
├── rag_engine.py               # AI/RAG processing logic
├── __init__.py                 # Package initializer
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container definition
│
├── instance/                   # SQLite database (local dev)
│   └── app.db
│
├── data/                       # Persistent data (mounted in Docker)
│   ├── uploads/
│   │   ├── avatars/            # User avatar images
│   │   └── course_{id}/        # PDF files per course
│   ├── vector_stores/
│   │   └── course_{id}/        # Embeddings per course
│   │       ├── doc_{id}_vectors.pkl
│   │       └── doc_{id}_chunks.pkl
│   └── temp_audio/             # Temporary YouTube audio files
│
├── migrations/                 # Alembic migration files
│   └── versions/
│
└── venv/                       # Virtual environment (local)
```

### Flask Application Structure

```python
# app.py structure

# 1. Imports
from flask import Flask, request, jsonify, ...
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, ...

# 2. App Configuration
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = ...
app.config['JWT_SECRET_KEY'] = ...

# 3. Extension Initialization
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
mail = Mail(app)

# 4. Database Models
class User(db.Model): ...
class Course(db.Model): ...
class Document(db.Model): ...
class Note(db.Model): ...
class Notification(db.Model): ...
class QuizAttempt(db.Model): ...
class QuizQuestionResponse(db.Model): ...
class CourseShare(db.Model): ...
class CourseGlossary(db.Model): ...

# 5. Helper Functions
def create_notification(user_id, message, type, course_id=None): ...

# 6. API Endpoints
@app.route('/register', methods=['POST'])
def register(): ...

# 7. Main Execution
if __name__ == '__main__':
    app.run(...)
```

### Request Lifecycle

```
1. Request arrives at Flask
        │
        ▼
2. CORS middleware checks origin
        │
        ▼
3. Route matching
        │
        ▼
4. JWT validation (if @jwt_required)
        │
        ▼
5. Request handler executes
        │
   ┌────┴────┐
   │         │
   ▼         ▼
6a. DB      6b. RAG Engine
   Query        Processing
   │             │
   └──────┬──────┘
          │
          ▼
7. Response serialization (jsonify)
          │
          ▼
8. Response sent to client
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                USER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│    │ first_name          │ VARCHAR(150) │ NULLABLE                      │
│    │ last_name           │ VARCHAR(150) │ NULLABLE                      │
│    │ bio                 │ TEXT         │ NULLABLE                      │
│    │ avatar              │ VARCHAR(300) │ NULLABLE (relative path)      │
│    │ notification_prefs  │ JSON         │ NULLABLE                      │
│ UK │ email               │ VARCHAR(120) │ NOT NULL, UNIQUE              │
│    │ password_hash       │ VARCHAR(256) │ NOT NULL                      │
│    │ reset_token         │ VARCHAR(128) │ NULLABLE                      │
│    │ reset_token_exp     │ DATETIME     │ NULLABLE                      │
└─────────────────────────────────────────────────────────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                               COURSE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│    │ name                │ VARCHAR(150) │ NOT NULL                      │
│ FK │ user_id             │ INTEGER      │ NOT NULL → User.id            │
└─────────────────────────────────────────────────────────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              DOCUMENT                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│    │ filename            │ VARCHAR(150) │ NOT NULL (display name)       │
│    │ filepath            │ VARCHAR(300) │ NULLABLE (null for URLs)      │
│    │ vector_store_path   │ VARCHAR(300) │ NOT NULL (path to .pkl)       │
│    │ uploaded_at         │ DATETIME     │ DEFAULT NOW()                 │
│ FK │ course_id           │ INTEGER      │ NOT NULL → Course.id          │
│    │ source_type         │ VARCHAR(50)  │ NOT NULL ('pdf'/'url'/'yt')   │
│    │ source_url          │ VARCHAR(500) │ NULLABLE (for URL sources)    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                NOTE                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│    │ title               │ VARCHAR(200) │ NOT NULL                      │
│    │ content             │ TEXT         │ NOT NULL                      │
│    │ created_at          │ DATETIME     │ DEFAULT NOW()                 │
│ FK │ course_id           │ INTEGER      │ NOT NULL → Course.id          │
│ FK │ user_id             │ INTEGER      │ NOT NULL → User.id            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            NOTIFICATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│ FK │ user_id             │ INTEGER      │ NOT NULL → User.id            │
│    │ message             │ VARCHAR(500) │ NOT NULL                      │
│    │ type                │ VARCHAR(50)  │ NOT NULL ('success'/'error')  │
│    │ is_read             │ BOOLEAN      │ DEFAULT FALSE                 │
│    │ created_at          │ DATETIME     │ DEFAULT NOW()                 │
│ FK │ course_id           │ INTEGER      │ NULLABLE → Course.id (CASCADE)│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            QUIZ_ATTEMPT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│ FK │ user_id             │ INTEGER      │ NOT NULL → User.id            │
│ FK │ course_id           │ INTEGER      │ NOT NULL → Course.id (CASCADE)│
│    │ score               │ FLOAT        │ NOT NULL (0-100)              │
│    │ timestamp           │ DATETIME     │ DEFAULT NOW()                 │
└─────────────────────────────────────────────────────────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            QUIZ_QUESTION_RESPONSE                             │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│ FK │ quiz_attempt_id     │ INTEGER      │ NOT NULL → QuizAttempt.id     │
│    │ question_text       │ TEXT         │ NOT NULL                      │
│    │ question_type       │ VARCHAR(50)  │ NOT NULL (MCQ, TF, FB, SA)    │
│    │ selected_option     │ VARCHAR(200) │ NULLABLE (for MCQ/TF)         │
│    │ text_response       │ TEXT         │ NULLABLE (for FB/SA)          │
│    │ correct_option      │ VARCHAR(200) │ NULLABLE                      │
│    │ is_correct          │ BOOLEAN      │ NOT NULL                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            COURSE_SHARE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│ UK │ share_token         │ VARCHAR(100) │ NOT NULL, UNIQUE              │
│    │ permission          │ VARCHAR(50)  │ DEFAULT 'read'                │
│    │ access_count        │ INTEGER      │ DEFAULT 0                     │
│    │ is_active           │ BOOLEAN      │ DEFAULT TRUE                  │
│    │ expires_at          │ DATETIME     │ NULLABLE                      │
│ FK │ course_id           │ INTEGER      │ NOT NULL → Course.id (CASCADE)│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            COURSE_GLOSSARY                               │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id                  │ INTEGER      │ AUTO_INCREMENT                │
│    │ term                │ VARCHAR(200) │ NOT NULL                      │
│    │ definition          │ TEXT         │ NOT NULL                      │
│    │ related_terms       │ JSON         │ NULLABLE                      │
│    │ source              │ VARCHAR(200) │ NULLABLE                      │
│ FK │ course_id           │ INTEGER      │ NOT NULL → Course.id (CASCADE)│
└─────────────────────────────────────────────────────────────────────────┘
```

### Cascade Deletion Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | Course | No cascade (manual cleanup needed) |
| Course | Document | CASCADE (via relationship) |
| Course | Notification | CASCADE (via FK constraint) |
| Course | QuizAttempt | CASCADE (via FK constraint) |
| Course | CourseShare | CASCADE (via FK constraint) |
| Course | CourseGlossary | CASCADE (via FK constraint) |
| QuizAttempt | QuizQuestionResponse | CASCADE (via relationship) |

---

## RAG Pipeline Architecture

### Overview

RAG (Retrieval-Augmented Generation) enhances LLM responses by grounding them in specific documents. This system uses a two-stage approach:

1. **Offline Indexing**: When documents are uploaded
2. **Online Retrieval + Generation**: When users ask questions

### Indexing Pipeline

```
Document Upload
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT PROCESSING                           │
│                                                                  │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐                      │
│  │   PDF   │   │   URL    │   │ YouTube  │                      │
│  │ Upload  │   │ Scrape   │   │ Download │                      │
│  └────┬────┘   └────┬─────┘   └────┬─────┘                      │
│       │             │              │                             │
│       ▼             ▼              ▼                             │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐                      │
│  │ PyPDF2  │   │trafilatura│  │  yt-dlp  │                      │
│  │ Extract │   │ Extract  │   │ Download │                      │
│  └────┬────┘   └────┬─────┘   └────┬─────┘                      │
│       │             │              │                             │
│       │             │              ▼                             │
│       │             │         ┌──────────┐                       │
│       │             │         │ Whisper  │                       │
│       │             │         │Transcribe│                       │
│       │             │         └────┬─────┘                       │
│       │             │              │                             │
│       └─────────────┴──────────────┘                             │
│                     │                                            │
│                     ▼                                            │
│            ┌────────────────┐                                    │
│            │   Raw Text     │                                    │
│            └───────┬────────┘                                    │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TEXT CHUNKING                                 │
│                                                                  │
│          RecursiveCharacterTextSplitter                          │
│          ┌────────────────────────────┐                          │
│          │ chunk_size: 1000 chars     │                          │
│          │ chunk_overlap: 200 chars   │                          │
│          │ length_function: len       │                          │
│          └────────────────────────────┘                          │
│                                                                  │
│    "The quick brown fox..."  →  [chunk1, chunk2, chunk3, ...]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EMBEDDING GENERATION                          │
│                                                                  │
│          SentenceTransformer('all-MiniLM-L6-v2')                │
│          ┌────────────────────────────┐                          │
│          │ Output: 384-dimensional    │                          │
│          │ Normalized vectors         │                          │
│          └────────────────────────────┘                          │
│                                                                  │
│    [chunk1, chunk2, ...]  →  [[0.1, 0.2, ...], [0.3, 0.1, ...]] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VECTOR STORAGE                                │
│                                                                  │
│   data/vector_stores/course_{id}/                               │
│   ├── doc_{id}_vectors.pkl   # numpy array of embeddings        │
│   └── doc_{id}_chunks.pkl    # list of text chunks              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Query Pipeline

```
User Question: "What is machine learning?"
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY EMBEDDING                               │
│                                                                  │
│   SentenceTransformer('all-MiniLM-L6-v2')                       │
│   "What is machine learning?" → [0.2, 0.4, 0.1, ...]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SIMILARITY SEARCH                             │
│                                                                  │
│   1. Load all document embeddings for the course                │
│   2. Compute cosine similarity with query embedding             │
│   3. Select top-k (k=5) most similar chunks                     │
│                                                                  │
│   cosine_similarity(query_embedding, all_doc_embeddings)        │
│   → [0.85, 0.72, 0.91, 0.45, ...]                               │
│   → top-5 indices: [2, 0, 1, 7, 12]                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT CONSTRUCTION                          │
│                                                                  │
│   Build context with source attribution:                        │
│                                                                  │
│   Source [1]: lecture_notes.pdf                                 │
│   ---                                                           │
│   Machine learning is a subset of AI that enables...            │
│   ---                                                           │
│                                                                  │
│   Source [2]: textbook_chapter.pdf                              │
│   ---                                                           │
│   The fundamental concepts of ML include...                     │
│   ---                                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM GENERATION                                │
│                                                                  │
│   Prompt to Gemini:                                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ You are a helpful tutor. Answer based ONLY on context.  │   │
│   │ Cite sources using [1], [2] format.                     │   │
│   │                                                          │   │
│   │ Context:                                                 │   │
│   │ {constructed_context}                                    │   │
│   │                                                          │   │
│   │ Question: {user_question}                                │   │
│   │                                                          │   │
│   │ Answer:                                                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Response:                                                      │
│   "Machine learning [1] is a subset of artificial intelligence  │
│    that enables systems to learn from data [2]..."              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMATTING                           │
│                                                                  │
│   {                                                             │
│     "answer": "Machine learning [1] is a subset...",            │
│     "sources": [                                                │
│       {"document_id": 1, "filename": "lecture_notes.pdf",       │
│        "citation_number": 1},                                   │
│       {"document_id": 2, "filename": "textbook_chapter.pdf",    │
│        "citation_number": 2}                                    │
│     ]                                                           │
│   }                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Decision | Rationale |
|----------|-----------|
| **Pickle for vectors** | Simple, no external vector DB dependency, good for moderate scale |
| **all-MiniLM-L6-v2** | Fast inference (~14ms), 384 dims is compact, excellent semantic quality |
| **Chunk size 1000** | Balances context richness with retrieval precision |
| **Overlap 200** | Prevents information loss at chunk boundaries |
| **Top-5 retrieval** | Provides enough context without overwhelming LLM |
| **Citation prompting** | Ensures traceable, verifiable answers |

---

## Authentication Flow

### Registration Flow

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Browser │         │  Flask  │         │ Database │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ POST /register    │                   │
     │ {email, password} │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ Check if email    │
     │                   │ exists            │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ Hash password     │
     │                   │ (werkzeug)        │
     │                   │                   │
     │                   │ INSERT User       │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │ 201 Created       │                   │
     │<──────────────────│                   │
     │                   │                   │
```

### Login Flow

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Browser │         │  Flask  │         │ Database │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ POST /login       │                   │
     │ {email, password} │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ SELECT User       │
     │                   │ WHERE email=...   │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ Verify password   │
     │                   │ hash              │
     │                   │                   │
     │                   │ Create JWT token  │
     │                   │ identity=user.id  │
     │                   │                   │
     │ 200 OK            │                   │
     │ {access_token}    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ Store token in    │                   │
     │ localStorage      │                   │
     │                   │                   │
```

### Protected Request Flow

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Browser │         │  Flask  │         │ Database │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ GET /courses      │                   │
     │ Authorization:    │                   │
     │ Bearer <token>    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ @jwt_required()   │
     │                   │ Validate token    │
     │                   │ Extract identity  │
     │                   │                   │
     │                   │ SELECT courses    │
     │                   │ WHERE user_id=... │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │ 200 OK            │                   │
     │ [{courses...}]    │                   │
     │<──────────────────│                   │
     │                   │                   │
```

### Password Reset Flow

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│ Browser │      │  Flask  │      │ Database │      │   SMTP   │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬─────┘
     │                │                │                 │
     │ POST           │                │                 │
     │ /forgot-password                │                 │
     │ {email}        │                │                 │
     │───────────────>│                │                 │
     │                │                │                 │
     │                │ Generate token │                 │
     │                │ (secrets)      │                 │
     │                │                │                 │
     │                │ Store token    │                 │
     │                │ + expiration   │                 │
     │                │───────────────>│                 │
     │                │<───────────────│                 │
     │                │                │                 │
     │                │ Send reset     │                 │
     │                │ email          │                 │
     │                │────────────────────────────────>│
     │                │<────────────────────────────────│
     │                │                │                 │
     │ 200 OK         │                │                 │
     │<───────────────│                │                 │
     │                │                │                 │
     │ User clicks    │                │                 │
     │ email link     │                │                 │
     │                │                │                 │
     │ POST           │                │                 │
     │ /reset-password│                │                 │
     │ {token, newPwd}│                │                 │
     │───────────────>│                │                 │
     │                │                │                 │
     │                │ Verify token   │                 │
     │                │ not expired    │                 │
     │                │───────────────>│                 │
     │                │<───────────────│                 │
     │                │                │                 │
     │                │ Update pwd     │                 │
     │                │ Clear token    │                 │
     │                │───────────────>│                 │
     │                │                │                 │
     │ 200 OK         │                │                 │
     │<───────────────│                │                 │
```

### Google OAuth Flow (Added Dec 24, 2025)

```
┌─────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│ Browser │      │  Flask  │      │  Google  │      │ Database │
└────┬────┘      └────┬────┘      └────┬─────┘      └────┬─────┘
     │                │                │                 │
     │ Click          │                │                 │
     │ "Continue with │                │                 │
     │  Google"       │                │                 │
     │───────────────>│                │                 │
     │                │                │                 │
     │                │ GET /auth/google                │
     │                │ Create OAuth   │                 │
     │                │ state token    │                 │
     │                │                │                 │
     │ 302 Redirect   │                │                 │
     │ to Google      │                │                 │
     │<───────────────│                │                 │
     │                │                │                 │
     │ Google         │                │                 │
     │ Login Page     │                │                 │
     │───────────────────────────────>│                 │
     │<───────────────────────────────│                 │
     │                │                │                 │
     │ User selects   │                │                 │
     │ account        │                │                 │
     │───────────────────────────────>│                 │
     │                │                │                 │
     │ 302 Redirect   │                │                 │
     │ with auth code │                │                 │
     │<───────────────────────────────│                 │
     │                │                │                 │
     │ GET /auth/     │                │                 │
     │ google/callback│                │                 │
     │ ?code=...      │                │                 │
     │───────────────>│                │                 │
     │                │                │                 │
     │                │ Exchange code  │                 │
     │                │ for tokens     │                 │
     │                │───────────────>│                 │
     │                │<───────────────│                 │
     │                │                │                 │
     │                │ Get user info  │                 │
     │                │───────────────>│                 │
     │                │<───────────────│                 │
     │                │                │                 │
     │                │ Check if user  │                 │
     │                │ exists (email) │                 │
     │                │───────────────────────────────>│
     │                │<───────────────────────────────│
     │                │                │                 │
     │                │ If new: CREATE │                 │
     │                │ User with      │                 │
     │                │ google_id      │                 │
     │                │───────────────────────────────>│
     │                │<───────────────────────────────│
     │                │                │                 │
     │                │ Create JWT     │                 │
     │                │ token          │                 │
     │                │                │                 │
     │ 302 Redirect   │                │                 │
     │ to frontend    │                │                 │
     │ /auth/callback │                │                 │
     │ ?token=JWT     │                │                 │
     │<───────────────│                │                 │
     │                │                │                 │
     │ Store token    │                │                 │
     │ in localStorage│                │                 │
     │ Redirect to    │                │                 │
     │ dashboard      │                │                 │
```

---

## PDF Export System (Added Dec 24, 2025)

### Export Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       PDF EXPORT SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐ │
│  │   Data Source   │───>│          ReportLab Engine            │ │
│  ├─────────────────┤    ├──────────────────────────────────────┤ │
│  │ • Flashcards    │    │  • Canvas drawing                    │ │
│  │ • Chat Messages │    │  • ParagraphStyle for text           │ │
│  │ • Study Guides  │    │  • Table layouts                     │ │
│  └─────────────────┘    │  • Multi-page support                │ │
│                         └────────────────┬─────────────────────┘ │
│                                          │                       │
│                                          ▼                       │
│                         ┌──────────────────────────────────────┐ │
│                         │        PDF Output (BytesIO)          │ │
│                         ├──────────────────────────────────────┤ │
│                         │  • Branded header (purple theme)     │ │
│                         │  • Course/deck name                  │ │
│                         │  • Generation date                   │ │
│                         │  • "Intelli-Tutor" footer            │ │
│                         └────────────────┬─────────────────────┘ │
│                                          │                       │
│                                          ▼                       │
│                         ┌──────────────────────────────────────┐ │
│                         │        HTTP Response                  │ │
│                         │   Content-Type: application/pdf      │ │
│                         │   Content-Disposition: attachment     │ │
│                         └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/flashcards/decks/<id>/export/pdf` | POST | Export flashcard deck |
| `/courses/<id>/chat/export/pdf` | POST | Export chat history |
| `/courses/<id>/study-guide/export/pdf` | POST | Export study guide |

### Fallback Strategy

```
User Request → Try PDF Generation → Success? → Return PDF
                                       ↓ No
                                 Return Fallback
                                 (Text/Markdown)
```

---

## File Processing Pipeline

### PDF Processing

```python
def process_pdf_and_get_chunks(pdf_file_stream):
    # 1. Read PDF with PyPDF2
    reader = PyPDF2.PdfReader(pdf_file_stream)
    
    # 2. Extract text from all pages
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    
    # 3. Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    
    return chunks
```

### URL Processing

```python
def process_url(url):
    # 1. Detect if YouTube
    if is_youtube_url(url):
        # Download audio with yt-dlp
        # Transcribe with Whisper
        text = whisper_model.transcribe(audio_path)['text']
        title = video_info['title']
    else:
        # Generic web page
        downloaded = trafilatura.fetch_url(url)
        text = trafilatura.extract(downloaded)
        title = trafilatura.extract_metadata(downloaded).title
    
    # 2. Chunk the text
    chunks = text_splitter.split_text(text)
    
    return chunks, title
```

### Vector Store Creation

```python
def create_vector_store(chunks, course_id, document_id):
    # 1. Generate embeddings
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(chunks, convert_to_tensor=False)
    
    # 2. Create directory structure
    course_vector_dir = f"vector_stores/course_{course_id}"
    os.makedirs(course_vector_dir, exist_ok=True)
    
    # 3. Save vectors and chunks
    vector_path = f"{course_vector_dir}/doc_{document_id}_vectors.pkl"
    chunks_path = f"{course_vector_dir}/doc_{document_id}_chunks.pkl"
    
    with open(vector_path, 'wb') as f:
        pickle.dump(embeddings, f)
    
    with open(chunks_path, 'wb') as f:
        pickle.dump(chunks, f)
    
    return os.path.abspath(vector_path)
```

---

## Deployment Architecture

### Docker Compose Setup

```yaml
# docker-compose.yml

services:
  backend:
    build: ./backend
    ports:
      - "5001:5000"
    volumes:
      - ./backend:/app
      - ./migrations:/app/migrations
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/intelli_tutor_db
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      - db
    command: >
      sh -c "flask db upgrade && gunicorn --bind 0.0.0.0:5000 --timeout 300 app:app"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:13-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=intelli_tutor_db
    ports:
      - "5432:5432"

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
```

### Container Network

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network (bridge)                   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   frontend   │   │   backend    │   │      db      │    │
│  │   (nginx)    │   │   (gunicorn) │   │  (postgres)  │    │
│  │   :80        │   │   :5000      │   │   :5432      │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                  │                   │            │
│         │                  └───────────────────┘            │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
     Port 3000                Port 5001
          │                        │
          ▼                        ▼
     localhost:3000          localhost:5001
```

### Production Recommendations

For deployment to cloud platforms (Fly.io, Railway, Render):

1. **Backend**: Deploy as a Docker container with persistent volumes
2. **Frontend**: Build static assets, deploy to CDN or static hosting
3. **Database**: Use managed PostgreSQL (Supabase, Neon, Railway)
4. **Environment Variables**: Use platform secrets management
5. **Scaling**: Backend is stateless, can horizontally scale

---

## Data Flow Diagrams

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────┐
     │ Sign Up │
     └────┬────┘
          │
          ▼
     ┌─────────┐     ┌─────────────┐     ┌─────────────────┐
     │  Login  │────>│  Dashboard  │────>│  Create Course  │
     └─────────┘     └──────┬──────┘     └────────┬────────┘
                           │                      │
                           │                      ▼
                           │              ┌─────────────────┐
                           │              │  Upload Source  │
                           │              │  (PDF/URL/YT)   │
                           │              └────────┬────────┘
                           │                       │
                           │    ┌──────────────────┼──────────────────┐
                           │    │                  │                  │
                           ▼    ▼                  ▼                  ▼
                    ┌────────────────┐     ┌─────────────┐    ┌──────────────┐
                    │  Chat with AI  │     │ Take Quiz   │    │ Study Guide  │
                    │  (RAG Q&A)     │     │             │    │              │
                    └───────┬────────┘     └──────┬──────┘    └──────┬───────┘
                            │                     │                   │
                            │                     ▼                   │
                            │              ┌─────────────┐            │
                            │              │ View Quiz   │            │
                            │              │ History     │            │
                            │              └─────────────┘            │
                            │                                         │
                            ▼                                         ▼
                    ┌─────────────┐                           ┌─────────────┐
                    │ Save Notes  │                           │ Download/   │
                    │ from AI     │                           │ Print Guide │
                    └─────────────┘                           └─────────────┘
```

### API Request Flow Summary

```
Frontend Request
       │
       ▼
┌──────────────────┐
│   apiClient.js   │  ← Attach JWT token
└────────┬─────────┘
         │
         │ HTTP Request
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Flask Backend   │────>│  @jwt_required   │
└────────┬─────────┘     │  Decorator       │
         │               └────────┬─────────┘
         │                        │
         │ Valid Token            │ Invalid Token
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ Route Handler    │     │ 401 Unauthorized │
│                  │     └──────────────────┘
│ - DB Operations  │
│ - RAG Processing │
│ - Notifications  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  JSON Response   │
└────────┬─────────┘
         │
         ▼
Frontend State Update
```

---

## Security Considerations

| Area | Implementation |
|------|----------------|
| **Password Storage** | Werkzeug's `generate_password_hash` (PBKDF2-SHA256) |
| **Authentication** | JWT tokens with configurable expiration |
| **Authorization** | User ID checked against resource ownership |
| **CORS** | Configured to allow frontend origin |
| **File Uploads** | `secure_filename()` sanitization |
| **SQL Injection** | SQLAlchemy ORM parameterized queries |
| **Token Security** | `secrets.token_urlsafe()` for reset tokens |

---

## Performance Considerations

| Component | Bottleneck | Mitigation |
|-----------|------------|------------|
| **Embedding Generation** | CPU-bound | Run on GPU if available |
| **PDF Processing** | Large files | Chunking prevents memory issues |
| **Vector Search** | Linear scan | Acceptable for <1000 documents per course |
| **Gemini API** | Network latency | Streaming for study guides |
| **YouTube Processing** | Download + transcribe | Async in future |

---

*This architecture document provides a comprehensive technical overview of the Intelli-Tutor system. For implementation details, refer to the source code in [app.py](file:///Users/himanshusharma/intelli-tutor/backend/app.py) and [rag_engine.py](file:///Users/himanshusharma/intelli-tutor/backend/rag_engine.py).*
