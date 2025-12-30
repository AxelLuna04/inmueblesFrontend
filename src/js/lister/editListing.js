import {
    patchListingApi,
    getListingData
} from '../../api/listingsService.js';
import {
    getPropertyTypes,
    getCharacteristics
} from '../../api/catalogueService.js';
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

import placeholderImg from '/src/assets/images/placeholder.jpg';

//HELPERS
const $ = (id) => document.getElementById(id);

//STATE
const state = {
    id: 0,
    title: "",
    operationType: "",
    price: "",
    listingType: "",
    bedrooms: 0,
    bathrooms: 0,
    toilets: 0,
    characteristicsInListing: [],
    description: "",
    address: null,

    types: [],
    characteristics: [],
    selectedCharacs: new Set(),
    idType: 0,

    photosInListing: [],
    newPhotos: [],
    deletedPhotos: [],
    photosUrls: [],
    idPortrait: 0
};

//ELEMENTOS
const form = $("editListingForm");
const title = $('titleInput');
const operationType = $("operationTypeSelect")
const price = $("priceInput")
const propertyType = $("propertyTypeSelect");
const characteristicsContainer = $("characteristicsContainer");
const description = $('descriptionTextArea');

const photosInput = $("photosInput");
const photoMeta = $("photosMeta");
const photosGrid = $("photosGrid");
const uploadPhotosBtn = $("uploadPhotosBtn");

const address = $('addressInput');
const searchBtn = $('searchBtn');

const counterTitle = $('counterTitleSpan')
const counterDescription = $('counterDescriptionSpan')

const notification = $('notification');

const bedroomsNumberDiv = $('bedroomsNumberDiv');
var bedroomsNumberLabel = null;
var bedroomsNumberInput = null;
const bathroomsNumberDiv = $('bathroomsNumberDiv');
var bathroomNumberLabel = null;
var bathroomsNumberInput = null;
const toiletsNumberDiv = $('toiletsNumberDiv');
var toiletsNumberLabel = null;
var toiletsNumberInput = null;

//OTHER ELEMENTS
var marker = null;
var map = null;

//INNIT PAGE
document.addEventListener("DOMContentLoaded", innit);

async function innit() {
    console.log("Inicializacndo página");

    loadEvents();
    inniCommonCharacInputs();
    await loadTypes()
    state.idType = intOrNull(propertyType.value);
    if (state.idType) await loadCharacteristics(state.idType);
    renderCharacteristics();
    innitMap();
    
    await loadData();
    displayListingData();

    console.log("===Página cargada exitosamente===");
}

function loadEvents(){
    console.log("Cargando eventos");

    propertyType.addEventListener("change", async () => {
        if (!propertyType.value) return;
        state.idType = intOrNull(propertyType.value);

        await loadCharacteristics(state.idType);
        let idsCharacsAvailables = new Set(state.characteristics.map(c => c.id));
        state.selectedCharacs = new Set([...state.selectedCharacs].filter(id => idsCharacsAvailables.has(id)));
        renderCharacteristics();

        displayGeneralCharacs();

        searchBtn.addEventListener('click', doSearch);

        address.addEventListener('keydown', (ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                doSearch();
            }
        });

        console.log("Eventos cargados");
    });
  
    photosInput.addEventListener("change", (e) => {
      const news = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
  
      const MAX_FOTOS = 12;
      state.newPhotos = state.newPhotos.concat(news).slice(0, MAX_FOTOS);
  
      if (state.photosInListing.length === 0) state.idPortrait = 0;
      if (state.idPortrait >= state.photosInListing.length) state.idPortrait = 0;
  
      renderPhotos();
      photosInput.value = "";
    });
  
    form.addEventListener("submit", onSubmitEditListing);

    uploadPhotosBtn.addEventListener("click", () => {
        photosInput.click();
    });

    description.addEventListener("input", ()=> {
        setLongDescription();
    })

    title.addEventListener("input", ()=> {
        setLongTitle();
    })
}

