import { getListingData } from "../../api/listingsService";
import { getHistorial, getHistorialTest } from "../../api/historialService";
import { intOrNull, stringOrNull } from "../../utils/helpers";
import {
    showNotif,
    NOTIF_GREEN,
    NOTIF_RED,
    NOTIF_ORANGE
} from "../../utils/notifications";

import { initHeader } from '../../js/shared/header.js';
import { initFooter } from '../../js/shared/footer.js';

//HELPERS
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    id: 0,
    title: "",
    movements: []
}

//ELEMENTS
const listingTitleLabel = $('listingTitleLabel');
const movementsContainerDiv = $('movementsContainerDiv');

//INNIT
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializando página")

    initHeader({ title: "Historial de la publicación" });
    initFooter();

    await loadListingData();
    listingTitleLabel.innerHTML = state.title;
    await loadHistorial();
    displayHistorial();

    console.log("===PÁGINA INICIALIZADA EXITOSAMENTE===")
}

//LOAD DATA
async function loadListingData() {
    console.log("Cargando datos del inmueble");

    const params = new URLSearchParams(window.location.search);
    state.id = params.get("id");

    if (intOrNull(state.id)) {
        try {
            const data = await getListingData(state.id);
            state.title = data.titulo || "Títutlo de la publicación";
        } catch(err) {
            if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
            console.error(`Error del front: ${err}`);
            showNotif(notification, "No se pudo cargar la publicación, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
        }
    } else {
        showNotif(notification, "La id del inmueble no es válida.", NOTIF_RED, 5000);
    }

    console.log("Datos del inmueble cargados")
}

async function loadHistorial() {
    try {
        state.movements = await getHistorial(state.id);
    } catch(err) {
        if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
        console.error(`Error del front: ${err}`);
        showNotif(notification, "No se pudo cargar el historial, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
    }
}

//HISTORIAL
function displayHistorial() {
    console.log("Desplegando historial");

    const movementList = [];
    state.movements.forEach((m) => {
        const movement = document.createElement("div");
        movement.classList.add("movement-card", "movement-card-grid");
        const movementText = document.createElement("div");
        movementText.classList.add("movement-text");
        const titleLabel = document.createElement("label");
        titleLabel.classList.add("movement-title");
        titleLabel.innerHTML = `<strong>${m.descripcion}</strong>`
        const dateLabel = document.createElement("label");
        let innitDate = m.fechaInicio.split('-').reverse().join('/');
        dateLabel.innerHTML = innitDate;
        const movementType = document.createElement("div");
        movementType.innerHTML = '<br>';
        const clientNameLabel = document.createElement("label");
        const priceLabel = document.createElement("label");

        switch(m.tipoMovimiento) {
            case 'CREACION' :
                movementType.classList.add("movement-type", "movement-creation");
                movementText.appendChild(titleLabel);
                movementText.appendChild(dateLabel);
                movement.appendChild(movementText);
                movement.appendChild(movementType);
                break;
            case 'APROBACION':
                movementType.classList.add("movement-type", "movement-aprobation");
                movementText.appendChild(titleLabel);
                movementText.appendChild(dateLabel);
                movement.appendChild(movementText);
                movement.appendChild(movementType);
                break;
            case 'EDICION':
                movementType.classList.add("movement-type", "movement-edition");
                movementText.appendChild(titleLabel);
                movementText.appendChild(dateLabel);
                movement.appendChild(movementText);
                movement.appendChild(movementType);
                break;
            case 'RENTA':
                if (stringOrNull(m.fechaFin)) {
                    let finishDate = m.fechaFin.split('-').reverse().join('/');
                    dateLabel.innerHTML = `${innitDate} - ${finishDate}`;
                } else {
                    dateLabel.innerHTML = `${innitDate} - vigente`;
                }
                clientNameLabel.innerHTML = m.nombreCliente || "Cliente";
                priceLabel.innerHTML = `$${m.precio}`;

                movementType.classList.add("movement-type", "movement-rent");
                movementText.appendChild(titleLabel);
                movementText.appendChild(clientNameLabel);
                movementText.appendChild(priceLabel);
                movementText.appendChild(dateLabel);
                movement.appendChild(movementText);
                movement.appendChild(movementType);
                break;
            case 'VENTA':
                clientNameLabel.innerHTML = m.nombreCliente || "Cliente";
                priceLabel.innerHTML = `$${m.precio}`;

                movementType.classList.add("movement-type", "movement-sold");
                movementText.appendChild(titleLabel);
                movementText.appendChild(clientNameLabel);
                movementText.appendChild(priceLabel);
                movementText.appendChild(dateLabel);
                movement.appendChild(movementText);
                movement.appendChild(movementType);
                break;
        }

        movementList.push(movement);
    })

    for (var i = movementList.length - 1; i >= 0; i--) {
        movementsContainerDiv.appendChild(movementList[i]);
    }

    console.log("Historial desplegado");
}