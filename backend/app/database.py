from typing import Generator
from sqlite3 import Connection as SQLite3Connection
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine
from app.config import settings

# SQLite configuration with thread-check disabled for FastAPI async workers
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, SQLite3Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def init_db() -> None:
    """Create all database tables based on registered SQLModel models."""
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    with Session(engine) as session:
        yield session
