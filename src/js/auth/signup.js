import { registerRequest, saveAgendaRequest } from "../../api/authService.js";
import { enablePasswordToggle } from "../../utils/togglePassword.js";
// src/js/auth/signup.js (nombre que tengas)
/*
import {
  to24Hour,
  timeToMinutesFromLabel,
  initAgendaTimeSelectors,
  buildAgendaPayloadFromForm,
} from "../../utils/agendaUtils.js";
*/
import {
  initAgendaTimeSelectors,
  buildAgendaPayloadFromForm,
} from "../../utils/agendaUtils.js";


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

    // 1. GENERAR HORAS (usando utils compartidos)
    const selInicio   = document.getElementById("horaInicio");
    const selFin      = document.getElementById("horaFin");
    const selDuracion = document.getElementById("duracionVisita");

    initAgendaTimeSelectors(selInicio, selFin, selDuracion);


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