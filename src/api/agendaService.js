// src/api/agendaService.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchAgenda() {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("No hay sesión activa");

  const res = await fetch(`${API_BASE}/v1/agenda`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept": "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado para ver la agenda.");
  }

  if (!res.ok) {
    throw new Error("Error al obtener la agenda.");
  }

  return res.json(); // ConfigurarAgendaResponse
}

export async function saveAgenda(config) {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("No hay sesión activa");

  const res = await fetch(`${API_BASE}/v1/agenda`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado para actualizar la agenda.");
  }

  if (!res.ok) {
    let msg = "Error al guardar la agenda.";
    try {
      const body = await res.json();
      if (body.message) msg = body.message;
    } catch {}
    throw new Error(msg);
  }

  return res.json(); // ConfigurarAgendaResponse
}
