// src/js/shared/header.js
import { auth, refreshIfNeeded, getSessionInfoFromToken } from "../../utils/authManager.js";
import { fetchMyProfile } from "../../api/profileService.js";

import headerHtml from "../../../pages/shared/header.html?raw";
import "../../css/components/header.css";

// Atajo dev
const DEV_FAKE_USER = false;
const DEV_ROLE = ""; // "CLIENTE" | "VENDEDOR" | "ADMIN"

export async function initHeader(options = {}) {
  const { title = "" } = options;
  // ---------- 1) Inyectar HTML si hay marcador ----------
  const mountPoint = document.querySelector("[data-header]");
  if (mountPoint) {
    const tpl = document.createElement("template");
    tpl.innerHTML = headerHtml.trim();
    const headerElement = tpl.content.firstElementChild;
    if (headerElement) mountPoint.replaceWith(headerElement);
  }
  // Setear título de página en el header (siempre después de inyectar)
  const siteTitleEl = document.getElementById("siteTitle");
  if (siteTitleEl) {
    siteTitleEl.textContent = title;
    // opcional: si no hay título, ocúltalo para no dejar un espacio raro
    siteTitleEl.style.display = title ? "" : "none";
  }


  // ---------- 2) Referencias ----------
  const guest = document.getElementById("guestHeaderActions");
  const user  = document.getElementById("userHeaderActions");
  if (!guest || !user) return;

  const nameLabel        = document.getElementById("userNameLabel");
  const avatarEl         = document.getElementById("userAvatarCircle");
  const logoutBtn        = document.getElementById("logoutBtn");
  const menuItemProfile  = document.getElementById("menuItemProfile");
  const menuItemPending  = document.getElementById("menuItemPendingListings");

  // ---------- 3) Helpers ----------
  const showGuest = () => {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    closeDropdown();
  };

  const showUser = () => {
    guest.classList.add("hidden");
    user.classList.remove("hidden");
  };

  const normalizeRole = (rol) => {
    if (!rol) return null;
    const r = String(rol).toUpperCase().trim();
    return r.startsWith("ROLE_") ? r.replace("ROLE_", "") : r;
  };

  const setAvatar = (displayName, photoUrl) => {
    if (!avatarEl) return;

    if (photoUrl) {
      avatarEl.style.backgroundImage = `url(${photoUrl})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.textContent = "";
      return;
    }

    const initial = (displayName || "U").charAt(0).toUpperCase();
    avatarEl.textContent = initial;
    avatarEl.style.backgroundImage = "";
  };

  const wireOnce = (el, key, event, handler) => {
    if (!el) return;
    const flag = `wired_${key}`;
    if (el.dataset[flag] === "1") return;
    el.dataset[flag] = "1";
    el.addEventListener(event, handler);
  };

  // ---------- 4) Dropdown ----------
  wireUserDropdown(); // se auto-protege de duplicados con dataset

  // ---------- 5) DEV fake ----------
  const token = auth.token();
  if (!token && DEV_FAKE_USER) {
    const displayName = "Usuario demo";

    if (nameLabel) nameLabel.textContent = displayName;
    setAvatar(displayName, null);

    const rol = DEV_ROLE;       // 👈 aquí forzas el rol
    const isAdmin = rol === "ADMIN";

    setBrandTarget(rol);

    if (menuItemProfile) menuItemProfile.style.display = isAdmin ? "none" : "flex";

    if (menuItemPending) {
      menuItemPending.style.display = isAdmin ? "flex" : "none";
      if (isAdmin) {
        wireOnce(menuItemPending, "pending", "click", () => {
          window.location.href = "/pages/admin/dashboard.html";
        });
      }
    }

    wireOnce(logoutBtn, "logout", "click", () => {
      auth.clear();
      window.location.href = "/";
    });

    showUser();
    return;
  }


  // ---------- 6) Sin token => invitado ----------
  if (!token) {
    showGuest();
    setBrandTarget(null);
    return;
  }

  // ---------- 7) Token => refrescar / validar ----------
  try {
    await refreshIfNeeded();
  } catch {
    auth.clear();
    showGuest();
    setBrandTarget(null);
    return;
  }

  // ---------- 8) Conseguir sesión mínima ----------
  const sessionBasic = getSessionInfoFromToken();
  if (!sessionBasic) {
    auth.clear();
    showGuest();
    setBrandTarget(null);
    return;
  }

  // Detectamos el rol ANTES de llamar a la API
  const currentRole = normalizeRole(sessionBasic.rol);
  const isAdmin = currentRole === "ADMIN";

  // ---------- 9) Intentar cargar perfil (SOLO SI NO ES ADMIN) ----------
  let profile = null;
  
  // Evitamos el error 403 saltándonos la llamada si es Admin
  if (!isAdmin) {
      try {
        profile = await fetchMyProfile();
      } catch (err) {
        console.warn("No se pudo cargar el perfil del usuario", err);
        // si falla, seguimos con token y datos básicos
      }
  }

  // Si es admin, profile será null, así que usará el email del token
  const displayName  = profile?.nombreCompleto || sessionBasic.email || "Usuario";
  const displayPhoto = profile?.rutaFoto || null;

  if (nameLabel) nameLabel.textContent = displayName;
  
  // Si es admin, forzamos que no tenga foto (usará inicial)
  setAvatar(displayName, isAdmin ? null : displayPhoto);

  showUser();

  // ---------- 10) Configurar UI según Rol ----------
  
  setBrandTarget(currentRole);

  // ADMIN: NO perfil, SÍ pending + history
  if (menuItemProfile) {
    menuItemProfile.style.display = isAdmin ? "none" : "flex";
  }

  if (menuItemPending) {
    menuItemPending.style.display = isAdmin ? "flex" : "none";
    if (isAdmin) {
      wireOnce(menuItemPending, "pending", "click", () => {
        window.location.href = "/pages/admin/dashboard.html";
      });
    }
  }

  // ---------- 11) Logout ----------
  wireOnce(logoutBtn, "logout", "click", () => {
    auth.clear();
    window.location.href = "/";
  });
}

function setBrandTarget(rol) {
  const brandLinkEl = document.getElementById("brandLink") || document.querySelector(".brand-link");

  if (!brandLinkEl) return;

  if (rol === "VENDEDOR") {
    brandLinkEl.setAttribute("href", "/pages/lister/dashboard.html");
  } else {
    brandLinkEl.setAttribute("href", "/");
  }
}

// ----------------------
// Dropdown (sin duplicar listeners)
// ----------------------
function wireUserDropdown() {
  const profileBtn = document.getElementById("userMenuButton");
  const dropdown   = document.getElementById("userMenu");
  if (!profileBtn || !dropdown) return;

  if (profileBtn.dataset.wired_dropdown === "1") return;
  profileBtn.dataset.wired_dropdown = "1";

  const toggleMenu = () => dropdown.classList.toggle("is-open");
  const closeMenu  = () => dropdown.classList.remove("is-open");

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", (event) => {
    const inside = dropdown.contains(event.target) || profileBtn.contains(event.target);
    if (!inside) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

function closeDropdown() {
  const dropdown = document.getElementById("userMenu");
  if (dropdown) dropdown.classList.remove("is-open");
}
