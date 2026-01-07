// src/js/admin/moderationDetail.js
import { initHeader } from "../shared/header.js";
import { showNotif, NOTIF_RED, NOTIF_GREEN, NOTIF_ORANGE } from "../../utils/notifications.js";
import { 
    fetchModerationDetail, 
    approveModeration, 
    rejectModeration 
} from "../../api/adminService.js";
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { ADMIN } from "../../utils/constants.js";

const notification = document.getElementById("notification");
const pageTitle = document.getElementById('pageTitle');
const priceLabel = document.getElementById('price');
const photoBigDiv = document.getElementById('photoBigDiv');
const photosSmallDiv = document.getElementById('photosSmallDiv');
const addressLabel = document.getElementById('addressLabel');
const descriptionLabel = document.getElementById('descriptionLabel');
const generalCharacsDiv = document.getElementById('generalCharacsDiv');
const specificCharacsDiv = document.getElementById('specificCharacsDiv');
const mapContainer = document.getElementById('map');
const statusChipContainer = document.getElementById('statusChipContainer');

const fabBtn = document.getElementById('adminFabBtn');
const popupMenu = document.getElementById('adminPopupMenu');
const extraDataList = document.getElementById('adminExtraDataList');
const btnApprove = document.getElementById('btnApprove');
const btnReject = document.getElementById('btnReject');
const btnCancel = document.getElementById('btnCancel');

const actionBar = document.querySelector('.bottom-action-bar');
const mainContent = document.querySelector('.post-publication-main');

let currentId = null;
let map = null;

document.addEventListener("DOMContentLoaded", () => {
    initHeader({ title: "Verificación de Inmueble" });
    
    if (auth.role() !== ADMIN) return goHomeByRole(auth.role());

    const params = new URLSearchParams(window.location.search);
    currentId = params.get("id");

    if (!currentId) {
        showNotif(notification, "ID no válido", NOTIF_RED, 4000);
        return;
    }

    setupInteractions();

    loadData();
});

async function loadData() {
    try {
        const data = await fetchModerationDetail(currentId);
        
        renderMainView(data);
        
        renderMap(data);

        renderExtraInfo(data);

    } catch (err) {
        console.error(err);
        showNotif(notification, "Error al cargar detalle: " + err.message, NOTIF_RED, 5000);
    }
}

function renderMainView(p) {
    pageTitle.textContent = p.titulo || "Sin título";
    if (p.precio) {
        priceLabel.textContent = "$ " + p.precio.toLocaleString("es-MX") + " MXN";
    }

    statusChipContainer.innerHTML = '';
    if (p.estado) {
        const chip = document.createElement('span');
        
        let cssClass = 'status-pending';
        if (p.estado === 'APROBADA') cssClass = 'status-approved';
        if (p.estado === 'RECHAZADA' || p.estado === 'VENDIDA') cssClass = 'status-rejected';

        chip.className = `status-chip ${cssClass}`;
        chip.textContent = p.estado;
        
        statusChipContainer.appendChild(chip);
    }

    if (p.estado !== 'PENDIENTE') {
        actionBar.classList.add('bar-hidden');
        mainContent.style.paddingBottom = "2rem"; 
    } else {
        actionBar.classList.remove('bar-hidden');
        mainContent.style.paddingBottom = "100px";
    }

    addressLabel.textContent = p.direccion || "Dirección no disponible";
    descriptionLabel.textContent = p.descripcion || "Sin descripción.";
    
    const fotos = p.fotos || [];
    const mainPhotoUrl = fotos.length > 0 ? fotos[0] : '/src/assets/images/placeholder.jpg';
    photoBigDiv.innerHTML = `<img src="${mainPhotoUrl}" class="photo-big" style="width:100%; height:400px; object-fit:cover; border-radius:8px;" onerror="this.src='/src/assets/images/placeholder.jpg'">`;
    
    photosSmallDiv.innerHTML = "";
    fotos.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'photo-small';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            photoBigDiv.innerHTML = `<img src="${src}" class="photo-big" style="width:100%; height:400px; object-fit:cover; border-radius:8px;">`;
        });
        photosSmallDiv.appendChild(img);
    });

    generalCharacsDiv.innerHTML = `
        <label class="text-charac-general"><i class="fa-solid fa-bed"></i> Habitaciones: ${p.habitaciones || 0}</label>
        <label class="text-charac-general"><i class="fa-solid fa-bath"></i> Baños: ${p.banos || 0}</label>
        <label class="text-charac-general"><i class="fa-solid fa-toilet"></i> Excusados: ${p.excusados || 0}</label>
        <label class="text-charac-general"><i class="fa-solid fa-building"></i> Tipo: ${p.tipoInmueble || "-"}</label>
    `;

    specificCharacsDiv.innerHTML = "";
    (p.caracteristicas || []).forEach(c => {
        const lbl = document.createElement('label');
        lbl.className = 'text-charac-specific';
        lbl.textContent = c;
        specificCharacsDiv.appendChild(lbl);
    });
}


