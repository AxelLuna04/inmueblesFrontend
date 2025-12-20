const URL_BASE = "/api/v1";
const URL_TYPES = `${URL_BASE}/tipos-inmueble`;
const URL_CHARACTERISTICS = (idType) => `${URL_TYPES}/${idType}/caracteristicas`;
const URL_POST_PUBLICATION = `${URL_BASE}/publicaciones`;

const COLOR_GREEN = "green";
const COLOR_RED = "red";
const COLOR_ORANGE = "orange";

//TEMPORAL
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdWx0cml4ODRAZ21haWwuY29tIiwicm9sIjoiVkVOREVET1IiLCJpYXQiOjE3NjYxMjYyMzEsImV4cCI6MTc2NjEyNzEzMX0.BxqGl0xuK7P_-mi1Hj45t9GHmxFM1DNdgBPGXUCG6uk";

//HELPERS
const $ = (id) => document.getElementById(id);

function intOrNull(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

function floatOrNull(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function stringOrNull(v) {
    if (v === null || v === undefined) return null
    const s = String(v).trim();
    if (s === "") return null;
    return v;
}

//STATE
const state = {
    types: [],
    characteristics: [],
    selectedCharacs: new Set(),
    photos: [],
    photosUrls: [],
    idPortrait: 0,
    address: null,
    bedrooms: 0,
    bathrooms: 0,
    idType: 0,
};

//ELEMENTOS
const form = $("postPubliForm");
const title = $('titleInput');
const operationType = $("operationTypeSelect")
const price = $("priceInput")
const propertyType = $("propertyTypeSelect");
const characteristicsContainer = $("characteristicsContainer");
const toiletsNumber = $('toiletsNumberInput');
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

//OTHER ELEMENTS
var marker = null;
var map = null;

document.addEventListener("DOMContentLoaded", innit);

//INITIALIZATE PAGE
async function innit(){
    loadEvents();
    innitBedBathInputs();

    await loadTypes();
    state.idType = intOrNull(propertyType.value);
    if (state.idType) await loadCharacteristics(state.idType);
    renderCharacteristics();

    renderPhotos();

    innitMap();
}

function loadEvents(){
    propertyType.addEventListener("change", async () => {
        if (!propertyType.value) return;
        state.idType = intOrNull(propertyType.value);

        await loadCharacteristics(state.idType);
        let idsCharacsAvailables = new Set(state.characteristics.map(c => c.id));
        state.selectedCharacs = new Set([...state.selectedCharacs].filter(id => idsCharacsAvailables.has(id)));
        renderCharacteristics();

        switch (state.idType) {
            case 1:
                addBedroomsInput();
                addBathroomsInput();
                break;
            case 2:
                addBedroomsInput();
                addBathroomsInput();
                break;
            case 3:
                addBathroomsInput();
                removeBedroomsInput();

                state.bedrooms = 1;
                break;
            case 4:
                removeBedroomsInput();
                removeBathroomsInput();

                state.bedrooms = 0;
                state.bathrooms = 0;
                break;
            case 5:
                removeBedroomsInput();
                removeBathroomsInput();

                state.bedrooms = 0;
                state.bathrooms = 0;
                break;
        }

        searchBtn.addEventListener('click', doSearch);

        address.addEventListener('keydown', (ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                doSearch();
            }
        });
    });
  
    photosInput.addEventListener("change", (e) => {
      const nuevas = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
  
      const MAX_FOTOS = 12;
      state.photos = state.photos.concat(nuevas).slice(0, MAX_FOTOS);
  
      if (state.photos.length === 0) state.idPortrait = 0;
      if (state.idPortrait >= state.photos.length) state.idPortrait = 0;
  
      renderPhotos();
      photosInput.value = "";
    });
  
    form.addEventListener("submit", onSubmitCrearPublicacion);

    uploadPhotosBtn.addEventListener("click", () => {
        photosInput.click();
    });

    description.addEventListener("input", ()=> {
        var length = intOrNull(description.value.length);
        counterDescription.textContent = `${length}/200`;
        
        description.style.height = "auto";
        description.style.height = description.scrollHeight + "px";
    })

    title.addEventListener("input", ()=> {
        var length = intOrNull(title.value.length);
        counterTitle.textContent = `${length}/50`;
    })
}

//BEDROOMS AND BATHROOMS
function innitBedBathInputs() {
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

    addBedroomsInput();
    addBathroomsInput();
}

function addBedroomsInput() {
    if (bedroomsNumberDiv.children.length != 2) {
        bedroomsNumberDiv.appendChild(bedroomsNumberLabel);
        bedroomsNumberDiv.appendChild(bedroomsNumberInput);
    }
}

function addBathroomsInput() {
    if (bathroomsNumberDiv.children.length != 2) {
        bathroomsNumberDiv.appendChild(bathroomNumberLabel);
        bathroomsNumberDiv.appendChild(bathroomsNumberInput);
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

//TYPES AND CHARACTERISTICS
async function loadTypes(){
    const res = await fetch(URL_TYPES);
    if (!res.ok) throw new Error("No se pudieron cargar los tipos de inmueble.");
    state.types = await res.json();
  
    propertyType.innerHTML = state.types.map(t =>
      `<option value="${t.id}">${escapeHtml(t.tipo ?? String(t.id))}</option>`
    ).join("");
}

async function loadCharacteristics(idType){
    const res = await fetch(URL_CHARACTERISTICS(idType));
    if (!res.ok) throw new Error("No se pudieron cargar las características.");

    state.characteristics = await res.json();
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
  
    if (!state.photos || state.photos.length === 0){
        photoMeta.textContent = "Ninguna foto seleccionada";
        return;
    }
  
    if (state.photos.length == 1) 
        photoMeta.textContent = `${state.photos.length} foto seleccionada`;
    else
        photoMeta.textContent = `${state.photos.length} fotos seleccionadas`;
    
    state.photos.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        state.photosUrls.push(url);
    
        const card = document.createElement("div");
        card.className = "photo-thumb";
    
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
    
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-remove-photos";
        remove.textContent = "×";
        remove.title = "Quitar foto";
        remove.addEventListener("click", () => {
            state.photos.splice(idx, 1);
    
            if (state.photos.length === 0)
                state.idPortrait = 0;
            else if (state.idPortrait === idx)
                state.idPortrait = 0;
            else if (idx < state.idPortrait)
                state.idPortrait -= 1;
    
            renderPhotos();
            URL.revokeObjectURL(url);
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
            showNotif("No se pudo obtener la dirección en el puntero.", COLOR_RED, 5000);
        }
    });
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
        showNotif("No se pudo obtener la dirección de nominatim.", COLOR_RED, 5000);
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
        showNotif("No se pudo obtener la dirección de nominatim (reverse).", COLOR_RED, 5000);
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
        if (!result) return showNotif("No se encontró ninguna dirección.", COLOR_ORANGE, 5000);
    
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setMarker(lat, lon, result.display_name);

        const dto = mapAddress(result);
        state.address = dto;
    } catch (e) {
        console.error("Error del front: " + e);
        showNotif("No se pudo encontrar la dirección.", COLOR_RED, 5000);
    }
} 

//POST
async function onSubmitCrearPublicacion(e){
    e.preventDefault();

    let valid = validateForm();

    if (valid) await postPublication();
}

async function postPublication(){
    const data = {
        titulo: title.value.trim(),
        tipoOperacion: operationType.value.trim(), // "RENTA" or "VENTA"
        descripcion: description.value.trim(),
        precio: floatOrNull(price.value),
    
        numeroHabitaciones: intOrNull(state.bedrooms),
        numeroBanosCompletos: intOrNull(state.bathrooms),
        numeroExcusados: intOrNull(toiletsNumber.value),
    
        idTipoInmueble: intOrNull(propertyType.value),
        direccion: state.address,
        caracteristicasIds: Array.from(state.selectedCharacs),
        indicePortada: state.idPortrait
    };
  
    const fd = new FormData();
    fd.append("datos", new Blob([JSON.stringify(data)], { type: "application/json" }));
    state.photos.forEach(f => fd.append("fotos", f));
  
    try{
      const res = await fetch(URL_POST_PUBLICATION, {
        method: "POST",
        //TEMPORAL: Sólo para probar que si se guarda, luego se tiene que quitar esto.
        headers: {
            Authorization: `Bearer ${JWT}`
        },
        body: fd,
      });
  
      if (!res.ok){
        const text = await res.text().catch(() => "");
        showNotif("Error del servidor, inténtelo de nuevo más tarde.", COLOR_RED, 50000);
        //DEVELOPMENT
        console.error(`Error del servidor - (${res.status}): ${text}`)
      }
  
      const creado = await res.json();
      showNotif("¡Has creado una publicación exitosamente! Te notificaremos cuando un administrador la verifique", COLOR_GREEN, 5000);
      // TODO
    }catch(err){
      console.error(`Error del front: ${err}`);
      showNotif("No se pudo crear la publicación, inténtelo de nuevo más tarde.", COLOR_RED, 50000);
    }
}

//VALIDATIONS

/*Notification*/
let notifTime = null;
function showNotif(message, color, duration = 3000) {
    if (!notification) return;

    clearTimeout(notifTime);

    notification.textContent = message;

    notification.classList.remove('notif-hides');
    void notification.offsetWidth;

    if (color == COLOR_RED) {
        notification.classList.remove('notif-good');
        notification.classList.add('notif-bad');
    } else if (color == COLOR_GREEN) {
        notification.classList.remove('notif-bad');
        notification.classList.add('notif-good');
    }

    notification.classList.add('notif-shows');

    notifTime = setTimeout(() => {
        notification.classList.remove('notif-shows');
        notification.classList.add('notif-hides');
    }, duration);
}

/* The goat */
function validateForm() {
    let pass = true;

    let titleLabel = $('titleLabel');
    let priceLabel = $('priceLabel');
    let toiletsNumberDiv = $('toiletsNumberDiv');
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
    if (!intOrNull(toiletsNumber.value)) {
        toiletsNumberDiv.classList.add('invalid');
        pass = false;
    }
    if (!stringOrNull(description.value)) {
        descriptionLabel.classList.add('invalid');
        description.classList.add('invalid');
        pass = false;
    }

    if (!pass) {
        showNotif("¡Llena todos los campos!", COLOR_RED);
        return pass;
    }

    if (!intOrNull(state.photos.length)) {
        pass = false;
        showNotif("¡No has subido ninguna foto!", COLOR_RED);
        return pass;
    }

    if (!stringOrNull(state.address)) {
        pass = false;
        showNotif("¡No has indicado ninguna dirección!", COLOR_RED);
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