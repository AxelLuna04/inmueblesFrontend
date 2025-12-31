import { getPayMethods } from '../../api/catalogueService.js';
import { postPayApi } from '../../api/payService.js';
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
const payForm = $('payForm');

const notification = $('notification');

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

    payForm.addEventListener("submit", postPay);

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
    const expirationMonthOption1 = document.createElement("option");
    expirationMonthOption1.value = "0"
    expirationMonthOption1.innerHTML = "--";
    expirationMonthSelect.appendChild(expirationMonthOption1);
    for (var i = 1; i <= 12; i++) {
        const expirationMonthOption2 = document.createElement("option");
        expirationMonthOption2.value = i;
        expirationMonthOption2.innerHTML = i;
        expirationMonthSelect.appendChild(expirationMonthOption2);
    }
    expirationYearSelect.classList.add("checkbox");
    const expirationYearOption1 = document.createElement("option");
    expirationYearOption1.value = "0"
    expirationYearOption1.innerHTML = "---";
    expirationYearSelect.appendChild(expirationYearOption1);
    for (var i = 2026; i <= 2040; i++) {
        const expirationYearOption2 = document.createElement("option");
        expirationYearOption2.value = i;
        expirationYearOption2.innerHTML = i;
        expirationYearSelect.appendChild(expirationYearOption2);
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
    addressLabel2.innerHTML = "Dirección de facturación (Línea 2):";
    addressInput2.classList.add("pay-input");
    addressInput2.type = "text";

    countryLabel.classList.add("pay-input-label");
    countryLabel.innerHTML = "País:";
    countrySelect.classList.add("checkbox");
    countrySelect.innerHTML = `
        <option value="0">Selecciona un país</option>
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

async function postPay(e) {
    e.preventDefault();

    if (validateData()) {
        try {
            const simulatedData = "VISA: " + intOrNull(cardNumberInput.value) + ", vencimiento: " + intOrNull(expirationMonthSelect.value) + "/" + intOrNull(expirationYearSelect.value);

            const data = {
                idTipoPago: intOrNull(payMethodSelect.value) || 0,
                monto: 30.00 || 0.00,
                datosSimulados: stringOrNull(simulatedData) || ""
            }

            const res = await postPayApi(state.id, data);

            if (res.yaTeniaAcceso) {
                showNotif(notification, res.mensaje, NOTIF_ORANGE, 5000);
            } else {
                showNotif(notification, res.mensaje, NOTIF_GREEN, 5000);
            }
            setTimeout(() => {
                window.location.href = `/pages/client/dataLister.html?id=${state.id}`;
            }, 5500);
        } catch(err) {
            if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
            console.error(`Error del front: ${err}`);
            showNotif(notification, "No se pudo realizar el pago, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
        }
        
    } else {
        showNotif(notification, "¡Llena todos los campos!", NOTIF_RED, 5000);
    }
}

function validateData() {
    var pass = true;

    payMethodSelect.classList.remove("pay-invalid");
    payMethodLabel.classList.remove("pay-invalid");

    cardNumberInput.classList.remove("pay-invalid");
    cardNumberLabel.classList.remove("pay-invalid");
    expirationMonthSelect.classList.remove("pay-invalid");
    expirationYearSelect.classList.remove("pay-invalid");
    expirationDateLabel.classList.remove("pay-invalid");
    securityCodeInput.classList.remove("pay-invalid");
    securityCodeLabel.classList.remove("pay-invalid");
    nameInput.classList.remove("pay-invalid");
    nameLabel.classList.remove("pay-invalid");
    lastnameInput.classList.remove("pay-invalid");
    lastnameLabel.classList.remove("pay-invalid");
    addressInput1.classList.remove("pay-invalid");
    addressLabel1.classList.remove("pay-invalid");
    addressInput2.classList.remove("pay-invalid");
    addressLabel2.classList.remove("pay-invalid");
    countrySelect.classList.remove("pay-invalid");
    countryLabel.classList.remove("pay-invalid");
    localityInput.classList.remove("pay-invalid");
    localityLabel.classList.remove("pay-invalid");
    zipcodeInput.classList.remove("pay-invalid");
    zipcodeLabel.classList.remove("pay-invalid");

    
    if(!intOrNull(payMethodSelect.value)) {
        pass = false;
        payMethodSelect.classList.add("pay-invalid");
        payMethodLabel.classList.add("pay-invalid");

        return pass;
    }

    switch(intOrNull(payMethodSelect.value)) {
        case 1:
            if(!intOrNull(cardNumberInput.value)) {
                pass = false;
                cardNumberInput.classList.add("pay-invalid");
                cardNumberLabel.classList.add("pay-invalid");
            }
            if(!intOrNull(expirationMonthSelect.value)) {
                pass = false;
                expirationMonthSelect.classList.add("pay-invalid");
                expirationDateLabel.classList.add("pay-invalid");
            }
            if(!intOrNull(expirationYearSelect.value)) {
                pass = false;
                expirationYearSelect.classList.add("pay-invalid");
                expirationDateLabel.classList.add("pay-invalid");
            }
            if(!intOrNull(securityCodeInput.value)) {
                pass = false;
                securityCodeInput.classList.add("pay-invalid");
                securityCodeLabel.classList.add("pay-invalid");
            }
            if(!stringOrNull(nameInput.value)) {
                pass = false;
                nameInput.classList.add("pay-invalid");
                nameLabel.classList.add("pay-invalid");
            }
            if(!stringOrNull(lastnameInput.value)) {
                pass = false;
                lastnameInput.classList.add("pay-invalid");
                lastnameLabel.classList.add("pay-invalid");
            }
            if(!stringOrNull(addressInput1.value)) {
                pass = false;
                addressInput1.classList.add("pay-invalid");
                addressLabel1.classList.add("pay-invalid");
            }
            if(!stringOrNull(addressInput2.value)) {
                pass = false;
                addressInput2.classList.add("pay-invalid");
                addressLabel2.classList.add("pay-invalid");
            }
            if(intOrNull(countrySelect.value) == 0) {
                pass = false;
                countrySelect.classList.add("pay-invalid");
                countryLabel.classList.add("pay-invalid");
            }
            if(!stringOrNull(localityInput.value)) {
                pass = false;
                localityInput.classList.add("pay-invalid");
                localityLabel.classList.add("pay-invalid");
            }
            if(!intOrNull(zipcodeInput.value)) {
                pass = false;
                zipcodeInput.classList.add("pay-invalid");
                zipcodeLabel.classList.add("pay-invalid");
            }
            break;
    }

    return pass;
}