// src/js/app.js
import { fetchPublicListings, mapPublicCardToFront } from "../../api/listingsService.js";
import { initHeader } from "../shared/header.js";
import { initFooter } from "../shared/footer.js";
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { VENDEDOR } from "../../utils/constants.js";
import { showNotif, NOTIF_RED, NOTIF_ORANGE } from "../../utils/notifications.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader({ title: "Bienvenid@ a Inmuebles a tu Alcance" });
  initFooter();

  if (auth.role() === VENDEDOR) return goHomeByRole(auth.role());
  
  const container = document.getElementById("propertiesContainer");
  const searchInput = document.getElementById("searchInput");
  const searchIcon = document.querySelector(".search-icon");

  const operationTypeSelect = document.getElementById("operationTypeSelect");
  
  const listingTypeSelect = document.getElementById("listingTypeSelect");
  const minPriceInput = document.getElementById("minPriceInput");
  const maxPriceInput = document.getElementById("maxPriceInput");

  const notification = document.getElementById("notification");
  
  const sentinelEl = document.getElementById("infiniteSentinel");
  const statusTextEl = document.getElementById("infiniteStatus");

  let currentSearch = "";
  let currentPage = 0;
  let isLastPage = false;
  let isLoading = false;

  function renderCardHtml(p) {
    return `
        <article class="property-card" data-id="${p.id}">
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
              <br />
              <span style="font-size: 0.9em; color: #777;">${p.direccion || ""}</span>
            </p>
            <p class="property-details">
              <i class="fa-solid fa-bed"></i> ${p.habitaciones ?? "?"} hab. |
              <i class="fa-solid fa-bath"></i> ${p.banos ?? "?"} baños |
              <i class="fa-solid fa-toilet"></i> ${p.excusados ?? "?"} exc.
            </p>
            <div class="property-chips">
              ${p.tipoInmueble ? `<span class="chip">${p.tipoInmueble}</span>` : ""}
              ${p.tipoOperacion ? `<span class="chip">${p.tipoOperacion}</span>` : ""}
            </div>
          </div>
        </article>
      `;
  }

  function renderEmptyState() {
    showNotif(notification, "No se encontraron inmuebles con los filtros actuales.", NOTIF_ORANGE, 4000);
    container.innerHTML =
      '<p class="main-content-message" style="grid-column: 1/-1; text-align: center;">No se encontraron inmuebles con los filtros actuales.</p>';
  }

  async function loadNextPage({ reset = false } = {}) {
    if (isLoading) return;
    if (!reset && isLastPage) return;

    try {
      isLoading = true;
      if (statusTextEl) statusTextEl.textContent = "Cargando más inmuebles...";

      if (reset) {
        currentPage = 0;
        isLastPage = false;
        container.innerHTML = "";
      }

      const filters = {
        page: currentPage,
        size: 12,
        q: currentSearch || "",
        listingType: listingTypeSelect?.value || 0,
        minPrice: minPriceInput?.value || 0,
        maxPrice: maxPriceInput?.value || 0
      };

      const pageData = await fetchPublicListings(filters);
      const properties = pageData.content.map(mapPublicCardToFront);

      if (reset && properties.length === 0) {
        isLastPage = true;
        if (statusTextEl) statusTextEl.textContent = "";
        renderEmptyState();
        return;
      }

      container.insertAdjacentHTML("beforeend", properties.map(renderCardHtml).join(""));

      isLastPage = pageData.last;
      currentPage = pageData.number + 1;

      if (statusTextEl) {
        statusTextEl.textContent = isLastPage ? "Has llegado al final de los resultados." : "";
      }

    } catch (err) {
      console.error(err);
      showNotif(notification, "Ocurrió un error al cargar las publicaciones.", NOTIF_RED, 5000);
      if (statusTextEl) statusTextEl.textContent = "Error al cargar.";
      if (reset) {
        container.innerHTML = '<p class="main-content-message" style="grid-column: 1/-1; text-align: center;">Error de conexión.</p>';
      }
    } finally {
      isLoading = false;
    }
  }

  function handleSearch() {
    currentSearch = searchInput.value.trim();
    reconnectObserver();
    loadNextPage({ reset: true });
  }

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleSearch();
  });

  if (searchIcon) {
    searchIcon.addEventListener("click", handleSearch);
  }

  listingTypeSelect.addEventListener("change", handleSearch);
  minPriceInput.addEventListener("change", handleSearch);
  maxPriceInput.addEventListener("change", handleSearch);


  container.addEventListener("click", (e) => {
    const card = e.target.closest(".property-card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    window.location.href = `/pages/shared/listingDetail.html?id=${id}`;
  });

  // --- INFINITE SCROLL OBSERVER ---
  let observer = null;

  function createObserver() {
    if (!sentinelEl) return null;
    
    const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadNextPage({ reset: false });
        }
    }, {
        root: null,
        rootMargin: "400px",
        threshold: 0.1
    });

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