import { initHeader } from "../shared/header.js";
import {
  showNotif,
  NOTIF_GREEN,
  NOTIF_RED,
  NOTIF_ORANGE,
} from "../../utils/notifications.js"; // Ajusta ruta
import { getCalendar, getAvailableHours, scheduleAppointment } from "../../api/agendaService.js";
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { CLIENTE } from "../../utils/constants.js";

// --- ESTADO ---
let currentDate = new Date(); // Hoy
let displayDate = new Date(); // Mes visualizado
let currentSelection = { dateStr: null, timeStr: null }; 
let propertyId = null; 
let sellerId = null; // Guardamos también el idLister por si acaso

// Mapa de días (Key: "YYYY-MM-DD", Value: Objeto respuesta backend)
let monthDataMap = new Map();

// Constantes
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Elementos DOM
const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.querySelector(".current-month-label");
const btnPrev = document.getElementById("prevMonth");
const btnNext = document.getElementById("nextMonth");
const statusLabel = document.getElementById("selectionStatus");
const btnConfirm = document.getElementById("btnConfirm");
const notification = document.getElementById("notification");

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
    initHeader({ title: "Agendar Cita" });
    if (auth.role() !== CLIENTE) return goHomeByRole(auth.role());

    // 1. Obtener IDs de la URL (Actualizado según tu botón)
    const params = new URLSearchParams(window.location.search);
    propertyId = params.get("idListing"); // ID Inmueble
    sellerId = params.get("idLister");    // ID Vendedor

    // 2. Validación SIN RETURN (Requerimiento cumplido)
    if (!propertyId) {
        showNotif(notification, "Error: No se identificó el inmueble.", NOTIF_RED);
        // No hacemos return, permitimos que el código siga para pintar el calendario base
        disableInteraction(); // Deshabilitamos botón confirmar
    }

    // 3. Cargar datos (si hay ID)
    if (propertyId) {
        await loadCalendarData();
    } else {
        // Si no hay ID, solo renderizamos la estructura vacía
        renderCalendar();
    }

    // 4. Listeners
    btnPrev.addEventListener("click", () => changeMonth(-1));
    btnNext.addEventListener("click", () => changeMonth(1));
    btnConfirm.addEventListener("click", handleConfirm);
});

// --- FUNCIONES AUXILIARES DE BLOQUEO ---
function disableInteraction() {
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = "0.5";
    btnConfirm.style.cursor = "not-allowed";
    statusLabel.textContent = "No disponible";
}

// --- CARGAR DATOS DEL BACKEND ---
async function loadCalendarData() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth() + 1; 

    try {
        // Solo llamamos si tenemos ID, si no, saltará al catch o no hará nada
        if (!propertyId) throw new Error("Falta ID");

        const response = await getCalendar(propertyId, year, month);
        
        monthDataMap.clear();
        if (response.dias) {
            response.dias.forEach(dia => {
                monthDataMap.set(dia.fecha, dia);
            });
        }
        
    } catch (error) {
        console.error("Error cargando calendario:", error);
        // Mostramos notificación pero NO detenemos la UI
        showNotif(notification, "No se pudo sincronizar la disponibilidad.", NOTIF_ORANGE);
        disableInteraction(); // Opcional: Si falla el servidor, ¿bloqueamos confirmar? Sí, por seguridad.
    } finally {
        // SIEMPRE renderizamos, haya error o no
        renderCalendar();
    }
}

// --- RENDERIZAR CALENDARIO ---
function renderCalendar() {
    calendarGrid.innerHTML = "";
    
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    // Validaciones de navegación
    const isCurrentMonth = month === currentDate.getMonth() && year === currentDate.getFullYear();
    btnPrev.disabled = isCurrentMonth;
    btnPrev.style.opacity = isCurrentMonth ? "0.3" : "1";
    btnPrev.style.cursor = isCurrentMonth ? "default" : "pointer";

    // Cálculos de geometría del calendario
    const firstDayObj = new Date(year, month, 1);
    let startDayIndex = firstDayObj.getDay(); 
    startDayIndex = (startDayIndex === 0) ? 6 : startDayIndex - 1; 

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Relleno inicial
    for (let i = 0; i < startDayIndex; i++) {
        const padding = document.createElement("div");
        padding.classList.add("calendar-day", "day-empty");
        calendarGrid.appendChild(padding);
    }

    // Generar días
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        cell.textContent = day;

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayInfo = monthDataMap.get(dateKey);

        // Lógica de Estado
        const cellDate = new Date(year, month, day);
        const todayZero = new Date(currentDate); todayZero.setHours(0,0,0,0);
        
        // 1. Días pasados
        if (cellDate < todayZero) {
            cell.classList.add("day-disabled");
            cell.style.opacity = "0.5";
        } 
        // 2. Si no hay ID de propiedad (Error crítico), todo se ve gris o inactivo
        else if (!propertyId) {
            cell.classList.add("day-disabled");
        }
        // 3. Datos del Backend
        else if (dayInfo) {
            if (!dayInfo.habilitado) {
                cell.classList.add("day-disabled"); 
            } else if (dayInfo.lleno) {
                cell.classList.add("day-busy");
                cell.title = "Día Lleno";
            } else {
                cell.classList.add("day-available");
                cell.title = "Click para ver horarios disponibles";
                cell.addEventListener("click", () => handleDayClick(cell, dateKey));
            }
        } 
        // 4. Fallback visual (si el servidor falló pero queremos ver el calendario bonito)
        else {
             // Si hubo error de servidor (map vacío) pero hay ID,
             // decidimos si dejarlo clickeable o no. 
             // Por seguridad, si el map está vacío (error), mejor no dejar agendar a ciegas.
             if (monthDataMap.size === 0) {
                 cell.classList.add("day-disabled"); // O "day-available" si prefieres arriesgarte
             } else {
                 // Si el mapa tiene datos y este día no vino, asumimos disponible
                 cell.classList.add("day-available");
                 cell.addEventListener("click", () => handleDayClick(cell, dateKey));
             }
        }

        if (currentSelection.dateStr === dateKey) {
            cell.classList.add("day-selected");
        }

        calendarGrid.appendChild(cell);
    }
}

async function changeMonth(step) {
    displayDate.setMonth(displayDate.getMonth() + step);
    // Si no hay ID, solo redibujamos el grid vacío del nuevo mes sin llamar al backend
    if (propertyId) {
        await loadCalendarData();
    } else {
        renderCalendar();
    }
}

// --- INTERACCIÓN ---
async function handleDayClick(cellElement, dateKey) {
    if (!propertyId) return; // Doble check de seguridad

    const prev = document.querySelector(".day-selected");
    if (prev) prev.classList.remove("day-selected");
    document.querySelectorAll(".time-popover").forEach(el => el.remove());

    cellElement.classList.add("day-selected");
    const popover = createPopoverSkeleton(cellElement);
    
    try {
        const response = await getAvailableHours(propertyId, dateKey);
        fillPopoverWithHours(popover, response.horas, dateKey);
    } catch (e) {
        popover.querySelector(".popover-body").innerHTML = "<p style='padding:5px; color:#d9534f; font-size:0.8rem'>Error al cargar horarios</p>";
    }
}

// ... (Las funciones createPopoverSkeleton, fillPopoverWithHours, selectTime, 
//      updateBottomBar y formatTimePretty se quedan IGUAL que antes) ...

function createPopoverSkeleton(parentCell) {
    const popover = document.createElement("div");
    popover.classList.add("time-popover");
    popover.innerHTML = `
        <div class="popover-header">Horarios</div>
        <div class="popover-body">
            <div style="padding:10px; text-align:center; color:#666;">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
            </div>
        </div>
    `;
    parentCell.appendChild(popover);
    return popover;
}

function fillPopoverWithHours(popover, hoursList, dateKey) {
    const body = popover.querySelector(".popover-body");
    body.innerHTML = "";

    if (!hoursList || hoursList.length === 0) {
        body.innerHTML = "<div style='padding:10px; font-size:0.8rem;'>No hay horarios disponibles.</div>";
        return;
    }

    hoursList.forEach(timeStr => {
        const btn = document.createElement("button");
        btn.classList.add("time-slot");
        btn.textContent = formatTimePretty(timeStr);
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            selectTime(btn, timeStr, dateKey);
        });
        body.appendChild(btn);
    });
}

function selectTime(btn, rawTime, dateKey) {
    document.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected"));
    btn.classList.add("selected");
    currentSelection.dateStr = dateKey;
    currentSelection.timeStr = rawTime;
    
    // Habilitar botón si todo está bien
    btnConfirm.disabled = false;
    btnConfirm.style.opacity = "1";
    btnConfirm.style.cursor = "pointer";
    
    updateBottomBar();
}

function updateBottomBar() {
    if (currentSelection.dateStr && currentSelection.timeStr) {
        const [y, m, d] = currentSelection.dateStr.split("-");
        const dateObj = new Date(y, m-1, d);
        const monthName = MONTH_NAMES[dateObj.getMonth()];
        const prettyTime = formatTimePretty(currentSelection.timeStr);
        statusLabel.textContent = `${d} de ${monthName} - ${prettyTime}`;
    } else {
        statusLabel.textContent = "Seleccione un horario";
    }
}

function formatTimePretty(timeStr) {
    if (!timeStr) return "";
    const [hour, min] = timeStr.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${min} ${ampm}`;
}

// --- CONFIRMAR ---
async function handleConfirm() {
    if (!propertyId) {
        showNotif(notification, "Error: Inmueble no identificado.", NOTIF_RED);
        return;
    }
    if (!currentSelection.dateStr || !currentSelection.timeStr) {
        showNotif(notification, "Selecciona fecha y hora.", NOTIF_ORANGE);
        return;
    }

    btnConfirm.textContent = "Procesando...";
    btnConfirm.disabled = true;

    try {
        await scheduleAppointment(propertyId, currentSelection.dateStr, currentSelection.timeStr);
        // 1. Notificación de éxito
        showNotif(notification, "¡Cita registrada con éxito! Redirigiendo...", NOTIF_GREEN);
        
        // 2. Esperar y Redirigir
        setTimeout(() => {
            // Opción A: Ir a la raíz (Index)
            window.location.href = "/"; 
            
            // Opción B: Si prefieres ir a /index.html explícitamente:
            // window.location.href = "/index.html";
        }, 3000); // 3 segundos para que alcancen a leer el mensaje

    } catch (error) {
        showNotif(notification, error.message, NOTIF_RED);
        btnConfirm.textContent = "Confirmar";
        btnConfirm.disabled = false;
    }
}