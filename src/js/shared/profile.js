// src/js/shared/profile.js
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { CLIENTE, VENDEDOR } from "../../utils/constants.js";
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
import { 
    fetchAgenda, 
    saveAgenda, 
    fetchPendingAppointments 
} from "../../api/agendaService.js";
import { fetchOcupaciones } from "../../api/catalogueService.js";
import { fetchUnlockedContacts } from "../../api/contactService.js";

// === 1. IMPORTAR NOTIFICACIONES ===
import {
  showNotif,
  NOTIF_RED,
  NOTIF_ORANGE,
  NOTIF_GREEN // Asumimos que existe. Si no, usa una clase CSS personalizada o null
} from "../../utils/notifications.js";

// MODO DEV
const DEV_BYPASS_AUTH = false; 
const DEV_SHOW_ALL_SECTIONS = false;

let originalProfile = null;
let pendingPhotoFile = null;

let agendaLoaded = false;
let originalAgenda = null;
let ocupacionesCatalog = [];
let ocupacionesLoaded  = false;

let contactsLoaded = false; 
let appointmentsLoaded = false; 

// === 2. VARIABLE GLOBAL DE NOTIFICACIÓN ===
let notificationEl = null; 

// Reglas de contraseña
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
document.addEventListener("DOMContentLoaded", async () => {
    
    // === 3. INICIALIZAR ELEMENTO DE NOTIFICACIÓN ===
    notificationEl = document.getElementById("notification");

    if (!DEV_BYPASS_AUTH) {
        const role = auth.role();
        if (role !== CLIENTE && role !== VENDEDOR) {
            return goHomeByRole(role);
        }
    }

    setEditing(false);

    wireEditProfile();
    initAgendaOnProfile();
    wireAgendaAccordion();
    wireAppointmentsAccordion();
    wirePreferencesAccordion();
    wireContactsAccordion();
    wirePasswordAccordion();
    wireDeleteAccount();

    enablePasswordToggle("#toggleCurrentPassword", "#currentPassword");
    enablePasswordToggle("#toggleNewPassword", "#newPassword");

    loadProfile()
      .then(() => {
        setEditing(false);
        applyRoleVisibility();
      })
      .catch((err) => {
        console.error("Error cargando perfil:", err);
        // Usamos uiError en lugar de showMainError
        uiError("No se pudo cargar tu perfil. Intenta más tarde.");
        applyRoleVisibility();
      });
});


// =========================
//  HELPERS UI (Notificaciones)
// =========================

// Función auxiliar para errores (Rojo)
function uiError(msg, duration = 5000) {
    // Mantenemos el console.error para debug si lo deseas, o confiamos en el catch
    if (notificationEl) return showNotif(notificationEl, msg, NOTIF_RED, duration);
    // Fallback por si no cargó el DOM (raro)
    alert(msg); 
}

// Función auxiliar para advertencias (Naranja)
function uiWarn(msg, duration = 4000) {
    if (notificationEl) return showNotif(notificationEl, msg, NOTIF_ORANGE, duration);
}

// Función auxiliar para éxito (Verde)
function uiSuccess(msg, duration = 3500) {
    // Si NOTIF_GREEN no está definido en tu utils, usa una string hardcodeada o null
    if (notificationEl) return showNotif(notificationEl, msg, NOTIF_GREEN, duration);
}

// Limpiar errores visuales
function clearMainError() {
    // Limpiamos el texto rojo estático si existiera
    const p = document.getElementById("mainError");
    if (p) {
        p.textContent = "";
        p.hidden = true;
    }
    // Opcional: Ocultar notificación actual si quisieras
    // if (notificationEl) notificationEl.classList.remove("notif-shows");
}


// =========================
//  CARGA Y PINTADO PERFIL
// =========================

async function loadProfile() {
  const raw = await fetchMyProfile();
  originalProfile = mapProfileDataToFront(raw);
  fillProfileUI(originalProfile);
  applyStaticFieldsByRole();
  
  if (originalProfile.tipoUsuario === "CLIENTE") {
    await ensureOcupacionesLoaded();
    applyOcupacionFromProfile(originalProfile);
  }
}

