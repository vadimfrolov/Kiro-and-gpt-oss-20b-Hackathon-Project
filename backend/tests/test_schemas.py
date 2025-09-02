"""
Tests for Pydantic schemas and validation.
"""
import pytest
from datetime import datetime
from pydantic import ValidationError

from app.schemas.task import TaskCreate, TaskUpdate, TaskFilters, GeneratedTask, WorkloadAnalysis
from app.schemas.chat import ChatMessageCreate, ChatPromptRequest, ChatResponse
from app.schemas.api import ApiResponse, PaginatedResponse, ApiError
from app.models.database import Priority, TaskStatus, MessageRole


class TestTaskSchemas:
    """Test task-related schemas."""
    
    def test_task_create_valid(self):
        """Test valid task creation."""
        task_data = {
            "title": "Test Task",
            "description": "Test description",
            "priority": Priority.HIGH,
            "category": "Work"
        }
        task = TaskCreate(**task_data)
        assert task.title == "Test Task"
        assert task.priority == Priority.HIGH
        assert task.ai_generated is False
    
    def test_task_create_minimal(self):
        """Test task creation with minimal data."""
        task = TaskCreate(title="Minimal Task")
        assert task.title == "Minimal Task"
        assert task.priority == Priority.MEDIUM
        assert task.ai_generated is False
    
    def test_task_create_invalid_title(self):
        """Test task creation with invalid title."""
        with pytest.raises(ValidationError):
            TaskCreate(title="")
        
        with pytest.raises(ValidationError):
            TaskCreate(title="   ")
    
    def test_task_update_partial(self):
        """Test partial task update."""
        update_data = {"title": "Updated Title", "priority": Priority.URGENT}
        task_update = TaskUpdate(**update_data)
        assert task_update.title == "Updated Title"
        assert task_update.priority == Priority.URGENT
        assert task_update.description is None
    
    def test_task_filters(self):
        """Test task filtering schema."""
        filters = TaskFilters(
            status=TaskStatus.PENDING,
            priority=Priority.HIGH,
            search="test"
        )
        assert filters.status == TaskStatus.PENDING
        assert filters.priority == Priority.HIGH
        assert filters.search == "test"
    
    def test_generated_task_valid(self):
        """Test generated task schema."""
        task_data = {
            "title": "Generated Task",
            "description": "AI generated description",
            "suggested_priority": Priority.MEDIUM,
            "suggested_category": "AI",
            "confidence_score": 0.85
        }
        task = GeneratedTask(**task_data)
        assert task.confidence_score == 0.85
        assert task.suggested_priority == Priority.MEDIUM
    
    def test_generated_task_invalid_confidence(self):
        """Test generated task with invalid confidence score."""
        with pytest.raises(ValidationError):
            GeneratedTask(
                title="Test",
                description="Test",
                suggested_priority=Priority.LOW,
                suggested_category="Test",
                confidence_score=1.5  # Invalid: > 1.0
            )


class TestChatSchemas:
    """Test chat-related schemas."""
    
    def test_chat_message_create(self):
        """Test chat message creation."""
        message = ChatMessageCreate(
            content="Hello, AI!",
            role=MessageRole.USER
        )
        assert message.content == "Hello, AI!"
        assert message.role == MessageRole.USER
    
    def test_chat_message_empty_content(self):
        """Test chat message with empty content."""
        with pytest.raises(ValidationError):
            ChatMessageCreate(content="", role=MessageRole.USER)
        
        with pytest.raises(ValidationError):
            ChatMessageCreate(content="   ", role=MessageRole.USER)
    
    def test_chat_prompt_request(self):
        """Test chat prompt request."""
        prompt = ChatPromptRequest(
            prompt="Create tasks for project planning",
            context="Software development project"
        )
        assert prompt.prompt == "Create tasks for project planning"
        assert prompt.context == "Software development project"
    
    def test_chat_prompt_request_no_context(self):
        """Test chat prompt request without context."""
        prompt = ChatPromptRequest(prompt="Simple task creation")
        assert prompt.prompt == "Simple task creation"
        assert prompt.context is None


class TestApiSchemas:
    """Test API response schemas."""
    
    def test_api_response(self):
        """Test generic API response."""
        response = ApiResponse[str](
            data="test data",
            message="Success",
            success=True
        )
        assert response.data == "test data"
        assert response.message == "Success"
        assert response.success is True
    
    def test_paginated_response(self):
        """Test paginated response."""
        response = PaginatedResponse[str](
            items=["item1", "item2"],
            total=10,
            page=1,
            size=2,
            pages=5
        )
        assert len(response.items) == 2
        assert response.total == 10
        assert response.pages == 5
    
    def test_api_error(self):
        """Test API error response."""
        error = ApiError(
            error="ValidationError",
            message="Invalid input data",
            details={"field": "title", "issue": "required"}
        )
        assert error.error == "ValidationError"
        assert error.message == "Invalid input data"
        assert error.details["field"] == "title"


if __name__ == "__main__":
    pytest.main([__file__])