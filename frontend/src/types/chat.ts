import { MessageRole } from './enums';
import { GeneratedTask } from './task';

// Core ChatMessage interface
export interface ChatMessage {
  id: number;
  content: string;
  role: MessageRole;
  timestamp: string; // ISO date string
  generated_tasks?: GeneratedTask[];
}

// Interface for creating a new chat message
export interface ChatMessageCreate {
  content: string;
  role: MessageRole;
}

// Interface for chat prompt request
export interface ChatPromptRequest {
  prompt: string;
  context?: string;
}

// Interface for chat response with generated tasks
export interface ChatResponse {
  message: ChatMessage;
  generated_tasks: GeneratedTask[];
}