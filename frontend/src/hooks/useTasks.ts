import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TaskApiService,
  withOptimisticUpdate,
  withRetry,
} from '../lib/api';
import {
  Task,
  TaskCreate,
  TaskUpdate,
  TaskFilters,
  WorkloadAnalysis,
} from '../types/task';
import { PaginatedResponse } from '../types/api';

// Query keys for React Query
export const taskQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskQueryKeys.all, 'list'] as const,
  list: (filters?: TaskFilters, page?: number, size?: number) =>
    [...taskQueryKeys.lists(), { filters, page, size }] as const,
  details: () => [...taskQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskQueryKeys.details(), id] as const,
  analysis: () => [...taskQueryKeys.all, 'analysis'] as const,
};

// Hook for fetching tasks with filters and pagination
export const useTasks = (
  filters?: TaskFilters,
  page: number = 1,
  size: number = 20
) => {
  return useQuery({
    queryKey: taskQueryKeys.list(filters, page, size),
    queryFn: () => TaskApiService.getTasks(filters, page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for fetching a single task
export const useTask = (id: number) => {
  return useQuery({
    queryKey: taskQueryKeys.detail(id),
    queryFn: () => TaskApiService.getTask(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for creating a new task
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: TaskCreate) => withRetry(() => TaskApiService.createTask(task)),
    onSuccess: (newTask) => {
      // Invalidate and refetch tasks list
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
      
      // Add the new task to the cache
      queryClient.setQueryData(taskQueryKeys.detail(newTask.id), newTask);
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
    },
  });
};

// Hook for updating a task with optimistic updates
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: TaskUpdate }) => {
      return withOptimisticUpdate(
        // Optimistic update
        () => {
          const queryKey = taskQueryKeys.detail(id);
          const previousTask = queryClient.getQueryData<Task>(queryKey);
          
          if (previousTask) {
            queryClient.setQueryData<Task>(queryKey, {
              ...previousTask,
              ...updates,
              updated_at: new Date().toISOString(),
            });
          }
          
          // Update task in lists as well
          queryClient.setQueriesData<PaginatedResponse<Task>>(
            { queryKey: taskQueryKeys.lists() },
            (old) => {
              if (!old) return old;
              
              return {
                ...old,
                items: old.items.map((task) =>
                  task.id === id
                    ? { ...task, ...updates, updated_at: new Date().toISOString() }
                    : task
                ),
              };
            }
          );
        },
        // Rollback function
        () => {
          queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(id) });
          queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        },
        // API call
        () => withRetry(() => TaskApiService.updateTask(id, updates))
      );
    },
    onSuccess: (updatedTask) => {
      // Update the cache with the server response
      queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
      
      // Update task in lists
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            ),
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
    },
  });
};

// Hook for deleting a task with optimistic updates
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      return withOptimisticUpdate(
        // Optimistic update
        () => {
          // Remove from lists
          queryClient.setQueriesData<PaginatedResponse<Task>>(
            { queryKey: taskQueryKeys.lists() },
            (old) => {
              if (!old) return old;
              
              return {
                ...old,
                items: old.items.filter((task) => task.id !== id),
                total: old.total - 1,
              };
            }
          );
          
          // Remove from cache
          queryClient.removeQueries({ queryKey: taskQueryKeys.detail(id) });
        },
        // Rollback function
        () => {
          queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        },
        // API call
        () => withRetry(() => TaskApiService.deleteTask(id))
      );
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
    },
  });
};

// Hook for completing a task
export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      return withOptimisticUpdate(
        // Optimistic update
        () => {
          const queryKey = taskQueryKeys.detail(id);
          const previousTask = queryClient.getQueryData<Task>(queryKey);
          
          if (previousTask) {
            const completedTask = {
              ...previousTask,
              status: 'COMPLETED' as const,
              updated_at: new Date().toISOString(),
            };
            
            queryClient.setQueryData<Task>(queryKey, completedTask);
            
            // Update in lists
            queryClient.setQueriesData<PaginatedResponse<Task>>(
              { queryKey: taskQueryKeys.lists() },
              (old) => {
                if (!old) return old;
                
                return {
                  ...old,
                  items: old.items.map((task) =>
                    task.id === id ? completedTask : task
                  ),
                };
              }
            );
          }
        },
        // Rollback function
        () => {
          queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(id) });
          queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        },
        // API call
        () => withRetry(() => TaskApiService.completeTask(id))
      );
    },
    onSuccess: (completedTask) => {
      // Update with server response
      queryClient.setQueryData(taskQueryKeys.detail(completedTask.id), completedTask);
      
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === completedTask.id ? completedTask : task
            ),
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to complete task:', error);
    },
  });
};

// Hook for workload analysis
export const useWorkloadAnalysis = (taskIds?: number[]) => {
  return useQuery({
    queryKey: [...taskQueryKeys.analysis(), { taskIds }],
    queryFn: () => TaskApiService.analyzeWorkload(taskIds),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: true, // Always enabled, but can be controlled by the component
  });
};

// Hook for improving a task with AI
export const useImproveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => withRetry(() => TaskApiService.improveTask(id)),
    onSuccess: (improvedTask) => {
      // Update the cache with the improved task
      queryClient.setQueryData(taskQueryKeys.detail(improvedTask.id), improvedTask);
      
      // Update in lists
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === improvedTask.id ? improvedTask : task
            ),
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to improve task:', error);
    },
  });
};