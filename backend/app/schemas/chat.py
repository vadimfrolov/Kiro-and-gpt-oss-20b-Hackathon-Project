"""
Chat-related Pydantic schemas for API validation.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.models.database import MessageRole
from .task import GeneratedTask


class ChatMessageBase(BaseModel):
    """Base chat message schema."""
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    role: MessageRole = Field(..., description="Message role (USER or ASSISTANT)")

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating a new chat message."""
    pass


class ChatMessage(ChatMessageBase):
    """Schema for chat message response."""
    id: int
    timestamp: datetime
    generated_tasks: Optional[List[GeneratedTask]] = Field(None, description="AI-generated tasks from this message")

    model_config = {"from_attributes": True}


class ChatMessageInDB(ChatMessage):
    """Schema for chat message as stored in database."""
    pass


class ChatPromptRequest(BaseModel):
    """Schema for chat prompt requests."""
    prompt: str = Field(..., min_length=1, max_length=5000, description="User prompt for task generation")
    context: Optional[str] = Field(None, max_length=2000, description="Additional context for the prompt")

    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()

    @field_validator('context')
    @classmethod
    def validate_context(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ChatResponse(BaseModel):
    """Schema for chat response with generated tasks."""
    message: ChatMessage = Field(..., description="The assistant's response message")
    generated_tasks: List[GeneratedTask] = Field(..., description="Tasks generated from the prompt")