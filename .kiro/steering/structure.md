# Project Structure

## Root Level Organization
```
ollama-todo-app/
├── backend/          # FastAPI Python backend
├── frontend/         # React TypeScript frontend
├── .git/            # Git repository
├── .kiro/           # Kiro IDE configuration
├── .vscode/         # VS Code configuration
└── README.md        # Project documentation
```

## Backend Structure (`backend/`)
```
backend/
├── app/                    # Main application package
│   ├── __init__.py
│   ├── api/               # API route handlers
│   │   ├── __init__.py
│   │   ├── tasks.py       # Task CRUD endpoints
│   │   ├── chat.py        # Chat/AI endpoints
│   │   └── calendar.py    # Calendar integration endpoints
│   ├── core/              # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py      # Pydantic settings and environment
│   │   └── database.py    # SQLAlchemy database connection
│   ├── models/            # SQLAlchemy database models
│   │   ├── __init__.py
│   │   └── database.py    # Task, ChatMessage, enums
│   ├── schemas/           # Pydantic schemas for API validation
│   │   ├── __init__.py
│   │   ├── api.py         # Common API response schemas
│   │   ├── task.py        # Task-related request/response schemas
│   │   └── chat.py        # Chat-related schemas
│   ├── services/          # Business logic layer
│   │   ├── __init__.py
│   │   ├── ollama_service.py    # AI/Ollama integration service
│   │   └── calendar_service.py  # Google Calendar API service
│   ├── utils/             # Utility functions
│   │   ├── __init__.py
│   │   ├── database.py    # Database connection helpers
│   │   └── validation.py  # Custom validation utilities
│   └── main.py           # FastAPI application entry point
├── alembic/              # Database migrations (Alembic)
│   ├── versions/         # Migration version files
│   │   └── 001_initial_database_schema.py
│   ├── env.py           # Alembic environment configuration
│   ├── script.py.mako   # Migration script template
│   └── README           # Alembic documentation
├── tests/               # Backend test suite
│   ├── __init__.py
│   ├── test_*.py        # Test modules
│   └── conftest.py      # Pytest configuration (if exists)
├── scripts/             # Database and utility scripts
│   ├── db_manager.py    # Database management utilities
│   └── init_db.py       # Database initialization
├── credentials/         # Google API credentials (gitignored)
├── .env                # Environment variables (gitignored)
├── .env.example        # Environment variable template
├── requirements.txt    # Python dependencies (pip format)
├── pyproject.toml     # Python project configuration (modern format)
├── alembic.ini        # Alembic configuration
└── ollama_todo.db     # SQLite database file (development)
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── chat/            # Chat interface components
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── PromptInput.tsx
│   │   │   ├── TaskPreview.tsx
│   │   │   └── index.ts     # Barrel exports
│   │   ├── tasks/           # Task management components
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskListWithAPI.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskFilters.tsx
│   │   │   └── index.ts     # Barrel exports
│   │   ├── ErrorBoundary.tsx
│   │   ├── Loading.tsx
│   │   ├── NotificationSystem.tsx
│   │   └── index.ts         # Component barrel exports
│   ├── hooks/               # Custom React hooks
│   │   ├── useChat.ts       # Chat functionality
│   │   ├── useTasks.ts      # Task management
│   │   ├── useCalendar.ts   # Calendar integration
│   │   ├── useHealth.ts     # Health checks
│   │   ├── useRealTimeSync.ts # Real-time updates
│   │   ├── useCaching.ts    # Caching strategies
│   │   └── index.ts         # Hook barrel exports
│   ├── lib/                 # External integrations and utilities
│   │   ├── api/            # API client functions
│   │   │   ├── tasks.ts    # Task API calls
│   │   │   ├── chat.ts     # Chat API calls
│   │   │   ├── calendar.ts # Calendar API calls
│   │   │   ├── health.ts   # Health check API
│   │   │   └── index.ts    # API barrel exports
│   │   ├── api-client.ts   # Base Axios HTTP client
│   │   └── query-client.ts # React Query configuration
│   ├── schemas/            # Zod validation schemas
│   │   ├── task.ts         # Task validation schemas
│   │   ├── chat.ts         # Chat validation schemas
│   │   ├── api.ts          # API response validation
│   │   └── index.ts        # Schema barrel exports
│   ├── stores/             # Zustand state management
│   │   ├── useUIStore.ts   # UI state (modals, notifications)
│   │   ├── useOfflineStore.ts # Offline/sync state
│   │   └── index.ts        # Store barrel exports
│   ├── types/              # TypeScript type definitions
│   │   ├── task.ts         # Task interfaces and types
│   │   ├── chat.ts         # Chat interfaces
│   │   ├── api.ts          # API response interfaces
│   │   ├── enums.ts        # Shared enums (Priority, Status, etc.)
│   │   └── index.ts        # Type barrel exports
│   ├── utils/              # Utility functions
│   │   └── validation.ts   # Form validation helpers
│   ├── test/               # Test configuration
│   │   └── setup.ts        # Vitest setup file
│   ├── App.tsx            # Main application component
│   ├── App.css            # Application-specific styles
│   ├── main.tsx           # React entry point with providers
│   └── index.css          # Global styles and Tailwind imports
├── public/                # Static assets
├── node_modules/          # NPM dependencies (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example         # Environment variable template
├── package.json         # Node.js dependencies and scripts
├── package-lock.json    # Locked dependency versions
├── vite.config.ts       # Vite build configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── tsconfig.json        # TypeScript configuration
├── tsconfig.node.json   # TypeScript config for Node.js files
├── .eslintrc.cjs        # ESLint configuration
└── index.html           # HTML entry point
```

## Key Architectural Patterns

### Backend Patterns
- **Layered Architecture**: API Routes → Services → Models → Database
- **Dependency Injection**: FastAPI's `Depends()` for database sessions and services
- **Schema Separation**: Pydantic request/response schemas separate from SQLAlchemy models
- **Async/Await**: All database and external API calls use async patterns
- **Error Handling**: Consistent HTTPException usage with proper status codes
- **Enum Usage**: Shared enums for Priority, TaskStatus, TaskCategory, MessageRole

### Frontend Patterns
- **Component Composition**: Small, focused components with clear responsibilities
- **Custom Hooks**: Business logic extracted into reusable hooks
- **State Separation**: Server state (React Query) vs Client state (Zustand)
- **Type Safety**: Full TypeScript coverage with Zod runtime validation
- **API Layer**: Centralized Axios client with consistent error handling
- **Barrel Exports**: Index files for clean imports across modules

### Database Schema
- **Task Model**: id, title, description, due_date, priority, category, status, timestamps, calendar_event_id, ai_generated
- **ChatMessage Model**: id, content, role, timestamp, generated_tasks
- **Enums**: Priority (LOW/MEDIUM/HIGH/URGENT), TaskStatus (PENDING/IN_PROGRESS/COMPLETED), TaskCategory, MessageRole (USER/ASSISTANT)

### Shared Conventions
- **Naming**: snake_case for backend Python, camelCase for frontend TypeScript
- **File Organization**: Feature-based grouping with barrel exports
- **Environment Config**: `.env.example` templates for all required variables
- **CORS Setup**: Development ports configured (3000, 5173, 4173)
- **Proxy Setup**: Vite proxies `/api` requests to backend port 8000