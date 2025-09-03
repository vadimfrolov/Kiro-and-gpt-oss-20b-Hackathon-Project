import { useQuery } from '@tanstack/react-query';
import { HealthApiService } from '../lib/api';
import { HealthStatus } from '../lib/api/health';

// Query keys for health checks
export const healthQueryKeys = {
  all: ['health'] as const,
  status: () => [...healthQueryKeys.all, 'status'] as const,
};

// Hook for checking system health
export const useHealthCheck = (
  refetchInterval: number = 30000, // 30 seconds
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: healthQueryKeys.status(),
    queryFn: () => HealthApiService.healthCheck(),
    refetchInterval,
    enabled,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry too aggressively for health checks
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

// Hook for monitoring specific service availability
export const useServiceStatus = (
  service: keyof Pick<HealthStatus, 'database' | 'ollama' | 'calendar'>,
  refetchInterval: number = 30000
) => {
  const { data: healthStatus, ...rest } = useHealthCheck(refetchInterval);
  
  return {
    ...rest,
    isAvailable: healthStatus?.[service] ?? false,
    healthStatus,
  };
};