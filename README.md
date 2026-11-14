# HireSense AI (backend core)
Run on Windows:
    cd backend
    python -m venv venv && venv\Scripts\activate
    pip install -r requirements.txt
    copy .env.example .env
    uvicorn app.main:app --reload     # Swagger: http://localhost:8000/docs
    python -m pytest -q
Scores are algorithmic relevance estimates, not hiring probabilities. See DEVELOPMENT_STATUS.md for pending work.
