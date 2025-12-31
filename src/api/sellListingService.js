import { ErrorApi } from '../errors/errorApi.js';
import { stringOrNull } from '../utils/helpers.js';

const API_BASE = import.meta.env.VITE_API_BASE+"/v1" || "/api";
const URL_SELL = (id) => `${API_BASE}/publicaciones/${id}`;

export async function getParties(id) {
    const res = await fetch(`${URL_SELL(id)}/interesados`, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
    });

    if (!res.ok){
        const resJson = await res.json();
        const message = stringOrNull(resJson.error);
        if (res.status === 500) {
            console.error(`Error del servidor - (${res.status}): ${message}`)
            throw new ErrorApi("Error interno del servidor. Inténtelo de nuevo más tarde.")
        } else {
            throw new ErrorApi(message);
        }
    }

    return await res.json()
}