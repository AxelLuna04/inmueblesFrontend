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
}

//ELEMENTS
const headerOptionsDiv = $('headerOptionsDiv');
const dataVarDiv = $('dataVarDiv');

const pageTitle = $('pageTitle');
const price = $('price');

const notification = $('notification');

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando página");
    
    await loadListingData();
    loadHeaderDetails();
    displayListingData();
    loadDataVarOptions();
}

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

function loadHeaderDetails(){
    console.log("Cargando detalles del header");
    console.log("ROL: " + state.rol);

    if (state.rol != "CLIENTE" && state.rol != "VENDEDOR") {
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

    console.log("Detalles del header cargados");
}

function loadDataVarOptions() {
    console.log("Cargando opciones para desplegar en la barra de datos");

    switch(state.rol) {
        case "VENDEDOR":
            const editListingBtn = document.createElement("a");
            editListingBtn.classList.add("btn", "btn-login");
            editListingBtn.href = `pages/lister/editListing?id=${state.id}`;
            editListingBtn.innerHTML = `
                <Strong>Editar Publicación</Strong>       
            `;
            const removeListingBtn = document.createElement("a");
            removeListingBtn.classList.add("btn", "btn-remove-listing");
            //TODO
            removeListingBtn.innerHTML = `
                <Strong>Eliminar Publicación</Strong>          
            `;
            dataVarDiv.appendChild(editListingBtn);
            dataVarDiv.appendChild(removeListingBtn);
            break;
        case "ADMINISTRADOR":
            //TODO
            break;
        default:
            const dataListerBtn = document.createElement("a");
            dataListerBtn.classList.add("btn", "btn-register");
            dataListerBtn.href = "pages/client/pay.html";
            dataListerBtn.innerHTML = `
                <Strong>Obtener Datos de Contacto</Strong>            
            `;
            dataVarDiv.appendChild(dataListerBtn);
            break;
    }

    console.log("Opciones para desplegar en la barra de datos cargadas");
}

function displayListingData() {
    console.log("Desplegando datos del inmueble");

    pageTitle.innerHTML = stringOrNull(state.title);
    price.innerHTML = "$" + stringOrNull(state.price) + " MXN";

    console.log("Datos del inmueble desplegados");
}