import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import axios from "axios";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:3000/auth/login",
        {
          email,
          password
        }
      );

      const token = response.data?.data.token;

      if (!token) {
        setError("Login succeeded but no token was returned.");
        return;
      }

      // Save JWT
      localStorage.setItem("token", token);

      // Save user information if backend returns it
      if (response.data?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );
      }

      navigate("/");

    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        (error.response
          ? "Invalid email or password."
          : "Cannot reach the backend. Start the backend server and try again.")
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">

          <div className="auth-logo-icon">
            <LogIn size={24} />
          </div>

        </div>

        {/* Header */}
        <div className="auth-header">

          <h1>Welcome back</h1>

          <p>
            Login to manage your database backups.
          </p>

        </div>

        {/* Error */}
        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* Email */}
          <div className="auth-field">

            <label htmlFor="email">
              Email Address
            </label>

            <div className="auth-input-wrapper">

              <Mail size={17} />

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
              />

            </div>

          </div>

          {/* Password */}
          <div className="auth-field">

            <div className="password-label-row">

              <label htmlFor="password">
                Password
              </label>

              <Link
                to="/forgot-password"
                className="forgot-password-button"
              >
                Forgot password?
              </Link>

            </div>

            <div className="auth-input-wrapper">

              <Lock size={17} />

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>

            </div>

          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>

        </form>

        {/* Register */}
        <div className="auth-footer">

          <span>
            Don't have an account?
          </span>

          <Link to="/register">
            Create Account
          </Link>

        </div>

      </div>

    </div>
  );
}

export default Login;