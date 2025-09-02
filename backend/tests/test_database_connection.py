"""
Tests for database connection utilities.
"""
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.exc import OperationalError

from app.core.database import (
    get_db,
    check_database_connection,
    close_database_connections,
    create_database
)


def test_get_db_session():
    """Test database session dependency."""
    # This test uses a mock since we don't have a real database connection
    with patch('app.core.database.SessionLocal') as mock_session_local:
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        # Test normal operation
        db_gen = get_db()
        db_session = next(db_gen)
        
        assert db_session == mock_session
        mock_session_local.assert_called_once()
        
        # Test cleanup
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        mock_session.close.assert_called_once()


def test_get_db_session_with_exception():
    """Test database session dependency with exception handling."""
    with patch('app.core.database.SessionLocal') as mock_session_local:
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        # Simulate an exception during session usage
        mock_session.execute.side_effect = Exception("Database error")
        
        db_gen = get_db()
        db_session = next(db_gen)
        
        # Simulate exception in the context
        try:
            raise Exception("Test exception")
        except Exception:
            try:
                db_gen.throw(Exception, Exception("Test exception"), None)
            except Exception:
                pass
        
        # Verify rollback and close were called
        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()


@patch('app.core.database.engine')
def test_check_database_connection_success(mock_engine):
    """Test successful database connection check."""
    mock_connection = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_connection
    
    result = check_database_connection()
    
    assert result is True
    mock_engine.connect.assert_called_once()
    mock_connection.execute.assert_called_once_with("SELECT 1")


@patch('app.core.database.engine')
def test_check_database_connection_failure(mock_engine):
    """Test failed database connection check."""
    mock_engine.connect.side_effect = OperationalError("Connection failed", None, None)
    
    result = check_database_connection()
    
    assert result is False
    mock_engine.connect.assert_called_once()


@patch('app.core.database.engine')
def test_close_database_connections(mock_engine):
    """Test closing database connections."""
    close_database_connections()
    
    mock_engine.dispose.assert_called_once()


@patch('app.core.database.engine')
def test_close_database_connections_with_exception(mock_engine):
    """Test closing database connections with exception."""
    mock_engine.dispose.side_effect = Exception("Dispose error")
    
    # Should not raise exception
    close_database_connections()
    
    mock_engine.dispose.assert_called_once()


@patch('app.core.database.Base')
@patch('app.core.database.engine')
def test_create_database_success(mock_engine, mock_base):
    """Test successful database creation."""
    result = create_database()
    
    assert result is None  # Function doesn't return anything on success
    mock_base.metadata.create_all.assert_called_once_with(bind=mock_engine)


@patch('app.core.database.Base')
@patch('app.core.database.engine')
def test_create_database_failure(mock_engine, mock_base):
    """Test database creation failure."""
    mock_base.metadata.create_all.side_effect = Exception("Creation failed")
    
    with pytest.raises(Exception):
        create_database()
    
    mock_base.metadata.create_all.assert_called_once_with(bind=mock_engine)