function fillProfileUI(p) {
  // ... (código existente sin cambios)
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

  // Fecha
  const fechaLabel = document.getElementById("fechaNacimientoLabel");
  const fechaInput = document.getElementById("fechaNacimiento");
  if (fechaInput) {
    if (p.fechaNacimiento) {
      fechaInput.value = p.fechaNacimiento; 
      if (fechaLabel) fechaLabel.textContent = p.fechaNacimiento;
    } else {
      fechaInput.value = "";
      if (fechaLabel) fechaLabel.textContent = "—";
    }
  }

  // Teléfono
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
    correoInput.disabled = true;
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
  fillPreferencesFromProfile(p);
}

// ... (ensureOcupacionesLoaded, fillOcupacionSelect, applyOcupacionFromProfile, applyStaticFieldsByRole se mantienen igual) ...

async function ensureOcupacionesLoaded() {
  if (ocupacionesLoaded) return;
  try {
    ocupacionesCatalog = await fetchOcupaciones();
    ocupacionesLoaded = true;
    fillOcupacionSelect();
    if (originalProfile) applyOcupacionFromProfile(originalProfile);
  } catch (err) {
    console.error("Error cargando ocupaciones:", err);
    // No lanzamos uiError aquí para no spammear al usuario al cargar la página,
    // solo log en consola es suficiente para algo secundario.
  }
}

function fillOcupacionSelect() {
  const select = document.getElementById("idOcupacion");
  if (!select) return;
  select.innerHTML = '<option value="">Selecciona una ocupación</option>';
  ocupacionesCatalog.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = String(o.id);
    opt.textContent = o.nombre;
    select.appendChild(opt);
  });
}

function applyOcupacionFromProfile(p) {
  const select = document.getElementById("idOcupacion");
  const label  = document.getElementById("ocupacionLabel");
  if (!select || !label) return;
  const id = p.ocupacion ?? p.idOcupacion ?? null; 
  if (!id) {
    label.textContent = "—";
    select.value = "";
    return;
  }
  const idStr = String(id);
  select.value = idStr;
  const found = ocupacionesCatalog.find((o) => String(o.id) === idStr);
  if (found) {
      label.textContent = found.nombre;
      label.classList.remove("text-muted"); 
  } else {
      label.textContent = "—"; 
  }
}

function applyStaticFieldsByRole() {
  const tipoSpan   = document.querySelector('[for="tipoUsuario"].label-info, span[for="tipoUsuario"], .label-info-tipo');
  const fechaSpan  = document.getElementById("fechaNacimientoLabel");
  const fechaInput = document.getElementById("fechaNacimiento");
  const telInput   = document.getElementById("telefono"); 

  if (tipoSpan) tipoSpan.classList.add("label-info--static");
  if (fechaSpan) fechaSpan.classList.add("label-info--static");
  if (fechaInput) {
    fechaInput.disabled = true;
    fechaInput.classList.remove("profile-edit-field");
    fechaInput.style.display = "none";
  }
  if (originalProfile?.tipoUsuario === "CLIENTE") {
    if (telInput) {
      const container = telInput.closest('.form-group'); 
      if (container) container.style.display = "none";
    }
  }
}


// =========================
//  MODO EDICIÓN PERFIL
// =========================

