import os, sys, tempfile
d = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{d}/t.db"; os.environ["UPLOAD_DIR"] = f"{d}/up"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
