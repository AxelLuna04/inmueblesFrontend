import { getPayMethods } from '../../api/catalogueService.js';
import {
    stringOrNull,
    floatOrNull,
    intOrNull
} from '../../utils/helpers.js';
import {
    showNotif,
    NOTIF_GREEN,
    NOTIF_RED,
    NOTIF_ORANGE
} from '../../utils/notifications.js';

//HELPER
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    id: 0,
    payMethods: []
}

//ELEMENTS
const payMethodLabel = $('payMethodLabel');
const payMethodSelect = $('payMethodSelect');
const elementsDiv = $('elementsDiv');

/* Credit Card */
const carNumberLabel = $('carNumberLabel');
const cardNumberInput = document.createElement("input");
const expirationDateLabel = document.createElement("label");
const expirationMonthSelect = document.createElement("select");
const expirationYearSelect = document.createElement("Select");
const securityCodeLabel = document.createElement("label");
const securityCodeInput = document.createElement("input");
const nameLabel = document.createElement("label");
const nameInput = document.createElement("input");
const lastnameLabel = document.createElement("label");
const lastnameInput = document.createElement("input");
const addressLabel1 = document.createElement("label");
const addressInput1 = document.createElement("input");
const addressLabel2 = document.createElement("label");
const addressInput2 = document.createElement("input");
const countryLabel = document.createElement("label");
const countrySelect = document.createElement("select");
const localityLabel = document.createElement("label");
const localityInput = document.createElement("input");
const zipcodeLabel = document.createElement("label");
const zipcodeInput = document.createElement("input");

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando la página")

    const params = new URLSearchParams(window.location.search);
    state.id = params.get("id");

    await loadPayMethods();

    console.log("===PÁGINA INICIALIZADA EXITOSAMENTE===")
}

async function loadPayMethods() {
    console.log("Cargando métodos de pago")

    try {
        state.payMethods = await getPayMethods();
        displayPayMethods();
    } catch(err) {
        if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
        console.error(`Error del front: ${err}`);
        showNotif(notification, "No se pudieron cargar los métodos de pago.", NOTIF_RED, 5000);
    }

    console.log("Métodos de pago cargados")
}

function displayPayMethods() {
    state.payMethods.forEach((m) => {
        const payMethodOption = document.createElement("option");
        payMethodOption.value = m.id;
        payMethodOption.innerHTML = m.nombre;
        payMethodSelect.appendChild(payMethodOption);
    })
}