import { ErrorApi } from '../errors/errorApi.js';

const API_BASE = import.meta.env.VITE_API_BASE + "/v1" || '/api/v1';
const URL_PAY = (id) => `${API_BASE}/publicaciones/${id}/pagar-acceso`;

export async function postPayApi(id, data) {
    const res = await fetch(URL_PAY(id), {
        method: "POST",
        headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(data),
    });  

    if (!res.ok) {
        const resJson = await res.json();
        const message = stringOrNull(resJson.error);
        if (res.status === 500) {
          console.error(`Error del servidor - (${res.status}): ${message}`)
          throw new ErrorApi("Error interno del servidor. Inténtelo de nuevo más tarde.")
        } else {
            throw new ErrorApi(message);
        }
    }

    return await res.json();
}