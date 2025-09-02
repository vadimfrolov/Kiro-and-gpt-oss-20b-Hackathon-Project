"""
Task CRUD API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import get_db
from app.models.database import Task as TaskModel, TaskStatus, Priority
from app.schemas.task import Task, TaskCreate, TaskUpdate, TaskFilters, WorkloadAnalysis
from app.services.ollama_service import ollama_service, OllamaConnectionError
from app.utils.database import create_task_from_schema, update_task_from_schema

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=Task, status_code=201)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new task.
    
    Args:
        task_data: Task creation data
        db: Database session
        
    Returns:
        Created task
    """
    try:
        db_task = create_task_from_schema(db, task_data)
        return Task.model_validate(db_task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@router.get("/", response_model=List[Task])
async def get_tasks(
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    priority: Optional[Priority] = Query(None, description="Filter by task priority"),
    category: Optional[str] = Query(None, description="Filter by task category"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of tasks to return"),
    db: Session = Depends(get_db)
):
    """
    Get tasks with optional filtering and pagination.
    
    Args:
        status: Filter by task status
        priority: Filter by task priority
        category: Filter by task category
        search: Search term for title and description
        skip: Number of tasks to skip for pagination
        limit: Maximum number of tasks to return
        db: Database session
        
    Returns:
        List of tasks matching the criteria
    """
    try:
        query = db.query(TaskModel)
        
        # Apply filters
        filters = []
        
        if status:
            filters.append(TaskModel.status == status.value)
        
        if priority:
            filters.append(TaskModel.priority == priority.value)
            
        if category:
            filters.append(TaskModel.category == category)
            
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    TaskModel.title.ilike(search_term),
                    TaskModel.description.ilike(search_term)
                )
            )
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Apply pagination and ordering
        tasks = query.order_by(TaskModel.created_at.desc()).offset(skip).limit(limit).all()
        
        return [Task.model_validate(task) for task in tasks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tasks: {str(e)}")


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific task by ID.
    
    Args:
        task_id: Task ID
        db: Database session
        
    Returns:
        Task details
    """
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return Task.model_validate(db_task)


@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a task completely.
    
    Args:
        task_id: Task ID
        task_update: Task update data
        db: Database session
        
    Returns:
        Updated task
    """
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        updated_task = update_task_from_schema(db, db_task, task_update)
        return Task.model_validate(updated_task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@router.patch("/{task_id}/complete", response_model=Task)
async def mark_task_complete(
    task_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a task as completed.
    
    Args:
        task_id: Task ID
        db: Database session
        
    Returns:
        Updated task with completed status
    """
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        db_task.status = TaskStatus.COMPLETED.value
        db.commit()
        db.refresh(db_task)
        return Task.model_validate(db_task)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark task as complete: {str(e)}")


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a task.
    
    Args:
        task_id: Task ID
        db: Database session
    """
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        db.delete(db_task)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")


@router.post("/analyze", response_model=WorkloadAnalysis)
async def analyze_workload(
    db: Session = Depends(get_db)
):
    """
    Analyze current workload and provide AI-powered insights.
    
    Args:
        db: Database session
        
    Returns:
        Workload analysis with recommendations
    """
    # Check if Ollama is available
    if not await ollama_service.check_connection():
        raise HTTPException(
            status_code=503, 
            detail="AI service is currently unavailable. Please try again later."
        )
    
    try:
        # Get all tasks for analysis
        tasks = db.query(TaskModel).all()
        
        # Convert to dict format for AI analysis
        tasks_data = []
        for task in tasks:
            task_dict = {
                'id': task.id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'category': task.category,
                'created_at': task.created_at.isoformat(),
                'ai_generated': task.ai_generated
            }
            tasks_data.append(task_dict)
        
        # Get AI analysis
        analysis = await ollama_service.analyze_workload(tasks_data)
        return analysis
        
    except OllamaConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze workload: {str(e)}")


@router.post("/{task_id}/improve")
async def improve_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """
    Improve task description using AI suggestions.
    
    Args:
        task_id: Task ID
        db: Database session
        
    Returns:
        Task with improved description
    """
    # Check if Ollama is available
    if not await ollama_service.check_connection():
        raise HTTPException(
            status_code=503, 
            detail="AI service is currently unavailable. Please try again later."
        )
    
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        # Get improved description from AI
        current_description = db_task.description or db_task.title
        improved_description = await ollama_service.improve_task_description(current_description)
        
        # Update task with improved description
        db_task.description = improved_description
        db.commit()
        db.refresh(db_task)
        
        return {
            "task": Task.model_validate(db_task),
            "original_description": current_description,
            "improved_description": improved_description
        }
        
    except OllamaConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to improve task: {str(e)}")