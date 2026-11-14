import csv
import hashlib
import hmac
import io
import logging
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import func

from .db import *
from .ml import engine as ml

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

load_dotenv()

SECRET = os.getenv("SECRET_KEY", "dev-secret-change-me")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_BYTES = 5 * 1024 * 1024

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hiresense")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HireSense AI", version="1.0")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    schema_name = "Body_upload_api_jobs__jid__resumes_post"

    upload_schema = (
        openapi_schema.get("components", {}).get("schemas", {}).get(schema_name)
    )

    if upload_schema:
        files_schema = upload_schema.get("properties", {}).get("files")

        if files_schema:
            files_schema["items"] = {
                "type": "string",
                "format": "binary",
            }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------
# Database dependency
# ---------------------------------------------------------------------


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------
# Authentication helpers
# ---------------------------------------------------------------------


def normalize_email(email: str) -> str:
    """Normalize email consistently during registration and login."""
    return email.strip().lower()


def hash_pw(password: str, salt: Optional[str] = None) -> str:
    """Return salt$hash using PBKDF2-HMAC-SHA256."""
    if salt is None:
        salt = os.urandom(16).hex()

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        200_000,
    ).hex()

    return f"{salt}${password_hash}"


def check_pw(password: str, stored: str) -> bool:
    """Safely verify a password stored in salt$hash format."""
    if not stored or "$" not in stored:
        return False

    salt, saved_hash = stored.split("$", 1)

    if not salt or not saved_hash:
        return False

    calculated_hash = hash_pw(password, salt).split("$", 1)[1]

    return hmac.compare_digest(calculated_hash, saved_hash)


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=12)

    payload = {"sub": str(user_id), "exp": expires_at}

    return jwt.encode(payload, SECRET, algorithm="HS256")


def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db=Depends(get_db),
):
    if cred is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            cred.credentials,
            SECRET,
            algorithms=["HS256"],
        )

        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ---------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------


class RegisterIn(BaseModel):
    email: str = Field(
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        min_length=5,
        max_length=254,
    )

    name: str = Field(min_length=1, max_length=120)

    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=254)

    password: str = Field(min_length=1, max_length=128)


class JobIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    company: str = ""

    description: str = Field(min_length=10)

    required_skills: List[str] = Field(default_factory=list)

    preferred_skills: List[str] = Field(default_factory=list)

    min_experience: float = Field(default=0, ge=0)

    max_experience: Optional[float] = None

    education: Optional[str] = None

    employment_type: str = "Full-time"

    location: str = ""

    status: str = "open"


# ---------------------------------------------------------------------
# Shared job helpers
# ---------------------------------------------------------------------


def job_dict(job):
    return {column.name: getattr(job, column.name) for column in Job.__table__.columns}


def owned_job(db, user, job_id: int):
    job = db.get(Job, job_id)

    if job is None or job.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


def apply_job(job, data: JobIn):

    fields = (
        "title",
        "company",
        "description",
        "min_experience",
        "max_experience",
        "employment_type",
        "location",
        "status",
    )

    for field_name in fields:
        setattr(job, field_name, getattr(data, field_name))

    job.required_skills = data.required_skills or ml.extract_skills(data.description)

    job.preferred_skills = data.preferred_skills

    job.education_level = ml.education_level(data.education or data.description)


# ---------------------------------------------------------------------
# Authentication routes
# ---------------------------------------------------------------------


