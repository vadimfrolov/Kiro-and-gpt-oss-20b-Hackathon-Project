"""
Tests for Ollama service functionality.
"""
import json
import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio
from datetime import datetime

from app.services.ollama_service import OllamaService, OllamaConnectionError
from app.models.database import TaskCategory, Priority


class TestOllamaService:
    """Test cases for OllamaService."""
    
    @pytest.fixture
    def ollama_service(self):
        """Create OllamaService instance for testing."""
        return OllamaService(host="http://localhost:11434", model="test-model")
    
    @pytest.fixture
    def mock_ollama_client(self):
        """Mock Ollama client."""
        with patch('app.services.ollama_service.ollama.Client') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client
            yield mock_client
    
    def test_init(self, ollama_service):
        """Test OllamaService initialization."""
        assert ollama_service.host == "http://localhost:11434"
        assert ollama_service.model == "test-model"
        assert ollama_service.client is None
        assert ollama_service._connection_healthy is False
    
    def test_get_client_creates_client(self, ollama_service, mock_ollama_client):
        """Test that _get_client creates client on first call."""
        client = ollama_service._get_client()
        assert client is not None
        assert ollama_service.client is not None
    
    def test_get_client_reuses_existing(self, ollama_service, mock_ollama_client):
        """Test that _get_client reuses existing client."""
        client1 = ollama_service._get_client()
        client2 = ollama_service._get_client()
        assert client1 is client2
    
    @pytest.mark.asyncio
    async def test_check_connection_success(self, ollama_service, mock_ollama_client):
        """Test successful connection check."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}, {'name': 'other-model'}]
        }
        
        result = await ollama_service.check_connection(force_check=True)
        
        assert result is True
        assert ollama_service._connection_healthy is True
        assert ollama_service.model == "test-model"
    
    @pytest.mark.asyncio
    async def test_check_connection_model_fallback(self, ollama_service, mock_ollama_client):
        """Test connection check with model fallback."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'available-model'}, {'name': 'other-model'}]
        }
        
        result = await ollama_service.check_connection(force_check=True)
        
        assert result is True
        assert ollama_service._connection_healthy is True
        assert ollama_service.model == "available-model"  # Should fallback
    
    @pytest.mark.asyncio
    async def test_check_connection_no_models(self, ollama_service, mock_ollama_client):
        """Test connection check with no available models."""
        mock_ollama_client.list.return_value = {'models': []}
        
        result = await ollama_service.check_connection(force_check=True)
        
        assert result is False
        assert ollama_service._connection_healthy is False
    
    @pytest.mark.asyncio
    async def test_check_connection_exception(self, ollama_service, mock_ollama_client):
        """Test connection check with exception."""
        mock_ollama_client.list.side_effect = Exception("Connection failed")
        
        result = await ollama_service.check_connection(force_check=True)
        
        assert result is False
        assert ollama_service._connection_healthy is False
    
    @pytest.mark.asyncio
    async def test_check_connection_uses_cache(self, ollama_service, mock_ollama_client):
        """Test that connection check uses cache when not forced."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        # First call should check
        result1 = await ollama_service.check_connection(force_check=True)
        assert result1 is True
        assert mock_ollama_client.list.call_count == 1
        
        # Second call should use cache
        result2 = await ollama_service.check_connection(force_check=False)
        assert result2 is True
        assert mock_ollama_client.list.call_count == 1  # No additional call
    
    @pytest.mark.asyncio
    async def test_generate_completion_success(self, ollama_service, mock_ollama_client):
        """Test successful completion generation."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'Generated response'}
        }
        
        result = await ollama_service._generate_completion("Test prompt")
        
        assert result == "Generated response"
        mock_ollama_client.chat.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_completion_with_system_prompt(self, ollama_service, mock_ollama_client):
        """Test completion generation with system prompt."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'Generated response'}
        }
        
        await ollama_service._generate_completion("Test prompt", "System prompt")
        
        # Verify system prompt was included
        call_args = mock_ollama_client.chat.call_args
        messages = call_args[1]['messages']
        assert len(messages) == 2
        assert messages[0]['role'] == 'system'
        assert messages[0]['content'] == 'System prompt'
        assert messages[1]['role'] == 'user'
        assert messages[1]['content'] == 'Test prompt'
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_success_first_try(self, ollama_service, mock_ollama_client):
        """Test retry logic succeeds on first attempt."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        async def test_func():
            return "success"
        
        result = await ollama_service._retry_with_backoff(test_func)
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_connection_failure(self, ollama_service, mock_ollama_client):
        """Test retry logic with connection failure."""
        mock_ollama_client.list.side_effect = Exception("Connection failed")
        
        async def test_func():
            return "success"
        
        with pytest.raises(OllamaConnectionError):
            await ollama_service._retry_with_backoff(test_func, max_retries=1, base_delay=0.01)
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_eventual_success(self, ollama_service, mock_ollama_client):
        """Test retry logic with eventual success."""
        # Mock successful connection checks
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        call_count = 0
        async def test_func():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("First attempt fails")
            return "success"
        
        result = await ollama_service._retry_with_backoff(test_func, max_retries=2, base_delay=0.01)
        assert result == "success"
        assert call_count == 2
    
    def test_is_available(self, ollama_service):
        """Test is_available method."""
        assert ollama_service.is_available() is False
        
        ollama_service._connection_healthy = True
        assert ollama_service.is_available() is True
    
    @pytest.mark.asyncio
    async def test_get_available_models(self, ollama_service, mock_ollama_client):
        """Test getting available models."""
        mock_ollama_client.list.return_value = {
            'models': [
                {'name': 'model1'},
                {'name': 'model2'},
                {'name': 'model3'}
            ]
        }
        
        # Mock connection check
        ollama_service._connection_healthy = True
        
        models = await ollama_service.get_available_models()
        
        assert models == ['model1', 'model2', 'model3']
    
    @pytest.mark.asyncio
    async def test_set_model_success(self, ollama_service, mock_ollama_client):
        """Test setting model successfully."""
        mock_ollama_client.list.return_value = {
            'models': [
                {'name': 'model1'},
                {'name': 'model2'}
            ]
        }
        
        # Mock connection check
        ollama_service._connection_healthy = True
        
        result = await ollama_service.set_model('model2')
        
        assert result is True
        assert ollama_service.model == 'model2'
    
    @pytest.mark.asyncio
    async def test_set_model_not_available(self, ollama_service, mock_ollama_client):
        """Test setting unavailable model."""
        # Set initial model
        original_model = ollama_service.model
        
        mock_ollama_client.list.return_value = {
            'models': [
                {'name': 'model1'},
                {'name': 'model2'}
            ]
        }
        
        # Mock connection check
        ollama_service._connection_healthy = True
        
        result = await ollama_service.set_model('nonexistent-model')
        
        assert result is False
        # Model might have changed during get_available_models, so check it's one of the available ones
        assert ollama_service.model in ['model1', 'model2'] or ollama_service.model == original_model
    
    @pytest.mark.asyncio
    async def test_set_model_connection_error(self, ollama_service, mock_ollama_client):
        """Test setting model with connection error."""
        mock_ollama_client.list.side_effect = Exception("Connection failed")
        
        result = await ollama_service.set_model('model1')
        
        assert result is False
        assert ollama_service.model == 'test-model'  # Should remain unchanged


