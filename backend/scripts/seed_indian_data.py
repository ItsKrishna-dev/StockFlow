"""
backend/scripts/seed_indian_data.py

Cleans up previous demo / random seed data and populates the PostgreSQL database
with rich, authentic Indian inventory data:
- Major Indian logistics hubs (Bhiwandi, Manesar, Bengaluru)
- Authentic Indian enterprise vendors (Tata Steel, Havells, ITC Agri, Uflex, Jindal)
- Authentic Indian enterprise customers (Reliance Retail, DMart, Flipkart, Blinkit, L&T)
- Standard Indian units of measure (Pieces, Kilogram, Carton Box, Litre, Metre, Packet)
- Realistic Indian products (Tata Tiscon TMT, Havells Cable, Aashirvaad Atta, Daawat Basmati Rice, etc.)
- Automatic reorder rules and initial inventory quants
- Clean Indian staff user profiles
"""
import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.security import hash_password


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


async def clean_and_seed_indian_data() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is missing from backend/.env")

    conn_url = prepare_asyncpg_url(database_url)
    conn = await asyncpg.connect(conn_url, ssl="require", timeout=30)

    print("[*] Connected to Neon DB. Starting cleanup of previous random/demo data...")

    try:
        async with conn.transaction():
            # -----------------------------------------------------------
            # STEP 1: CLEAN UP OLD DEMO & RANDOM DUMMY DATA
            # -----------------------------------------------------------
            # 1. Clean up random test users and their related tokens
            await conn.execute(
                """
                DELETE FROM otp_tokens 
                WHERE user_id IN (
                    SELECT id FROM users 
                    WHERE email LIKE 'user_%@%' 
                       OR email LIKE 'login_%@%' 
                       OR email LIKE 'logout_%@%' 
                       OR email LIKE 'refresh_%@%'
                       OR email LIKE '%@stocksense.test'
                );

                DELETE FROM refresh_tokens 
                WHERE user_id IN (
                    SELECT id FROM users 
                    WHERE email LIKE 'user_%@%' 
                       OR email LIKE 'login_%@%' 
                       OR email LIKE 'logout_%@%' 
                       OR email LIKE 'refresh_%@%'
                       OR email LIKE '%@stocksense.test'
                );

                DELETE FROM users 
                WHERE email LIKE 'user_%@%' 
                   OR email LIKE 'login_%@%' 
                   OR email LIKE 'logout_%@%' 
                   OR email LIKE 'refresh_%@%'
                   OR email LIKE '%@stocksense.test';
                """
            )
            print("[+] Cleaned up temporary test users.")

            # 2. Clean up demo partners
            await conn.execute(
                """
                UPDATE stock_documents 
                SET partner_id = NULL 
                WHERE partner_id IN (
                    SELECT id FROM partners 
                    WHERE name IN ('Demo Steel Supplier', 'Demo Retail Customer')
                       OR name LIKE 'Partner %'
                );

                DELETE FROM partners 
                WHERE name IN ('Demo Steel Supplier', 'Demo Retail Customer')
                   OR name LIKE 'Partner %';
                """
            )
            print("[+] Cleaned up demo partners.")

            # 3. Clean up random dummy products
            await conn.execute(
                """
                ALTER TABLE stock_ledger DISABLE TRIGGER trg_ledger_no_delete;
                ALTER TABLE stock_ledger DISABLE TRIGGER trg_ledger_updates_quants;

                DELETE FROM stock_ledger 
                WHERE product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'SKU-%' 
                      AND sku NOT LIKE 'SKU-TATA-%'
                      AND sku NOT LIKE 'SKU-HAVELLS-%'
                      AND sku NOT LIKE 'SKU-AASHIRVAAD-%'
                      AND sku NOT LIKE 'SKU-DAAWAT-%'
                      AND sku NOT LIKE 'SKU-UFLEX-%'
                      AND sku NOT LIKE 'SKU-PHILIPS-%'
                      AND sku NOT LIKE 'SKU-KARAM-%'
                ) OR product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'RCV-%' 
                       OR sku LIKE 'TRF-%' 
                       OR sku LIKE 'ADJ-%' 
                       OR sku LIKE 'CNL-%' 
                       OR sku LIKE 'EXP-%' 
                       OR sku LIKE 'KPI-%'
                       OR sku LIKE 'RR-%'
                );

                ALTER TABLE stock_ledger ENABLE TRIGGER trg_ledger_no_delete;
                ALTER TABLE stock_ledger ENABLE TRIGGER trg_ledger_updates_quants;

                DELETE FROM stock_document_lines 
                WHERE product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'SKU-%' 
                      AND sku NOT LIKE 'SKU-TATA-%'
                      AND sku NOT LIKE 'SKU-HAVELLS-%'
                      AND sku NOT LIKE 'SKU-AASHIRVAAD-%'
                      AND sku NOT LIKE 'SKU-DAAWAT-%'
                      AND sku NOT LIKE 'SKU-UFLEX-%'
                      AND sku NOT LIKE 'SKU-PHILIPS-%'
                      AND sku NOT LIKE 'SKU-KARAM-%'
                ) OR product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'RCV-%' 
                       OR sku LIKE 'TRF-%' 
                       OR sku LIKE 'ADJ-%' 
                       OR sku LIKE 'CNL-%' 
                       OR sku LIKE 'EXP-%' 
                       OR sku LIKE 'KPI-%'
                       OR sku LIKE 'RR-%'
                );

                DELETE FROM stock_quants 
                WHERE product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'SKU-%' 
                      AND sku NOT LIKE 'SKU-TATA-%'
                      AND sku NOT LIKE 'SKU-HAVELLS-%'
                      AND sku NOT LIKE 'SKU-AASHIRVAAD-%'
                      AND sku NOT LIKE 'SKU-DAAWAT-%'
                      AND sku NOT LIKE 'SKU-UFLEX-%'
                      AND sku NOT LIKE 'SKU-PHILIPS-%'
                      AND sku NOT LIKE 'SKU-KARAM-%'
                ) OR product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'RCV-%' 
                       OR sku LIKE 'TRF-%' 
                       OR sku LIKE 'ADJ-%' 
                       OR sku LIKE 'CNL-%' 
                       OR sku LIKE 'EXP-%' 
                       OR sku LIKE 'KPI-%'
                       OR sku LIKE 'RR-%'
                );

                DELETE FROM reorder_rules 
                WHERE product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'SKU-%' 
                      AND sku NOT LIKE 'SKU-TATA-%'
                      AND sku NOT LIKE 'SKU-HAVELLS-%'
                      AND sku NOT LIKE 'SKU-AASHIRVAAD-%'
                      AND sku NOT LIKE 'SKU-DAAWAT-%'
                      AND sku NOT LIKE 'SKU-UFLEX-%'
                      AND sku NOT LIKE 'SKU-PHILIPS-%'
                      AND sku NOT LIKE 'SKU-KARAM-%'
                ) OR product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'RCV-%' 
                       OR sku LIKE 'TRF-%' 
                       OR sku LIKE 'ADJ-%' 
                       OR sku LIKE 'CNL-%' 
                       OR sku LIKE 'EXP-%' 
                       OR sku LIKE 'KPI-%'
                       OR sku LIKE 'RR-%'
                );

                DELETE FROM products 
                WHERE sku LIKE 'SKU-%' 
                  AND sku NOT LIKE 'SKU-TATA-%'
                  AND sku NOT LIKE 'SKU-HAVELLS-%'
                  AND sku NOT LIKE 'SKU-AASHIRVAAD-%'
                  AND sku NOT LIKE 'SKU-DAAWAT-%'
                  AND sku NOT LIKE 'SKU-UFLEX-%'
                  AND sku NOT LIKE 'SKU-PHILIPS-%'
                  AND sku NOT LIKE 'SKU-KARAM-%';

                DELETE FROM products 
                WHERE sku LIKE 'RCV-%' 
                   OR sku LIKE 'TRF-%' 
                   OR sku LIKE 'ADJ-%' 
                   OR sku LIKE 'CNL-%' 
                   OR sku LIKE 'EXP-%' 
                   OR sku LIKE 'KPI-%' 
                   OR sku LIKE 'RR-%';
                """
            )
            print("[+] Cleaned up random test products and documents.")

            # -----------------------------------------------------------
            # STEP 2: SEED INDIAN CONTEXT USERS
            # -----------------------------------------------------------
            pwd_admin = hash_password("Admin@123456")
            pwd_manager = hash_password("Manager@123456")
            pwd_staff = hash_password("Staff@123456")

            await conn.execute(
                """
                INSERT INTO users (email, password_hash, full_name, role, phone, is_active)
                VALUES 
                    ('vm0386376@gmail.com', $2, 'Vivek Maurya', 'inventory_manager', '+91 98765 43210', true),
                    ('admin@stocksense.io', $1, 'Vivek Sharma (System Admin)', 'admin', '+91 98200 11223', true),
                    ('aarav.patel@stocksense.io', $2, 'Aarav Patel (Operations Head)', 'inventory_manager', '+91 98110 33445', true),
                    ('rajesh.kumar@stocksense.io', $3, 'Rajesh Kumar (Inventory Executive)', 'warehouse_staff', '+91 98450 55667', true),
                    ('priya.nair@stocksense.io', $3, 'Priya Nair (Dispatch Lead)', 'warehouse_staff', '+91 98900 77889', true)
                ON CONFLICT (email) DO UPDATE 
                SET full_name = EXCLUDED.full_name,
                    password_hash = EXCLUDED.password_hash,
                    phone = EXCLUDED.phone;
                """,
                pwd_admin,
                pwd_manager,
                pwd_staff,
            )
            print("[+] Indian enterprise users seeded.")

            # -----------------------------------------------------------
            # STEP 3: SEED INDIAN UNITS OF MEASURE (UOMs)
            # -----------------------------------------------------------
            await conn.execute(
                """
                INSERT INTO units_of_measure (name, code, uom_category, ratio_to_base)
                VALUES 
                    ('Pieces', 'PCS', 'unit', 1.0),
                    ('Kilogram', 'KG', 'weight', 1.0),
                    ('Carton Box', 'BOX', 'unit', 1.0),
                    ('Litre', 'LTR', 'volume', 1.0),
                    ('Metre', 'MTR', 'length', 1.0),
                    ('Packet', 'PAC', 'unit', 1.0)
                ON CONFLICT (code) DO NOTHING;
                """
            )
            print("[+] Units of Measure seeded.")

            # -----------------------------------------------------------
            # STEP 4: SEED INDIAN LOGISTICS WAREHOUSES & LOCATIONS
            # -----------------------------------------------------------
            await conn.execute(
                """
                INSERT INTO warehouses (name, code, address, is_active)
                VALUES 
                    ('Bhiwandi Central Fulfillment Center', 'WH-MAIN', 'Building A-3, Indian Logistics Park, NH 160, Bhiwandi, Thane, Maharashtra 421302', true),
                    ('Delhi-NCR Distribution Hub', 'WH-NCR', 'Sector 8, IMT Manesar, Gurugram, Haryana 122051', true),
                    ('Bengaluru South Logistics Center', 'WH-BLR', 'KIADB Industrial Area, Phase 2, Electronic City, Bengaluru, Karnataka 560100', true)
                ON CONFLICT (code) DO UPDATE 
                SET name = EXCLUDED.name, address = EXCLUDED.address;
                """
            )

            wh_main_id = await conn.fetchval("SELECT id FROM warehouses WHERE code = 'WH-MAIN'")
            wh_ncr_id = await conn.fetchval("SELECT id FROM warehouses WHERE code = 'WH-NCR'")

            await conn.execute(
                """
                INSERT INTO locations (warehouse_id, name, code, type, is_active)
                VALUES 
                    ($1, 'Aisle A - General Inventory Rack', 'LOC-MAIN', 'internal', true),
                    ($1, 'Packaging & Processing Bay', 'LOC-PROD', 'internal', true),
                    ($1, 'Quality Inspection & Staging Area', 'LOC-QC', 'internal', true),
                    ($1, 'Cold Storage Unit', 'LOC-COLD', 'internal', true),
                    ($2, 'Manesar Inbound Pallet Rack', 'LOC-NCR-MAIN', 'internal', true),
                    (NULL, 'Incoming Vendor Goods Receiving', 'LOC-VENDOR', 'vendor', true),
                    (NULL, 'Outgoing Customer Dispatch Bay', 'LOC-CUSTOMER', 'customer', true),
                    (NULL, 'Inventory Adjustment & Audit Account', 'ADJ-VIRTUAL', 'virtual_adjustment', true)
                ON CONFLICT (code) DO UPDATE 
                SET name = EXCLUDED.name;
                """,
                wh_main_id,
                wh_ncr_id,
            )
            print("[+] Indian Warehouses and Storage Locations seeded.")

            # -----------------------------------------------------------
            # STEP 5: SEED PRODUCT CATEGORIES
            # -----------------------------------------------------------
            categories = [
                "Industrial Steel & Metal Hardware",
                "Electrical & Power Equipment",
                "FMCG & Packaged Groceries",
                "Industrial Corrugated Packaging",
                "Industrial Safety & PPE",
            ]
            for cat_name in categories:
                await conn.execute(
                    """
                    INSERT INTO product_categories (name)
                    SELECT $1::varchar
                    WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = $1::varchar);
                    """,
                    cat_name,
                )
            print("[+] Product Categories seeded.")

            # -----------------------------------------------------------
            # STEP 6: SEED REALISTIC INDIAN BUSINESS PARTNERS
            # -----------------------------------------------------------
            partners = [
                # Vendors (Suppliers)
                ("Tata Steel Ltd - Jamshedpur Works", "vendor", "supplies@tatasteel.com", "+91 657 6644000", "Bistupur Industrial Area, Jamshedpur, Jharkhand 831001"),
                ("Havells India Electricals Pvt Ltd", "vendor", "b2b.orders@havells.in", "+91 120 4771000", "QRG Towers, 2D, Expressway, Noida, Uttar Pradesh 201304"),
                ("ITC Agri-Business Division", "vendor", "commodities@itc.in", "+91 33 22889371", "Virginia House, 37 J.L. Nehru Road, Kolkata, West Bengal 700071"),
                ("Uflex Flexible Packaging Ltd", "vendor", "packaging@uflexltd.com", "+91 120 4012345", "A-107, Sector 60, Noida, Uttar Pradesh 201301"),
                ("Jindal Stainless Steel Ltd", "vendor", "sales@jindalstainless.com", "+91 11 41462000", "Jindal Centre, 12 Bhikaji Cama Place, New Delhi 110066"),
                # Customers (Modern Retailers & Distributors)
                ("Reliance Retail Logistics Ltd", "customer", "logistics@relianceretail.com", "+91 22 35553800", "Reliance Corporate Park, Ghansoli, Navi Mumbai 400701"),
                ("Avenue Supermarts Ltd (DMart)", "customer", "b2b_orders@dmartindia.com", "+91 22 71230700", "B-72, Wagle Industrial Estate, Thane, Maharashtra 400604"),
                ("Flipkart Wholesale Private Limited", "customer", "enterprise@flipkart.com", "+91 80 46604000", "Embassy Tech Village, Outer Ring Road, Bengaluru 560103"),
                ("Blinkit Quick Commerce Warehouses", "customer", "hub.ops@blinkit.com", "+91 124 4172000", "Udyog Vihar Phase 4, Gurugram, Haryana 122016"),
                ("Larsen & Toubro Construction Projects", "customer", "materials@lntecc.com", "+91 44 22526000", "Mount Poonamallee Road, Manapakkam, Chennai 600089"),
            ]
            for p_name, p_type, p_email, p_phone, p_addr in partners:
                await conn.execute(
                    """
                    INSERT INTO partners (name, type, email, phone, address, is_active)
                    SELECT $1::varchar, $2::partner_type, $3::varchar, $4::varchar, $5::text, true
                    WHERE NOT EXISTS (SELECT 1 FROM partners WHERE name = $1::varchar);
                    """,
                    p_name,
                    p_type,
                    p_email,
                    p_phone,
                    p_addr,
                )
            print("[+] Indian Business Partners seeded.")

            # -----------------------------------------------------------
            # STEP 7: SEED REALISTIC INDIAN PRODUCTS
            # -----------------------------------------------------------
            uom_kg_id = await conn.fetchval("SELECT id FROM units_of_measure WHERE code = 'KG'")
            uom_pcs_id = await conn.fetchval("SELECT id FROM units_of_measure WHERE code = 'PCS'")
            cat_steel_id = await conn.fetchval("SELECT id FROM product_categories WHERE name LIKE '%Steel%'")
            cat_elec_id = await conn.fetchval("SELECT id FROM product_categories WHERE name LIKE '%Electrical%'")
            cat_fmcg_id = await conn.fetchval("SELECT id FROM product_categories WHERE name LIKE '%FMCG%'")
            cat_pack_id = await conn.fetchval("SELECT id FROM product_categories WHERE name LIKE '%Packaging%'")
            cat_safe_id = await conn.fetchval("SELECT id FROM product_categories WHERE name LIKE '%Safety%'")

            products = [
                ("SKU-TATA-TMT-12MM", "Tata Tiscon 550D TMT Rebar (12mm)", "High strength corrosion-resistant thermo-mechanically treated steel rebar for construction.", cat_steel_id, uom_kg_id, "8901234001012"),
                ("SKU-HAVELLS-CABLE-25", "Havells LifeLine Plus 2.5 sq mm Single Core FR Cable (90m Red)", "Flame retardant copper wire for industrial and residential electrical installations.", cat_elec_id, uom_pcs_id, "8901234002025"),
                ("SKU-AASHIRVAAD-ATTA-10K", "Aashirvaad Superior Shuddh Chakki Whole Wheat Atta (10kg)", "100% whole wheat flour hygienically packed for bulk food distribution.", cat_fmcg_id, uom_kg_id, "8901234003010"),
                ("SKU-DAAWAT-RICE-25K", "Daawat Rozana Gold Basmati Rice (25kg Sack)", "Long grain aromatic basmati rice for commercial kitchens and retail chains.", cat_fmcg_id, uom_kg_id, "8901234003025"),
                ("SKU-UFLEX-BOX-5PLY", "Uflex Heavy-Duty 5-Ply Corrugated Shipping Box (45x30x30 cm)", "High crush resistance corrugated carton box designed for logistics shipments.", cat_pack_id, uom_pcs_id, "8901234004050"),
                ("SKU-PHILIPS-LED-18W", "Philips Stellar Bright 18W Round LED Downlight Panel", "Energy-efficient commercial ceiling recessed LED panel light (Cool Day White).", cat_elec_id, uom_pcs_id, "8901234005018"),
                ("SKU-KARAM-HELMET-YEL", "Karam Industrial Safety Hard Hat Helmet (Yellow)", "ISI certified high-density polymer safety helmet with adjustable chin strap.", cat_safe_id, uom_pcs_id, "8901234007001"),
            ]

            for sku, name, desc, cat_id, u_id, barcode in products:
                await conn.execute(
                    """
                    INSERT INTO products (sku, name, description, category_id, uom_id, barcode, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, true)
                    ON CONFLICT (sku) DO UPDATE 
                    SET name = EXCLUDED.name, description = EXCLUDED.description, barcode = EXCLUDED.barcode;
                    """,
                    sku,
                    name,
                    desc,
                    cat_id,
                    u_id,
                    barcode,
                )
            print("[+] Indian Products seeded.")

            # -----------------------------------------------------------
            # STEP 8: REORDER RULES & INITIAL LIVE STOCK QUANTS
            # -----------------------------------------------------------
            loc_main_id = await conn.fetchval("SELECT id FROM locations WHERE code = 'LOC-MAIN'")
            
            reorder_configs = [
                ("SKU-TATA-TMT-12MM", 500.0, 5000.0, 2000.0, 1850.0),
                ("SKU-HAVELLS-CABLE-25", 50.0, 500.0, 150.0, 120.0),
                ("SKU-AASHIRVAAD-ATTA-10K", 100.0, 1000.0, 400.0, 420.0),
                ("SKU-DAAWAT-RICE-25K", 80.0, 800.0, 300.0, 75.0), # below min_qty -> will trigger low stock alert!
                ("SKU-UFLEX-BOX-5PLY", 200.0, 2000.0, 600.0, 850.0),
                ("SKU-PHILIPS-LED-18W", 40.0, 400.0, 100.0, 0.0),   # 0 stock -> will trigger out-of-stock alert!
                ("SKU-KARAM-HELMET-YEL", 30.0, 300.0, 100.0, 95.0),
            ]

            for sku, min_q, max_q, reorder_q, init_stock in reorder_configs:
                p_id = await conn.fetchval("SELECT id FROM products WHERE sku = $1", sku)
                if p_id:
                    # Reorder rule
                    await conn.execute(
                        """
                        INSERT INTO reorder_rules (product_id, warehouse_id, min_qty, max_qty, reorder_qty, is_active)
                        VALUES ($1, $2, $3, $4, $5, true)
                        ON CONFLICT (product_id, warehouse_id) DO UPDATE 
                        SET min_qty = EXCLUDED.min_qty, max_qty = EXCLUDED.max_qty, reorder_qty = EXCLUDED.reorder_qty;
                        """,
                        p_id,
                        wh_main_id,
                        min_q,
                        max_q,
                        reorder_q,
                    )

                    # Initial stock quant in LOC-MAIN
                    await conn.execute(
                        """
                        INSERT INTO stock_quants (product_id, location_id, quantity, reserved_qty)
                        VALUES ($1, $2, $3, 0.0)
                        ON CONFLICT (product_id, location_id) DO UPDATE 
                        SET quantity = EXCLUDED.quantity;
                        """,
                        p_id,
                        loc_main_id,
                        init_stock,
                    )

            print("[+] Indian Reorder Rules & Live Stock Quants seeded.")

        print("\n" + "=" * 65)
        print(" [SUCCESS] Cleanup & Indian Context Database Seeding Completed!")
        print("=" * 65)
        print("Warehouses:")
        print("  - WH-MAIN : Bhiwandi Central Fulfillment Center (Maharashtra)")
        print("  - WH-NCR  : Delhi-NCR Distribution Hub (Manesar, Haryana)")
        print("  - WH-BLR  : Bengaluru South Logistics Center (Electronic City, Karnataka)")
        print("\nKey Indian Enterprises:")
        print("  - Suppliers: Tata Steel, Havells India, ITC Agri, Uflex, Jindal")
        print("  - Customers: Reliance Retail, DMart, Flipkart Wholesale, Blinkit, L&T")
        print("\nReal Products & Inventory:")
        print("  - Tata Tiscon 550D TMT Rebar (12mm)     | 1,850 KG in stock")
        print("  - Havells LifeLine Plus 2.5 sq mm Cable | 120 Coils in stock")
        print("  - Aashirvaad Chakki Atta (10kg)         | 420 Bags in stock")
        print("  - Daawat Rozana Gold Basmati Rice (25kg)| 75 Bags (Low Stock Alert!)")
        print("  - Philips 18W Round LED Downlight Panel | 0 Units (Out of Stock Alert!)")
        print("\nStaff Logins (Ready for demo & login):")
        print("  - Vivek   : vm0386376@gmail.com / Manager@123456 (Role: inventory_manager)")
        print("  - Admin   : admin@stocksense.io / Admin@123456 (Role: admin)")
        print("  - Manager : aarav.patel@stocksense.io / Manager@123456")
        print("  - Staff   : rajesh.kumar@stocksense.io / Staff@123456")
        print("=" * 65 + "\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(clean_and_seed_indian_data())
