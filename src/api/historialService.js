import { ErrorApi } from '../errors/errorApi.js';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const HISTORIAL_URL = `${API_BASE}/v1/publicaciones`

export async function getHistorial(id) {
    const res = await fetch(`${HISTORIAL_URL}/${id}/historial`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        }
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

export function getHistorialTest() {
    const historial = [
        {
            idMovimiento: 5,
            tipoMovimiento: "VENTA",
            fechaInicio: "2026-05-03",
            fechaFin: null,
            nombreCliente: "Enrique Peña Nieto",
            precio: 80000000,
            descripcion: "Inmueble vendido"
        },
        {
            idMovimiento: 4,
            tipoMovimiento: "APROBACION",
            fechaInicio: "2026-02-09",
            fechaFin: null,
            nombreCliente: null,
            precio: null,
            descripcion: "Inmueble aprobado"
        },
        {
            idMovimiento: 3,
            tipoMovimiento: "EDICION",
            fechaInicio: "2026-02-08",
            fechaFin: null,
            nombreCliente: null,
            precio: null,
            descripcion: "Inmueble editado"
        },
        {
            idMovimiento: 2,
            tipoMovimiento: "APROBACION",
            fechaInicio: "2026-01-27",
            fechaFin: null,
            nombreCliente: null,
            precio: null,
            descripcion: "Inmueble aprobado"
        },
        {
            idMovimiento: 1,
            tipoMovimiento: "CREACION",
            fechaInicio: "2026-01-25",
            fechaFin: null,
            nombreCliente: null,
            precio: null,
            descripcion: "Inmueble creado"
        }
    ]

    return historial;
}