function displayGeneralCharacs() {
    switch (state.idType) {
        case 1:
            addBedroomsInput();
            addBathroomsInput();
            addToiletsInput();
            break;
        case 2:
            addBedroomsInput();
            addBathroomsInput();
            addToiletsInput();
            break;
        case 3:
            addBathroomsInput();
            addToiletsInput();
            removeBedroomsInput();

            state.bedrooms = 1;
            break;
        case 4:
            addToiletsInput();
            removeBedroomsInput();
            removeBathroomsInput();

            state.bedrooms = 0;
            state.bathrooms = 0;
            break;
        case 5:
            removeBedroomsInput();
            removeBathroomsInput();
            removeToiletsInput();

            state.bedrooms = 0;
            state.bathrooms = 0;
            state.toilets = 0;
            break;
    }
}

function setLongDescription() {
    var length = intOrNull(description.value.length);
    counterDescription.textContent = `${length}/200`;
    
    description.style.height = "auto";
    description.style.height = description.scrollHeight + "px";
}

function setLongTitle() {
    var length = intOrNull(title.value.length);
    counterTitle.textContent = `${length}/50`;
}

//BEDROOMS AND BATHROOMS
function inniCommonCharacInputs() {
    console.log("Inicializar características generales");

    bedroomsNumberLabel = document.createElement("label");
    bedroomsNumberLabel.innerHTML = 'Número de habitaciones';
    bedroomsNumberInput = document.createElement("input");
    bedroomsNumberInput.classList.add("input");
    bedroomsNumberInput.classList.add("input-row");
    bedroomsNumberInput.type= "number";
    bedroomsNumberInput.id = "bedroomsNumberInput";
    bedroomsNumberInput.addEventListener("input", ()=> {
        state.bedrooms = intOrNull(bedroomsNumberInput.value);
    })

    bathroomNumberLabel = document.createElement("label");
    bathroomNumberLabel.innerHTML = 'Número de baños completos';
    bathroomsNumberInput = document.createElement("input");
    bathroomsNumberInput.classList.add("input");
    bathroomsNumberInput.classList.add("input-row");
    bathroomsNumberInput.type= "number";
    bathroomsNumberInput.id = "bathroomsNumberInput";
    bathroomsNumberInput.addEventListener("input", ()=> {
        state.bathrooms = intOrNull(bathroomsNumberInput.value);
    })

    toiletsNumberLabel = document.createElement("label");
    toiletsNumberLabel.innerHTML = 'Número de excusados completos';
    toiletsNumberInput = document.createElement("input");
    toiletsNumberInput.classList.add("input");
    toiletsNumberInput.classList.add("input-row");
    toiletsNumberInput.type= "number";
    toiletsNumberInput.id = "toiletsNumberInput";
    toiletsNumberInput.addEventListener("input", ()=> {
        state.toilets = intOrNull(toiletsNumberInput.value);
    })

    console.log("Características generales inicializadas");
}

function addBedroomsInput() {
    if (bedroomsNumberDiv.children.length != 2) {
        bedroomsNumberDiv.appendChild(bedroomsNumberLabel);
        bedroomsNumberDiv.appendChild(bedroomsNumberInput);

        bedroomsNumberInput.value = state.bedrooms;
    }
}

function addBathroomsInput() {
    if (bathroomsNumberDiv.children.length != 2) {
        bathroomsNumberDiv.appendChild(bathroomNumberLabel);
        bathroomsNumberDiv.appendChild(bathroomsNumberInput);

        bathroomsNumberInput.value = state.bathrooms;
    }
}

function addToiletsInput() {
    if (toiletsNumberDiv.children.length != 2) {
        toiletsNumberDiv.appendChild(toiletsNumberLabel);
        toiletsNumberDiv.appendChild(toiletsNumberInput);

        toiletsNumberInput.value = state.toilets;
    }
}

function removeBedroomsInput() {
    if (bedroomsNumberDiv.children.length == 2) {
        bedroomsNumberDiv.removeChild(bedroomsNumberLabel);
        bedroomsNumberDiv.removeChild(bedroomsNumberInput);
    }
}

function removeBathroomsInput() {
    if (bathroomsNumberDiv.children.length == 2) {
        bathroomsNumberDiv.removeChild(bathroomNumberLabel);
        bathroomsNumberDiv.removeChild(bathroomsNumberInput)
    }
}

function removeToiletsInput() {
    if (toiletsNumberDiv.children.length == 2) {
        toiletsNumberDiv.removeChild(toiletsNumberLabel);
        toiletsNumberDiv.removeChild(toiletsNumberInput);
    }
}

