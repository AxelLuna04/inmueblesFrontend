// src/js/shared/footer.js

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
  
  if (footerEl) {
    mount.replaceWith(footerEl);
    
    // 4. Lógica dinámica (año actual)
    const yearEl = document.querySelector("[data-footer-year]");
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
    
    // Aquí puedes agregar listeners para eventos del footer si hiciera falta
  } else {
    console.error("El archivo footer.html parece estar vacío.");
  }
}