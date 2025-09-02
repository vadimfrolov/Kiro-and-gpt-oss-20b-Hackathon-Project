import { Priority, TaskStatus } from './enums';

// Core Task interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string; // ISO date string
  priority: Priority;
  category?: string;
  status: TaskStatus;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  calendar_event_id?: string;
  ai_generated: boolean;
}

// Interface for creating a new task
export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  priority: Priority;
  category?: string;
  ai_generated?: boolean;
}

// Interface for updating an existing task
export interface TaskUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: Priority;
  category?: string;
  status?: TaskStatus;
}

// Interface for task filtering
export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  category?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

// Interface for AI-generated task suggestions
export interface GeneratedTask {
  title: string;
  description: string;
  suggested_due_date?: string;
  suggested_priority: Priority;
  suggested_category: string;
  confidence_score: number;
}

// Interface for workload analysis
export interface WorkloadAnalysis {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  tasks_by_priority: Record<Priority, number>;
  estimated_completion_time: number; // in hours
  recommendations: string[];
}