
import { useEffect, useState } from "react";
import { BrainCircuit, Play, Trophy, Download, RefreshCw } from "lucide-react";
import API from "../services/api";
import "./Screening.css";

function Screening() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [results, setResults] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    API.get("/api/jobs")
      .then((response) => {
        if (active) {
          const data = Array.isArray(response.data) ? response.data : [];
          setJobs(data);
          if (data.length > 0) {
            setSelectedJob(String(data[0].id));
          }
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.detail || "Unable to load jobs.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runScreening = async () => {
    if (!selectedJob) {
      setError("Please select a job first.");
      return;
    }

    setScreening(true);
    setError("");
    setMessage("");
    setResults([]);
    setSessionId(null);

    try {
      const response = await API.post(
        `/api/jobs/${selectedJob}/screen`
      );

      const newSessionId =
        response.data.session_id ?? response.data.id;

      if (!newSessionId) {
        throw new Error("Screening completed but no session ID was returned.");
      }

      setSessionId(newSessionId);

      const resultResponse = await API.get(
        `/api/sessions/${newSessionId}/results`
      );

      const resultData = Array.isArray(resultResponse.data)
        ? resultResponse.data
        : resultResponse.data.results || [];

      setResults(resultData);
      setMessage("AI screening completed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to run screening."
      );
    } finally {
      setScreening(false);
    }
  };

  const downloadCSV = async () => {
    if (!sessionId) return;

    try {
      const response = await API.get(
        `/api/sessions/${sessionId}/export.csv`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `screening-results-${sessionId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to download CSV."
      );
    }
  };

  return (
    <div className="screening-page">
      <div className="screening-heading">
        <div>
          <h1>AI Resume Screening</h1>
          <p>Analyze, rank, and compare candidates against job requirements.</p>
        </div>
        <div className="screening-icon">
          <BrainCircuit size={30} />
        </div>
      </div>

      {message && <div className="screening-success">{message}</div>}
      {error && <div className="screening-error">{error}</div>}

      <section className="screening-control-card">
        <h2>Start a Screening Session</h2>
        <p>Select a job to evaluate its uploaded resumes.</p>

        {loading ? (
          <p>Loading jobs...</p>
        ) : (
          <div className="screening-controls">
            <select
              value={selectedJob}
              onChange={(event) => setSelectedJob(event.target.value)}
            >
              <option value="">Select a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.company}
                </option>
              ))}
            </select>

            <button
              onClick={runScreening}
              disabled={screening || !selectedJob}
            >
              {screening ? (
                <RefreshCw size={17} className="screening-spinner" />
              ) : (
                <Play size={17} />
              )}
              {screening ? "Screening..." : "Run AI Screening"}
            </button>
          </div>
        )}
      </section>

      <section className="screening-results-card">
        <div className="screening-results-heading">
          <div>
            <h2><Trophy size={20} /> Screening Results</h2>
            {sessionId && <p>Session ID: {sessionId}</p>}
          </div>

          {sessionId && (
            <button className="csv-button" onClick={downloadCSV}>
              <Download size={17} /> Export CSV
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="screening-empty">
            <BrainCircuit size={40} />
            <h3>No screening results yet</h3>
            <p>Select a job and run AI screening to see candidate rankings.</p>
          </div>
        ) : (
    <>
    <div className="screening-table-wrapper">
            <table className="screening-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Overall Score</th>
                  <th>Matched Skills</th>
                  <th>Missing Skills</th>
                </tr>
              </thead>
             
<tbody>
  {results.map((result, index) => (
    <tr key={result.candidate?.id || index}>
      <td>#{result.rank ?? index + 1}</td>

      <td>
        <div>
          <strong>
            {result.candidate?.name || "Unknown Candidate"}
          </strong>
          <br />
          <small>
            {result.candidate?.email || "Email unavailable"}
          </small>
        </div>
      </td>

      <td>
        <strong>
          {Number(result.overall ?? 0).toFixed(2)}%
        </strong>
      </td>

      <td>
        {Array.isArray(result.matched) && result.matched.length > 0
          ? result.matched.join(", ")
          : "None"}
      </td>

      <td>
        {Array.isArray(result.missing) && result.missing.length > 0
          ? result.missing.join(", ")
          : "None"}
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>

          <div className="score-explanation-section">
            <h2>AI Score Explanation</h2>
            <p className="explanation-subtitle">
              Understand how the AI evaluated each candidate.
            </p>

            {results.map((result, index) => (
              <div
                className="explanation-card"
                key={result.candidate?.id || index}
              >
                <h3>{result.candidate?.name || "Unknown Candidate"}</h3>

                <div className="score-components">
                  <div className="score-component">
                    <span>Skills Score</span>
                    <strong>{result.components?.skills ?? "N/A"}%</strong>
                  </div>

                  <div className="score-component">
                    <span>Similarity Score</span>
                    <strong>{result.components?.similarity ?? "N/A"}%</strong>
                  </div>

                  <div className="score-component">
                    <span>Education Score</span>
                    <strong>{result.components?.education ?? "N/A"}%</strong>
                  </div>

                  <div className="score-component">
                    <span>Experience Score</span>
                    <strong>{result.components?.experience ?? "Not available"}</strong>
                  </div>
                </div>

                <h4>How was this score calculated?</h4>

                <ul className="explanation-list">
                  {(result.explanation || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <p className="score-disclaimer">
                  This score is an algorithmic relevance estimate,
                  not a hiring probability. Final hiring decisions
                  should involve human review.
                </p>
              </div>
            ))}
                    </div>
    </>
        )}
      </section>

    </div>
  );
}

export default Screening;
