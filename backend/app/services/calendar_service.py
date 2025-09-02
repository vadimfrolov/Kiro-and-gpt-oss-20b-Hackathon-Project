"""
Google Calendar integration service.
"""
import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.task import Task


class CalendarCredentials(BaseModel):
    """Model for storing calendar credentials."""
    access_token: str
    refresh_token: Optional[str] = None
    token_uri: str
    client_id: str
    client_secret: str
    scopes: List[str]
    expiry: Optional[datetime] = None


class CalendarEvent(BaseModel):
    """Model for calendar event data."""
    id: str
    summary: str
    description: Optional[str] = None
    start: datetime
    end: datetime
    task_id: Optional[int] = None


class GoogleCalendarService:
    """Service for Google Calendar integration."""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    CREDENTIALS_DIR = Path("credentials")
    
    def __init__(self):
        """Initialize the Google Calendar service."""
        self.credentials: Optional[Credentials] = None
        self.service = None
        self._ensure_credentials_dir()
    
    def _ensure_credentials_dir(self) -> None:
        """Ensure credentials directory exists."""
        self.CREDENTIALS_DIR.mkdir(exist_ok=True)
    
    def get_auth_url(self, user_id: str) -> str:
        """
        Generate OAuth2 authorization URL for Google Calendar access.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Authorization URL for OAuth2 flow
        """
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google Calendar credentials not configured")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=self.SCOPES
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        
        # Store user_id in state for callback
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=user_id
        )
        
        return auth_url
    
    def handle_oauth_callback(self, code: str, state: str) -> bool:
        """
        Handle OAuth2 callback and store credentials.
        
        Args:
            code: Authorization code from Google
            state: State parameter containing user_id
            
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                raise ValueError("Google Calendar credentials not configured")
            
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                    }
                },
                scopes=self.SCOPES
            )
            flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
            
            # Exchange code for credentials
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Store credentials for user
            user_id = state
            self._store_credentials(user_id, credentials)
            
            return True
            
        except Exception as e:
            print(f"OAuth callback error: {e}")
            return False
    
    def _store_credentials(self, user_id: str, credentials: Credentials) -> None:
        """
        Store user credentials securely.
        
        Args:
            user_id: User identifier
            credentials: Google OAuth2 credentials
        """
        creds_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        if credentials.expiry:
            creds_data['expiry'] = credentials.expiry.isoformat()
        
        creds_file = self.CREDENTIALS_DIR / f"{user_id}_calendar_creds.json"
        with open(creds_file, 'w') as f:
            json.dump(creds_data, f)
    
    def _load_credentials(self, user_id: str) -> Optional[Credentials]:
        """
        Load stored credentials for user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Credentials if found and valid, None otherwise
        """
        creds_file = self.CREDENTIALS_DIR / f"{user_id}_calendar_creds.json"
        
        if not creds_file.exists():
            return None
        
        try:
            with open(creds_file, 'r') as f:
                creds_data = json.load(f)
            
            credentials = Credentials(
                token=creds_data['token'],
                refresh_token=creds_data.get('refresh_token'),
                token_uri=creds_data['token_uri'],
                client_id=creds_data['client_id'],
                client_secret=creds_data['client_secret'],
                scopes=creds_data['scopes']
            )
            
            if 'expiry' in creds_data:
                credentials.expiry = datetime.fromisoformat(creds_data['expiry'])
            
            # Refresh token if expired
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                self._store_credentials(user_id, credentials)
            
            return credentials
            
        except Exception as e:
            print(f"Error loading credentials: {e}")
            return None
    
    def initialize_service(self, user_id: str) -> bool:
        """
        Initialize Google Calendar service for user.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if service initialized successfully, False otherwise
        """
        try:
            self.credentials = self._load_credentials(user_id)
            
            if not self.credentials or not self.credentials.valid:
                return False
            
            self.service = build('calendar', 'v3', credentials=self.credentials)
            return True
            
        except Exception as e:
            print(f"Error initializing calendar service: {e}")
            return False
    
    def test_connection(self, user_id: str) -> bool:
        """
        Test connection to Google Calendar API.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if connection successful, False otherwise
        """
        try:
            if not self.initialize_service(user_id):
                return False
            
            # Try to list calendars as a connection test
            calendars_result = self.service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            return len(calendars) > 0
            
        except HttpError as e:
            print(f"Calendar API error: {e}")
            return False
        except Exception as e:
            print(f"Connection test error: {e}")
            return False
    
    def get_primary_calendar_id(self, user_id: str) -> Optional[str]:
        """
        Get the primary calendar ID for the user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Primary calendar ID if found, None otherwise
        """
        try:
            if not self.initialize_service(user_id):
                return None
            
            calendars_result = self.service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            for calendar in calendars:
                if calendar.get('primary', False):
                    return calendar['id']
            
            return None
            
        except Exception as e:
            print(f"Error getting primary calendar: {e}")
            return None
    
    def is_authenticated(self, user_id: str) -> bool:
        """
        Check if user is authenticated with Google Calendar.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if authenticated, False otherwise
        """
        credentials = self._load_credentials(user_id)
        return credentials is not None and credentials.valid
    
    def revoke_access(self, user_id: str) -> bool:
        """
        Revoke Google Calendar access for user.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if revoked successfully, False otherwise
        """
        try:
            credentials = self._load_credentials(user_id)
            if credentials:
                # Revoke the token
                credentials.revoke(Request())
            
            # Remove stored credentials
            creds_file = self.CREDENTIALS_DIR / f"{user_id}_calendar_creds.json"
            if creds_file.exists():
                creds_file.unlink()
            
            return True
            
        except Exception as e:
            print(f"Error revoking access: {e}")
            return False
    
    def create_calendar_event(self, user_id: str, task: Task) -> Optional[CalendarEvent]:
        """
        Create a calendar event from a task.
        
        Args:
            user_id: User identifier
            task: Task to create calendar event for
            
        Returns:
            Created calendar event if successful, None otherwise
        """
        try:
            if not self.initialize_service(user_id):
                return None
            
            if not task.due_date:
                return None
            
            calendar_id = self.get_primary_calendar_id(user_id)
            if not calendar_id:
                return None
            
            # Create event data
            event_data = {
                'summary': task.title,
                'description': f"{task.description or ''}\n\nTask ID: {task.id}",
                'start': {
                    'dateTime': task.due_date.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': (task.due_date.replace(hour=task.due_date.hour + 1)).isoformat(),
                    'timeZone': 'UTC',
                },
                'extendedProperties': {
                    'private': {
                        'task_id': str(task.id),
                        'app_source': 'ollama_todo'
                    }
                }
            }
            
            # Create the event
            created_event = self.service.events().insert(
                calendarId=calendar_id,
                body=event_data
            ).execute()
            
            return CalendarEvent(
                id=created_event['id'],
                summary=created_event['summary'],
                description=created_event.get('description', ''),
                start=datetime.fromisoformat(created_event['start']['dateTime'].replace('Z', '+00:00')),
                end=datetime.fromisoformat(created_event['end']['dateTime'].replace('Z', '+00:00')),
                task_id=task.id
            )
            
        except HttpError as e:
            print(f"Calendar API error creating event: {e}")
            return None
        except Exception as e:
            print(f"Error creating calendar event: {e}")
            return None
    
    def update_calendar_event(self, user_id: str, task: Task, event_id: str) -> bool:
        """
        Update an existing calendar event from a task.
        
        Args:
            user_id: User identifier
            task: Updated task data
            event_id: Calendar event ID to update
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            if not self.initialize_service(user_id):
                return False
            
            calendar_id = self.get_primary_calendar_id(user_id)
            if not calendar_id:
                return False
            
            # Get existing event
            existing_event = self.service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            # Update event data
            if task.due_date:
                existing_event['start'] = {
                    'dateTime': task.due_date.isoformat(),
                    'timeZone': 'UTC',
                }
                existing_event['end'] = {
                    'dateTime': (task.due_date.replace(hour=task.due_date.hour + 1)).isoformat(),
                    'timeZone': 'UTC',
                }
            
            existing_event['summary'] = task.title
            existing_event['description'] = f"{task.description or ''}\n\nTask ID: {task.id}"
            
            # Update the event
            self.service.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=existing_event
            ).execute()
            
            return True
            
        except HttpError as e:
            print(f"Calendar API error updating event: {e}")
            return False
        except Exception as e:
            print(f"Error updating calendar event: {e}")
            return False
    
    def delete_calendar_event(self, user_id: str, event_id: str) -> bool:
        """
        Delete a calendar event.
        
        Args:
            user_id: User identifier
            event_id: Calendar event ID to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if not self.initialize_service(user_id):
                return False
            
            calendar_id = self.get_primary_calendar_id(user_id)
            if not calendar_id:
                return False
            
            # Delete the event
            self.service.events().delete(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                # Event already deleted or doesn't exist
                return True
            print(f"Calendar API error deleting event: {e}")
            return False
        except Exception as e:
            print(f"Error deleting calendar event: {e}")
            return False
    
    def sync_task_to_calendar(self, user_id: str, task: Task) -> Optional[str]:
        """
        Sync a task to Google Calendar.
        
        Args:
            user_id: User identifier
            task: Task to sync
            
        Returns:
            Calendar event ID if successful, None otherwise
        """
        try:
            if not task.due_date:
                return None
            
            # If task already has a calendar event, update it
            if task.calendar_event_id:
                success = self.update_calendar_event(user_id, task, task.calendar_event_id)
                return task.calendar_event_id if success else None
            
            # Otherwise, create a new event
            calendar_event = self.create_calendar_event(user_id, task)
            return calendar_event.id if calendar_event else None
            
        except Exception as e:
            print(f"Error syncing task to calendar: {e}")
            return None
    
    def remove_task_from_calendar(self, user_id: str, task: Task) -> bool:
        """
        Remove a task from Google Calendar.
        
        Args:
            user_id: User identifier
            task: Task to remove from calendar
            
        Returns:
            True if removed successfully, False otherwise
        """
        try:
            if not task.calendar_event_id:
                return True  # Nothing to remove
            
            return self.delete_calendar_event(user_id, task.calendar_event_id)
            
        except Exception as e:
            print(f"Error removing task from calendar: {e}")
            return False
    
    def get_calendar_events_for_task(self, user_id: str, task_id: int) -> List[CalendarEvent]:
        """
        Get calendar events associated with a specific task.
        
        Args:
            user_id: User identifier
            task_id: Task ID to search for
            
        Returns:
            List of calendar events for the task
        """
        try:
            if not self.initialize_service(user_id):
                return []
            
            calendar_id = self.get_primary_calendar_id(user_id)
            if not calendar_id:
                return []
            
            # Search for events with the task ID in extended properties
            events_result = self.service.events().list(
                calendarId=calendar_id,
                privateExtendedProperty=f'task_id={task_id}'
            ).execute()
            
            events = []
            for event in events_result.get('items', []):
                try:
                    events.append(CalendarEvent(
                        id=event['id'],
                        summary=event.get('summary', ''),
                        description=event.get('description', ''),
                        start=datetime.fromisoformat(event['start']['dateTime'].replace('Z', '+00:00')),
                        end=datetime.fromisoformat(event['end']['dateTime'].replace('Z', '+00:00')),
                        task_id=task_id
                    ))
                except Exception as e:
                    print(f"Error parsing calendar event: {e}")
                    continue
            
            return events
            
        except HttpError as e:
            print(f"Calendar API error getting events: {e}")
            return []
        except Exception as e:
            print(f"Error getting calendar events: {e}")
            return []
    
    def handle_calendar_api_error(self, error: Exception) -> Dict[str, Any]:
        """
        Handle calendar API errors and provide user-friendly messages.
        
        Args:
            error: Exception that occurred
            
        Returns:
            Error information dictionary
        """
        if isinstance(error, HttpError):
            status_code = error.resp.status
            
            if status_code == 401:
                return {
                    'error': 'authentication_required',
                    'message': 'Google Calendar authentication required. Please re-authenticate.',
                    'action': 'reauth'
                }
            elif status_code == 403:
                return {
                    'error': 'permission_denied',
                    'message': 'Permission denied. Please check calendar access permissions.',
                    'action': 'check_permissions'
                }
            elif status_code == 404:
                return {
                    'error': 'not_found',
                    'message': 'Calendar or event not found.',
                    'action': 'refresh'
                }
            elif status_code == 429:
                return {
                    'error': 'rate_limit',
                    'message': 'Too many requests. Please try again later.',
                    'action': 'retry_later'
                }
            else:
                return {
                    'error': 'api_error',
                    'message': f'Calendar API error: {error}',
                    'action': 'retry'
                }
        else:
            return {
                'error': 'unknown_error',
                'message': f'An unexpected error occurred: {error}',
                'action': 'retry'
            }


# Global calendar service instance
calendar_service = GoogleCalendarService()