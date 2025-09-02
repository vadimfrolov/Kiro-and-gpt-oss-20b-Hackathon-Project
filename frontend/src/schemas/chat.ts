import { z } from 'zod';
import { MessageRole } from '../types/enums';
import { GeneratedTaskSchema } from './task';

// Enum schema
export const MessageRoleSchema = z.nativeEnum(MessageRole);

// Chat validation schemas
export const ChatMessageSchema = z.object({
  id: z.number().int().positive(),
  content: z.string().min(1, 'Message content is required'),
  role: MessageRoleSchema,
  timestamp: z.string().datetime(),
  generated_tasks: z.array(GeneratedTaskSchema).optional()
});

export const ChatMessageCreateSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000, 'Message too long'),
  role: MessageRoleSchema
});

export const ChatPromptRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000, 'Prompt too long'),
  context: z.string().optional()
});

export const ChatResponseSchema = z.object({
  message: ChatMessageSchema,
  generated_tasks: z.array(GeneratedTaskSchema)
});