from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_is_sqlite = settings.db_url.startswith("sqlite")
_connect_args = {}
if _is_sqlite:
    _connect_args["check_same_thread"] = False
elif "aivencloud.com" in settings.db_url or "tidbcloud.com" in settings.db_url or "ssl" in settings.DATABASE_URL.lower():
    _connect_args["ssl"] = {}

engine = create_engine(
    settings.db_url,
    connect_args=_connect_args,
    pool_pre_ping=True,  # cloud DBs (Neon/Supabase/Aiven) drop idle connections otherwise
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
