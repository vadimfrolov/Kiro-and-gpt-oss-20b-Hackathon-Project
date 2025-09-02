import { Task, TaskCreate, TaskUpdate, TaskFilters, WorkloadAnalysis } from './task';
import { ChatMessage, ChatResponse, ChatPromptRequest } from './chat';

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Paginated response interface
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Error response interface
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// Task API endpoints
export interface TaskApiEndpoints {
  // GET /tasks
  getTasks: (filters?: TaskFilters, page?: number, size?: number) => Promise<ApiResponse<PaginatedResponse<Task>>>;
  
  // POST /tasks
  createTask: (task: TaskCreate) => Promise<ApiResponse<Task>>;
  
  // GET /tasks/{id}
  getTask: (id: number) => Promise<ApiResponse<Task>>;
  
  // PUT /tasks/{id}
  updateTask: (id: number, updates: TaskUpdate) => Promise<ApiResponse<Task>>;
  
  // DELETE /tasks/{id}
  deleteTask: (id: number) => Promise<ApiResponse<void>>;
  
  // PATCH /tasks/{id}/complete
  completeTask: (id: number) => Promise<ApiResponse<Task>>;
  
  // POST /tasks/analyze
  analyzeWorkload: (taskIds?: number[]) => Promise<ApiResponse<WorkloadAnalysis>>;
  
  // POST /tasks/{id}/improve
  improveTask: (id: number) => Promise<ApiResponse<Task>>;
}

// Chat API endpoints
export interface ChatApiEndpoints {
  // POST /chat/generate-tasks
  generateTasks: (request: ChatPromptRequest) => Promise<ApiResponse<ChatResponse>>;
  
  // GET /chat/messages
  getChatMessages: (page?: number, size?: number) => Promise<ApiResponse<PaginatedResponse<ChatMessage>>>;
}

// Calendar API endpoints
export interface CalendarApiEndpoints {
  // POST /calendar/auth
  authenticateCalendar: (credentials: Record<string, any>) => Promise<ApiResponse<{ success: boolean }>>;
  
  // POST /calendar/sync/{task_id}
  syncTaskToCalendar: (taskId: number) => Promise<ApiResponse<{ event_id: string }>>;
  
  // DELETE /calendar/sync/{task_id}
  removeSyncedTask: (taskId: number) => Promise<ApiResponse<void>>;
}

// Health check endpoint
export interface HealthApiEndpoints {
  // GET /health
  healthCheck: () => Promise<ApiResponse<{
    status: string;
    database: boolean;
    ollama: boolean;
    calendar?: boolean;
  }>>;
}