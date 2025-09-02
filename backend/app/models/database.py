"""
Database models and schema definitions.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Priority(str, Enum):
    """Task priority levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TaskStatus(str, Enum):
    """Task status options."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class MessageRole(str, Enum):
    """Chat message roles."""
    USER = "USER"
    ASSISTANT = "ASSISTANT"


class Task(Base):
    """Task model for storing todo items."""
    
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default=Priority.MEDIUM.value)
    category = Column(String(100), nullable=True)
    status = Column(String(20), default=TaskStatus.PENDING.value)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    calendar_event_id = Column(String(255), nullable=True)
    ai_generated = Column(Boolean, default=False)


class ChatMessage(Base):
    """Chat message model for storing conversation history."""
    
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    generated_tasks = Column(JSON, nullable=True)