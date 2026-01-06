// src/js/app.js
import { fetchPublicListings, mapPublicCardToFront } from "../../api/listingsService.js";
import { initHeader } from "../shared/header.js";
import { initFooter } from "../shared/footer.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader({ title: "Publicaciones Pendientes de Revisión" });
  initFooter();
  
  const container = document.getElementById("propertiesContainer");
  const searchInput = document.getElementById("searchInput");
  const searchIcon = document.querySelector(".search-icon");
});



