// src/api/adminService.js
import { ErrorApi } from '../errors/errorApi.js';
import { stringOrNull } from '../utils/helpers.js';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ADMIN_LISTINGS_URL = `${API_BASE}/v1/admin/publicaciones`;






// Mapea PendingAdminListingCard al formato que consume el front
export function mapPALCardToFront(card) {
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