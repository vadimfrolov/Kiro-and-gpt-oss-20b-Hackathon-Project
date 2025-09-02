#!/usr/bin/env python3
"""
Database management utility script.

This script provides various database management operations.
"""
import argparse
import logging
import sys
import os

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.core.database import (
    create_database, 
    check_database_connection, 
    close_database_connections,
    engine
)
from app.core.config import settings
from app.models.database import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_tables():
    """Create all database tables."""
    logger.info("Creating database tables...")
    try:
        create_database()
        logger.info("Database tables created successfully!")
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False


def drop_tables():
    """Drop all database tables."""
    logger.info("Dropping all database tables...")
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("All tables dropped successfully!")
        return True
    except Exception as e:
        logger.error(f"Error dropping tables: {e}")
        return False


def reset_database():
    """Reset the database by dropping and recreating all tables."""
    logger.info("Resetting database...")
    
    if not check_database_connection():
        logger.error("Cannot connect to database.")
        return False
    
    # Drop all tables
    if not drop_tables():
        return False
    
    # Create all tables
    if not create_tables():
        return False
    
    logger.info("Database reset completed successfully!")
    return True


def check_connection():
    """Check database connection."""
    logger.info("Checking database connection...")
    
    if check_database_connection():
        logger.info("Database connection successful!")
        logger.info(f"Connected to: {settings.DATABASE_URL}")
        return True
    else:
        logger.error("Database connection failed!")
        logger.error(f"Database URL: {settings.DATABASE_URL}")
        return False


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description="Database management utility")
    parser.add_argument(
        "command",
        choices=["create", "drop", "reset", "check"],
        help="Database operation to perform"
    )
    
    args = parser.parse_args()
    
    try:
        if args.command == "create":
            success = create_tables()
        elif args.command == "drop":
            success = drop_tables()
        elif args.command == "reset":
            success = reset_database()
        elif args.command == "check":
            success = check_connection()
        else:
            logger.error(f"Unknown command: {args.command}")
            success = False
        
        if not success:
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        close_database_connections()


if __name__ == "__main__":
    main()