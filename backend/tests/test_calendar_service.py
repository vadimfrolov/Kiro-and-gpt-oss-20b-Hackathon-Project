"""
Tests for Google Calendar service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import json
import tempfile
from pathlib import Path

from app.services.calendar_service import GoogleCalendarService, CalendarCredentials
from app.core.config import settings


class TestGoogleCalendarService:
    """Test cases for Google Calendar service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.service = GoogleCalendarService()
        self.test_user_id = "test_user_123"
        
    def test_ensure_credentials_dir(self):
        """Test credentials directory creation."""
        # Directory should be created during initialization
        assert self.service.CREDENTIALS_DIR.exists()
    
    @patch('app.services.calendar_service.settings')
    def test_get_auth_url_missing_credentials(self, mock_settings):
        """Test auth URL generation with missing credentials."""
        mock_settings.GOOGLE_CLIENT_ID = ""
        mock_settings.GOOGLE_CLIENT_SECRET = ""
        
        with pytest.raises(ValueError, match="Google Calendar credentials not configured"):
            self.service.get_auth_url(self.test_user_id)
    
    @patch('app.services.calendar_service.settings')
    @patch('app.services.calendar_service.Flow')
    def test_get_auth_url_success(self, mock_flow_class, mock_settings):
        """Test successful auth URL generation."""
        # Mock settings
        mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/callback"
        
        # Mock Flow
        mock_flow = Mock()
        mock_flow.authorization_url.return_value = ("https://auth.url", "state123")
        mock_flow_class.from_client_config.return_value = mock_flow
        
        auth_url = self.service.get_auth_url(self.test_user_id)
        
        assert auth_url == "https://auth.url"
        mock_flow.authorization_url.assert_called_once()
    
    @patch('app.services.calendar_service.settings')
    def test_handle_oauth_callback_missing_credentials(self, mock_settings):
        """Test OAuth callback with missing credentials."""
        mock_settings.GOOGLE_CLIENT_ID = ""
        mock_settings.GOOGLE_CLIENT_SECRET = ""
        
        result = self.service.handle_oauth_callback("test_code", self.test_user_id)
        assert result is False
    
    @patch('app.services.calendar_service.settings')
    @patch('app.services.calendar_service.Flow')
    def test_handle_oauth_callback_success(self, mock_flow_class, mock_settings):
        """Test successful OAuth callback handling."""
        # Mock settings
        mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/callback"
        
        # Mock credentials
        mock_credentials = Mock()
        mock_credentials.token = "access_token"
        mock_credentials.refresh_token = "refresh_token"
        mock_credentials.token_uri = "https://oauth2.googleapis.com/token"
        mock_credentials.client_id = "test_client_id"
        mock_credentials.client_secret = "test_client_secret"
        mock_credentials.scopes = ["https://www.googleapis.com/auth/calendar"]
        mock_credentials.expiry = None
        
        # Mock Flow
        mock_flow = Mock()
        mock_flow.credentials = mock_credentials
        mock_flow_class.from_client_config.return_value = mock_flow
        
        # Mock file operations
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_file
            
            result = self.service.handle_oauth_callback("test_code", self.test_user_id)
            
            assert result is True
            mock_flow.fetch_token.assert_called_once_with(code="test_code")
    
    def test_store_and_load_credentials(self):
        """Test credential storage and loading."""
        # Create mock credentials
        mock_credentials = Mock()
        mock_credentials.token = "access_token"
        mock_credentials.refresh_token = "refresh_token"
        mock_credentials.token_uri = "https://oauth2.googleapis.com/token"
        mock_credentials.client_id = "test_client_id"
        mock_credentials.client_secret = "test_client_secret"
        mock_credentials.scopes = ["https://www.googleapis.com/auth/calendar"]
        mock_credentials.expiry = datetime.now()
        
        # Use temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            self.service.CREDENTIALS_DIR = Path(temp_dir)
            
            # Store credentials
            self.service._store_credentials(self.test_user_id, mock_credentials)
            
            # Verify file was created
            creds_file = self.service.CREDENTIALS_DIR / f"{self.test_user_id}_calendar_creds.json"
            assert creds_file.exists()
            
            # Verify file content
            with open(creds_file, 'r') as f:
                stored_data = json.load(f)
            
            assert stored_data['token'] == "access_token"
            assert stored_data['refresh_token'] == "refresh_token"
            assert stored_data['client_id'] == "test_client_id"
    
    def test_load_credentials_file_not_found(self):
        """Test loading credentials when file doesn't exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            self.service.CREDENTIALS_DIR = Path(temp_dir)
            
            credentials = self.service._load_credentials("nonexistent_user")
            assert credentials is None
    
    @patch('app.services.calendar_service.build')
    def test_initialize_service_success(self, mock_build):
        """Test successful service initialization."""
        # Mock credentials
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            result = self.service.initialize_service(self.test_user_id)
            
            assert result is True
            assert self.service.credentials == mock_credentials
            mock_build.assert_called_once_with('calendar', 'v3', credentials=mock_credentials)
    
    def test_initialize_service_invalid_credentials(self):
        """Test service initialization with invalid credentials."""
        with patch.object(self.service, '_load_credentials', return_value=None):
            result = self.service.initialize_service(self.test_user_id)
            assert result is False
    
    @patch('app.services.calendar_service.build')
    def test_test_connection_success(self, mock_build):
        """Test successful connection test."""
        # Mock service
        mock_calendar_service = Mock()
        mock_calendar_service.calendarList().list().execute.return_value = {
            'items': [{'id': 'primary', 'primary': True}]
        }
        mock_build.return_value = mock_calendar_service
        
        # Mock credentials
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            result = self.service.test_connection(self.test_user_id)
            assert result is True
    
    def test_test_connection_no_credentials(self):
        """Test connection test with no credentials."""
        with patch.object(self.service, '_load_credentials', return_value=None):
            result = self.service.test_connection(self.test_user_id)
            assert result is False
    
    def test_is_authenticated_true(self):
        """Test authentication check with valid credentials."""
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            result = self.service.is_authenticated(self.test_user_id)
            assert result is True
    
    def test_is_authenticated_false(self):
        """Test authentication check with no credentials."""
        with patch.object(self.service, '_load_credentials', return_value=None):
            result = self.service.is_authenticated(self.test_user_id)
            assert result is False
    
    def test_revoke_access_success(self):
        """Test successful access revocation."""
        mock_credentials = Mock()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            self.service.CREDENTIALS_DIR = Path(temp_dir)
            
            # Create a credentials file
            creds_file = self.service.CREDENTIALS_DIR / f"{self.test_user_id}_calendar_creds.json"
            creds_file.write_text('{"token": "test"}')
            
            with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
                result = self.service.revoke_access(self.test_user_id)
                
                assert result is True
                assert not creds_file.exists()
                mock_credentials.revoke.assert_called_once()
    
    def test_revoke_access_no_credentials(self):
        """Test access revocation with no stored credentials."""
        with tempfile.TemporaryDirectory() as temp_dir:
            self.service.CREDENTIALS_DIR = Path(temp_dir)
            
            with patch.object(self.service, '_load_credentials', return_value=None):
                result = self.service.revoke_access(self.test_user_id)
                assert result is True  # Should succeed even without credentials
    
    @patch('app.services.calendar_service.build')
    def test_create_calendar_event_success(self, mock_build):
        """Test successful calendar event creation."""
        # Mock task
        from app.schemas.task import Task
        from app.models.database import TaskStatus, Priority
        from datetime import datetime, timezone
        
        task = Task(
            id=1,
            title="Test Task",
            description="Test Description",
            due_date=datetime.now(timezone.utc),
            priority=Priority.MEDIUM,
            status=TaskStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            ai_generated=False
        )
        
        # Mock calendar service
        mock_calendar_service = Mock()
        mock_event = {
            'id': 'event123',
            'summary': 'Test Task',
            'description': 'Test Description\n\nTask ID: 1',
            'start': {'dateTime': task.due_date.isoformat()},
            'end': {'dateTime': task.due_date.replace(hour=task.due_date.hour + 1).isoformat()}
        }
        mock_calendar_service.events().insert().execute.return_value = mock_event
        mock_build.return_value = mock_calendar_service
        
        # Mock credentials and initialization
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            with patch.object(self.service, 'get_primary_calendar_id', return_value='primary'):
                result = self.service.create_calendar_event(self.test_user_id, task)
                
                assert result is not None
                assert result.id == 'event123'
                assert result.summary == 'Test Task'
                assert result.task_id == 1
    
    def test_create_calendar_event_no_due_date(self):
        """Test calendar event creation with no due date."""
        from app.schemas.task import Task
        from app.models.database import TaskStatus, Priority
        from datetime import datetime, timezone
        
        task = Task(
            id=1,
            title="Test Task",
            description="Test Description",
            due_date=None,  # No due date
            priority=Priority.MEDIUM,
            status=TaskStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            ai_generated=False
        )
        
        result = self.service.create_calendar_event(self.test_user_id, task)
        assert result is None
    
    @patch('app.services.calendar_service.build')
    def test_update_calendar_event_success(self, mock_build):
        """Test successful calendar event update."""
        from app.schemas.task import Task
        from app.models.database import TaskStatus, Priority
        from datetime import datetime, timezone
        
        task = Task(
            id=1,
            title="Updated Task",
            description="Updated Description",
            due_date=datetime.now(timezone.utc),
            priority=Priority.HIGH,
            status=TaskStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            ai_generated=False
        )
        
        # Mock calendar service
        mock_calendar_service = Mock()
        existing_event = {
            'id': 'event123',
            'summary': 'Old Task',
            'description': 'Old Description',
            'start': {'dateTime': task.due_date.isoformat()},
            'end': {'dateTime': task.due_date.replace(hour=task.due_date.hour + 1).isoformat()}
        }
        mock_calendar_service.events().get().execute.return_value = existing_event
        mock_calendar_service.events().update().execute.return_value = existing_event
        mock_build.return_value = mock_calendar_service
        
        # Mock credentials and initialization
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            with patch.object(self.service, 'get_primary_calendar_id', return_value='primary'):
                result = self.service.update_calendar_event(self.test_user_id, task, 'event123')
                
                assert result is True
                # Verify that update was called
                assert mock_calendar_service.events().update.called
    
    @patch('app.services.calendar_service.build')
    def test_delete_calendar_event_success(self, mock_build):
        """Test successful calendar event deletion."""
        # Mock calendar service
        mock_calendar_service = Mock()
        mock_build.return_value = mock_calendar_service
        
        # Mock credentials and initialization
        mock_credentials = Mock()
        mock_credentials.valid = True
        
        with patch.object(self.service, '_load_credentials', return_value=mock_credentials):
            with patch.object(self.service, 'get_primary_calendar_id', return_value='primary'):
                result = self.service.delete_calendar_event(self.test_user_id, 'event123')
                
                assert result is True
                mock_calendar_service.events().delete.assert_called_once()
    
    @patch('app.services.calendar_service.build')
    def test_sync_task_to_calendar_new_event(self, mock_build):
        """Test syncing task to calendar (new event)."""
        from app.schemas.task import Task
        from app.models.database import TaskStatus, Priority
        from datetime import datetime, timezone
        
        task = Task(
            id=1,
            title="Test Task",
            description="Test Description",
            due_date=datetime.now(timezone.utc),
            priority=Priority.MEDIUM,
            status=TaskStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            calendar_event_id=None,  # No existing event
            ai_generated=False
        )
        
        with patch.object(self.service, 'create_calendar_event') as mock_create:
            mock_event = Mock()
            mock_event.id = 'event123'
            mock_create.return_value = mock_event
            
            result = self.service.sync_task_to_calendar(self.test_user_id, task)
            
            assert result == 'event123'
            mock_create.assert_called_once_with(self.test_user_id, task)
    
    def test_sync_task_to_calendar_no_due_date(self):
        """Test syncing task with no due date."""
        from app.schemas.task import Task
        from app.models.database import TaskStatus, Priority
        from datetime import datetime, timezone
        
        task = Task(
            id=1,
            title="Test Task",
            description="Test Description",
            due_date=None,  # No due date
            priority=Priority.MEDIUM,
            status=TaskStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            ai_generated=False
        )
        
        result = self.service.sync_task_to_calendar(self.test_user_id, task)
        assert result is None