
import { useEffect, useState } from "react";
import {
  History,
  RefreshCw,
  Trophy,
  Eye,
  ChevronUp,
} from "lucide-react";
import API from "../services/api";
import "./ScreeningHistory.css";

function ScreeningHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    let active = true;

    API.get("/api/sessions")
      .then((response) => {
        if (active) {
          setSessions(
            Array.isArray(response.data) ? response.data : []
          );
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.detail ||
            "Unable to load screening history."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString();
  };

  const viewResults = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setSessionResults([]);
      setResultsError("");
      return;
    }

    setExpandedSession(sessionId);
    setSessionResults([]);
    setResultsError("");
    setResultsLoading(true);

    try {
      const response = await API.get(
        `/api/sessions/${sessionId}/results`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];

      setSessionResults(data);
    } catch (err) {
      setResultsError(
        err.response?.data?.detail ||
        "Unable to load results for this session."
      );
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <h1>Screening History</h1>
          <p>Review your previous AI resume screening sessions.</p>
        </div>

        <button
          className="history-refresh-button"
          onClick={() => {
            setLoading(true);
            setExpandedSession(null);
            setSessionResults([]);
            setRefreshKey((previous) => previous + 1);
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && <div className="history-error">{error}</div>}

      <section className="history-card">
        <div className="history-card-heading">
          <h2>
            <History size={20} />
            Previous Sessions
          </h2>
          <span>{sessions.length} Sessions</span>
        </div>

        {loading ? (
          <p className="history-empty">Loading screening history...</p>
        ) : sessions.length === 0 ? (
          <div className="history-empty">
            <History size={40} />
            <h3>No screening history found</h3>
            <p>Run your first AI screening to see it here.</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Job ID</th>
                  <th>Date</th>
                  <th>Candidates</th>
                  <th>Average Score</th>
                  <th>Top Candidate ID</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>#{session.id}</td>
                    <td>#{session.job_id}</td>
                    <td>{formatDate(session.date)}</td>
                    <td>{session.candidates ?? 0}</td>
                    <td>
                      <strong>
                        {Number(session.avg_score ?? 0).toFixed(2)}%
                      </strong>
                    </td>
                    <td>
                      {session.top_candidate_id ? (
                        <span className="history-top-candidate">
                          <Trophy size={15} />
                          #{session.top_candidate_id}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      <button
                        className="history-view-button"
                        onClick={() => viewResults(session.id)}
                        disabled={
                          resultsLoading &&
                          expandedSession === session.id
                        }
                      >
                        {expandedSession === session.id ? (
                          <>
                            <ChevronUp size={16} />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye size={16} />
                            View Results
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {expandedSession !== null && (
          <div className="session-details">
            <h2>Results for Session #{expandedSession}</h2>

            {resultsLoading ? (
              <p className="history-empty">Loading session results...</p>
            ) : resultsError ? (
              <div className="history-error">{resultsError}</div>
            ) : sessionResults.length === 0 ? (
              <p className="history-empty">
                No candidate results found for this session.
              </p>
            ) : (
              sessionResults.map((result, index) => (
                <div
                  className="session-result-card"
                  key={result.candidate?.id || index}
                >
                  <div className="session-result-heading">
                    <div>
                      <h3>
                        #{result.rank ?? index + 1}{" "}
                        {result.candidate?.name || "Unknown Candidate"}
                      </h3>
                      <p>
                        {result.candidate?.email || "Email unavailable"}
                      </p>
                    </div>

                    <strong className="session-result-score">
                      {Number(result.overall ?? 0).toFixed(2)}%
                    </strong>
                  </div>

                  <div className="session-skills">
                    <div>
                      <strong>Matched Skills</strong>
                      <p>
                        {result.matched?.length
                          ? result.matched.join(", ")
                          : "None"}
                      </p>
                    </div>

                    <div>
                      <strong>Missing Skills</strong>
                      <p>
                        {result.missing?.length
                          ? result.missing.join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>

                  <h4>Score Breakdown</h4>

                  <div className="session-score-breakdown">
                    <span>
                      Skills: {result.components?.skills ?? "N/A"}%
                    </span>
                    <span>
                      Similarity: {result.components?.similarity ?? "N/A"}%
                    </span>
                    <span>
                      Education: {result.components?.education ?? "N/A"}%
                    </span>
                    <span>
                      Experience: {result.components?.experience ?? "N/A"}
                    </span>
                  </div>

                  <h4>AI Explanation</h4>

                  <ul className="session-explanation">
                    {(result.explanation || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <p className="session-disclaimer">
                    This score is an algorithmic relevance estimate,
                    not a hiring probability. Final hiring decisions
                    should involve human review.
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default ScreeningHistory;
