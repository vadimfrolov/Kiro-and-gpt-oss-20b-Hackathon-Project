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


@router.post("/generate-tasks", response_model=ChatResponse)
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
        tasks_data = [task.model_dump() for task in generated_tasks]
        
        assistant_message = ChatMessageModel(
            content=assistant_content,
            role=MessageRole.ASSISTANT.value,
            generated_tasks=tasks_data
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
        # Return response
        return ChatResponse(
            message=ChatMessage.model_validate(assistant_message),
            generated_tasks=generated_tasks
        )
        
    except OllamaConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate tasks: {str(e)}")


@router.get("/messages", response_model=List[ChatMessage])
async def get_chat_messages(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get chat message history.
    
    Args:
        limit: Maximum number of messages to return
        offset: Number of messages to skip
        db: Database session
        
    Returns:
        List of chat messages
    """
    try:
        messages = (
            db.query(ChatMessageModel)
            .order_by(ChatMessageModel.timestamp.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        return [ChatMessage.model_validate(msg) for msg in messages]
        
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