function setButtonsLoading(isLoading) {
    if (isLoading) {
        btnApprove.classList.add('btn-loading');
        btnReject.classList.add('btn-loading');
        btnCancel.classList.add('btn-loading');
        
        btnApprove.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
        btnReject.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    } else {
        btnApprove.classList.remove('btn-loading');
        btnReject.classList.remove('btn-loading');
        btnCancel.classList.remove('btn-loading');

        btnApprove.innerHTML = '<i class="fa-solid fa-check"></i> Aprobar';
        btnReject.innerHTML = '<i class="fa-solid fa-xmark"></i> Rechazar';
    }
}

function setupInteractions() {
    fabBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        popupMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!popupMenu.contains(e.target) && !fabBtn.contains(e.target)) {
            popupMenu.classList.add('hidden');
        }
    });

    btnCancel.addEventListener('click', () => {
        window.history.back();
    });

    btnApprove.addEventListener('click', async () => {
        if (!confirm("¿Aprobar publicación? Será visible para todos.")) return;

        try {
            setButtonsLoading(true);
            await approveModeration(currentId);
            
            showNotif(notification, "Publicación Aprobada", NOTIF_GREEN, 2000);
            
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            showNotif(notification, err.message, NOTIF_RED, 4000);
            setButtonsLoading(false);
        }
    });

    btnReject.addEventListener('click', async () => {
        const motivo = prompt("Ingrese motivo de rechazo:");
        
        if (!motivo) return;
        
        try {
            setButtonsLoading(true);
            await rejectModeration(currentId, motivo);
            
            showNotif(notification, "Publicación Rechazada", NOTIF_ORANGE, 2000);
            
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            showNotif(notification, err.message, NOTIF_RED, 4000);
            setButtonsLoading(false);
        }
    });
}

function renderMap(p) {
    if (p.lat && p.lng && window.L) {
        setTimeout(() => {
            if (map) map.remove();
            map = L.map('map').setView([p.lat, p.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            L.marker([p.lat, p.lng]).addTo(map)
             .bindPopup(p.direccion || "Ubicación").openPopup();
        }, 100);
    } else {
        mapContainer.innerHTML = "<p style='text-align:center; padding:20px; background:#f0f0f0;'>Sin coordenadas para mapa.</p>";
    }
}

function renderExtraInfo(p) {
    extraDataList.innerHTML = "";

    const items = [
        { label: "Vendedor", value: p.vendedorNombre },
        { label: "Correo", value: p.vendedorCorreo },
        { label: "Fecha Creación", value: p.creadoEn ? new Date(p.creadoEn).toLocaleString() : null },
        { label: "Coordenadas", value: (p.lat && p.lng) ? `${p.lat}, ${p.lng}` : null },
        { label: "Motivo Rechazo Previo", value: p.motivoRechazo, color: "red" } // Si existe
    ];

    items.forEach(item => {
        if (!item.value) return;

        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.label}</strong>
            <span style="${item.color ? 'color:' + item.color : ''}">${item.value}</span>
        `;
        extraDataList.appendChild(li);
    });

    if (extraDataList.children.length === 0) {
        extraDataList.innerHTML = "<li>No hay datos adicionales.</li>";
    }
}