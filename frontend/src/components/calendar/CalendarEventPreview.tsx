import React, { useState } from 'react';
import { Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Task } from '../../types/task';
import { format, parseISO } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

interface CalendarEventPreviewProps {
  task: Task;
  existingEvent?: CalendarEvent;
  onConfirm?: (task: Task) => void;
  onCancel?: () => void;
  className?: string;
}

export const CalendarEventPreview: React.FC<CalendarEventPreviewProps> = ({
  task,
  existingEvent,
  onConfirm,
  onCancel,
  className = ''
}) => {
  const [eventDetails, setEventDetails] = useState({
    duration: 60, // minutes
    location: '',
    description: task.description || '',
    reminders: [15] // minutes before
  });

  const hasConflict = !!existingEvent;
  const dueDate = task.due_date ? parseISO(task.due_date) : null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(task);
    }
  };

  if (!dueDate) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-yellow-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">No due date set</span>
        </div>
        <p className="text-yellow-700 text-sm mt-1">
          Please set a due date for this task to sync it with your calendar.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Calendar Event Preview</h3>
        {hasConflict && (
          <div className="flex items-center space-x-1 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Conflict Detected</span>
          </div>
        )}
      </div>

      {hasConflict && existingEvent && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-orange-900 mb-2">Existing Event Conflict</h4>
          <div className="text-sm text-orange-800">
            <p className="font-medium">{existingEvent.title}</p>
            <p>{format(parseISO(existingEvent.start), 'PPp')} - {format(parseISO(existingEvent.end), 'p')}</p>
            {existingEvent.location && (
              <p className="flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span>{existingEvent.location}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={task.title}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              value={eventDetails.duration}
              onChange={(e) => setEventDetails(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date & Time
          </label>
          <div className="flex items-center space-x-2 text-gray-700">
            <Clock className="w-4 h-4" />
            <span>{format(dueDate, 'PPP')} at {format(dueDate, 'p')}</span>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location (optional)
          </label>
          <input
            type="text"
            id="location"
            value={eventDetails.location}
            onChange={(e) => setEventDetails(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter event location"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={eventDetails.description}
            onChange={(e) => setEventDetails(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Event description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminders
          </label>
          <div className="space-y-2">
            {[5, 15, 30, 60].map((minutes) => (
              <label key={minutes} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={eventDetails.reminders.includes(minutes)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEventDetails(prev => ({
                        ...prev,
                        reminders: [...prev.reminders, minutes]
                      }));
                    } else {
                      setEventDetails(prev => ({
                        ...prev,
                        reminders: prev.reminders.filter(r => r !== minutes)
                      }));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {minutes} minutes before
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{hasConflict ? 'Create Anyway' : 'Create Event'}</span>
        </button>
      </div>
    </div>
  );
};