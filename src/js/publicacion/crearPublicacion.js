const URL_BASE = "/api/v1";
const URL_TIPOS = `${URL_BASE}/tipos-inmueble`;
const URL_CARACTERISTICAS = (idTipo) => `${URL_TIPOS}/${idTipo}/caracteristicas`;
const URL_CREAR_PUBLICACION = `${URL_BASE}/publicaciones`;

//HELPERS
const $ = (id) => document.getElementById(id);

function intOrNull(v){
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

function floatOrNull(v){
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

//ESTADO
const state = {
    tipos: [],
    caracteristicas: [],
    selectedCaracs: new Set(),
    fotos: [],
    fotoUrls: [],
    indicePortada: 0,
    direccion: null
};

//ELEMENTOS
const form = $("crearPubliForm");
const tipoOperacionSelect = $("tipoOperacionSelect")
const tipoInmuebleSelect = $("tipoInmuebleSelect");
const caracsContainer = $("caracteristicasContainer");

const fotosInput = $("fotosInput");
const fotosGrid = $("fotosGrid");
const fotoMeta = $("fotosMeta");

const buscarBtn = $('btnBuscar');
const direccionInput = $('direccionInput');

document.addEventListener("DOMContentLoaded", inicializar);

async function inicializar(){
    cargarEventos();

    await cargarTipos();
    const idTipo = intOrNull(tipoInmuebleSelect.value);
    if (idTipo) await cargarCaracteristicas(idTipo);
    renderCaracteristicas();

    renderFotos();
}

function cargarEventos(){
    tipoInmuebleSelect.addEventListener("change", async () => {
      const idTipo = intOrNull(tipoInmuebleSelect.value);
      if (!idTipo) return;
      await cargarCaracteristicas(idTipo);
      // conserva solo las seleccionadas que sigan existiendo en el nuevo tipo
      const idsDisponibles = new Set(state.caracteristicas.map(c => c.id));
      state.selectedCaracs = new Set([...state.selectedCaracs].filter(id => idsDisponibles.has(id)));
      renderCaracteristicas();
    });
  
    fotosInput.addEventListener("change", (e) => {
      const nuevas = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
  
      const MAX_FOTOS = 12;
      state.fotos = state.fotos.concat(nuevas).slice(0, MAX_FOTOS);
  
      // si te quedaste sin fotos antes y agregaste, portada vuelve a 0
      if (state.fotos.length === 0) state.indicePortada = 0;
      if (state.indicePortada >= state.fotos.length) state.indicePortada = 0;
  
      renderFotos();
      fotosInput.value = ""; // permite volver a seleccionar la misma foto
    });
  
    form.addEventListener("submit", onSubmitCrearPublicacion);
}

async function cargarTipos(){
    const res = await fetch(URL_TIPOS);
    if (!res.ok) throw new Error("No se pudieron cargar los tipos de inmueble.");
    state.tipos = await res.json();
  
    tipoInmuebleSelect.innerHTML = state.tipos.map(t =>
      `<option value="${t.id}">${escapeHtml(t.tipo ?? String(t.id))}</option>`
    ).join("");
}

async function cargarCaracteristicas(idTipo){
    const res = await fetch(URL_CARACTERISTICAS(idTipo));
    if (!res.ok) throw new Error("No se pudieron cargar las características.");

    state.caracteristicas = await res.json();
}

function renderCaracteristicas(){
    caracsContainer.innerHTML = "";
  
    if (!state.caracteristicas || state.caracteristicas.length === 0){
      caracsContainer.innerHTML = `<p class="texto-carac-error">No se encontraron características</p>`;
      return;
    }
  
    for (const c of state.caracteristicas){
      const id = c.id;
      const nombre = c.caracteristica ?? `Característica ${id}`;
      const checked = state.selectedCaracs.has(id) ? "checked" : "";
  
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
        if (checkbox.checked) state.selectedCaracs.add(caracId);
        else state.selectedCaracs.delete(caracId);
      });
  
      caracsContainer.appendChild(item);
    }
}