function wireEditProfile() {
  const form          = document.getElementById("registerForm");
  const btnEdit       = document.getElementById("btnEditProfile");
  const btnCancel     = document.getElementById("btnCancelEdit");
  const btnPhoto      = document.getElementById("btnEditPhoto");
  const fotoInput     = document.getElementById("fotoPerfil");
  const photoPreview  = document.getElementById("photoPreview");
  const fileError     = document.getElementById("fileError");

  if (!form) return;

  if (btnEdit) {
    btnEdit.addEventListener("click", () => {
      clearMainError();
      setEditing(true);
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.preventDefault();
      if (originalProfile) fillProfileUI(originalProfile);
      pendingPhotoFile = null;
      if (fotoInput) fotoInput.value = "";
      setEditing(false);
      clearMainError();
    });
  }

  if (btnPhoto && fotoInput) {
    btnPhoto.addEventListener("click", () => fotoInput.click());
  }

  if (fotoInput && photoPreview && fileError) {
    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      fileError.textContent = "";

      if (!file) {
        pendingPhotoFile = null;
        if (originalProfile?.urlFotoPerfil) {
          photoPreview.innerHTML =
            `<img src="${originalProfile.urlFotoPerfil}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        } else {
          photoPreview.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
        return;
      }

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

  // Submit → Guardar cambios
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMainError();

    if (!originalProfile) {
      uiError("No se pudo determinar el estado inicial del perfil.");
      return;
    }

    try {
      let updatedRaw = null;

      if (pendingPhotoFile) {
        updatedRaw = await uploadProfilePhoto(pendingPhotoFile);
        originalProfile = mapProfileDataToFront(updatedRaw);
        pendingPhotoFile = null;
      }

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
      // REEMPLAZO DE ALERT POR NOTIFICACIÓN
      uiSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      console.error(err);
      // REEMPLAZO DE SHOWMAINERROR POR NOTIFICACIÓN
      uiError(err.message || "Error al guardar los cambios.");
    }
  });
}

function setEditing(isEditing) {
  // ... (código existente setEditing se mantiene igual)
  const form      = document.getElementById("registerForm");
  const btnEdit   = document.getElementById("btnEditProfile");
  const btnSave   = document.getElementById("btnSaveProfile");
  const btnCancel = document.getElementById("btnCancelEdit");
  const btnPhoto  = document.getElementById("btnEditPhoto");
  const lbPhotoWarning = document.getElementById("lbPhotoWarning");

  if (!form) return;

  if (isEditing) form.classList.add("profile-edit-mode");
  else form.classList.remove("profile-edit-mode");

  const nombreInput = document.getElementById("nombreCompleto");
  const telInput    = document.getElementById("telefono");
  const editableInputs = [];
  if (nombreInput) editableInputs.push(nombreInput);

  const rol = originalProfile?.tipoUsuario;
  if (rol === "VENDEDOR" && telInput) editableInputs.push(telInput);

  editableInputs.forEach((input) => {
    if (input) input.disabled = !isEditing;
  });

  if (btnEdit)        btnEdit.style.display        = isEditing ? "none"        : "inline-flex";
  if (btnSave)        btnSave.style.display        = isEditing ? "inline-flex" : "none";
  if (btnCancel)      btnCancel.style.display      = isEditing ? "inline-flex" : "none";
  if (btnPhoto)       btnPhoto.style.display       = isEditing ? "inline-flex" : "none";
  if (lbPhotoWarning) lbPhotoWarning.style.display = isEditing ? "inline-flex" : "none";
}

// ... (buildProfilePatchBody, fillPreferencesFromProfile, applyRoleVisibility se mantienen igual) ...

function buildProfilePatchBody(original) {
  const body = {};
  const nombreInput   = document.getElementById("nombreCompleto");
  const telefonoInput = document.getElementById("telefono");
  // Preferencias
  const ocupSelect       = document.getElementById("idOcupacion");
  const presupuestoInput = document.getElementById("presupuesto");
  const ubicacionInput   = document.getElementById("ubicacionInteres");
  const miembrosInput    = document.getElementById("numeroMiembrosFamilia");

  const newNombre   = nombreInput?.value.trim() || "";
  const newTelefono = telefonoInput?.value.trim() || "";

  if (newNombre && newNombre !== (original.nombreCompleto || "")) {
    body.nombreCompleto = newNombre;
  }

  if (original.tipoUsuario === "VENDEDOR") {
    if (newTelefono !== (original.telefono || "")) {
      body.telefono = newTelefono || null;
    }
  }

  if (original.tipoUsuario === "CLIENTE") {
    const newPresupuesto = presupuestoInput?.value.trim() || "";
    const newUbicacion   = ubicacionInput?.value.trim() || "";
    const newMiembros    = miembrosInput?.value.trim() || "";
    const newOcupIdStr   = ocupSelect?.value || "";

    if (newPresupuesto !== "" && Number(newPresupuesto) !== (original.presupuesto ?? null)) {
      body.presupuesto = Number(newPresupuesto);
    } else if (newPresupuesto === "" && original.presupuesto != null) {
      body.presupuesto = null;
    }

    if (newUbicacion !== (original.ubicacionInteres || "")) {
      body.ubicacionInteres = newUbicacion || null;
    }

    if (newMiembros !== (original.miembrosFamilia || "")) {
      body.numeroMiembrosFamilia = newMiembros || null;
    }

    if (newOcupIdStr) {
      const newOcupId = Number(newOcupIdStr);
      // Validar si cambió respecto al original
      if (newOcupId !== (original.ocupacion ?? original.idOcupacion ?? null)) {
        body.idOcupacion = newOcupId;
      }
    } else if (original.ocupacion || original.idOcupacion) {
      // El usuario tenía ocupación y seleccionó la opción vacía
      // ENVIAMOS -1 PARA QUE EL BACKEND SEPA QUE DEBE BORRARLA
      body.idOcupacion = -1; 
    }
  }

  return body;
}

function fillPreferencesFromProfile(p) {
  const presupuestoLabel = document.getElementById("presupuestoLabel");
  const presupuestoInput = document.getElementById("presupuesto");
  if (presupuestoLabel) presupuestoLabel.textContent = p.presupuesto != null ? p.presupuesto.toString() : "—";
  if (presupuestoInput) presupuestoInput.value = p.presupuesto != null ? p.presupuesto : "";

  const ubicacionLabel = document.getElementById("ubicacionLabel");
  const ubicacionInput = document.getElementById("ubicacionInteres");
  if (ubicacionLabel) ubicacionLabel.textContent = p.ubicacionInteres || "—";
  if (ubicacionInput) ubicacionInput.value = p.ubicacionInteres || "";

  const miembrosLabel = document.getElementById("miembrosLabel");
  const miembrosInput = document.getElementById("numeroMiembrosFamilia");
  if (miembrosLabel) miembrosLabel.textContent = p.miembrosFamilia || "—";
  if (miembrosInput) miembrosInput.value = p.miembrosFamilia || "";

  const ocupacionLabel = document.getElementById("ocupacionLabel");
  const ocupacionInput = document.getElementById("idOcupacion");
  //if (ocupacionLabel) ocupacionLabel.textContent = p.ocupacion != null ? p.ocupacion.toString() : "—";
  if (ocupacionInput) ocupacionInput.value = p.ocupacion != null ? p.ocupacion : "";
  if (ocupacionesLoaded) {
      applyOcupacionFromProfile(p);
  }
}

function applyRoleVisibility() {
  const agendaCard      = document.getElementById("agendaCard");
  const appointmentsCard  = document.getElementById("appointmentsCard");
  const preferencesCard   = document.getElementById("preferencesCard");
  const contactsCard      = document.getElementById("contactsCard");

  if (!agendaCard) return;

  if (DEV_SHOW_ALL_SECTIONS || !originalProfile) {
    if (agendaCard) agendaCard.style.display = "";
    if (appointmentsCard) appointmentsCard.style.display = "";
    if (preferencesCard) preferencesCard.style.display = "";
    if (contactsCard) contactsCard.style.display = "";
    return;
  }

  const rol = originalProfile.tipoUsuario;

  if (rol === "CLIENTE") {
    if (agendaCard)       agendaCard.style.display = "none";
    if (appointmentsCard) appointmentsCard.style.display = "none"; 
    if (preferencesCard)  preferencesCard.style.display = "";
    if (contactsCard)     contactsCard.style.display = "";
  } else if (rol === "VENDEDOR") {
    if (agendaCard)       agendaCard.style.display = "";
    if (appointmentsCard) appointmentsCard.style.display = "";
    if (preferencesCard)  preferencesCard.style.display = "none";
    if (contactsCard)     contactsCard.style.display = "none";
  }
}


// =========================
//  ELIMINAR CUENTA
// =========================

function wireDeleteAccount() {
  const btnDelete = document.getElementById("btnDeleteAccount");
  if (!btnDelete) return;

  btnDelete.addEventListener("click", async () => {
    // Aquí puedes usar window.confirm o un modal más elaborado,
    // por ahora el confirm es aceptable ya que es crítico.
    const confirmDelete = window.confirm(
      "Esta acción eliminará tu cuenta permanentemente. ¿Seguro que deseas continuar?"
    );
    if (!confirmDelete) return;

    const pwd = window.prompt("Para confirmar, escribe tu contraseña actual:");
    if (!pwd) return;

    try {
      await deleteMyAccount(pwd);
      // REEMPLAZO DE ALERT
      uiSuccess("Cuenta eliminada. Cerrando sesión...", 2000);
      
      setTimeout(() => {
          auth.clear();
          window.location.href = "/";
      }, 2000);

    } catch (err) {
      console.error(err);
      // REEMPLAZO DE ALERT
      uiError(err.message || "No se pudo eliminar la cuenta.");
    }
  });
}


// =========================
//  AGENDA
// =========================

function wireAgendaAccordion() {
  const agendaCard   = document.getElementById("agendaCard");
  const header       = document.getElementById("agendaAccordionHeader");
  
  if (!agendaCard || !header) return;

  header.addEventListener("click", async (e) => {
    e.stopPropagation();
    const isOpen = agendaCard.classList.contains("agenda-open");

    if (!isOpen) {
      agendaCard.classList.add("agenda-open");
      if (!agendaLoaded) {
        try {
          const data = await fetchAgenda();
          agendaLoaded   = true;
          originalAgenda = data;
          fillAgendaUIFromResponse(data);
        } catch (err) {
          console.error(err);
          // REEMPLAZO DE SHOWMAINERROR
          uiWarn("No se pudo cargar la agenda.");
        }
      }
    } else {
      agendaCard.classList.remove("agenda-open");
    }
  });
}

// ... (wirePreferencesAccordion empieza aquí) ...
function wirePreferencesAccordion() {
  const card    = document.getElementById("preferencesCard");
  const header  = document.getElementById("preferencesHeader");
  const btnEdit   = document.getElementById("btnEditPreferences");
  const btnSave   = document.getElementById("btnSavePreferences");
  const btnCancel = document.getElementById("btnCancelPreferences");

  if (!card || !header) return;

  const toggleCard = () => card.classList.toggle("preferences-open");

  header.addEventListener("click", (e) => {
    toggleCard();
  });

  if (btnEdit) {
    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setPreferencesEditing(true);
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setPreferencesEditing(false);
      if (originalProfile) fillPreferencesFromProfile(originalProfile);
    });
  }

  // Guardar Preferencias
  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      if (!originalProfile || originalProfile.tipoUsuario !== "CLIENTE") {
        uiError("Solo los clientes pueden editar sus preferencias.");
        return;
      }

      const patchBody = buildPreferencesPatchBody(originalProfile);
      const hasChanges = Object.keys(patchBody).length > 0;

      if (!hasChanges) {
        setPreferencesEditing(false);
        return;
      }

      try {
        const updatedRaw = await patchMyProfile(patchBody);
        originalProfile = mapProfileDataToFront(updatedRaw);
        fillPreferencesFromProfile(originalProfile);
        setPreferencesEditing(false);
        // REEMPLAZO DE ALERT
        uiSuccess("Preferencias actualizadas correctamente.");
      } catch (err) {
        console.error(err);
        uiError(err.message || "Error al guardar las preferencias.");
      }
    });
  }
}

function setPreferencesEditing(isEditing) {
  // ... (igual que antes)
  const card      = document.getElementById("preferencesCard");
  const btnEdit   = document.getElementById("btnEditPreferences");
  const btnSave   = document.getElementById("btnSavePreferences");
  const btnCancel = document.getElementById("btnCancelPreferences");
  const presupuestoInput = document.getElementById("presupuesto");
  const ubicacionInput   = document.getElementById("ubicacionInteres");
  const miembrosInput    = document.getElementById("numeroMiembrosFamilia");
  const ocupacionInput   = document.getElementById("idOcupacion");

  if (!card) return;

  if (isEditing) card.classList.add("preferences-edit-mode");
  else card.classList.remove("preferences-edit-mode");

  [presupuestoInput, ubicacionInput, miembrosInput, ocupacionInput].forEach((el) => {
    if (el) el.disabled = !isEditing;
  });

  if (btnEdit)   btnEdit.style.display   = isEditing ? "none"        : "inline-flex";
  if (btnSave)   btnSave.style.display   = isEditing ? "inline-flex" : "none";
  if (btnCancel) btnCancel.style.display = isEditing ? "inline-flex" : "none";
}

function buildPreferencesPatchBody(original) {
    // ... (igual que antes)
    const body = {};
    if (!original || original.tipoUsuario !== "CLIENTE") return body;
    const presupuestoInput = document.getElementById("presupuesto");
    const ubicacionInput   = document.getElementById("ubicacionInteres");
    const miembrosInput    = document.getElementById("numeroMiembrosFamilia");
    const ocupacionInput   = document.getElementById("idOcupacion");

    if (presupuestoInput) {
        const raw = presupuestoInput.value.trim();
        if (raw !== "") {
            const val = Number(raw.replace(",", ""));
            const originalVal = original.presupuesto != null ? Number(original.presupuesto) : null;
            if (!Number.isNaN(val) && val !== originalVal) body.presupuesto = val;
        }
    }
    if (ubicacionInput) {
        const val = ubicacionInput.value.trim();
        const originalVal = original.ubicacionInteres || "";
        if (val && val !== originalVal) body.ubicacionInteres = val;
    }
    if (miembrosInput) {
        const val = miembrosInput.value.trim();
        const originalVal = original.miembrosFamilia || "";
        if (val && val !== originalVal) body.numeroMiembrosFamilia = val;
    }
    if (ocupacionInput) {
        const raw = ocupacionInput.value.trim();
        if (raw !== "") {
            const val = parseInt(raw, 10);
            const originalVal = original.ocupacion != null ? parseInt(original.ocupacion, 10) : null;
            if (!Number.isNaN(val) && val !== originalVal) body.idOcupacion = val;
        }
    }
    return body;
}


// ... (wireContactsAccordion, loadContactsTable, wireAppointmentsAccordion, loadAppointmentsTable, getAppointmentStatusBadge, formatDate, formatTime se mantienen igual) ...

function wireContactsAccordion() {
  const card   = document.getElementById("contactsCard");
  const header = document.getElementById("contactsHeader");
  if (!card || !header) return;
  header.addEventListener("click", async (e) => {
    e.stopPropagation();
    const isOpen = card.classList.contains("contacts-open");
    if (!isOpen) {
      card.classList.add("contacts-open");
      if (!contactsLoaded) await loadContactsTable();
    } else {
      card.classList.remove("contacts-open");
    }
  });
}

async function loadContactsTable() {
  const tableBody = document.querySelector("#contactsTable tbody");
  const loadingMsg = document.getElementById("contactsLoading");
  if (!tableBody) return;
  try {
    if (loadingMsg) loadingMsg.style.display = "block";
    const data = await fetchUnlockedContacts();
    contactsLoaded = true;
    tableBody.innerHTML = ""; 
    if (!data || data.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" style="text-align:center; padding:1rem;">No tienes contactos desbloqueados aún.</td>`;
      tableBody.appendChild(tr);
    } else {
      data.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${c.nombreVendedor || "—"}</td><td>${c.correoVendedor || "—"}</td><td>${c.telefonoVendedor || "—"}</td>`;
        tableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error cargando contactos:", err);
    tableBody.innerHTML = `<tr><td colspan="3" class="error-text" style="text-align:center;">No se pudieron cargar los contactos. Intenta más tarde.</td></tr>`;
  } finally {
    if (loadingMsg) loadingMsg.style.display = "none";
  }
}

function wireAppointmentsAccordion() {
  const card   = document.getElementById("appointmentsCard");
  const header = document.getElementById("appointmentsHeader");
  if (!card || !header) return;
  header.addEventListener("click", async (e) => {
    e.stopPropagation();
    const isOpen = card.classList.contains("appointments-open");
    if (!isOpen) {
      card.classList.add("appointments-open");
      if (!appointmentsLoaded) await loadAppointmentsTable();
    } else {
      card.classList.remove("appointments-open");
    }
  });
}

async function loadAppointmentsTable() {
  const tableBody  = document.querySelector("#appointmentsTable tbody");
  const loadingMsg = document.getElementById("appointmentsLoading");
  if (!tableBody) return;
  try {
    if (loadingMsg) loadingMsg.style.display = "block";
    const data = await fetchPendingAppointments();
    appointmentsLoaded = true;
    tableBody.innerHTML = ""; 
    if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#666;">No tienes citas pendientes programadas.</td></tr>`;
    } else {
      data.forEach(cita => {
        const tr = document.createElement("tr");
        const statusHtml = getAppointmentStatusBadge(cita.fecha);
        tr.innerHTML = `<td style="text-align:center;">${statusHtml}</td><td>${formatDate(cita.fecha)}</td><td>${formatTime(cita.hora)}</td><td>${cita.nombrePropiedad || "—"}</td><td>${cita.nombreCliente || "—"}</td>`;
        tableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error cargando citas:", err);
    tableBody.innerHTML = `<tr><td colspan="5" class="error-text" style="text-align:center;">No se pudieron cargar las citas. Intenta más tarde.</td></tr>`;
  } finally {
    if (loadingMsg) loadingMsg.style.display = "none";
  }
}

function getAppointmentStatusBadge(dateString) {
    if (!dateString) return "";
    const today = new Date();
    const citaDate = new Date(dateString + "T00:00:00"); 
    today.setHours(0, 0, 0, 0);
    const diffTime = citaDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 0) return `<span class="status-badge status-today">Hoy !!</span>`;
    if (diffDays === 1) return `<span class="status-badge status-tomorrow">Mañana</span>`;
    return "";
}

function formatDate(isoDate) {
    if (!isoDate) return "—";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function formatTime(isoTime) {
    if (!isoTime) return "—";
    return isoTime.substring(0, 5);
}


// =========================
//  CAMBIO DE CONTRASEÑA
// =========================
function wirePasswordAccordion() {
  const card   = document.querySelector(".password-card");
  const header = card ? card.querySelector(".password-header") : null;
  
  const currentPwd = document.getElementById("currentPassword");
  const newPwd     = document.getElementById("newPassword");
  const confirmPwd = document.getElementById("confirmNewPassword");
  
  const btnSave    = document.getElementById("btnSavePassword");
  const btnCancel  = document.getElementById("btnCancelPassword");

  if (!card || !header) return;

  const setPasswordEditing = (isOpen) => {
    [currentPwd, newPwd, confirmPwd].forEach((el) => {
      if (el) el.disabled = !isOpen;
    });
  };

  const isOpen = () => card.classList.contains("password-open");
  
  const toggleCard = () => {
      if(isOpen()) {
          card.classList.remove("password-open");
          setPasswordEditing(false);
      } else {
          card.classList.add("password-open");
          setPasswordEditing(true);
      }
  };

  header.addEventListener("click", () => {
    toggleCard();
  });

  if (newPwd) {
    newPwd.addEventListener("input", () => updatePasswordRulesUI(newPwd.value));
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita burbujeo
      // No necesitamos preventDefault aquí porque suele ser type="button", 
      // pero si fuera submit, también se requeriría.
      
      if (currentPwd) currentPwd.value = "";
      if (newPwd)     newPwd.value = "";
      if (confirmPwd) confirmPwd.value = "";
      
      resetPasswordRulesUI();
      clearMainError();
      
      if (isOpen()) toggleCard();
    });
  }

  // === AQUÍ ESTÁ LA CORRECCIÓN ===
  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation(); 
      e.preventDefault(); // <--- ¡IMPORTANTE! Evita que el formulario recargue la página
      
      clearMainError();

      const actual = currentPwd ? currentPwd.value.trim() : "";
      const nueva  = newPwd ? newPwd.value.trim() : "";
      const conf   = confirmPwd ? confirmPwd.value.trim() : "";

      // Validaciones con feedback visual
      if (!actual || !nueva || !conf) {
        uiWarn("Por favor, completa todos los campos de contraseña.");
        return;
      }

      if (nueva !== conf) {
        uiWarn("La nueva contraseña y la confirmación no coinciden.");
        return;
      }

      if (!isPasswordStrong(nueva)) {
        uiWarn("La nueva contraseña no cumple con los requisitos de seguridad.");
        updatePasswordRulesUI(nueva);
        return;
      }

      if (actual === nueva) {
        uiWarn("La nueva contraseña no puede ser igual a la actual.");
        return;
      }

      try {
        await changeMyPassword({ actual, nueva });
        uiSuccess("¡Contraseña actualizada correctamente!");

        if (currentPwd) currentPwd.value = "";
        if (newPwd)     newPwd.value = "";
        if (confirmPwd) confirmPwd.value = "";
        resetPasswordRulesUI();
        toggleCard(); 

      } catch (err) {
        console.error(err);
        uiError(err.message || "No se pudo cambiar la contraseña. Verifica tu contraseña actual.");
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

  if (originalProfile && originalProfile.tipoUsuario !== "VENDEDOR") {
    agendaCard.style.display = "none";
    return;
  }

  initAgendaTimeSelectors(selInicio, selFin, selDur);
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });

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
          uiError(err.message || "No se pudo cargar la agenda.");
          return;
        }
      }
      setAgendaEditing(true);
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setAgendaEditing(false);
      if (originalAgenda) fillAgendaUIFromResponse(originalAgenda);
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      const payload = buildAgendaPayloadFromForm();
      const algunDia =
        payload.lunes || payload.martes || payload.miercoles ||
        payload.jueves || payload.viernes || payload.sabado || payload.domingo;

      if (!algunDia) {
        uiWarn("Selecciona al menos un día de atención.");
        return;
      }

      if (!payload.horarioAtencionInicio || !payload.horarioAtencionFin || !payload.duracionVisita) {
        uiWarn("Completa los horarios y la duración de las visitas.");
        return;
      }

      try {
        const updated = await saveAgenda(payload);
        originalAgenda = updated;
        fillAgendaUIFromResponse(updated);
        setAgendaEditing(false);
        // REEMPLAZO DE ALERT
        uiSuccess("Agenda actualizada correctamente.");
      } catch (err) {
        console.error(err);
        uiError(err.message || "Error al guardar la agenda.");
      }
    });
  }
  setAgendaEditing(false);
}

