import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import argparse
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def create_admin(name: str, email: str, phone: str, password: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where((User.email == email) | (User.phone == phone))
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise SystemExit("A user with this email or phone already exists.")

        admin = User(
            name=name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            role="ADMIN",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created successfully. User ID: {admin.id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Salon Management admin user")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    asyncio.run(create_admin(args.name, args.email, args.phone, args.password))
