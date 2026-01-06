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
import { initHeader } from './header.js';
import { initFooter } from './footer.js';

//HELPERS
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    rol: localStorage.getItem("rol"),

    id: 0,
    title: "",
    description: "",
    price: "",
    bedrooms: 0,
    bathrooms: 0,
    toilets: 0,
    operationType: "",
    listingType: "",
    address: null,
    photos: [],
    characteristics: [],
    refusedMotive: "",

    photosSmall: []
}

//ELEMENTS
const headerOptionsDiv = $('headerOptionsDiv');
const dataVarDiv = $('dataVarDiv');
const refusedMotiveDiv = $('refusedMotiveDiv');

const pageTitle = $('pageTitle');
const price = $('price');
const photoBigDiv = $('photoBigDiv');
const photosSmallDiv = $('photosSmallDiv');
const addressLabel = $('addressLabel');
var map = $('map');
var marker = null;
const descriptionLabel = $('descriptionLabel');
const generalCharacsDiv = $('generalCharacsDiv');
const specificCharacsDiv = $('specificCharacsDiv');

const notification = $('notification');

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando página");

    initHeader({ title: "Detalles de la publicación"});
    initFooter();
    
    await loadListingData();
    displayListingData();
    displayUserOptions();

    console.log("===PÁGINA INICIALIZADA EXITOSAMENTE===");
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
    state.description = stringOrNull(data.descripcion) || "Descrición del inmueble";
    state.price = floatOrNull(data.precio).toLocaleString("es-MX") || 0;
    state.bedrooms = intOrNull(data.habitaciones) || 0;
    state.bathrooms = intOrNull(data.banosCompletos) || 0;
    state.toilets = intOrNull(data.excusados) || 0;
    state.operationType = stringOrNull(data.tipoOperacion) || "OPERACIÓN";
    state.listingType = stringOrNull(data.tipoInmueble) || "Tipo";
    state.address = data.direccion;
    state.photos = data.fotos;
    state.characteristics = data.caracteristicas;

    console.log("Datos del inmueble asignados en el estado");
}

//DISPLAY INFORMATION
function displayUserOptions() {
    console.log("Desplegando opciones por usuario");

    switch(state.rol) {
        case "VENDEDOR":
            const editListingBtn = document.createElement("a");
            editListingBtn.classList.add("btn", "btn-login");
            editListingBtn.href = `/pages/lister/editListing?id=${state.id}`;
            editListingBtn.innerHTML = `
                <Strong>Editar Publicación</Strong>       
            `;
            /*const removeListingBtn = document.createElement("a");
            removeListingBtn.classList.add("btn", "btn-remove-listing");
            //TODO
            removeListingBtn.innerHTML = `
                <Strong>Eliminar Publicación</Strong>          
            `;*/
            const sellListingBtn = document.createElement("a");
            sellListingBtn.classList.add("btn", "btn-register");
            sellListingBtn.href = `/pages/lister/sellListing.html?id=${state.id}`;
            sellListingBtn.innerHTML = `
                <Strong>Vender inmueble</Strong>          
            `;
            dataVarDiv.appendChild(editListingBtn);
            //dataVarDiv.appendChild(removeListingBtn);
            dataVarDiv.appendChild(sellListingBtn);
            break;
        case "ADMIN":
            const historialBtn = document.createElement("a");
            historialBtn.classList.add("btn", "btn-register");
            historialBtn.href = `/pages/admin/history.html?id=${state.id}`;
            historialBtn.innerHTML = `<strong>Ver historial</strong>`;
            dataVarDiv.appendChild(historialBtn);
            break;
        default:
            const dataListerBtn = document.createElement("a");
            dataListerBtn.classList.add("btn", "btn-register");
            dataListerBtn.href = `/pages/client/pay.html?id=${state.id}`;
            dataListerBtn.innerHTML = `
                <Strong>Obtener Datos de Contacto</Strong>            
            `;
            dataVarDiv.appendChild(dataListerBtn);
            break;
    }

    console.log("Opciones por usuario desplegadas");
}