//TYPES AND CHARACTERISTICS
async function loadTypes(){
    console.log("Cargar tipos de inmueble");

    try {
        const res = await getPropertyTypes();
        state.types = await res.json();

        propertyType.innerHTML = state.types.map(t =>
            `<option value="${t.id}">${escapeHtml(t.tipo ?? String(t.id))}</option>`
        ).join("");
    } catch(err) {
        showNotif(notification, err.message, NOTIF_RED);
    }

    console.log("Tipos de inmueble cargados");
}

async function loadCharacteristics(idType){
    try {
        const res = await getCharacteristics(idType);
        state.characteristics = await res.json();
    } catch(err) {
        showNotif(notification, err.message, NOTIF_RED);
    }
}

function renderCharacteristics(){
    characteristicsContainer.innerHTML = "";
  
    if (!state.characteristics || state.characteristics.length === 0){
      characteristicsContainer.innerHTML = `<p class="text-charac-error">No se encontraron características</p>`;
      return;
    }
  
    for (const c of state.characteristics){
      const id = c.id;
      const nombre = c.caracteristica ?? `Característica ${id}`;
      const checked = state.selectedCharacs.has(id) ? "checked" : "";
  
      const item = document.createElement("label");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = ".6rem";
      item.style.cursor = "pointer";
  
      item.innerHTML = `
        <input type="checkbox" data-carac-id="${id}" ${checked} />
        <span>${escapeHtml(nombre)}</span>
      `;
  
      const checkbox = item.querySelector("input");
      checkbox.addEventListener("change", () => {
        const caracId = intOrNull(checkbox.dataset.caracId);
        if (!caracId) return;
        if (checkbox.checked) state.selectedCharacs.add(caracId);
        else state.selectedCharacs.delete(caracId);
      });
  
      characteristicsContainer.appendChild(item);
    }
}

//PHOTOS
function renderPhotos(){
    state.photosUrls.forEach(URL.revokeObjectURL);
    state.photosUrls = [];
    photosGrid.innerHTML = "";

    const combined = [];

    state.photosInListing.map((p, idx) => {
        const photo = {
            kind: "existing",
            scr: p,
            idx: idx
        };
        combined.push(photo);
    });

    state.newPhotos.map((p) => {
        const photo = {
            kind: "new",
            file: p
        };
        combined.push(photo);
    })
  
    if (!combined || combined.length === 0){
        photoMeta.textContent = "Ninguna foto seleccionada";
        return;
    }
  
    if (combined.length == 1) 
        photoMeta.textContent = `${state.photosInListing.length} foto seleccionada`;
    else
        photoMeta.textContent = `${state.photosInListing.length} fotos seleccionadas`;
    
    combined.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "photo-thumb";
        const img = document.createElement("img");

        let src;
        if (item.kind === "existing") {
            src = item.src;
            img.alt = "Foto existente";
            img.onerror = function() {
                this.onerror = null;
                this.src = placeholderImg;
            }
        } else {
            src = URL.createObjectURL(item.file);
            state.photosUrls.push(src);
            img.alt = item.file.name;
        }
    
        img.src = src;
    
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-remove-photos";
        remove.textContent = "×";
        remove.title = "Quitar foto";
        remove.addEventListener("click", () => {
            if (item.kind === "existing") {
                    const urlEliminada = state.photosInListing[item.idx];
                    state.photosInListing.splice(item.exIndex, 1);
                    state.deletedPhotos.push(urlEliminada);
              } else {
                    state.newPhotos.splice(item.newIndex, 1);
              }
    
            const totalAfter = (state.photosInListing.length + state.newPhotos.length);
            if (totalAfter === 0) state.idPortrait = 0;
            else if (state.idPortrait === idx) state.idPortrait = 0;
            else if (idx < state.idPortrait) state.idPortrait -= 1;
    
            renderPhotos();
        });
    
        // portrait
        const portraitWrap = document.createElement("label");
        portraitWrap.className = "raddio-button"
    
        portraitWrap.innerHTML = `
            <input type="radio" name="portada" ${state.idPortrait === idx ? "checked" : ""} />
            <span class="text-portrait">Portada</span>
        `;
    
        portraitWrap.querySelector("input").addEventListener("change", () => {
            state.idPortrait = idx;
        });
    
        card.appendChild(img);
        card.appendChild(remove);
        card.appendChild(portraitWrap);
        photosGrid.appendChild(card);
    });
}

