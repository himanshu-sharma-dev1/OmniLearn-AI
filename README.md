# Intelli-Tutor: Your Personal AI-Powered Study Companion

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

Intelli-Tutor is a sophisticated, full-stack web application engineered to provide a personalized, AI-driven learning environment. It transforms static documents into a dynamic and interactive knowledge base, empowering students and lifelong learners to study more effectively.

## 🚀 Live Demo

**[Click here to view the live application!](https://omnilearn-frontend-wandering-rain-4082.fly.dev/)**
---

## ✅ Core Capabilities

*   **📚 Multi-Source Knowledge Base:** Build a comprehensive knowledge base by uploading PDFs, or adding content from web URLs and YouTube videos.
*   **🧠 AI-Powered Chat:** Engage in interactive conversations with an AI that understands the nuances of your uploaded documents. Get accurate, context-aware answers to your questions.
*   **🔗 Interactive Citation Highlighting:** Clickable citations in the AI's response instantly highlight and scroll to the relevant source document, providing seamless verification and building trust.
*   **📝 Automated Quiz Generation:** Instantly generate dynamic, multiple-choice quizzes from your source materials to test your knowledge and identify areas for improvement.
*   **📖 On-Demand Study Guides:** Automatically create structured and comprehensive study guides from your course materials with a single click.
*   **👤 Advanced User Profiles:** Customize your profile with an avatar, bio, and notification preferences.

## ✨ Modern & Intuitive User Experience

The user interface is crafted to be professional, responsive, and highly intuitive, ensuring a seamless and engaging user journey.

*   **🎨 Polished UI/UX:** A clean, modern interface built with `shadcn/ui` and `Tailwind CSS`, providing a consistent and aesthetically pleasing design system.
*   **🌓 Light & Dark Modes:** A meticulously implemented theme that adapts to your preferences across all components, from modals to toast notifications.
*   **⌨️ Command Palette:** A `Cmd+K` interface for power users, enabling quick navigation and access to core application features.
*   **📱 Responsive Design:** A fully responsive layout that ensures a seamless experience on both desktop and mobile devices.
*   **👍 Non-Intrusive Feedback:** User actions are confirmed with clean, non-intrusive toast notifications for a smooth workflow.

---

## ⚙️ Technology Landscape

| Category             | Technology                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **Frontend**         | React, Vite, Tailwind CSS, shadcn/ui, Lucide Icons                      |
| **Backend**          | Flask (Python), Gunicorn (Production WSGI)                              |
| **Database**         | PostgreSQL (Production), SQLite (Local Development)                     |
| **AI Integration**   | Google Gemini API                                                       |
| **Containerization** | Docker, Docker Compose                                                  |

---

## 🚀 Getting Started

<details>
<summary><strong>1. Local Development Setup</strong></summary>

**Backend Setup:**

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd intelli-tutor/backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
# Create a .env file in the 'backend' directory:
touch .env

# Add your Google Gemini API key and the local frontend URL to the .env file:
echo "GEMINI_API_KEY=your_api_key_here" >> .env
echo "FRONTEND_URL=http://localhost:5173" >> .env

# 5. Apply database migrations
flask db upgrade

# 6. Run the backend server
flask run
# The backend will be running on http://127.0.0.1:5000
```

**Frontend Setup:**

```bash
# Open a new terminal window
cd intelli-tutor/frontend

# 1. Install dependencies
npm install

# 2. Run the frontend development server
npm run dev
# The frontend will be running on http://localhost:5173
```
</details>

<details>
<summary><strong>2. Production Environment with Docker</strong></summary>

This is the recommended way to run the application, as it mirrors a real-world production setup.

**Setup:**

1.  **Clone the repository** as shown above.
2.  **Create the backend `.env` file:** Navigate to `intelli-tutor/backend` and create a `.env` file.
3.  **Add your API Key:** Add `GEMINI_API_KEY=your_api_key_here` to the `.env` file. The `FRONTEND_URL` is not needed here, as it will be handled automatically by Docker's networking.

**Running the Application:**

```bash
# Navigate to the root of the project directory (intelli-tutor)
cd ..

# Build and start all services in detached mode
docker-compose up --build -d
```

The application will be available at `http://localhost:5173`.

**Useful Docker Commands:**
*   **View Logs:** `docker-compose logs -f`
*   **Stop Services:** `docker-compose down`
*   **Stop and Remove Volumes (Deletes all data):** `docker-compose down -v`
</details>

---

## 🗺️ Future Roadmap

This project has a strong foundation, with many opportunities for future growth and enhancement:

*   **Core Functionality:**
    *   **Persistent Chat History:** Implement persistent, user-specific chat history for each course.
*   **Advanced AI & Document Handling:**
    *   **Multi-Modal Document Ingestion:** Enhance the AI to understand and analyze images and tables within uploaded documents.
    *   **Expanded File Type Support:** Add support for `.docx`, `.txt`, and scraping content from web URLs.
*   **Enhanced Learning Tools:**
    *   **Advanced Quiz Customization:** Allow users to specify the number of questions, question types (e.g., short answer), and difficulty for generated quizzes.
    *   **Deeper Learning Analytics:** Provide users with insights into their quiz performance over time to identify areas of weakness and track progress.
*   **Enterprise-Grade Features:**
    *   **CI/CD & Automation:** Implement a full suite of unit and integration tests and create a CI/CD pipeline using GitHub Actions to automate testing and deployment.
    *   **User Feedback Loop:** Add a mechanism for users to rate the quality of AI responses to help fine-tune model performance.
