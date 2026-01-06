// src/utils/routeGuard.js
import { auth, refreshIfNeeded } from "./authManager.js";

export async function requireAuth(rolesPermitidos = []) {
    const rol = auth.role();

    if (!rol) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    // Intentar refresh del token si está vencido
    await refreshIfNeeded();

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rol)) {
        window.location.href = "/pages/error/notFound.html";
        return;
    }
}