# 🧠 Intelli-Tutor: AI-Powered Study Companion

<p align="center">
  <a href="https://omnilearn-frontend-wandering-rain-4082.fly.dev/" target="_blank"><img src="https://img.shields.io/badge/View_Live_Site-brightgreen?style=for-the-badge&logo=rocket&logoColor=white" alt="View Live Site"/></a>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini"/>
</p>

<p align="center">
  <strong>Transform your study materials into an interactive AI-powered learning experience.</strong>
</p>

## 🚀 Live Demo

**[Click here to view the live application!](https://omnilearn-frontend-wandering-rain-4082.fly.dev/)**
---

## ✨ Overview

Intelli-Tutor is a full-stack web application that transforms static documents into a dynamic, interactive knowledge base. Upload PDFs, add web URLs, import YouTube videos, and engage with an AI that truly understands your content.

---

## 🚀 Core Features

### 📚 Multi-Source Knowledge Base
- **PDF Upload** - Drag-and-drop with intelligent text extraction
- **URL Import** - Scrape content from any website
- **YouTube Import** - Extract video transcripts automatically

### 🤖 AI-Powered Learning
- **Context-Aware Chat** - Ask questions grounded in your documents
- **Interactive Citations** - Click to see exactly where info came from
- **Streaming Responses** - Real-time SSE-based message streaming
- **Mind Maps** - AI-generated concept visualization with ReactFlow

### 📝 Assessment & Study Tools
- **Smart Quizzes** - MCQ, True/False, Fill-in-Blank, Short Answer
- **AI Essay Grading** - Rubric-based evaluation with feedback
- **Flashcards** - SM-2 spaced repetition with source citations
- **Study Guides** - One-click comprehensive notes generation

### 🔐 Authentication & Sharing
- **JWT Authentication** - Secure token-based auth
- **Google OAuth** - One-click "Continue with Google" login
- **Course Sharing** - Generate public read-only links
- **Anonymous Access** - Shared users can chat with AI and generate study guides

### 📄 Export Features
- **PDF Export** - Flashcards, chat history, study guides
- **CSV Export** - Flashcard decks for Anki import
- **Copy to Clipboard** - Quick copy for any generated content

---

## 🎨 Modern UI/UX

- **Glassmorphism Design** - Beautiful backdrop blur effects
- **Dark/Light Mode** - Seamless theme switching
- **Command Palette** - `Cmd+K` for power users
- **Responsive Design** - Mobile-friendly layouts
- **Animations** - Smooth Framer Motion transitions

---

## ⚙️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | Flask, Gunicorn, SQLAlchemy, Flask-JWT-Extended |
| **Database** | PostgreSQL (prod), SQLite (dev) |
| **AI/ML** | Google Gemini, Groq, SentenceTransformers, LangChain |
| **Infra** | Docker, Docker Compose, Nginx |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **Docker** & **Docker Compose** (for containerized setup)
- **Google Gemini API Key** - [Get one here](https://makersuite.google.com/app/apikey)

---

### 🐳 Option 1: Docker (Recommended)

The quickest way to get started:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/intelli-tutor.git
cd intelli-tutor

# 2. Create environment file
cp .env.example .env

# 3. Add your API keys to .env
# Required: GEMINI_API_KEY
# Optional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for OAuth)

# 4. Build and start all services
docker-compose up --build -d

# 5. Open in browser
open http://localhost:3000
```

**Useful Docker Commands:**
```bash
docker-compose logs -f           # View logs
docker-compose down              # Stop services
docker-compose down -v           # Stop and remove volumes
docker-compose restart backend   # Restart specific service
```

---

### 💻 Option 2: Local Development

<details>
<summary><strong>Backend Setup</strong></summary>

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp ../.env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run database migrations
flask db upgrade

# Start the server
flask run --port 5001
```
</details>

<details>
<summary><strong>Frontend Setup</strong></summary>

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.
</details>

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Required - AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here  # Optional, for Groq provider

# Required - Security
JWT_SECRET_KEY=your-super-secret-jwt-key
SECRET_KEY=your-flask-secret-key

# Optional - Google OAuth (for "Continue with Google")
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000

# Optional - Email (for password reset)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
```

---

## 📁 Project Structure

```
intelli-tutor/
├── backend/
│   ├── app.py              # Flask application
│   ├── rag_engine.py       # RAG pipeline
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend container
│   └── data/               # Uploads & vector stores
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   └── apiClient.js    # API configuration
│   ├── nginx.conf          # Production server config
│   └── package.json        # Node dependencies
├── docker-compose.yml      # Container orchestration
├── Dockerfile.frontend     # Frontend container
└── tasks/                  # Development documentation
```

---

## 📸 Screenshots

> *Coming soon: Screenshots of Dashboard, Chat Interface, Quiz Modal, Mind Maps*

---

## 🧪 Testing

```bash
# Backend tests (from backend directory)
pytest

# Frontend type checking
cd frontend && npm run preflight

# Build check
npm run build
```

---

## 🚢 Deployment

The project supports multiple deployment options:

- **Docker Compose** - Self-hosted with PostgreSQL
- **DigitalOcean App Platform** - Using `docker-compose.prod.yml`
- **Fly.io** - Using `fly.backend.toml` and `fly.frontend.toml`
- **Render** - Using `render.yaml`

See `tasks/HEROKU_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

---

## 🗺️ Roadmap

### ✅ Completed (Dec 2025)
- [x] Multi-source document ingestion (PDF, URL, YouTube)
- [x] RAG-powered chat with citations
- [x] Mixed question type quizzes
- [x] Flashcards with spaced repetition
- [x] Mind map generation
- [x] Google OAuth login
- [x] PDF exports
- [x] Course sharing with anonymous access

### 🔮 Planned
- [ ] Flashcard editing
- [ ] Study session analytics
- [ ] Mobile app (React Native)
- [ ] Multi-model support (GPT-4, Claude)
- [ ] Real-time collaboration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Himanshu Sharma**
- GitHub: [@himanshu-sharma-dev](https://github.com/himanshu-sharma-dev)
- LinkedIn: [Himanshu Sharma](https://linkedin.com/in/himanshu-sharma)

---

<p align="center">
  <strong>⭐ Star this repo if you find it helpful!</strong>
</p>
