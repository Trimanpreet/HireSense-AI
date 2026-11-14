
import { useEffect, useState } from "react";
import { Upload, Users, FileText, Trash2, Search } from "lucide-react";
import API from "../services/api";
import "./Candidates.css";

function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      API.get("/api/candidates"),
      API.get("/api/jobs"),
    ])
      .then(([candidateResponse, jobResponse]) => {
        if (!active) return;

        setCandidates(
          Array.isArray(candidateResponse.data)
            ? candidateResponse.data
            : []
        );

        setJobs(
          Array.isArray(jobResponse.data)
            ? jobResponse.data
            : []
        );
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.detail ||
            "Unable to load candidates."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedJob || files.length === 0) {
      setError("Please select a job and choose at least one resume.");
      return;
    }

    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await API.post(
        `/api/jobs/${selectedJob}/resumes`,
        formData,
        {
          headers: {
            "Content-Type": undefined,
          },
        }
      );

      setMessage("Resume upload successful!");

      const response = await API.get("/api/candidates");
      setCandidates(
        Array.isArray(response.data) ? response.data : []
      );

      setFiles([]);
      event.target.reset();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Resume upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (candidateId) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) {
      return;
    }

    try {
      await API.delete(`/api/candidates/${candidateId}`);
      setCandidates((previous) =>
        previous.filter((candidate) => candidate.id !== candidateId)
      );
      setMessage("Candidate deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to delete candidate."
      );
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const text = `${candidate.name || ""} ${candidate.email || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="candidates-page">
      <div className="page-heading">
        <div>
          <h1>Candidates</h1>
          <p>Manage applicants and upload their resumes.</p>
        </div>
        <div className="candidate-total">
          <Users size={20} />
          <span>{candidates.length} Candidates</span>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="upload-card">
        <h2><Upload size={20} /> Upload Resumes</h2>

        <form onSubmit={handleUpload}>
          <label>Select Job</label>
          <select
            value={selectedJob}
            onChange={(event) => setSelectedJob(event.target.value)}
          >
            <option value="">Choose a job</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} — {job.company}
              </option>
            ))}
          </select>

          <label>Choose Resume Files (PDF or DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={(event) => setFiles(event.target.files)}
          />

          <button type="submit" disabled={uploading}>
            <Upload size={17} />
            {uploading ? "Uploading..." : "Upload Resumes"}
          </button>
        </form>

        <p className="upload-hint">
          Supported formats: PDF and DOCX. Maximum size: 5 MB per file.
        </p>
      </section>

      <section className="candidate-list-card">
        <div className="candidate-list-heading">
          <h2>All Candidates</h2>
          <div className="candidate-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search candidates..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p>Loading candidates...</p>
        ) : filteredCandidates.length === 0 ? (
          <div className="empty-candidates">
            <FileText size={35} />
            <h3>No candidates found</h3>
            <p>Upload resumes to add candidates to your database.</p>
          </div>
        ) : (
          <div className="candidate-table-wrapper">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Skills</th>
                  <th>Experience</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>{candidate.name || "Unknown"}</td>
                    <td>{candidate.email || "Not available"}</td>
                    <td>
                      {Array.isArray(candidate.skills)
                        ? candidate.skills.join(", ")
                        : "Not available"}
                    </td>
                    <td>{candidate.experience ?? "Not available"}</td>
                    <td>
                      <button
                        className="delete-candidate"
                        onClick={() => handleDelete(candidate.id)}
                        title="Delete candidate"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Candidates;
