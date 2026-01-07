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
export async function fetchOcupaciones() {
  const token = localStorage.getItem("accessToken");
  
  const headers = {
      "Accept": "application/json",
  };
  
  if (token) {
      headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/ocupaciones`, {
    method: "GET",
    headers: headers,
  });

  if (!res.ok) {
    throw new ErrorApi("Error al cargar catálogo de ocupaciones.");
  }

  // Retorna: [{ id: 1, nombre: "..." }, ...]
  return await res.json();
}