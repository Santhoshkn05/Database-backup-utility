import axios from "axios";
import {useEffect, useState} from "react";
import {Navigate, Outlet, useLocation} from "react-router-dom";

function ProtectedRoute() {
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState(() =>
    localStorage.getItem("token") ? "checking" : "unauthenticated"
  );
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const token = localStorage.getItem("token");
    if (!token) {
      setAuthStatus("unauthenticated");
      return () => { isCurrent = false; };
    }

    setAuthStatus("checking");
    axios.get("http://localhost:3000/auth/me", {
      headers: {Authorization: `Bearer ${token}`}
    }).then(() => {
      if (isCurrent) setAuthStatus("authenticated");
    }).catch((error) => {
      if (!isCurrent) return;
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setAuthStatus("unauthenticated");
      } else {
        setAuthStatus("unavailable");
      }
    });

    return () => { isCurrent = false; };
  }, [retryCount]);

  if (authStatus === "checking") {
    return <div className="auth-page"><div className="auth-card">Checking your session...</div></div>;
  }

  if (authStatus === "unavailable") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Backend unavailable</h1>
            <p>Your session could not be verified. The backend must be running to use the application.</p>
          </div>
          <button className="auth-submit-button" onClick={() => setRetryCount((count) => count + 1)}>
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <Navigate to="/login" replace state={{from: location.pathname}} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;