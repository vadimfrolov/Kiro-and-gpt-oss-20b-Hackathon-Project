import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarApiService, withRetry } from '../lib/api';
import { taskQueryKeys } from './useTasks';
import { Task } from '../types/task';
import { PaginatedResponse } from '../types/api';

// Hook for authenticating with Google Calendar
export const useCalendarAuth = () => {
  return useMutation({
    mutationFn: (credentials: Record<string, any>) =>
      withRetry(() => CalendarApiService.authenticateCalendar(credentials)),
    onSuccess: (result) => {
      console.log('Calendar authentication successful:', result);
    },
    onError: (error) => {
      console.error('Failed to authenticate with calendar:', error);
    },
  });
};

// Hook for syncing a task to Google Calendar
export const useSyncTaskToCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) =>
      withRetry(() => CalendarApiService.syncTaskToCalendar(taskId)),
    onSuccess: (result, taskId) => {
      // Update the task with the calendar event ID
      queryClient.setQueriesData<Task>(
        { queryKey: taskQueryKeys.detail(taskId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            calendar_event_id: result.event_id,
          };
        }
      );

      // Update task in lists as well
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === taskId
                ? { ...task, calendar_event_id: result.event_id }
                : task
            ),
          };
        }
      );

      console.log('Task synced to calendar:', result);
    },
    onError: (error) => {
      console.error('Failed to sync task to calendar:', error);
    },
  });
};

// Hook for removing a synced task from Google Calendar
export const useRemoveSyncedTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) =>
      withRetry(() => CalendarApiService.removeSyncedTask(taskId)),
    onSuccess: (_, taskId) => {
      // Remove the calendar event ID from the task
      queryClient.setQueriesData<Task>(
        { queryKey: taskQueryKeys.detail(taskId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            calendar_event_id: undefined,
          };
        }
      );

      // Update task in lists as well
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        { queryKey: taskQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === taskId
                ? { ...task, calendar_event_id: undefined }
                : task
            ),
          };
        }
      );

      console.log('Task removed from calendar');
    },
    onError: (error) => {
      console.error('Failed to remove synced task:', error);
    },
  });
};