@app.post("/api/auth/register", status_code=201)
def register(data: RegisterIn, db=Depends(get_db)):

    email = normalize_email(data.email)

    existing_user = db.query(User).filter_by(email=email).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    user = User(
        email=email,
        name=data.name.strip(),
        password_hash=hash_pw(data.password),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()

        log.exception("User registration failed")

        raise HTTPException(
            status_code=500,
            detail="Could not create account",
        )

    return {
        "message": "registered",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/api/auth/login")
def login(data: LoginIn, db=Depends(get_db)):

    email = normalize_email(data.email)

    user = db.query(User).filter_by(email=email).first()

    if user is None or not check_pw(data.password, user.password_hash):

        log.warning("Login rejected for email: %s", email)

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.get("/api/users/me")
def me(user=Depends(current_user)):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


# ---------------------------------------------------------------------
# Job routes
# ---------------------------------------------------------------------


@app.post("/api/jobs", status_code=201)
def create_job(
    data: JobIn,
    user=Depends(current_user),
    db=Depends(get_db),
):

    job = Job(owner_id=user.id)

    apply_job(job, data)

    db.add(job)
    db.commit()
    db.refresh(job)

    return job_dict(job)


@app.get("/api/jobs")
def list_jobs(
    q: str = "",
    status: str = "",
    user=Depends(current_user),
    db=Depends(get_db),
):

    query = db.query(Job).filter_by(owner_id=user.id)

    if q:
        query = query.filter(Job.title.ilike(f"%{q}%"))

    if status:
        query = query.filter_by(status=status)

    jobs = query.order_by(Job.id.desc()).all()

    return [job_dict(job) for job in jobs]


@app.get("/api/jobs/{jid}")
def get_job(
    jid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    return job_dict(owned_job(db, user, jid))


@app.put("/api/jobs/{jid}")
def update_job(
    jid: int,
    data: JobIn,
    user=Depends(current_user),
    db=Depends(get_db),
):

    job = owned_job(db, user, jid)

    apply_job(job, data)

    db.commit()
    db.refresh(job)

    return job_dict(job)


@app.delete("/api/jobs/{jid}", status_code=204)
def delete_job(
    jid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    job = owned_job(db, user, jid)

    for candidate in db.query(Candidate).filter_by(job_id=jid).all():

        remove_candidate(db, candidate)

    sessions = db.query(ScreeningSession).filter_by(job_id=jid).all()

    for session in sessions:

        db.query(ScreeningResult).filter_by(session_id=session.id).delete()

        db.delete(session)

    db.delete(job)
    db.commit()

    return Response(status_code=204)


# ---------------------------------------------------------------------
# Candidate and resume helpers/routes
# ---------------------------------------------------------------------


def remove_candidate(db, candidate):

    file_path = os.path.join(UPLOAD_DIR, candidate.stored_name)

    try:
        os.remove(file_path)

    except OSError:
        pass

    db.query(ScreeningResult).filter_by(candidate_id=candidate.id).delete()

    db.delete(candidate)


@app.post("/api/jobs/{jid}/resumes", status_code=201)
async def upload(
    jid: int,
    files: list[UploadFile] = File(...),
    user=Depends(current_user),
    db=Depends(get_db),
):

    job = owned_job(db, user, jid)

    output = []

    for uploaded_file in files:

        data = await uploaded_file.read()

        extension = os.path.splitext(uploaded_file.filename or "")[1].lower()

        result = {"filename": uploaded_file.filename}

        magic_ok = (extension == ".pdf" and data[:5] == b"%PDF-") or (
            extension == ".docx" and data[:2] == b"PK"
        )

        file_hash = hashlib.sha256(data).hexdigest()

        if extension not in (".pdf", ".docx"):

            result["error"] = "Unsupported file type"

        elif len(data) > MAX_BYTES:

            result["error"] = "File exceeds 5 MB"

        elif not magic_ok:

            result["error"] = "File content does not match its extension"

        elif (
            db.query(Candidate)
            .filter_by(
                owner_id=user.id,
                job_id=job.id,
                sha256=file_hash,
            )
            .first()
        ):

            result["error"] = "Duplicate resume"

        else:

            try:

                resume_text = ml.extract_text(data, extension)

                info = ml.extract_info(resume_text)

                stored_name = uuid.uuid4().hex + extension

                stored_path = os.path.join(UPLOAD_DIR, stored_name)

                with open(stored_path, "wb") as file_handle:

                    file_handle.write(data)

                candidate = Candidate(
                    owner_id=user.id,
                    job_id=job.id,
                    name=info["name"],
                    email=info["email"],
                    phone=info["phone"],
                    skills=info["skills"],
                    roles=info["roles"],
                    experience_years=info["experience_years"],
                    education_level=info["education_level"],
                    text=resume_text,
                    filename=os.path.basename(uploaded_file.filename or "resume"),
                    stored_name=stored_name,
                    sha256=file_hash,
                )

                db.add(candidate)
                db.flush()

                result.update(
                    id=candidate.id,
                    name=candidate.name,
                    skills=candidate.skills,
                )

            except ValueError as exc:

                result["error"] = str(exc)

        output.append(result)

    try:

        db.commit()

    except Exception:

        db.rollback()

        log.exception("Resume upload database commit failed")

        raise HTTPException(
            status_code=500,
            detail="Could not save uploaded resumes",
        )

    return output


def cand_dict(candidate):

    fields = (
        "id",
        "job_id",
        "name",
        "email",
        "phone",
        "skills",
        "roles",
        "experience_years",
        "education_level",
        "filename",
    )

    return {field: getattr(candidate, field) for field in fields}


@app.get("/api/candidates")
def candidates(
    job_id: Optional[int] = None,
    q: str = "",
    user=Depends(current_user),
    db=Depends(get_db),
):

    query = db.query(Candidate).filter_by(owner_id=user.id)

    if job_id is not None:
        query = query.filter_by(job_id=job_id)

    if q:
        query = query.filter(Candidate.name.ilike(f"%{q}%"))

    return [cand_dict(candidate) for candidate in query.all()]


@app.delete("/api/candidates/{cid}", status_code=204)
def delete_candidate(
    cid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    candidate = db.get(Candidate, cid)

    if candidate is None or candidate.owner_id != user.id:

        raise HTTPException(
            status_code=404,
            detail="Candidate not found",
        )

    remove_candidate(db, candidate)

    db.commit()

    return Response(status_code=204)


@app.get("/api/candidates/{cid}/resume")
def download(
    cid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    candidate = db.get(Candidate, cid)

    if candidate is None or candidate.owner_id != user.id:

        raise HTTPException(
            status_code=404,
            detail="Candidate not found",
        )

    file_path = os.path.join(UPLOAD_DIR, candidate.stored_name)

    if not os.path.isfile(file_path):

        raise HTTPException(status_code=404, detail="Resume file not found")

    with open(file_path, "rb") as file_handle:
        content = file_handle.read()

    return Response(
        content,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": (f'attachment; filename="{candidate.filename}"')
        },
    )


# ---------------------------------------------------------------------
# AI screening routes
# ---------------------------------------------------------------------


@app.post("/api/jobs/{jid}/screen", status_code=201)
def screen(
    jid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    job = owned_job(db, user, jid)

    candidates_for_job = (
        db.query(Candidate)
        .filter_by(
            job_id=jid,
            owner_id=user.id,
        )
        .all()
    )

    if not candidates_for_job:

        raise HTTPException(
            status_code=400,
            detail="No resumes uploaded for this job",
        )

    job_data = job_dict(job)

    results_list = []

    for candidate in candidates_for_job:

        score = ml.score_candidate(
            cand_dict(candidate),
            candidate.text,
            job_data,
        )

        score["candidate_id"] = candidate.id

        results_list.append(score)

    results_list = ml.rank(results_list)

    session = ScreeningSession(owner_id=user.id, job_id=jid)

    db.add(session)
    db.flush()

    for rank_number, result in enumerate(results_list, start=1):

        db.add(
            ScreeningResult(
                session_id=session.id,
                candidate_id=result["candidate_id"],
                rank=rank_number,
                overall=result["overall"],
                detail=result,
            )
        )

    db.commit()

    return {
        "session_id": session.id,
        "count": len(results_list),
    }


def session_rows(db, user, session_id: int):

    session = db.get(ScreeningSession, session_id)

    if session is None or session.owner_id != user.id:

        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    rows = (
        db.query(ScreeningResult, Candidate)
        .join(Candidate, Candidate.id == ScreeningResult.candidate_id)
        .filter(ScreeningResult.session_id == session_id)
        .order_by(ScreeningResult.rank)
        .all()
    )

    return session, rows


@app.get("/api/sessions/{sid}/results")
def results(
    sid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    _, rows = session_rows(db, user, sid)

    return [
        {
            "rank": screening_result.rank,
            "overall": screening_result.overall,
            "candidate": cand_dict(candidate),
            **{
                key: screening_result.detail[key]
                for key in ("components", "matched", "missing", "explanation")
            },
        }
        for screening_result, candidate in rows
    ]


@app.get("/api/sessions/{sid}/export.csv")
def export_csv(
    sid: int,
    user=Depends(current_user),
    db=Depends(get_db),
):

    _, rows = session_rows(db, user, sid)

    buffer = io.StringIO()

    writer = csv.writer(buffer)

    writer.writerow(
        [
            "Rank",
            "Name",
            "Email",
            "Experience (yrs)",
            "Score",
            "Matched skills",
            "Missing skills",
        ]
    )

    for screening_result, candidate in rows:

        writer.writerow(
            [
                screening_result.rank,
                candidate.name,
                candidate.email,
                candidate.experience_years,
                screening_result.overall,
                "; ".join(screening_result.detail["matched"]),
                "; ".join(screening_result.detail["missing"]),
            ]
        )

    return Response(
        buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": (f'attachment; filename="screening-{sid}.csv"')
        },
    )


@app.get("/api/sessions")
def history(
    user=Depends(current_user),
    db=Depends(get_db),
):

    output = []

    sessions = (
        db.query(ScreeningSession)
        .filter_by(owner_id=user.id)
        .order_by(ScreeningSession.id.desc())
        .all()
    )

    for session in sessions:

        screening_results = (
            db.query(ScreeningResult)
            .filter_by(session_id=session.id)
            .order_by(ScreeningResult.rank)
            .all()
        )

        average_score = (
            round(
                sum(item.overall for item in screening_results)
                / len(screening_results),
                2,
            )
            if screening_results
            else 0
        )

        output.append(
            {
                "id": session.id,
                "job_id": session.job_id,
                "date": session.created_at.isoformat(),
                "candidates": len(screening_results),
                "avg_score": average_score,
                "top_candidate_id": (
                    screening_results[0].candidate_id if screening_results else None
                ),
            }
        )

    return output


@app.get("/api/dashboard")
def dashboard(
    user=Depends(current_user),
    db=Depends(get_db),
):

    average = (
        db.query(func.avg(ScreeningResult.overall))
        .join(ScreeningSession)
        .filter(ScreeningSession.owner_id == user.id)
        .scalar()
    )

    return {
        "jobs": db.query(Job).filter_by(owner_id=user.id).count(),
        "resumes": db.query(Candidate).filter_by(owner_id=user.id).count(),
        "sessions": db.query(ScreeningSession).filter_by(owner_id=user.id).count(),
        "avg_score": round(average or 0, 2),
    }
