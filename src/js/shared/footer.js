// src/js/shared/footer.js
import { auth, getSessionInfoFromToken } from "../../utils/authManager.js";

import footerHtml from '../../../pages/shared/footer.html?raw';

import '../../css/components/footer.css'; 

export function initFooter() {
  const mount = document.querySelector("[data-footer]");
  
  if (!mount) return;

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