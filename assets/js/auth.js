const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || '/api';
const LOGIN_URL = `${API_BASE}/v1/auth/login`;
const REFRESH_URL = `${API_BASE}/v1/auth/refresh`;

const auth = {
  set({ access, refresh, rol }) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("rol", rol);
  },
  clear() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("rol");
  },
  role() { return localStorage.getItem("rol"); }
};

function goHomeByRole(rol) {
  switch (rol) {
    case "ADMIN":    window.location.href = "/admin/"; break;
    case "VENDEDOR": window.location.href = "/vendedor/"; break;
    default:         window.location.href = "/"; break;
  }
}

function setLoading(el, v) {
  if (!el) return;
  if (v) el.classList.add("loading");
  else el.classList.remove("loading");
}

function showFormError(msg) {
  const p = document.getElementById("formError");
  p.textContent = msg;
  p.hidden = !msg;
}

async function doLogin(correo, contrasenia) {
  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasenia })
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Correo o contraseña inválidos.");
    if (res.status === 403) throw new Error("Tu cuenta no está verificada. Revisa tu correo.");
    
    try {
      const body = await res.json();
      throw new Error(body.message || "Error al iniciar sesión.");
    } catch {
      throw new Error("Error al iniciar sesión.");
    }
  }
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  const form = document.getElementById("loginForm");
  const btn = document.getElementById("btnLogin");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFormError("");
    setLoading(btn, true);

    const correo = document.getElementById("correo").value.trim();
    const contrasenia = document.getElementById("contrasenia").value;

    if (!correo || !contrasenia) {
      showFormError("Completa tu correo y contraseña.");
      setLoading(btn, false);
      return;
    }

    try {
      const data = await doLogin(correo, contrasenia);
      auth.set(data);
      goHomeByRole(data.rol);
    } catch (err) {
      showFormError(err.message);
    } finally {
      setLoading(btn, false);
    }
  });
});
