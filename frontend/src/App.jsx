
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import Screening from "./pages/Screening";
import ScreeningHistory from "./pages/ScreeningHistory";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Layout>
        <Dashboard />
      </Layout>
    </ProtectedRoute>
  }
/>
       <Route
  path="/jobs"
  element={
    <ProtectedRoute>
      <Layout>
        <Jobs />
      </Layout>
    </ProtectedRoute>
  }
/>
       <Route
  path="/candidates"
  element={
    <ProtectedRoute>
      <Layout>
        <Candidates />
      </Layout>
    </ProtectedRoute>
  }
/>
       <Route
  path="/screening"
  element={
    <ProtectedRoute>
      <Layout>
        <Screening />
      </Layout>
    </ProtectedRoute>
  }
/>
      <Route
  path="/screening-history"
  element={
    <ProtectedRoute>
      <Layout>
        <ScreeningHistory />
      </Layout>
    </ProtectedRoute>
  }
/>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
