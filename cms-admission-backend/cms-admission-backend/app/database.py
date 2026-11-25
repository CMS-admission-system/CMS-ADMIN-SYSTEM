from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_is_sqlite = settings.db_url.startswith("sqlite")
_connect_args = {}
if _is_sqlite:
    _connect_args["check_same_thread"] = False
elif "aivencloud.com" in settings.db_url or "tidbcloud.com" in settings.db_url:
    _connect_args["ssl"] = {}


def _init_engine():
    target_url = settings.db_url
    try:
        target_engine = create_engine(
            target_url,
            connect_args=dict(_connect_args),
            pool_pre_ping=True,
        )
        if not _is_sqlite:
            with target_engine.connect():
                pass
        return target_engine
    except Exception as e:
        import sys
        print(f"Primary Cloud Database unavailable ({e}). Resiliently falling back to local SQLite database (./admission.db).", file=sys.stderr)
        return create_engine(
            "sqlite:///./admission.db",
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )


engine = _init_engine()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
