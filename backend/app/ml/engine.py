"""Explainable resume-matching engine: parsing, skills, TF-IDF, scoring, ranking."""
import io, re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Extensible skill dictionary: canonical name -> aliases
SKILLS = {
 "Python": ["python"], "Java": ["java"], "JavaScript": ["javascript", "js"], "C++": ["c++"],
 "React": ["react", "reactjs", "react.js"], "Angular": ["angular"], "HTML": ["html", "html5"], "CSS": ["css", "css3"],
 "Node.js": ["node.js", "nodejs"], "FastAPI": ["fastapi"], "Django": ["django"], "Spring Boot": ["spring boot", "springboot"],
 "SQL": ["sql"], "MySQL": ["mysql"], "PostgreSQL": ["postgresql", "postgres"], "MongoDB": ["mongodb", "mongo"],
 "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"], "NLP": ["nlp", "natural language processing"],
 "TensorFlow": ["tensorflow"], "Scikit-learn": ["scikit-learn", "sklearn"],
 "AWS": ["aws", "amazon web services"], "Azure": ["azure"], "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"],
 "Git": ["git", "github"], "Jenkins": ["jenkins"], "Selenium": ["selenium"], "Pytest": ["pytest"], "JUnit": ["junit"],
 "Manual Testing": ["manual testing"], "Communication": ["communication", "communicator"], "Leadership": ["leadership", "led a team"],
 "Problem Solving": ["problem solving", "problem-solving"], "Teamwork": ["teamwork", "team player", "collaboration"],
 "Project Management": ["project management"],
}
_PATTERNS = {k: [re.compile(r"(?<![A-Za-z0-9+#])" + re.escape(a) + r"(?![A-Za-z0-9+#])", re.I) for a in v] for k, v in SKILLS.items()}
EDU = {"phd": 4, "doctorate": 4, "master": 3, "m.tech": 3, "mba": 3, "m.sc": 3, "bachelor": 2, "b.tech": 2, "b.e": 2, "b.sc": 2, "diploma": 1}
WEIGHTS = {"skills": 0.45, "similarity": 0.25, "experience": 0.20, "education": 0.10}

def extract_text(data: bytes, ext: str) -> str:
    try:
        if ext == ".pdf":
            import fitz
            doc = fitz.open(stream=data, filetype="pdf")
            text = "\n".join(p.get_text() for p in doc)
        elif ext == ".docx":
            import docx
            d = docx.Document(io.BytesIO(data))
            text = "\n".join(p.text for p in d.paragraphs)
            for t in d.tables:
                for row in t.rows:
                    text += "\n" + " ".join(c.text for c in row.cells)
        else:
            raise ValueError("Unsupported file type")
    except ValueError:
        raise
    except Exception:
        raise ValueError("Document is corrupted or unreadable")
    if not text.strip():
        raise ValueError("No extractable text (scanned document? OCR required)")
    return text

def preprocess(text: str) -> str:
    text = re.sub(r"[^a-z0-9+#.\s-]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()

def extract_skills(text: str) -> list:
    return sorted(k for k, pats in _PATTERNS.items() if any(p.search(text) for p in pats))

def education_level(text: str):
    t = text.lower()
    lv = [v for k, v in EDU.items() if re.search(r"(?<![a-z])" + re.escape(k), t)]
    return max(lv) if lv else None

def experience_years(text: str):
    ys = [float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", text, re.I)]
    return max(ys) if ys else None

def extract_info(text: str) -> dict:
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone = re.search(r"(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}", text)
    name = None
    for line in text.splitlines()[:5]:
        l = line.strip()
        if l and "@" not in l and not re.search(r"\d", l) and 1 <= len(l.split()) <= 4:
            name = l; break
    roles = sorted(set(m.strip().title() for m in re.findall(
        r"((?:senior |junior |lead )?(?:software|full[- ]stack|backend|frontend|data|qa|test|devops|machine learning)\s+(?:engineer|developer|analyst|scientist|tester))", text, re.I)))
    return {"name": name, "email": email.group(0) if email else None, "phone": phone.group(0).strip() if phone else None,
            "skills": extract_skills(text), "experience_years": experience_years(text),
            "education_level": education_level(text), "roles": roles}

def tfidf_similarity(resume: str, jd: str) -> float:
    a, b = preprocess(resume), preprocess(jd)
    if not a or not b:
        return 0.0
    try:
        m = TfidfVectorizer(ngram_range=(1, 2), stop_words="english").fit_transform([a, b])
    except ValueError:  # empty vocabulary (e.g. only stop words)
        return 0.0
    return float(max(0.0, min(1.0, cosine_similarity(m[0], m[1])[0][0])))

def score_candidate(cand: dict, resume_text: str, job: dict, weights=None) -> dict:
    w = weights or WEIGHTS
    req = job.get("required_skills") or []
    have = set(cand["skills"])
    matched = [s for s in req if s in have]
    missing = [s for s in req if s not in have]
    comps = {"skills": (len(matched) / len(req)) if req else None,
             "similarity": tfidf_similarity(resume_text, job.get("description", ""))}
    me = job.get("min_experience") or 0
    ce = cand.get("experience_years")
    comps["experience"] = None if ce is None else (min(ce / me, 1.0) if me > 0 else 1.0)
    need = job.get("education_level")
    cl = cand.get("education_level")
    comps["education"] = None if (cl is None or not need) else min(cl / need, 1.0)
    # Unavailable components are excluded and weights renormalised (never scored as zero).
    avail = {k: v for k, v in comps.items() if v is not None}
    tot = sum(w[k] for k in avail)
    contrib = {k: round(100 * w[k] / tot * v, 2) for k, v in avail.items()}
    overall = round(sum(contrib.values()), 2)
    expl = [f"{k}: {round(v*100)}% x weight {round(w[k]/tot*100)}% = {contrib[k]} pts" for k, v in avail.items()]
    expl += [f"{k}: not available in resume/job - excluded, not penalised" for k in comps if comps[k] is None]
    expl.append("Score is an algorithmic relevance estimate, not a hiring probability.")
    return {"overall": overall, "components": {k: (None if v is None else round(v * 100, 2)) for k, v in comps.items()},
            "contributions": contrib, "matched": matched, "missing": missing, "explanation": expl}

def rank(results: list) -> list:
    return sorted(results, key=lambda r: (-r["overall"], r["candidate_id"]))
