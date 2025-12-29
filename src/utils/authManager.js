// src/utils/authManager.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const ROL_KEY    = "rol";

export const auth = {
  set({ accessToken, refreshToken, rol }) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(ROL_KEY, rol);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROL_KEY);
  },
  token() {
    return localStorage.getItem(ACCESS_KEY);
  },
  refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  role() {
    return localStorage.getItem(ROL_KEY);
  }
};

function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    // Base64URL -> Base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// 👇 NUEVO: helper para que el header obtenga info de usuario
export function getSessionInfoFromToken() {
  const token = auth.token();
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload) return null;

  const email = payload.sub || null;
  const rol   = payload.rol || auth.role() || null;

  return { email, rol };
}


function isAccessExpired() {
  const token = auth.token();
  if (!token) return true;
  const payload = decodeJWT(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;

  //Margen para evitar problemas de sincronización de reloj
  //const SKEW = 30; // segundos
  //return payload.exp < now + SKEW;
}

export async function doRefresh() {
  const refresh = auth.refreshToken();
  if (!refresh) throw new Error("No hay token de refresh");

  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refresh}` }
  });

  if (!res.ok) throw new Error("Refresh inválido");

  const data = await res.json();
  auth.set(data);
}

export async function refreshIfNeeded() {
  if (isAccessExpired()) {
    try {
      await doRefresh();
    } catch (e) {
      auth.clear();
      window.location.href = "/pages/auth/login.html";
    }
  }
}

//TO DO: RUTAS HTML (PÁGINAS)
export function goHomeByRole(rol) {
  switch (rol) {
    case "ADMIN":    
      window.location.href = "/pages/admin/dashboard.html";
      break;
    case "VENDEDOR": 
      window.location.href = "/pages/lister/dashboard.html";
      break;
    default:         
      window.location.href = "/"; 
      break;
  }
}