//MAP
function innitMap() {
    console.log("Inicializando mapa");

    map = L.map('map', { zoomControl: true }).setView([19.541796353862402, -96.92721517586615], 12); // La Facu, claro que sí
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    setTimeout(() => map.invalidateSize(), 0);

    map.on("click", async (ev) => {
        try {
          const { lat, lng } = ev.latlng;
          setMarker(lat, lng, "Buscando dirección...");
    
          const result = await reverseGeocode(lat, lng);
          if (!result) return;
    
          address.value = result.display_name || address.value;
          setMarker(lat, lng, result.display_name || null);
    
          const dto = mapAddress({
            ...result,
            lat: String(lat),
            lon: String(lng)
          });
    
          state.address = dto;
        } catch (e) {
            console.error(`Error del front: ${err}`);
            showNotif(notification, "No se pudo obtener la dirección en el puntero.", NOTIF_RED, 5000);
        }
    });

    console.log("Mapa inicializado");
}

async function geocode(text) {
    if (!text) return;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', text);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'es');
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
        showNotif(notification, "No se pudo obtener la dirección de nominatim.", NOTIF_RED, 5000);
        throw new Error('Error al consultar Nominatim');
    }
    const arr = await res.json();
    return arr[0] ?? null;
}

async function reverseGeocode(lat, lon) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "es");

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
        showNotif(notification, "No se pudo obtener la dirección de nominatim (reverse).", NOTIF_RED, 5000);
    }
    return await res.json();
}

function mapAddress(n) {
    const a = n.address || {};
    return {
        formattedAddress: n.display_name || null,
        line1: [a.road, a.house_number].filter(Boolean).join(" ") || null,
        sublocality: a.suburb || a.neighbourhood || a.quarter || a.village || null,
        locality: a.town || a.city || a.city_district || a.state_district || null,
        adminArea2: a.county || a.municipality || null,
        adminArea1: a.state || null,
        postalCode: a.postcode || null,
        countryCode: a.country_code ? a.country_code.toUpperCase() : null,
        lat: n.lat ? Number(n.lat) : null,
        lng: n.lon ? Number(n.lon) : null,
        provider: "osm-nominatim",
        providerPlaceId: n.osm_id ? String(n.osm_id) : null,
        raw: n
    };
}

function setMarker(lat, lon, popupText = null) {
    if (!marker) marker = L.marker([lat, lon]).addTo(map);
    else marker.setLatLng([lat, lon]);

    if (popupText) marker.bindPopup(popupText).openPopup();
    map.setView([lat, lon], 17);
}

async function doSearch() {
    try {
        const text = address.value.trim();
        if (!text) return;

        const result = await geocode(text);
        if (!result) return showNotif(notification, "No se encontró ninguna dirección.", NOTIF_ORANGE, 5000);
    
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setMarker(lat, lon, result.display_name);

        const dto = mapAddress(result);
        state.address = dto;
    } catch (e) {
        console.error("Error del front: " + e);
        showNotif(notification, "No se pudo encontrar la dirección.", NOTIF_RED, 5000);
    }
} 

async function loadData() {
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
    state.price = data.precio || 0;
    state.bedrooms = intOrNull(data.habitaciones) || 0;
    state.bathrooms = intOrNull(data.banosCompletos) || 0;
    state.toilets = intOrNull(data.excusados) || 0;
    state.operationType = stringOrNull(data.tipoOperacion) || "OPERACIÓN";
    state.listingType = stringOrNull(data.tipoInmueble) || "Tipo";
    state.address = data.direccion;
    state.photosInListing = data.fotos;
    state.characteristicsInListing = data.caracteristicas;

    state.characteristicsInListing.forEach((ci) => {
        state.characteristics.forEach((c) => {
            if(ci === c.caracteristica) state.selectedCharacs.add(c.id);
        })
    })

    console.log("Datos del inmueble asignados en el estado");
}

//DISPLAY INFORMATION
function displayListingData() {
    console.log("Desplegando datos del inmueble");

    title.value = state.title;
    operationType.value = state.operationType;
    price.value = state.price;
    switch(state.listingType) {
        case "Casa":
            propertyType.value = 1;
            break;
        case "Departamento":
            propertyType.value = 2;
            break;
        case "Cuarto":
            propertyType.value = 3;
            break;
        case "Oficina":
            propertyType.value = 4;
            break;
        case "Terreno":
            propertyType.value = 5;
            break;
    }
    renderCharacteristics();
    displayGeneralCharacs();
    description.value = state.description;
    renderPhotos();
    address.value = state.address.formattedAddress;
    setMarker(state.address.lat, state.address.lng, address.value);
    setLongDescription();
    setLongTitle();

    console.log("Datos del inmueble desplegados");
}

