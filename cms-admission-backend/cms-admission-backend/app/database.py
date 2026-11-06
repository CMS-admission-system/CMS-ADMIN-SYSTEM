import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

logger = logging.getLogger("admission.database")

_is_sqlite = settings.db_url.startswith("sqlite")
_connect_args = {}
if _is_sqlite:
    _connect_args["check_same_thread"] = False
elif "aivencloud.com" in settings.db_url or "tidbcloud.com" in settings.db_url or "ssl" in settings.DATABASE_URL.lower():
    _connect_args["ssl"] = {}

def _init_engine():
    target_url = settings.db_url
    target_connect_args = dict(_connect_args)
    if not _is_sqlite:
        try:
            test_engine = create_engine(target_url, connect_args=target_connect_args, pool_pre_ping=True)
            with test_engine.connect():
                pass
            return test_engine
        except Exception as exc:
            logger.warning(
                "Primary Cloud Database unavailable (%s). Resiliently falling back to local SQLite database (./admission.db).",
                exc,
            )
            return create_engine("sqlite:///./admission.db", connect_args={"check_same_thread": False})
    return create_engine(target_url, connect_args=target_connect_args, pool_pre_ping=True)

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
