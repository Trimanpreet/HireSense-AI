import io, fitz, docx, pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml import engine as ml
c = TestClient(app)

def pdf(text):
    d = fitz.open(); p = d.new_page(); p.insert_text((50, 72), text); return d.tobytes()
def dx(text):
    d = docx.Document(); [d.add_paragraph(l) for l in text.split("\n")]; b = io.BytesIO(); d.save(b); return b.getvalue()
STRONG = "Asha Verma\nasha@example.com\nSoftware Engineer with 5 years experience. Skills: Python, SQL, React, Machine Learning, Communication. B.Tech"
WEAK = "Ravi Kumar\nravi@example.com\nJunior Developer with 1 year experience. Skills: HTML, CSS."
JD = "Software developer needed with Python, SQL, React, Machine Learning and Communication. Bachelor degree, 3 years experience."

def auth(email="a@x.com"):
    c.post("/api/auth/register", json={"email": email, "name": "A", "password": "password123"})
    t = c.post("/api/auth/login", json={"email": email, "password": "password123"}).json()["access_token"]
    return {"Authorization": f"Bearer {t}"}

def test_auth():
    assert c.post("/api/auth/login", json={"email": "no@x.com", "password": "bad"}).status_code == 401
    assert c.get("/api/jobs").status_code == 401
    assert c.get("/api/users/me", headers=auth()).status_code == 200
    assert c.post("/api/auth/register", json={"email": "a@x.com", "name": "A", "password": "password123"}).status_code == 409

def test_job_crud_and_isolation():
    h, h2 = auth(), auth("b@x.com")
    j = c.post("/api/jobs", json={"title": "Dev", "description": JD}, headers=h).json()
    assert "Python" in j["required_skills"]
    assert c.put(f"/api/jobs/{j['id']}", json={"title": "Dev2", "description": JD}, headers=h).json()["title"] == "Dev2"
    assert c.get(f"/api/jobs/{j['id']}", headers=h2).status_code == 404
    assert c.delete(f"/api/jobs/{j['id']}", headers=h).status_code == 204

def test_ml():
    assert ml.extract_text(pdf(STRONG), ".pdf").startswith("Asha")
    assert "Python" in ml.extract_text(dx(STRONG), ".docx")
    with pytest.raises(ValueError): ml.extract_text(b"junk", ".pdf")
    assert ml.extract_skills("Java and JavaScript, C++, node.js") == ["C++", "Java", "JavaScript", "Node.js"]
    assert ml.preprocess("Hello, WORLD!") == "hello world"
    assert ml.tfidf_similarity(STRONG, JD) > ml.tfidf_similarity(WEAK, JD)
    assert 0 <= ml.tfidf_similarity("a", "b") <= 1
    job = {"required_skills": ["Python", "SQL"], "description": JD, "min_experience": 3, "education_level": None}
    s = ml.score_candidate({"skills": ["Python"], "experience_years": None, "education_level": None}, WEAK, job)
    assert s["missing"] == ["SQL"] and s["components"]["experience"] is None and 0 < s["overall"] < 100
    assert s == ml.score_candidate({"skills": ["Python"], "experience_years": None, "education_level": None}, WEAK, job)

def test_full_workflow():
    h = auth("w@x.com")
    j = c.post("/api/jobs", json={"title": "Dev", "description": JD, "min_experience": 3}, headers=h).json()
    sp = pdf(STRONG)
    files = [("files", ("strong.pdf", sp, "application/pdf")), ("files", ("weak.docx", dx(WEAK), "application/octet-stream")),
             ("files", ("dup.pdf", sp, "application/pdf")), ("files", ("bad.txt", b"hi", "text/plain")), ("files", ("fake.pdf", b"not pdf", "application/pdf"))]
    r = c.post(f"/api/jobs/{j['id']}/resumes", files=files, headers=h).json()
    assert [bool(x.get("error")) for x in r] == [False, False, True, True, True]
    assert r[2]["error"] == "Duplicate resume"
    sid = c.post(f"/api/jobs/{j['id']}/screen", headers=h).json()["session_id"]
    res = c.get(f"/api/sessions/{sid}/results", headers=h).json()
    assert [x["rank"] for x in res] == [1, 2] and res[0]["candidate"]["name"] == "Asha Verma" and res[0]["overall"] > res[1]["overall"]
    assert "Machine Learning" in res[1]["missing"]
    csv_text = c.get(f"/api/sessions/{sid}/export.csv", headers=h).text
    assert "Asha Verma" in csv_text and csv_text.startswith("Rank")
    assert c.get(f"/api/sessions/{sid}/results", headers=auth("o@x.com")).status_code == 404
    assert c.get("/api/dashboard", headers=h).json()["resumes"] == 2 and len(c.get("/api/sessions", headers=h).json()) == 1
    cid = res[0]["candidate"]["id"]
    assert c.get(f"/api/candidates/{cid}/resume", headers=h).status_code == 200
    assert c.delete(f"/api/candidates/{cid}", headers=h).status_code == 204
