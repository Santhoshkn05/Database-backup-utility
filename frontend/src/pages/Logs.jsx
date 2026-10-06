import {
  ScrollText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X
} from "lucide-react";

import axios from "axios";
import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

const API_URL = "http://localhost:3000";

function Logs() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [databaseFilter, setDatabaseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [databases, setDatabases] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const logsPerPage = 10;

  useEffect(() => {
    let isCurrent = true;
    const loadLogs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", {replace: true});
          return;
        }
        const headers = {
          Authorization : `Bearer ${token}`
        };

        const databaseResponse = await axios.get(
          `${API_URL}/databases`,
          {headers}
        );
        const databaseList = databaseResponse.data.data || [];
        if (!isCurrent) return;
        setDatabases(databaseList);

        const logResponses = await Promise.allSettled(
          databaseList.map((database) => 
          axios.get(
            `${API_URL}/databases/${database.id}/logs`,
            {headers}
          )
        )
      );
      const allLogs = [];
      let logLoadFailed = false;
      logResponses.forEach((result, index) => {
        if (result.status === "rejected") {
          if (result.reason.response?.status === 401) throw result.reason;
          logLoadFailed = true;
          console.error("Failed to fetch logs for database:", result.reason);
          return;
        }
        const response = result.value;
        const database = databaseList[index];
        const databaseLogs = response.data.data || [];
        databaseLogs.forEach((log) => {
          allLogs.push({
            ...log,
            database_name: database.name,
            db_type: database.db_type
          });
        });
      });
      allLogs.sort(
        (a,b) =>
          new Date(b.created_at) - new Date(a.created_at)
      );
      if (!isCurrent) return;
      setLogs(allLogs);
      setError(logLoadFailed ? "Some database logs could not be loaded." : "");
    } catch (error) {
      console.error("Failed to fetch logs: ", error);
      if (!isCurrent) return;
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(
        error.response?.data?.error ||
        "Failed to load logs."
      );
    } finally {
      if (isCurrent) setIsLoading(false);
    }
  };
  loadLogs();
  return () => { isCurrent = false; };
}, [navigate]);


const getLogLevel = (status) => {
  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === "success") {
    return "success";
  }
  
  if (normalizedStatus === "failed" || normalizedStatus === "error") {
    return "error";
  }

  if (normalizedStatus === "warning") {
    return "warning";
  }
  return "info";
}

const filteredLogs = useMemo(() => {
  const query = search.trim().toLowerCase();
  return logs.filter((log) => {
    const level = getLogLevel(log.status);
    const matchesSearch = 
          !query ||
          log.message?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.database_name?.toLowerCase().includes(query) ||
          log.status?.toLowerCase().includes(query);

      const matchesLevel = 
        levelFilter === "all" ||
        level === levelFilter;
      
      const matchesService = 
        serviceFilter === "all" ||
        log.action?.toLowerCase() === serviceFilter;
      const matchesDatabase = databaseFilter === "all" ||
        String(log.database_id) === databaseFilter;

        return (
          matchesSearch &&
          matchesLevel &&
          matchesService &&
          matchesDatabase
        );
  });
}, [logs, search, levelFilter, serviceFilter, databaseFilter]);

const paginatedLogs = useMemo(() => {
  const startIndex = 
    (currentPage - 1) * logsPerPage;

  return filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );
}, [filteredLogs, currentPage]);

useEffect(() => {
  setCurrentPage(1);
}, [search, levelFilter, serviceFilter, databaseFilter]);

const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
const services = [...new Set(logs.map((log) => log.action?.toLowerCase()).filter(Boolean))].sort();

const totalLogs = logs.length;
const successfulLogs = logs.filter(
  (log) => getLogLevel(log.status) === "success"
).length;

