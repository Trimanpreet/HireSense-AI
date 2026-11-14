# Development Status
## Done (backend, tested: 4 pytest tests pass)
Auth (JWT, PBKDF2), jobs CRUD + search/filter, secure resume upload (ext/magic-byte/size/SHA-256 duplicate checks, uuid filenames),
PDF/DOCX extraction, skill dictionary, info extraction, TF-IDF + cosine, configurable weighted explainable scoring
(missing data excluded, not zeroed), deterministic ranking, screening sessions/history, CSV export, dashboard stats,
candidate deletion, authenticated resume download, recruiter data isolation.
## Pending
React/Vite/Tailwind frontend (all pages), PDF report generation, dark mode, sample data + seed script,
profile/settings routes, pagination/score filters on results API, docs (SRS, test report, user guide), Windows start script,
frontend tests, OCR extension, Resume table split from Candidate.
