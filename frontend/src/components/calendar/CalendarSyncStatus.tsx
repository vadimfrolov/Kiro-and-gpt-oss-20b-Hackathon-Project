import React from 'react';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Task } from '../../types/task';
import { useSyncTaskToCalendar, useRemoveSyncedTask } from '../../hooks/useCalendar';
import { useUIStore } from '../../stores/useUIStore';
import { useNotifications } from '../../stores/useUIStore';

interface CalendarSyncStatusProps {
  task: Task;
  showControls?: boolean;
  className?: string;
}

export const CalendarSyncStatus: React.FC<CalendarSyncStatusProps> = ({ 
  task, 
  showControls = true, 
  className = '' 
}) => {
  const { isCalendarConnected, calendarSyncEnabled } = useUIStore();
  const { addNotification } = useNotifications();
  const syncTask = useSyncTaskToCalendar();
  const removeSync = useRemoveSyncedTask();

  const isSynced = !!task.calendar_event_id;
  const canSync = isCalendarConnected && calendarSyncEnabled && task.due_date;

  const handleSyncTask = async () => {
    if (!canSync) return;
    
    try {
      await syncTask.mutateAsync(task.id);
      addNotification({
        type: 'success',
        title: 'Task Synced',
        message: `"${task.title}" has been added to your calendar`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync task to calendar',
        duration: 5000
      });
    }
  };

  const handleRemoveSync = async () => {
    if (!isSynced) return;
    
    try {
      await removeSync.mutateAsync(task.id);
      addNotification({
        type: 'info',
        title: 'Sync Removed',
        message: `"${task.title}" has been removed from your calendar`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Remove Failed',
        message: 'Failed to remove task from calendar',
        duration: 5000
      });
    }
  };

  if (!isCalendarConnected) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isSynced ? (
        <>
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Synced</span>
          </div>
          {showControls && (
            <button
              onClick={handleRemoveSync}
              disabled={removeSync.isPending}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </>
      ) : canSync ? (
        <>
          <div className="flex items-center space-x-1 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Not synced</span>
          </div>
          {showControls && (
            <button
              onClick={handleSyncTask}
              disabled={syncTask.isPending}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {syncTask.isPending ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center space-x-1 text-gray-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">No due date</span>
        </div>
      )}
    </div>
  );
};