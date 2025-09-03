import React, { useState, useEffect } from 'react';
import { TaskFilters as TaskFiltersType, TaskCreate, TaskUpdate } from '../../types';
import { TaskItem } from './TaskItem';
import { TaskFilters } from './TaskFilters';
import { TaskForm } from './TaskForm';
import { LoadingState, TaskListSkeleton } from '../Loading';
import { Plus, Filter, SortAsc, SortDesc, Grid, List, RefreshCw } from 'lucide-react';
import { 
  useTasks, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask, 
  useCompleteTask,
  useWorkloadAnalysis 
} from '../../hooks/useTasks';
import { useTaskUIState } from '../../stores/useUIStore';
import { useNotify } from '../NotificationSystem';
import { useCaching, usePrefetching } from '../../hooks/useCaching';

type SortField = 'title' | 'due_date' | 'priority' | 'created_at' | 'status';

const ITEMS_PER_PAGE = 20;

export const TaskListWithAPI: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI state management
  const {
    filters,
    viewMode,
    sortBy,
    sortOrder,
    selectedIds,
    setFilters,
    clearFilters,
    setViewMode,
    setSort,
    toggleSelection,
    clearSelection,
  } = useTaskUIState();
  
  // API hooks
  const { 
    data: tasksResponse, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useTasks(filters, currentPage, ITEMS_PER_PAGE);
  
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  
  // Workload analysis
  const { data: workloadAnalysis } = useWorkloadAnalysis();
  
  // Caching and prefetching
  const { preloadCriticalData, getCacheStats } = useCaching();
  const { prefetchNextPage, prefetchCommonFilters } = usePrefetching();
  
  // Notifications
  const notify = useNotify();
  
  // Preload data and prefetch common filters on mount
  useEffect(() => {
    preloadCriticalData();
    prefetchCommonFilters();
  }, []);
  
  // Prefetch next page when approaching the end of current page
  useEffect(() => {
    if (tasksResponse && currentPage < tasksResponse.pages) {
      prefetchNextPage(currentPage, filters);
    }
  }, [currentPage, tasksResponse, filters]);
  
  const tasks = tasksResponse?.items || [];
  const totalPages = tasksResponse?.pages || 1;
  const totalTasks = tasksResponse?.total || 0;
  
  const handleSort = (field: SortField) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSort(field, newOrder);
    setCurrentPage(1);
  };
  
  const handleFiltersChange = (newFilters: TaskFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };
  
  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };
  
  const handleCreateTask = async (taskData: TaskCreate) => {
    try {
      await createTaskMutation.mutateAsync(taskData);
      setShowCreateForm(false);
      notify.success('Task created successfully!');
    } catch (error) {
      notify.error('Failed to create task', 'Please try again.');
    }
  };
  
  const handleUpdateTask = async (id: number, updates: TaskUpdate) => {
    try {
      await updateTaskMutation.mutateAsync({ id, updates });
      notify.success('Task updated successfully!');
    } catch (error) {
      notify.error('Failed to update task', 'Please try again.');
    }
  };
  
  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await deleteTaskMutation.mutateAsync(id);
      notify.success('Task deleted successfully!');
    } catch (error) {
      notify.error('Failed to delete task', 'Please try again.');
    }
  };
  
  const handleToggleComplete = async (id: number) => {
    try {
      await completeTaskMutation.mutateAsync(id);
      notify.success('Task completed!');
    } catch (error) {
      notify.error('Failed to complete task', 'Please try again.');
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) {
      return;
    }
    
    try {
      await Promise.all(
        selectedIds.map(id => deleteTaskMutation.mutateAsync(id))
      );
      clearSelection();
      notify.success(`${selectedIds.length} tasks deleted successfully!`);
    } catch (error) {
      notify.error('Failed to delete some tasks', 'Please try again.');
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />;
  };
  
  if (isError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <p className="text-lg font-medium">Failed to load tasks</p>
          <p className="text-sm">{error?.message || 'An error occurred'}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCw size={16} className="inline mr-2" />
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{totalTasks} total tasks</span>
            {workloadAnalysis && (
              <>
                <span>•</span>
                <span>{workloadAnalysis.pending_tasks} pending</span>
                <span>•</span>
                <span>{workloadAnalysis.completed_tasks} completed</span>
                {workloadAnalysis.overdue_tasks > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-600 font-medium">
                      {workloadAnalysis.overdue_tasks} overdue
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 mr-4">
              <span className="text-sm text-gray-600">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                Delete Selected
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          )}
          
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`inline mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={() => setFilters({ ...filters })}
            className="px-3 py-2 text-sm font-medium rounded-md border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <Filter size={16} className="inline mr-1" />
            Filters
          </button>
          
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid size={16} />
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={16} className="inline mr-1" />
            New Task
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <TaskFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
      
      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">Sort by:</span>
        {(['title', 'due_date', 'priority', 'created_at', 'status'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
              sortBy === field
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="capitalize">{field.replace('_', ' ')}</span>
            {getSortIcon(field)}
          </button>
        ))}
      </div>
      
      {/* Task List */}
      {isLoading ? (
        <TaskListSkeleton count={5} />
      ) : tasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {totalTasks === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {tasks.map((task) => (
            <div key={task.id} className="relative">
              <input
                type="checkbox"
                checked={selectedIds.includes(task.id)}
                onChange={() => toggleSelection(task.id)}
                className="absolute top-2 left-2 z-10"
              />
              <TaskItem
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={isLoading}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Create Task Form Modal */}
      {showCreateForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Task"
          isLoading={createTaskMutation.isPending}
        />
      )}
    </div>
  );
};