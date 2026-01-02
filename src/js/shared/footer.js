import footerHtml from "../../../pages/shared/footer.html?raw";

const mount = document.querySelector("[data-footer]");
if (!mount) {
  // Página sin footer
  // console.log("No footer mount found");
} else {
  const tpl = document.createElement("template");
  tpl.innerHTML = footerHtml.trim();

  const footerEl = tpl.content.firstElementChild;
  if (!footerEl) {
    console.error("footer.html está vacío o no tiene un elemento raíz <footer>.");
  } else {
    mount.replaceWith(footerEl);

    const yearEl = document.querySelector("[data-footer-year]");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }
}
