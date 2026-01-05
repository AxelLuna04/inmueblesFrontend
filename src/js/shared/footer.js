// src/js/shared/footer.js
import { auth, getSessionInfoFromToken } from "../../utils/authManager.js";

// 1. Importamos el HTML crudo (nota el ?raw al final)
// Asegúrate de que la ruta relativa sea correcta desde donde está este archivo JS
import footerHtml from '../../../pages/shared/footer.html?raw';

// 2. Importamos el CSS del componente (Vite lo inyectará por ti)
import '../../css/components/footer.css'; 

export function initFooter() {
  const mount = document.querySelector("[data-footer]");
  
  // Si no hay marcador en el HTML, salimos (útil para páginas sin footer como un login/dashboard)
  if (!mount) return;

  // 3. Crear el template e inyectar
  const tpl = document.createElement("template");
  tpl.innerHTML = footerHtml.trim();

  const footerEl = tpl.content.firstElementChild;
  
  if (!footerEl) {
    console.error("El archivo footer.html parece estar vacío.");
    return;
  } else {
    mount.replaceWith(footerEl);

    const yearEl = document.querySelector("[data-footer-year]");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Link del logo según rol
    setFooterBrandTarget();
  }
}

function normalizeRole(rol) {
  if (!rol) return null;
  const r = String(rol).toUpperCase().trim();
  return r.startsWith("ROLE_") ? r.replace("ROLE_", "") : r;
}

function setFooterBrandTarget() {
  const link = document.getElementById("footerBrandLink");
  if (!link) return;

  const token = auth.token();
  let rol = null;

  if (token) {
    const session = getSessionInfoFromToken();
    rol = normalizeRole(session?.rol || auth.role());
  }
  
  if (rol === "VENDEDOR") {
    link.setAttribute("href", "/pages/lister/dashboard.html");
  } else {
    link.setAttribute("href", "/");
  }
}