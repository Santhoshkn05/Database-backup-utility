import {
    Archive,
    Search,
    Download,
    RotateCcw,
    CheckCircle2,
    Clock3,
    XCircle,
    X
} from "lucide-react";
import axios from "axios";
import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

const API_URL = "http://localhost:3000";

function Backups() {
  const navigate = useNavigate();
  
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [databaseFilter, setDatabaseFilter] = useState("all");
  const [databases, setDatabases] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
  const [targetDatabase, setTargetDatabase] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const loadBackups = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", {replace: true});
          return;
        }
        const headers = {
          Authorization: `Bearer ${token}`
        };
        const databasesResponse = await axios.get(
          `${API_URL}/databases`,
          {headers}
        );
        const databaseList = databasesResponse.data.data || [];
        setDatabases(databaseList);
        setSelectedDatabaseId((current) =>
          databaseList.some((database) => String(database.id) === current)
            ? current
            : String(databaseList[0]?.id || "")
        );

        const backupResponses = await Promise.allSettled(
          databaseList.map((database) => 
            axios.get(
              `${API_URL}/databases/${database.id}/backups`,
              {headers}
            ))
        );

        const allBackups = [];
        let historyLoadFailed = false;
        backupResponses.forEach((result, index) => {
          if (result.status === "rejected") {
            if (result.reason.response?.status === 401) {
              throw result.reason;
            }
            historyLoadFailed = true;
            console.error("Failed to fetch backup history:", result.reason);
            return;
          }

          const response = result.value;
          const database=databaseList[index];
          (response.data.data || []).forEach((backup) => {
            allBackups.push({
              ...backup,
              database_name: database.name,
              target_database_name: database.database_name,
              db_type: database.db_type
            });
          });
        });
        allBackups.sort(
          (a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        setBackups(allBackups);
        setError(historyLoadFailed ? "Some backup histories could not be loaded." : "");
      } catch (error) {
        console.error("Failed to fetch backups:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", {replace: true});
          return;
        }
        setError(
          error.response?.data?.error ||
          "Failed to load backups."
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadBackups();
  }, [navigate, reloadKey]);

  const filteredBackups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return backups.filter((backup) => {
      const matchesSearch = 
        !query ||
        backup.file_name?.toLowerCase().includes(query) ||
        backup.database_name?.toLowerCase().includes(query);

      const matchesDatabase = databaseFilter === "all" ||
        String(backup.database_id) === databaseFilter;
      const backupStatus = backup.status?.toLowerCase();
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "running"
          ? ["running", "in_progress", "started"].includes(backupStatus)
          : backupStatus === statusFilter);

        return (
          matchesSearch &&
          matchesDatabase &&
          matchesStatus
        );
    });
  }, [
    backups,
    search,
    databaseFilter,
    statusFilter
  ]);

  const totalBackups = backups.length;
  const successfulbackups = backups.filter(
    (backup) => backup.status?.toLowerCase() === "success"
  ).length;

  const failedBackups = backups.filter(
    (backup) => backup.status?.toLowerCase() === "failed"
  ).length;

  const inProgressBackups = backups.filter(
    (backup) =>
    ["running", "in_progress", "started"].includes(
      backup.status?.toLowerCase()
    )
  ).length;

  const handleCreateBackup = async (event) => {
    event.preventDefault();
    if (!selectedDatabaseId) return;
    setIsWorking(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/databases/${selectedDatabaseId}/backup`,
        {},
        {headers: {Authorization: `Bearer ${token}`}}
      );
      setDialog(null);
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      if (actionError.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(actionError.response?.data?.error || "Failed to create backup.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRestoreBackup = async (event) => {
    event.preventDefault();
    if (!dialog?.backup || !targetDatabase.trim()) return;
    setIsWorking(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/backups/${dialog.backup.id}/restore`,
        {targetDatabase: targetDatabase.trim()},
        {headers: {Authorization: `Bearer ${token}`}}
      );
      setDialog(null);
    } catch (actionError) {
      if (actionError.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(actionError.response?.data?.error || "Failed to restore backup.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDownloadBackup = async (backup) => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/backups/${backup.id}/download`,
        {
          headers: {Authorization: `Bearer ${token}`},
          responseType: "blob"
        }
      );
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = backup.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (actionError) {
      if (actionError.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(actionError.response?.data?.error || "Failed to download backup.");
    }
  };

    return (
        <div className= "backups-page">
            <div className = "page-header">
                <div>
                    <h2>Backups</h2>
                    <p>View, manage and restore your Databases backups.</p>
                </div>
                <button
                  className="backup-button"
                  onClick={() => setDialog({type: "create"})}
                  disabled={isLoading || isWorking}
                >
                  <Archive size={18} />
                    <span>Create Backup</span>
                </button>
            </div>
            {error && <div className="backup-error" role="alert">{error}</div>}
            <div className = "backup-toolbar">
                <div className = "backup-search">
                    <Search size={18} />

                    <input 
                        type="text"
                        placeholder="Search backups..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
                <select
                  className="backup-filter"
                  value={databaseFilter}
                  onChange={(event) => setDatabaseFilter(event.target.value)}
                  aria-label="Filter by database"
                >
                    <option value= "all">All Databases</option>
                    {databases.map((database) => (
                      <option key={database.id} value={String(database.id)}>
                        {database.name}
                      </option>
                    ))}
                </select>

                <select
                  className="backup-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                    <option value="all">All Status</option>
                    <option value="success">Successful</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                </select>

            </div>

            <div className= "backup-summary">
                <div className="backup-summary-card">
                    <div className="backup-summary-icon blue">
                        <Archive size={21} />
                    </div>

                    <div>
                        <span>Total Backups</span>
                        <strong>{totalBackups}</strong>
                         </div>
        </div>

        <div className="backup-summary-card">
          <div className="backup-summary-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Successful</span>
            <strong>{successfulbackups}</strong>
          </div>
        </div>

        <div className="backup-summary-card">
          <div className="backup-summary-icon orange">
            <Clock3 size={21} />
          </div>

          <div>
            <span>In Progress</span>
            <strong>{inProgressBackups}</strong>
          </div>
        </div>

        <div className="backup-summary-card">
          <div className="backup-summary-icon red">
            <XCircle size={21} />
          </div>

          <div>
            <span>Failed</span>
            <strong>{failedBackups}</strong>
          </div>
        </div>

      </div>

      {/* Backup Table */}
      <div className="backup-table-card">

        <div className="backup-table-header">
          <div>
            <h3>Backup History</h3>
            <p>Recent database backup operations</p>
          </div>

        </div>

        <div className="backup-table-wrapper">

          <table className="backup-table">

            <thead>
              <tr>
                <th>Backup</th>
                <th>Database</th>
                <th>Type</th>
                <th>Size</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7">Loading backups...</td>
                </tr>
              ) : error && backups.length === 0 ? (
                <tr>
                  <td colSpan="7">Unable to load backups.</td>
                </tr>
              ) : filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan="7">No backups found.</td>
                </tr>
                ) : (
                  filteredBackups.map((backup) => (
                    <tr key={backup.id}>
                      <td>
                        <div className="backup-name">
                          <div className="backup-file-icon">
                            <Archive size={17} />
                          </div>
                          <div>
                            <strong>{backup.file_name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{backup.database_name}</td>
                      <td>
                        <span className="backup-type">Backup</span>
                      </td>
                      <td>
                        {backup.file_size
                          ? `${(Number(backup.file_size) / (1024 * 1024)).toFixed(1)} MB`
                          : "-"}
                      </td>
                      <td>
                        {new Date(backup.created_at).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`backup-status ${
                          backup.status?.toLowerCase() === "success"
                          ? "success"
                          : backup.status?.toLowerCase() === "failed"
                          ? "failed"
                          : "running"
                        }` }
                        ><span></span>
                        {backup.status?.toLowerCase() === "success"
                        ? "Successful"
                        : backup.status?.toLowerCase() === "failed"
                        ? "Failed"
                        : "In Progress"}
                        </span>
                      </td>

                      <td>
                        <div className="backup-row-action">
                          <button
                            title="Download"
                            aria-label={`Download ${backup.file_name}`}
                            onClick={() => handleDownloadBackup(backup)}
                            disabled={backup.status?.toLowerCase() !== "success"}
                          >
                            <Download size={17} />
                          </button>
                          <button
                            title="Restore"
                            aria-label={`Restore ${backup.file_name}`}
                            onClick={() => {
                              setTargetDatabase(backup.target_database_name || "");
                              setDialog({type: "restore", backup});
                            }}
                            disabled={backup.status?.toLowerCase() !== "success" || isWorking}
                          >
                            <RotateCcw size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>

          </table>

        </div>

        <div className="backup-pagination">

          <span>
            Showing {filteredBackups.length} of {backups.length} backups
          </span>

        </div>

      </div>

      {dialog && (
        <div className="database-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isWorking) setDialog(null);
        }}>
          <section className="database-modal" role="dialog" aria-modal="true" aria-labelledby="backup-dialog-title">
            <div className="database-modal-header">
              <div>
                <h2 id="backup-dialog-title">
                  {dialog.type === "create" ? "Create backup" : "Restore backup"}
                </h2>
                <p>
                  {dialog.type === "create"
                    ? "Choose the database to back up."
                    : `Restore ${dialog.backup.file_name} to a database.`}
                </p>
              </div>
              <button className="database-modal-close" type="button" onClick={() => setDialog(null)} disabled={isWorking} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            <form className="database-form" onSubmit={dialog.type === "create" ? handleCreateBackup : handleRestoreBackup}>
              {dialog.type === "create" && databases.length > 0 ? (
                <label>
                  Database
                  <select value={selectedDatabaseId} onChange={(event) => setSelectedDatabaseId(event.target.value)} required>
                    {databases.map((database) => (
                      <option key={database.id} value={String(database.id)}>{database.name} ({database.db_type})</option>
                    ))}
                  </select>
                </label>
              ) : dialog.type === "create" ? (
                <p>No database connections are available. Add a database before creating a backup.</p>
              ) : (
                <label>
                  Target database name
                  <input value={targetDatabase} onChange={(event) => setTargetDatabase(event.target.value)} required />
                </label>
              )}
              <div className="database-modal-actions">
                <button className="modal-cancel" type="button" onClick={() => setDialog(null)} disabled={isWorking}>Cancel</button>
                {dialog.type === "create" && databases.length === 0 ? (
                  <button className="modal-restore" type="button" onClick={() => navigate("/databases")}>
                    Add database
                  </button>
                ) : (
                  <button className="modal-restore" type="submit" disabled={isWorking}>
                    {isWorking ? "Working..." : dialog.type === "create" ? "Create backup" : "Restore backup"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

    </div>
  );
}

export default Backups;