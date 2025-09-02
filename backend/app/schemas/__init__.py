"""
Pydantic schemas for API request/response validation.
"""
from .task import (
    Task,
    TaskCreate,
    TaskUpdate,
    TaskFilters,
    GeneratedTask,
    WorkloadAnalysis,
    TaskInDB
)
from .chat import (
    ChatMessage,
    ChatMessageCreate,
    ChatPromptRequest,
    ChatResponse,
    ChatMessageInDB
)
from .api import (
    ApiResponse,
    PaginatedResponse,
    ApiError,
    HealthCheck,
    CalendarAuthResponse,
    CalendarSyncResponse
)

__all__ = [
    # Task schemas
    "Task",
    "TaskCreate", 
    "TaskUpdate",
    "TaskFilters",
    "GeneratedTask",
    "WorkloadAnalysis",
    "TaskInDB",
    # Chat schemas
    "ChatMessage",
    "ChatMessageCreate",
    "ChatPromptRequest", 
    "ChatResponse",
    "ChatMessageInDB",
    # API schemas
    "ApiResponse",
    "PaginatedResponse",
    "ApiError",
    "HealthCheck",
    "CalendarAuthResponse",
    "CalendarSyncResponse"
]