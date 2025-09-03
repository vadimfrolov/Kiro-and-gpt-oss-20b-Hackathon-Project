import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskCreate, TaskUpdate } from '../types/task';
import { ChatMessage } from '../types/chat';

// Offline operation types
interface OfflineOperation {
  id: string;
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_TASK';
  data: any;
  timestamp: number;
  retryCount: number;
}

// Offline state interface
interface OfflineState {
  isOnline: boolean;
  pendingOperations: OfflineOperation[];
  cachedTasks: Task[];
  cachedChatMessages: ChatMessage[];
  lastSyncTimestamp: number;
  
  // Actions
  setOnlineStatus: (online: boolean) => void;
  addPendingOperation: (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingOperation: (id: string) => void;
  incrementRetryCount: (id: string) => void;
  clearPendingOperations: () => void;
  
  setCachedTasks: (tasks: Task[]) => void;
  addCachedTask: (task: Task) => void;
  updateCachedTask: (id: number, updates: Partial<Task>) => void;
  removeCachedTask: (id: number) => void;
  
  setCachedChatMessages: (messages: ChatMessage[]) => void;
  addCachedChatMessage: (message: ChatMessage) => void;
  
  setLastSyncTimestamp: (timestamp: number) => void;
}

// Create the offline store with persistence
export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: navigator.onLine,
      pendingOperations: [],
      cachedTasks: [],
      cachedChatMessages: [],
      lastSyncTimestamp: 0,
      
      // Online status actions
      setOnlineStatus: (online) =>
        set({ isOnline: online }),
      
      // Pending operations actions
      addPendingOperation: (operation) =>
        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            {
              ...operation,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              retryCount: 0,
            },
          ],
        })),
      
      removePendingOperation: (id) =>
        set((state) => ({
          pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
        })),
      
      incrementRetryCount: (id) =>
        set((state) => ({
          pendingOperations: state.pendingOperations.map((op) =>
            op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
          ),
        })),
      
      clearPendingOperations: () =>
        set({ pendingOperations: [] }),
      
      // Cached tasks actions
      setCachedTasks: (tasks) =>
        set({ cachedTasks: tasks }),
      
      addCachedTask: (task) =>
        set((state) => ({
          cachedTasks: [...state.cachedTasks, task],
        })),
      
      updateCachedTask: (id, updates) =>
        set((state) => ({
          cachedTasks: state.cachedTasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        })),
      
      removeCachedTask: (id) =>
        set((state) => ({
          cachedTasks: state.cachedTasks.filter((task) => task.id !== id),
        })),
      
      // Cached chat messages actions
      setCachedChatMessages: (messages) =>
        set({ cachedChatMessages: messages }),
      
      addCachedChatMessage: (message) =>
        set((state) => ({
          cachedChatMessages: [message, ...state.cachedChatMessages],
        })),
      
      // Sync actions
      setLastSyncTimestamp: (timestamp) =>
        set({ lastSyncTimestamp: timestamp }),
    }),
    {
      name: 'ollama-todo-offline-state',
      // Persist everything except online status
      partialize: (state) => ({
        pendingOperations: state.pendingOperations,
        cachedTasks: state.cachedTasks,
        cachedChatMessages: state.cachedChatMessages,
        lastSyncTimestamp: state.lastSyncTimestamp,
      }),
    }
  )
);

// Hook for managing offline operations
export const useOfflineOperations = () => {
  const {
    isOnline,
    pendingOperations,
    addPendingOperation,
    removePendingOperation,
    incrementRetryCount,
    clearPendingOperations,
  } = useOfflineStore();
  
  // Queue an operation for when we're back online
  const queueOperation = (
    type: OfflineOperation['type'],
    data: any
  ) => {
    if (!isOnline) {
      addPendingOperation({ type, data });
      return true; // Operation was queued
    }
    return false; // Operation should be executed immediately
  };
  
  // Process pending operations when back online
  const processPendingOperations = async () => {
    if (!isOnline || pendingOperations.length === 0) {
      return;
    }
    
    // Process operations in order
    for (const operation of pendingOperations) {
      try {
        // Here you would call the appropriate API function
        // based on the operation type
        await processOperation(operation);
        removePendingOperation(operation.id);
      } catch (error) {
        console.error('Failed to process pending operation:', error);
        
        // Increment retry count and remove if too many retries
        if (operation.retryCount >= 3) {
          removePendingOperation(operation.id);
        } else {
          incrementRetryCount(operation.id);
        }
      }
    }
  };
  
  return {
    isOnline,
    pendingOperations,
    queueOperation,
    processPendingOperations,
    clearPendingOperations,
  };
};

// Helper function to process different operation types
const processOperation = async (operation: OfflineOperation) => {
  // This would import and use the actual API functions
  // For now, just a placeholder
  switch (operation.type) {
    case 'CREATE_TASK':
      // await TaskApiService.createTask(operation.data);
      break;
    case 'UPDATE_TASK':
      // await TaskApiService.updateTask(operation.data.id, operation.data.updates);
      break;
    case 'DELETE_TASK':
      // await TaskApiService.deleteTask(operation.data.id);
      break;
    case 'COMPLETE_TASK':
      // await TaskApiService.completeTask(operation.data.id);
      break;
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
};

// Hook for online/offline detection
export const useOnlineStatus = () => {
  const { isOnline, setOnlineStatus } = useOfflineStore();
  const { processPendingOperations } = useOfflineOperations();
  
  // Set up online/offline event listeners
  React.useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      processPendingOperations();
    };
    
    const handleOffline = () => {
      setOnlineStatus(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, processPendingOperations]);
  
  return { isOnline };
};

// We need to import React for the useEffect hook
import React from 'react';