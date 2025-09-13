# Smart Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hackathon](https://img.shields.io/badge/Hackathon-OpenAI%20Open%20Model-blue.svg)](https://openai.devpost.com/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Code%20with%20Kiro-purple.svg)](https://kiro.devpost.com/)

A local-first AI-powered todo list application that combines React 19, FastAPI, PostgreSQL, and Ollama for intelligent task management.

## 🤖 AI-Powered Development

This project was developed with significant assistance from **Kiro IDE**, an AI-powered development environment that helped:

- 📋 **Requirements Analysis** - Generated comprehensive project requirements and user stories
- 🏗️ **Architecture Design** - Created detailed system architecture and component design documents  
- ✅ **Task Planning** - Broke down development into structured, manageable tasks
- 💻 **Feature Development** - Implemented most of the core application features including:
  - React 19 frontend with TypeScript and modern hooks
  - FastAPI backend with proper async patterns
  - Database models and API endpoints
  - AI integration with Ollama for task generation
  - Real-time chat interface and task management

Kiro IDE's AI capabilities accelerated development while maintaining code quality and architectural best practices.

Project for 2 hackathons:

[OpenAI Open Model Hackathon](https://openai.devpost.com/?_gl=1*qiue8*_ga*NTQ2ODMwNjc1LjE3NTcyNjMyMzM.)

[Code with Kiro Hackathon](https://kiro.devpost.com/)

<img width="891" height="894" alt="task view" src="https://github.com/user-attachments/assets/a2913f9c-9360-4dfd-994a-6cb5dae0db34" />
<img width="891" height="982" alt="chat view" src="https://github.com/user-attachments/assets/4d1ebf28-d93a-475c-a876-339e99b5d77b" />


## Features

- 🚀 Modern React 19 frontend with TypeScript and Vite
- 🐍 FastAPI backend with Python
- 🐘 PostgreSQL database for reliable data persistence
- 🤖 Local Ollama integration for AI-powered task suggestions
- 💬 Chat interface for natural language task generation
- 📅 Optional Google Calendar synchronization
- 🔒 Privacy-first: all data stays local

## Project Structure

```
ollama-todo-app/
├── frontend/                 # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration and settings
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI application
│   ├── tests/             # Backend tests
│   └── requirements.txt
└── README.md
```

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL 14+
- Ollama installed and running locally

## Getting Started

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ollama-todo-app
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database and Ollama settings
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Database Setup

Create a PostgreSQL database and update the DATABASE_URL in your .env file.

### 5. Start Ollama

Make sure Ollama is running locally:
```bash
ollama serve
```

### 6. Run the Application

Backend:
```bash
cd backend
python app/main.py
```

Frontend:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Frontend Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Backend Development
- `python app/main.py` - Start development server
- `pytest` - Run tests
- `black .` - Format code
- `flake8 .` - Lint code

## Architecture

The application follows a clean architecture pattern:

- **Frontend**: React 19 with TypeScript, using Vite for fast development
- **Backend**: FastAPI with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI Integration**: Local Ollama instance for privacy-preserving AI features
- **Optional**: Google Calendar API for task synchronization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
