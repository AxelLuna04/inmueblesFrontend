🏠 Frontend - Inmuebles a tu Alcance
Este repositorio contiene el código fuente del cliente web para el sistema de Inmuebles.

El proyecto utiliza Vite como servidor de desarrollo y empaquetador. Está configurado para trabajar en conjunto con la API de Spring Boot sin necesidad de configuraciones complejas de CORS.

🛠️ Prerrequisitos
Para trabajar en este proyecto necesitas tener instalado:

Node.js (Versión LTS recomendada, ej. v18 o superior).

La API (Backend) corriendo localmente en el puerto 8080.

🚀 Configuración Inicial (Solo la primera vez)
Clona este repositorio en tu computadora.

Abre la terminal en la carpeta del proyecto.

Instala las dependencias (esto descargará Vite y otras herramientas):

Bash

npm install
💻 Cómo trabajar día a día
1. Enciende el Backend
Para que la página funcione y pueda traer datos, necesitas tener la API de Java corriendo en tu equipo (NetBeans o terminal) en el puerto 8080.

2. Enciende el Frontend
En la terminal de este proyecto (VS Code), ejecuta:

Bash

npm run dev
Esto iniciará un servidor local en http://localhost:5173. Abre esa dirección en tu navegador.

⚠️ Regla de Oro: Conexión con la API (IMPORTANTE)
Para conectarnos con el backend, NO escriban la URL completa (http://localhost:8080/...).

El proyecto ya tiene configurado un Proxy en vite.config.js. Esto significa que el servidor de frontend redirige automáticamente las peticiones a la API.

✅ Forma Correcta (Rutas Relativas)
Usen siempre rutas que empiecen con /.

JavaScript

// BIEN: El proxy sabrá mandarlo al backend
const respuesta = await fetch('/api/v1/auth/login', { ... });

// BIEN: Para imágenes
<img src="/uploads/publicaciones/foto1.jpg">
❌ Forma Incorrecta (URLs Absolutas)
No pongan el dominio ni el puerto.

JavaScript

// MAL: Esto dará errores de CORS y fallará en producción
const respuesta = await fetch('http://localhost:8080/api/v1/auth/login', { ... });
¿Por qué hacemos esto? Al usar rutas relativas (/api/...), el código funciona igual en:

Tu casa: El proxy de Vite lo manda a localhost:8080.

Producción: Nginx lo mandará al servidor real. ¡No tendrán que cambiar ni una línea de código al entregar!

📦 Cómo entregar el proyecto (Build)
Cuando terminen una funcionalidad o vayamos a hacer deploy, no me pasen la carpeta de código completa. Sigan estos pasos para generar la versión optimizada:

Detén el servidor de desarrollo (Ctrl + C).

Ejecuta el comando de construcción:

Bash

npm run build
Esto creará una carpeta nueva llamada dist.

Esa carpeta dist es lo único que deben enviar/entregar. Contiene el HTML, CSS y JS final y optimizado para producción.

❓ Solución de Problemas Comunes
Error: "vite no se reconoce como un comando..."

Te faltó ejecutar npm install. Hazlo e intenta de nuevo.

Error: "Script execution disabled" (en PowerShell)

Abre PowerShell como Administrador y ejecuta: Set-ExecutionPolicy RemoteSigned. O usa la terminal "Command Prompt" (CMD) en lugar de PowerShell.

La página carga pero no hace Login / No trae datos

Revisa que tu API de Java esté corriendo y no tenga errores.

Revisa que estés usando rutas relativas (/api/v1...) en tus fetch.

Abre la consola del navegador (F12) para ver si hay errores de JavaScript.