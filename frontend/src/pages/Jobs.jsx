import { useEffect, useState } from "react";
import { Plus, Search, BriefcaseBusiness, MapPin, X } from "lucide-react";
import API from "../services/api";
import "./Jobs.css";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    required_skills: "",
    preferred_skills: "",
    min_experience: 0,
    max_experience: "",
    education: "",
    employment_type: "Full-time",
    location: "",
    status: "open",
  });

 const fetchJobs = async () => {
  try {
    const response = await API.get("/api/jobs");
    setJobs(Array.isArray(response.data) ? response.data : []);
    setError("");
  } catch (err) {
    setError(err.response?.data?.detail || "Unable to load jobs.");
  }
};

useEffect(() => {
  let active = true;

  API.get("/api/jobs")
    .then((response) => {
      if (active) {
        setJobs(Array.isArray(response.data) ? response.data : []);
        setError("");
      }
    })
    .catch((err) => {
      if (active) {
        setError(err.response?.data?.detail || "Unable to load jobs.");
      }
    })
    .finally(() => {
      if (active) {
        setLoading(false);
      }
    });

  return () => {
    active = false;
  };
}, []);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        required_skills: form.required_skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        preferred_skills: form.preferred_skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        min_experience: Number(form.min_experience),
        max_experience: form.max_experience
          ? Number(form.max_experience)
          : null,
        education: form.education || null,
      };

      await API.post("/api/jobs", payload);

      setShowForm(false);
      setForm({
        title: "",
        company: "",
        description: "",
        required_skills: "",
        preferred_skills: "",
        min_experience: 0,
        max_experience: "",
        education: "",
        employment_type: "Full-time",
        location: "",
        status: "open",
      });

      await fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create the job.");
    } finally {
      setSaving(false);
    }
  };

  const filteredJobs = jobs.filter((job) =>
    `${job.title} ${job.company}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="jobs-page">
      <div className="jobs-heading">
        <div>
          <h1>Job Management</h1>
          <p>Create and manage your recruitment openings.</p>
        </div>

        <button className="primary-action" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Create New Job
        </button>
      </div>

      <div className="jobs-toolbar">
        <div className="jobs-search">
          <Search size={18} />
          <input
            placeholder="Search jobs by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span>{jobs.length} total jobs</span>
      </div>

      {error && <div className="jobs-error">{String(error)}</div>}

      {loading ? (
        <p>Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <div className="jobs-empty">
          <BriefcaseBusiness size={42} />
          <h3>No jobs found</h3>
          <p>Create your first job opening to get started.</p>
          <button className="primary-action" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Create Job
          </button>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div className="job-card" key={job.id}>
              <div className="job-card-top">
                <div className="job-icon">
                  <BriefcaseBusiness size={22} />
                </div>
                <span className={`job-status ${job.status === "open" ? "open" : "closed"}`}>
                  {job.status || "Open"}
                </span>
              </div>

              <h3>{job.title}</h3>
              <p className="job-company">{job.company}</p>

              <div className="job-location">
                <MapPin size={15} />
                {job.location || "Location not specified"}
              </div>

              <div className="job-skills">
                {(job.required_skills || []).slice(0, 5).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>

              <div className="job-card-footer">
                <span>{job.employment_type || "Full-time"}</span>
                <span>{job.min_experience || 0}+ years experience</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="job-modal">
            <div className="modal-heading">
              <div>
                <h2>Create Job Opening</h2>
                <p>Enter the details of your new position.</p>
              </div>
              <button className="close-modal" onClick={() => setShowForm(false)}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Job Title *
                  <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Python Backend Developer" />
                </label>

                <label>
                  Company *
                  <input name="company" value={form.company} onChange={handleChange} required placeholder="Company name" />
                </label>

                <label>
                  Location
                  <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Bangalore" />
                </label>

                <label>
                  Employment Type
                  <select name="employment_type" value={form.employment_type} onChange={handleChange}>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                </label>

                <label>
                  Minimum Experience (years)
                  <input type="number" min="0" name="min_experience" value={form.min_experience} onChange={handleChange} />
                </label>

                <label>
                  Maximum Experience (years)
                  <input type="number" min="0" name="max_experience" value={form.max_experience} onChange={handleChange} placeholder="Optional" />
                </label>

                <label className="full-width">
                  Education
                  <input name="education" value={form.education} onChange={handleChange} placeholder="e.g. Bachelor's degree" />
                </label>

                <label className="full-width">
                  Required Skills *
                  <input name="required_skills" value={form.required_skills} onChange={handleChange} required placeholder="Python, FastAPI, SQL, MongoDB" />
                  <small>Separate skills using commas.</small>
                </label>

                <label className="full-width">
                  Preferred Skills
                  <input name="preferred_skills" value={form.preferred_skills} onChange={handleChange} placeholder="Docker, AWS, Git" />
                </label>

                <label className="full-width">
                  Job Description *
                  <textarea name="description" value={form.description} onChange={handleChange} required minLength={10} rows={4} placeholder="Describe the responsibilities and requirements..." />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-action" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action" disabled={saving}>
                  {saving ? "Creating..." : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Jobs;
