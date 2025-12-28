import {
    stringOrNull
} from '../../utils/helpers.js';
import { getListingData } from '../../api/listingsService.js';
import {
    showNotif,
    NOTIF_RED
 } from '../../utils/notifications.js';

//HELPERS
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    user: localStorage.getItem("accessToken"),
    listing: null,
}

//ELEMENTS
const pageTitle = $('pageTitle');
const headerOptionsDiv = $('headerOptionsDiv');
const notification = $('notification');

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando página");
    
    await loadListingData();
    loadHeaderDetails();
}

async function loadListingData() {
    console.log("Cargando datos del inmueble");

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
        try {
            state.data = await getListingData(id);
        } catch(err) {
            if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
            console.error(`Error del front: ${err}`);
            showNotif(notification, "No se pudo cargar la publicación, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
        }
    } else {
        showNotif(notification, "La id del inmueble no es válida.", NOTIF_RED, 5000);
    }

    console.log("Datos del inmueble cargados");
}

function loadHeaderDetails(){
    console.log("Cargando detalles del header");
    console.log("JWT: " + state.user);

    if (!state.user) {
        const registerBtn = document.createElement("a");
        registerBtn.classList.add("btn", "btn-register");
        registerBtn.href = "pages/auth/signup.html";
        registerBtn.innerHTML = `
            <strong>Regístrate</strong>
        `;

        const loginBtn = document.createElement("a");
        loginBtn.classList.add("btn", "btn-login");
        loginBtn.href = "pages/auth/login.html";
        loginBtn.innerHTML = `
            <strong>Iniciar sesión</strong>
        `;

        headerOptionsDiv.appendChild(registerBtn);
        headerOptionsDiv.appendChild(loginBtn);
    } else {
        const perfilBtn = document.createElement("a");
        perfilBtn.classList.add("btn", "btn-login");
        perfilBtn.href = "pages/auth/login.html";
        perfilBtn.innerHTML = `
            <strong>TO DO</strong>
        `;

        headerOptionsDiv.appendChild(perfilBtn);
    }

    pageTitle.innerHTML = stringOrNull(state.data.titulo);

    console.log("Detalles del header cargados");
}