"""
Ollama service for AI-powered task management features.
"""
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import time

import ollama
from pydantic import BaseModel, ValidationError

from ..schemas.task import GeneratedTask, TaskCategory, Priority, WorkloadAnalysis


logger = logging.getLogger(__name__)


class OllamaConnectionError(Exception):
    """Raised when Ollama connection fails."""
    pass


class OllamaService:
    """Service for interacting with local Ollama instance."""
    
    def __init__(self, host: str = "http://localhost:11434", model: str = "llama2"):
        """
        Initialize Ollama service.
        
        Args:
            host: Ollama server host URL
            model: Default model to use for completions
        """
        self.host = host
        self.model = model
        self.client = None
        self._connection_healthy = False
        self._last_health_check = 0
        self._health_check_interval = 30  # seconds
        
    def _get_client(self) -> ollama.Client:
        """Get or create Ollama client."""
        if self.client is None:
            self.client = ollama.Client(host=self.host)
        return self.client
    
    async def check_connection(self, force_check: bool = False) -> bool:
        """
        Check if Ollama is available and responsive.
        
        Args:
            force_check: Force a new health check regardless of cache
            
        Returns:
            True if Ollama is available, False otherwise
        """
        current_time = time.time()
        
        # Use cached result if recent enough and not forcing
        if not force_check and (current_time - self._last_health_check) < self._health_check_interval:
            return self._connection_healthy
        
        try:
            client = self._get_client()
            # Try to list models as a health check
            models = client.list()
            
            # Check if our preferred model is available
            available_models = [model['name'] for model in models.get('models', [])]
            if not available_models:
                logger.warning("No models available in Ollama")
                self._connection_healthy = False
            else:
                # Use first available model if preferred model not found
                if self.model not in available_models:
                    self.model = available_models[0]
                    logger.info(f"Using model: {self.model}")
                
                self._connection_healthy = True
                logger.info("Ollama connection healthy")
                
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            self._connection_healthy = False
        
        self._last_health_check = current_time
        return self._connection_healthy
    
    async def _retry_with_backoff(self, func, max_retries: int = 3, base_delay: float = 1.0):
        """
        Execute function with exponential backoff retry logic.
        
        Args:
            func: Function to execute
            max_retries: Maximum number of retry attempts
            base_delay: Base delay between retries in seconds
            
        Returns:
            Function result
            
        Raises:
            OllamaConnectionError: If all retries fail
        """
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Check connection before attempting
                if not await self.check_connection():
                    raise OllamaConnectionError("Ollama service unavailable")
                
                return await func()
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                else:
                    break
        
        raise OllamaConnectionError(f"All retry attempts failed. Last error: {last_exception}")
    
    async def _generate_completion(self, prompt: str, system_prompt: Optional[str] = None, timeout: float = 45.0) -> str:
        """
        Generate completion from Ollama.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt for context
            timeout: Timeout in seconds for the generation
            
        Returns:
            Generated completion text
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        async def _do_generate():
            client = self._get_client()
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Run the synchronous ollama call in a thread with timeout
            loop = asyncio.get_event_loop()
            try:
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        lambda: client.chat(
                            model=self.model,
                            messages=messages,
                            stream=False
                        )
                    ),
                    timeout=timeout
                )
                return response['message']['content']
            except asyncio.TimeoutError:
                raise OllamaConnectionError(f"AI generation timed out after {timeout} seconds")
        
        return await self._retry_with_backoff(_do_generate)
    
    def is_available(self) -> bool:
        """
        Check if Ollama service is currently available.
        
        Returns:
            True if service is available, False otherwise
        """
        return self._connection_healthy
    
    async def get_available_models(self) -> List[str]:
        """
        Get list of available models.
        
        Returns:
            List of model names
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        async def _get_models():
            client = self._get_client()
            models = client.list()
            return [model['name'] for model in models.get('models', [])]
        
        return await self._retry_with_backoff(_get_models)
    
    async def set_model(self, model_name: str) -> bool:
        """
        Set the model to use for completions.
        
        Args:
            model_name: Name of the model to use
            
        Returns:
            True if model was set successfully, False otherwise
        """
        try:
            available_models = await self.get_available_models()
            if model_name in available_models:
                self.model = model_name
                logger.info(f"Model set to: {model_name}")
                return True
            else:
                logger.error(f"Model {model_name} not available. Available models: {available_models}")
                return False
        except Exception as e:
            logger.error(f"Failed to set model: {e}")
            return False


