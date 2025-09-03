import React, { useState, useMemo } from 'react';
import { Task, TaskFilters as TaskFiltersType, TaskUpdate, Priority, TaskStatus } from '../../types';
import { TaskItem } from './TaskItem';
import { TaskFilters } from './TaskFilters';
import { TaskForm } from './TaskForm';
import { Plus, Filter, SortAsc, SortDesc, Grid, List } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onCreateTask: (task: any) => void;
  onUpdateTask: (id: number, updates: TaskUpdate) => void;
  onDeleteTask: (id: number) => void;
  onToggleComplete: (id: number) => void;
  isLoading?: boolean;
}

type SortField = 'title' | 'due_date' | 'priority' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

const ITEMS_PER_PAGE = 10;

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower)) ||
          (task.category && task.category.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && task.status !== filters.status) return false;

      // Priority filter
      if (filters.priority && task.priority !== filters.priority) return false;

      // Category filter
      if (filters.category) {
        const categoryLower = filters.category.toLowerCase();
        if (!task.category || !task.category.toLowerCase().includes(categoryLower)) return false;
      }

      // Date range filters
      if (filters.due_date_from && task.due_date) {
        if (new Date(task.due_date) < new Date(filters.due_date_from)) return false;
      }
      if (filters.due_date_to && task.due_date) {
        if (new Date(task.due_date) > new Date(filters.due_date_to)) return false;
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'priority':
          const priorityOrder = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'status':
          const statusOrder = { [TaskStatus.PENDING]: 1, [TaskStatus.IN_PROGRESS]: 2, [TaskStatus.COMPLETED]: 3 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredAndSortedTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: TaskFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-sm text-gray-600">
            {filteredAndSortedTasks.length} of {tasks.length} tasks
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
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
      {showFilters && (
        <TaskFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">Sort by:</span>
        {(['title', 'due_date', 'priority', 'created_at', 'status'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
              sortField === field
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
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {paginatedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Task Form Modal */}
      {showCreateForm && (
        <TaskForm
          onSubmit={(data) => {
            onCreateTask(data);
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Task"
        />
      )}
    </div>
  );
};