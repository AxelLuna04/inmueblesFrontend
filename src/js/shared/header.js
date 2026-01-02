// src/js/shared/header.js
import { auth, refreshIfNeeded, getSessionInfoFromToken } from "../../utils/authManager.js";
import { fetchMyProfile } from "../../api/profileService.js";

// Atajo de desarrollador: mostrar header de usuario aunque no haya token
// Pon esto en false cuando conectes todo al backend.
const DEV_FAKE_USER = true;

export async function initHeader() {
  const guest = document.getElementById("guestHeaderActions");
  const user  = document.getElementById("userHeaderActions");
  if (!guest || !user) return;

  const token = auth.token();

  // ===== MODO DEV: sin token pero queremos ver el header de usuario =====
  if (!token && DEV_FAKE_USER) {
    const nameLabel       = document.getElementById("userNameLabel");
    const avatarEl        = document.getElementById("userAvatarCircle");
    const logoutBtn       = document.getElementById("logoutBtn");
    const menuItemHistory = document.getElementById("menuItemHistory");

    const displayName = "Usuario demo";

    if (nameLabel) nameLabel.textContent = displayName;

    if (avatarEl) {
      const initial = displayName.charAt(0).toUpperCase();
      avatarEl.textContent = initial;
      avatarEl.style.backgroundImage = "";
      avatarEl.style.backgroundSize = "";
      avatarEl.style.backgroundPosition = "";
    }

    // En modo dev no mostramos opción de historial admin
    if (menuItemHistory) {
      menuItemHistory.style.display = "none";
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        auth.clear();
        window.location.href = "/";
      });
    }

    guest.classList.add("hidden");
    user.classList.remove("hidden");
    wireUserDropdown();
    return;
  }

  // ===== SIN TOKEN (flujo real): invitado =====
  if (!token) {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  // ===== CON TOKEN (flujo real con backend) =====
  try {
    await refreshIfNeeded();
  } catch {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  let profile = null;
  try {
    profile = await fetchMyProfile(); // PerfilResponse
  } catch {
    // si falla, seguimos con la info mínima del token
  }

  const sessionBasic = getSessionInfoFromToken();
  if (!sessionBasic) {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  const nameLabel       = document.getElementById("userNameLabel");
  const avatarEl        = document.getElementById("userAvatarCircle");
  const logoutBtn       = document.getElementById("logoutBtn");
  const menuItemHistory = document.getElementById("menuItemHistory");

  const displayName  = profile?.nombreCompleto || sessionBasic.email || "Mi cuenta";
  // Ojo: backend manda rutaFoto, no fotoUrl
  const displayPhoto = profile?.rutaFoto || null;

  if (nameLabel) nameLabel.textContent = displayName;

  if (avatarEl) {
    if (displayPhoto) {
      avatarEl.style.backgroundImage    = `url(${displayPhoto})`;
      avatarEl.style.backgroundSize     = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.textContent              = "";
    } else {
      const initial = (displayName || "U").charAt(0).toUpperCase();
      avatarEl.textContent         = initial;
      avatarEl.style.backgroundImage = "";
    }
  }

  guest.classList.add("hidden");
  user.classList.remove("hidden");

  const rol =
    sessionBasic.rol ||
    profile?.tipoUsuario ||
    (typeof auth.role === "function" ? auth.role() : null);

  if (menuItemHistory) {
    if (rol === "ADMIN") {
      menuItemHistory.style.display = "flex";
      menuItemHistory.addEventListener("click", () => {
        window.location.href = "/pages/admin/history.html";
      });
    } else {
      menuItemHistory.style.display = "none";
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.clear();
      window.location.href = "/";
    });
  }

  wireUserDropdown();
}

// ----------------------
// Dropdown del perfil
// ----------------------
function wireUserDropdown() {
  const profileBtn = document.getElementById("userMenuButton");
  const dropdown   = document.getElementById("userMenu");
  if (!profileBtn || !dropdown) return;

  const toggleMenu = () => {
    dropdown.classList.toggle("is-open");
  };

  const closeMenu = () => {
    dropdown.classList.remove("is-open");
  };

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", (event) => {
    const isClickInsideDropdown = dropdown.contains(event.target);
    const isProfileClicked      = profileBtn.contains(event.target);

    if (!isClickInsideDropdown && !isProfileClicked) {
      closeMenu();
    }
  });
}
