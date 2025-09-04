import React, { useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useCalendarAuth } from '../../hooks/useCalendar';
import { useUIStore } from '../../stores/useUIStore';
import { useNotifications } from '../../stores/useUIStore';

interface CalendarSyncProps {
  className?: string;
}

export const CalendarSync: React.FC<CalendarSyncProps> = ({ className = '' }) => {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: 'http://localhost:3000/auth/callback'
  });

  const { isCalendarConnected, setCalendarConnected } = useUIStore();
  const { addNotification } = useNotifications();
  const calendarAuth = useCalendarAuth();

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await calendarAuth.mutateAsync(credentials);
      if (result.success) {
        setCalendarConnected(true);
        setShowAuthForm(false);
        addNotification({
          type: 'success',
          title: 'Calendar Connected',
          message: 'Successfully connected to Google Calendar',
          duration: 5000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Authentication Failed',
        message: 'Failed to connect to Google Calendar. Please check your credentials.',
        duration: 5000
      });
    }
  };

  const handleDisconnect = () => {
    setCalendarConnected(false);
    addNotification({
      type: 'info',
      title: 'Calendar Disconnected',
      message: 'Google Calendar has been disconnected',
      duration: 3000
    });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Google Calendar Integration</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {isCalendarConnected ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Connect your Google Calendar to automatically sync tasks with due dates as calendar events.
      </p>

      {!isCalendarConnected ? (
        <div className="space-y-4">
          {!showAuthForm ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to the Google Cloud Console</li>
                  <li>Create a new project or select an existing one</li>
                  <li>Enable the Google Calendar API</li>
                  <li>Create OAuth 2.0 credentials</li>
                  <li>Add http://localhost:3000/auth/callback as a redirect URI</li>
                </ol>
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Google Cloud Console</span>
                </a>
              </div>
              
              <button
                onClick={() => setShowAuthForm(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Google Calendar
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  id="client_id"
                  value={credentials.client_id}
                  onChange={(e) => setCredentials(prev => ({ ...prev, client_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Google OAuth Client ID"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  id="client_secret"
                  value={credentials.client_secret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Google OAuth Client Secret"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="redirect_uri" className="block text-sm font-medium text-gray-700 mb-1">
                  Redirect URI
                </label>
                <input
                  type="url"
                  id="redirect_uri"
                  value={credentials.redirect_uri}
                  onChange={(e) => setCredentials(prev => ({ ...prev, redirect_uri: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={calendarAuth.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {calendarAuth.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>Connect</span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowAuthForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Successfully connected to Google Calendar</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Tasks with due dates will automatically sync to your calendar.
            </p>
          </div>
          
          <button
            onClick={handleDisconnect}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Disconnect Calendar
          </button>
        </div>
      )}
    </div>
  );
};