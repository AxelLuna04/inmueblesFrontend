// src/js/shared/profile.js
import { auth } from "../../utils/authManager.js";
import { requireAuth } from "../../utils/routeGuard.js";
import {
  fetchMyProfile,
  mapProfileDataToFront,
  patchMyProfile,
  uploadProfilePhoto,
  deleteMyAccount,
  changeMyPassword,
} from "../../api/profileService.js";
import { enablePasswordToggle } from "../../utils/togglePassword.js";
import {
  initAgendaTimeSelectors,
  buildAgendaPayloadFromForm,
  applyDaysToButtons,
  localTimeToLabel,
  buildDiasSummary,
} from "../../utils/agendaUtils.js";
import { fetchAgenda, saveAgenda } from "../../api/agendaService.js";

const DEV_BYPASS_AUTH = true; // <-- Pónlo en false antes de subir a prod

let originalProfile = null;   // Perfil mapeado al front
let pendingPhotoFile = null;  // Archivo de foto pendiente

let agendaLoaded = false;      // ya llamamos a GET /agenda
let originalAgenda = null;     // último ConfigurarAgendaResponse

// Reglas de contraseña (mismas que en signup)
const PASSWORD_RULES = [
  { id: "rule-length", regex: /.{8,}/ },
  { id: "rule-upper",  regex: /[A-Z]/ },
  { id: "rule-lower",  regex: /[a-z]/ },
  { id: "rule-number", regex: /[0-9]/ },
];

function updatePasswordRulesUI(value) {
  PASSWORD_RULES.forEach(({ id, regex }) => {
    const li = document.getElementById(id);
    if (!li) return;
    const ok = regex.test(value);
    li.classList.toggle("valid", ok);
    li.classList.toggle("invalid", !ok);
  });
}

function resetPasswordRulesUI() {
  PASSWORD_RULES.forEach(({ id }) => {
    const li = document.getElementById(id);
    if (!li) return;
    li.classList.remove("valid", "invalid");
  });
}

function isPasswordStrong(value) {
  if (!value) return false;
  return PASSWORD_RULES.every(({ regex }) => regex.test(value));
}


// =========================
//  INICIO DE PÁGINA
// =========================
/*document.addEventListener("DOMContentLoaded", async () => {
  try {
    setEditing(false);

    await loadProfile();
    setEditing(false);

    wireEditProfile();
    initAgendaOnProfile();
    wireAgendaAccordion();          // si ya lo tienes
    wirePasswordAccordion();        // NUEVO
    wireDeleteAccount();

    // toggles de ojo para contraseña actual y nueva
    enablePasswordToggle("#toggleCurrentPassword", "#currentPassword");
    enablePasswordToggle("#toggleNewPassword", "#newPassword");
  } catch (err) {
    console.error("Error cargando perfil:", err);
    showMainError("No se pudo cargar tu perfil. Intenta más tarde.");
  }
});*/
document.addEventListener("DOMContentLoaded", async () => {
    // 1) Solo pide sesión si NO estás en modo dev
    if (!DEV_BYPASS_AUTH) {
        await requireAuth(["CLIENTE", "VENDEDOR"]);
    }

    // 1) Siempre arrancamos el formulario de perfil en modo lectura
    setEditing(false);

    // 2) Siempre enganchamos la UI, aunque el backend falle
    wireEditProfile();
    initAgendaOnProfile();      // agenda (roles + lazy-load)
    wireAgendaAccordion();      // header de agenda (flecha / abrir-cerrar)
    wirePasswordAccordion();    // NUEVO: acordeón de cambio de contraseña
    wireDeleteAccount();        // eliminar cuenta

    // toggles de ojo para contraseña actual y nueva
    enablePasswordToggle("#toggleCurrentPassword", "#currentPassword");
    enablePasswordToggle("#toggleNewPassword", "#newPassword");

    // 3) Cargar perfil ASÍNCRONO sin bloquear el wiring de la UI
    loadProfile()
        .then(() => {
        // por si setEditing(false) depende de datos posteriores
        setEditing(false);
        })
        .catch((err) => {
        console.error("Error cargando perfil:", err);
        showMainError("No se pudo cargar tu perfil. Intenta más tarde.");
        });
});




// =========================
//  CARGA Y PINTADO PERFIL
// =========================

async function loadProfile() {
  const raw = await fetchMyProfile();           // PerfilResponse del backend
  originalProfile = mapProfileDataToFront(raw); // normalizamos nombres
  fillProfileUI(originalProfile);
}

function fillProfileUI(p) {
  // Tipo usuario
  const tipoSpan = document.querySelector(
    '[for="tipoUsuario"].label-info, span[for="tipoUsuario"], .label-info-tipo'
  );
  if (tipoSpan) {
    tipoSpan.textContent = p.tipoUsuario === "VENDEDOR" ? "Vendedor" : "Cliente";
  }

  // Nombre
  const nombreLabel = document.getElementById("nombreLabel");
  const nombreInput = document.getElementById("nombreCompleto");
  if (nombreLabel) nombreLabel.textContent = p.nombreCompleto || "—";
  if (nombreInput) nombreInput.value = p.nombreCompleto || "";

  // Fecha de nacimiento (de momento el backend no la manda en PerfilResponse)
  const fechaLabel = document.getElementById("fechaNacimientoLabel");
  const fechaInput = document.getElementById("fechaNacimiento");
  if (fechaInput) {
    if (p.fechaNacimiento) {
      fechaInput.value = p.fechaNacimiento; // "YYYY-MM-DD"
      if (fechaLabel) fechaLabel.textContent = p.fechaNacimiento;
    } else {
      fechaInput.value = "";
      if (fechaLabel) fechaLabel.textContent = "—";
    }
  }

  // Teléfono (solo VENDEDOR lo usa de verdad; para CLIENTE puede venir null)
  const telLabel = document.getElementById("telefonoLabel");
  const telInput = document.getElementById("telefono");
  if (telLabel) telLabel.textContent = p.telefono || "—";
  if (telInput) telInput.value = p.telefono || "";

  // Correo
  const correoLabel = document.getElementById("correoLabel");
  const correoInput = document.getElementById("correo");
  if (correoLabel) correoLabel.textContent = p.correo || "—";
  if (correoInput) {
    correoInput.value = p.correo || "";
    correoInput.disabled = true; // el cambio real de correo va por /me/email
  }

  // Foto
  const preview   = document.getElementById("photoPreview");
  const fileError = document.getElementById("fileError");
  if (preview) {
    preview.innerHTML = "";
    if (p.urlFotoPerfil) {
      const img = document.createElement("img");
      img.src = p.urlFotoPerfil;
      img.alt = "Foto de perfil";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      preview.appendChild(img);
    } else {
      preview.innerHTML = `<i class="fa-solid fa-user"></i>`;
    }
  }
  if (fileError) fileError.textContent = "";
}

// =========================
//  MODO EDICIÓN PERFIL
// =========================

function wireEditProfile() {
  const form          = document.getElementById("registerForm");
  const btnEdit       = document.getElementById("btnEditProfile");
  const btnSave       = document.getElementById("btnSaveProfile");
  const btnCancel     = document.getElementById("btnCancelEdit");
  const btnPhoto      = document.getElementById("btnEditPhoto");
  const fotoInput     = document.getElementById("fotoPerfil");
  const photoPreview  = document.getElementById("photoPreview");
  const fileError     = document.getElementById("fileError");

  if (!form) return;

  // Botón "Editar perfil"
  if (btnEdit) {
    btnEdit.addEventListener("click", () => {
      clearMainError();
      setEditing(true);
    });
  }

  // Botón "Cancelar"
  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.preventDefault();
      if (originalProfile) {
        fillProfileUI(originalProfile); // restaurar estado original
      }
      pendingPhotoFile = null;
      if (fotoInput) fotoInput.value = "";
      setEditing(false);
      clearMainError();
    });
  }

  // Botón "Editar foto" → abrir input file
  if (btnPhoto && fotoInput) {
    btnPhoto.addEventListener("click", () => {
      fotoInput.click();
    });
  }

  // Input file foto → validar, previsualizar, guardar en pendingPhotoFile
  if (fotoInput && photoPreview && fileError) {
    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      fileError.textContent = "";

      if (!file) {
        pendingPhotoFile = null;
        // restaurar preview original
        if (originalProfile?.urlFotoPerfil) {
          photoPreview.innerHTML =
            `<img src="${originalProfile.urlFotoPerfil}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        } else {
          photoPreview.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
        return;
      }

      // Validaciones alineadas al backend: 10MB, JPG/PNG/WEBP
      const MAX_BYTES = 10 * 1024 * 1024;
      const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

      if (file.size > MAX_BYTES) {
        fileError.textContent = "La imagen excede el tamaño máximo (10MB).";
        fotoInput.value = "";
        pendingPhotoFile = null;
        return;
      }

      if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
        fileError.textContent = "Formato no permitido. Usa JPG, PNG o WEBP.";
        fotoInput.value = "";
        pendingPhotoFile = null;
        return;
      }

      pendingPhotoFile = file;

      const reader = new FileReader();
      reader.onload = (ev) => {
        photoPreview.innerHTML =
          `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
      };
      reader.readAsDataURL(file);
    });
  }

  // Submit → Guardar cambios (foto + campos)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMainError();

    if (!originalProfile) {
      showMainError("No se pudo determinar el estado inicial del perfil.");
      return;
    }

    try {
      let updatedRaw = null;

      // 1) Si hay foto nueva, la subimos primero
      if (pendingPhotoFile) {
        updatedRaw = await uploadProfilePhoto(pendingPhotoFile);
        originalProfile = mapProfileDataToFront(updatedRaw);
        pendingPhotoFile = null;
      }

      // 2) Ver si hay cambios en los campos de texto
      const patchBody = buildProfilePatchBody(originalProfile);
      const hasChanges = Object.keys(patchBody).length > 0;

      if (hasChanges) {
        const patchedRaw = await patchMyProfile(patchBody);
        updatedRaw = patchedRaw;
        originalProfile = mapProfileDataToFront(patchedRaw);
      }

      if (updatedRaw) {
        fillProfileUI(originalProfile);
      }

      setEditing(false);
      alert("Perfil actualizado correctamente.");
    } catch (err) {
      console.error(err);
      showMainError(err.message || "Error al guardar los cambios.");
    }
  });
}

function setEditing(isEditing) {
  const form      = document.getElementById("registerForm");
  const btnEdit   = document.getElementById("btnEditProfile");
  const btnSave   = document.getElementById("btnSaveProfile");
  const btnCancel = document.getElementById("btnCancelEdit");
  const btnPhoto  = document.getElementById("btnEditPhoto");
  const lbPhotoWarning = document.getElementById("lbPhotoWarning");

  if (!form) return;

  // Clase para mostrar/ocultar label-info vs inputs
  if (isEditing) {
    form.classList.add("profile-edit-mode");
  } else {
    form.classList.remove("profile-edit-mode");
  }

  // Inputs editables
  const nombreInput = document.getElementById("nombreCompleto");
  const telInput    = document.getElementById("telefono");
  const editableInputs = [nombreInput, telInput];

  editableInputs.forEach((input) => {
    if (!input) return;
    input.disabled = !isEditing;
  });

  // Botones y controles de foto
  if (btnEdit)        btnEdit.style.display        = isEditing ? "none"        : "inline-flex";
  if (btnSave)        btnSave.style.display        = isEditing ? "inline-flex" : "none";
  if (btnCancel)      btnCancel.style.display      = isEditing ? "inline-flex" : "none";
  if (btnPhoto)       btnPhoto.style.display       = isEditing ? "inline-flex" : "none";
  if (lbPhotoWarning) lbPhotoWarning.style.display = isEditing ? "inline-flex" : "none";
}


/**
 * Arma el JSON parcial para PATCH /api/v1/me
 * Solo enviamos campos que realmente cambiaron.
 */
function buildProfilePatchBody(original) {
  const body = {};

  const nombreInput   = document.getElementById("nombreCompleto");
  const telefonoInput = document.getElementById("telefono");

  const newNombre   = nombreInput?.value.trim() || "";
  const newTelefono = telefonoInput?.value.trim() || "";

  if (newNombre && newNombre !== (original.nombreCompleto || "")) {
    body.nombreCompleto = newNombre;
  }

  // teléfono solo aplica realmente a VENDEDOR, pero si el DTO de cliente no lo usa, lo ignorará
  if (newTelefono !== (original.telefono || "")) {
    body.telefono = newTelefono || null;
  }

  return body;
}

// =========================
//  ELIMINAR CUENTA
// =========================

function wireDeleteAccount() {
  const btnDelete = document.getElementById("btnDeleteAccount");
  if (!btnDelete) return;

  btnDelete.addEventListener("click", async () => {
    const confirmDelete = window.confirm(
      "Esta acción eliminará tu cuenta permanentemente. ¿Seguro que deseas continuar?"
    );
    if (!confirmDelete) return;

    const pwd = window.prompt(
      "Para confirmar, escribe tu contraseña actual:"
    );
    if (!pwd) return;

    try {
      await deleteMyAccount(pwd);
      alert("Cuenta eliminada. Cerrando sesión…");
      auth.clear();
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert(err.message || "No se pudo eliminar la cuenta.");
    }
  });
}

// =========================
//  ERRORES
// =========================

function showMainError(msg) {
  const p = document.getElementById("mainError");
  if (!p) return;
  p.textContent = msg || "";
  p.hidden = !msg;
}

function clearMainError() {
  showMainError("");
}

// =========================
//  AGENDA: ACORDEÓN (abrir/cerrar + lazy load)
// =========================

function wireAgendaAccordion() {
  const agendaCard   = document.getElementById("agendaCard");
  const header       = document.getElementById("agendaAccordionHeader");
  const body         = document.getElementById("agendaAccordionBody");

  if (!agendaCard || !header || !body) {
    // Si el HTML aún no tiene el acordeón, salimos sin romper nada
    return;
  }

  header.addEventListener("click", async (e) => {
    e.stopPropagation();

    const isOpen = agendaCard.classList.contains("agenda-open");

    if (!isOpen) {
      // Se va a abrir
      agendaCard.classList.add("agenda-open");

      // Lazy load: primera vez que se abre, traemos /agenda
      if (!agendaLoaded) {
        try {
          const data = await fetchAgenda();
          agendaLoaded   = true;
          originalAgenda = data;
          fillAgendaUIFromResponse(data);
        } catch (err) {
          console.error(err);
          showMainError(err.message || "No se pudo cargar la agenda.");
        }
      }
    } else {
      // Se va a cerrar
      agendaCard.classList.remove("agenda-open");
    }
  });
}

// =========================
//  CAMBIO DE CONTRASEÑA
// =========================
function wirePasswordAccordion() {
  // Usamos clases en lugar de ids para encajar con tu HTML actual
  const card   = document.querySelector(".password-card");
  const header = card ? card.querySelector(".password-header") : null;
  const body   = card ? card.querySelector(".password-body")   : null;

  const currentPwd = document.getElementById("currentPassword");
  const newPwd     = document.getElementById("newPassword");
  const confirmPwd = document.getElementById("confirmNewPassword"); // <- OJO, el id real
  const btnSave    = document.getElementById("btnSavePassword");
  const btnCancel  = document.getElementById("btnCancelPassword");

  if (!card || !header || !body) {
    console.warn("[perfil] password-card/header/body no encontrados");
    return;
  }

  // Habilitar / deshabilitar campos según esté abierto o no
  const setPasswordEditing = (isOpen) => {
    [currentPwd, newPwd, confirmPwd].forEach((el) => {
      if (el) el.disabled = !isOpen;
    });
  };

  const isOpen = () => card.classList.contains("password-open");

  const openCard = () => {
    card.classList.add("password-open");
    setPasswordEditing(true);
  };

  const closeCard = () => {
    card.classList.remove("password-open");
    setPasswordEditing(false);
  };

  const toggleCard = () => {
    if (isOpen()) {
      closeCard();
    } else {
      openCard();
    }
  };

  // Estado inicial: cerrada
  closeCard();

  // Clic en el header → abrir / cerrar
  header.addEventListener("click", (e) => {
    const target = e.target;
    // Si el click viene de los botones internos, no togglear dos veces
    if (
      target.closest("#btnSavePassword") ||
      target.closest("#btnCancelPassword")
    ) {
      return;
    }
    toggleCard();
  });

  // Reglas visuales mientras se escribe la nueva contraseña
  if (newPwd) {
    newPwd.addEventListener("input", () => {
      updatePasswordRulesUI(newPwd.value);
    });
  }

  // Cancelar → limpiar y cerrar
  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentPwd) currentPwd.value = "";
      if (newPwd)     newPwd.value = "";
      if (confirmPwd) confirmPwd.value = "";
      resetPasswordRulesUI();
      clearMainError();
      closeCard();
    });
  }

  // Guardar → validaciones + llamada a backend
  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      const actual = currentPwd ? currentPwd.value.trim() : "";
      const nueva  = newPwd ? newPwd.value.trim() : "";
      const conf   = confirmPwd ? confirmPwd.value.trim() : "";

      if (!actual || !nueva || !conf) {
        showMainError("Completa todos los campos de contraseña.");
        return;
      }

      if (nueva !== conf) {
        showMainError("La nueva contraseña y la confirmación no coinciden.");
        return;
      }

      if (!isPasswordStrong(nueva)) {
        showMainError("La nueva contraseña no cumple con los requisitos.");
        updatePasswordRulesUI(nueva);
        return;
      }

      if (actual === nueva) {
        showMainError("La nueva contraseña no puede ser igual a la actual.");
        return;
      }

      try {
        await changeMyPassword({ actual, nueva });
        alert("Contraseña actualizada correctamente.");

        if (currentPwd) currentPwd.value = "";
        if (newPwd)     newPwd.value = "";
        if (confirmPwd) confirmPwd.value = "";
        resetPasswordRulesUI();
        closeCard();
      } catch (err) {
        console.error(err);
        showMainError(err.message || "No se pudo cambiar la contraseña.");
      }
    });
  }
}

function initAgendaOnProfile() {
  const agendaCard    = document.getElementById("agendaCard");
  const agendaSection = document.getElementById("agendaSection");
  const btnEdit       = document.getElementById("btnEditAgenda");
  const btnSave       = document.getElementById("btnSaveAgenda");
  const btnCancel     = document.getElementById("btnCancelAgenda");
  const selInicio     = document.getElementById("horaInicio");
  const selFin        = document.getElementById("horaFin");
  const selDur        = document.getElementById("duracionVisita");

  if (!agendaSection || !agendaCard) return;

  // Si NO es vendedor, ocultamos completamente la tarjeta
  if (originalProfile && originalProfile.tipoUsuario !== "VENDEDOR") {
    agendaCard.style.display = "none";
    return;
  }

  // Demo sin sesión / pruebas → puedes comentar el bloque de arriba
  // si quieres ver siempre la tarjeta.

  // Iniciar selects de horas (misma lógica que signup)
  initAgendaTimeSelectors(selInicio, selFin, selDur);

  // Botones de días: toggle .active
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
  });

  // Editar agenda
  if (btnEdit) {
    btnEdit.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      if (!agendaLoaded) {
        try {
          const data = await fetchAgenda();
          agendaLoaded   = true;
          originalAgenda = data;
          fillAgendaUIFromResponse(data);
        } catch (err) {
          console.error(err);
          showMainError(err.message || "No se pudo cargar la agenda.");
          return;
        }
      }
      setAgendaEditing(true);
    });
  }

  // Cancelar agenda
  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setAgendaEditing(false);
      if (originalAgenda) {
        fillAgendaUIFromResponse(originalAgenda);
      }
    });
  }

  // Guardar agenda
  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      // Validar que haya al menos 1 día
      const payload = buildAgendaPayloadFromForm();
      const algunDia =
        payload.lunes || payload.martes || payload.miercoles ||
        payload.jueves || payload.viernes || payload.sabado || payload.domingo;

      if (!algunDia) {
        showMainError("Selecciona al menos un día de atención.");
        return;
      }

      if (
        !payload.horarioAtencionInicio ||
        !payload.horarioAtencionFin ||
        !payload.duracionVisita
      ) {
        showMainError("Completa los horarios y la duración de las visitas.");
        return;
      }

      try {
        const updated = await saveAgenda(payload);
        originalAgenda = updated;
        fillAgendaUIFromResponse(updated);
        setAgendaEditing(false);
        alert("Agenda actualizada correctamente.");
      } catch (err) {
        console.error(err);
        showMainError(err.message || "Error al guardar la agenda.");
      }
    });
  }

  // Iniciamos agenda en modo lectura
  setAgendaEditing(false);
}

function fillAgendaUIFromResponse(data) {
  if (!data) return;

  // Marcar botones de día
  applyDaysToButtons(data);

  // Convertir horas LocalTime -> label
  const selInicio = document.getElementById("horaInicio");
  const selFin    = document.getElementById("horaFin");
  const selDur    = document.getElementById("duracionVisita");

  const inicioLabel = localTimeToLabel(data.horarioAtencionInicio);
  const finLabel    = localTimeToLabel(data.horarioAtencionFin);

  if (selInicio && inicioLabel) selInicio.value = inicioLabel;
  if (selFin && finLabel)       selFin.value    = finLabel;
  if (selDur && data.duracionVisita != null) {
    selDur.value = String(data.duracionVisita);
  }

  // Resumenes estáticos
  const diasLabel     = document.getElementById("agendaDiasLabel");
  const horarioLabel  = document.getElementById("agendaHorarioLabel");
  const duracionLabel = document.getElementById("agendaDuracionLabel");

  if (diasLabel)    diasLabel.textContent = buildDiasSummary(data);
  if (horarioLabel) horarioLabel.textContent =
    inicioLabel && finLabel ? `${inicioLabel} - ${finLabel}` : "—";
  if (duracionLabel) {
    const mins = data.duracionVisita;
    if (!mins) {
      duracionLabel.textContent = "—";
    } else {
      duracionLabel.textContent = `${mins} minutos`;
    }
  }
}

function setAgendaEditing(isEditing) {
  const agendaSection  = document.getElementById("agendaSection");
  const btnEdit        = document.getElementById("btnEditAgenda");
  const btnSave        = document.getElementById("btnSaveAgenda");
  const btnCancel      = document.getElementById("btnCancelAgenda");

  const selInicio      = document.getElementById("horaInicio");
  const selFin         = document.getElementById("horaFin");
  const selDur         = document.getElementById("duracionVisita");
  const dayBtns        = document.querySelectorAll(".day-btn");

  if (!agendaSection) return;

  if (isEditing) {
    agendaSection.classList.add("agenda-edit-mode");
  } else {
    agendaSection.classList.remove("agenda-edit-mode");
  }

  // Habilitar / deshabilitar inputs
  [selInicio, selFin, selDur].forEach((el) => {
    if (el) el.disabled = !isEditing;
  });
  dayBtns.forEach((btn) => {
    btn.disabled = !isEditing;
  });

  if (btnEdit)   btnEdit.style.display   = isEditing ? "none"        : "inline-flex";
  if (btnSave)   btnSave.style.display   = isEditing ? "inline-flex" : "none";
  if (btnCancel) btnCancel.style.display = isEditing ? "inline-flex" : "none";
}

