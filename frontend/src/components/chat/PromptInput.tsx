import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChatPromptRequestSchema } from '../../schemas/chat';
import { ChatPromptRequest } from '../../types/chat';
import { Send, Loader2 } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: ChatPromptRequest) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isLoading = false,
  placeholder = "Ask AI to generate tasks for you... (e.g., 'Plan a birthday party for next weekend')",
}) => {
  const [showContext, setShowContext] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ChatPromptRequest>({
    resolver: zodResolver(ChatPromptRequestSchema),
    defaultValues: {
      prompt: '',
      context: '',
    },
  });

  const promptValue = watch('prompt');

  const handleFormSubmit = (data: ChatPromptRequest) => {
    onSubmit({
      prompt: data.prompt.trim(),
      context: data.context?.trim() || undefined,
    });
    reset();
    setShowContext(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(handleFormSubmit)();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4">
        {/* Context Input (Optional) */}
        {showContext && (
          <div className="mb-3">
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              {...register('context')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Provide additional context to help AI generate better tasks..."
              disabled={isLoading}
            />
            {errors.context && (
              <p className="mt-1 text-sm text-red-600">{errors.context.message}</p>
            )}
          </div>
        )}

        {/* Main Prompt Input */}
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              {...register('prompt')}
              rows={showContext ? 2 : 3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.prompt ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {errors.prompt && (
              <p className="mt-1 text-sm text-red-600">{errors.prompt.message}</p>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <button
              type="submit"
              disabled={isLoading || !promptValue?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>{isLoading ? 'Generating...' : 'Send'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {showContext ? 'Hide Context' : 'Add Context'}
            </button>
          </div>
        </div>

        {/* Character Count */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <div>
            {promptValue?.length || 0}/5000 characters
          </div>
          <div className="text-gray-400">
            Press Shift+Enter for new line, Enter to send
          </div>
        </div>
      </form>
    </div>
  );
};