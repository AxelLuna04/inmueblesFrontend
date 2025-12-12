
import { enablePasswordToggle } from "../utils/togglePassword.js";

document.addEventListener('DOMContentLoaded', () => {
    enablePasswordToggle("#togglePassword", "#contrasenia");

    const selTelefono = document.getElementById('telefono');
    if(selTelefono) {
        selTelefono.addEventListener('keydown', (e) => {
            // 1. Lista de teclas de control permitidas (navegación, borrado)
            const allowedKeys = [
                'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
                'Tab', 'Enter', 'Home', 'End'
            ];

            // 2. Detectar si es un atajo de teclado (Ctrl+A, Ctrl+C, Ctrl+V, etc.)
            // e.metaKey es para macOS (Command key)
            const isShortcut = (e.ctrlKey || e.metaKey) && 
                               ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());

            // 3. Detectar si es un número (0-9)
            // Esto cubre tanto los números de arriba como el teclado numérico (Numpad)
            const isNumber = /^[0-9]$/.test(e.key);

            // CONDICIÓN:
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

    // Función auxiliar: Convertir hora texto a minutos (ej: "8:00 AM" -> 480)
    function timeToMinutes(timeStr) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

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

    // 1. Llenar Hora Inicio
    baseHoras.forEach(h => {
        // No permitimos la última hora como inicio (porque no habría hora fin)
        if(h !== baseHoras[baseHoras.length -1]) {
            const opt = new Option(h, h);
            selInicio.add(opt);
        }
    });

    // 2. Evento: Cuando cambia Hora Inicio
    selInicio.addEventListener('change', () => {
        const inicioVal = selInicio.value;
        const inicioMins = timeToMinutes(inicioVal);
        
        // Limpiar y repoblar Hora Fin
        selFin.innerHTML = '<option value="" disabled selected>Hora Máxima</option>';
        
        baseHoras.forEach(h => {
            if (timeToMinutes(h) > inicioMins) {
                selFin.add(new Option(h, h));
            }
        });
        
        // Resetear duración al cambiar horas
        checkDuracion();
    });

    // 3. Evento: Cuando cambia Hora Fin
    selFin.addEventListener('change', checkDuracion);

    // Función para validar duraciones permitidas
    function checkDuracion() {
        const inicio = selInicio.value;
        const fin = selFin.value;
        
        // Habilitar todas las opciones primero
        Array.from(selDuracion.options).forEach(opt => opt.disabled = false);

        if (inicio && fin) {
            const diffMins = timeToMinutes(fin) - timeToMinutes(inicio);
            
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
    const passInput = document.getElementById('contrasenia');
    const rules = {
        length: { regex: /.{8,}/, el: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, el: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, el: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, el: document.getElementById('rule-number') }
    };

    passInput.addEventListener('input', () => {
        const val = passInput.value;
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

    fotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        fileError.textContent = "";
        
        if (file) {
            if (file.size > 1024 * 1024) { 
                fileError.textContent = "La imagen excede 1MB";
                fotoInput.value = ""; 
                return;
            }
            if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
                fileError.textContent = "Solo se permiten archivos JPG/JPEG";
                fotoInput.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
            };
            reader.readAsDataURL(file);
        }
    });


    const pass1 = document.getElementById('contrasenia');
    const pass2 = document.getElementById('confirmarContrasenia');
    const matchIcon = document.getElementById('matchIcon');

    function checkMatch() {
        const val1 = pass1.value;
        const val2 = pass2.value;

        if (val2 === "") {
            pass2.className = "form-input"; // Reset
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
});