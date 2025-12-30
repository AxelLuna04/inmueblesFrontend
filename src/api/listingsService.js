// src/api/listingsService.js
import { ErrorApi } from '../errors/errorApi.js';
import { stringOrNull } from '../utils/helpers.js';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const LISTINGS_URL = `${API_BASE}/v1/publicaciones`;
// TO DO Más adelante: mis publicaciones y admin
const MY_LISTINGS_URL    = `${API_BASE}/v1/mis-publicaciones`;
const ADMIN_LISTINGS_URL = `${API_BASE}/v1/admin/publicaciones`;

// --------------------------------------
// Datos de prueba (simulan PublicacionCard)
// --------------------------------------
const SAMPLE_PUBLIC_LISTINGS = [
  {
    id: 1,
    titulo: "Casa con alberca en Veracruz",
    precio: 3055500,
    direccionCorta: "Calle Sureste Coto 1, Colonia Plutarco Elías Calles, Veracruz",
    habitaciones: 3,
    banos: 2,
    excusados: 2,
    portada: "https://images.unsplash.com/photo-1625602812206-5ec545ca1231?auto=format&fit=crop&w=800&q=80",
    tipoInmueble: "Casa",
    tipoOperacion: "VENTA"
  },
  {
    id: 2,
    titulo: "Departamento en Reforma",
    precio: 5200000,
    direccionCorta: "Av. Reforma 220, Centro Histórico, CDMX",
    habitaciones: 2,
    banos: 2,
    excusados: 2,
    portada: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    tipoInmueble: "Departamento",
    tipoOperacion: "VENTA"
  },
  {
    id: 3,
    titulo: "Departamento en Jardines del Bosque",
    precio: 1850000,
    direccionCorta: "Circuito Interior 55, Jardines del Bosque, Guadalajara, Jalisco",
    habitaciones: 2,
    banos: 1,
    excusados: 1,
    portada: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
    tipoInmueble: "Departamento",
    tipoOperacion: "RENTA"
  },
  {
    id: 4,
    titulo: "Residencia en Cumbres",
    precio: 4100000,
    direccionCorta: "Privada de los Encinos, Residencial Cumbres, Monterrey, Nuevo León",
    habitaciones: 4,
    banos: 3,
    excusados: 3,
    portada: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?auto=format&fit=crop&w=800&q=80",
    tipoInmueble: "Casa",
    tipoOperacion: "VENTA"
  }
];

function buildSamplePage(content = SAMPLE_PUBLIC_LISTINGS) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: content.length,
    last: true,
    first: true
  };
}

// --------------------------------------
// API pública
// --------------------------------------

// Public feed (index)
export async function fetchPublicListings({ page = 0, size = 12, q = "" } = {}) {
  const params = new URLSearchParams({ page, size });
  if (q) params.append("q", q);

  try {
    const res = await fetch(`${LISTINGS_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("HTTP error");
    return await res.json(); // Page<PublicacionCard>
  } catch (err) {
    console.warn("Fallo la API, usando datos de prueba locales...", err);
    // En una app real podrías condicionar esto por entorno
    return buildSamplePage();
  }
}

// Mapea PublicacionCard al formato que consume el front
export function mapPublicCardToFront(card) {
  return {
    id: card.id,
    titulo: card.titulo,
    precio: card.precio,
    direccion: card.direccionCorta,
    habitaciones: card.habitaciones,
    banos: card.banos,
    excusados: card.excusados,
    imagen: card.portada,
    tipoInmueble: card.tipoInmueble,
    tipoOperacion: card.tipoOperacion,
    estado: card.estado
  };
}

export async function fetchMyListings({ page = 0, size = 12, q = "" } = {}) {
  const params = new URLSearchParams({ page, size });
  if (q) params.append("q", q);

  try {
    const res = await fetch(`${MY_LISTINGS_URL}?${params.toString()}`,{
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    if (!res.ok) throw new Error("HTTP error");
    return await res.json();
  } catch (err) {
    console.warn("Fallo la API, usando datos de prueba locales...", err);
    // En una app real podrías condicionar esto por entorno
    return buildSamplePage();
  }
}
// export async function fetchAdminListings(...) { ... }


export async function fetchParaTi({ page = 0, size = 12 } = {}) {
  const params = new URLSearchParams({ page, size });
  const res = await fetch(`${PUBLICACIONES_BASE}/para-ti?${params.toString()}`);
  if (!res.ok) throw new Error("Error al obtener recomendaciones");
  return res.json();
}

export async function postListingApi(data) {
  const res = await fetch(LISTINGS_URL, {
      method: "POST",
      headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
      body: data,
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
}

export async function getListingData(id) {
  const res = await fetch(`${LISTINGS_URL}/${id}`, {
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

export async function patchListingApi(id, data) {
  const res = await fetch(`${LISTINGS_URL}/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("accessToken"),
    },
    body: data
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