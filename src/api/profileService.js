// src/api/profileService.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getAuthHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMyProfile() {
  const res = await fetch(`${API_BASE}/v1/me`, {
    headers: {
      ...getAuthHeader(),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    throw new Error("Error al obtener el perfil");
  }

  return res.json(); // PerfilResponse
}

// Mapea PerfilResponse al formato que consume el front
export function mapProfileDataToFront(data) {
  return {
    tipoUsuario: data.tipoUsuario,
    id: data.id,
    correo: data.correo,
    nombreCompleto: data.nombreCompleto,
    presupuesto: data.presupuesto,
    ubicacionInteres: data.ubicacionInteres,
    miembrosFamilia: data.numeroMiembrosFamilia,
    ocupacion: data.idOcupacion,
    telefono: data.telefono,
    idFotoPerfil: data.idFotoPerfil,
    urlFotoPerfil: data.rutaFoto,
  };
}

export async function patchMyProfile(patchBody) {
  const res = await fetch(`${API_BASE}/v1/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(patchBody),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado para actualizar el perfil.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Error al actualizar el perfil.");
  }

  return res.json(); // PerfilResponse
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append("foto", file);

  const res = await fetch(`${API_BASE}/v1/me/foto`, {
    method: "PUT",
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado para cambiar la foto.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Error al cambiar la foto de perfil.");
  }

  return res.json(); // PerfilResponse
}

export async function deleteMyAccount(contraseniaActual) {
  const res = await fetch(`${API_BASE}/v1/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ contraseniaActual }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("No autorizado para eliminar la cuenta.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Error al eliminar la cuenta.");
  }

  return res.json();
}

export async function changeMyPassword({ actual, nueva }) {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("No hay sesión activa");

  const res = await fetch(`${API_BASE}/v1/me/password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ actual, nueva }),
  });

  if (!res.ok) {
    let msg = "No se pudo cambiar la contraseña.";
    try {
      const body = await res.json();
      if (body.mensaje) msg = body.mensaje;
      if (body.message) msg = body.message;
    } catch {
    }
    throw new Error(msg);
  }

  // el backend devuelve { "mensaje": "Contraseña actualizada" }
  return res.json();
}