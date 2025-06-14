import os
import time
from datetime import date, datetime, timedelta
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

    table_schemas = {
        "users": """
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_logins INT NOT NULL DEFAULT 0,
                last_login_date DATE NULL,
                current_streak INT NOT NULL DEFAULT 0
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
        """,
        "user_goals": """
            CREATE TABLE user_goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                goal_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
                goal_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """,
        "current_routine": """
            CREATE TABLE current_routine (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                morning_cleanser TEXT,
                morning_toner TEXT,
                morning_moisturizer TEXT,
                morning_sunscreen TEXT,
                night_cleanser TEXT,
                night_toner TEXT,
                night_serums TEXT,
                night_moisturizer TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """,
        "product_reviews": """
            CREATE TABLE product_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NULL,
                rating TINYINT NOT NULL,
                reaction TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """
    }

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        for table in ["product_reviews", "current_routine", "user_goals", "skin_profiles", "sessions", "users"]:
            logger.info(f"Dropping table {table} if it exists...")
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
            connection.commit()
   
        for table_name, create_query in table_schemas.items():
            logger.info(f"Creating table {table_name}...")
            cursor.execute(create_query)
            connection.commit()
            logger.info(f"Table {table_name} created successfully")

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

async def get_goals(user_id: int) -> dict:
    """Return all goals grouped by type."""
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, goal_type, goal_text FROM user_goals WHERE user_id = %s", (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    goals = {'daily': [], 'weekly': [], 'monthly': []}
    for row in rows:
        goals[row["goal_type"]].append({"id": row["id"], "text": row["goal_text"]})
    return goals

async def add_goal(user_id: int, goal_type: str, goal_text: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO user_goals (user_id, goal_type, goal_text) VALUES (%s, %s, %s)", (user_id, goal_type, goal_text))
    conn.commit()
    cur.close()
    conn.close()

async def delete_goal(goal_id: int, user_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM user_goals WHERE id = %s AND user_id = %s", (goal_id, user_id))
    conn.commit()
    cur.close()
    conn.close()

def record_login(user_id: int) -> None:
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            "SELECT last_login_date, current_streak, total_logins "
            "FROM users "
            "WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        if row is None:
            conn.rollback()
            return

        last_login = row["last_login_date"]  
        prev_streak = row["current_streak"] or 0
        prev_count = row["total_logins"] or 0

        today = date.today()
        
        if last_login is None:
            new_streak = 1
        elif last_login == today:
            new_streak = prev_streak
        elif last_login == (today - timedelta(days=1)):
            new_streak = prev_streak + 1
        else:
            new_streak = 1

        cur.execute(
            """
            UPDATE users
               SET total_logins    = %s,
                   current_streak  = %s,
                   last_login_date = %s
             WHERE id = %s
            """,
            (prev_count + 1, new_streak, today, user_id)
        )

        conn.commit()

    except Error as err:
        if conn:
            conn.rollback()
        print(f"[record_login] Database error: {err}")
    finally:
        if cur:
            cur.close()
        if conn and conn.is_connected():
            conn.close()


def get_login_metrics(user_id: int) -> dict:
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT total_logins, current_streak, last_login_date "
            "FROM users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {"total_logins": 0, "current_streak": 0, "last_login_date": None}
        return {
            "total_logins":    row["total_logins"] or 0,
            "current_streak":  row["current_streak"] or 0,
            "last_login_date": row["last_login_date"]
        }
    except Error as err:
        if cur:
            cur.close()
        if conn and conn.is_connected():
            conn.close()
        print(f"[get_login_metrics] Database error: {err}")
        return {"total_logins": 0, "current_streak": 0, "last_login_date": None}

async def get_current_routine(user_id: int) -> Optional[dict]:
    """
    Fetch the single current_routine row for this user (or None).
    """
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
               night_cleanser, night_toner, night_serums, night_moisturizer
          FROM current_routine
         WHERE user_id = %s
        """,
        (user_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row

async def upsert_current_routine(
    user_id: int,
    morning_cleanser: str,
    morning_toner: str,
    morning_moisturizer: str,
    morning_sunscreen: str,
    night_cleanser: str,
    night_toner: str,
    night_serums: str,
    night_moisturizer: str
) -> None:
    """
    Inserts a new row if none exists for this user, otherwise updates the existing one.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Check if a row already exists
    cur.execute("SELECT 1 FROM current_routine WHERE user_id = %s", (user_id,))
    exists = cur.fetchone() is not None

    if exists:
        # update the existing row
        cur.execute("""
            UPDATE current_routine
               SET morning_cleanser  = %s,
                   morning_toner     = %s,
                   morning_moisturizer = %s,
                   morning_sunscreen = %s,
                   night_cleanser    = %s,
                   night_toner       = %s,
                   night_serums      = %s,
                   night_moisturizer = %s
             WHERE user_id = %s
        """, (
            morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
            night_cleanser, night_toner, night_serums, night_moisturizer,
            user_id
        ))
    else:
        # insert a brand-new row
        cur.execute("""
            INSERT INTO current_routine
              (user_id,
               morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
               night_cleanser, night_toner, night_serums, night_moisturizer)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
            night_cleanser, night_toner, night_serums, night_moisturizer
        ))

    conn.commit()
    cur.close()
    conn.close()

async def add_product_review(
    user_id:      int,
    product_name: str,
    product_type: str,
    start_date:   str,            # ISO “YYYY-MM-DD”
    end_date:     Optional[str],  # ISO or None
    rating:       int,
    reaction:     str,
    notes:        str
) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO product_reviews
            (user_id, product_name, product_type, start_date, end_date, rating, reaction, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (user_id, product_name, product_type, start_date, end_date, rating, reaction, notes)
    )
    conn.commit()
    cur.close()
    conn.close()

async def get_product_reviews(user_id: int) -> list[dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
    """
    SELECT
      product_name   AS name,
      product_type   AS type,
      DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate,
      DATE_FORMAT(end_date,   '%Y-%m-%d') AS endDate,
      rating,
      reaction,
      notes
    FROM product_reviews
    WHERE user_id = %s
    ORDER BY created_at DESC
    """,
    (user_id,)
)

    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows
