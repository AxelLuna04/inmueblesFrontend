// src/js/auth/signup.js
import { registerRequest, saveAgendaRequest } from "../../api/authService.js";
import { enablePasswordToggle } from "../../utils/togglePassword.js";
import {
  initAgendaTimeSelectors,
  buildAgendaPayloadFromForm,
} from "../../utils/agendaUtils.js";

import {
  showNotif,
  NOTIF_RED,
  NOTIF_ORANGE,
  NOTIF_GREEN,
} from "../../utils/notifications.js";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB como el backend
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

// --- Errores controlados para validaciones del front ---
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

let notificationEl = null; // se asigna en DOMContentLoaded

function clearUIMessage() {
  // Limpia mainError
  showMainError("");

  // Limpia notificación global si existe
  if (notificationEl) {
    notificationEl.textContent = "";
    notificationEl.classList.remove("notif-shows");
    notificationEl.classList.add("notif-hides");
  }
}

function uiWarn(msg, duration = 4000) {
  if (notificationEl) return showNotif(notificationEl, msg, NOTIF_ORANGE, duration);
  showMainError(msg);
}

function uiError(msg, duration = 5000) {
  if (notificationEl) return showNotif(notificationEl, msg, NOTIF_RED, duration);
  showMainError(msg);
}

// Mantén el error real en consola, pero UI con mensaje controlado
function handleCatch(err, fallbackMsg = "Ocurrió un error al registrar la cuenta.") {
  // Validaciones del front (corregibles)
  if (err?.name === "ValidationError") {
    console.warn(err);
    uiWarn(err.message || "Revisa los datos del formulario.");
    return;
  }

  // Errores de API controlados por tu service (mensaje del backend)
  if (err?.name === "ErrorApi") {
    console.error(err); // aquí queda el mensaje real + stack
    uiError(err.message || fallbackMsg);
    return;
  }

  // Cualquier otra cosa
  console.error(err);
  uiError(fallbackMsg);
}

function validateImage(file) {
  if (!file) return "Debes seleccionar una foto de perfil.";

  if (file.size > MAX_BYTES) {
    return "La imagen excede el tamaño máximo (10MB).";
  }

  if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
    return "Formato de imagen no permitido. Usa JPG, PNG o WEBP.";
  }

  return null; // OK
}

function getFotoFileOrThrow() {
  const inputFile = document.getElementById("fotoPerfil");
  const fileError = document.getElementById("fileError");
  const file = inputFile?.files?.[0];

  const error = validateImage(file);
  if (error) {
    if (fileError) fileError.textContent = error;
    // error corregible => ValidationError (warning en UI)
    throw new ValidationError(error);
  }

  if (fileError) fileError.textContent = "";
  return file;
}

