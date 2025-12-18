
import { loginRequest } from '../../api/authService.js';
import { auth, goHomeByRole } from '../../utils/authManager.js';
import { enablePasswordToggle } from "../../utils/togglePassword.js";

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
    p.textContent = msg;
    p.hidden = !msg;
  }
}

// --- Lógica Principal del DOM ---
document.addEventListener("DOMContentLoaded", () => {
  
  enablePasswordToggle("#togglePassword", "#contrasenia");
  
  // 1. Utilidad cosmética: Poner el año actual en el footer
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // 2. Referencias a elementos
  const form = document.getElementById("loginForm");
  const btn = document.getElementById("btnLogin");
  const inputCorreo = document.getElementById("correo");
  const inputPass = document.getElementById("contrasenia");

  // 3. Manejo del evento Submit
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpieza inicial de estado visual
    showFormError("");
    setLoading(btn, true);

    const correo = inputCorreo.value.trim();
    const contrasenia = inputPass.value;

    // Validación básica
    if (!correo || !contrasenia) {
      showFormError("Completa tu correo y contraseña.");
      setLoading(btn, false);
      return;
    }

    try {
      // A. Llamada a la API (authService.js)
      const data = await loginRequest(correo, contrasenia);

      // B. Guardado de sesión (authManager.js)
      auth.set(data);

      // C. Redirección (authManager.js)
      goHomeByRole(data.rol);

    } catch (err) {
      // Manejo de errores
      console.error(err);
      showFormError(err.message);
    } finally {
      // Restaurar botón
      setLoading(btn, false);
    }
  });
});