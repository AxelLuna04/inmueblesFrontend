import { fetchMyListings, mapPublicCardToFront } from "../../api/listingsService.js";
import { showNotif } from '../../utils/notifications.js';

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("propertiesContainer");

  let currentPage = 0;
  let lastPage = false;
  let properties = [];

  function renderProperties(list) {
    if (!list.length) {
      container.innerHTML =
        '<p style="grid-column: 1/-1; text-align: center;">No se encontraron inmuebles para mostrar.</p>';
      return;
    }

    container.innerHTML = list
      .map(
        (p) => `
        <article class="property-card ${p.estado=="PENDIENTE" ? "property-card-pending" : p.estado=="RECHAZADA" ? "property-card-refuted" : ""}" data-id="${p.id}">
          <div class="property-image-wrapper">
            <img src="${p.imagen || ""}"
                 alt="${p.titulo || "Inmueble"}"
                 class="property-image"/>
          </div>
          <div class="property-info">
            <h2 class="property-price">MXN ${p.precio.toLocaleString("es-MX")}</h2>
            <p class="property-address">
              ${p.titulo || ""}
            </p>
            <div class="property-chips">
              ${p.tipoInmueble ? `<span class="chip">${p.tipoInmueble}</span>` : ""}
              ${p.estado ? `<span class="chip">${p.estado}</span>` : ""}
            </div>
          </div>
        </article>
      `
      )
      .join("");
  }

  async function loadPage() {
    try {
      container.innerHTML = "<p>Cargando inmuebles...</p>";

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
      container.innerHTML = "<p>No se encontraron inmuebles para mostrar.</p>";
      showNotif("Ocurrió un error al cargar las publicaciones.", )
    }
  }

  // See details
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".property-card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    window.location.href = `/pages/public/listing-detail.html?id=${id}`;
  });

  loadPage();
});