function displayListingData() {
    console.log("Desplegando datos del inmueble");

    pageTitle.innerHTML = stringOrNull(state.title);
    price.innerHTML = "$" + stringOrNull(state.price) + " MXN";
    displayPhotos();
    innitMap();
    addressLabel.innerHTML = stringOrNull(state.address.formattedAddress);
    descriptionLabel.innerHTML = state.description;
    displayGeneralCharacs();
    displaySpecificCharacs();

    console.log("Datos del inmueble desplegados");
}

function displayPhotos() {
    console.log("Desplegando fotografías");

    photoBigDiv.innerHTML = `
        <img src="${state.photos[0] || ""}"
             alt="Fotografía del inmueble"
             class="photo-big"
             onerror="this.src='/src/assets/images/placeholder.jpg'"/>
    `;

    state.photos.forEach(p => {
        const photoSmall = document.createElement("img");
        photoSmall.src = p;
        photoSmall.alt = "Foto pequeña del inmueble";
        photoSmall.onerror = function() {
            this.onerror = null;
            this.src = placeholderImg;
        }
        photoSmall.classList.add("photo-small");
        photoSmall.addEventListener("click", (e) => {
            state.photosSmall.forEach(p => {
                p.classList.remove("photo-small-selected");
            })
            photoSmall.classList.add("photo-small-selected");

            photoBigDiv.innerHTML = `
                <img src="${p || ""}"
                    alt="Fotografía del inmueble"
                    class="photo-big"
                    onerror="this.src='/src/assets/images/placeholder.jpg'"/>
            `;
        })
        photosSmallDiv.appendChild(photoSmall);
        state.photosSmall.push(photoSmall);
    });

    console.log("Fotografías desplegadas");
}

function innitMap() {
    console.log ("Inicializando mapa");

    map = L.map('map', { zoomControl: true }).setView([state.address.lat, state.address.lng], 15); // La Facu, claro que sí
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    setTimeout(() => map.invalidateSize(), 0);

    setMarker(state.address.lat, state.address.lng, "")

    console.log("Mapa inicializado");
}

function setMarker(lat, lon, popupText = null) {
    console.log ("Colocando el marcador");

    if (!marker) marker = L.marker([lat, lon]).addTo(map);
    else marker.setLatLng([lat, lon]);

    if (popupText) marker.bindPopup(popupText).openPopup();
    map.setView([lat, lon], 17);

    console.log("Marcador colocado");
}

function displayGeneralCharacs() {
    console.log("Desplegando características generales");

    if (state.bedrooms) {
        const bedroomsLabel = document.createElement("label");
        bedroomsLabel.classList.add("text-charac-general");
        bedroomsLabel.innerHTML = `
            Habitaciones: ${state.bedrooms}
        `;
        generalCharacsDiv.appendChild(bedroomsLabel);
    }
    if (state.bathrooms) {
        const bathroomsLabel = document.createElement("label");
        bathroomsLabel.classList.add("text-charac-general");
        bathroomsLabel.innerHTML = `
            Baños completos: ${state.bathrooms}
        `;
        generalCharacsDiv.appendChild(bathroomsLabel);
    }
    if (state.toilets) {
        const toiletsLabel = document.createElement("label");
        toiletsLabel.classList.add("text-charac-general");
        toiletsLabel.innerHTML = `
            Excusados: ${state.toilets}
        `;
        generalCharacsDiv.appendChild(toiletsLabel);
    }

    console.log("Características generales desplegadas");
}

function displaySpecificCharacs() {
    console.log("Desplegando características específicas");

    state.characteristics.forEach(c => {
        const characLabel = document.createElement("label");
        characLabel.classList.add("text-charac-specific");
        characLabel.innerHTML = `${c}`;
        specificCharacsDiv.appendChild(characLabel);
    })

    console.log("Características específicas desplegadas");
}