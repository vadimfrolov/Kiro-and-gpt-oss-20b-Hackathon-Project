import { z } from 'zod';
import { Priority, TaskStatus } from '../types/enums';

// Enum schemas
export const PrioritySchema = z.nativeEnum(Priority);
export const TaskStatusSchema = z.nativeEnum(TaskStatus);

// Task validation schemas
export const TaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: PrioritySchema,
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  status: TaskStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  calendar_event_id: z.string().optional(),
  ai_generated: z.boolean()
});

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: PrioritySchema.default(Priority.MEDIUM),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  ai_generated: z.boolean().default(false)
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: PrioritySchema.optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  status: TaskStatusSchema.optional()
});

export const TaskFiltersSchema = z.object({
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  category: z.string().optional(),
  due_date_from: z.string().datetime().optional(),
  due_date_to: z.string().datetime().optional(),
  search: z.string().optional()
});

export const GeneratedTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  suggested_due_date: z.string().datetime().optional(),
  suggested_priority: PrioritySchema,
  suggested_category: z.string(),
  confidence_score: z.number().min(0).max(1)
});

export const WorkloadAnalysisSchema = z.object({
  total_tasks: z.number().int().nonnegative(),
  completed_tasks: z.number().int().nonnegative(),
  pending_tasks: z.number().int().nonnegative(),
  overdue_tasks: z.number().int().nonnegative(),
  tasks_by_priority: z.record(PrioritySchema, z.number().int().nonnegative()),
  estimated_completion_time: z.number().nonnegative(),
  recommendations: z.array(z.string())
});