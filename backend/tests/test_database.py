"""
Tests for database configuration and models.
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.database import Base, Task, ChatMessage, Priority, TaskStatus, MessageRole


# Create in-memory SQLite database for testing
@pytest.fixture
def test_db():
    """Create a test database session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_task_model_creation(test_db):
    """Test creating a task model."""
    task = Task(
        title="Test Task",
        description="This is a test task",
        priority=Priority.HIGH.value,
        status=TaskStatus.PENDING.value,
        category="Work",
        ai_generated=False
    )
    
    test_db.add(task)
    test_db.commit()
    test_db.refresh(task)
    
    assert task.id is not None
    assert task.title == "Test Task"
    assert task.description == "This is a test task"
    assert task.priority == Priority.HIGH.value
    assert task.status == TaskStatus.PENDING.value
    assert task.category == "Work"
    assert task.ai_generated is False
    assert task.created_at is not None
    assert task.updated_at is not None


def test_chat_message_model_creation(test_db):
    """Test creating a chat message model."""
    message = ChatMessage(
        content="Hello, can you help me create some tasks?",
        role=MessageRole.USER.value,
        generated_tasks=[
            {
                "title": "Generated Task 1",
                "description": "AI generated task",
                "priority": "MEDIUM"
            }
        ]
    )
    
    test_db.add(message)
    test_db.commit()
    test_db.refresh(message)
    
    assert message.id is not None
    assert message.content == "Hello, can you help me create some tasks?"
    assert message.role == MessageRole.USER.value
    assert message.timestamp is not None
    assert message.generated_tasks is not None
    assert len(message.generated_tasks) == 1
    assert message.generated_tasks[0]["title"] == "Generated Task 1"


def test_task_model_with_due_date(test_db):
    """Test creating a task with due date."""
    due_date = datetime(2025, 12, 31, 23, 59, 59)
    
    task = Task(
        title="Year End Task",
        description="Complete before year end",
        due_date=due_date,
        priority=Priority.URGENT.value,
        status=TaskStatus.IN_PROGRESS.value
    )
    
    test_db.add(task)
    test_db.commit()
    test_db.refresh(task)
    
    assert task.due_date == due_date
    assert task.priority == Priority.URGENT.value
    assert task.status == TaskStatus.IN_PROGRESS.value


def test_task_model_defaults(test_db):
    """Test task model default values."""
    task = Task(title="Minimal Task")
    
    test_db.add(task)
    test_db.commit()
    test_db.refresh(task)
    
    assert task.title == "Minimal Task"
    assert task.description is None
    assert task.due_date is None
    assert task.priority == Priority.MEDIUM.value
    assert task.category is None
    assert task.status == TaskStatus.PENDING.value
    assert task.calendar_event_id is None
    assert task.ai_generated is False


def test_priority_enum_values():
    """Test priority enum values."""
    assert Priority.LOW.value == "LOW"
    assert Priority.MEDIUM.value == "MEDIUM"
    assert Priority.HIGH.value == "HIGH"
    assert Priority.URGENT.value == "URGENT"


def test_task_status_enum_values():
    """Test task status enum values."""
    assert TaskStatus.PENDING.value == "PENDING"
    assert TaskStatus.IN_PROGRESS.value == "IN_PROGRESS"
    assert TaskStatus.COMPLETED.value == "COMPLETED"


def test_message_role_enum_values():
    """Test message role enum values."""
    assert MessageRole.USER.value == "USER"
    assert MessageRole.ASSISTANT.value == "ASSISTANT"


def test_task_query_operations(test_db):
    """Test basic query operations on tasks."""
    # Create multiple tasks
    tasks = [
        Task(title="Task 1", priority=Priority.LOW.value, status=TaskStatus.PENDING.value),
        Task(title="Task 2", priority=Priority.HIGH.value, status=TaskStatus.COMPLETED.value),
        Task(title="Task 3", priority=Priority.MEDIUM.value, status=TaskStatus.IN_PROGRESS.value),
    ]
    
    for task in tasks:
        test_db.add(task)
    test_db.commit()
    
    # Query all tasks
    all_tasks = test_db.query(Task).all()
    assert len(all_tasks) == 3
    
    # Query by status
    pending_tasks = test_db.query(Task).filter(Task.status == TaskStatus.PENDING.value).all()
    assert len(pending_tasks) == 1
    assert pending_tasks[0].title == "Task 1"
    
    # Query by priority
    high_priority_tasks = test_db.query(Task).filter(Task.priority == Priority.HIGH.value).all()
    assert len(high_priority_tasks) == 1
    assert high_priority_tasks[0].title == "Task 2"