"""
Database utility functions for model operations.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.database import Task as TaskModel, ChatMessage as ChatMessageModel
from app.schemas.task import TaskCreate, TaskUpdate
from app.schemas.chat import ChatMessageCreate


def create_task_from_schema(db: Session, task_data: TaskCreate) -> TaskModel:
    """Create a Task database model from a Pydantic schema."""
    db_task = TaskModel(
        title=task_data.title,
        description=task_data.description,
        due_date=task_data.due_date,
        priority=task_data.priority.value,
        category=task_data.category,
        ai_generated=task_data.ai_generated
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task_from_schema(db: Session, db_task: TaskModel, task_update: TaskUpdate) -> TaskModel:
    """Update a Task database model from a Pydantic schema."""
    update_data = task_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == 'priority' and value is not None:
            setattr(db_task, field, value.value)
        elif field == 'status' and value is not None:
            setattr(db_task, field, value.value)
        else:
            setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


def create_chat_message_from_schema(db: Session, message_data: ChatMessageCreate, generated_tasks: Optional[list] = None) -> ChatMessageModel:
    """Create a ChatMessage database model from a Pydantic schema."""
    db_message = ChatMessageModel(
        content=message_data.content,
        role=message_data.role.value,
        generated_tasks=generated_tasks
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_db_session():
    """Placeholder for database session dependency."""
    # This will be implemented when we set up the database connection
    pass