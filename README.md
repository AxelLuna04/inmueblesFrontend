# 🏠 Inmuebles a tu Alcance — Frontend

Cliente web de una plataforma de compra, venta y renta de inmuebles. Los vendedores publican sus propiedades, los clientes las buscan, agendan visitas y contactan al vendedor, y un administrador modera las publicaciones.

Este repositorio es el **frontend**. La API está en [InmueblesApi](https://github.com/AxelLuna04/InmueblesApi).

<!-- Agrega aquí capturas de pantalla, por ejemplo:
![Catálogo de inmuebles](docs/catalogo.png)
-->

## ✨ Pantallas

| Rol | Pantallas |
|---|---|
| Todos | Catálogo, detalle del inmueble, perfil, registro, login y verificación de correo |
| Cliente | Agendar visita y pagar el acceso al contacto del vendedor |
| Vendedor | Panel de publicaciones, publicar, editar y marcar un inmueble como vendido |
| Administrador | Panel de moderación, detalle de la publicación a revisar e historial |

## 🧰 Tecnologías

- HTML, CSS y **JavaScript** sin framework (módulos ES)
- **Vite** como servidor de desarrollo, proxy hacia la API y empaquetador
- Autenticación con **JWT** guardado en el navegador y protección de rutas por rol (`src/utils/routeGuard.js`)
- CSS organizado en tokens, componentes y páginas

## 🗂️ Estructura

```
├── index.html          # Catálogo principal
├── pages/              # Páginas por rol: auth, client, lister, admin, shared, error
└── src/
    ├── api/            # Llamadas a la API (un servicio por módulo)
    ├── js/             # Lógica de cada página
    ├── utils/          # Sesión, protección de rutas, notificaciones y utilidades
    ├── errors/         # Manejo de errores de la API
    └── css/            # base/ (tokens, reset, tipografía), components/ y pages/
```

## ⚙️ Cómo correrlo en local

### Prerrequisitos

- Node.js 18 o superior
- La [API](https://github.com/AxelLuna04/InmueblesApi) corriendo en `http://localhost:8080`

### Pasos

```bash
git clone https://github.com/AxelLuna04/inmueblesFrontend.git
cd inmueblesFrontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

## 🔌 Conexión con la API

Vite tiene configurado un **proxy** en `vite.config.js`: las peticiones a `/api` y `/uploads` se redirigen a `http://localhost:8080`. Por eso en el código siempre se usan **rutas relativas**:

```js
// ✅ Bien: el proxy la manda al backend
const respuesta = await fetch('/api/v1/auth/login', { ... });

// ❌ Mal: da errores de CORS y falla en producción
const respuesta = await fetch('http://localhost:8080/api/v1/auth/login', { ... });
```

Así el mismo código funciona en local (proxy de Vite) y en producción (Nginx redirige al servidor real).

## 📦 Generar la versión de producción

```bash
npm run build
```

Se crea la carpeta `dist/` con el HTML, CSS y JS optimizados. Esa carpeta es la que se publica.

## ❓ Problemas comunes

- **"vite no se reconoce como un comando"**: falta ejecutar `npm install`.
- **"Script execution disabled" en PowerShell**: abre PowerShell como administrador y ejecuta `Set-ExecutionPolicy RemoteSigned`, o usa CMD.
- **La página carga pero no inicia sesión ni trae datos**: revisa que la API esté corriendo sin errores y que uses rutas relativas (`/api/v1/...`).

<!--
## 👤 Mi participación
Este fue un proyecto en equipo. Describe aquí qué partes desarrollaste tú.
-->
