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
import { fetchOcupaciones } from "../../api/catalogueService.js";

// MODO DEV
const DEV_BYPASS_AUTH = false; // <-- Pónlo en false antes de subir a prod
const DEV_SHOW_ALL_SECTIONS = false;

let originalProfile = null;   // Perfil mapeado al front
let pendingPhotoFile = null;  // Archivo de foto pendiente

let agendaLoaded = false;      // ya llamamos a GET /agenda
let originalAgenda = null;     // último ConfigurarAgendaResponse

let ocupacionesCatalog = [];
let ocupacionesLoaded  = false;


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
    wirePreferencesAccordion();
    wirePasswordAccordion();    // NUEVO: acordeón de cambio de contraseña
    wireDeleteAccount();        // eliminar cuenta

    // toggles de ojo para contraseña actual y nueva
    enablePasswordToggle("#toggleCurrentPassword", "#currentPassword");
    enablePasswordToggle("#toggleNewPassword", "#newPassword");

    // 🔹 MODO DEV: cargar catálogo de ocupaciones aunque no haya perfil/sesión
    // ensureOcupacionesLoaded();  // <-- ESTA LÍNEA

    // 3) Cargar perfil ASÍNCRONO sin bloquear el wiring de la UI
    loadProfile()
      .then(() => {
        setEditing(false);
        applyRoleVisibility();    // NUEVO: ajusta qué tarjetas se ven según rol
      })
      .catch((err) => {
        console.error("Error cargando perfil:", err);
        showMainError("No se pudo cargar tu perfil. Intenta más tarde.");
        // Sin perfil, pero con DEV_SHOW_ALL_SECTIONS=true, seguirás viendo todo
        applyRoleVisibility();
      });
});




// =========================
//  CARGA Y PINTADO PERFIL
// =========================

async function loadProfile() {
  const raw = await fetchMyProfile();           // PerfilResponse del backend
  originalProfile = mapProfileDataToFront(raw); // normalizamos nombres
  fillProfileUI(originalProfile);
  applyStaticFieldsByRole();
  // Si es cliente, vamos precargando el catálogo de ocupaciones
  if (originalProfile.tipoUsuario === "CLIENTE") {
    await ensureOcupacionesLoaded();
    applyOcupacionFromProfile(originalProfile);
  }
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
  fillPreferencesFromProfile(p);
}

async function ensureOcupacionesLoaded() {
  if (ocupacionesLoaded) return;

  try {
    ocupacionesCatalog = await fetchOcupaciones();
    ocupacionesLoaded = true;
    fillOcupacionSelect();

    // Si ya tenemos perfil cargado, sincronizamos el valor con la ocupación del perfil
    if (originalProfile) {
      applyOcupacionFromProfile(originalProfile);
    }
  } catch (err) {
    console.error("Error cargando ocupaciones:", err);
  }
}

function fillOcupacionSelect() {
  const select = document.getElementById("idOcupacion");
  if (!select) return;

  // Deja solo el placeholder
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

  const id = p.ocupacion ?? p.idOcupacion ?? null; // según cómo lo tengas en el mapeo
  if (!id) {
    label.textContent = "—";
    select.value = "";
    return;
  }

  const idStr = String(id);
  select.value = idStr;

  const found = ocupacionesCatalog.find((o) => String(o.id) === idStr);
  label.textContent = found ? found.nombre : `ID ${idStr}`;
}

