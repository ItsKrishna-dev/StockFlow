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


async def seed() -> None:
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is missing from backend/.env")

    connection_url = prepare_asyncpg_url(database_url)

    connection = await asyncpg.connect(
        connection_url,
        ssl="require",
        timeout=30,
    )

    try:
        async with connection.transaction():
            await connection.execute(
                """
                INSERT INTO units_of_measure (name, code, uom_category, ratio_to_base)
                SELECT 'Pieces', 'PCS', 'unit', 1
                WHERE NOT EXISTS (
                    SELECT 1 FROM units_of_measure WHERE code = 'PCS'
                );

                INSERT INTO units_of_measure (name, code, uom_category, ratio_to_base)
                SELECT 'Kilogram', 'KG', 'weight', 1
                WHERE NOT EXISTS (
                    SELECT 1 FROM units_of_measure WHERE code = 'KG'
                );

                INSERT INTO warehouses (name, code, address)
                SELECT 'Main Warehouse', 'WH-MAIN', 'Demo address'
                WHERE NOT EXISTS (
                    SELECT 1 FROM warehouses WHERE code = 'WH-MAIN'
                );

                INSERT INTO locations (warehouse_id, name, code, type)
                SELECT w.id, 'Main Storage', 'LOC-MAIN', 'internal'
                FROM warehouses w
                WHERE w.code = 'WH-MAIN'
                  AND NOT EXISTS (
                      SELECT 1 FROM locations WHERE code = 'LOC-MAIN'
                  );

                INSERT INTO locations (warehouse_id, name, code, type)
                SELECT w.id, 'Production Floor', 'LOC-PROD', 'internal'
                FROM warehouses w
                WHERE w.code = 'WH-MAIN'
                  AND NOT EXISTS (
                      SELECT 1 FROM locations WHERE code = 'LOC-PROD'
                  );

                INSERT INTO locations (warehouse_id, name, code, type)
                SELECT NULL, 'Vendor Receipts', 'LOC-VENDOR', 'vendor'
                WHERE NOT EXISTS (
                    SELECT 1 FROM locations WHERE code = 'LOC-VENDOR'
                );

                INSERT INTO locations (warehouse_id, name, code, type)
                SELECT NULL, 'Customer Deliveries', 'LOC-CUSTOMER', 'customer'
                WHERE NOT EXISTS (
                    SELECT 1 FROM locations WHERE code = 'LOC-CUSTOMER'
                );

                INSERT INTO locations (warehouse_id, name, code, type)
                SELECT NULL, 'Adjustment Account', 'ADJ-VIRTUAL', 'virtual_adjustment'
                WHERE NOT EXISTS (
                    SELECT 1 FROM locations WHERE code = 'ADJ-VIRTUAL'
                );

                INSERT INTO partners (name, type, email)
                SELECT 'Demo Steel Supplier', 'vendor', 'supplier@example.com'
                WHERE NOT EXISTS (
                    SELECT 1 FROM partners
                    WHERE name = 'Demo Steel Supplier'
                );

                INSERT INTO partners (name, type, email)
                SELECT 'Demo Retail Customer', 'customer', 'customer@example.com'
                WHERE NOT EXISTS (
                    SELECT 1 FROM partners
                    WHERE name = 'Demo Retail Customer'
                );
                """
            )

        verification = await connection.fetch(
            """
            SELECT code, type, warehouse_id
            FROM locations
            ORDER BY type, code
            """
        )

        print("Seed completed successfully.")
        print("Locations:")
        for row in verification:
            print(
                f"- {row['code']} | "
                f"type={row['type']} | "
                f"warehouse_id={row['warehouse_id']}"
            )

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(seed())