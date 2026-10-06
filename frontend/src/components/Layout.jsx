import {Link, NavLink, Outlet, useNavigate} from "react-router-dom";
import {useState, useEffect, useRef} from "react";
import axios from "axios";
import {
  DatabaseBackup,
  LayoutDashboard,
  Database,
  Archive,
  CalendarClock,
  ScrollText,
  Settings,
  UserRound,
  Bell,
  Search,
  LogOut
} from "lucide-react";

function Layout() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const notificationContainerRef = useRef(null);
  const profileContainerRef = useRef(null);
  const [user, setUser] = useState({
    name: "",
    email: ""
  });
  const [profileError, setProfileError] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileRetry, setProfileRetry] = useState(0);
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", {replace: true});
  };
  const searchItems = [
      {
        name: "Dashboard",
        path: "/"
      },
      {
        name: "Databases",
        path: "/databases"
      },
      {
        name: "Backups",
        path: "/backups"
      },
      {
        name: "Schedules",
        path: "/schedules"
      },
      {
        name: "Logs",
        path: "/logs"
      }
    ];
    const filteredSearchItems = searchItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await axios.get("http://localhost:3000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data.data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
        } else {
          setProfileError(
            error.response?.data?.error ||
            error.message ||
            "Unable to load profile."
          );
        }
      } finally {
        setIsProfileLoading(false);
      }
    };

    setIsProfileLoading(true);
    setProfileError("");
    fetchUserProfile();
  }, [navigate, profileRetry]);

  useEffect(() => {
    const handleShortcuts = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchExpanded(true);
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchQuery("");
        setIsSearchExpanded(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  useEffect(() => {
    if (isSearchExpanded) searchInputRef.current?.focus();
  }, [isSearchExpanded]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) {
        setSearchQuery("");
        setIsSearchExpanded(false);
      }
      if (!notificationContainerRef.current?.contains(event.target)) setIsNotificationsOpen(false);
      if (!profileContainerRef.current?.contains(event.target)) setIsProfileOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;
    let isCurrent = true;
    axios.get("http://localhost:3000/health")
      .then((response) => {
        if (isCurrent) setNotificationStatus(response.data.data);
      })
      .catch(() => {
        if (isCurrent) {
          setNotificationStatus({api: "Unavailable", postgresql: "Unknown", cloudStorage: "Unknown"});
        }
      });
    return () => { isCurrent = false; };
  }, [isNotificationsOpen]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo-box">
            <div className="logo-icon">
            <DatabaseBackup size={24} />
            </div>
        </div>

        <nav className="sidebar-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <LayoutDashboard size={21} />
            <span>Dashboard</span>
            </NavLink>

            <NavLink to="/databases" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <Database size={21} />
            <span>Databases</span>
            </NavLink>

            <NavLink to="/backups" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <Archive size={21} />
            <span>Backups</span>
            </NavLink>

            <NavLink to="/schedules" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <CalendarClock size={21} />
            <span>Schedules</span>
            </NavLink>

            <NavLink to="/logs" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <ScrollText size={21} />
            <span>Logs</span>
            </NavLink>

            <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <Settings size={21} />
            <span>Settings</span>
            </NavLink>
        </nav>
        <button type="button" className="nav-item sidebar-logout" onClick={handleLogout}>
          <LogOut size={21} />
          <span>Logout</span>
        </button>
        </aside>

      <main className="main-content">
        <header className="topbar">

        <div className="topbar-actions">
          <div className={`search-container${isSearchExpanded ? " search-container-open" : ""}`} ref={searchContainerRef}>
            <div className="search-box">
              <button
                type="button"
                className="search-icon-button"
                aria-label="Focus navigation search"
                onClick={() => {
                  setIsSearchExpanded(true);
                  setIsNotificationsOpen(false);
                  setIsProfileOpen(false);
                }}
              >
                <Search size={17} />
              </button>
              <input
                    ref={searchInputRef}
                    type="text"
                    aria-label="Search pages"
                    placeholder="Search pages"
                    value={searchQuery}
                    onFocus={() => {
                      setIsNotificationsOpen(false);
                      setIsProfileOpen(false);
                    }}
                    onChange={(event) => setSearchQuery(event.target.value)}
                />
                <span className="search-shortcut">Ctrl K</span>
            </div>
            {searchQuery.trim() && (
              <div className="search-results">
                {filteredSearchItems.length > 0 ? (
                  filteredSearchItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="search-result-item"
                      onClick={() => setSearchQuery("")}
                      >
                        {item.name}
                      </Link>
                  ))
                ):(
                  <div className="search-no-result">No results found </div>
                )}
                </div>
            )}
            </div>

            <div className="notification-container" ref={notificationContainerRef}>
              <button
                type="button"
                className="notification-button"
                aria-label="System notifications"
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  setIsNotificationsOpen((previous) => !previous);
                  setIsProfileOpen(false);
                  setSearchQuery("");
                }}
              >
                <Bell size={18} />
                {notificationStatus && [notificationStatus.api, notificationStatus.postgresql, notificationStatus.cloudStorage]
                  .some((status) => !["Operational", "Connected"].includes(status)) && (
                    <span className="notification-dot"></span>
                  )}
              </button>
              {isNotificationsOpen && (
                <div className="notification-dropdown" role="status">
                  <strong>System notifications</strong>
                  {!notificationStatus ? (
                    <p>Checking monitored services...</p>
                  ) : [
                    ["API Server", notificationStatus.api],
                    ["PostgreSQL", notificationStatus.postgresql],
                    ["Cloud Storage", notificationStatus.cloudStorage]
                  ].every(([, status]) => ["Operational", "Connected"].includes(status)) ? (
                    <p>All monitored services are operational.</p>
                  ) : (
                    <ul>
                      {[
                        ["API Server", notificationStatus.api],
                        ["PostgreSQL", notificationStatus.postgresql],
                        ["Cloud Storage", notificationStatus.cloudStorage]
                      ].filter(([, status]) => !["Operational", "Connected"].includes(status))
                        .map(([name, status]) => <li key={name}>{name}: {status}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="profile-container" ref={profileContainerRef}>
              <button
                type="button"
                className="user-profile"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                onClick={() => {
                  setIsProfileOpen((previous) => !previous);
                  setIsNotificationsOpen(false);
                  setSearchQuery("");
                }}
              >
                <div className="avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                </div>

                <span className="user-name">
                  {user.name || (isProfileLoading ? "Loading..." : "Profile unavailable")}
                </span>

                <span className="dropdown-arrow">
                  {isProfileOpen ? "^" : "⌄"}
                </span>

              </button>
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-summary">
                    <div className="profile-dropdown-avatar">
                      <UserRound size={20} />
                    </div>
                    <div className="profile-dropdown-details">
                      <strong>
                        {user.name || (isProfileLoading ? "Loading..." : "Profile unavailable")}
                      </strong>
                      <span>{user.email || profileError || "Email unavailable"}</span>
                    </div>
                  </div>
                  {profileError && (
                    <button
                      type="button"
                      className="profile-dropdown-item profile-retry"
                      onClick={() => setProfileRetry((previous) => previous + 1)}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    className="profile-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
        </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default Layout;