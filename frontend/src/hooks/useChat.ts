import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatApiService, withRetry } from '../lib/api';
import {
  ChatMessage,
  ChatPromptRequest,
  ChatResponse,
} from '../types/chat';
import { PaginatedResponse } from '../types/api';

// Query keys for React Query
export const chatQueryKeys = {
  all: ['chat'] as const,
  messages: () => [...chatQueryKeys.all, 'messages'] as const,
  messagesList: (page?: number, size?: number) =>
    [...chatQueryKeys.messages(), { page, size }] as const,
};

// Hook for fetching chat messages with pagination
export const useChatMessages = (page: number = 1, size: number = 50) => {
  return useQuery({
    queryKey: chatQueryKeys.messagesList(page, size),
    queryFn: async () => {
      console.log('🔍 Fetching chat messages:', { page, size });
      const result = await ChatApiService.getChatMessages(page, size);
      console.log('📨 Chat messages fetched:', result);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for generating tasks from a prompt
export const useGenerateTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['generateTasks'],
    mutationFn: (request: ChatPromptRequest) => {
      console.log('🚀 Starting generate tasks request:', request);
      return withRetry(() => ChatApiService.generateTasks(request));
    },
    onSuccess: (response: ChatResponse) => {
      console.log('✅ Generate tasks successful:', response);
      
      // Immediately invalidate queries to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages() });
      console.log('📝 Invalidated chat messages query to fetch fresh data');
      
      // Also force refetch with a small delay to ensure backend processing is complete
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: chatQueryKeys.messages() });
        console.log('📝 Force refetched chat messages');
      }, 200);
    },
    onError: (error) => {
      console.error('❌ Failed to generate tasks:', error);
    },
    onSettled: () => {
      console.log('🏁 Mutation settled (completed or failed)');
    },
  });
};

// Hook for managing chat state and conversation flow
export const useChatConversation = () => {
  const queryClient = useQueryClient();
  const generateTasks = useGenerateTasks();
  const [isManuallyLoading, setIsManuallyLoading] = useState(false);

  // Function to add a user message optimistically
  const addUserMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      content,
      role: 'USER',
      timestamp: new Date().toISOString(),
    };

    // Add user message optimistically
    const currentQueryKey = chatQueryKeys.messagesList(1, 50);
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      currentQueryKey,
      (old) => {
        console.log('📝 Adding user message optimistically, old data:', old);
        if (!old) {
          return {
            items: [userMessage],
            total: 1,
            page: 1,
            size: 50,
            pages: 1,
          };
        }

        const newData = {
          ...old,
          items: [userMessage, ...old.items],
          total: old.total + 1,
        };
        console.log('📝 New cache data with user message:', newData);
        return newData;
      }
    );

    return userMessage;
  };

  // Function to send a prompt and generate tasks
  const sendPrompt = async (prompt: string, context?: string) => {
    // Add user message first
    addUserMessage(prompt);

    setIsManuallyLoading(true);
    console.log('🔄 Setting manual loading to true');

    try {
      // Generate tasks from the prompt
      const result = await generateTasks.mutateAsync({
        prompt,
        context,
      });
      console.log('🎉 sendPrompt completed successfully');
      return result;
    } catch (error) {
      console.log('💥 sendPrompt failed:', error);
      throw error;
    } finally {
      setIsManuallyLoading(false);
      console.log('🔄 Setting manual loading to false');
    }
  };

  const refreshMessages = () => {
    console.log('🔄 Manually refreshing chat messages');
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages() });
  };

  return {
    sendPrompt,
    addUserMessage,
    refreshMessages,
    isGenerating: isManuallyLoading || generateTasks.isPending,
    error: generateTasks.error,
    reset: () => {
      console.log('🔄 Resetting chat conversation state');
      setIsManuallyLoading(false);
      generateTasks.reset();
    },
  };
};