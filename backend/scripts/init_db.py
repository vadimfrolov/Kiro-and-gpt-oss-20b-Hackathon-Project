#!/usr/bin/env python3
"""
Database initialization script.

This script creates the database tables and runs any pending migrations.
"""
import logging
import sys
import os

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.core.database import create_database, check_database_connection
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize the database with tables and data."""
    logger.info("Starting database initialization...")
    
    # Check database connection
    if not check_database_connection():
        logger.error("Cannot connect to database. Please ensure PostgreSQL is running.")
        logger.error(f"Database URL: {settings.DATABASE_URL}")
        return False
    
    try:
        # Create all tables
        create_database()
        logger.info("Database tables created successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False


if __name__ == "__main__":
    success = init_database()
    if not success:
        sys.exit(1)
    
    logger.info("Database initialization completed successfully!")