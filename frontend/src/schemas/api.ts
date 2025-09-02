import { z } from 'zod';

// Generic API response schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
    success: z.boolean()
  });

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    size: z.number().int().positive(),
    pages: z.number().int().nonnegative()
  });

// Error response schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional()
});

// Health check response schema
export const HealthCheckResponseSchema = z.object({
  status: z.string(),
  database: z.boolean(),
  ollama: z.boolean(),
  calendar: z.boolean().optional()
});

// Calendar authentication response schema
export const CalendarAuthResponseSchema = z.object({
  success: z.boolean()
});

// Calendar sync response schema
export const CalendarSyncResponseSchema = z.object({
  event_id: z.string()
});