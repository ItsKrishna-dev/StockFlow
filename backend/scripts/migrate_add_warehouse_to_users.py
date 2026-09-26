import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def migrate():
    async with AsyncSessionLocal() as db:
        print("Adding warehouse_id column to users table...")
        await db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_warehouse_id ON users(warehouse_id);
        """))
        await db.commit()
        print("Migration successful: warehouse_id added to users table!")

if __name__ == '__main__':
    asyncio.run(migrate())
