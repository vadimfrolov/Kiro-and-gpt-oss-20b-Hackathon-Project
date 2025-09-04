import React, { useState } from 'react';
import { Calendar, Settings, X } from 'lucide-react';
import { CalendarSync } from './CalendarSync';
import { CalendarSettings } from './CalendarSettings';
import { useUIStore } from '../../stores/useUIStore';

interface CalendarIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'settings'>('sync');
  const { isCalendarConnected } = useUIStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Calendar Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'sync'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Connection</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            disabled={!isCalendarConnected}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'sync' ? (
            <CalendarSync />
          ) : (
            <CalendarSettings />
          )}
        </div>
      </div>
    </div>
  );
};