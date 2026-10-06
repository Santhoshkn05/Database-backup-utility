import {
  CalendarClock,
  Plus,
  Search,
  Play,
  Pause,
  Pencil,
  Trash2,
  CheckCircle2,
  X
} from "lucide-react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000";

function Schedules() {

  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
  const [scheduleExpression, setScheduleExpression] = useState("0 2 * * *");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setIsLoading(true);
    const loadSchedules = async () => {
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
        setDatabases(databaseList);
        setSelectedDatabaseId((current) =>
          databaseList.some((database) => String(database.id) === current)
            ? current
            : String(databaseList[0]?.id || "")
        );

        const scheduleResponses = await Promise.allSettled(
          databaseList.map((database) => 
          axios.get(
            `${API_URL}/databases/${database.id}/schedule`,
            {headers}
          )
        )
       );
        const allSchedules = [];
        let scheduleLoadFailed = false;
        scheduleResponses.forEach((result, index) => {
          if (result.status === "rejected") {
            if (result.reason.response?.status === 401) {
              throw result.reason;
            }
            scheduleLoadFailed = true;
            console.error("Failed to fetch schedules for database:", result.reason);
            return;
          }

          const response = result.value;
          const database = databaseList[index];
          (response.data.data || []).forEach((schedule) => {
            allSchedules.push({
              ...schedule,
              database_name: database.name,
              db_type: database.db_type
            });
          });
        });
        setSchedules(allSchedules);
        setError(scheduleLoadFailed ? "Some database schedules could not be loaded." : "");
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", {replace: true});
          return;
        }
        setError(
          error.response?.data?.error ||
          "Failed to load schedules."
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadSchedules();
  }, [navigate, reloadKey]);

  const filteredSchedules = useMemo(() => {
    const query=search.trim().toLowerCase();
        return schedules.filter((schedule) => {
      const matchesSearch = 
            !query ||
            schedule.database_name?.toLowerCase().includes(query) ||
            schedule.schedule?.toLowerCase().includes(query);

       const matchesStatus = 
          statusFilter === "all" ||
          (statusFilter === "active" && schedule.is_active) ||
          (statusFilter === "paused" && !schedule.is_active);
        return matchesSearch && matchesStatus;
    });
  }, [schedules, search, statusFilter]);

  const totalSchedules = schedules.length;
  const activeSchedules = schedules.filter(
    (schedule) => schedule.is_active
  ).length;
  const pausedSchedules = schedules.filter(
    (schedule) => !schedule.is_active
  ).length;

  const databasesWithSchedules = new Set(
    schedules.map((schedule) => schedule.database_id)
  ).size;

  const openCreateForm = () => {
    setEditingSchedule(null);
    setScheduleExpression("0 2 * * *");
    setError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleExpression(schedule.schedule);
    setError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  };

  const handleUnauthorized = (actionError) => {
    if (actionError.response?.status !== 401) return false;
    localStorage.removeItem("token");
    navigate("/login", {replace: true});
    return true;
  };

  const handleSaveSchedule = async (event) => {
    event.preventDefault();
    setIsWorking(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = localStorage.getItem("token");
      if (editingSchedule) {
        await axios.put(
          `${API_URL}/schedules/${editingSchedule.id}`,
          {schedule: scheduleExpression.trim()},
          {headers: {Authorization: `Bearer ${token}`}}
        );
      } else {
        await axios.post(
          `${API_URL}/databases/${selectedDatabaseId}/schedule`,
          {schedule: scheduleExpression.trim()},
          {headers: {Authorization: `Bearer ${token}`}}
        );
      }
      setIsFormOpen(false);
      setSuccessMessage(editingSchedule ? "Schedule updated." : "Schedule created.");
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      if (handleUnauthorized(actionError)) return;
      setError(actionError.response?.data?.error || "Failed to save schedule.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleToggleSchedule = async (schedule) => {
    setIsWorking(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/schedules/${schedule.id}/status`,
        {is_active: !schedule.is_active},
        {headers: {Authorization: `Bearer ${token}`}}
      );
      setSuccessMessage(schedule.is_active ? "Schedule paused." : "Schedule resumed.");
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      if (handleUnauthorized(actionError)) return;
      setError(actionError.response?.data?.error || "Failed to update schedule status.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!window.confirm(`Delete the schedule for ${schedule.database_name}?`)) return;
    setIsWorking(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/schedules/${schedule.id}`, {
        headers: {Authorization: `Bearer ${token}`}
      });
      setSuccessMessage("Schedule deleted.");
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      if (handleUnauthorized(actionError)) return;
      setError(actionError.response?.data?.error || "Failed to delete schedule.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRunNow = async (schedule) => {
    setIsWorking(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/databases/${schedule.database_id}/backup`,
        {},
        {headers: {Authorization: `Bearer ${token}`}}
      );
      setSuccessMessage(`Backup completed for ${schedule.database_name}.`);
    } catch (actionError) {
      if (handleUnauthorized(actionError)) return;
      setError(actionError.response?.data?.error || "Failed to run backup.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="schedules-page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Schedules</h2>
          <p>Manage automated database backup schedules.</p>
        </div>

        <button className="schedule-button" onClick={openCreateForm} disabled={isLoading || isWorking}>
          <Plus size={18} />
          <span>Create Schedule</span>
        </button>
      </div>

      {error && <div className="schedule-message error" role="alert">{error}</div>}
      {successMessage && <div className="schedule-message success" role="status">{successMessage}</div>}

      {/* Toolbar */}
      <div className="schedule-toolbar">

        <div className="schedule-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search schedules..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select className="schedule-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All Schedules</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>

      </div>

      {/* Summary Cards */}
      <div className="schedule-summary">

        <div className="schedule-summary-card">
          <div className="schedule-summary-icon blue">
            <CalendarClock size={21} />
          </div>

          <div>
            <span>Total Schedules</span>
            <strong>{totalSchedules}</strong>
          </div>
        </div>

        <div className="schedule-summary-card">
          <div className="schedule-summary-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Active</span>
            <strong>{activeSchedules}</strong>
          </div>
        </div>

        <div className="schedule-summary-card">
          <div className="schedule-summary-icon orange">
            <Pause size={21} />
          </div>

          <div>
            <span>Paused</span>
            <strong>{pausedSchedules}</strong>
          </div>
        </div>

        <div className="schedule-summary-card">
          <div className="schedule-summary-icon purple">
            <CalendarClock size={21} />
          </div>

          <div>
            <span>Databases Scheduled</span>
            <strong>{databasesWithSchedules}</strong>
          </div>
        </div>

      </div>

      {/* Schedule List */}
      <div className="schedule-list">
        {isLoading ? (
          <p className="database-empty">Loading schedules...</p>
        ) : filteredSchedules.length === 0 ? (
          <div className="database-empty">
            <p>{schedules.length === 0 ? "No backup schedules yet." : "No schedules match these filters."}</p>
          </div>
        ) : filteredSchedules.map((schedule) => (
          <article className="schedule-card" key={schedule.id}>
            <div className="schedule-card-header">
              <div className="schedule-info">
                <div className={`schedule-icon ${schedule.is_active ? "blue" : "orange"}`}>
                  <CalendarClock size={22} />
                </div>
                <div>
                  <h3>{schedule.database_name} backup</h3>
                  <p>{schedule.db_type}</p>
                </div>
              </div>
              <div className="schedule-header-actions">
                <span className={`schedule-status ${schedule.is_active ? "active" : "paused"}`}>
                  <span></span>
                  {schedule.is_active ? "Active" : "Paused"}
                </span>
              </div>
            </div>

            <div className="schedule-details">
              <div>
                <span>Cron expression</span>
                <strong><code>{schedule.schedule}</code></strong>
              </div>
              <div>
                <span>Database</span>
                <strong>{schedule.database_name}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{schedule.created_at ? new Date(schedule.created_at).toLocaleString() : "-"}</strong>
              </div>
              <div>
                <span>Schedule ID</span>
                <strong>{schedule.id}</strong>
              </div>
            </div>

            <div className="schedule-card-footer">
              <span className="last-run">Automated backups run while this schedule is active.</span>
              <div className="schedule-actions">
                <button className="run-schedule-button" onClick={() => handleRunNow(schedule)} disabled={isWorking}>
                  <Play size={15} />
                  Run Now
                </button>
                <button className="edit-schedule-button" onClick={() => openEditForm(schedule)} disabled={isWorking}>
                  <Pencil size={15} />
                  Edit
                </button>
                <button
                  className="resume-schedule-button"
                  onClick={() => handleToggleSchedule(schedule)}
                  disabled={isWorking}
                  title={schedule.is_active ? "Pause schedule" : "Resume schedule"}
                >
                  {schedule.is_active ? <Pause size={15} /> : <Play size={15} />}
                  <span>{schedule.is_active ? "Pause" : "Resume"}</span>
                </button>
                <button className="delete-schedule-button" onClick={() => handleDeleteSchedule(schedule)} disabled={isWorking} title="Delete schedule" aria-label={`Delete schedule for ${schedule.database_name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {isFormOpen && (
        <div className="database-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isWorking) setIsFormOpen(false);
        }}>
          <section className="database-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
            <div className="database-modal-header">
              <div>
                <h2 id="schedule-dialog-title">{editingSchedule ? "Edit schedule" : "Create schedule"}</h2>
                <p>Set a five-field cron expression for automated backups.</p>
              </div>
              <button className="database-modal-close" type="button" onClick={() => setIsFormOpen(false)} disabled={isWorking} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            {databases.length === 0 && !editingSchedule ? (
              <div className="database-form">
                <p>No database connections are available. Add a database before scheduling backups.</p>
                <div className="database-modal-actions">
                  <button className="modal-cancel" type="button" onClick={() => setIsFormOpen(false)}>Cancel</button>
                  <button className="modal-restore" type="button" onClick={() => navigate("/databases")}>Add database</button>
                </div>
              </div>
            ) : (
              <form className="database-form" onSubmit={handleSaveSchedule}>
                {!editingSchedule && (
                  <label>
                    Database
                    <select value={selectedDatabaseId} onChange={(event) => setSelectedDatabaseId(event.target.value)} required>
                      {databases.map((database) => (
                        <option key={database.id} value={String(database.id)}>{database.name} ({database.db_type})</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Cron expression
                  <input value={scheduleExpression} onChange={(event) => setScheduleExpression(event.target.value)} placeholder="0 2 * * *" required />
                </label>
                <p className="schedule-cron-hint">Example: <code>0 2 * * *</code> runs daily at 02:00.</p>
                <div className="database-modal-actions">
                  <button className="modal-cancel" type="button" onClick={() => setIsFormOpen(false)} disabled={isWorking}>Cancel</button>
                  <button className="modal-restore" type="submit" disabled={isWorking || !scheduleExpression.trim() || (!editingSchedule && !selectedDatabaseId)}>
                    {isWorking ? "Saving..." : editingSchedule ? "Save changes" : "Create schedule"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

    </div>
  );
}

export default Schedules;