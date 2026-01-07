// src/js/lister/dashboard.js
import { fetchMyListings, mapPublicCardToFront } from "../../api/listingsService.js";
import { VENDEDOR } from "../../utils/constants.js";
import { showNotif, NOTIF_RED } from '../../utils/notifications.js'; // Agregué NOTIF_RED para consistencia
import { requireAuth } from "../../utils/routeGuard.js";
import { initFooter } from "../shared/footer.js";
import { initHeader } from "../shared/header.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader({ title: "Tus publicaciones" });
  initFooter();

  requireAuth(VENDEDOR);

  const container = document.getElementById("propertiesContainer");
  const postListingBtn = document.getElementById("postListingBtn");

  postListingBtn.addEventListener("click", () => {
    window.location.href = "/pages/lister/postListing.html";
  });

  let currentPage = 0;
  let lastPage = false;
  let properties = [];

  // --- HELPER FUNCTIONS PARA ESTILOS (Igual que en Admin) ---

  // 1. Clase para el borde de la tarjeta
  function getStateCardClass(state) {
    const s = String(state || "").toUpperCase();
    if (s.includes("PEND")) return "property-card-pending";
    if (s.includes("RECH")) return "property-card-refuted";
    // Incluimos APROBADA y VENDIDA como estados positivos
    if (s.includes("APRO") || s.includes("VENDID")) return "property-card-accepted";
    return "";
  }

  // 2. Clase para el color del Chip (Etiqueta)
  function getStateChipClass(state) {
    const s = String(state || "").toUpperCase();
    if (s.includes("PEND")) return "chip--pending";
    if (s.includes("RECH")) return "chip--refuted";
    if (s.includes("APRO") || s.includes("VENDID")) return "chip--accepted";
    return "";
  }

  // --- RENDERIZADO ---

  function renderProperties(list) {
    if (!list.length) {
      container.innerHTML =
        '<p class="main-content-message" style="grid-column: 1/-1; text-align: center;">No se encontraron inmuebles para mostrar.</p>';
      return;
    }

    container.innerHTML = list
      .map((p) => {
        // Obtenemos las clases antes de retornar el HTML
        const cardStateClass = getStateCardClass(p.estado);
        const chipStateClass = getStateChipClass(p.estado);

        return `
        <article class="property-card ${cardStateClass}" data-id="${p.id}" data-state="${p.estado}">
          <div class="property-image-wrapper">
            <img src="${p.imagen || ""}"
                 alt="${p.titulo || "Inmueble"}"
                 class="property-image"
                 onerror="this.src='/src/assets/images/placeholder.jpg'"/>
          </div>
          <div class="property-info">
            <h2 class="property-price">MXN ${p.precio.toLocaleString("es-MX")}</h2>
            <p class="property-address">
              ${p.titulo || ""}
            </p>
            <div class="property-chips">
              ${p.tipoInmueble ? `<span class="chip">${p.tipoInmueble}</span>` : ""}
              ${p.estado ? `<span class="chip ${chipStateClass}">${p.estado}</span>` : ""}
            </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  async function loadPage() {
    try {
      container.innerHTML = '<p class="main-content-message">Cargando inmuebles...</p>';

      const pageData = await fetchMyListings({
        page: currentPage,
        size: 12,
      });

      properties = pageData.content.map(mapPublicCardToFront);
      renderProperties(properties);

      lastPage = pageData.last;
      currentPage = pageData.number + 1;
    } catch (err) {
      console.error(err);
      container.innerHTML =
        '<p class="main-content-message" style="grid-column: 1/-1; text-align: center;">No se encontraron inmuebles para mostrar.</p>';
      showNotif("Ocurrió un error al cargar las publicaciones.", NOTIF_RED);
    }
  }

  // Click en tarjeta para ver detalles
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".property-card");
    if (!card) return;
    
    const id = card.dataset.id;
    const state = card.dataset.state;
    
    // Validamos que tenga ID y que esté Aprobada (o vendida si permites ver vendidas)
    // Nota: Si quieres que el vendedor pueda ver el detalle de sus propias 
    // publicaciones pendientes/rechazadas para editarlas, quita la validación de estado.
    if (!id) return;
    //if (state !== "APROBADA" && state !== "VENDIDA") return; 

    window.location.href = `/pages/shared/listingDetail.html?id=${id}`;
  });

  loadPage();
});