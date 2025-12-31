import {
    stringOrNull,
    floatOrNull,
    intOrNull
} from '../../utils/helpers.js';
import { getListingData } from '../../api/listingsService.js';
import {
    showNotif,
    NOTIF_RED
} from '../../utils/notifications.js';

import placeholderImg from '/src/assets/images/placeholder.jpg';
import { getParties } from '../../api/sellListingService.js';

//HELPERS
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    id: 0,
    title: "",
    thumbnail: "",
    address: "",
    price: "",
    parties: [],
    documents: [],
    documentUrls: [],
    idClient: 0,
    date: "",
}

//ELEMENTS
const listingThumbnailImg = $('listingThumbnailImg');
const titleLabel = $('titleLabel');
const priceLabel = $('priceLabel');
const addressLabel = $('addressLabel');
const interestedContainer = $('interestedContainer');
const uploadFilesBtn = $('uploadFilesBtn');
const filesContainer = $('filesContainer');
const soldDateInput = $('soldDateInput');
const soldListingBtn = $('soldListingBtn');
const notification = $('notification');

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando ventana");

    await loadListingData();
    await loadPartiesData();
    displayListingData();
    displayPartiesData();
    loadEvents();

    console.log("===VENTANA INICIALIZADA EXITOSAMENTE===");
}

//LOAD DATA
async function loadListingData() {
    console.log("Cargando datos del inmueble");

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
        try {
            const data = await getListingData(id);
            insertListingData(data);
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

function insertListingData(data) {
    console.log("Asignando los datos del inmueble en el estado");

    state.id = intOrNull(data.id) || 0;
    state.title = stringOrNull(data.titulo) || "Publicación";
    state.price = floatOrNull(data.precio).toLocaleString("es-MX") || 0;
    state.thumbnail = stringOrNull(data.fotos[0]);
    state.address = data.direccion.formattedAddress;

    console.log("Datos del inmueble asignados en el estado");
}

async function loadPartiesData() {
    console.log("Cargando datos de los interesados");
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
        try {
            const data = await getParties(id);
            state.parties = data;
        } catch(err) {
            if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
            console.error(`Error del front: ${err}`);
            showNotif(notification, "No se pudo cargar a los interesados, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
        }
    } else {
        showNotif(notification, "La id del inmueble no es válida.", NOTIF_RED, 5000);
    }

    console.log("Datos de los interesados cargados")
}

async function displayListingData() {
    console.log("Desplegando información del imueble");

    listingThumbnailImg.src = state.thumbnail;
    titleLabel.innerHTML = `<strong>${state.title}</strong>`;
    priceLabel.innerHTML = `<strong>${state.price}</strong>`;
    addressLabel.innerHTML = state.address;

    console.log("Información del inmueble desplegada");
}

async function displayPartiesData() {
    console.log("Desplegando información de los interesados");

    for (const p of state.parties) {
        const party = document.createElement("div");
        party.className = "sell-interested-row"
        party.innerHTML = `
            <input type="radio" name="parties" data-client-id="${p.idCliente || 0}">
            <label class="sell-interested-text">${p.nombreCompleto || "Nombre completo"}</label>
            <label class="sell-interested-text">${p.correo || "Correo electrónico"}</label>
            <label class="sell-interested-text">${p.telefono || "Sin número"}</label>
        `;
        const radioBtn = party.querySelector("input");
        radioBtn.addEventListener("change", () => {
            state.idClient = intOrNull(radioBtn.dataset.clientId);;
        });
        interestedContainer.appendChild(party);
    }

    console.log("Información de los interesados desplegada");
}

function loadEvents() {
    console.log("Cargando eventos");

    uploadFilesBtn.addEventListener("click", (e) => {
        //TO DO
    })

    soldDateInput.addEventListener("change", (e) => {
        state.date = soldDateInput.value;
    })

    soldListingBtn.addEventListener("click", (e) => {
        //TO DO
    })

    console.log("Eventos cargados con éxito");
}