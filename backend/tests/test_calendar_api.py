"""
Tests for Google Calendar API endpoints.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.services.calendar_service import calendar_service


class TestCalendarAPI:
    """Test cases for Calendar API endpoints."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)
        self.test_user_id = "test_user_123"
    
    @patch.object(calendar_service, 'get_auth_url')
    def test_get_auth_url_success(self, mock_get_auth_url):
        """Test successful auth URL generation."""
        mock_get_auth_url.return_value = "https://accounts.google.com/oauth/authorize?..."
        
        response = self.client.get(f"/calendar/auth-url?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert data["auth_url"] == "https://accounts.google.com/oauth/authorize?..."
        assert "message" in data
    
    @patch.object(calendar_service, 'get_auth_url')
    def test_get_auth_url_missing_credentials(self, mock_get_auth_url):
        """Test auth URL generation with missing credentials."""
        mock_get_auth_url.side_effect = ValueError("Google Calendar credentials not configured")
        
        response = self.client.get(f"/calendar/auth-url?user_id={self.test_user_id}")
        
        assert response.status_code == 400
        assert "Google Calendar credentials not configured" in response.json()["detail"]
    
    @patch.object(calendar_service, 'handle_oauth_callback')
    def test_auth_callback_success(self, mock_handle_callback):
        """Test successful OAuth callback handling."""
        mock_handle_callback.return_value = True
        
        callback_data = {
            "code": "test_auth_code",
            "state": self.test_user_id
        }
        
        response = self.client.post("/calendar/auth-callback", json=callback_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert "successful" in data["message"]
    
    @patch.object(calendar_service, 'handle_oauth_callback')
    def test_auth_callback_failure(self, mock_handle_callback):
        """Test failed OAuth callback handling."""
        mock_handle_callback.return_value = False
        
        callback_data = {
            "code": "invalid_code",
            "state": self.test_user_id
        }
        
        response = self.client.post("/calendar/auth-callback", json=callback_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert "failed" in data["message"]
    
    @patch.object(calendar_service, 'is_authenticated')
    def test_get_auth_status_authenticated(self, mock_is_authenticated):
        """Test auth status check for authenticated user."""
        mock_is_authenticated.return_value = True
        
        response = self.client.get(f"/calendar/auth-status?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["message"] == "Authenticated"
    
    @patch.object(calendar_service, 'is_authenticated')
    def test_get_auth_status_not_authenticated(self, mock_is_authenticated):
        """Test auth status check for non-authenticated user."""
        mock_is_authenticated.return_value = False
        
        response = self.client.get(f"/calendar/auth-status?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["message"] == "Not authenticated"
    
    @patch.object(calendar_service, 'test_connection')
    def test_connection_test_success(self, mock_test_connection):
        """Test successful connection test."""
        mock_test_connection.return_value = True
        
        response = self.client.post(f"/calendar/test-connection?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "successful" in data["message"]
    
    @patch.object(calendar_service, 'test_connection')
    def test_connection_test_failure(self, mock_test_connection):
        """Test failed connection test."""
        mock_test_connection.return_value = False
        
        response = self.client.post(f"/calendar/test-connection?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "failed" in data["message"]
    
    @patch.object(calendar_service, 'revoke_access')
    def test_revoke_access_success(self, mock_revoke_access):
        """Test successful access revocation."""
        mock_revoke_access.return_value = True
        
        response = self.client.delete(f"/calendar/revoke-access?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert "revoked successfully" in data["message"]
    
    @patch.object(calendar_service, 'revoke_access')
    def test_revoke_access_failure(self, mock_revoke_access):
        """Test failed access revocation."""
        mock_revoke_access.return_value = False
        
        response = self.client.delete(f"/calendar/revoke-access?user_id={self.test_user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert "Failed to revoke access" in data["message"]