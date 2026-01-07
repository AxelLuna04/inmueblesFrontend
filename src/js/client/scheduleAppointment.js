import { initHeader } from "../shared/header.js";
import { showNotif, NOTIF_GREEN, NOTIF_ORANGE, NOTIF_RED } from "../../utils/notifications.js";
import { getCalendar, getAvailableHours, scheduleAppointment } from "../../api/agendaService.js";
import { auth, goHomeByRole } from "../../utils/authManager.js";
import { CLIENTE } from "../../utils/constants.js";

let currentDate = new Date();
let displayDate = new Date();
let currentSelection = { dateStr: null, timeStr: null }; 
let propertyId = null; 
let sellerId = null;

let monthDataMap = new Map();
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.querySelector(".current-month-label");
const btnPrev = document.getElementById("prevMonth");
const btnNext = document.getElementById("nextMonth");
const statusLabel = document.getElementById("selectionStatus");
const btnConfirm = document.getElementById("btnConfirm");
const notification = document.getElementById("notification");

document.addEventListener("DOMContentLoaded", async () => {
    initHeader({ title: "Agendar Cita" });
    if (auth.role() !== CLIENTE) return goHomeByRole(auth.role());
    
    resetSelectionUI();

    const params = new URLSearchParams(window.location.search);
    propertyId = params.get("idListing");
    sellerId = params.get("idLister");

    if (!propertyId) {
        showNotif(notification, "Error: Enlace incorrecto (Falta ID).", NOTIF_RED);
        disableInteraction();
    } else {
        await loadCalendarData();
    }

    btnPrev.addEventListener("click", () => changeMonth(-1));
    btnNext.addEventListener("click", () => changeMonth(1));
    
    btnConfirm.addEventListener("click", handleConfirm);
});

async function loadCalendarData() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth() + 1; 

    try {
        if (!propertyId) return;

        const cleanId = propertyId.split('?')[0]; 

        console.log(`Pidiendo calendario para ID: ${cleanId}, Año: ${year}, Mes: ${month}`);
        
        const response = await getCalendar(cleanId, year, month);
        
        if (!response.dias) {
            console.warn("La respuesta no parece un calendario:", response);
        }

        monthDataMap.clear();
        if (response.dias) {
            response.dias.forEach(dia => {
                monthDataMap.set(dia.fecha, dia);
            });
        }
        
    } catch (error) {
        console.error("Error cargando calendario:", error);
        showNotif(notification, "No se pudo sincronizar la agenda.", NOTIF_ORANGE);
    } finally {
        renderCalendar();
    }
}

function renderCalendar() {
    calendarGrid.innerHTML = "";
    
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    const isCurrentMonth = month === currentDate.getMonth() && year === currentDate.getFullYear();
    btnPrev.disabled = isCurrentMonth;
    btnPrev.style.opacity = isCurrentMonth ? "0.3" : "1";
    btnPrev.style.cursor = isCurrentMonth ? "default" : "pointer";

    const firstDayObj = new Date(year, month, 1);
    let startDayIndex = firstDayObj.getDay(); 
    startDayIndex = (startDayIndex === 0) ? 6 : startDayIndex - 1; 

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startDayIndex; i++) {
        const padding = document.createElement("div");
        padding.classList.add("calendar-day", "day-empty");
        calendarGrid.appendChild(padding);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        cell.textContent = day;

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayInfo = monthDataMap.get(dateKey);
        
        const cellDate = new Date(year, month, day);
        const todayZero = new Date(currentDate); todayZero.setHours(0,0,0,0);
        
        if (cellDate < todayZero) {
            cell.classList.add("day-disabled");
            cell.style.opacity = "0.5";
        }
        else if (dayInfo) {
            if (!dayInfo.habilitado) {
                cell.classList.add("day-disabled");
                cell.title = "No disponible";
            } else if (dayInfo.lleno) {
                cell.classList.add("day-busy"); 
                cell.title = "Día Lleno"; 
            } else {
                cell.classList.add("day-available"); 
                cell.title = "Ver horarios";
                cell.addEventListener("click", () => handleDayClick(cell, dateKey));
            }
        } 
        else {
             cell.classList.add("day-available");
             cell.addEventListener("click", () => handleDayClick(cell, dateKey));
        }

        if (currentSelection.dateStr === dateKey) {
            cell.classList.add("day-selected");
        }

        calendarGrid.appendChild(cell);
    }
}

async function changeMonth(step) {
    displayDate.setMonth(displayDate.getMonth() + step);
    if (propertyId) {
        await loadCalendarData();
    } else {
        renderCalendar();
    }
}

async function handleDayClick(cellElement, dateKey) {
    const prev = document.querySelector(".day-selected");
    if (prev) prev.classList.remove("day-selected");
    document.querySelectorAll(".time-popover").forEach(el => el.remove());

    cellElement.classList.add("day-selected");

    const popover = createPopoverSkeleton(cellElement);
    
    try {
        const cleanId = propertyId.split('?')[0];
        const response = await getAvailableHours(cleanId, dateKey);
        
        fillPopoverWithHours(popover, response.horas, dateKey);
    } catch (e) {
        console.error(e);
        popover.querySelector(".popover-body").innerHTML = "<p style='padding:5px; color:#d9534f; font-size:0.8rem'>Error cargando horas</p>";
    }
}

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
        const cleanId = propertyId.split('?')[0];
        await scheduleAppointment(cleanId, currentSelection.dateStr, currentSelection.timeStr);
        
        showNotif(notification, "¡Cita registrada con éxito! Redirigiendo...", NOTIF_GREEN);
        
        setTimeout(() => {
            window.location.href = "/"; 
        }, 3000); 

    } catch (error) {
        showNotif(notification, error.message, NOTIF_RED);
        btnConfirm.textContent = "Confirmar";
        btnConfirm.disabled = false;
    }
}

function resetSelectionUI() {
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = "0.5";
    btnConfirm.style.cursor = "not-allowed";
    statusLabel.textContent = "Seleccione un horario";
    currentSelection = { dateStr: null, timeStr: null };
}

function disableInteraction() {
    resetSelectionUI();
}

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
        if (currentSelection.dateStr === dateKey && currentSelection.timeStr === timeStr) {
            btn.classList.add("selected");
        }

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
    
    btnConfirm.disabled = false;
    btnConfirm.style.opacity = "1";
    btnConfirm.style.cursor = "pointer";
    
    updateBottomBar();

    const popover = btn.closest(".time-popover");
    if (popover) {
        popover.remove();
    }
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