// src/api/catalogueService.js
import { ErrorApi } from '../errors/errorApi.js';

const API_BASE = import.meta.env.VITE_API_BASE + "/v1" || '/api/v1';
const URL_TYPES = `${API_BASE}/tipos-inmueble`;
const URL_CHARACTERISTICS = (idType) => `${URL_TYPES}/${idType}/caracteristicas`;
const URL_PAY_METHODS = `${API_BASE}/tipos-pago`;

export async function getPropertyTypes() {
    const res = await fetch(URL_TYPES);
    if (!res.ok) throw new Error("No se pudieron cargar los tipos de inmueble.");
    return res;
}

export async function getCharacteristics(idType) {
    const res = await fetch(URL_CHARACTERISTICS(idType));
    if (!res.ok) throw new Error("No se pudieron cargar las características.");
    return res;
}

export async function getPayMethods() {
    const res = await fetch(URL_PAY_METHODS, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
        }
    });
    if (!res.ok) throw new ErrorApi("No se pudieron cargar los métodos de pago.");
    return await res.json();
}

/**
 * Devuelve un catálogo de ocupaciones.
 * Cuando tengas la ruta real en backend, ajusta la URL y descomenta el fetch.
 */
export async function fetchOcupaciones() {
  // ======== IMPLEMENTACIÓN REAL (dejar comentada por ahora) ========
  /*
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("No hay sesión activa");


  // AJUSTA LA RUTA REAL AL SERVIDOR

  const res = await fetch(`${API_BASE}/catalogos/ocupaciones`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Error al cargar catálogo de ocupaciones.");
  }

  // Esperando algo tipo: [{ id: 1, nombre: "Empleado" }, ...]
  return res.json();
  */

  // ======== MODO DEV: datos fake para no romper nada ========
  return [
    { id: 1, nombre: "Empleado" },
    { id: 2, nombre: "Independiente" },
    { id: 3, nombre: "Estudiante" },
    { id: 4, nombre: "Jubilado" },
  ];
}