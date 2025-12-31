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
const cardNumberLabel = document.createElement("label");
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
        switch(intOrNull(payMethodSelect.value)) {
            case 1:
                displayCardMethod();
                break;
            default:
                elementsDiv.innerHTML = "";
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
    lastnameInput.classList.add("pay-input");
    lastnameInput.type = "text";

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
    elementsDiv.innerHTML = "";

    const numberExpirationCodeDiv = document.createElement("div");
    numberExpirationCodeDiv.className = "section-grid";

    const div1 = document.createElement("div");
    const cardNumberDiv = document.createElement("div");
    cardNumberDiv.className = "pay-card";
    cardNumberDiv.appendChild(cardNumberLabel);
    cardNumberDiv.appendChild(cardNumberInput);
    div1.appendChild(cardNumberDiv);
    numberExpirationCodeDiv.appendChild(div1);

    const expirationCodeDiv = document.createElement("div");
    expirationCodeDiv.className = "pay-card";
    const div2 = document.createElement("div");
    div2.className = "pay-split";
    const div3 = document.createElement("div");
    const expirationMonthYearDiv = document.createElement("div");
    expirationMonthYearDiv.className = "pay-split";
    expirationMonthYearDiv.appendChild(expirationMonthSelect);
    expirationMonthYearDiv.appendChild(expirationYearSelect);
    div3.appendChild(expirationDateLabel);
    div3.appendChild(expirationMonthYearDiv);
    div2.appendChild(div3);
    const securityCodeDiv = document.createElement("div");
    securityCodeDiv.appendChild(securityCodeLabel);
    securityCodeDiv.appendChild(securityCodeInput);
    div2.appendChild(securityCodeDiv);
    expirationCodeDiv.appendChild(div2);
    numberExpirationCodeDiv.append(expirationCodeDiv);
    elementsDiv.appendChild(numberExpirationCodeDiv);

    const facturationDataDiv = document.createElement("div");
    facturationDataDiv.className = "pay-card";
    facturationDataDiv.innerHTML = `
        <label class="pay-label"><strong>Información de facturación</strong></label>
    `;

    const nameLastnameDiv = document.createElement("div");
    nameLastnameDiv.className = "pay-split";
    const nameDiv = document.createElement("div");
    nameDiv.className = "pay-section-flex";
    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);
    nameLastnameDiv.appendChild(nameDiv);
    const lastnameDiv = document.createElement("div");
    lastnameDiv.className = "pay-section-flex";
    lastnameDiv.appendChild(lastnameLabel);
    lastnameDiv.appendChild(lastnameInput);
    nameLastnameDiv.appendChild(lastnameDiv);
    facturationDataDiv.appendChild(nameLastnameDiv);

    const addressesDiv = document.createElement("div");
    addressesDiv.classList.add("pay-split", "pay-section-margin");
    const address1Div =  document.createElement("div");
    address1Div.appendChild(addressLabel1);
    address1Div.appendChild(addressInput1);
    addressesDiv.appendChild(address1Div);
    const address2Div =  document.createElement("div");
    address2Div.appendChild(addressLabel2);
    address2Div.appendChild(addressInput2);
    addressesDiv.appendChild(address2Div);
    facturationDataDiv.appendChild(addressesDiv);

    const countryLocalityZipcodeDiv = document.createElement("div");
    countryLocalityZipcodeDiv.className = "pay-split-3";
    const countryDiv = document.createElement("div");
    countryDiv.appendChild(countryLabel);
    countryDiv.appendChild(countrySelect);
    countryLocalityZipcodeDiv.appendChild(countryDiv);
    const localityDiv = document.createElement("div");
    localityDiv.appendChild(localityLabel);
    localityDiv.appendChild(localityInput);
    countryLocalityZipcodeDiv.appendChild(localityDiv);
    const zipcodeDiv = document.createElement("div");
    zipcodeDiv.appendChild(zipcodeLabel);
    zipcodeDiv.appendChild(zipcodeInput);
    countryLocalityZipcodeDiv.appendChild(zipcodeDiv);
    facturationDataDiv.appendChild(countryLocalityZipcodeDiv);

    elementsDiv.appendChild(facturationDataDiv);
    
}