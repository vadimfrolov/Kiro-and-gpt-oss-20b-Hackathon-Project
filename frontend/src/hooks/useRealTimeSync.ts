import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskQueryKeys } from './useTasks';
import { chatQueryKeys } from './useChat';
import { useOfflineStore } from '../stores/useOfflineStore';
import { useNotify } from '../components/NotificationSystem';

// Real-time sync configuration
interface SyncConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  onError?: (error: Error) => void;
}

// Hook for real-time synchronization
export const useRealTimeSync = (config: SyncConfig = { enabled: true, interval: 30000 }) => {
  const queryClient = useQueryClient();
  const { isOnline, setLastSyncTimestamp } = useOfflineStore();
  const notify = useNotify();
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const syncData = async () => {
    if (!isOnline || !config.enabled) {
      return;
    }
    
    try {
      // Invalidate and refetch critical data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() }),
        // Temporarily disable chat message sync to avoid interfering with optimistic updates
        // queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages() }),
      ]);
      
      setLastSyncTimestamp(Date.now());
    } catch (error) {
      console.error('Sync failed:', error);
      
      if (config.onError) {
        config.onError(error as Error);
      } else {
        notify.warning(
          'Sync Failed',
          'Unable to sync data. Your changes are saved locally.',
          {
            label: 'Retry',
            onClick: () => syncData(),
          }
        );
      }
    }
  };
  
  useEffect(() => {
    if (!config.enabled || !isOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }
    
    // Initial sync
    syncData();
    
    // Set up periodic sync
    intervalRef.current = setInterval(syncData, config.interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config.enabled, config.interval, isOnline]);
  
  // Sync when coming back online
  useEffect(() => {
    if (isOnline && config.enabled) {
      syncData();
    }
  }, [isOnline, config.enabled]);
  
  return {
    syncNow: syncData,
    isOnline,
  };
};

// Hook for optimistic updates with conflict resolution
export const useOptimisticSync = () => {
  const queryClient = useQueryClient();
  const notify = useNotify();
  
  const handleConflict = async (
    localData: any,
    serverData: any,
    resolver: (local: any, server: any) => any
  ) => {
    try {
      const resolved = resolver(localData, serverData);
      return resolved;
    } catch (error) {
      notify.warning(
        'Data Conflict',
        'There was a conflict with your changes. Please review and resolve manually.',
        {
          label: 'Review',
          onClick: () => {
            // Open conflict resolution UI
            console.log('Open conflict resolution for:', { localData, serverData });
          },
        }
      );
      throw error;
    }
  };
  
  const applyOptimisticUpdate = <T>(
    queryKey: any[],
    updater: (old: T | undefined) => T,
    rollback?: () => void
  ) => {
    // Store the previous data for rollback
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    // Apply optimistic update
    queryClient.setQueryData<T>(queryKey, updater);
    
    return {
      rollback: () => {
        if (rollback) {
          rollback();
        } else {
          queryClient.setQueryData<T>(queryKey, previousData);
        }
      },
    };
  };
  
  return {
    handleConflict,
    applyOptimisticUpdate,
  };
};

// Hook for background sync of pending operations
export const useBackgroundSync = () => {
  const { isOnline, pendingOperations } = useOfflineStore();
  const { processPendingOperations } = useOfflineOperations();
  const notify = useNotify();
  
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      const syncPending = async () => {
        try {
          await processPendingOperations();
          
          if (pendingOperations.length > 0) {
            notify.success(
              'Sync Complete',
              `${pendingOperations.length} pending changes have been synced.`
            );
          }
        } catch (error) {
          notify.error(
            'Sync Failed',
            'Some changes could not be synced. They will be retried automatically.',
            {
              label: 'Retry Now',
              onClick: () => processPendingOperations(),
            }
          );
        }
      };
      
      // Delay sync slightly to avoid immediate sync on reconnection
      const timer = setTimeout(syncPending, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOperations.length]);
  
  return {
    pendingCount: pendingOperations.length,
    syncPending: processPendingOperations,
  };
};

// We need to import the useOfflineOperations hook
import { useOfflineOperations } from '../stores/useOfflineStore';