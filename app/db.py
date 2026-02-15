import sqlite3
import os
import uuid
from flask import g

if os.getenv('FLASK_ENV') == 'production':
    DATABASE = '/home/pphyo/mysite/chat_history.db'
else:
    DATABASE = 'chat_history.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                model_id TEXT NOT NULL,
                custom_title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id)
            )
        ''')
        conn.commit()

def generate_short_uuid():
    return uuid.uuid4().hex[:16]

def create_session(model_id):
    conn = get_db()
    cursor = conn.cursor()
    session_id = generate_short_uuid()
    cursor.execute('INSERT INTO sessions (id, model_id) VALUES (?, ?)', (session_id, model_id))
    conn.commit()
    return session_id 

def add_message(session_id, role, content):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', (session_id, role, content))
    conn.commit()

def get_messages(session_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC', (session_id,))
    rows = cursor.fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in rows]

def get_all_sessions():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT
            s.id,
            s.model_id,
            s.created_at,
            COALESCE(s.custom_title, (SELECT content FROM messages m WHERE m.session_id = s.id AND m.role = 'user' ORDER BY m.id ASC LIMIT 1)) as title
        FROM sessions s
        WHERE title IS NOT NULL
        ORDER BY s.created_at DESC
    ''')

    rows = cursor.fetchall()

    return [{"id": row["id"], "model": row["model_id"], "date": row["created_at"], "title": row["title"]} for row in rows]

def delete_session(session_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
    cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
    conn.commit()

def update_session_title(session_id, new_title):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE sessions SET custom_title = ? WHERE id = ?', (new_title, session_id))
    conn.commit()