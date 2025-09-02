"""
Google Calendar API endpoints.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.calendar_service import calendar_service


class AuthUrlResponse(BaseModel):
    """Response model for authentication URL."""
    auth_url: str
    message: str


class AuthStatusResponse(BaseModel):
    """Response model for authentication status."""
    authenticated: bool
    message: str


class CalendarAuthCallback(BaseModel):
    """Request model for OAuth callback."""
    code: str
    state: str


router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(user_id: str = Query(..., description="User identifier")):
    """
    Get Google Calendar OAuth2 authorization URL.
    
    Args:
        user_id: Unique identifier for the user
        
    Returns:
        Authorization URL for Google Calendar access
    """
    try:
        auth_url = calendar_service.get_auth_url(user_id)
        return AuthUrlResponse(
            auth_url=auth_url,
            message="Please visit this URL to authorize Google Calendar access"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@router.post("/auth-callback", response_model=AuthStatusResponse)
async def handle_auth_callback(callback_data: CalendarAuthCallback):
    """
    Handle OAuth2 callback from Google.
    
    Args:
        callback_data: OAuth callback data containing code and state
        
    Returns:
        Authentication status
    """
    try:
        success = calendar_service.handle_oauth_callback(
            code=callback_data.code,
            state=callback_data.state
        )
        
        if success:
            return AuthStatusResponse(
                authenticated=True,
                message="Google Calendar authentication successful"
            )
        else:
            return AuthStatusResponse(
                authenticated=False,
                message="Authentication failed"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")


@router.get("/auth-status", response_model=AuthStatusResponse)
async def get_auth_status(user_id: str = Query(..., description="User identifier")):
    """
    Check Google Calendar authentication status for user.
    
    Args:
        user_id: User identifier
        
    Returns:
        Current authentication status
    """
    try:
        is_authenticated = calendar_service.is_authenticated(user_id)
        
        return AuthStatusResponse(
            authenticated=is_authenticated,
            message="Authenticated" if is_authenticated else "Not authenticated"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking auth status: {str(e)}")


@router.post("/test-connection", response_model=Dict[str, Any])
async def test_connection(user_id: str = Query(..., description="User identifier")):
    """
    Test connection to Google Calendar API.
    
    Args:
        user_id: User identifier
        
    Returns:
        Connection test results
    """
    try:
        connection_ok = calendar_service.test_connection(user_id)
        
        if connection_ok:
            return {
                "success": True,
                "message": "Google Calendar connection successful"
            }
        else:
            return {
                "success": False,
                "message": "Google Calendar connection failed - please re-authenticate"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test error: {str(e)}")


@router.delete("/revoke-access", response_model=AuthStatusResponse)
async def revoke_access(user_id: str = Query(..., description="User identifier")):
    """
    Revoke Google Calendar access for user.
    
    Args:
        user_id: User identifier
        
    Returns:
        Revocation status
    """
    try:
        success = calendar_service.revoke_access(user_id)
        
        if success:
            return AuthStatusResponse(
                authenticated=False,
                message="Google Calendar access revoked successfully"
            )
        else:
            return AuthStatusResponse(
                authenticated=True,
                message="Failed to revoke access"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error revoking access: {str(e)}")


class SyncTaskRequest(BaseModel):
    """Request model for syncing task to calendar."""
    task_id: int
    user_id: str


class SyncTaskResponse(BaseModel):
    """Response model for task sync."""
    success: bool
    message: str
    calendar_event_id: Optional[str] = None


class CalendarEventResponse(BaseModel):
    """Response model for calendar event."""
    id: str
    summary: str
    description: Optional[str] = None
    start: datetime
    end: datetime
    task_id: Optional[int] = None


@router.post("/sync-task", response_model=SyncTaskResponse)
async def sync_task_to_calendar(
    task_id: int,
    user_id: str = Query(..., description="User identifier"),
    db: Session = Depends(get_db)
):
    """
    Sync a task to Google Calendar.
    
    Args:
        task_id: ID of the task to sync
        user_id: User identifier
        db: Database session
        
    Returns:
        Sync operation result
    """
    try:
        # Import here to avoid circular imports
        from app.models.database import Task as TaskModel
        from app.schemas.task import Task
        
        # Get the task from database
        db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Convert to schema for calendar service
        task = Task.model_validate(db_task)
        
        # Sync to calendar
        event_id = calendar_service.sync_task_to_calendar(user_id, task)
        
        if event_id:
            # Update task with calendar event ID
            db_task.calendar_event_id = event_id
            db.commit()
            db.refresh(db_task)
            
            return SyncTaskResponse(
                success=True,
                message="Task synced to Google Calendar successfully",
                calendar_event_id=event_id
            )
        else:
            return SyncTaskResponse(
                success=False,
                message="Failed to sync task to calendar - check authentication and task due date"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        error_info = calendar_service.handle_calendar_api_error(e)
        raise HTTPException(
            status_code=500,
            detail=f"Calendar sync error: {error_info['message']}"
        )


@router.delete("/remove-task/{task_id}")
async def remove_task_from_calendar(
    task_id: int,
    user_id: str = Query(..., description="User identifier"),
    db: Session = Depends(get_db)
):
    """
    Remove a task from Google Calendar.
    
    Args:
        task_id: ID of the task to remove from calendar
        user_id: User identifier
        db: Database session
        
    Returns:
        Removal operation result
    """
    try:
        # Import here to avoid circular imports
        from app.models.database import Task as TaskModel
        from app.schemas.task import Task
        
        # Get the task from database
        db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Convert to schema for calendar service
        task = Task.model_validate(db_task)
        
        # Remove from calendar
        success = calendar_service.remove_task_from_calendar(user_id, task)
        
        if success:
            # Clear calendar event ID from task
            db_task.calendar_event_id = None
            db.commit()
            
            return {"success": True, "message": "Task removed from Google Calendar"}
        else:
            return {"success": False, "message": "Failed to remove task from calendar"}
            
    except HTTPException:
        raise
    except Exception as e:
        error_info = calendar_service.handle_calendar_api_error(e)
        raise HTTPException(
            status_code=500,
            detail=f"Calendar removal error: {error_info['message']}"
        )


@router.get("/events/{task_id}", response_model=List[CalendarEventResponse])
async def get_calendar_events_for_task(
    task_id: int,
    user_id: str = Query(..., description="User identifier")
):
    """
    Get calendar events associated with a task.
    
    Args:
        task_id: Task ID to get events for
        user_id: User identifier
        
    Returns:
        List of calendar events for the task
    """
    try:
        events = calendar_service.get_calendar_events_for_task(user_id, task_id)
        
        return [
            CalendarEventResponse(
                id=event.id,
                summary=event.summary,
                description=event.description,
                start=event.start,
                end=event.end,
                task_id=event.task_id
            )
            for event in events
        ]
        
    except Exception as e:
        error_info = calendar_service.handle_calendar_api_error(e)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting calendar events: {error_info['message']}"
        )