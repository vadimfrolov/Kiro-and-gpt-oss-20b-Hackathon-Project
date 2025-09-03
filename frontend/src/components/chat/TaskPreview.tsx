import React, { useState } from "react";
import { GeneratedTask, Priority } from "../../types";
import { format } from "date-fns";
import {
  Check,
  X,
  Calendar,
  Tag,
  AlertCircle,
  Plus,
  Edit2,
  Sparkles,
} from "lucide-react";

interface TaskPreviewProps {
  tasks: GeneratedTask[];
  onAcceptTasks: (tasks: GeneratedTask[]) => void;
  onRejectTasks: () => void;
  onAcceptSelected: (tasks: GeneratedTask[]) => void;
}

export const TaskPreview: React.FC<TaskPreviewProps> = ({
  tasks,
  onAcceptTasks,
  onRejectTasks,
  onAcceptSelected,
}) => {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(
    new Set(tasks.map((_, index) => index))
  );
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editedTasks, setEditedTasks] = useState<GeneratedTask[]>(tasks);

  const handleTaskToggle = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((_, index) => index)));
    }
  };

  const handleEditTask = (
    index: number,
    field: keyof GeneratedTask,
    value: any
  ) => {
    const newTasks = [...editedTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setEditedTasks(newTasks);
  };

  const handleAcceptSelected = () => {
    const tasksToAccept = Array.from(selectedTasks).map(
      (index) => editedTasks[index]
    );
    onAcceptSelected(tasksToAccept);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return "bg-red-100 text-red-800 border-red-200";
      case Priority.HIGH:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case Priority.MEDIUM:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case Priority.LOW:
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-blue-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={20} className="text-blue-600" />
            <h3 className="text-lg font-medium text-blue-900">
              AI Generated Tasks ({tasks.length})
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedTasks.size === tasks.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-sm text-blue-700">
              {selectedTasks.size} selected
            </span>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {editedTasks.map((task, index) => (
          <div
            key={index}
            className={`p-4 border-b border-gray-100 last:border-b-0 ${
              selectedTasks.has(index) ? "bg-blue-50" : "bg-white"
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Selection Checkbox */}
              <button
                onClick={() => handleTaskToggle(index)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                  selectedTasks.has(index)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 hover:border-blue-500"
                }`}
              >
                {selectedTasks.has(index) && <Check size={12} />}
              </button>

              <div className="flex-1 min-w-0">
                {/* Task Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(
                        task.suggested_priority
                      )}`}
                    >
                      {task.suggested_priority}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {task.suggested_category}
                    </span>
                    <span
                      className={`text-xs font-medium ${getConfidenceColor(
                        task.confidence_score
                      )}`}
                    >
                      {Math.round(task.confidence_score * 100)}% confidence
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingTask(editingTask === index ? null : index)
                    }
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* Task Content */}
                {editingTask === index ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) =>
                        handleEditTask(index, "title", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Task title..."
                    />
                    <textarea
                      value={task.description}
                      onChange={(e) =>
                        handleEditTask(index, "description", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Task description..."
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={task.suggested_priority}
                        onChange={(e) =>
                          handleEditTask(
                            index,
                            "suggested_priority",
                            e.target.value as Priority
                          )
                        }
                        className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={Priority.LOW}>Low</option>
                        <option value={Priority.MEDIUM}>Medium</option>
                        <option value={Priority.HIGH}>High</option>
                        <option value={Priority.URGENT}>Urgent</option>
                      </select>
                      <input
                        type="text"
                        value={task.suggested_category}
                        onChange={(e) =>
                          handleEditTask(
                            index,
                            "suggested_category",
                            e.target.value
                          )
                        }
                        className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Category..."
                      />
                    </div>
                    {task.suggested_due_date && (
                      <input
                        type="datetime-local"
                        value={task.suggested_due_date.slice(0, 16)}
                        onChange={(e) =>
                          handleEditTask(
                            index,
                            "suggested_due_date",
                            e.target.value
                              ? `${e.target.value}:00.000Z`
                              : undefined
                          )
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {task.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {task.description}
                    </p>

                    {task.suggested_due_date && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Calendar size={14} />
                        <span>
                          Due:{" "}
                          {format(
                            new Date(task.suggested_due_date),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <button
            onClick={onRejectTasks}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <X size={16} className="inline mr-1" />
            Reject All
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleAcceptSelected}
              disabled={selectedTasks.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} className="inline mr-1" />
              Add Selected ({selectedTasks.size})
            </button>

            <button
              onClick={() => onAcceptTasks(editedTasks)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Check size={16} className="inline mr-1" />
              Add All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
