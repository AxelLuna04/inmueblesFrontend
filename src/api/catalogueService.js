const API_BASE = import.meta.env.VITE_API_BASE + "/v1" || '/api/v1';
const URL_TYPES = `${API_BASE}/tipos-inmueble`;
const URL_CHARACTERISTICS = (idType) => `${URL_TYPES}/${idType}/caracteristicas`;

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