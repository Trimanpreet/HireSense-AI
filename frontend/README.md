# HireSense AI – Intelligent Resume Screening Platform

HireSense AI is a full-stack resume screening and candidate evaluation platform designed to help recruiters organize job openings, manage applicant resumes, and identify candidates whose profiles best match job requirements.

The application combines a React frontend with a Python FastAPI backend and an algorithmic resume-matching engine.

## Key Features

### Authentication

- User registration and login
- JWT-based authentication
- Protected application routes
- Secure password hashing

### Job Management

- Create and manage job openings
- Specify required and preferred skills
- Define experience, education, employment type, and location requirements

### Resume Management

- Upload multiple PDF and DOCX resumes
- Extract text from uploaded resumes
- Extract candidate information and skills
- View and manage candidate records

### Resume Screening

- Evaluate candidates against selected job requirements
- Calculate relevance scores
- Rank candidates based on matching results
- Identify matched and missing skills
- Display score component explanations

### Dashboard and Reports

- View recruitment statistics
- Review recent jobs and screening sessions
- Access previous screening results
- Export screening results as CSV files

## Technology Stack

| Component         | Technologies                                |
| ----------------- | ------------------------------------------- |
| Frontend          | React, JavaScript, Vite                     |
| Styling           | CSS                                         |
| Icons             | Lucide React                                |
| API Communication | Axios                                       |
| Backend           | Python, FastAPI                             |
| Database          | SQLite, SQLAlchemy                          |
| Authentication    | JWT, password hashing                       |
| Resume Processing | PDF and DOCX text extraction                |
| Matching Engine   | TF-IDF, cosine similarity, skill extraction |
| API Documentation | Swagger UI                                  |

## Project Structure

```text
HireSense-AI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py
│   │   └── ml/
│   │       └── engine.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
├── sample_data/
├── README.md
└── DEVELOPMENT_STATUS.md
```

## Installation and Setup

### Prerequisites

Install the following:

- Python 3.10 or later
- Node.js and npm
- Git (optional)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd HireSense-AI
```

### 2. Backend Setup

Open a terminal in the backend directory:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file by copying `.env.example` to `.env`.

Configure a strong, private secret key in `.env`. Do not commit this file or share its contents.

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend URL:

`http://localhost:8000`

Swagger API documentation:

`http://localhost:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173`

The frontend communicates with the backend through Axios.

## Resume Matching Approach

HireSense AI uses an algorithmic approach to evaluate resume relevance.

The screening workflow includes:

1. Extracting text from uploaded PDF and DOCX documents.
2. Identifying relevant candidate skills.
3. Comparing candidate information with job requirements.
4. Applying TF-IDF vectorization and cosine similarity.
5. Calculating component-based relevance scores.
6. Ranking candidates and generating explanations.

The results include matched skills, missing skills, and available scoring components.

**Important:** The scores are algorithmic relevance estimates, not probabilities of hiring success. They should support recruiter review rather than replace human decision-making.

The current implementation does not rely on an external generative AI API such as OpenAI or Gemini.

## Running Tests

From the backend directory, activate the virtual environment and execute:

```bash
python -m pytest -q
```

## API Documentation

FastAPI provides interactive API documentation through Swagger UI:

`http://localhost:8000/docs`

The API includes functionality for:

- Authentication
- Job management
- Resume uploads
- Candidate management
- Screening sessions
- Screening results
- CSV exports
- Dashboard statistics

## Security Considerations

- Passwords are stored using password hashing.
- Protected endpoints use JWT authentication.
- Environment secrets should remain in the local `.env` file.
- Uploaded resumes should be handled as private candidate information.
- Never commit credentials, secret keys, or private applicant documents.

## Future Improvements

Potential future enhancements include:

- Advanced resume parsing and information extraction
- More configurable screening criteria
- Integration with external AI services
- Additional analytics and reporting
- Improved candidate comparison tools
- Deployment to a production hosting environment

## Project Goal

The goal of HireSense AI is to simplify resume management and provide recruiters with an organized, explainable way to compare applicants against job requirements.