document.addEventListener("DOMContentLoaded", () => {
  enablePasswordToggle("#togglePassword", "#contrasenia");

  // Si existe, usamos notifs; si no, seguimos con mainError
  notificationEl = document.getElementById("notification");

  const selTelefono = document.getElementById("telefono");
  if (selTelefono) {
    selTelefono.addEventListener("keydown", (e) => {
      const allowedKeys = [
        "Backspace", "Delete", "ArrowLeft", "ArrowRight",
        "Tab", "Enter", "Home", "End",
      ];
      const isShortcut =
        (e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase());
      const isNumber = /^[0-9]$/.test(e.key);

      if (!isNumber && !allowedKeys.includes(e.key) && !isShortcut) {
        e.preventDefault();
      }
    });

    selTelefono.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
    });
  }

  // 1) Agenda selectors
  const selInicio = document.getElementById("horaInicio");
  const selFin = document.getElementById("horaFin");
  const selDuracion = document.getElementById("duracionVisita");
  initAgendaTimeSelectors(selInicio, selFin, selDuracion);

  // 2) Toggle tipo usuario
  const tipoUsuario = document.getElementById("tipoUsuario");
  const agendaSection = document.getElementById("agendaSection");

  tipoUsuario?.addEventListener("change", (e) => {
    if (e.target.value === "VENDEDOR") {
      agendaSection.classList.remove("hidden");
      agendaSection.style.opacity = "0";
      setTimeout(() => (agendaSection.style.opacity = "1"), 50);
    } else {
      agendaSection.classList.add("hidden");
    }
  });

  // 3) Botones de días
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });

  // 4) Reglas password
  const pass1 = document.getElementById("contrasenia");
  const rules = {
    length: { regex: /.{8,}/, el: document.getElementById("rule-length") },
    upper: { regex: /[A-Z]/, el: document.getElementById("rule-upper") },
    lower: { regex: /[a-z]/, el: document.getElementById("rule-lower") },
    number: { regex: /[0-9]/, el: document.getElementById("rule-number") },
  };

  pass1?.addEventListener("input", () => {
    const val = pass1.value;
    for (const key in rules) {
      const rule = rules[key];
      if (!rule.el) continue;
      if (rule.regex.test(val)) {
        rule.el.classList.add("valid");
        rule.el.classList.remove("invalid");
      } else {
        rule.el.classList.remove("valid");
        rule.el.classList.add("invalid");
      }
    }
  });

  // 5) Preview foto
  const fotoInput = document.getElementById("fotoPerfil");
  const preview = document.getElementById("photoPreview");
  const fileError = document.getElementById("fileError");

  fotoInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (fileError) fileError.textContent = "";

    if (!file) {
      if (preview) preview.innerHTML = "";
      return;
    }

    const error = validateImage(file);
    if (error) {
      if (fileError) fileError.textContent = error;
      fotoInput.value = "";
      if (preview) preview.innerHTML = "";
      // opcional: warning global también
      uiWarn(error);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (preview) {
        preview.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
      }
    };
    reader.readAsDataURL(file);
  });

  // Match pass
  const pass2 = document.getElementById("confirmarContrasenia");
  const matchIcon = document.getElementById("matchIcon");

  function checkMatch() {
    const val1 = pass1?.value ?? "";
    const val2 = pass2?.value ?? "";

    if (val2 === "") {
      pass2.classList.remove("match-success", "match-error");
      if (matchIcon) matchIcon.style.display = "none";
      return;
    }

    if (matchIcon) {
      matchIcon.style.display = "block";
      matchIcon.classList.remove("toggle-password");
    }

    if (val1 === val2) {
      pass2.classList.add("match-success");
      pass2.classList.remove("match-error");
      if (matchIcon) matchIcon.className = "input-icon fa-solid fa-circle-check";
    } else {
      pass2.classList.add("match-error");
      pass2.classList.remove("match-success");
      if (matchIcon) matchIcon.className = "input-icon fa-solid fa-circle-xmark";
    }
  }

  pass1?.addEventListener("input", checkMatch);
  pass2?.addEventListener("input", checkMatch);

  const form = document.getElementById("registerForm");
  const submitBtn = form?.querySelector('button[type="submit"]');

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearUIMessage();
    setLoading(submitBtn, true);

    try {
      // 0) Validaciones rápidas (warnings)
      const payload = buildRegistroPayload();

      if (!payload.tipoUsuario) throw new ValidationError("Selecciona un tipo de usuario.");
      if (!payload.nombreCompleto || payload.nombreCompleto.trim().length < 3) {
        throw new ValidationError("Escribe tu nombre y apellidos.");
      }
      if (!payload.correo) throw new ValidationError("Escribe tu correo.");
      if (!payload.contrasenia) throw new ValidationError("Escribe una contraseña.");

      // Tel opcional, pero si lo ponen, que sea válido (México: 10 dígitos)
      if (payload.telefono && payload.telefono.length !== 10) {
        throw new ValidationError("El teléfono debe tener 10 dígitos.");
      }

      if ((pass1?.value ?? "") !== (pass2?.value ?? "")) {
        throw new ValidationError("Las contraseñas no coinciden.");
      }

      // 1) Foto
      const fotoFile = getFotoFileOrThrow();

      // 2) Registrar
      const registroRes = await registerRequest(payload, fotoFile);

      // 3) Agenda si es VENDEDOR
      if (registroRes.tipoUsuario === "VENDEDOR") {
        const agendaPayload = buildAgendaPayloadFromForm();
        const algunDia =
          agendaPayload.lunes || agendaPayload.martes ||
          agendaPayload.miercoles || agendaPayload.jueves ||
          agendaPayload.viernes || agendaPayload.sabado ||
          agendaPayload.domingo;

        if (!algunDia) throw new ValidationError("Selecciona al menos un día de atención.");

        if (
          !agendaPayload.horarioAtencionInicio ||
          !agendaPayload.horarioAtencionFin ||
          !agendaPayload.duracionVisita
        ) {
          throw new ValidationError("Completa horarios y duración de las visitas.");
        }

        await saveAgendaRequest(registroRes.id, agendaPayload);
      }

      const successMsg = "Registro exitoso. Revisa tu correo para verificar tu cuenta antes de iniciar sesión.";
      if (notificationEl) {
        showNotif(notificationEl, successMsg, NOTIF_GREEN, 4500);
        setTimeout(() => {
            window.location.href = "/";
        }, 4700);
      } else {
        // fallback si no existe #notification
        alert(successMsg);
        window.location.href = "/";
      }

    } catch (err) {
      // UI + console en el formato que quieres
      handleCatch(err, "Error al registrarse.");
    } finally {
      setLoading(submitBtn, false);
    }
  });
});

// --------- Helpers genéricos ---------
function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

function showMainError(msg) {
  const p = document.getElementById("mainError");
  if (!p) return;
  p.textContent = msg || "";
  p.hidden = !msg;
}

// Construye el RegistroRequest
function buildRegistroPayload() {
  const tipoUsuarioEl = document.getElementById("tipoUsuario");
  const nombreEl = document.getElementById("nombre");
  const apellidosEl = document.getElementById("apellidos");
  const correoEl = document.getElementById("correo");
  const passEl = document.getElementById("contrasenia");
  const fechaNacimientoEl = document.getElementById("fechaNacimiento");
  const telefonoEl = document.getElementById("telefono");

  const tipoUsuario = tipoUsuarioEl?.value ?? "";
  const nombre = (nombreEl?.value ?? "").trim();
  const apellidos = (apellidosEl?.value ?? "").trim();
  const correo = (correoEl?.value ?? "").trim();
  const contrasenia = passEl?.value ?? "";
  const fechaNac = fechaNacimientoEl?.value || null;
  const telefono = (telefonoEl?.value ?? "").trim() || null;
  const nombreCompleto = `${nombre} ${apellidos}`.trim();

  return {
    tipoUsuario,
    correo,
    contrasenia,
    nombreCompleto,
    fechaNacimiento: fechaNac,
    telefono,
  };
}
