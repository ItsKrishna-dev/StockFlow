import asyncio
import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def prepare_asyncpg_url(database_url: str) -> str:
    parsed = urlsplit(database_url)
    scheme = parsed.scheme
    if scheme == "postgresql+asyncpg":
        scheme = "postgresql"
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.pop("sslmode", None)
    query.pop("channel_binding", None)
    return urlunsplit(
        (
            scheme,
            parsed.netloc,
            parsed.path,
            urlencode(query),
            parsed.fragment,
        )
    )


async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is missing")
    connection_url = prepare_asyncpg_url(database_url)
    conn = await asyncpg.connect(connection_url, ssl="require", timeout=30)
    try:
        migration_sql = (BASE_DIR / "app" / "db" / "migrations" / "002_add_reorder_planning_fields.sql").read_text()
        print("Executing migration 002...")
        await conn.execute(migration_sql)
        print("Migration 002 executed successfully!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
