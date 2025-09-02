# Google Calendar Integration Setup

This document explains how to set up and use the Google Calendar integration feature in the Ollama Todo App.

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud Project with the Calendar API enabled.
2. **OAuth2 Credentials**: You need to create OAuth2 credentials for a web application.

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (for development)
   - Add your production domain when deploying
5. Download the credentials JSON file

### 3. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from your downloaded credentials file.

## API Endpoints

### Authentication Endpoints

#### Get Authorization URL
```http
GET /calendar/auth-url?user_id=USER_ID
```

Returns an authorization URL that users need to visit to grant calendar access.

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/oauth/authorize?...",
  "message": "Please visit this URL to authorize Google Calendar access"
}
```

#### Handle OAuth Callback
```http
POST /calendar/auth-callback
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "state": "user_id"
}
```

Handles the OAuth callback from Google after user authorization.

**Response:**
```json
{
  "authenticated": true,
  "message": "Google Calendar authentication successful"
}
```

#### Check Authentication Status
```http
GET /calendar/auth-status?user_id=USER_ID
```

Checks if a user is authenticated with Google Calendar.

**Response:**
```json
{
  "authenticated": true,
  "message": "Authenticated"
}
```

#### Test Connection
```http
POST /calendar/test-connection?user_id=USER_ID
```

Tests the connection to Google Calendar API.

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar connection successful"
}
```

#### Revoke Access
```http
DELETE /calendar/revoke-access?user_id=USER_ID
```

Revokes Google Calendar access for a user.

**Response:**
```json
{
  "authenticated": false,
  "message": "Google Calendar access revoked successfully"
}
```

### Calendar Sync Endpoints

#### Sync Task to Calendar
```http
POST /calendar/sync-task?task_id=TASK_ID&user_id=USER_ID
```

Syncs a task to Google Calendar. The task must have a due date.

**Response:**
```json
{
  "success": true,
  "message": "Task synced to Google Calendar successfully",
  "calendar_event_id": "google_event_id"
}
```

#### Remove Task from Calendar
```http
DELETE /calendar/remove-task/TASK_ID?user_id=USER_ID
```

Removes a task from Google Calendar.

**Response:**
```json
{
  "success": true,
  "message": "Task removed from Google Calendar"
}
```

#### Get Calendar Events for Task
```http
GET /calendar/events/TASK_ID?user_id=USER_ID
```

Gets calendar events associated with a specific task.

**Response:**
```json
[
  {
    "id": "google_event_id",
    "summary": "Task Title",
    "description": "Task Description\n\nTask ID: 123",
    "start": "2023-12-01T10:00:00Z",
    "end": "2023-12-01T11:00:00Z",
    "task_id": 123
  }
]
```

## Usage Flow

### 1. User Authentication

1. Call `GET /calendar/auth-url?user_id=USER_ID` to get the authorization URL
2. Direct the user to visit the authorization URL
3. User grants permission and is redirected to your callback URL
4. Extract the `code` and `state` from the callback URL parameters
5. Call `POST /calendar/auth-callback` with the code and state
6. User is now authenticated for calendar access

### 2. Syncing Tasks

1. Ensure the user is authenticated (`GET /calendar/auth-status`)
2. Create or update a task with a due date
3. Call `POST /calendar/sync-task` to sync the task to Google Calendar
4. The task will be created as a calendar event
5. Updates to the task will automatically update the calendar event

### 3. Managing Calendar Events

- Tasks with due dates can be synced to calendar
- Calendar events are automatically updated when tasks are modified
- Calendar events are removed when tasks are deleted
- Users can manually remove tasks from calendar without deleting the task

## Error Handling

The API handles various error scenarios:

- **Authentication Required (401)**: User needs to re-authenticate
- **Permission Denied (403)**: Check calendar access permissions
- **Not Found (404)**: Calendar or event not found
- **Rate Limit (429)**: Too many requests, retry later
- **Offline Scenarios**: Calendar features gracefully degrade when Google Calendar is unavailable

## Security Considerations

- Credentials are stored securely in the `credentials/` directory
- Each user has separate credential files
- Refresh tokens are automatically managed
- Access can be revoked at any time
- All API calls require user identification

## Testing

Run the calendar integration tests:

```bash
# Test the calendar service
python -m pytest tests/test_calendar_service.py -v

# Test the calendar API endpoints
python -m pytest tests/test_calendar_api.py -v

# Test both
python -m pytest tests/test_calendar_service.py tests/test_calendar_api.py -v
```

## Troubleshooting

### Common Issues

1. **"Google Calendar credentials not configured"**
   - Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your environment

2. **"Authentication failed"**
   - Check that the redirect URI in Google Cloud Console matches your `GOOGLE_REDIRECT_URI`
   - Ensure the authorization code hasn't expired

3. **"Permission denied"**
   - Verify that the Google Calendar API is enabled in your Google Cloud Project
   - Check that the user has granted calendar access permissions

4. **"Calendar connection failed"**
   - Test the connection using the `/calendar/test-connection` endpoint
   - Check if the user needs to re-authenticate

### Debug Mode

Enable debug logging by setting `DEBUG=True` in your environment to see detailed error messages and API call logs.