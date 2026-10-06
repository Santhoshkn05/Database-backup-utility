import axios from "axios";

const API_URL = "http://localhost:3000";

export async function fetchDashboardData(token) {
  const response = await axios.get(`${API_URL}/dashboard`, {
    headers: {Authorization: `Bearer ${token}`}
  });
  return response.data.data;
}

export async function fetchSystemStatus() {
  const response = await axios.get(`${API_URL}/health`);
  return response.data.data;
}