from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, DateTime

from app.database.db import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid4())
    )

    name = Column(
        String,
        nullable=False
    )

    path = Column(
        String,
        nullable=False
    )

    source_type = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        default="UPLOADED"
    )

    language = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )