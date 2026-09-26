"""
app/db/init_db.py

Database initialization and reset script for StockSense / StockFlow.
Applies schema.sql (v2) to the configured Neon / PostgreSQL database.

Usage:
    python app/db/init_db.py          # Safely applies schema; skips if already initialized
    python app/db/init_db.py --reset  # Drops public schema and re-applies schema from scratch
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

# Add backend directory to sys.path so app imports work when run directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.core.database import ASYNC_DATABASE_URL, CONNECT_ARGS


async def init_database(reset: bool = False, schema_path: Path | None = None) -> None:
    if schema_path is None:
        schema_path = Path(__file__).resolve().parent / "schema.sql"

    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found at: {schema_path}")

    dsn = ASYNC_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    print(f"[*] Connecting to database: {settings.ENVIRONMENT} environment...")
    conn = await asyncpg.connect(dsn, **CONNECT_ARGS)

    try:
        db_name = await conn.fetchval("SELECT current_database();")
        current_user = await conn.fetchval("SELECT current_user;")
        print(f"[OK] Connected to database: [{db_name}] as user [{current_user}]")

        # Check existing tables
        existing_tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE';
        """)

        if existing_tables and not reset:
            table_list = [r["table_name"] for r in existing_tables]
            print(f"\n[INFO] Database is ALREADY initialized with {len(table_list)} tables:")
            print(f"       {', '.join(table_list)}")
            print("\n[TIP] If you want to wipe and re-apply the schema from scratch, run:")
            print("      python app/db/init_db.py --reset\n")
            return

        if reset:
            print("\n[WARNING] --reset flag detected: Dropping and recreating 'public' schema...")
            await conn.execute(f"""
                DROP SCHEMA IF EXISTS public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO {current_user};
                GRANT ALL ON SCHEMA public TO public;
            """)
            print("[OK] Schema 'public' reset cleanly.")

        print(f"[+] Reading schema from: {schema_path}")
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        print("[*] Applying schema (extensions, types, tables, sequences, triggers, views)...")
        await conn.execute(schema_sql)
        print("[OK] Schema applied successfully!")

        # Verify created tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        table_names = [r["table_name"] for r in tables]

        views = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        view_names = [r["table_name"] for r in views]

        print("\n=== Database Objects Verified ===")
        print(f"  Tables ({len(table_names)}): {', '.join(table_names)}")
        print(f"  Views ({len(view_names)}): {', '.join(view_names)}")

        # Verify triggers
        triggers = await conn.fetch("""
            SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            ORDER BY event_object_table, trigger_name;
        """)
        print(f"  Triggers ({len(triggers)}):")
        for t in triggers:
            print(f"    - {t['trigger_name']} ON {t['event_object_table']}")

    finally:
        await conn.close()
        print("\n[*] Database connection closed.")


def main():
    parser = argparse.ArgumentParser(description="Initialize or reset StockSense database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop public schema and recreate everything from scratch",
    )
    args = parser.parse_args()

    try:
        asyncio.run(init_database(reset=args.reset))
        print("[SUCCESS] Operation completed.")
    except Exception as exc:
        print(f"\n[ERROR] Database initialization failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
