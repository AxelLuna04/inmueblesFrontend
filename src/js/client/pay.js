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
const cardNumberLabel = $('carNumberLabel');
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
    innitCardMethod();
    loadEvents();

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
    console.log("Desplegando métodos de pago");

    state.payMethods.forEach((m) => {
        const payMethodOption = document.createElement("option");
        payMethodOption.value = m.id;
        payMethodOption.innerHTML = m.nombre;
        payMethodSelect.appendChild(payMethodOption);
    })

    console.log("Métodos de pago desplegados");
}

function loadEvents() {
    console.log("Cargando eventos");

    payMethodSelect.addEventListener("change", (e) => {
        switch((intOrNullpayMethodSelect.value)) {
            case 1:
                displayCardMethod();
                break;
        }
    })

    console.log("Eventos cargados");
}

function innitCardMethod() {
    console.log("Inicializando el método de pago por tarjeta")

    cardNumberLabel.classList.add("pay-input-label");
    cardNumberLabel.innerHTML = "Número de tarjeta:";
    cardNumberInput.classList.add("pay-input");
    cardNumberInput.type = "number";

    expirationDateLabel.classList.add("pay-input-label");
    expirationDateLabel.innerHTML = "Fecha de caducidad:";
    expirationMonthSelect.classList.add("checkbox");
    const expirationMonthOption = document.createElement("option");
    expirationMonthOption.value = "NONE"
    expirationMonthOption.innerHTML = "--";
    expirationMonthSelect.appendChild(expirationMonthOption);
    for (var i = 1; i <= 12; i++) {
        expirationMonthOption.value = i;
        expirationMonthOption.innerHTML = i;
        expirationMonthSelect.appendChild(expirationMonthOption);
    }
    expirationYearSelect.classList.add("checkbox");
    const expirationYearOption = document.createElement("option");
    expirationYearOption.value = "NONE"
    expirationYearOption.innerHTML = "---";
    expirationMonthSelect.appendChild(expirationYearOption);
    for (var i = 2026; i <= 2040; i++) {
        expirationYearOption.value = i;
        expirationYearOption.innerHTML = i;
        expirationMonthSelect.appendChild(expirationYearOption);
    }
    securityCodeLabel.classList.add("pay-input-label");
    securityCodeLabel.innerHTML = "Código de seguridad:";
    securityCodeInput.classList.add("pay-input");
    securityCodeInput.type = "number";
    securityCodeInput.maxLength = "3";

    nameLabel.classList.add("pay-input-label");
    nameLabel.innerHTML = "Nombre(s):";
    nameInput.classList.add("pay-input");
    nameInput.type = "text";
    lastnameLabel.classList.add("pay-input-label");
    lastnameLabel.innerHTML = "Apellidos:";
    nameInput.classList.add("pay-input");
    nameInput.type = "text";

    addressLabel1.classList.add("pay-input-label");
    addressLabel1.innerHTML = "Dirección de facturación (Línea 1):";
    addressInput1.classList.add("pay-input");
    addressInput1.type = "text";
    addressLabel2.classList.add("pay-input-label");
    addressLabel2.innerHTML = "Dirección de facturación (Línea 1):";
    addressInput2.classList.add("pay-input");
    addressInput2.type = "text";

    countryLabel.classList.add("pay-input-label");
    countryLabel.innerHTML = "País:";
    countrySelect.classList.add("checkbox");
    countrySelect.innerHTML = `
        <option value="NONE">Selecciona un país</option>
        <option value="Mexico">México</option>
    `;
    localityLabel.classList.add("pay-input-label");
    localityLabel.innerHTML = "Localidad:";
    localityInput.classList.add("pay-input");
    localityInput.type = "text";
    zipcodeLabel.classList.add("pay-input-label");
    zipcodeLabel.innerHTML = "Código postal:";
    zipcodeInput.classList.add("pay-input");
    zipcodeInput.type = "number";

    console.log("Método de tarjeta inicializado")
}

function displayCardMethod() {

}