const warningLogs = logs.filter(
  (log) => getLogLevel(log.status) === "warning").length;

  const errorLogs = logs.filter(
    (log) => getLogLevel(log.status) === "error"
  ).length;

  const formatDate = (date) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getLevelIcon = (level) => {
    if (level === "success") {
      return <CheckCircle2 size={15} />;
    }

    if (level === "error") {
      return <XCircle size={15} />;
    }

    if (level === "warning") {
      return <AlertTriangle size={15} />;
    }

    return <Info size={15} />;
  };

  const getLevelLabel = (level) => {
    if (level === "success") return "Success";
    if (level === "error") return "Error";
    if (level === "warning") return "Warning";
    return "Info";
  }
  const getEventTitle = (log) => {
    const action = log.action || "System";
    const titleAction = `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
    const statusTitles = {
      success: "completed",
      failed: "failed",
      error: "failed",
      started: "started",
      warning: "warning"
    };
    return `${titleAction} ${statusTitles[log.status?.toLowerCase()] || "activity"}`;
  };

  const firstDisplayedLog = filteredLogs.length === 0
    ? 0
    : (currentPage - 1) * logsPerPage + 1;
  const lastDisplayedLog = Math.min(currentPage * logsPerPage, filteredLogs.length);

  return (
    <div className="logs-page">

      <div className="page-header">
        <div>
          <h2>Logs</h2>
          <p>Monitor backup operations, system events and errors.</p>
        </div>

      </div>

      <div className="logs-toolbar">

        <div className="logs-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select className="logs-select" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label="Filter by level">
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>

        <select className="logs-select" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} aria-label="Filter by service">
          <option value="all">All Services</option>
          {services.map((service) => (
            <option key={service} value={service}>{service.charAt(0).toUpperCase() + service.slice(1)}</option>
          ))}
        </select>

        <select className="logs-select" value={databaseFilter} onChange={(event) => setDatabaseFilter(event.target.value)} aria-label="Filter by database">
          <option value="all">All Databases</option>
          {databases.map((database) => (
            <option key={database.id} value={String(database.id)}>{database.name}</option>
          ))}
        </select>

      </div>

      {/* Log Summary */}
      <div className="logs-summary">

        <div className="logs-summary-card">
          <div className="logs-summary-icon blue">
            <ScrollText size={21} />
          </div>

          <div>
            <span>Total Logs</span>
            <strong>{totalLogs}</strong>
          </div>
        </div>

        <div className="logs-summary-card">
          <div className="logs-summary-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Successful</span>
            <strong>{successfulLogs}</strong>
          </div>
        </div>

        <div className="logs-summary-card">
          <div className="logs-summary-icon orange">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Warnings</span>
            <strong>{warningLogs}</strong>
          </div>
        </div>

        <div className="logs-summary-card">
          <div className="logs-summary-icon red">
            <XCircle size={21} />
          </div>

          <div>
            <span>Errors</span>
            <strong>{errorLogs}</strong>
          </div>
        </div>

      </div>

      {/* Logs Table */}
      <div className="logs-table-card">

        <div className="logs-table-header">

          <div>
            <h3>Activity Logs</h3>
            <p>Recent system and database activity</p>
          </div>

        </div>

        <div className="logs-table-wrapper">

          <table className="logs-table">

            <thead>
              <tr>
                <th>Level</th>
                <th>Event</th>
                <th>Service</th>
                <th>Database</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan="6">Loading logs...</td></tr>
              ) : paginatedLogs.length === 0 ? (
                <tr><td colSpan="6">{error ? "Logs could not be loaded." : "No logs match your filters."}</td></tr>
              ) : paginatedLogs.map((log) => {
                const level = getLogLevel(log.status);
                return (
                  <tr key={`${log.database_id}-${log.id}`}>
                    <td>
                      <span className={`log-level ${level}`}>
                        {getLevelIcon(level)}
                        {getLevelLabel(level)}
                      </span>
                    </td>
                    <td>
                      <div className="log-event">
                        <strong>{getEventTitle(log)}</strong>
                        <span>{log.message || "No additional details"}</span>
                      </div>
                    </td>
                    <td><span className="log-service">{log.action || "System"}</span></td>
                    <td>{log.database_name || "-"}</td>
                    <td>{formatDate(log.created_at)}</td>
                    <td>
                      <button className="log-details-button" onClick={() => setSelectedLog(log)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

        </div>

        {/* Pagination */}
        <div className="logs-pagination">

          <span>Showing {firstDisplayedLog}–{lastDisplayedLog} of {filteredLogs.length} logs</span>

          <div className="logs-pagination-buttons">
            <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>Next</button>
          </div>

        </div>

      </div>

      {error && <div className="logs-error" role="alert">{error}</div>}

      {selectedLog && (
        <div className="database-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedLog(null);
        }}>
          <section className="database-modal" role="dialog" aria-modal="true" aria-labelledby="log-details-title">
            <div className="database-modal-header">
              <div>
                <h2 id="log-details-title">{getEventTitle(selectedLog)}</h2>
                <p>{selectedLog.database_name || "System"} · {formatDate(selectedLog.created_at)}</p>
              </div>
              <button className="database-modal-close" type="button" onClick={() => setSelectedLog(null)} aria-label="Close details">
                <X size={18} />
              </button>
            </div>
            <p className="log-detail-message">{selectedLog.message || "No additional details"}</p>
            <dl className="log-detail-fields">
              <div><dt>Service</dt><dd>{selectedLog.action || "System"}</dd></div>
              <div><dt>Status</dt><dd>{selectedLog.status || "Unknown"}</dd></div>
              <div><dt>Log ID</dt><dd>{selectedLog.id}</dd></div>
            </dl>
          </section>
        </div>
      )}

    </div>
  );
}

export default Logs;