function applyStaticFieldsByRole() {
  const tipoSpan   = document.querySelector('[for="tipoUsuario"].label-info, span[for="tipoUsuario"], .label-info-tipo');
  const fechaSpan  = document.getElementById("fechaNacimientoLabel");
  const fechaInput = document.getElementById("fechaNacimiento");
  const telSpan    = document.getElementById("telefonoLabel");
  const telInput   = document.getElementById("telefono");

  // Tipo de usuario: siempre estático
  if (tipoSpan) {
    tipoSpan.classList.add("label-info--static");
  }

  // Fecha nacimiento: siempre estática
  if (fechaSpan) {
    fechaSpan.classList.add("label-info--static");
  }
  if (fechaInput) {
    fechaInput.disabled = true;
    fechaInput.classList.remove("profile-edit-field");
    fechaInput.style.display = "none";
  }

  // Teléfono: si es CLIENTE → siempre estático
  if (originalProfile?.tipoUsuario === "CLIENTE") {
    if (telSpan) {
      telSpan.classList.add("label-info--static");
    }
    if (telInput) {
      telInput.disabled = true;
      telInput.classList.remove("profile-edit-field");
      telInput.style.display = "none";
    }
  }
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

  if (isEditing) {
    form.classList.add("profile-edit-mode");
  } else {
    form.classList.remove("profile-edit-mode");
  }

  const nombreInput = document.getElementById("nombreCompleto");
  const telInput    = document.getElementById("telefono");
  // const editableInputs = [nombreInput, telInput];

  // NUEVO: solo habilitar teléfono si es VENDEDOR
  const editableInputs = [];
  if (nombreInput) editableInputs.push(nombreInput);

  const rol = originalProfile?.tipoUsuario;
  if (rol === "VENDEDOR" && telInput) {
    editableInputs.push(telInput);
  }

  editableInputs.forEach((input) => {
    if (!input) return;
    input.disabled = !isEditing;
  });

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
  const ocupSelect    = document.getElementById("idOcupacion");
  const presupuestoInput   = document.getElementById("presupuesto");
  const ubicacionInput     = document.getElementById("ubicacionInteres");
  const miembrosInput      = document.getElementById("miembrosFamilia");

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
    // Preferencias
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
      if (newOcupId !== (original.ocupacion ?? original.idOcupacion ?? null)) {
        body.idOcupacion = newOcupId;
      }
    } else if (original.ocupacion || original.idOcupacion) {
      // Si antes tenía ocupación y ahora borró la selección
      body.idOcupacion = null;
    }
  }

  return body;
}


function fillPreferencesFromProfile(p) {
  const presupuestoLabel = document.getElementById("presupuestoLabel");
  const presupuestoInput = document.getElementById("presupuesto");

  if (presupuestoLabel) {
    presupuestoLabel.textContent =
      p.presupuesto != null ? p.presupuesto.toString() : "—";
  }
  if (presupuestoInput) {
    presupuestoInput.value = p.presupuesto != null ? p.presupuesto : "";
  }

  const ubicacionLabel = document.getElementById("ubicacionLabel");
  const ubicacionInput = document.getElementById("ubicacionInteres");

  if (ubicacionLabel) {
    ubicacionLabel.textContent = p.ubicacionInteres || "—";
  }
  if (ubicacionInput) {
    ubicacionInput.value = p.ubicacionInteres || "";
  }

  const miembrosLabel = document.getElementById("miembrosLabel");
  const miembrosInput = document.getElementById("numeroMiembrosFamilia");

  if (miembrosLabel) {
    miembrosLabel.textContent = p.miembrosFamilia || "—";
  }
  if (miembrosInput) {
    miembrosInput.value = p.miembrosFamilia || "";
  }

  const ocupacionLabel = document.getElementById("ocupacionLabel");
  const ocupacionInput = document.getElementById("idOcupacion");

  if (ocupacionLabel) {
    ocupacionLabel.textContent =
      p.ocupacion != null ? p.ocupacion.toString() : "—";
  }
  if (ocupacionInput) {
    ocupacionInput.value = p.ocupacion != null ? p.ocupacion : "";
  }
}

function applyRoleVisibility() {
  const agendaCard      = document.getElementById("agendaCard");
  const preferencesCard = document.getElementById("preferencesCard");

  if (!agendaCard && !preferencesCard) return;

  // Modo dev: mostramos todo sin importar rol o si no hay perfil
  if (DEV_SHOW_ALL_SECTIONS || !originalProfile) {
    if (agendaCard)      agendaCard.style.display = "";
    if (preferencesCard) preferencesCard.style.display = "";
    return;
  }

  const rol = originalProfile.tipoUsuario;

  if (rol === "CLIENTE") {
    if (agendaCard)      agendaCard.style.display = "none";
    if (preferencesCard) preferencesCard.style.display = "";
  } else if (rol === "VENDEDOR") {
    if (agendaCard)      agendaCard.style.display = "";
    if (preferencesCard) preferencesCard.style.display = "none";
  } else {
    if (agendaCard)      agendaCard.style.display = "none";
    if (preferencesCard) preferencesCard.style.display = "none";
  }
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
//  PREFERENCIAS ACORDEÓN
// =========================
function wirePreferencesAccordion() {
  const card    = document.getElementById("preferencesCard");
  const header  = document.getElementById("preferencesHeader");
  const body    = document.getElementById("preferencesBody");
  const btnEdit   = document.getElementById("btnEditPreferences");
  const btnSave   = document.getElementById("btnSavePreferences");
  const btnCancel = document.getElementById("btnCancelPreferences");

  if (!card || !header || !body) return;

  const isOpen = () => card.classList.contains("preferences-open");

  const openCard = () => {
    card.classList.add("preferences-open");
    setPreferencesEditing(false); // al abrir, solo lectura
  };

  const closeCard = () => {
    card.classList.remove("preferences-open");
    setPreferencesEditing(false);
  };

  const toggleCard = () => {
    if (isOpen()) {
      closeCard();
    } else {
      openCard();
    }
  };

  // Header: abrir/cerrar
  header.addEventListener("click", (e) => {
    const target = e.target;
    if (
      target.closest("#btnEditPreferences") ||
      target.closest("#btnSavePreferences") ||
      target.closest("#btnCancelPreferences")
    ) {
      return;
    }
    toggleCard();
  });

  // Botón Editar
  if (btnEdit) {
    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setPreferencesEditing(true);
    });
  }

  // Botón Cancelar
  if (btnCancel) {
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      clearMainError();
      setPreferencesEditing(false);
      if (originalProfile) {
        fillPreferencesFromProfile(originalProfile);
      }
    });
  }

  // Botón Guardar
  if (btnSave) {
    btnSave.addEventListener("click", async (e) => {
      e.stopPropagation();
      clearMainError();

      if (!originalProfile || originalProfile.tipoUsuario !== "CLIENTE") {
        showMainError("Solo los clientes pueden editar sus preferencias.");
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
        alert("Preferencias actualizadas correctamente.");
      } catch (err) {
        console.error(err);
        showMainError(err.message || "Error al guardar las preferencias.");
      }
    });
  }

  // Estado inicial: cerrada
  closeCard();
}

