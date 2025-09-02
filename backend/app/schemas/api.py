"""
Generic API schemas for responses and error handling.
"""
from typing import TypeVar, Generic, List, Optional, Any, Dict
from pydantic import BaseModel, Field

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """Generic API response wrapper."""
    data: T = Field(..., description="Response data")
    message: Optional[str] = Field(None, description="Optional response message")
    success: bool = Field(True, description="Whether the request was successful")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response schema."""
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")


class ApiError(BaseModel):
    """API error response schema."""
    error: str = Field(..., description="Error type or code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class HealthCheck(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Overall system status")
    database: bool = Field(..., description="Database connection status")
    ollama: bool = Field(..., description="Ollama service status")
    calendar: Optional[bool] = Field(None, description="Google Calendar integration status")


class CalendarAuthResponse(BaseModel):
    """Google Calendar authentication response."""
    success: bool = Field(..., description="Whether authentication was successful")
    message: Optional[str] = Field(None, description="Authentication status message")


class CalendarSyncResponse(BaseModel):
    """Calendar sync response schema."""
    event_id: str = Field(..., description="Google Calendar event ID")
    message: Optional[str] = Field(None, description="Sync status message")