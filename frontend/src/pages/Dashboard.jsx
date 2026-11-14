
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  FileText,
  Users,
  TrendingUp,
} from "lucide-react";
import API from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState({
    jobs: 0,
    resumes: 0,
    sessions: 0,
    avg_score: 0,
  });

  const [jobs, setJobs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        const [statsResponse, jobsResponse, sessionsResponse] =
          await Promise.all([
            API.get("/api/dashboard"),
            API.get("/api/jobs"),
            API.get("/api/sessions"),
          ]);

        if (active) {
          setStats(statsResponse.data);
          setJobs(
            Array.isArray(jobsResponse.data) ? jobsResponse.data.slice(0, 5) : []
          );
          setSessions(
            Array.isArray(sessionsResponse.data)
              ? sessionsResponse.data.slice(0, 5)
              : []
          );
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load dashboard information."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      title: "Total Jobs",
      value: stats.jobs,
      icon: BriefcaseBusiness,
    },
    {
      title: "Resumes Uploaded",
      value: stats.resumes,
      icon: FileText,
    },
    {
      title: "Screening Sessions",
      value: stats.sessions,
      icon: Users,
    },
    {
      title: "Average Match Score",
      value: `${Number(stats.avg_score || 0).toFixed(2)}%`,
      icon: TrendingUp,
    },
  ];

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString();
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div className="dashboard-eyebrow">Recruitment overview</div>

        <h1>Welcome back, {user.name || "Recruiter"}!</h1>

        <p>
          Here's an overview of your recruitment activity and screening
          performance.
        </p>
      </div>

      {loading ? (
        <p className="dashboard-loading">Loading dashboard...</p>
      ) : error ? (
        <p className="dashboard-error">{error}</p>
      ) : (
        <>
          <div className="dashboard-stats">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div className="dashboard-stat-card" key={card.title}>
                  <div className="dashboard-stat-icon">
                    <Icon size={23} />
                  </div>

                  <p className="dashboard-stat-label">{card.title}</p>

                  <h2 className="dashboard-stat-value">{card.value}</h2>
                </div>
              );
            })}
          </div>

          <div className="dashboard-content-grid">
            <section className="dashboard-section">
              <h2>Recent Jobs</h2>

              {jobs.length === 0 ? (
                <p className="dashboard-empty">
                  No jobs created yet. Your jobs will appear here.
                </p>
              ) : (
                <div className="dashboard-list">
                  {jobs.map((job) => (
                    <div className="dashboard-list-item" key={job.id}>
                      <div>
                        <strong>{job.title}</strong>
                        <span>{job.company || "Company not specified"}</span>
                      </div>

                      <span className="dashboard-status">
                        {job.status || "Active"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <h2>Recent Screening Sessions</h2>

              {sessions.length === 0 ? (
                <p className="dashboard-empty">
                  No screening sessions yet. Your sessions will appear here.
                </p>
              ) : (
                <div className="dashboard-list">
                  {sessions.map((session) => (
                    <div className="dashboard-list-item" key={session.id}>
                      <div>
                        <strong>Session #{session.id}</strong>
                        <span>
                          {formatDate(session.date)} ·{" "}
                          {session.candidates || 0} candidates
                        </span>
                      </div>

                      <span className="dashboard-status">
                        {Number(session.avg_score || 0).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
