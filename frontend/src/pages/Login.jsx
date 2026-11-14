
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, LockKeyhole, Mail, User } from "lucide-react";
import API from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await API.post("/api/auth/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        setIsRegister(false);
        setFormData({
          name: "",
          email: formData.email,
          password: "",
        });

        setError("Account created successfully! Please log in.");
      } else {
        const response = await API.post("/api/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem(
          "access_token",
          response.data.access_token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <BriefcaseBusiness size={32} />
        </div>

        <h1>HireSense AI</h1>

        <p className="login-subtitle">
          Intelligent Resume Screening Platform
        </p>

        <h2>
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>

        <p className="login-description">
          {isRegister
            ? "Create an account to get started."
            : "Sign in to manage your recruitment process."}
        </p>

        {error && (
          <div className="login-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="login-input">
              <User size={18} />
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="login-input">
            <Mail size={18} />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="login-input">
            <LockKeyhole size={18} />
            <input
              type="password"
              name="password"
              placeholder="Password (minimum 8 characters)"
              value={formData.password}
              onChange={handleChange}
              minLength={isRegister ? 8 : 1}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <div className="login-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
