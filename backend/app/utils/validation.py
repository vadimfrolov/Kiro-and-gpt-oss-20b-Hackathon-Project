"""
Validation utility functions for Pydantic models.
"""
from typing import Dict, Any, List
from pydantic import ValidationError
from app.schemas.task import TaskCreate, TaskUpdate, TaskFilters, GeneratedTask
from app.schemas.chat import ChatMessageCreate, ChatPromptRequest


class ValidationException(Exception):
    """Custom exception for validation errors."""
    
    def __init__(self, message: str, errors: List[Dict[str, Any]]):
        self.message = message
        self.errors = errors
        super().__init__(message)


def validate_task_data(data: Dict[str, Any], schema_type: str = "create") -> Dict[str, Any]:
    """Validate task data against appropriate Pydantic schema."""
    try:
        if schema_type == "create":
            validated = TaskCreate(**data)
        elif schema_type == "update":
            validated = TaskUpdate(**data)
        elif schema_type == "filters":
            validated = TaskFilters(**data)
        else:
            raise ValueError(f"Unknown schema type: {schema_type}")
        
        return validated.dict(exclude_unset=True)
    
    except ValidationError as e:
        errors = []
        for error in e.errors():
            errors.append({
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
        raise ValidationException("Task validation failed", errors)


def validate_chat_data(data: Dict[str, Any], schema_type: str = "create") -> Dict[str, Any]:
    """Validate chat data against appropriate Pydantic schema."""
    try:
        if schema_type == "create":
            validated = ChatMessageCreate(**data)
        elif schema_type == "prompt":
            validated = ChatPromptRequest(**data)
        else:
            raise ValueError(f"Unknown schema type: {schema_type}")
        
        return validated.dict(exclude_unset=True)
    
    except ValidationError as e:
        errors = []
        for error in e.errors():
            errors.append({
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
        raise ValidationException("Chat validation failed", errors)


def validate_generated_tasks(tasks_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate a list of generated tasks."""
    validated_tasks = []
    errors = []
    
    for i, task_data in enumerate(tasks_data):
        try:
            validated = GeneratedTask(**task_data)
            validated_tasks.append(validated.dict())
        except ValidationError as e:
            for error in e.errors():
                errors.append({
                    "task_index": i,
                    "field": ".".join(str(x) for x in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"]
                })
    
    if errors:
        raise ValidationException("Generated tasks validation failed", errors)
    
    return validated_tasks


def format_validation_errors(errors: List[Dict[str, Any]]) -> str:
    """Format validation errors for user-friendly display."""
    formatted_errors = []
    for error in errors:
        if "task_index" in error:
            formatted_errors.append(f"Task {error['task_index']}, {error['field']}: {error['message']}")
        else:
            formatted_errors.append(f"{error['field']}: {error['message']}")
    
    return "; ".join(formatted_errors)