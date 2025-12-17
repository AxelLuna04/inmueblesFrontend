const API_BASE = import.meta.env.VITE_API_BASE || '/api'; // Vite usa import.meta

export async function loginRequest(correo, contrasenia) {
  const response = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasenia })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Correo o contraseña inválidos.");
    if (response.status === 403) throw new Error("Tu cuenta no está verificada. Revisa tu correo.");
    
    try {
      const body = await response.json();
      throw new Error(body.message || "Error al iniciar sesión.");
    } catch {
      throw new Error("Error al iniciar sesión.");
    }
  }
  return response.json();
}

export async function registerRequest(datos, fotoFile) {
  const formData = new FormData();
  // datos es un objeto que cumple RegistroRequest
  const jsonBlob = new Blob([JSON.stringify(datos)], {
    type: "application/json",
  });
  formData.append("datos", jsonBlob);
  if (fotoFile) {
    formData.append("foto", fotoFile);
  }

  const response = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    try {
      const body = await response.json();
      throw new Error(body.message || "Error al registrarse.");
    } catch {
      throw new Error("Error al registrarse.");
    }
  }

  // RegistroResponse { mensaje, tipoUsuario, id, verificado }
  return response.json();
}

export async function saveAgendaRequest(idVendedor, agendaPayload) {
  const {
    lunes, martes, miercoles, jueves, viernes, sabado, domingo,
    horarioAtencionInicio,
    horarioAtencionFin,
    duracionVisita,
  } = agendaPayload;

  const response = await fetch(`${API_BASE}/v1/auth/${idVendedor}/agenda`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lunes, martes, miercoles, jueves, viernes, sabado, domingo,
      horarioAtencionInicio,
      horarioAtencionFin,
      duracionVisita,
    }),
  });

  if (!response.ok) {
    try {
      const body = await response.json();
      throw new Error(body.message || "Error al registrar la agenda.");
    } catch {
      throw new Error("Error al registrar la agenda.");
    }
  }

  return response.json(); // ConfigurarAgendaResponse (o lo que devuelva)
}


export async function verifyEmailRequest(correo, codigoVerificacion) {
  const response = await fetch(`${API_BASE}/v1/auth/verify`, {

  });
}