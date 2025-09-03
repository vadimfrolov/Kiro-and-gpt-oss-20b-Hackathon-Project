"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.tasks import router as tasks_router
from app.api.chat import router as chat_router
from app.api.calendar import router as calendar_router

app = FastAPI(
    title="Ollama Todo API",
    description="AI-powered todo list application with Ollama integration",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks_router)
app.include_router(chat_router)
app.include_router(calendar_router)


@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "Ollama Todo API is running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from app.services.ollama_service import ollama_service
    
    # Check database connection
    from app.core.database import check_database_connection
    db_healthy = check_database_connection()
    
    # Check Ollama connection
    ollama_healthy = await ollama_service.check_connection()
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "version": "0.1.0",
        "services": {
            "database": "healthy" if db_healthy else "unhealthy",
            "ollama": "healthy" if ollama_healthy else "unavailable"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )