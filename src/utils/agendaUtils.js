// src/utils/agendaUtils.js

// Convierte "7:00 AM" -> "07:00", "1:00 PM" -> "13:00"
export function to24Hour(timeLabel) {
  if (!timeLabel) return null;
  const [time, period] = timeLabel.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`; // "07:00"
}

export function timeToMinutesFromLabel(label) {
  const hhmm = to24Hour(label); // "07:00"
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Convierte "HH:mm" (o "HH:mm:ss") de backend a "7:00 AM"
export function localTimeToLabel(localTimeStr) {
  if (!localTimeStr) return null;
  const [hStr, mStr] = localTimeStr.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mm = String(m).padStart(2, "0");
  return `${displayH}:${mm} ${period}`;
}

// Genera las horas base "7:00 AM"..."8:00 PM"
export function buildBaseHoras() {
  const baseHoras = [];
  for (let i = 7; i <= 20; i++) {
    const suffix = i >= 12 ? "PM" : "AM";
    const val = i > 12 ? i - 12 : i;
    baseHoras.push(`${val}:00 ${suffix}`);
  }
  return baseHoras;
}

/**
 * Inicializa los selects de horario en un formulario de agenda
 * - selInicio: <select id="horaInicio">
 * - selFin:    <select id="horaFin">
 * - selDur:    <select id="duracionVisita">
 */
export function initAgendaTimeSelectors(selInicio, selFin, selDur) {
  if (!selInicio || !selFin || !selDur) return;

  const baseHoras = buildBaseHoras();

  // Llenar Hora Inicio (todas menos la última)
  selInicio.innerHTML = '<option value="" disabled selected>Hora Inicio</option>';
  baseHoras.forEach((h, idx) => {
    if (idx < baseHoras.length - 1) {
      selInicio.add(new Option(h, h));
    }
  });

  // Cuando cambia inicio → recalcular fin
  selInicio.addEventListener("change", () => {
    const inicioLabel = selInicio.value;
    const inicioMins = timeToMinutesFromLabel(inicioLabel);

    selFin.innerHTML = '<option value="" disabled selected>Hora Máxima</option>';
    baseHoras.forEach((h) => {
      if (timeToMinutesFromLabel(h) > inicioMins) {
        selFin.add(new Option(h, h));
      }
    });

    checkDuracion(selInicio, selFin, selDur);
  });

  selFin.addEventListener("change", () => {
    checkDuracion(selInicio, selFin, selDur);
  });
}

/**
 * Deshabilita duraciones > rango seleccionado
 */
export function checkDuracion(selInicio, selFin, selDur) {
  if (!selInicio || !selFin || !selDur) return;

  const inicioLabel = selInicio.value;
  const finLabel = selFin.value;

  Array.from(selDur.options).forEach((opt) => (opt.disabled = false));

  if (inicioLabel && finLabel) {
    const diffMins =
      timeToMinutesFromLabel(finLabel) - timeToMinutesFromLabel(inicioLabel);

    Array.from(selDur.options).forEach((opt) => {
      const val = parseInt(opt.value);
      if (val > diffMins) {
        opt.disabled = true;
      }
    });

    if (parseInt(selDur.value) > diffMins) {
      selDur.value = "30";
    }
  }
}

/**
 * Lee la agenda desde el formulario de agenda
 * (mismo formato que ConfigurarAgendaRequest)
 */
export function buildAgendaPayloadFromForm() {
  const horaInicioLabel = document.getElementById("horaInicio")?.value || null;
  const horaFinLabel    = document.getElementById("horaFin")?.value || null;
  const duracion        = document.getElementById("duracionVisita")?.value;

  const horarioAtencionInicio = to24Hour(horaInicioLabel);
  const horarioAtencionFin    = to24Hour(horaFinLabel);
  const duracionVisita        = duracion ? Number(duracion) : null;

  const dayBtns = document.querySelectorAll(".day-btn");
  const selected = new Set();
  dayBtns.forEach((btn) => {
    if (btn.classList.contains("active")) {
      selected.add(btn.dataset.day);
    }
  });

  return {
    lunes:     selected.has("L"),
    martes:    selected.has("M"),
    miercoles: selected.has("X"),
    jueves:    selected.has("J"),
    viernes:   selected.has("V"),
    sabado:    selected.has("S"),
    domingo:   selected.has("D"),
    horarioAtencionInicio,
    horarioAtencionFin,
    duracionVisita,
  };
}

/**
 * Marca los botones de día según booleans
 */
export function applyDaysToButtons(config) {
  const dayBtns = document.querySelectorAll(".day-btn");
  dayBtns.forEach((btn) => {
    const code = btn.dataset.day; // "L","M","X","J","V","S","D"
    let active = false;
    switch (code) {
      case "L": active = !!config.lunes; break;
      case "M": active = !!config.martes; break;
      case "X": active = !!config.miercoles; break;
      case "J": active = !!config.jueves; break;
      case "V": active = !!config.viernes; break;
      case "S": active = !!config.sabado; break;
      case "D": active = !!config.domingo; break;
    }
    btn.classList.toggle("active", active);
  });
}

/**
 * Texto "Lun a Vier", "Todos los días", etc. solo para resumir.
 */
export function buildDiasSummary(config) {
  const dias = [];
  if (config.lunes)     dias.push("Lunes");
  if (config.martes)    dias.push("Martes");
  if (config.miercoles) dias.push("Miércoles");
  if (config.jueves)    dias.push("Jueves");
  if (config.viernes)   dias.push("Viernes");
  if (config.sabado)    dias.push("Sábado");
  if (config.domingo)   dias.push("Domingo");
  if (!dias.length) return "Sin días configurados";
  return dias.join(", ");
}