class TestOllamaServiceIntegration:
    """Integration tests for OllamaService (require actual Ollama instance)."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_connection_check(self):
        """Test connection check with real Ollama instance."""
        service = OllamaService()
        
        # This test requires Ollama to be running
        # Skip if not available
        try:
            result = await service.check_connection(force_check=True)
            # If Ollama is running, should return True
            # If not running, should return False (not raise exception)
            assert isinstance(result, bool)
        except Exception as e:
            pytest.skip(f"Ollama not available for integration test: {e}")

class TestOllamaAIService:
    """Test cases for OllamaAIService AI functionality."""
    
    @pytest.fixture
    def ai_service(self):
        """Create OllamaAIService instance for testing."""
        from app.services.ollama_service import OllamaAIService
        return OllamaAIService(host="http://localhost:11434", model="test-model")
    
    @pytest.fixture
    def mock_ollama_client(self):
        """Mock Ollama client."""
        with patch('app.services.ollama_service.ollama.Client') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client
            yield mock_client
    
    @pytest.mark.asyncio
    async def test_generate_tasks_from_prompt_success(self, ai_service, mock_ollama_client):
        """Test successful task generation from prompt."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        # Mock AI response
        ai_response = json.dumps([
            {
                "title": "Buy groceries",
                "description": "Get milk, bread, and eggs from the store",
                "suggested_due_date": "2024-01-15T18:00:00",
                "suggested_priority": "MEDIUM",
                "suggested_category": "PERSONAL",
                "confidence_score": 0.9
            },
            {
                "title": "Plan weekend trip",
                "description": "Research destinations and book accommodation",
                "suggested_due_date": None,
                "suggested_priority": "LOW",
                "suggested_category": "PERSONAL",
                "confidence_score": 0.8
            }
        ])
        
        mock_ollama_client.chat.return_value = {
            'message': {'content': ai_response}
        }
        
        result = await ai_service.generate_tasks_from_prompt("I need to buy groceries and plan a weekend trip")
        
        assert len(result) == 2
        assert result[0].title == "Buy groceries"
        assert result[0].suggested_priority == Priority.MEDIUM
        assert result[0].suggested_category == TaskCategory.PERSONAL
        assert result[0].confidence_score == 0.9
        assert result[1].suggested_due_date is None
    
    @pytest.mark.asyncio
    async def test_generate_tasks_empty_prompt(self, ai_service):
        """Test task generation with empty prompt."""
        result = await ai_service.generate_tasks_from_prompt("")
        assert result == []
        
        result = await ai_service.generate_tasks_from_prompt("   ")
        assert result == []
    
    @pytest.mark.asyncio
    async def test_generate_tasks_invalid_json(self, ai_service, mock_ollama_client):
        """Test task generation with invalid JSON response."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'Invalid JSON response'}
        }
        
        result = await ai_service.generate_tasks_from_prompt("Create some tasks")
        assert result == []
    
    @pytest.mark.asyncio
    async def test_generate_tasks_partial_invalid_data(self, ai_service, mock_ollama_client):
        """Test task generation with partially invalid data."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        # One valid task, one invalid
        ai_response = json.dumps([
            {
                "title": "Valid task",
                "description": "This is valid",
                "suggested_due_date": None,
                "suggested_priority": "HIGH",
                "suggested_category": "WORK",
                "confidence_score": 0.9
            },
            {
                "title": "",  # Invalid - empty title
                "description": "Invalid task",
                "suggested_priority": "INVALID_PRIORITY",
                "suggested_category": "WORK",
                "confidence_score": 0.5
            }
        ])
        
        mock_ollama_client.chat.return_value = {
            'message': {'content': ai_response}
        }
        
        result = await ai_service.generate_tasks_from_prompt("Create tasks")
        
        # Should only return the valid task
        assert len(result) == 1
        assert result[0].title == "Valid task"
    
    @pytest.mark.asyncio
    async def test_categorize_task_success(self, ai_service, mock_ollama_client):
        """Test successful task categorization."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'WORK'}
        }
        
        result = await ai_service.categorize_task("Prepare presentation for client meeting")
        
        assert result == TaskCategory.WORK
    
    @pytest.mark.asyncio
    async def test_categorize_task_empty_description(self, ai_service):
        """Test task categorization with empty description."""
        result = await ai_service.categorize_task("")
        assert result == TaskCategory.OTHER
    
    @pytest.mark.asyncio
    async def test_categorize_task_invalid_response(self, ai_service, mock_ollama_client):
        """Test task categorization with invalid AI response."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'INVALID_CATEGORY'}
        }
        
        result = await ai_service.categorize_task("Some task")
        assert result == TaskCategory.OTHER
    
    @pytest.mark.asyncio
    async def test_suggest_priority_success(self, ai_service, mock_ollama_client):
        """Test successful priority suggestion."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'URGENT'}
        }
        
        due_date = datetime(2024, 1, 15, 9, 0)
        result = await ai_service.suggest_priority("Fix critical bug in production", due_date)
        
        assert result == Priority.URGENT
    
    @pytest.mark.asyncio
    async def test_suggest_priority_no_due_date(self, ai_service, mock_ollama_client):
        """Test priority suggestion without due date."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'MEDIUM'}
        }
        
        result = await ai_service.suggest_priority("Regular task")
        assert result == Priority.MEDIUM
    
    @pytest.mark.asyncio
    async def test_suggest_priority_empty_description(self, ai_service):
        """Test priority suggestion with empty description."""
        result = await ai_service.suggest_priority("")
        assert result == Priority.MEDIUM
    
    @pytest.mark.asyncio
    async def test_analyze_workload_empty_tasks(self, ai_service):
        """Test workload analysis with no tasks."""
        result = await ai_service.analyze_workload([])
        
        assert result.total_tasks == 0
        assert result.completed_tasks == 0
        assert result.pending_tasks == 0
        assert result.overdue_tasks == 0
        assert result.estimated_completion_time == 0.0
        assert len(result.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_workload_success(self, ai_service, mock_ollama_client):
        """Test successful workload analysis."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        
        ai_response = json.dumps({
            "estimated_completion_time": 8.5,
            "recommendations": [
                "Focus on urgent tasks first",
                "Break down large tasks",
                "Schedule regular breaks"
            ]
        })
        
        mock_ollama_client.chat.return_value = {
            'message': {'content': ai_response}
        }
        
        # Use future dates to avoid overdue issues
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=10)).isoformat()
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        
        tasks = [
            {
                'title': 'Task 1',
                'status': 'COMPLETED',
                'priority': 'HIGH',
                'due_date': past_date  # Completed task, so overdue doesn't matter
            },
            {
                'title': 'Task 2',
                'status': 'PENDING',
                'priority': 'MEDIUM',
                'due_date': future_date  # Future date, not overdue
            },
            {
                'title': 'Task 3',
                'status': 'PENDING',
                'priority': 'URGENT',
                'due_date': past_date  # Past date and pending, so overdue
            }
        ]
        
        result = await ai_service.analyze_workload(tasks)
        
        assert result.total_tasks == 3
        assert result.completed_tasks == 1
        assert result.pending_tasks == 2
        assert result.overdue_tasks == 1
        assert result.estimated_completion_time == 8.5
        assert len(result.recommendations) == 3
        assert result.tasks_by_priority[Priority.HIGH] == 1
        assert result.tasks_by_priority[Priority.MEDIUM] == 1
        assert result.tasks_by_priority[Priority.URGENT] == 1
    
    @pytest.mark.asyncio
    async def test_analyze_workload_invalid_ai_response(self, ai_service, mock_ollama_client):
        """Test workload analysis with invalid AI response."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'Invalid JSON'}
        }
        
        tasks = [
            {
                'title': 'Task 1',
                'status': 'PENDING',
                'priority': 'MEDIUM'
            }
        ]
        
        result = await ai_service.analyze_workload(tasks)
        
        # Should return basic analysis
        assert result.total_tasks == 1
        assert result.pending_tasks == 1
        assert len(result.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_improve_task_description_success(self, ai_service, mock_ollama_client):
        """Test successful task description improvement."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'Review and update the quarterly financial report by analyzing Q3 data and preparing summary for stakeholders'}
        }
        
        result = await ai_service.improve_task_description("Update report")
        
        assert "quarterly financial report" in result
        assert len(result) > len("Update report")
    
    @pytest.mark.asyncio
    async def test_improve_task_description_empty(self, ai_service):
        """Test task description improvement with empty input."""
        result = await ai_service.improve_task_description("")
        assert result == ""
    
    @pytest.mark.asyncio
    async def test_improve_task_description_unreasonable_response(self, ai_service, mock_ollama_client):
        """Test task description improvement with unreasonable AI response."""
        mock_ollama_client.list.return_value = {
            'models': [{'name': 'test-model'}]
        }
        mock_ollama_client.chat.return_value = {
            'message': {'content': 'x'}  # Too short
        }
        
        original = "Update the report"
        result = await ai_service.improve_task_description(original)
        
        # Should return original when AI response is unreasonable
        assert result == original
    
    @pytest.mark.asyncio
    async def test_improve_task_description_connection_error(self, ai_service, mock_ollama_client):
        """Test task description improvement with connection error."""
        mock_ollama_client.list.side_effect = Exception("Connection failed")
        
        original = "Update the report"
        result = await ai_service.improve_task_description(original)
        
        # Should return original on error
        assert result == original