import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Databases from "./pages/Databases";
import Backups from "./pages/Backups";
import Schedules from "./pages/Schedules";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =========================
            PUBLIC AUTH ROUTES
        ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        {/* =========================
            PROTECTED APPLICATION
        ========================= */}

        <Route element={<ProtectedRoute />}>

          <Route
            path="/"
            element={<Layout />}
          >
            <Route
              index
              element={<Dashboard />}
            />

            <Route
              path="databases"
              element={<Databases />}
            />

            <Route
              path="backups"
              element={<Backups />}
            />

            <Route
              path="schedules"
              element={<Schedules />}
            />

            <Route
              path="logs"
              element={<Logs />}
            />

            <Route
              path="settings"
              element={<Settings />}
            />

          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;