import {
  Database,
  CircleCheck,
  CalendarClock,
  HardDrive,
  X,
  CalendarDays,
  ChevronDown,
  Pause,
  Play,
  RefreshCw
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { fetchDashboardData, fetchSystemStatus } from "../services/dashboardApi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString();
}

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [dateRange, setDateRange] = useState(7);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [targetDatabase, setTargetDatabase] = useState("");
  const [systemStatus, setSystemStatus] = useState({
    api: "Checking...",
    postgresql: "Checking...",
    cloudStorage: "Checking..."
  });

  useEffect(() => {
    let isCurrent = true;
    const loadDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", {replace: true});
        return;
      }

      setIsRefreshing(true);
      const [dashboardResult, statusResult] = await Promise.allSettled([
        fetchDashboardData(token),
        fetchSystemStatus()
      ]);
      if (!isCurrent) return;

      if (dashboardResult.status === "fulfilled") {
        setDashboardData(dashboardResult.value);
        setDatabases(dashboardResult.value.databases || []);
        setDashboardError("");
      } else {
        const error = dashboardResult.reason;
        setDashboardError(error.response?.data?.error || "Dashboard data could not be loaded.");
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", {replace: true});
        }
      }

      if (statusResult.status === "fulfilled") {
        setSystemStatus(statusResult.value);
      } else {
        setSystemStatus({api: "Unavailable", postgresql: "Unknown", cloudStorage: "Unknown"});
      }

      setIsLoading(false);
      setIsRefreshing(false);
    };

    loadDashboard();
    return () => { isCurrent = false; };
  }, [navigate, reloadKey]);

  useEffect(() => {
    if (!isAutoRefreshEnabled) return undefined;
    const refreshTimer = window.setInterval(() => {
      setReloadKey((previous) => previous + 1);
    }, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [isAutoRefreshEnabled]);

  const backups = dashboardData?.backups || [];
  const schedules = dashboardData?.schedules || [];
  const activeSchedules = schedules.filter((schedule) => schedule.is_active === true);
  const recentBackups = [...backups]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  const today = new Date();
  const rangeStart = new Date(today);
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - dateRange + 1);
  const successfulBackupsInRange = backups.filter((backup) => {
    const createdAt = new Date(backup.created_at);
    return backup.status === "success" && createdAt >= rangeStart && createdAt <= today;
  });
  const backupActivity = Array.from({length: dateRange}, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    const key = dateKey(date);
    const count = successfulBackupsInRange.filter(
      (backup) => dateKey(new Date(backup.created_at)) === key
    ).length;
    return {
      day: dateRange > 7
        ? date.toLocaleDateString("en-US", {month: "short", day: "numeric"})
        : date.toLocaleDateString("en-US", {weekday: "short"}),
      backups: count
    };
  });
  const totalDatabases = databases.length;
  const successfulBackups = successfulBackupsInRange.length;
  const scheduledJobs = activeSchedules.length;
  const storageUsed = dashboardData ? formatBytes(Number(dashboardData.localStorageBytes)) : "—";

    useEffect(() => {
        if (!isSchedulesModalOpen && !isDateRangeOpen) return undefined;

      const closeOnEscape = (event) => {
          if (event.key === "Escape") {
            setIsSchedulesModalOpen(false);
            setIsDateRangeOpen(false);
          }
      };

      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
      }, [isSchedulesModalOpen, isDateRangeOpen]);

  const serviceStatuses = [systemStatus.api, systemStatus.postgresql, systemStatus.cloudStorage];
  const handleRestore = async() => {
    if (!selectedBackup) {
      return;
    }
    if (!targetDatabase.trim()) {
      alert("Please enter a target database");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:3000/backups/${selectedBackup.id}/restore`,
        {
          targetDatabase: targetDatabase.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      console.log("Restore response:", response.data);
      alert("Backup restored successfully");
      setIsRestoreModalOpen(false);
      setSelectedBackup(null);
      setTargetDatabase("");
    } catch (error) {
      console.error("Restore failed:", error);
      if(error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      alert(
        error.response?.data?.error ||"Failed to restore backup"
      );
    }
  };

  const servicesOperational = serviceStatuses
    .every((status) => status === "Operational" || status === "Connected");
  const servicesChecking = serviceStatuses.some((status) => status === "Checking...");
  const serviceStatusClass = (status) => {
    if (status === "Checking...") return "checking";
    return status === "Operational" || status === "Connected" ? "online" : "offline";
  };

  return (
    <div className="dashboard">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Monitor your databases, backups and scheduled jobs.</p>
        </div>
      </div>

      {/* Dashboard Toolbar */}
      {dashboardError && (
        <div className="dashboard-error" role="alert">
          {dashboardError}
          {dashboardData && " Showing the last successfully loaded data."}
        </div>
      )}

      <div className="dashboard-toolbar">
        <div className="date-range-picker">
          <button
            type="button"
            className="date-button"
            aria-expanded={isDateRangeOpen}
            onClick={() => setIsDateRangeOpen((previous) => !previous)}
          >
            <CalendarDays size={16} />
            <span>Last {dateRange} days</span>
            <ChevronDown size={15} />
          </button>
          {isDateRangeOpen && (
            <div className="date-range-menu" role="group" aria-label="Activity date range">
              {[7, 30, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  className={dateRange === days ? "selected" : ""}
                  aria-pressed={dateRange === days}
                  onClick={() => {
                    setDateRange(days);
                    setIsDateRangeOpen(false);
                  }}
                >
                  Last {days} days
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="toolbar-button"
          aria-label={isAutoRefreshEnabled ? "Pause automatic refresh" : "Resume automatic refresh"}
          aria-pressed={!isAutoRefreshEnabled}
          title={isAutoRefreshEnabled ? "Pause automatic refresh" : "Resume automatic refresh"}
          onClick={() => setIsAutoRefreshEnabled((previous) => !previous)}
        >
          {isAutoRefreshEnabled ? <Pause size={17} /> : <Play size={17} />}
        </button>

        <button
          type="button"
          className="run-button"
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
          disabled={isRefreshing}
          onClick={() => setReloadKey((previous) => previous + 1)}
        >
          <RefreshCw size={17} className={isRefreshing ? "refreshing" : ""} />
        </button>
      </div>

      {/* Summary Cards */}
    <div className="summary-grid">

    <div className="summary-card">
        <div className="summary-icon database-icon">
            <Database size={24} />
        </div>

        <span>Total Databases</span>
        <h3>{dashboardData ? totalDatabases : isLoading ? "..." : "—"}</h3>
        <p>Connected databases</p>
    </div>

    <div className="summary-card">
        <div className="summary-icon backup-icon">
        <CircleCheck size={24} />
        </div>

        <span>Successful Backups</span>

        <h3>{dashboardData ? successfulBackups : isLoading ? "..." : "—"}</h3>
        <p>Successful in the last {dateRange} days</p>
    </div>


    <div className="summary-card">
        <div className="summary-icon schedule-icon">
        <CalendarClock size={24} />
        </div>

        <span>Scheduled Jobs</span>

        <h3>{dashboardData ? scheduledJobs : isLoading ? "..." : "—"}</h3>

        <p>Active schedules</p>
    </div>


    <div className="summary-card">
      <div className="summary-icon storage-icon">
        <HardDrive size={24} />
      </div>
      <span>Local Storage</span>
      <h3>{dashboardData ? storageUsed : isLoading ? "..." : "—"}</h3>
      <p>Retained local backup files</p>
    </div>

    </div>

      {/* Backup Activity + Upcoming Schedules */}
      <div className="dashboard-grid">

        {/* Backup Activity */}
        <div className="dashboard-card activity-card">

          <div className="card-header">
            <div>
              <h3>Backup Activity</h3>
              <p>Successful backups over the last {dateRange} days</p>
            </div>
          </div>

          <div className="activity-chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={backupActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                
                <Line
                  type="monotone"
                  dataKey="backups"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{r: 4}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Schedules */}
        <div className="dashboard-card upcoming-card">

          <div className="card-header">
            <div>
              <h3>Upcoming Schedules</h3>
              <p>Next scheduled backups</p>
            </div>

            <button
              type="button"
              className="view-all-schedules"
              onClick={() => setIsSchedulesModalOpen(true)}
            >
              View all
            </button>
          </div>

          {activeSchedules.slice(0, 3).map((schedule, index) => (
            <div
              className={`schedule-item ${index === 0 ? "highlighted" : ""}`}
              key={schedule.id}
            >
              <div>
                <strong>{schedule.databaseName}</strong>
                <span>
                  {schedule.schedule}
                </span>
                <small>Next run: {formatDateTime(schedule.nextRunAt)}</small>
                <small>Active</small>
              </div>
            </div>
          ))}

          {dashboardData && activeSchedules.length === 0 && (
            <p className="empty-schedules">No active schedules.</p>
          )}

          <Link to="/schedules" className="manage-schedules">
            Manage schedules →
          </Link>

        </div>

      </div>

      {isSchedulesModalOpen && (
        <div
          className="schedules-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsSchedulesModalOpen(false);
            }
          }}
        >
          <section
            className="schedules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-schedules-title"
          >
            <div className="schedules-modal-header">
              <div>
                <h2 id="all-schedules-title">Upcoming Schedules</h2>
                <p>All active scheduled backups</p>
              </div>
              <button
                type="button"
                className="close-schedules-modal"
                aria-label="Close upcoming schedules"
                onClick={() => setIsSchedulesModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="schedules-modal-list">
              {activeSchedules.length > 0 ? (
                activeSchedules.map((schedule) => (
                  <div className="schedule-item" key={schedule.id}>
                    <div>
                      <strong>{schedule.databaseName}</strong>
                      <span>{schedule.schedule}</span>
                      <small>Next run: {formatDateTime(schedule.nextRunAt)}</small>
                      <small>Active</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-schedules">No active schedules.</p>
              )}
            </div>

            <div className="schedules-modal-footer">
              <Link to="/schedules" className="manage-schedules">
                Manage schedules →
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Recent Backups */}
      <div className="dashboard-card recent-backups">

        <div className="card-header">
          <div>
            <h3>Recent Backups</h3>
            <p>Latest backup operations</p>
          </div>

          <Link to="/backups" className="secondary-button">
            View All
          </Link>
        </div>

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>Database</th>
                <th>Created</th>
                <th>Size</th>
                <th>Status</th>
                <th>Cloud</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {recentBackups.map((backup) => (
                <tr key = {backup.id}>
                  <td>{backup.databaseName}</td>
                  <td>
                    {new Date(backup.created_at).toLocaleString()}
                  </td>

                  <td>
                    {backup.file_size
                      ? Number(backup.file_size) >= 1024 * 1024
                        ? `${(Number(backup.file_size) / (1024 * 1024)).toFixed(2)}MB`
                        : `${(Number(backup.file_size) / 1024).toFixed(2)}KB`
                        :"-"}
                  </td>

                  <td>
                    <span className={`status ${
                    backup.status === "success" ? "success" : "pending"
                    }`} >
                      {backup.status}
                    </span>
                  </td>
                  
                  <td>
                    <span className={`status ${
                      backup.cloud_status === "uploaded"
                      ?"success"
                      :"pending"
                    }`}
                    >
                      {backup.cloud_status === "uploaded"
                      ?"uploaded"
                    :"Pending"}
                    </span>
                  </td>
                  <td>
                    <button className="table-button"
                    onClick={() => {
                      setSelectedBackup(backup);
                      setTargetDatabase("");
                      setIsRestoreModalOpen(true);
                    }}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
              {dashboardData && recentBackups.length === 0 && (
                <tr>
                  <td colSpan="6" className="dashboard-empty-cell">No backups have been recorded yet.</td>
                </tr>
              )}
            </tbody>

          </table>

        </div>

      </div>

      {/* System Status */}
      <div className="dashboard-card system-status">

        <div className="system-status-header">

          <div>
            <h3>System Status</h3>
            <p>Current backup utility services</p>
          </div>

          <span className={`system-operational ${servicesOperational ? "" : "system-degraded"}`}>
            {servicesOperational
              ? "All systems operational"
              : servicesChecking
                ? "Checking service status"
                : "Service issue detected"}
          </span>

        </div>

        <div className="system-status-list">

          {[
            {name: "API Server", status: systemStatus.api},
            {name: "PostgreSQL", status: systemStatus.postgresql},
            {name: "Cloud Storage", status: systemStatus.cloudStorage}
          ].map((service) => (
            <div className="system-item" key={service.name}>
              <span className={`status-dot ${serviceStatusClass(service.status)}`}></span>
              <span>{service.name}</span>
              <strong className={serviceStatusClass(service.status)}>{service.status}</strong>
            </div>
          ))}

        </div>

      </div>

      {isRestoreModalOpen && selectedBackup && (
  <div className="modal-overlay">
    <div className="modal">
      
      <div className="modal-header">
        <div>
          <h2>Restore Backup</h2>
          <p>Restore this backup to a database.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          onClick={() => {
            setIsRestoreModalOpen(false);
            setSelectedBackup(null);
            setTargetDatabase("");
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="restore-details">

        <div className="restore-detail">
          <span>Source Database</span>
          <strong>{selectedBackup.databaseName}</strong>
        </div>

        <div className="restore-detail">
          <span>Backup</span>
          <strong>
            {new Date(selectedBackup.created_at).toLocaleString()}
          </strong>
        </div>

        <div className="restore-detail">
          <span>Backup Size</span>
          <strong>
            {selectedBackup.file_size
              ? `${(Number(selectedBackup.file_size) / 1024).toFixed(2)} KB`
              : "Unknown"}
          </strong>
        </div>

      </div>

      <div className="restore-target">
        <label htmlFor="targetDatabase">
          Restore To
        </label>

        <select
          id="targetDatabase"
          value={targetDatabase}
          onChange={(event) => setTargetDatabase(event.target.value)}
        >
          <option value="">
            Select target database
          </option>

          {databases.map((database) => (
            <option
              key={database.id}
              value={database.database_name}
            >
              {database.name} ({database.db_type})
            </option>
          ))}
        </select>
      </div>

      <div className="restore-warning">
        <strong>Before restoring</strong>
        <p>
          The selected target database will receive the backup data.
        </p>
      </div>

      <div className="modal-actions">

        <button
          type="button"
          className="modal-cancel"
          onClick={() => {
            setIsRestoreModalOpen(false);
            setSelectedBackup(null);
            setTargetDatabase("");
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          className="modal-restore"
          onClick={handleRestore}
          disabled={!targetDatabase}
        >
          Restore
        </button>

      </div>

    </div>
  </div>
      )}
    </div>
  );
}

export default Dashboard;