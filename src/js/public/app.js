// src/js/app.js
import { fetchPublicListings, mapPublicCardToFront } from "../../api/listingsService.js";
import { initHeader } from "../shared/header.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("propertiesContainer");
  const searchInput = document.getElementById("searchInput");
  const searchIcon = document.querySelector(".search-icon");

  let currentSearch = "";
  let currentPage = 0;
  let lastPage = false;
  let properties = [];

  initHeader();

  function renderProperties(list) {
    if (!list.length) {
      container.innerHTML =
        '<p style="grid-column: 1/-1; text-align: center;">No se encontraron inmuebles con los filtros actuales.</p>';
      return;
    }

    container.innerHTML = list
      .map(
        (p) => `
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
      `
      )
      .join("");
  }

  async function loadPage(reset = false) {
    try {
      if (reset) {
        currentPage = 0;
        lastPage = false;
        container.innerHTML = "<p>Cargando inmuebles...</p>";
      }
      if (lastPage) return;

      const pageData = await fetchPublicListings({
        page: currentPage,
        size: 12,
        q: currentSearch || ""
      });

      properties = pageData.content.map(mapPublicCardToFront);
      renderProperties(properties);

      lastPage = pageData.last;
      currentPage = pageData.number + 1;
    } catch (err) {
      console.error(err);
      container.innerHTML =
        '<p style="grid-column: 1/-1; text-align: center;">Ocurrió un error al cargar las publicaciones.</p>';
    }
  }

  async function handleSearch() {
    currentSearch = searchInput.value.trim();
    await loadPage(true);
  }

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  if (searchIcon) {
    searchIcon.addEventListener("click", handleSearch);
  }

  // Click en tarjeta → detalle
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".property-card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    window.location.href = `/pages/public/listing-detail.html?id=${id}`;
  });

  loadPage(true);
});