//PATCH
async function onSubmitEditListing(e){
    e.preventDefault();

    let valid = validateForm();

    if (valid) await patchListing();
}

async function patchListing(){
    const data = {
        titulo: title.value.trim(),
        descripcion: description.value.trim(),
        tipoOperacion: operationType.value.trim(), // "RENTA" or "VENTA"
        precio: floatOrNull(price.value),
    
        numeroHabitaciones: intOrNull(state.bedrooms),
        numeroBanosCompletos: intOrNull(state.bathrooms),
        numeroExcusados: intOrNull(state.toilets),
    
        idTipoInmueble: intOrNull(propertyType.value),
        direccion: state.address,
        caracteristicasIds: Array.from(state.selectedCharacs),
        fotosEliminar: state.deletedPhotos,
        indicePortada: state.idPortrait
    };
  
    const fd = new FormData();
    fd.append("datos", new Blob([JSON.stringify(data)], { type: "application/json" }));
    state.newPhotos.forEach(f => fd.append("fotosNuevas", f));
  
    try{
      await patchListingApi(state.id, fd);

      showNotif(notification, "¡Has editado tu publicación exitosamente! Te notificaremos cuando un administrador verifique los cambios.", NOTIF_GREEN, 5000);
      setTimeout(() => {
        window.location.href = "/pages/lister/dashboard.html";
      }, 5500);
    }catch(err){
        if (err.name === "ErrorApi") return showNotif(err.message, NOTIF_RED, 5000);
        console.error(`Error del front: ${err}`);
        showNotif(notification, "No se pudo crear la publicación, inténtelo de nuevo más tarde.", NOTIF_RED, 5000);
    }
}

//VALIDATIONS
/* The goat */
function validateForm() {
    let pass = true;

    let titleLabel = $('titleLabel');
    let priceLabel = $('priceLabel');
    let descriptionLabel = $('descriptionLabel');

    titleLabel.classList.remove('invalid');
    title.classList.remove('invalid');
    operationType.classList.remove('invalid');
    priceLabel.classList.remove('invalid');
    price.classList.remove('invalid');
    bedroomsNumberDiv.classList.remove('invalid');
    bathroomsNumberDiv.classList.remove('invalid');
    toiletsNumberDiv.classList.remove('invalid');
    descriptionLabel.classList.remove('invalid');
    description.classList.remove('invalid');

    if (!stringOrNull(title.value)) {
        titleLabel.classList.add('invalid');
        title.classList.add('invalid');
        pass = false;
    }
    if (!stringOrNull(operationType.value) || operationType.value === "NONE") {
        operationType.classList.add('invalid');
        pass = false;
    }
    if (!floatOrNull(price.value)) {
        priceLabel.classList.add('invalid');
        price.classList.add('invalid');
        pass = false;
    }
    if (!intOrNull(state.bedrooms) && state.idType < 3) {
        bedroomsNumberDiv.classList.add('invalid');
        pass = false;
    }
    if (!intOrNull(state.bathrooms) && state.idType < 4) {
        bathroomsNumberDiv.classList.add('invalid');
        pass = false;
    }
    if (!intOrNull(state.toilets) && state.idType < 5) {
        toiletsNumberDiv.classList.add('invalid');
        pass = false;
    }
    if (!stringOrNull(description.value)) {
        descriptionLabel.classList.add('invalid');
        description.classList.add('invalid');
        pass = false;
    }

    if (!pass) {
        showNotif(notification, "¡Llena todos los campos!", NOTIF_RED);
        return pass;
    }

    if (!intOrNull(state.photosInListing.length) && !intOrNull(state.newPhotos)) {
        pass = false;
        showNotif(notification, "¡No has subido ninguna foto!", NOTIF_RED);
        return pass;
    }

    if (!stringOrNull(state.address) || !stringOrNull(address.value)) {
        pass = false;
        showNotif(notification, "¡No has indicado ninguna dirección!", NOTIF_RED);
        return pass;
    }

    return true;
}

//SANITIZAME ESTA
function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
}