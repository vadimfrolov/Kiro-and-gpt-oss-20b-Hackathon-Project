import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );
};

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className,
}) => {
  return (
    <div className={clsx('flex items-center justify-center p-4', className)}>
      <div className="flex flex-col items-center space-y-2">
        <LoadingSpinner size={size} />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, lines = 1 }) => {
  return (
    <div className={clsx('animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={clsx(
            'bg-gray-200 rounded',
            index === lines - 1 ? 'h-4' : 'h-4 mb-2',
            index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

interface TaskListSkeletonProps {
  count?: number;
}

export const TaskListSkeleton: React.FC<TaskListSkeletonProps> = ({
  count = 3,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="ml-4">
                <div className="h-6 w-6 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface ChatMessageSkeletonProps {
  count?: number;
}

export const ChatMessageSkeleton: React.FC<ChatMessageSkeletonProps> = ({
  count = 2,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className={clsx(
            'flex',
            index % 2 === 0 ? 'justify-end' : 'justify-start'
          )}>
            <div className={clsx(
              'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
              index % 2 === 0 ? 'bg-gray-200' : 'bg-gray-100'
            )}>
              <div className="h-4 bg-gray-300 rounded w-full mb-1" />
              <div className="h-4 bg-gray-300 rounded w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};