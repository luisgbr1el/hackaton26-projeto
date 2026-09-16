import os
import sqlite3
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "reports.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                filename TEXT NOT NULL,
                user_prompt TEXT,
                total_orders INTEGER NOT NULL,
                total_weight_kg REAL NOT NULL,
                total_distance_km REAL NOT NULL,
                manifest_markdown TEXT NOT NULL,
                routes_json TEXT NOT NULL,
                vehicles_used TEXT NOT NULL
            );
        """)
        conn.commit()


def save_report(
    filename: str,
    user_prompt: Optional[str],
    total_orders: int,
    total_weight_kg: float,
    total_distance_km: float,
    manifest_markdown: str,
    routes_json: str,
    vehicles_used: str,
) -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO reports (
                filename,
                user_prompt,
                total_orders,
                total_weight_kg,
                total_distance_km,
                manifest_markdown,
                routes_json,
                vehicles_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            filename,
            user_prompt or "",
            total_orders,
            round(total_weight_kg, 2),
            round(total_distance_km, 2),
            manifest_markdown,
            routes_json,
            vehicles_used,
        ))
        conn.commit()
        return cursor.lastrowid


def list_reports(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, created_at, filename, user_prompt, total_orders,
                   total_weight_kg, total_distance_km, vehicles_used
            FROM reports
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_report_by_id(report_id: int) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM reports WHERE id = ?
        """, (report_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_report(report_id: int) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        conn.commit()
        return cursor.rowcount > 0
