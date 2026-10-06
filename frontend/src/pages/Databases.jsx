import {
  Database,
  Plus,
  Search,
  Wifi,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import axios from "axios";
import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

const API_URL = "http://localhost:3000";
const emptyForm = {
  name: "",
  db_type: "postgresql",
  host: "",
  port: "5432",
  database_name: "",
  username: "",
  password: ""
};

const databaseTypeLabels = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB"
};

function Databases() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [connectionResults, setConnectionResults] = useState({});
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAllDatabases, setShowAllDatabases] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadDatabases = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", {replace: true});
          return;
        }
        const response = await axios.get(`${API_URL}/databases`, {
          headers: {Authorization: `Bearer ${token}`}
        });
        if (isCurrent) {
          setDatabases(response.data.data || []);
          setError("");
        }
      } catch (error) {
        console.error("Failed to fetch databases:", error);
        if (!isCurrent) return;
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", {replace: true});
          return;
        }
        setError(error.response?.data?.error || "Failed to load databases.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    loadDatabases();
    return () => { isCurrent = false; };
  }, [navigate, reloadKey]);

  const filteredDatabases = useMemo(() => {
    return databases.filter((db) => {
      const type = db.db_type?.toLowerCase() || "";
      const query = search.trim().toLowerCase();
      const matchesSearch = [db.name, type, db.host, db.database_name]
        .some((value) => value?.toLowerCase().includes(query));
      const matchesFilter = filter === "all" || type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [databases, search, filter]);

  const dataToDisplay = showAllDatabases
        ? filteredDatabases
        : filteredDatabases.slice(0,5);

  const totalDatabases = databases.length;
  const connectedDatabases = databases.filter((db) => connectionResults[db.id]?.state === "connected").length;
  const databaseTypes = new Set(databases.map((db) => db.db_type)).size;

  const openCreateForm = () => {
    setEditingDatabase(null);
    setFormData(emptyForm);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (database) => {
    setEditingDatabase(database);
    setFormData({
      name: database.name || "",
      db_type: database.db_type || "postgresql",
      host: database.host || "",
      port: String(database.port || ""),
      database_name: database.database_name || "",
      username: database.username || "",
      password: ""
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingDatabase(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const handleFormChange = (event) => {
    const {name, value} = event.target;
    setFormData((previous) => ({...previous, [name]: value}));
    setFormError("");
  };

  const handleTypeChange = (event) => {
    const dbType = event.target.value;
    const defaultPorts = {postgresql: "5432", mysql: "3306", mongodb: "27017"};
    setFormData((previous) => ({
      ...previous,
      db_type: dbType,
      port: defaultPorts[dbType]
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        port: Number(formData.port),
        password: formData.password || undefined
      };
      if (editingDatabase) {
        await axios.put(`${API_URL}/databases/${editingDatabase.id}`, payload, {
          headers: {Authorization: `Bearer ${token}`}
        });
        setConnectionResults((previous) => {
          const next = {...previous};
          delete next[editingDatabase.id];
          return next;
        });
      } else {
        await axios.post(`${API_URL}/databases`, payload, {
          headers: {Authorization: `Bearer ${token}`}
        });
      }
      setIsFormOpen(false);
      setEditingDatabase(null);
      setFormData(emptyForm);
      setReloadKey((previous) => previous + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setFormError(error.response?.data?.error || "Unable to save this database connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (database) => {
    setTestingId(database.id);
    setConnectionResults((previous) => ({...previous, [database.id]: {state: "testing"}}));
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/databases/${database.id}/test`, {}, {
        headers: {Authorization: `Bearer ${token}`}
      });
      setConnectionResults((previous) => ({
        ...previous,
        [database.id]: {state: "connected", testedAt: new Date()}
      }));
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setConnectionResults((previous) => ({
        ...previous,
        [database.id]: {
          state: "failed",
          testedAt: new Date(),
          message: error.response?.data?.error || "Connection test failed."
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (database) => {
    if (!window.confirm(`Delete the connection “${database.name}”? Databases with backup, schedule, or log history cannot be deleted.`)) {
      return;
    }
    setDeletingId(database.id);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/databases/${database.id}`, {
        headers: {Authorization: `Bearer ${token}`}
      });
      setConnectionResults((previous) => {
        const next = {...previous};
        delete next[database.id];
        return next;
      });
      setReloadKey((previous) => previous + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {replace: true});
        return;
      }
      setError(error.response?.data?.error || "Unable to delete this database connection.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isFormOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isFormOpen, isSaving]);

  return (
    <div className="databases-page">

      <div className="page-header">
        <div>
          <h2>Databases</h2>
          <p>Manage your connected databases and connection settings.</p>
        </div>

        <button type="button" className="add-database-button" onClick={openCreateForm}>
          <Plus size={18} />
          <span>Add Database</span>
        </button>
      </div>

      <div className="database-toolbar">
        <div className="database-search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search databases"
            placeholder="Search databases..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="database-filter"
          aria-label="Filter by database type"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All Databases</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mongodb">MongoDB</option>
        </select>
      </div>

      {error && <div className="database-error" role="alert">{error}</div>}

      <div className="database-summary">
        <div className="database-summary-card">
          <div className="database-summary-icon blue">
            <Database size={21} />
          </div>
          <div>
            <span>Total Databases</span>
            <strong>{totalDatabases}</strong>
          </div>
        </div>
        <div className="database-summary-card">
          <div className="database-summary-icon green">
            <Wifi size={21} />
          </div>
          <div>
            <span>Connected</span>
            <strong>{connectedDatabases}</strong>
          </div>
        </div>
        <div className="database-summary-card">
          <div className="database-summary-icon purple">
            <Database size={21} />
          </div>
          <div>
            <span>Database Types</span>
            <strong>{databaseTypes}</strong>
          </div>
        </div>
      </div>

      <div className="database-list-header">
        <h3>Database Connections</h3>
        {filteredDatabases.length > 5 && (
          <button 
            type="button"
            className="view-all-button"
            onClick={() => setShowAllDatabases((previous) => !previous)}
          >
            {showAllDatabases ? "Show Less" : "View All"}
          </button>
        )}
      </div>

      <div className="database-list">
        {isLoading ? (
          <p className="database-empty">Loading database connections...</p>
        ) : filteredDatabases.length > 0 ? (
          <>
            {dataToDisplay.map((database) => {
              const result = connectionResults[database.id];
              const connectionState = result?.state || "not-tested";
              const statusLabel = {
                connected: "Connected",
                failed: "Connection failed",
                testing: "Testing...",
                "not-tested": "Not tested"
              }[connectionState];

              return (
                <article className="database-card" key={database.id}>
                  <div className="database-card-header">
                    <div className="database-info">
                      <div className={`database-icon ${database.db_type}`}>
                        <Database size={22} />
                      </div>
                      <div>
                        <h3>{database.name}</h3>
                        <p>{databaseTypeLabels[database.db_type] || database.db_type}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="delete-database-button"
                      aria-label={`Delete ${database.name}`}
                      title="Delete connection"
                      disabled={deletingId === database.id}
                      onClick={() => handleDelete(database)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="database-details">
                    <div><span>Host</span><strong>{database.host}</strong></div>
                    <div><span>Port</span><strong>{database.port}</strong></div>
                    <div><span>Database</span><strong>{database.database_name}</strong></div>
                    <div>
                      <span>Status</span>
                      <strong className={`database-status ${connectionState}`}>
                        <span></span>{statusLabel}
                      </strong>
                    </div>
                  </div>

                  {result?.message && <p className="database-connection-error" role="status">{result.message}</p>}

                  <div className="database-card-footer">
                    <span className="last-tested">
                      {result?.testedAt ? `Last tested: ${result.testedAt.toLocaleString()}` : "Connection not tested"}
                    </span>
                    <div className="database-actions">
                      <button
                        type="button"
                        className="test-connection-button"
                        disabled={testingId === database.id}
                        onClick={() => handleTestConnection(database)}
                      >
                        <Wifi size={16} />
                        {testingId === database.id ? "Testing..." : "Test Connection"}
                      </button>
                      <button
                        type="button"
                        className="edit-database-button"
                        onClick={() => openEditForm(database)}
                      >
                        <Pencil size={16} />Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

          </>
        ) : (
          <div className="database-empty">
            <Database size={24} />
            <p>{databases.length ? "No databases match these filters." : "No database connections yet."}</p>
            {!databases.length && <button type="button" className="add-database-button" onClick={openCreateForm}><Plus size={17} />Add your first database</button>}
          </div>
        )}
      </div>

      {isFormOpen && (
        <div
          className="database-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section className="database-modal" role="dialog" aria-modal="true" aria-labelledby="database-form-title">
            <header className="database-modal-header">
              <div>
                <h2 id="database-form-title">{editingDatabase ? "Edit database" : "Add database"}</h2>
                <p>Connection credentials are stored on the server.</p>
              </div>
              <button type="button" className="database-modal-close" aria-label="Close dialog" onClick={closeForm}>
                <X size={19} />
              </button>
            </header>

            {formError && <div className="database-error" role="alert">{formError}</div>}

            <form className="database-form" onSubmit={handleSave}>
              <label>
                Connection name
                <input name="name" value={formData.name} onChange={handleFormChange} minLength="2" maxLength="100" required />
              </label>
              <label>
                Database type
                <select name="db_type" value={formData.db_type} onChange={handleTypeChange} required>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mongodb">MongoDB</option>
                </select>
              </label>
              <div className="database-form-grid">
                <label>
                  Host
                  <input name="host" value={formData.host} onChange={handleFormChange} autoComplete="off" required />
                </label>
                <label>
                  Port
                  <input name="port" type="number" min="1" max="65535" value={formData.port} onChange={handleFormChange} required />
                </label>
              </div>
              <label>
                Database name
                <input name="database_name" value={formData.database_name} onChange={handleFormChange} required />
              </label>
              <label>
                Username
                <input name="username" value={formData.username} onChange={handleFormChange} autoComplete="username" required />
              </label>
              <label>
                Password{editingDatabase ? " (optional)" : ""}
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  autoComplete={editingDatabase ? "new-password" : "current-password"}
                  placeholder={editingDatabase ? "Leave blank to keep current password" : "Enter password"}
                  required={!editingDatabase}
                />
              </label>
              <footer className="database-modal-actions">
                <button type="button" className="modal-cancel" onClick={closeForm} disabled={isSaving}>Cancel</button>
                <button type="submit" className="modal-restore" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingDatabase ? "Save changes" : "Add database"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Databases;