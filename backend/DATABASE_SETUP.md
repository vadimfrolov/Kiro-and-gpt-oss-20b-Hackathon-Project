# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the Ollama Todo App.

## Prerequisites

1. **PostgreSQL Installation**: Ensure PostgreSQL is installed and running on your system.
   - macOS: `brew install postgresql` and `brew services start postgresql`
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from [PostgreSQL official website](https://www.postgresql.org/download/)

2. **Python Dependencies**: Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

## Database Configuration

### Environment Variables

Copy the `.env.example` file to `.env` and update the database configuration:

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ollama_todo
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ollama_todo
DATABASE_USER=username
DATABASE_PASSWORD=password
```

### Create Database

1. **Connect to PostgreSQL**:
   ```bash
   psql -U postgres
   ```

2. **Create Database and User**:
   ```sql
   CREATE DATABASE ollama_todo;
   CREATE USER username WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE ollama_todo TO username;
   \q
   ```

## Database Management

### Using Database Manager Script

The `scripts/db_manager.py` script provides various database operations:

```bash
# Check database connection
python3 scripts/db_manager.py check

# Create all tables
python3 scripts/db_manager.py create

# Drop all tables (WARNING: This will delete all data!)
python3 scripts/db_manager.py drop

# Reset database (drop and recreate all tables)
python3 scripts/db_manager.py reset
```

### Using Alembic Migrations

For production environments, use Alembic migrations:

```bash
# Run migrations to create/update database schema
python3 -m alembic upgrade head

# Create a new migration (after model changes)
python3 -m alembic revision --autogenerate -m "Description of changes"

# Downgrade to previous migration
python3 -m alembic downgrade -1
```

### Quick Setup Script

For development setup, use the initialization script:

```bash
python3 scripts/init_db.py
```

## Database Schema

### Tasks Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| title | VARCHAR(255) | Task title |
| description | TEXT | Task description |
| due_date | DATETIME | Task due date |
| priority | VARCHAR(20) | Task priority (LOW, MEDIUM, HIGH, URGENT) |
| category | VARCHAR(100) | Task category |
| status | VARCHAR(20) | Task status (PENDING, IN_PROGRESS, COMPLETED) |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |
| calendar_event_id | VARCHAR(255) | Google Calendar event ID |
| ai_generated | BOOLEAN | Whether task was AI-generated |

### Chat Messages Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| content | TEXT | Message content |
| role | VARCHAR(20) | Message role (USER, ASSISTANT) |
| timestamp | DATETIME | Message timestamp |
| generated_tasks | JSON | AI-generated tasks data |

## Connection Pooling

The application uses SQLAlchemy connection pooling with the following configuration:

- **Pool Size**: 10 connections
- **Max Overflow**: 20 additional connections
- **Pool Recycle**: 3600 seconds (1 hour)
- **Pre Ping**: Enabled for connection validation

## Troubleshooting

### Common Issues

1. **Connection Refused Error**:
   - Ensure PostgreSQL is running: `brew services start postgresql` (macOS)
   - Check if the port 5432 is available: `lsof -i :5432`

2. **Authentication Failed**:
   - Verify username and password in `.env` file
   - Check PostgreSQL user permissions

3. **Database Does Not Exist**:
   - Create the database using the SQL commands above
   - Verify database name in configuration

4. **Permission Denied**:
   - Grant proper privileges to the database user
   - Check PostgreSQL configuration files

### Logging

Enable database query logging by setting `DEBUG=true` in your `.env` file. This will show all SQL queries in the application logs.

### Backup and Restore

```bash
# Create backup
pg_dump -U username -h localhost ollama_todo > backup.sql

# Restore from backup
psql -U username -h localhost ollama_todo < backup.sql
```

## Development vs Production

### Development
- Use the database manager script for quick setup
- Enable debug logging
- Use connection pooling for better performance

### Production
- Use Alembic migrations for schema changes
- Disable debug logging
- Configure proper connection limits
- Set up regular backups
- Use environment-specific configuration files