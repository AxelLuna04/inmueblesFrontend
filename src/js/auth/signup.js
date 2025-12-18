import { registerRequest, saveAgendaRequest } from "../../api/authService.js";
import { enablePasswordToggle } from "../../utils/togglePassword.js";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB como el backend
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

function validateImage(file) {
  if (!file) return "Debes seleccionar una foto de perfil.";

  if (file.size > MAX_BYTES) {
    return "La imagen excede el tamaño máximo (10MB).";
  }

  if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
    return "Formato de imagen no permitido. Usa JPG, PNG o WEBP.";
  }

  return null; // OK
}

function getFotoFileOrThrow() {
  const inputFile = document.getElementById("fotoPerfil");
  const fileError = document.getElementById("fileError");
  const file = inputFile.files[0];

  const error = validateImage(file);
  if (error) {
    if (fileError) fileError.textContent = error;
    throw new Error(error);
  }

  if (fileError) fileError.textContent = "";
  return file;
}

// Convierte "7:00 AM" -> "07:00", "1:00 PM" -> "13:00"
function to24Hour(timeLabel) {
  if (!timeLabel) return null;
  const [time, period] = timeLabel.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`; // "07:00"
}

function timeToMinutesFromLabel(label) {
  const hhmm = to24Hour(label); // "07:00"
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}


document.addEventListener('DOMContentLoaded', () => {
    enablePasswordToggle("#togglePassword", "#contrasenia");

    const selTelefono = document.getElementById('telefono');
    if(selTelefono) {
        selTelefono.addEventListener('keydown', (e) => {
            const allowedKeys = [
                'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
                'Tab', 'Enter', 'Home', 'End'
            ];
            const isShortcut = (e.ctrlKey || e.metaKey) && 
                               ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());
            const isNumber = /^[0-9]$/.test(e.key);
            // Si NO es número, Y NO es tecla permitida, Y NO es atajo... bloqueamos.
            if (!isNumber && !allowedKeys.includes(e.key) && !isShortcut) {
                e.preventDefault();
            }
        });
        // Limpieza extra por si pegan texto con el mouse (Sanitización)
        selTelefono.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, ''); 
        });
    }


    // 1. GENERAR HORAS
    // --- LÓGICA DE AGENDA MEJORADA ---
    // Generar array de horas base
    const baseHoras = [];
    for(let i=7; i<=20; i++) { 
        const suffix = i >= 12 ? 'PM' : 'AM';
        const val = i > 12 ? i - 12 : i;
        baseHoras.push(`${val}:00 ${suffix}`); // Formato para mostrar
    }

    const selInicio = document.getElementById('horaInicio');
    const selFin = document.getElementById('horaFin');
    const selDuracion = document.getElementById('duracionVisita');

    // 1.1. Llenar Hora Inicio
    baseHoras.forEach(h => {
        // No permitimos la última hora como inicio (porque no habría hora fin)
        if(h !== baseHoras[baseHoras.length -1]) {
            const opt = new Option(h, h);
            selInicio.add(opt);
        }
    });

    // 1.2. Evento: Cuando cambia Hora Inicio
    selInicio.addEventListener('change', () => {
        const inicioVal = selInicio.value;
        const inicioMins = timeToMinutesFromLabel(inicioVal);
        
        // Limpiar y repoblar Hora Fin
        selFin.innerHTML = '<option value="" disabled selected>Hora Máxima</option>';
        
        baseHoras.forEach(h => {
            if (timeToMinutesFromLabel(h) > inicioMins) {
                selFin.add(new Option(h, h));
            }
        });
        
        // Resetear duración al cambiar horas
        checkDuracion();
    });

    // 1.3. Evento: Cuando cambia Hora Fin
    selFin.addEventListener('change', checkDuracion);

    // Función para validar duraciones permitidas
    function checkDuracion() {
        const inicioLabel = selInicio.value;
        const finLabel = selFin.value;
        
        // Habilitar todas las opciones primero
        Array.from(selDuracion.options).forEach(opt => opt.disabled = false);

        if (inicioLabel && finLabel) {
            const diffMins = timeToMinutesFromLabel(finLabel) - timeToMinutesFromLabel(inicioLabel);
            
            // Deshabilitar duraciones mayores al rango seleccionado
            Array.from(selDuracion.options).forEach(opt => {
                if (parseInt(opt.value) > diffMins) {
                    opt.disabled = true;
                }
            });

            // Si la opción seleccionada actualmente es inválida, resetearla
            if (parseInt(selDuracion.value) > diffMins) {
                selDuracion.value = "30"; // Valor seguro por defecto
            }
        }
    }

    // 2. TOGGLE TIPO DE USUARIO
    const tipoUsuario = document.getElementById('tipoUsuario');
    const agendaSection = document.getElementById('agendaSection');

    tipoUsuario.addEventListener('change', (e) => {
        if(e.target.value === 'VENDEDOR') {
            agendaSection.classList.remove('hidden');
            agendaSection.style.opacity = '0';
            setTimeout(() => agendaSection.style.opacity = '1', 50);
        } else {
            agendaSection.classList.add('hidden');
        }
    });

    // 3. BOTONES DE DÍAS
    const dayBtns = document.querySelectorAll('.day-btn');
    dayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });

    // 4. VALIDACIÓN DE CONTRASEÑA
    const pass1 = document.getElementById('contrasenia');
    const rules = {
        length: { regex: /.{8,}/, el: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, el: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, el: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, el: document.getElementById('rule-number') }
    };

    pass1.addEventListener('input', () => {
        const val = pass1.value;
        for (const key in rules) {
            const rule = rules[key];
            if (rule.regex.test(val)) {
                rule.el.classList.add('valid');
                rule.el.classList.remove('invalid');
            } else {
                rule.el.classList.remove('valid');
                rule.el.classList.add('invalid');
            }
        }
    });

    // 5. CARGA DE FOTO
    const fotoInput = document.getElementById('fotoPerfil');
    const preview = document.getElementById('photoPreview');
    const fileError = document.getElementById('fileError');

    fotoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        fileError.textContent = "";

        if (!file) {
            preview.innerHTML = "";
            return;
        }

        const error = validateImage(file);
        if (error) {
            fileError.textContent = error;
            fotoInput.value = "";
            preview.innerHTML = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        };
        reader.readAsDataURL(file);
    });

    const pass2 = document.getElementById('confirmarContrasenia');
    const matchIcon = document.getElementById('matchIcon');

    function checkMatch() {
        const val1 = pass1.value;
        const val2 = pass2.value;

        if (val2 === "") {
            pass2.classList.remove("match-success", "match-error");
            matchIcon.style.display = "none";
            return;
        }

        matchIcon.style.display = "block";
        matchIcon.classList.remove("toggle-password"); // Asegurar que no tenga cursor pointer

        if (val1 === val2) {
            pass2.classList.add("match-success");
            pass2.classList.remove("match-error");
            matchIcon.className = "input-icon fa-solid fa-circle-check";
        } else {
            pass2.classList.add("match-error");
            pass2.classList.remove("match-success");
            matchIcon.className = "input-icon fa-solid fa-circle-xmark";
        }
    }

    // Escuchar eventos en ambos inputs
    pass1.addEventListener('input', checkMatch);
    pass2.addEventListener('input', checkMatch);
    
    const form = document.getElementById("registerForm");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showMainError("");
        setLoading(submitBtn, true);

        try {
        // 1. Validar contraseñas iguales
        if (pass1.value !== pass2.value) {
            showMainError("Las contraseñas no coinciden.");
            setLoading(submitBtn, false);
            return;
        }

        // 2. Construir RegistroRequest
        const registroPayload = buildRegistroPayload();

        // Validaciones mínimas extra
        if (!registroPayload.tipoUsuario) {
            showMainError("Selecciona un tipo de usuario.");
            setLoading(submitBtn, false);
            return;
        }

        // 3. Foto
        const fotoFile = getFotoFileOrThrow();

        // 4. Llamar a /auth/register
        const registroRes = await registerRequest(registroPayload, fotoFile);
        // registroRes: { mensaje, tipoUsuario, id, verificado:false }

        // 5. Si es VENDEDOR, registrar agenda inicial
        if (registroRes.tipoUsuario === "VENDEDOR") {
            const agendaPayload = buildAgendaPayloadFromForm();
            const algunDia =
                agendaPayload.lunes || agendaPayload.martes ||
                agendaPayload.miercoles || agendaPayload.jueves ||
                agendaPayload.viernes || agendaPayload.sabado ||
                agendaPayload.domingo;

            if (!algunDia) {
                showMainError("Selecciona al menos un día de atención.");
                setLoading(submitBtn, false);
                return;
            }

            // Validar que haya al menos un día y horas correctas, etc.
            if (
            !agendaPayload.horarioAtencionInicio ||
            !agendaPayload.horarioAtencionFin ||
            !agendaPayload.duracionVisita
            ) {
            showMainError("Completa los horarios y la duración de las visitas.");
            setLoading(submitBtn, false);
            return;
            }

            await saveAgendaRequest(registroRes.id, agendaPayload);
        }

        alert(
            "Registro exitoso. Revisa tu correo para verificar tu cuenta antes de iniciar sesión."
        );

        // IMPORTANTE TODO

        // Opcional: redirigir al login o a página de "revisa tu correo"
        // window.location.href = "/pages/login.html";

        } catch (err) {
        console.error(err);
        showMainError(err.message || "Ocurrió un error al registrar la cuenta.");
        } finally {
        setLoading(submitBtn, false);
        }
    });
});

// --------- Helpers genéricos ---------
function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

function showMainError(msg) {
  const p = document.getElementById("mainError");
  if (!p) return;
  p.textContent = msg || "";
  p.hidden = !msg;
}

// Construye el RegistroRequest
function buildRegistroPayload() {
  const tipoUsuarioEl = document.getElementById("tipoUsuario");
  const nombreEl = document.getElementById("nombre");
  const apellidosEl = document.getElementById("apellidos");
  const correoEl = document.getElementById("correo");
  const passEl = document.getElementById("contrasenia");
  const fechaNacimientoEl = document.getElementById("fechaNacimiento");
  const telefonoEl = document.getElementById("telefono");

  const tipoUsuario = tipoUsuarioEl.value;
  const nombre = nombreEl.value.trim();
  const apellidos = apellidosEl.value.trim();
  const correo = correoEl.value.trim();
  const contrasenia = passEl.value;
  const fechaNac = fechaNacimientoEl.value || null; // "YYYY-MM-DD"
  const telefono = telefonoEl.value.trim() || null;
  const nombreCompleto = `${nombre} ${apellidos}`.trim();

  return {
    tipoUsuario,
    correo,
    contrasenia,
    nombreCompleto,
    fechaNacimiento: fechaNac,
    telefono,
  };
}

// Lee la agenda desde el formulario
function buildAgendaPayloadFromForm() {
  const horaInicioLabel = document.getElementById("horaInicio").value || null;
  const horaFinLabel = document.getElementById("horaFin").value || null;
  const duracion = document.getElementById("duracionVisita").value;

  const horarioAtencionInicio = to24Hour(horaInicioLabel);
  const horarioAtencionFin = to24Hour(horaFinLabel);
  const duracionVisita = duracion ? Number(duracion) : null;

  // En lugar de usar un hidden, podemos leer directamente los botones activos
  const dayBtns = document.querySelectorAll(".day-btn");
  const selected = new Set();
  dayBtns.forEach((btn) => {
    if (btn.classList.contains("active")) {
      selected.add(btn.dataset.day); // asumiendo data-day="L" etc.
    }
  });

  return {
    lunes: selected.has("L"),
    martes: selected.has("M"),
    miercoles: selected.has("X"),
    jueves: selected.has("J"),
    viernes: selected.has("V"),
    sabado: selected.has("S"),
    domingo: selected.has("D"),
    horarioAtencionInicio,
    horarioAtencionFin,
    duracionVisita,
  };
}