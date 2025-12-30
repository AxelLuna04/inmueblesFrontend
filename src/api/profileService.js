// src/api/profileService.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchMyProfile() {
  const token = localStorage.getItem("accessToken"); // o auth.token()

  if (!token) throw new Error("No hay sesión activa");

  const res = await fetch(`${API_BASE}/v1/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    throw new Error("Error al obtener el perfil");
  }

  return res.json(); // PerfilResponse
}
