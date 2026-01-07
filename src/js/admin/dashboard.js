// src/js/admin/dashboard.js
import { initHeader } from "../shared/header.js";
import { initFooter } from "../shared/footer.js";
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { ADMIN } from "../../utils/constants.js";

import {
  fetchAdminListings,
  mapModerationCardToFront
} from "../../api/adminService.js";

import { showNotif, NOTIF_RED, NOTIF_ORANGE } from "../../utils/notifications.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader({ title: "Publicaciones Pendientes de Revisión" });
  initFooter();

  if (auth.role() !== ADMIN) return goHomeByRole(auth.role());

  const gridEl = document.getElementById("propertiesContainer");
  const notificationEl = document.getElementById("notification");

  const searchInputEl = document.getElementById("searchInput");
  const searchIconEl = document.querySelector(".search-icon");

  const statusSelectEl = document.getElementById("estadoSelect");
  const typeSelectEl = document.getElementById("tipoSelect");

  const sentinelEl = document.getElementById("infiniteSentinel");
  const statusTextEl = document.getElementById("infiniteStatus");

  let page = 0;
  let isLastPage = false;
  let isLoading = false;

  let query = "";

  function getStateCardClass(state) {
    const s = String(state || "").toUpperCase();
    if (s.includes("PEND")) return "property-card-pending";
    if (s.includes("RECH")) return "property-card-refuted";
    if (s.includes("APRO") || s.includes("ACEP")) return "property-card-accepted";
    return "";
  }

  function getStateChipClass(state) {
    const s = String(state || "").toUpperCase();
    if (s.includes("PEND")) return "chip--pending";
    if (s.includes("RECH")) return "chip--refuted";
    if (s.includes("APRO") || s.includes("ACEP")) return "chip--accepted";
    return "";
  }

  function formatPriceMXN(price) {
    return (typeof price === "number") ? price.toLocaleString("es-MX") : "—";
  }

  function renderCardHtml(item) {
    const cardStateClass = getStateCardClass(item.estado);
    const chipStateClass = getStateChipClass(item.estado);

    return `
      <article class="property-card ${cardStateClass}" data-id="${item.id}">
        <div class="property-image-wrapper">
          <img src="${item.imagen || ""}"
               alt="${item.titulo || "Publicación"}"
               class="property-image"
               onerror="this.src='/src/assets/images/placeholder.jpg'"/>
        </div>

        <div class="property-info">
          <h2 class="property-price">MXN ${formatPriceMXN(item.precio)}</h2>

          <p class="property-address">
            ${item.titulo || ""}
            <br />
            <span style="font-size: 0.9em; color: #777;">${item.direccion || ""}</span>
          </p>

          <div class="property-chips">
            ${item.tipoInmueble ? `<span class="chip">${item.tipoInmueble}</span>` : ""}
            ${item.estado ? `<span class="chip ${chipStateClass}">${item.estado}</span>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function clearGrid() {
    gridEl.innerHTML = "";
  }

  function renderEmptyState(message) {
    const text = message || "No se encontraron publicaciones con los filtros actuales.";
    showNotif(notificationEl, text, NOTIF_ORANGE, 4000);
    gridEl.innerHTML = `<p class="main-content-message" style="grid-column:1/-1; text-align:center;">${text}</p>`;
  }

  function appendCards(items) {
    gridEl.insertAdjacentHTML("beforeend", items.map(renderCardHtml).join(""));
  }

  async function loadNextPage({ reset = false } = {}) {
    if (isLoading) return;
    if (!reset && isLastPage) return;

    try {
      isLoading = true;
      if (statusTextEl) statusTextEl.textContent = "Cargando...";

      if (reset) {
        page = 0;
        isLastPage = false;
        clearGrid();
        gridEl.innerHTML = `<p class="main-content-message">Cargando publicaciones...</p>`;
      }

      const statusRaw = statusSelectEl?.value; 
      const status = (statusRaw === "" || statusRaw === "0") ? undefined : statusRaw;

      const typeRaw = typeSelectEl?.value;
      const type = (typeRaw === "" || typeRaw === "0") ? undefined : Number(typeRaw);

      const pageData = await fetchAdminListings({
        page,
        size: 12,
        estado: status,
        tipo: type,
        q: query || undefined
    });

      const mappedItems = (pageData?.content || []).map(mapModerationCardToFront);

      if (reset) clearGrid();

      if (!mappedItems.length && page === 0) {
        isLastPage = true;
        if (observer) observer.disconnect();
        if (statusTextEl) statusTextEl.textContent = "";
        return renderEmptyState();
      }

      appendCards(mappedItems);

      isLastPage = !!pageData.last;
      page = pageData.number + 1;

      if (statusTextEl) statusTextEl.textContent = isLastPage ? "No hay más resultados." : "";
      if (isLastPage && observer) observer.disconnect();
    } catch (err) {
      console.error(err);
      showNotif(notificationEl, "Ocurrió un error al cargar publicaciones.", NOTIF_RED, 5000);
      if (statusTextEl) statusTextEl.textContent = "Error al cargar.";
      if (reset) {
        gridEl.innerHTML =
          '<p class="main-content-message" style="grid-column: 1/-1; text-align: center;">Ocurrió un error al cargar las publicaciones.</p>';
      }
    } finally {
      isLoading = false;
    }
  }

  function runSearch() {
    query = (searchInputEl?.value || "").trim();
    reconnectObserver();
    loadNextPage({ reset: true });
  }

  searchInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });
  searchIconEl?.addEventListener("click", runSearch);

  statusSelectEl?.addEventListener("change", () => {
    reconnectObserver();
    loadNextPage({ reset: true });
  });

  typeSelectEl?.addEventListener("change", () => {
    reconnectObserver();
    loadNextPage({ reset: true });
  });

  gridEl.addEventListener("click", (e) => {
    const cardEl = e.target.closest(".property-card");
    if (!cardEl) return;

    const id = cardEl.dataset.id;
    if (!id) return;

    window.location.href = `/pages/admin/moderationDetail.html?id=${id}`;
  });

  // Infinite scroll
  let observer = null;

  function createObserver() {
    if (!sentinelEl) return null;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPage({ reset: false });
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 }
    );

    obs.observe(sentinelEl);
    return obs;
  }

  function reconnectObserver() {
    if (observer) observer.disconnect();
    observer = createObserver();
  }

  reconnectObserver();
  loadNextPage({ reset: true });
});
