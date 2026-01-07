import {
    stringOrNull,
    floatOrNull,
    intOrNull
} from '../../utils/helpers.js';
import { getListingData, getMyListingDetail } from '../../api/listingsService.js';
import {
    showNotif,
    NOTIF_RED
 } from '../../utils/notifications.js';

 import placeholderImg from '/src/assets/images/placeholder.jpg';
import { initHeader } from './header.js';
import { initFooter } from './footer.js';
import { getListerData } from '../../api/contactService.js';

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

    photosSmall: [],

    listerData: null
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
    initHeader({ title: "Detalles de la publicación"});
    initFooter();
    
    await loadListingData();
    displayListingData();
    displayUserOptions();
    await verifiyPay();
}

//LOAD DATA
async function loadListingData() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        return showNotif(notification, "La id del inmueble no es válida.", NOTIF_RED, 5000);
    }

    try {
        let data;

        // LÓGICA HÍBRIDA:
        if (state.rol === "VENDEDOR") {
            // Intenta cargarla como "MI publicación" (permite ver PENDIENTE/RECHAZADA)
            try {
                data = await getMyListingDetail(id);
            } catch (err) {
                console.warn("No es mi publicación, intentando ruta pública...");
                // Si falla (ej. soy vendedor viendo la casa de OTRO), intento la pública
                data = await getListingData(id);
            }
        } else {
            // Si soy Cliente o Admin (en modo vista normal), uso la pública
            data = await getListingData(id);
        }
        
        insertListingData(data); // Tu función actual funciona perfecto con este data

    } catch(err) {
        // Corrección del showNotif que vimos antes
        if (err.name === "ErrorApi") {
             return showNotif(notification, err.message, NOTIF_RED, 5000);
        }
        console.error(`Error del front: ${err}`);
        showNotif(notification, "No se pudo cargar la publicación.", NOTIF_RED, 5000);
    }
}

function insertListingData(data) {
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
}

//DISPLAY INFORMATION
function displayUserOptions() {
    switch(state.rol) {
        case "VENDEDOR":
            const editListingBtn = document.createElement("a");
            editListingBtn.classList.add("btn", "btn-login");
            editListingBtn.href = `/pages/lister/editListing?id=${state.id}`;
            editListingBtn.innerHTML = `
                <Strong>Editar Publicación</Strong>       
            `;
            const sellListingBtn = document.createElement("a");
            sellListingBtn.classList.add("btn", "btn-register");
            sellListingBtn.href = `/pages/lister/sellListing.html?id=${state.id}`;
            sellListingBtn.innerHTML = `
                <Strong>Vender inmueble</Strong>          
            `;
            dataVarDiv.appendChild(editListingBtn);
            dataVarDiv.appendChild(sellListingBtn);
            break;
        case "ADMIN":
            const historialBtn = document.createElement("a");
            historialBtn.classList.add("btn", "btn-register");
            historialBtn.href = `/pages/admin/historial.html?id=${state.id}`;
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
}

async function verifiyPay() {
    try {
        const data = await getListerData(state.id);
        if (data != 403) {
            console.log("El cliente si ha pagado");
            state.listerData = data;
            displayListerData();
        }
    } catch (err) {
        if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
            console.error(`Error del front: ${err}`);
    }
}

function displayListerData() {
    dataVarDiv.innerHTML = `
        <label class="text-lister-data">Vendedor: ${state.listerData.nombreVendedor}</label>
        <label class="text-lister-data">Correo: ${state.listerData.correoVendedor}</label>
        <label class="text-lister-data">Número: ${state.listerData.telefonoVendedor}</label>
    `;
    const dataListerBtn = document.createElement("a");
            dataListerBtn.classList.add("btn", "btn-register");
            dataListerBtn.href = `/pages/client/scheduleAppointment.html?idListing=${state.id}&idLister=${state.listerData.idVendedor}`;
            dataListerBtn.innerHTML = `
                <Strong>Agendar cita</Strong>            
            `;
            dataVarDiv.appendChild(dataListerBtn);
}

function displayListingData() {
    pageTitle.innerHTML = stringOrNull(state.title);
    price.innerHTML = "$" + stringOrNull(state.price) + " MXN";
    displayPhotos();
    innitMap();
    addressLabel.innerHTML = stringOrNull(state.address.formattedAddress);
    descriptionLabel.innerHTML = state.description;
    displayGeneralCharacs();
    displaySpecificCharacs();
}

function displayPhotos() {
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
}

function innitMap() {
    map = L.map('map', { zoomControl: true }).setView([state.address.lat, state.address.lng], 15); // La Facu, claro que sí
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    setTimeout(() => map.invalidateSize(), 0);

    setMarker(state.address.lat, state.address.lng, "")
}

function setMarker(lat, lon, popupText = null) {
    if (!marker) marker = L.marker([lat, lon]).addTo(map);
    else marker.setLatLng([lat, lon]);

    if (popupText) marker.bindPopup(popupText).openPopup();
    map.setView([lat, lon], 17);
}

function displayGeneralCharacs() {
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
}

function displaySpecificCharacs() {
    state.characteristics.forEach(c => {
        const characLabel = document.createElement("label");
        characLabel.classList.add("text-charac-specific");
        characLabel.innerHTML = `${c}`;
        specificCharacsDiv.appendChild(characLabel);
    })
}