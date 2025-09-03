import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStore } from '../stores/useOfflineStore';
import { Task } from '../types/task';
import { ChatMessage } from '../types/chat';
import { PaginatedResponse } from '../types/api';
import { taskQueryKeys } from './useTasks';
import { chatQueryKeys } from './useChat';

// Cache management configuration
interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // maximum number of items to cache
  persistOffline: boolean;
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxAge: 10 * 60 * 1000, // 10 minutes
  maxSize: 1000,
  persistOffline: true,
};

// Hook for advanced caching strategies
export const useCaching = (config: Partial<CacheConfig> = {}) => {
  const queryClient = useQueryClient();
  const {
    cachedTasks,
    cachedChatMessages,
    setCachedTasks,
    setCachedChatMessages,
    addCachedTask,
    updateCachedTask,
    removeCachedTask,
    addCachedChatMessage,
    isOnline,
  } = useOfflineStore();
  
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
  
  // Cache tasks for offline access
  const cacheTasksData = (tasks: Task[]) => {
    if (!finalConfig.persistOffline) return;
    
    // Limit cache size
    const limitedTasks = tasks.slice(0, finalConfig.maxSize);
    setCachedTasks(limitedTasks);
    
    // Also update React Query cache
    tasks.forEach(task => {
      queryClient.setQueryData(taskQueryKeys.detail(task.id), task);
    });
  };
  
  // Cache chat messages for offline access
  const cacheChatData = (messages: ChatMessage[]) => {
    if (!finalConfig.persistOffline) return;
    
    // Limit cache size
    const limitedMessages = messages.slice(0, finalConfig.maxSize);
    setCachedChatMessages(limitedMessages);
  };
  
  // Get cached data when offline
  const getCachedTasks = (): Task[] => {
    if (isOnline) {
      // When online, prefer React Query cache
      const queryCache = queryClient.getQueryCache();
      const taskQueries = queryCache.findAll({ queryKey: taskQueryKeys.lists() });
      
      if (taskQueries.length > 0) {
        const latestQuery = taskQueries[0];
        const data = latestQuery.state.data as PaginatedResponse<Task> | undefined;
        return data?.items || cachedTasks;
      }
    }
    
    return cachedTasks;
  };
  
  const getCachedChatMessages = (): ChatMessage[] => {
    if (isOnline) {
      // When online, prefer React Query cache
      const queryCache = queryClient.getQueryCache();
      const chatQueries = queryCache.findAll({ queryKey: chatQueryKeys.messages() });
      
      if (chatQueries.length > 0) {
        const latestQuery = chatQueries[0];
        const data = latestQuery.state.data as PaginatedResponse<ChatMessage> | undefined;
        return data?.items || cachedChatMessages;
      }
    }
    
    return cachedChatMessages;
  };
  
  // Preload critical data
  const preloadCriticalData = async () => {
    try {
      // Preload recent tasks
      await queryClient.prefetchQuery({
        queryKey: taskQueryKeys.list({}, 1, 20),
        staleTime: finalConfig.maxAge,
      });
      
      // Preload recent chat messages
      await queryClient.prefetchQuery({
        queryKey: chatQueryKeys.messagesList(1, 20),
        staleTime: finalConfig.maxAge,
      });
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  };
  
  // Clear expired cache entries
  const clearExpiredCache = () => {
    const now = Date.now();
    const queryCache = queryClient.getQueryCache();
    
    queryCache.getAll().forEach(query => {
      const { dataUpdatedAt } = query.state;
      if (dataUpdatedAt && (now - dataUpdatedAt) > finalConfig.maxAge) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  };
  
  // Optimize cache size
  const optimizeCacheSize = () => {
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    
    // Remove oldest queries if cache is too large
    if (allQueries.length > finalConfig.maxSize) {
      const sortedQueries = allQueries
        .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0));
      
      const queriesToRemove = sortedQueries.slice(0, allQueries.length - finalConfig.maxSize);
      queriesToRemove.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
    }
  };
  
  // Warm up cache with frequently accessed data
  const warmUpCache = async (taskIds: number[] = []) => {
    const promises = taskIds.map(id =>
      queryClient.prefetchQuery({
        queryKey: taskQueryKeys.detail(id),
        staleTime: finalConfig.maxAge,
      })
    );
    
    await Promise.allSettled(promises);
  };
  
  // Cache statistics
  const getCacheStats = () => {
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    
    const taskQueries = allQueries.filter(q => 
      q.queryKey[0] === 'tasks'
    );
    
    const chatQueries = allQueries.filter(q => 
      q.queryKey[0] === 'chat'
    );
    
    return {
      totalQueries: allQueries.length,
      taskQueries: taskQueries.length,
      chatQueries: chatQueries.length,
      cachedTasksCount: cachedTasks.length,
      cachedMessagesCount: cachedChatMessages.length,
      memoryUsage: {
        tasks: taskQueries.reduce((acc, q) => acc + (q.state.data ? 1 : 0), 0),
        chat: chatQueries.reduce((acc, q) => acc + (q.state.data ? 1 : 0), 0),
      },
    };
  };
  
  return {
    // Cache management
    cacheTasksData,
    cacheChatData,
    getCachedTasks,
    getCachedChatMessages,
    
    // Cache optimization
    preloadCriticalData,
    clearExpiredCache,
    optimizeCacheSize,
    warmUpCache,
    
    // Cache information
    getCacheStats,
    
    // Cache configuration
    config: finalConfig,
  };
};

// Hook for intelligent prefetching
export const usePrefetching = () => {
  const queryClient = useQueryClient();
  
  // Prefetch related tasks when viewing a task
  const prefetchRelatedTasks = async (currentTask: Task) => {
    const filters = {
      category: currentTask.category,
      priority: currentTask.priority,
    };
    
    // Prefetch tasks with similar attributes
    queryClient.prefetchQuery({
      queryKey: taskQueryKeys.list(filters, 1, 10),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };
  
  // Prefetch next page of results
  const prefetchNextPage = async (currentPage: number, filters?: any) => {
    queryClient.prefetchQuery({
      queryKey: taskQueryKeys.list(filters, currentPage + 1, 20),
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };
  
  // Prefetch user's most common filters
  const prefetchCommonFilters = async () => {
    const commonFilters = [
      { status: 'PENDING' },
      { status: 'IN_PROGRESS' },
      { priority: 'HIGH' },
      { priority: 'URGENT' },
    ];
    
    const promises = commonFilters.map(filters =>
      queryClient.prefetchQuery({
        queryKey: taskQueryKeys.list(filters, 1, 10),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
    );
    
    await Promise.allSettled(promises);
  };
  
  return {
    prefetchRelatedTasks,
    prefetchNextPage,
    prefetchCommonFilters,
  };
};