# Technology Stack

## Backend (Python/FastAPI)

- **Framework**: FastAPI 0.104.1 with async/await support
- **Server**: Uvicorn with auto-reload for development
- **Database**: PostgreSQL with SQLAlchemy 2.0.23 ORM and Alembic migrations
- **AI Integration**: Ollama 0.1.7 Python client for local LLM interactions
- **Authentication**: Google OAuth2 for calendar integration (optional)
- **Configuration**: Pydantic Settings 2.1.0 with environment variable support

### Backend Dependencies

- `fastapi==0.104.1` - Modern async web framework
- `uvicorn[standard]==0.24.0` - ASGI server with auto-reload
- `sqlalchemy==2.0.23` - Database ORM with async support
- `alembic==1.12.1` - Database migration tool
- `ollama==0.1.7` - Local AI model integration
- `psycopg2-binary==2.9.9` - PostgreSQL adapter
- `pydantic==2.5.0` - Data validation and settings
- `pydantic-settings==2.1.0` - Settings management
- `httpx==0.25.2` - Async HTTP client
- `python-dotenv==1.0.0` - Environment variable loading

### Google Calendar Integration

- `google-auth==2.23.4` - Google authentication
- `google-auth-oauthlib==1.1.0` - OAuth2 flow
- `google-api-python-client==2.108.0` - Google Calendar API

### Code Quality Tools

- `black==23.11.0` - Code formatting (line length: 88)
- `isort==5.12.0` - Import sorting (black profile)
- `flake8==6.1.0` - Linting
- `mypy==1.7.1` - Type checking
- `pytest==7.4.3` - Testing framework with async support

## Frontend (React/TypeScript)

- **Framework**: React 18.3.1 with TypeScript 5.2.2
- **Build Tool**: Vite 5.0.0 for fast development and building
- **Styling**: Tailwind CSS 3.3.5 with custom design system
- **State Management**: Zustand 5.0.8 for global state, React Query 5.0.0 for server state
- **Forms**: React Hook Form 7.48.0 with Zod 3.25.76 validation
- **Routing**: React Router DOM 6.20.0
- **Icons**: Lucide React 0.294.0
- **Testing**: Vitest 1.0.0 with Testing Library

### Frontend Dependencies

- `react ^18.3.1` - UI library
- `@tanstack/react-query ^5.0.0` - Server state management
- `react-hook-form ^7.48.0` - Form handling
- `zod ^3.25.76` - Schema validation
- `zustand ^5.0.8` - Client state management
- `tailwindcss ^3.3.5` - Utility-first CSS
- `axios ^1.6.0` - HTTP client
- `date-fns ^2.30.0` - Date utilities
- `clsx ^2.0.0` & `tailwind-merge ^2.0.0` - CSS class utilities

## Development Commands

### Backend

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Development
python app/main.py          # Start dev server (port 8000)
pytest                      # Run tests
black .                     # Format code
flake8 .                    # Lint code
mypy .                      # Type check

# Database
alembic upgrade head        # Run migrations
alembic revision --autogenerate -m "description"  # Create migration
```

### Frontend

```bash
cd frontend

# Setup
npm install

# Development
npm run dev                 # Start dev server (port 3000, proxies to 8000)
npm run build              # Build for production
npm run preview            # Preview production build
npm test                   # Run tests with Vitest
npm run test:ui            # Run tests with UI
npm run lint               # Run ESLint
```

## Environment Setup

- **Python**: 3.11+ required
- **Node.js**: 18+ required
- **PostgreSQL**: 14+ required
- **Ollama**: Must be installed and running locally

## Ports & URLs

- Frontend: http://localhost:3000 (Vite dev server)
- Backend API: http://localhost:8000 (FastAPI)
- API Docs: http://localhost:8000/docs (Swagger UI)
- Database: localhost:5432 (PostgreSQL)
- Ollama: http://localhost:11434

## Configuration

- Backend uses `.env` file with `pydantic-settings`
- Frontend uses Vite's environment variable system
- CORS configured for development ports (3000, 5173, 4173)
- API proxy configured in Vite for `/api` routes