function renderFotos(){
    state.fotoUrls.forEach(URL.revokeObjectURL);
    state.fotoUrls = [];
    photosGrid.innerHTML = "";
  
    if (!state.fotos || state.fotos.length === 0){
        photosMeta.textContent = "Ninguna foto seleccionada";
        return;
    }
  
    if (state.fotos.length == 1) 
        photosMeta.textContent = `${state.fotos.length} foto seleccionada`;
    else
        photosMeta.textContent = `${state.fotos.length} fotos seleccionadas`;
    
    state.fotos.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        state.fotoUrls.push(url);
    
        const card = document.createElement("div");
        card.className = "photo-thumb";
    
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
    
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "photo-remove";
        remove.textContent = "×";
        remove.title = "Quitar foto";
        remove.addEventListener("click", () => {
            state.fotos.splice(idx, 1);
    
            // ajusta indicePortada si quitaste algo antes o la portada misma
            if (state.fotos.length === 0)
                state.indicePortada = 0;
            else if (state.indicePortada === idx)
                state.indicePortada = 0;
            else if (idx < state.indicePortada)
                state.indicePortada -= 1;
    
            renderFotos();
            URL.revokeObjectURL(url);
        });
    
        // selector de portada (radio)
        const portadaWrap = document.createElement("label");
        portadaWrap.style.position = "absolute";
        portadaWrap.style.left = ".35rem";
        portadaWrap.style.bottom = ".35rem";
        portadaWrap.style.background = "rgba(0,0,0,.55)";
        portadaWrap.style.color = "#fff";
        portadaWrap.style.padding = ".25rem .5rem";
        portadaWrap.style.borderRadius = ".5rem";
        portadaWrap.style.fontSize = ".85rem";
        portadaWrap.style.cursor = "pointer";
        portadaWrap.style.display = "flex";
        portadaWrap.style.alignItems = "center";
        portadaWrap.style.gap = ".35rem";
    
        portadaWrap.innerHTML = `
            <input type="radio" name="portada" ${state.indicePortada === idx ? "checked" : ""} />
            <span>Portada</span>
        `;
    
        portadaWrap.querySelector("input").addEventListener("change", () => {
            state.indicePortada = idx;
        });
    
        card.appendChild(img);
        card.appendChild(remove);
        card.appendChild(portadaWrap);
        photosGrid.appendChild(card);
    });
}

//MAPA
// 1)Inicializarlo
const mapa = L.map('map', { zoomControl: true }).setView([19.541796353862402, -96.92721517586615], 12); // La Facu, claro que sí
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

let marker = null;

setTimeout(() => map.invalidateSize(), 0);

// 2) Buscar en Nominatim (geocoding)
async function geocode(text) {
    if (!text) return;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', text);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'es');
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Error al consultar Nominatim');
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
    if (!res.ok) throw new Error("Error al consultar Nominatim (reverse)");
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
        const text = direccionInput.value.trim();
        if (!text) return;

        const result = await geocode(text);
        if (!result) return alert('Sin resultados');
    
        // 3) Poner marcador en el mapa
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setMarker(lat, long, result.display_name);

        const dto = mapAddress(result);
        state.direccion = dto;
    } catch (e) {
        console.error(e);
        alert(e.message || 'Error buscando dirección');
    }
} 
    
buscarBtn.addEventListener('click', doSearch);

direccionInput.addEventListener('keydown', (ev) => {
    if (ev.key === "Enter") {
        ev.preventDefault();
        doSearch();
    }
});

map.on("click", async (ev) => {
    try {
      const { lat, lng } = ev.latlng;
      setMarker(lat, lng, "Buscando dirección...");

      const result = await reverseGeocode(lat, lng);
      if (!result) return;

      direccionInput.value = result.display_name || direccionInput.value;
      setMarker(lat, lng, result.display_name || null);

      const dto = mapAddress({
        ...result,
        lat: String(lat),
        lon: String(lng)
      });

      state.direccion = dto;
    } catch (e) {
      console.error(e);
      alert(e.message || "Error obteniendo dirección del punto");
    }
});

//LO IMPORTANTE
async function onSubmitCrearPublicacion(e){
    e.preventDefault();
  
    // arma el objeto CrearPublicacionRequest
    const datos = {
        titulo: $("titulo").value.trim(),
        tipoOperacion: $("tipoOperacionSelect").value.trim(), // "RENTA" o "VENTA"
        descripcion: $("descripcion").value.trim(),
        precio: floatOrNull($("precio").value),
    
        numeroHabitaciones: intOrNull($("numeroHabitaciones")?.value),
        numeroBanosCompletos: intOrNull($("numeroBanosCompletos")?.value),
        numeroExcusados: intOrNull($("numeroExcusados")?.value),
    
        idTipoInmueble: intOrNull(tipoInmuebleSelect.value),
        direccion: state.direccion,
        caracteristicasIds: Array.from(state.selectedCaracs),
        indicePortada: state.indicePortada
    };
  
    //Validaciones
    if (!datos.titulo) return alert("Falta el título.");
    if (!datos.tipoOperacion) return alert("Falta tipo de operación.");
    if (!datos.descripcion) return alert("Falta descripción.");
    if (datos.precio === null) return alert("Falta precio válido.");
    if (!datos.idTipoInmueble) return alert("Falta tipo de inmueble.");
    if (!datos.direccion) return alert("Falta la dirección (selecciónala en el mapa).");
    if (!state.fotos || state.fotos.length === 0) return alert("Debes subir al menos 1 foto.");
  
    const fd = new FormData();
    fd.append("datos", new Blob([JSON.stringify(datos)], { type: "application/json" }));
    state.fotos.forEach(f => fd.append("fotos", f));
  
    try{
      const res = await fetch(URL_CREAR_PUBLICACION, {
        method: "POST",
        body: fd
      });
  
      if (!res.ok){
        const text = await res.text().catch(() => "");
        throw new Error(`Error al crear publicación (${res.status}). ${text}`);
      }
  
      const creado = await res.json();
      alert("Publicación creada correctamente.");
      // TODO
    }catch(err){
      console.error(err);
      alert(err.message || "Error al crear publicación.");
    }
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