"""
Application configuration settings.
"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database settings
    DATABASE_URL: str = "postgresql://username:password@localhost:5432/ollama_todo"
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "ollama_todo"
    DATABASE_USER: str = "username"
    DATABASE_PASSWORD: str = "password"
    
    # Ollama settings
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"
    
    # Google Calendar settings (optional)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    
    # Application settings
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "your-secret-key-here"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:4173",  # Vite preview port
        "http://127.0.0.1:4173"
    ]
    
    model_config = {"env_file": ".env"}


settings = Settings()