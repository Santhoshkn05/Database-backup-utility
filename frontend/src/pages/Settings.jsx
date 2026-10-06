import {
  Save,
  Mail,
  Lock,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import axios from "axios";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

const API_URL = "http://localhost:3000";
const defaultPreferences = {
  notify_backup_success: true,
  notify_backup_failure: true,
  default_retention_count: 7
};

function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({id: "", name: "", email: ""});
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwords, setPasswords] = useState({currentPassword: "", newPassword: "", confirmPassword: ""});

  useEffect(() => {
    let isCurrent = true;
    const loadSettings = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", {replace: true});
        return;
      }
      const headers = {Authorization: `Bearer ${token}`};
      try {
        const [profileResult, settingsResult] = await Promise.allSettled([
          axios.get(`${API_URL}/auth/me`, {headers}),
          axios.get(`${API_URL}/auth/settings`, {headers})
        ]);
        if (!isCurrent) return;

        const unauthorized = [profileResult, settingsResult].some(
          (result) => result.status === "rejected" && result.reason.response?.status === 401
        );
        if (unauthorized) {
          localStorage.removeItem("token");
          navigate("/login", {replace: true});
          return;
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data.data);
        } else {
          setError(profileResult.reason.response?.data?.error || "Failed to load profile.");
        }
        if (settingsResult.status === "fulfilled") {
          setPreferences({...defaultPreferences, ...settingsResult.value.data.data});
        } else {
          setError(settingsResult.reason.response?.data?.error || "Failed to load preferences.");
        }

        try {
          const healthResponse = await axios.get(`${API_URL}/health`);
          if (isCurrent) setHealth(healthResponse.data.data);
        } catch {
          if (isCurrent) setHealth({api: "Unavailable", postgresql: "Unknown", cloudStorage: "Unknown"});
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError.response?.data?.error || "Failed to load settings.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    loadSettings();
    return () => { isCurrent = false; };
  }, [navigate]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const headers = {Authorization: `Bearer ${token}`};
      const [profileResponse] = await Promise.all([
        axios.patch(`${API_URL}/auth/me`, {name: profile.name, email: profile.email}, {headers}),
        axios.put(`${API_URL}/auth/settings`, preferences, {headers})
      ]);
      setProfile(profileResponse.data.data);
      setSuccess("Settings saved.");
    } catch (saveError) {
      if (saveError.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(saveError.response?.data?.error || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/auth/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, {headers: {Authorization: `Bearer ${token}`}});
      setPasswords({currentPassword: "", newPassword: "", confirmPassword: ""});
      setPasswordMessage("Password changed successfully.");
    } catch (passwordRequestError) {
      if (passwordRequestError.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setPasswordError(passwordRequestError.response?.data?.error || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const refreshHealth = async () => {
    setIsRefreshingHealth(true);
    try {
      const response = await axios.get(`${API_URL}/health`);
      setHealth(response.data.data);
    } catch {
      setHealth({api: "Unavailable", postgresql: "Unknown", cloudStorage: "Unknown"});
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  const setPreference = (key, value) => {
    setPreferences((current) => ({...current, [key]: value}));
    setSuccess("");
  };

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="settings-page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your account, notifications and backup preferences.</p>
        </div>

        <button className="save-settings-button" onClick={handleSave} disabled={isLoading || isSaving}>
          <Save size={17} />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>

      {error && <div className="settings-message error" role="alert">{error}</div>}
      {success && <div className="settings-message success" role="status">{success}</div>}

      {/* Settings Layout */}
      <div className="settings-layout">
        {/* Settings Content */}
        <div className="settings-content">

          {/* Profile */}
          <div className="settings-card" id="profile">

            <div className="settings-card-header">
              <div>
                <h3>Profile Information</h3>
                <p>Update your account information.</p>
              </div>
            </div>

            {isLoading ? <p>Loading account...</p> : <>
            <div className="profile-section">

              <div className="profile-avatar">
                {initials}
              </div>

              <div>
                <h4>{profile.name}</h4>
                <p>{profile.email}</p>
              </div>

            </div>

            <div className="settings-form-grid">

              <div className="settings-field">
                <label htmlFor="settings-name">Full Name</label>

                <input
                  id="settings-name"
                  type="text"
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({...current, name: event.target.value}))}
                />
              </div>

              <div className="settings-field">
                <label htmlFor="settings-email">Email Address</label>

                <div className="input-with-icon">
                  <Mail size={16} />

                  <input
                    id="settings-email"
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((current) => ({...current, email: event.target.value}))}
                  />
                </div>
              </div>

            </div>
            </>}

          </div>

          {/* Notifications */}
          <div className="settings-card" id="notifications">

            <div className="settings-card-header">
              <div>
                <h3>Notifications</h3>
                <p>Choose which notifications you want to receive.</p>
              </div>
            </div>

            <div className="settings-options">

              <div className="settings-option">
                <div>
                  <strong>Backup Completed</strong>
                  <span>
                    Email the account address when a backup finishes successfully.
                  </span>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.notify_backup_success}
                    onChange={(event) => setPreference("notify_backup_success", event.target.checked)}
                  />
                  <span></span>
                </label>
              </div>

              <div className="settings-option">
                <div>
                  <strong>Backup Failed</strong>
                  <span>
                    Email the account address when a backup fails.
                  </span>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preferences.notify_backup_failure}
                    onChange={(event) => setPreference("notify_backup_failure", event.target.checked)}
                  />
                  <span></span>
                </label>
              </div>

            </div>

          </div>

          {/* Backup Settings */}
          <div className="settings-card" id="backup-settings">

            <div className="settings-card-header">
              <div>
                <h3>Backup Preferences</h3>
                <p>Set how many successful backups to retain for each database.</p>
              </div>
            </div>

            <div className="settings-form-grid">

              <div className="settings-field">
                <label htmlFor="settings-retention">Default Retention</label>

                <select id="settings-retention" value={preferences.default_retention_count} onChange={(event) => setPreference("default_retention_count", Number(event.target.value))}>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

            </div>

          </div>

          {/* Security */}
          <div className="settings-card" id="security">

            <div className="settings-card-header">
              <div>
                <h3>Security</h3>
                <p>Manage your account security settings.</p>
              </div>
            </div>

            <form className="settings-password-form" onSubmit={handlePasswordChange}>

              <div className="security-icon">
                <Lock size={19} />
              </div>

              <div className="security-info">
                <strong>Change password</strong>
                <span>Use your current password to set a new one.</span>
              </div>
              <div className="settings-password-fields">
                <label>Current password<input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({...current, currentPassword: event.target.value}))} required /></label>
                <label>New password<input type="password" autoComplete="new-password" minLength="8" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({...current, newPassword: event.target.value}))} required /></label>
                <label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({...current, confirmPassword: event.target.value}))} required /></label>
              </div>
              {passwordError && <div className="settings-message error" role="alert">{passwordError}</div>}
              {passwordMessage && <div className="settings-message success" role="status">{passwordMessage}</div>}
              <button className="change-password-button" type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Updating..." : "Change Password"}
              </button>
            </form>

          </div>

          <div className="settings-card" id="storage">
            <div className="settings-card-header">
              <div>
                <h3>Storage and Service Health</h3>
                <p>Current connectivity reported by the backend.</p>
              </div>
              <button className="edit-database-button" onClick={refreshHealth} disabled={isRefreshingHealth}>
                <RefreshCw size={15} />
                {isRefreshingHealth ? "Checking..." : "Refresh"}
              </button>
            </div>
            <div className="settings-health-list">
              {[ ["API", health?.api], ["PostgreSQL", health?.postgresql], ["Cloud storage", health?.cloudStorage] ].map(([label, status]) => (
                <div className="settings-health-row" key={label}>
                  <span>{label}</span>
                  <strong className={status === "Operational" || status === "Connected" ? "healthy" : "unavailable"}>
                    {status || "Checking"}
                    {status === "Operational" || status === "Connected" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </strong>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Settings;