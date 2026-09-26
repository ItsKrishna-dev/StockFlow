import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def run_migration():
    async with AsyncSessionLocal() as session:
        print("Adding login_id column to users table...")
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id VARCHAR(50) UNIQUE;"))
        await session.execute(text("UPDATE users SET login_id = split_part(email, '@', 1) WHERE login_id IS NULL;"))
        await session.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
