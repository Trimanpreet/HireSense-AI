import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker

URL = os.getenv("DATABASE_URL", "sqlite:///./hiresense.db")
engine = create_engine(URL, connect_args={"check_same_thread": False} if URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(200), nullable=False); company = Column(String(200), default="")
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list); preferred_skills = Column(JSON, default=list)
    min_experience = Column(Float, default=0); max_experience = Column(Float)
    education_level = Column(Integer); employment_type = Column(String(50), default="Full-time")
    location = Column(String(120), default=""); status = Column(String(20), default="open", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Candidate(Base):  # resume + candidate record (one resume per candidate)
    __tablename__ = "candidates"
    __table_args__ = (UniqueConstraint("owner_id", "job_id", "sha256"),)
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    name = Column(String(200)); email = Column(String(255)); phone = Column(String(50))
    skills = Column(JSON, default=list); roles = Column(JSON, default=list)
    experience_years = Column(Float); education_level = Column(Integer)
    text = Column(Text); filename = Column(String(255)); stored_name = Column(String(80)); sha256 = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow)

class ScreeningSession(Base):
    __tablename__ = "screening_sessions"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScreeningResult(Base):
    __tablename__ = "screening_results"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("screening_sessions.id"), index=True, nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    rank = Column(Integer); overall = Column(Float); detail = Column(JSON)
