// src/js/shared/header.js
import { auth, refreshIfNeeded, getSessionInfoFromToken } from "../../utils/authManager.js";
import { fetchMyProfile } from "../../api/profileService.js";

export async function initHeader() {
  const guest = document.getElementById("guestHeaderActions");
  const user  = document.getElementById("userHeaderActions");

  if (!guest || !user) return;

  const token = auth.token();
  if (!token) {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  try {
    // 1) Aseguramos access token vivo
    await refreshIfNeeded();
  } catch {
    // refreshIfNeeded ya limpia/redirige
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  // 2) Intentamos traer el perfil completo
  let profile = null;
  try {
    profile = await fetchMyProfile();
  } catch (e) {
    console.warn("No se pudo obtener el perfil, usando fallback de token:", e);
  }

  // 3) Si no hay perfil, usamos fallback del token (email)
  const sessionBasic = getSessionInfoFromToken();
  if (!sessionBasic) {
    guest.classList.remove("hidden");
    user.classList.add("hidden");
    return;
  }

  const nameLabel = document.getElementById("userNameLabel");
  const avatarEl  = document.getElementById("userAvatarCircle");
  const logoutBtn = document.getElementById("logoutBtn");
  const menuBtn   = document.getElementById("userMenuButton");
  const menu      = document.getElementById("userMenu");

  // Valor por defecto: lo que tengamos
  const displayName = profile?.nombreCompleto || sessionBasic.email || "Mi cuenta";
  const displayPhoto = profile?.fotoUrl || null;

  if (nameLabel) nameLabel.textContent = displayName;

  if (avatarEl) {
    if (displayPhoto) {
      avatarEl.style.backgroundImage = `url(${displayPhoto})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.textContent = "";
    } else {
      const initial = (displayName || "U").charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
  }

  // Mostrar modo usuario
  guest.classList.add("hidden");
  user.classList.remove("hidden");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.clear();
      window.location.href = "/";
    });
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = menu.hasAttribute("hidden");
      if (isHidden) menu.removeAttribute("hidden");
      else menu.setAttribute("hidden", "true");
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
        menu.setAttribute("hidden", "true");
      }
    });
  }
}