// src/js/shared/profile.js

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

  // 1. Asignar Hora Inicio y FORZAR actualización de opciones de Hora Fin
  if (selInicio && inicioLabel) {
      selInicio.value = inicioLabel;
      // IMPORTANTE: Disparamos el evento manualmente para que agendaUtils 
      // detecte el cambio y rellene las opciones del select 'horaFin'.
      selInicio.dispatchEvent(new Event("change"));
  }

  // 2. Asignar Hora Fin (Ahora sí existen las opciones)
  if (selFin && finLabel) {
      selFin.value = finLabel;
  }

  // 3. Duración
  if (selDur && data.duracionVisita != null) {
      // Convertir a string por si viene como número
      selDur.value = String(data.duracionVisita); 
      // Validar si la duración es válida para el rango (opcional, pero buena práctica)
      // checkDuracion(selInicio, selFin, selDur); 
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
    duracionLabel.textContent = mins ? `${mins} minutos` : "—";
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
  if (isEditing) agendaSection.classList.add("agenda-edit-mode");
  else agendaSection.classList.remove("agenda-edit-mode");

  [selInicio, selFin, selDur].forEach((el) => { if (el) el.disabled = !isEditing; });
  dayBtns.forEach((btn) => { btn.disabled = !isEditing; });

  if (btnEdit)   btnEdit.style.display   = isEditing ? "none"        : "inline-flex";
  if (btnSave)   btnSave.style.display   = isEditing ? "inline-flex" : "none";
  if (btnCancel) btnCancel.style.display = isEditing ? "inline-flex" : "none";
}