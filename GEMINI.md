# Intelli-Tutor: Your Personal AI-Powered Study Companion

This document provides context for the Intelli-Tutor project, a full-stack web application designed for personalized, AI-driven learning.

## Project Overview

Intelli-Tutor transforms static documents into an interactive knowledge base. Users can upload PDFs, add content from URLs and YouTube videos, and then interact with an AI to get answers, generate quizzes, and create study guides.

**Key Technologies:**

*   **Frontend:** React, Vite, Tailwind CSS, shadcn/ui
*   **Backend:** Flask (Python), Gunicorn
*   **Database:** PostgreSQL (Production), SQLite (Local Development)
*   **AI:** Google Gemini API
*   **Containerization:** Docker, Docker Compose

## Building and Running

### Local Development

**Backend:**

1.  Navigate to the `backend` directory.
2.  Create a virtual environment and activate it.
3.  Install dependencies: `pip install -r requirements.txt`
4.  Create a `.env` file with `GEMINI_API_KEY` and `FRONTEND_URL`.
5.  Apply database migrations: `flask db upgrade`
6.  Run the server: `flask run`

**Frontend:**

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev`

### Production (Docker)

1.  Create a `.env` file in the `backend` directory with your `GEMINI_API_KEY`.
2.  From the project root, run: `docker-compose up --build -d`

The application will be available at `http://localhost:5173`.

## Development Conventions

*   **Styling:** The project uses Tailwind CSS with `shadcn/ui` for a consistent and modern design.
*   **Linting & Type Checking:** The frontend uses ESLint and TypeScript for code quality. Run `npm run preflight` to check for issues.
*   **API:** The backend is a Flask-based REST API with endpoints for user management, course creation, document handling, and AI interactions.
*   **Database Migrations:** Flask-Migrate is used to manage database schema changes.
