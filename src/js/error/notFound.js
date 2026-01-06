// src/js/app.js
import { initHeader } from "../shared/header.js";
import { initFooter } from "../shared/footer.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader({ title: "Página No Disponible" });
  initFooter();
});