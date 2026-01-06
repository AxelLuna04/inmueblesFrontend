import { ErrorApi } from '../errors/errorApi.js';
import { auth } from '../utils/authManager.js';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const DATOS_URL = `${API_BASE}/v1/publicaciones`

export async function getListerData(id) {
    const res = await fetch(`${DATOS_URL}/${id}/contacto`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + auth.token(),
        }
    });

    if (!res.ok) {
        const resJson = await res.json();
        const message = stringOrNull(resJson.error);
        if (res.status === 500) {
            console.error(`Error del servidor - (${res.status}): ${message}`)
            throw new ErrorApi("Error interno del servidor. Inténtelo de nuevo más tarde.")
        } else if (res.status === 403) {
            return 403;
        }
    }

    return await res.json();
}