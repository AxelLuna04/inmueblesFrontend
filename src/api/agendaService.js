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


// NUEVO: Obtener disponibilidad pública (Vista del Comprador)
// src/api/agendaService.js

// 1. Obtener Calendario (GET /calendario)
export async function getCalendar(idPublicacion, anio, mes) {
  // endpoint: /api/v1/publicaciones/{id}/agenda/calendario?anio=X&mes=Y
  const url = `${API_BASE}/v1/publicaciones/${idPublicacion}/agenda/calendario?anio=${anio}&mes=${mes}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error("Error al obtener el calendario");
  return res.json(); // Retorna CalendarioAgendaResponse
}

// 2. Obtener Horas Disponibles (GET /horas-disponibles)
export async function getAvailableHours(idPublicacion, fechaStr) {
  // endpoint: /api/v1/publicaciones/{id}/agenda/horas-disponibles?fecha=YYYY-MM-DD
  const url = `${API_BASE}/v1/publicaciones/${idPublicacion}/agenda/horas-disponibles?fecha=${fechaStr}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error("Error al obtener horas disponibles");
  return res.json(); // Retorna HorasDisponiblesResponse (lista de LocalTime)
}

// 3. Agendar Cita (POST /)
export async function scheduleAppointment(idPublicacion, fechaStr, horaStr) {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("Debes iniciar sesión para agendar");

  const url = `${API_BASE}/v1/publicaciones/${idPublicacion}/agenda`;
  
  // Body debe coincidir con AgendarCitaRequest: { fecha: "YYYY-MM-DD", hora: "HH:mm" }
  const body = {
    fecha: fechaStr,
    hora: horaStr
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = "Error al agendar";
    try {
      const err = await res.json();
      if (err.message) msg = err.message;
    } catch {}
    throw new Error(msg);
  }

  return res.json(); // Retorna AgendarCitaResponse
}