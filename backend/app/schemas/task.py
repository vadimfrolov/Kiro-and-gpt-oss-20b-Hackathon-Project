"""
Task-related Pydantic schemas for API validation.
"""
from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field, field_validator
from app.models.database import Priority, TaskStatus, TaskCategory


class TaskBase(BaseModel):
    """Base task schema with common fields."""
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    due_date: Optional[datetime] = Field(None, description="Task due date")
    priority: Priority = Field(Priority.MEDIUM, description="Task priority level")
    category: Optional[str] = Field(None, max_length=100, description="Task category")


class TaskCreate(TaskBase):
    """Schema for creating a new task."""
    ai_generated: bool = Field(False, description="Whether task was AI-generated")

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[Priority] = None
    category: Optional[str] = Field(None, max_length=100)
    status: Optional[TaskStatus] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else v

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class Task(TaskBase):
    """Schema for task response."""
    id: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    calendar_event_id: Optional[str] = None
    ai_generated: bool

    model_config = {"from_attributes": True}


class TaskInDB(Task):
    """Schema for task as stored in database."""
    pass


class TaskFilters(BaseModel):
    """Schema for task filtering parameters."""
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    category: Optional[str] = None
    due_date_from: Optional[datetime] = None
    due_date_to: Optional[datetime] = None
    search: Optional[str] = Field(None, max_length=255)

    @field_validator('search')
    @classmethod
    def validate_search(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class GeneratedTask(BaseModel):
    """Schema for AI-generated task suggestions."""
    title: str = Field(..., min_length=1, description="Generated task title")
    description: str = Field(..., description="Generated task description")
    suggested_due_date: Optional[datetime] = Field(None, description="AI-suggested due date")
    suggested_priority: Priority = Field(..., description="AI-suggested priority")
    suggested_category: str = Field(..., description="AI-suggested category")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="AI confidence score")

    @field_validator('title', 'description')
    @classmethod
    def validate_text_fields(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

    @field_validator('suggested_category')
    @classmethod
    def validate_category(cls, v):
        return v.strip() if v else v


class WorkloadAnalysis(BaseModel):
    """Schema for workload analysis results."""
    total_tasks: int = Field(..., ge=0, description="Total number of tasks")
    completed_tasks: int = Field(..., ge=0, description="Number of completed tasks")
    pending_tasks: int = Field(..., ge=0, description="Number of pending tasks")
    overdue_tasks: int = Field(..., ge=0, description="Number of overdue tasks")
    tasks_by_priority: Dict[Priority, int] = Field(..., description="Task count by priority")
    estimated_completion_time: float = Field(..., ge=0, description="Estimated completion time in hours")
    recommendations: List[str] = Field(..., description="AI-generated recommendations")

    @field_validator('tasks_by_priority')
    @classmethod
    def validate_priority_counts(cls, v):
        # Ensure all priority levels are present
        for priority in Priority:
            if priority not in v:
                v[priority] = 0
        return v