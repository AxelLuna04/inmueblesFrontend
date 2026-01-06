
import { loginRequest } from '../../api/authService.js';
import { auth, goHomeByRole } from '../../utils/authManager.js';
import { enablePasswordToggle } from "../../utils/togglePassword.js";

import {
  showNotif,
  NOTIF_RED,
  NOTIF_ORANGE
} from "../../utils/notifications.js";

// --- Funciones de Ayuda Visual (UI Helpers) ---
// Se mantienen aquí porque son específicas de cómo se ve este formulario
function setLoading(el, isLoading) {
  if (!el) return;
  if (isLoading) el.classList.add("loading");
  else el.classList.remove("loading");
}

function showFormError(msg) {
  const p = document.getElementById("formError");
  if (p) {
    p.textContent = msg || "";
    p.hidden = !msg;
  }
}

function uiWarn(notification, msg) {
  if (notification) showNotif(notification, msg, NOTIF_ORANGE, 4000);
  else showFormError(msg);
}

function uiError(notification, msg) {
  if (notification) showNotif(notification, msg, NOTIF_RED, 5000);
  else showFormError(msg);
}

// --- Lógica Principal del DOM ---
document.addEventListener("DOMContentLoaded", () => {

  enablePasswordToggle("#togglePassword", "#contrasenia");

  // Año actual en el footer
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Referencias a elementos
  const form = document.getElementById("loginForm");
  const btn = document.getElementById("btnLogin");
  const inputCorreo = document.getElementById("correo");
  const inputPass = document.getElementById("contrasenia");
  const notification = document.getElementById("notification");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpieza inicial
    showFormError("");
    setLoading(btn, true);

    const correo = inputCorreo.value.trim();
    const contrasenia = inputPass.value;

    // Validación básica (warning)
    if (!correo || !contrasenia) {
      uiWarn(notification, "Completa tu correo y contraseña.");
      setLoading(btn, false);
      return;
    }

    try {
      const data = await loginRequest(correo, contrasenia);
      auth.set(data);
      goHomeByRole(data.rol);

    } catch (err) {
      console.error(err);

      // Si tu authService lanza ErrorApi con mensaje legible, lo mostramos.
      if (err?.name === "ErrorApi") {
        uiError(notification, err.message || "Error al iniciar sesión.");
        return;
      }

      // Errores genéricos (red, bug, etc.)
      uiError(notification, "Ocurrió un error al iniciar sesión.");

    } finally {
      setLoading(btn, false);
    }
  });
});