function setPreferencesEditing(isEditing) {
  const card      = document.getElementById("preferencesCard");
  const btnEdit   = document.getElementById("btnEditPreferences");
  const btnSave   = document.getElementById("btnSavePreferences");
  const btnCancel = document.getElementById("btnCancelPreferences");

  const presupuestoInput = document.getElementById("presupuesto");
  const ubicacionInput   = document.getElementById("ubicacionInteres");
  const miembrosInput    = document.getElementById("numeroMiembrosFamilia");
  const ocupacionInput   = document.getElementById("idOcupacion");

  if (!card) return;

  if (isEditing) {
    card.classList.add("preferences-edit-mode");
  } else {
    card.classList.remove("preferences-edit-mode");
  }

  [presupuestoInput, ubicacionInput, miembrosInput, ocupacionInput].forEach((el) => {
    if (el) el.disabled = !isEditing;
  });

  if (btnEdit)   btnEdit.style.display   = isEditing ? "none"        : "inline-flex";
  if (btnSave)   btnSave.style.display   = isEditing ? "inline-flex" : "none";
  if (btnCancel) btnCancel.style.display = isEditing ? "inline-flex" : "none";
}

/**
 * Solo mandamos campos de preferencias que realmente cambiaron
 * y que no están vacíos (no forzamos limpiar nada aún).
 */
function buildPreferencesPatchBody(original) {
  const body = {};
  if (!original || original.tipoUsuario !== "CLIENTE") {
    return body;
  }

  const presupuestoInput = document.getElementById("presupuesto");
  const ubicacionInput   = document.getElementById("ubicacionInteres");
  const miembrosInput    = document.getElementById("numeroMiembrosFamilia");
  const ocupacionInput   = document.getElementById("idOcupacion");

  // Presupuesto
  if (presupuestoInput) {
    const raw = presupuestoInput.value.trim();
    if (raw !== "") {
      const val = Number(raw.replace(",", ""));
      const originalVal = original.presupuesto != null ? Number(original.presupuesto) : null;
      if (!Number.isNaN(val) && val !== originalVal) {
        body.presupuesto = val;
      }
    }
  }

  // Ubicación de interés
  if (ubicacionInput) {
    const val = ubicacionInput.value.trim();
    const originalVal = original.ubicacionInteres || "";
    if (val && val !== originalVal) {
      body.ubicacionInteres = val;
    }
  }

  // Número de miembros de familia
  if (miembrosInput) {
    const val = miembrosInput.value.trim();
    const originalVal = original.miembrosFamilia || "";
    if (val && val !== originalVal) {
      body.numeroMiembrosFamilia = val;
    }
  }

  // Ocupación (id numérico)
  if (ocupacionInput) {
    const raw = ocupacionInput.value.trim();
    if (raw !== "") {
      const val = parseInt(raw, 10);
      const originalVal = original.ocupacion != null ? parseInt(original.ocupacion, 10) : null;
      if (!Number.isNaN(val) && val !== originalVal) {
        body.idOcupacion = val;
      }
    }
  }

  return body;
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
  const confirmPwd  = document.getElementById("confirmNewPassword");
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

