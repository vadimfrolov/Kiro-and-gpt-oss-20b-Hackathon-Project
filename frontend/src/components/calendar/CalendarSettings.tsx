import React from 'react';
import { Settings, Calendar, Clock, Users } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

interface CalendarSettingsProps {
  className?: string;
}

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({ className = '' }) => {
  const { 
    isCalendarConnected, 
    calendarSyncEnabled, 
    setCalendarSyncEnabled 
  } = useUIStore();

  const [settings, setSettings] = React.useState({
    autoSync: true,
    syncCompletedTasks: false,
    defaultDuration: 60,
    defaultReminder: 15,
    syncCategories: ['Work', 'Personal', 'Health'],
    calendarName: 'Ollama Todo Tasks'
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setSettings(prev => ({
      ...prev,
      syncCategories: prev.syncCategories.includes(category)
        ? prev.syncCategories.filter(c => c !== category)
        : [...prev.syncCategories, category]
    }));
  };

  const availableCategories = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Shopping', 'Other'];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="w-6 h-6 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Calendar Sync Settings</h3>
      </div>

      {!isCalendarConnected ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600 text-center">
            Connect your Google Calendar to configure sync settings.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>General Settings</span>
            </h4>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={calendarSyncEnabled}
                  onChange={(e) => setCalendarSyncEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Enable Calendar Sync</span>
                  <p className="text-sm text-gray-600">
                    Automatically sync tasks with due dates to your calendar
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                  disabled={!calendarSyncEnabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div>
                  <span className="font-medium text-gray-900">Auto-sync new tasks</span>
                  <p className="text-sm text-gray-600">
                    Automatically create calendar events for new tasks with due dates
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.syncCompletedTasks}
                  onChange={(e) => handleSettingChange('syncCompletedTasks', e.target.checked)}
                  disabled={!calendarSyncEnabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div>
                  <span className="font-medium text-gray-900">Sync completed tasks</span>
                  <p className="text-sm text-gray-600">
                    Keep calendar events for completed tasks (marked as completed)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Default Event Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Default Event Settings</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="defaultDuration" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Duration
                </label>
                <select
                  id="defaultDuration"
                  value={settings.defaultDuration}
                  onChange={(e) => handleSettingChange('defaultDuration', parseInt(e.target.value))}
                  disabled={!calendarSyncEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label htmlFor="defaultReminder" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Reminder
                </label>
                <select
                  id="defaultReminder"
                  value={settings.defaultReminder}
                  onChange={(e) => handleSettingChange('defaultReminder', parseInt(e.target.value))}
                  disabled={!calendarSyncEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                >
                  <option value={0}>No reminder</option>
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="calendarName" className="block text-sm font-medium text-gray-700 mb-1">
                Calendar Name
              </label>
              <input
                type="text"
                id="calendarName"
                value={settings.calendarName}
                onChange={(e) => handleSettingChange('calendarName', e.target.value)}
                disabled={!calendarSyncEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                placeholder="Calendar name for synced tasks"
              />
            </div>
          </div>

          {/* Category Sync Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Category Sync</span>
            </h4>
            
            <p className="text-sm text-gray-600 mb-3">
              Select which task categories should be synced to your calendar:
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableCategories.map((category) => (
                <label key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.syncCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    disabled={!calendarSyncEnabled}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              disabled={!calendarSyncEnabled}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};