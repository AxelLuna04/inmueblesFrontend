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