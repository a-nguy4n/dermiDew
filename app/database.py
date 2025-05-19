import os
import time
from datetime import datetime, timedelta
import logging
import csv
from typing import Optional
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseConnectionError(Exception):
    """Custom exception for database connection failures."""
    pass


def get_db_connection(
    max_retries: int = 12,  # 12 retries = ~1 minute total (12 * 5 seconds)
    retry_delay: int = 5,   # 5 seconds between retries
) -> mysql.connector.MySQLConnection:
    """Create a database connection with a retry mechanism."""
    connection: Optional[mysql.connector.MySQLConnection] = None
    attempt = 1
    last_error = None

    while attempt <= max_retries:
        try:
            connection = mysql.connector.connect(
                host=os.getenv("MYSQL_HOST"),
                port=int(os.getenv("MYSQL_PORT")),
                user=os.getenv("MYSQL_USER"),
                password=os.getenv("MYSQL_PASSWORD"),
                database=os.getenv("MYSQL_DATABASE"),
                # ssl_ca=os.getenv("MYSQL_SSL_CA"),
                # ssl_verify_identity=True
            )
            # Test the connection
            connection.ping(reconnect=True, attempts=1, delay=0)
            logger.info("Database connection established successfully")
            return connection

        except Error as err:
            last_error = err
            logger.warning(
                f"Connection attempt {attempt}/{max_retries} failed: {err}. Retrying in {retry_delay} seconds..."
            )

            if connection is not None:
                try:
                    connection.close()
                except Exception:
                    pass

            if attempt == max_retries:
                break

            time.sleep(retry_delay)
            attempt += 1

    raise DatabaseConnectionError(
        f"Failed to connect to database after {max_retries} attempts. Last error: {last_error}"
    )


# --- Setup Functions --- #

async def setup_database(initial_users: dict = None):
    """
    Creates tables for users, sessions, devices, wardrobe, and sensor data.
    Inserts initial user data if provided.
    """
    connection = None
    cursor = None

    # Define table schemas for user and session management, plus devices and wardrobe.
    table_schemas = {
        "users": """
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "sessions": """
            CREATE TABLE sessions (
                id VARCHAR(36) PRIMARY KEY,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """,
        "skin_profiles": """
            CREATE TABLE skin_profiles (
                user_id INT PRIMARY KEY,
                skin_type VARCHAR(255),
                skin_tone VARCHAR(50),
                concerns TEXT,
                goals TEXT,
                allergies TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """

    }

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Drop tables in an order that respects foreign key constraints (child tables first)
        for table in ["skin_profiles", "sessions", "users"]:
            logger.info(f"Dropping table {table} if it exists...")
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
            connection.commit()

        # Create tables one by one
        for table_name, create_query in table_schemas.items():
            logger.info(f"Creating table {table_name}...")
            cursor.execute(create_query)
            connection.commit()
            logger.info(f"Table {table_name} created successfully")

        # Insert initial users if provided
        # Insert initial users if provided
        if initial_users:
            insert_query = "INSERT INTO users (email, password, first_name, last_name) VALUES (%s, %s, %s, %s)"
            for email, user_info in initial_users.items():
                password = user_info["password"]
                first_name = user_info["first_name"]
                last_name = user_info["last_name"]
                cursor.execute(insert_query, (email, password, first_name, last_name))
            connection.commit()
            logger.info(f"Inserted {len(initial_users)} initial users")

    except Exception as e:
        logger.error(f"Database setup failed: {e}")
        raise

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            logger.info("Database connection closed after setting up tables")


async def get_user_by_email(email: str) -> Optional[dict]:
    """Retrieve a user record from the database by email."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


async def get_user_by_id(user_id: int) -> Optional[dict]:
    """Retrieve a user record from the database by ID."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


async def create_session(user_id: int, session_id: str) -> bool:
    """Create a new session record for a user."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
        connection.commit()
        return True
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


async def get_session(session_id: str) -> Optional[dict]:
    """Retrieve a session record from the database by session ID."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


async def delete_session(session_id: str) -> bool:
    """Delete a session record from the database by session ID."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = %s", (session_id,))
        connection.commit()
        return True
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


async def create_user(email: str, password: str, first_name: str, last_name: str) -> bool:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = "INSERT INTO users (email, password, first_name, last_name) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (email, password, first_name, last_name))
        connection.commit()
        return True
    except Error as err:
        logger.error(f"Error inserting new user: {err}")
        return False
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

async def get_skin_profile(user_id: int) -> Optional[dict]:
    """Retrieve the skin profile for a given user."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM skin_profiles WHERE user_id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

async def upsert_skin_profile(user_id: int, skin_type: str, skin_tone: str, concerns: str, goals: str, allergies: str) -> None:
    """Insert or update the user's skin profile."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO skin_profiles (user_id, skin_type, skin_tone, concerns, goals, allergies)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                skin_type = VALUES(skin_type),
                skin_tone = VALUES(skin_tone),
                concerns = VALUES(concerns),
                goals = VALUES(goals),
                allergies = VALUES(allergies)
        """, (user_id, skin_type, skin_tone, concerns, goals, allergies))
        connection.commit()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

