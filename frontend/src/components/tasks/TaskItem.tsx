import React, { useState } from 'react';
import { Task, TaskUpdate, Priority, TaskStatus } from '../../types';
import { format } from 'date-fns';
import { 
  Edit2, 
  Trash2, 
  Check, 
  Calendar, 
  Tag, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { CalendarSyncStatus, ICSDownloadButton } from '../calendar';

interface TaskItemProps {
  task: Task;
  onUpdate: (id: number, updates: TaskUpdate) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onUpdate,
  onDelete,
  onToggleComplete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case Priority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case Priority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 size={16} className="text-green-600" />;
      case TaskStatus.IN_PROGRESS:
        return <Clock size={16} className="text-blue-600" />;
      case TaskStatus.PENDING:
        return <AlertCircle size={16} className="text-gray-400" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== TaskStatus.COMPLETED;

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Task Header */}
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => onToggleComplete(task.id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                task.status === TaskStatus.COMPLETED
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 hover:border-green-500'
              }`}
            >
              {task.status === TaskStatus.COMPLETED && <Check size={12} />}
            </button>
            
            {getStatusIcon(task.status)}
            
            <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            
            {task.ai_generated && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                AI
              </span>
            )}
          </div>

          {/* Task Content */}
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task description..."
                rows={2}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className={`font-medium ${
                task.status === TaskStatus.COMPLETED ? 'line-through text-gray-500' : 'text-gray-900'
              }`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-sm mt-1 ${
                  task.status === TaskStatus.COMPLETED ? 'line-through text-gray-400' : 'text-gray-600'
                }`}>
                  {task.description}
                </p>
              )}
            </div>
          )}

          {/* Task Metadata */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {task.due_date && (
              <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : ''}`}>
                <Calendar size={14} />
                <span>
                  {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
            
            {task.category && (
              <div className="flex items-center space-x-1">
                <Tag size={14} />
                <span>{task.category}</span>
              </div>
            )}
            
            <CalendarSyncStatus task={task} showControls={true} />
            
            <div className="text-xs">
              Created {format(new Date(task.created_at), 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center space-x-2 ml-4">
            <ICSDownloadButton 
              task={task} 
              variant="icon"
              title="Download as calendar file (.ics)"
            />
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit task"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};