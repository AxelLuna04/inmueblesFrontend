// src/api/adminService.js
import { ErrorApi } from '../errors/errorApi.js';
import { stringOrNull } from '../utils/helpers.js';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ADMIN_LISTINGS_URL = `${API_BASE}/v1/admin/publicaciones`;

//DATOS DE PRUEBA
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

// Variedad de tipos usando los mismos samples como base
const SAMPLE_TEMPLATES = [
  { ...SAMPLE_PUBLIC_LISTINGS[0], tipoInmueble: "Casa" },
  { ...SAMPLE_PUBLIC_LISTINGS[1], tipoInmueble: "Departamento" },
  { ...SAMPLE_PUBLIC_LISTINGS[2], tipoInmueble: "Cuarto" },    // derivado
  { ...SAMPLE_PUBLIC_LISTINGS[3], tipoInmueble: "Oficina" },   // derivado
  { ...SAMPLE_PUBLIC_LISTINGS[0], tipoInmueble: "Terreno" }    // derivado
];

const ESTADOS = ["PENDIENTE", "APROBADA", "RECHAZADA"];

function tipoIdToNombre(tipoId) {
  const n = Number(tipoId);
  if (n === 1) return "Casa";
  if (n === 2) return "Departamento";
  if (n === 3) return "Cuarto";
  if (n === 4) return "Oficina";
  if (n === 5) return "Terreno";
  return null;
}

function buildSampleAdminCards(total = 24) {
  const out = [];
  const baseDate = new Date("2026-01-01T10:00:00");

  for (let i = 0; i < total; i++) {
    const tpl = SAMPLE_TEMPLATES[i % SAMPLE_TEMPLATES.length];
    const estado = ESTADOS[i % ESTADOS.length];
    const creadoEn = new Date(baseDate.getTime() + i * 36e5).toISOString(); // +1h

    out.push({
      id: 1000 + i,
      titulo: tpl.titulo,
      precio: tpl.precio,
      tipoInmueble: tpl.tipoInmueble,
      direccionCorta: tpl.direccionCorta,
      portada: tpl.portada,
      estado,
      creadoEn
    });
  }
  return out;
}

const SAMPLE_ADMIN_CARDS = buildSampleAdminCards(24);

function buildSamplePage({ content, page = 0, size = 12 }) {
  const totalElements = content.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const number = Math.min(page, totalPages - 1);

  const start = number * size;
  const end = start + size;
  const slice = content.slice(start, end);

  return {
    content: slice,
    totalElements,
    totalPages,
    number,
    size,
    first: number === 0,
    last: number >= totalPages - 1
  };
}

function applySampleFilters({ estado, tipo, q }) {
  let filtered = [...SAMPLE_ADMIN_CARDS];

  if (estado) {
    filtered = filtered.filter((x) => String(x.estado).toUpperCase() === String(estado).toUpperCase());
  }

  if (tipo !== undefined && tipo !== null && tipo !== "") {
    const tipoNombre = tipoIdToNombre(tipo);
    if (tipoNombre) filtered = filtered.filter((x) => x.tipoInmueble === tipoNombre);
  }

  if (q) {
    const qq = String(q).trim().toLowerCase();
    filtered = filtered.filter((x) =>
      (x.titulo || "").toLowerCase().includes(qq) ||
      (x.direccionCorta || "").toLowerCase().includes(qq) ||
      (x.tipoInmueble || "").toLowerCase().includes(qq) ||
      (x.estado || "").toLowerCase().includes(qq)
    );
  }

  return filtered;
}

function buildSampleDetalle(id) {
  const card = SAMPLE_ADMIN_CARDS.find((x) => String(x.id) === String(id)) || SAMPLE_ADMIN_CARDS[0];

  return {
    id: card.id,
    estado: card.estado,
    motivoRechazo: card.estado === "RECHAZADA" ? "Fotos insuficientes / descripción incompleta." : null,
    titulo: card.titulo,
    descripcion:
      "Descripción de prueba para moderación. Aquí verás texto más largo cuando el backend esté conectado.",
    precio: card.precio,
    habitaciones: 3,
    banos: 2,
    excusados: 2,
    tipoInmueble: card.tipoInmueble,
    vendedorNombre: "Vendedor Demo",
    vendedorCorreo: "vendedor.demo@correo.com",
    direccion: card.direccionCorta,
    lat: 19.4326,
    lng: -99.1332,
    creadoEn: card.creadoEn,
    fotos: [
      card.portada,
      card.portada,
      card.portada
    ],
    caracteristicas: [
      "Estacionamiento",
      "Cocina integral",
      "Mascotas permitido"
    ]
  };
}



//DIVISION API

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem("accessToken");
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra };
}

async function throwIfNotOk(res) {
  if (res.ok) return;

  const resJson = await safeJson(res);
  const message =
    stringOrNull(resJson?.error || resJson?.message) ||
    `HTTP ${res.status}`;

  throw new ErrorApi(message);
}

export async function fetchAdminListings({ page = 0, size = 12, estado, tipo, q } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (estado) params.append("estado", estado);
  if (tipo !== undefined && tipo !== null && tipo !== "") params.append("tipo", String(tipo));
  if (q) params.append("q", q);

  try {
    const res = await fetch(`${ADMIN_LISTINGS_URL}?${params.toString()}`, {
      headers: authHeaders()
    });
    await throwIfNotOk(res);
    return await res.json(); // Page<ModeracionCard>
  } catch (err) {
    console.warn("Fallo la API admin, usando datos de prueba locales...", err);
    const filtered = applySampleFilters({ estado, tipo, q });
    return buildSamplePage({ content: filtered, page, size });
  }
}

export async function fetchModerationDetail(id) {
  try {
    const res = await fetch(`${ADMIN_LISTINGS_URL}/${id}`, {
      method: "GET",
      headers: authHeaders()
    });
    await throwIfNotOk(res);
    return await res.json(); // ModeracionDetalle
  } catch (err) {
    console.warn("Fallo detalle admin, usando detalle de prueba...", err);
    return buildSampleDetalle(id);
  }
}

export async function approveModeration(id) {
  try {
    const res = await fetch(`${ADMIN_LISTINGS_URL}/${id}/aprobar`, {
      method: "PATCH",
      headers: authHeaders()
    });
    await throwIfNotOk(res);
    return await res.json(); // ModeracionResponse
  } catch (err) {
    console.warn("Fallo aprobar admin, usando respuesta de prueba...", err);
    return { id, estado: "APROBADA", message: "Aprobada (mock)" };
  }
}

export async function rejectModeration(id, motivo) {
  try {
    const res = await fetch(`${ADMIN_LISTINGS_URL}/${id}/rechazar`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ motivo })
    });
    await throwIfNotOk(res);
    return await res.json(); // ModeracionResponse
  } catch (err) {
    console.warn("Fallo rechazar admin, usando respuesta de prueba...", err);
    return { id, estado: "RECHAZADA", motivo, message: "Rechazada (mock)" };
  }
}

// Mapea ModeracionCard al formato que consume el front
export function mapModerationCardToFront(card) {
  return {
    id: card.id,
    titulo: card.titulo,
    precio: card.precio,
    tipoInmueble: card.tipoInmueble,
    direccion: card.direccionCorta,
    imagen: card.portada,
    estado: card.estado,
    fechaCreacion: card.creadoEn
  };
}