class OllamaAIService(OllamaService):
    """Extended Ollama service with AI-powered task management features."""
    
    # Prompt templates for different AI tasks
    TASK_GENERATION_PROMPT = """You are a helpful task management assistant. Convert the following user request into a structured list of actionable tasks.

User request: {user_prompt}

Please respond with a JSON array of tasks, each containing:
- title: A clear, actionable task title (max 255 characters)
- description: Detailed description of what needs to be done
- suggested_due_date: ISO format date when this should be completed (if applicable, otherwise null)
- suggested_priority: LOW, MEDIUM, HIGH, or URGENT
- suggested_category: WORK, PERSONAL, HEALTH, FINANCE, LEARNING, SHOPPING, or OTHER
- confidence_score: A float between 0.0 and 1.0 indicating how confident you are about this task

Response format: JSON array only, no additional text or explanation."""

    TASK_CATEGORIZATION_PROMPT = """Categorize the following task into one of these categories: WORK, PERSONAL, HEALTH, FINANCE, LEARNING, SHOPPING, or OTHER.

Task: {task_description}

Respond with only the category name."""

    PRIORITY_SUGGESTION_PROMPT = """Suggest a priority level for the following task. Consider the description and due date if provided.

Task: {task_description}
Due date: {due_date}

Priority levels: LOW, MEDIUM, HIGH, URGENT

Respond with only the priority level."""

    WORKLOAD_ANALYSIS_PROMPT = """Analyze the following task list and provide insights about workload and time management.

Tasks:
{tasks_summary}

Please provide a JSON response with:
- estimated_completion_time: Total estimated hours to complete all pending tasks
- recommendations: Array of 3-5 actionable recommendations for better task management

Response format: JSON only, no additional text."""

    TASK_IMPROVEMENT_PROMPT = """Improve the following task description to make it more actionable and clear.

Current description: {description}

Provide a better, more specific description that:
- Is clear and actionable
- Includes specific steps if needed
- Is concise but comprehensive

Respond with only the improved description."""

    async def generate_tasks_from_prompt(self, user_prompt: str) -> List[GeneratedTask]:
        """
        Generate structured tasks from natural language prompt.
        
        Args:
            user_prompt: Natural language description of tasks needed
            
        Returns:
            List of generated tasks with AI suggestions
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        if not user_prompt.strip():
            return []
        
        try:
            prompt = self.TASK_GENERATION_PROMPT.format(user_prompt=user_prompt.strip())
            response = await self._generate_completion(prompt)
            
            # Parse JSON response
            tasks_data = json.loads(response.strip())
            
            # Validate and convert to GeneratedTask objects
            generated_tasks = []
            for task_data in tasks_data:
                try:
                    # Parse due date if provided
                    due_date = None
                    if task_data.get('suggested_due_date'):
                        due_date = datetime.fromisoformat(task_data['suggested_due_date'].replace('Z', '+00:00'))
                    
                    task = GeneratedTask(
                        title=task_data['title'][:255],  # Ensure max length
                        description=task_data['description'],
                        suggested_due_date=due_date,
                        suggested_priority=Priority(task_data['suggested_priority']),
                        suggested_category=TaskCategory(task_data['suggested_category']),
                        confidence_score=float(task_data['confidence_score'])
                    )
                    generated_tasks.append(task)
                except (KeyError, ValueError, ValidationError) as e:
                    logger.warning(f"Skipping invalid generated task: {e}")
                    continue
            
            return generated_tasks
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Task generation failed: {e}")
            raise OllamaConnectionError(f"Task generation failed: {e}")
    
    async def categorize_task(self, task_description: str) -> TaskCategory:
        """
        Suggest category for a task based on its description.
        
        Args:
            task_description: Description of the task
            
        Returns:
            Suggested task category
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        if not task_description.strip():
            return TaskCategory.OTHER
        
        try:
            prompt = self.TASK_CATEGORIZATION_PROMPT.format(task_description=task_description.strip())
            response = await self._generate_completion(prompt)
            
            category_str = response.strip().upper()
            try:
                return TaskCategory(category_str)
            except ValueError:
                logger.warning(f"Invalid category returned: {category_str}, defaulting to OTHER")
                return TaskCategory.OTHER
                
        except Exception as e:
            logger.error(f"Task categorization failed: {e}")
            return TaskCategory.OTHER
    
    async def suggest_priority(self, task_description: str, due_date: Optional[datetime] = None) -> Priority:
        """
        Suggest priority level for a task.
        
        Args:
            task_description: Description of the task
            due_date: Optional due date for the task
            
        Returns:
            Suggested priority level
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        if not task_description.strip():
            return Priority.MEDIUM
        
        try:
            due_date_str = due_date.isoformat() if due_date else "Not specified"
            prompt = self.PRIORITY_SUGGESTION_PROMPT.format(
                task_description=task_description.strip(),
                due_date=due_date_str
            )
            response = await self._generate_completion(prompt)
            
            priority_str = response.strip().upper()
            try:
                return Priority(priority_str)
            except ValueError:
                logger.warning(f"Invalid priority returned: {priority_str}, defaulting to MEDIUM")
                return Priority.MEDIUM
                
        except Exception as e:
            logger.error(f"Priority suggestion failed: {e}")
            return Priority.MEDIUM
    
    async def analyze_workload(self, tasks: List[Dict[str, Any]]) -> WorkloadAnalysis:
        """
        Analyze workload and provide recommendations.
        
        Args:
            tasks: List of task dictionaries with status, priority, due_date info
            
        Returns:
            Workload analysis with recommendations
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        if not tasks:
            return WorkloadAnalysis(
                total_tasks=0,
                completed_tasks=0,
                pending_tasks=0,
                overdue_tasks=0,
                tasks_by_priority={priority: 0 for priority in Priority},
                estimated_completion_time=0.0,
                recommendations=["No tasks to analyze. Consider adding some tasks to get started!"]
            )
        
        # Calculate basic statistics
        total_tasks = len(tasks)
        completed_tasks = sum(1 for task in tasks if task.get('status') == 'COMPLETED')
        pending_tasks = sum(1 for task in tasks if task.get('status') != 'COMPLETED')
        
        # Count overdue tasks
        now = datetime.now()
        overdue_tasks = sum(
            1 for task in tasks 
            if task.get('due_date') and 
            datetime.fromisoformat(task['due_date'].replace('Z', '+00:00')) < now and
            task.get('status') != 'COMPLETED'
        )
        
        # Count by priority
        tasks_by_priority = {priority: 0 for priority in Priority}
        for task in tasks:
            priority = task.get('priority', 'MEDIUM')
            try:
                tasks_by_priority[Priority(priority)] += 1
            except ValueError:
                tasks_by_priority[Priority.MEDIUM] += 1
        
        try:
            # Create summary for AI analysis
            tasks_summary = f"""
Total tasks: {total_tasks}
Completed: {completed_tasks}
Pending: {pending_tasks}
Overdue: {overdue_tasks}
Priority breakdown: {dict(tasks_by_priority)}

Recent tasks:
"""
            # Add sample of recent tasks for context
            for i, task in enumerate(tasks[:5]):
                tasks_summary += f"- {task.get('title', 'Untitled')}: {task.get('status', 'PENDING')} (Priority: {task.get('priority', 'MEDIUM')})\n"
            
            prompt = self.WORKLOAD_ANALYSIS_PROMPT.format(tasks_summary=tasks_summary)
            response = await self._generate_completion(prompt)
            
            # Parse AI response
            ai_data = json.loads(response.strip())
            
            return WorkloadAnalysis(
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                overdue_tasks=overdue_tasks,
                tasks_by_priority=tasks_by_priority,
                estimated_completion_time=float(ai_data.get('estimated_completion_time', pending_tasks * 1.5)),
                recommendations=ai_data.get('recommendations', [
                    "Focus on high-priority tasks first",
                    "Break down large tasks into smaller ones",
                    "Set realistic deadlines"
                ])
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse workload analysis response: {e}")
            # Return basic analysis without AI recommendations
            return WorkloadAnalysis(
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                overdue_tasks=overdue_tasks,
                tasks_by_priority=tasks_by_priority,
                estimated_completion_time=pending_tasks * 1.5,  # Basic estimate
                recommendations=[
                    "Focus on completing overdue tasks first" if overdue_tasks > 0 else "Good job staying on track!",
                    "Consider breaking down complex tasks into smaller steps",
                    "Review and adjust task priorities regularly"
                ]
            )
        except Exception as e:
            logger.error(f"Workload analysis failed: {e}")
            raise OllamaConnectionError(f"Workload analysis failed: {e}")
    
    async def improve_task_description(self, description: str) -> str:
        """
        Improve task description to make it more actionable.
        
        Args:
            description: Current task description
            
        Returns:
            Improved task description
            
        Raises:
            OllamaConnectionError: If Ollama is unavailable
        """
        if not description.strip():
            return description
        
        try:
            prompt = self.TASK_IMPROVEMENT_PROMPT.format(description=description.strip())
            response = await self._generate_completion(prompt)
            
            improved = response.strip()
            # Ensure we return something reasonable
            if len(improved) > 10 and len(improved) < 1000:
                return improved
            else:
                logger.warning("AI returned unreasonable task improvement, keeping original")
                return description
                
        except Exception as e:
            logger.error(f"Task improvement failed: {e}")
            return description  # Return original on failure


# Global service instance
ollama_service = OllamaAIService()