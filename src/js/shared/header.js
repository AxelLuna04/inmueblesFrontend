// src/js/shared/header.js
import { auth, refreshIfNeeded, getSessionInfoFromToken } from "../../utils/authManager.js";
import { fetchMyProfile } from "../../api/profileService.js";

import headerHtml from "../../../pages/shared/header.html?raw";
import "../../css/components/header.css";

const DEV_FAKE_USER = false;
const DEV_ROLE = ""; // "CLIENTE" | "VENDEDOR" | "ADMIN"

export async function initHeader(options = {}) {
  const { title = "" } = options;
  const mountPoint = document.querySelector("[data-header]");
  if (mountPoint) {
    const tpl = document.createElement("template");
    tpl.innerHTML = headerHtml.trim();
    const headerElement = tpl.content.firstElementChild;
    if (headerElement) mountPoint.replaceWith(headerElement);
  }
  const siteTitleEl = document.getElementById("siteTitle");
  if (siteTitleEl) {
    siteTitleEl.textContent = title;
    siteTitleEl.style.display = title ? "" : "none";
  }


  const guest = document.getElementById("guestHeaderActions");
  const user  = document.getElementById("userHeaderActions");
  if (!guest || !user) return;

  const nameLabel        = document.getElementById("userNameLabel");
  const avatarEl         = document.getElementById("userAvatarCircle");
  const logoutBtn        = document.getElementById("logoutBtn");
  const menuItemProfile  = document.getElementById("menuItemProfile");
  const menuItemPending  = document.getElementById("menuItemPendingListings");

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

  wireUserDropdown();

  // ---------- DEV fake ----------
  const token = auth.token();
  if (!token && DEV_FAKE_USER) {
    const displayName = "Usuario demo";

    if (nameLabel) nameLabel.textContent = displayName;
    setAvatar(displayName, null);

    const rol = DEV_ROLE;
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


  if (!token) {
    showGuest();
    setBrandTarget(null);
    return;
  }

  try {
    await refreshIfNeeded();
  } catch {
    auth.clear();
    showGuest();
    setBrandTarget(null);
    return;
  }

  const sessionBasic = getSessionInfoFromToken();
  if (!sessionBasic) {
    auth.clear();
    showGuest();
    setBrandTarget(null);
    return;
  }

  const currentRole = normalizeRole(sessionBasic.rol);
  const isAdmin = currentRole === "ADMIN";

  let profile = null;
  
  if (!isAdmin) {
      try {
        profile = await fetchMyProfile();
      } catch (err) {
        console.warn("No se pudo cargar el perfil del usuario", err);
      }
  }

  const displayName  = profile?.nombreCompleto || sessionBasic.email || "Usuario";
  const displayPhoto = profile?.rutaFoto || null;

  if (nameLabel) nameLabel.textContent = displayName;
  
  setAvatar(displayName, isAdmin ? null : displayPhoto);

  showUser();
  
  setBrandTarget(currentRole);

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
// Dropdown
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
