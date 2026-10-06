import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  KeyRound,
  CheckCircle2
} from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    /*
     * Backend password-reset API will be connected here.
     *
     * For now this validates the form and shows the
     * reset-request state.
     */

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 800);
  };

  return (
    <div className="auth-page">

      <div className="auth-card forgot-password-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <KeyRound size={24} />
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1>Forgot your password?</h1>

          <p>
            Enter your email address and we'll help you
            reset your password.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="forgot-success-message">

            <CheckCircle2 size={18} />

            <div>
              <strong>Reset request submitted</strong>

              <span>
                If an account exists with this email,
                you will receive password reset instructions.
              </span>
            </div>

          </div>
        )}

        {!success && (
          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            {/* Email */}
            <div className="auth-field">

              <label htmlFor="forgot-email">
                Email Address
              </label>

              <div className="auth-input-wrapper">

                <Mail size={17} />

                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  autoComplete="email"
                />

              </div>

            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>

          </form>
        )}

        {/* Back to Login */}
        <div className="forgot-back-login">

          <Link to="/login">
            <ArrowLeft size={15} />
            <span>Back to Login</span>
          </Link>

        </div>

      </div>

    </div>
  );
}

export default ForgotPassword;