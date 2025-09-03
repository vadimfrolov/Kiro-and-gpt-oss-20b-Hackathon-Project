"""
Chat and AI integration API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.database import ChatMessage as ChatMessageModel, MessageRole, Task as TaskModel
from app.schemas.chat import ChatMessage, ChatPromptRequest, ChatResponse
from app.schemas.task import GeneratedTask, WorkloadAnalysis
from app.services.ollama_service import ollama_service, OllamaConnectionError
from app.utils.database import create_chat_message_from_schema

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/generate-tasks")
async def generate_tasks_from_prompt(
    request: ChatPromptRequest,
    db: Session = Depends(get_db)
):
    """
    Generate tasks from natural language prompt using AI.
    
    Args:
        request: Chat prompt request with user input
        db: Database session
        
    Returns:
        Chat response with generated tasks
    """
    # Check if Ollama is available
    if not await ollama_service.check_connection():
        raise HTTPException(
            status_code=503, 
            detail="AI service is currently unavailable. Please try again later."
        )
    
    try:
        # Store user message
        user_message_data = {
            'content': request.prompt,
            'role': MessageRole.USER
        }
        user_message = ChatMessageModel(
            content=request.prompt,
            role=MessageRole.USER.value
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Generate tasks using AI
        generated_tasks = await ollama_service.generate_tasks_from_prompt(request.prompt)
        
        # Create assistant response message
        assistant_content = f"I've generated {len(generated_tasks)} tasks based on your request."
        if request.context:
            assistant_content += f" Context considered: {request.context}"
        
        # Convert generated tasks to dict for JSON storage
        tasks_data = [task.model_dump(mode='json') for task in generated_tasks]
        
        assistant_message = ChatMessageModel(
            content=assistant_content,
            role=MessageRole.ASSISTANT.value,
            generated_tasks=tasks_data
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
        # Create response data
        response_data = {
            "message": ChatMessage.model_validate(assistant_message).model_dump(),
            "generated_tasks": [task.model_dump() for task in generated_tasks]
        }
        
        # Return wrapped response
        return {
            "success": True,
            "data": response_data,
            "message": f"Generated {len(generated_tasks)} tasks successfully"
        }
        
    except OllamaConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate tasks: {str(e)}")


@router.get("/messages")
async def get_chat_messages(
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get chat message history with pagination.
    
    Args:
        page: Page number (1-based)
        size: Number of messages per page
        db: Database session
        
    Returns:
        Paginated response with chat messages
    """
    try:
        # Calculate offset from page number
        offset = (page - 1) * size
        
        # Get total count
        total = db.query(ChatMessageModel).count()
        
        # Get messages for the current page
        messages = (
            db.query(ChatMessageModel)
            .order_by(ChatMessageModel.timestamp.desc())
            .offset(offset)
            .limit(size)
            .all()
        )
        
        # Calculate total pages
        pages = (total + size - 1) // size if total > 0 else 1
        
        # Return paginated response wrapped in ApiResponse format
        paginated_data = {
            "items": [ChatMessage.model_validate(msg) for msg in messages],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
        
        return {
            "success": True,
            "data": paginated_data,
            "message": f"Retrieved {len(messages)} messages"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")


@router.delete("/messages", status_code=204)
async def clear_chat_history(db: Session = Depends(get_db)):
    """
    Clear all chat message history.
    
    Args:
        db: Database session
    """
    try:
        db.query(ChatMessageModel).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {str(e)}")