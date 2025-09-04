import React from 'react';
import { Download, Calendar } from 'lucide-react';
import { Task } from '../../types/task';
import { downloadTaskAsICS, downloadMultipleTasksAsICS } from '../../utils/icsGenerator';
import { useNotifications } from '../../stores/useUIStore';

interface ICSDownloadButtonProps {
  task?: Task;
  tasks?: Task[];
  variant?: 'icon' | 'button' | 'menu-item';
  className?: string;
  children?: React.ReactNode;
}

export const ICSDownloadButton: React.FC<ICSDownloadButtonProps> = ({
  task,
  tasks,
  variant = 'icon',
  className = '',
  children
}) => {
  const { addNotification } = useNotifications();

  const handleDownload = () => {
    try {
      if (task) {
        // Download single task
        downloadTaskAsICS(task);
        addNotification({
          type: 'success',
          title: 'Calendar File Downloaded',
          message: `"${task.title}" has been downloaded as an .ics file`,
          duration: 3000
        });
      } else if (tasks && tasks.length > 0) {
        // Download multiple tasks
        downloadMultipleTasksAsICS(tasks);
        addNotification({
          type: 'success',
          title: 'Calendar File Downloaded',
          message: `${tasks.length} tasks have been downloaded as an .ics file`,
          duration: 3000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to generate calendar file. Please try again.',
        duration: 5000
      });
    }
  };

  const getButtonContent = () => {
    if (children) return children;
    
    switch (variant) {
      case 'icon':
        return <Download className="w-4 h-4" />;
      case 'button':
        return (
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download .ics</span>
          </div>
        );
      case 'menu-item':
        return (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Export to Calendar</span>
          </div>
        );
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    
    switch (variant) {
      case 'icon':
        return `p-1 text-gray-400 hover:text-blue-600 rounded ${baseClasses} ${className}`;
      case 'button':
        return `px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${baseClasses} ${className}`;
      case 'menu-item':
        return `w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 ${baseClasses} ${className}`;
      default:
        return `${baseClasses} ${className}`;
    }
  };

  // Don't render if no task or tasks provided
  if (!task && (!tasks || tasks.length === 0)) {
    return null;
  }

  return (
    <button
      onClick={handleDownload}
      className={getButtonClasses()}
      title={task ? `Download "${task.title}" as calendar file` : `Download ${tasks?.length} tasks as calendar file`}
    >
      {getButtonContent()}
    </button>
  );
};