# Gestor de tareas

Aplicación pequeña para gestionar tareas: una API REST en Node.js (Express) y un frontend en React, las dos en TypeScript, con SQLite como base de datos.

Cada tarea tiene título, responsable y estado (pendiente, en curso o hecha). Desde la web se pueden crear tareas, filtrarlas por estado y pasarlas al siguiente estado.

## Cómo ejecutarlo

### Con Docker Compose

```bash
docker compose up --build
```

Abre http://localhost:8080. nginx sirve el frontend y reenvía `/api` a la API. Los datos se guardan en el volumen `tasks-data`.

### Sin Docker

Necesitas Node.js 22.13 o superior (probado con Node 24).

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000

`npm install` en la raíz instala también las dependencias de `backend/` y `frontend/`, y `npm run dev` arranca las dos partes a la vez. El servidor de Vite reenvía `/api` a la API, y la base de datos se crea en `backend/data/tasks.db`.

### Tests y comprobaciones

```bash
npm test           # backend (Vitest + Supertest) y frontend (Vitest + Testing Library)
npm run typecheck  # tsc en los dos proyectos
npm run build      # compila la API en backend/dist y el frontend en frontend/dist
```

El workflow de GitHub Actions ejecuta lo mismo en cada push y, además, levanta la aplicación con Docker Compose y hace una prueba de humo a través de nginx.

## API

| Método | Ruta | Qué hace | Respuestas |
| --- | --- | --- | --- |
| `GET` | `/api/tasks?status=` | Lista las tareas, de la más reciente a la más antigua. `status` es opcional: `pending`, `in_progress` o `done`. | 200, 400 |
| `POST` | `/api/tasks` | Crea una tarea. Cuerpo: `title`, `assignee` y, opcionalmente, `status` (por defecto `pending`). | 201 con `Location`, 400, 415, 422 |
| `GET` | `/api/tasks/:id` | Devuelve una tarea. | 200, 400, 404 |
| `PATCH` | `/api/tasks/:id` | Cambia el estado. Cuerpo: `status`. | 200, 400, 404, 415, 422 |
| `GET` | `/api/health` | Comprobación de salud (la usa Docker Compose). | 200 |

Las respuestas correctas van dentro de `data`:

```json
{
  "data": {
    "id": 1,
    "title": "Preparar la demo",
    "status": "pending",
    "assignee": "Ana",
    "createdAt": "2026-11-14T09:30:00.000Z",
    "updatedAt": "2026-11-14T09:30:00.000Z"
  }
}
```

Reglas de validación: `title` de 1 a 120 caracteres y `assignee` de 1 a 60 (se recortan los espacios), `status` uno de los tres valores, y cualquier otro campo se rechaza.

Los errores siguen el formato _problem details_ de la RFC 9457 (`application/problem+json`):

```json
{
  "type": "about:blank",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Los datos enviados no son válidos.",
  "errors": [{ "field": "title", "message": "El título es obligatorio." }]
}
```

| Código | Cuándo |
| --- | --- |
| 400 | JSON mal formado, filtro `status` desconocido o id que no es un entero positivo |
| 404 | La tarea o la ruta no existen |
| 415 | El cuerpo no se envía como `application/json` |
| 422 | El JSON es válido pero los datos no: campo vacío o demasiado largo, estado desconocido o campo no permitido |
| 500 | Error inesperado: se registra en el log y la respuesta no da detalles internos |

Ejemplos con `curl` (con `npm run dev`; con Docker, cambia el puerto a 8080):

```bash
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"title":"Preparar la demo","assignee":"Ana"}'
curl "http://localhost:3000/api/tasks?status=pending"
curl -X PATCH http://localhost:3000/api/tasks/1 -H "Content-Type: application/json" -d '{"status":"in_progress"}'
```

## Estructura

```
backend/
  src/
    app.ts                  la app de Express, sin listen, para testearla con Supertest
    server.ts               arranque: abre la base de datos y escucha en PORT
    db.ts                   conexión a SQLite y esquema
    http/problem.ts         errores HTTP, validación con Zod y manejador de errores
    tasks/                  esquemas, repositorio (SQL) y rutas de tareas
  test/                     tests de la API contra SQLite en memoria
frontend/
  src/
    api/tasks.ts            cliente de la API y ApiError
    tasks/                  hook useTasks, formulario, filtro, lista y validación
    App.tsx
    **/*.test.tsx           tests con Testing Library y fetch simulado
  nginx.conf                sirve el build y reenvía /api dentro de Docker
docker-compose.yml
.github/workflows/ci.yml
```

## Decisiones

- **Express en lugar de NestJS.** Para cuatro endpoints, los módulos, decoradores e inyección de dependencias de NestJS no aportan mucho; con Express la API cabe en pocos archivos que se leen de arriba abajo. Hay dos capas: rutas (HTTP y validación) y repositorio (SQL). No hay capa de servicio porque todavía no hay reglas de negocio; tendría sentido en cuanto apareciera alguna, como restringir las transiciones de estado.
- **SQLite con el módulo `node:sqlite` de Node.** No necesita dependencias nativas: nada que compilar con node-gyp en Windows o en Alpine, y la instalación es rápida. A cambio, en Node 22 y 24 el módulo sigue marcado como experimental, así que los scripts silencian ese aviso. Toda la SQL está en `task.repository.ts`, de modo que pasar a better-sqlite3 o a PostgreSQL afecta a un solo archivo. El esquema repite la lista de estados en un `CHECK` como segunda barrera.
- **Validación con Zod en el borde HTTP.** Los objetos son estrictos (un campo desconocido es un error, no se ignora en silencio) y `PATCH` solo acepta `status`. Los mensajes están en español porque el frontend los muestra junto a cada campo.
- **400 frente a 422.** 400 para peticiones mal formadas (JSON roto, query o id inválidos) y 422 para datos bien formados pero que no cumplen las reglas, igual que hace la API de GitHub. Todos los errores, 404 incluido, usan el mismo formato RFC 9457.
- **Estados en inglés en la API** (`pending`, `in_progress`, `done`) y etiquetas en español en la interfaz.
- **El frontend no usa librería de datos.** El hook `useTasks` usa `fetch` con `AbortController`: si cambias de filtro rápido, la petición anterior se cancela y su respuesta nunca sustituye a la nueva. Al crear una tarea o cambiar su estado, la lista se actualiza con la respuesta de la API sin volver a pedirla entera, y si la tarea deja de cumplir el filtro activo, sale de la lista.
- **Mismo origen en desarrollo y en Docker.** El proxy de Vite y nginx reenvían `/api` a la API, así que no hace falta configurar CORS.
- **Validación en los dos lados con las mismas reglas.** El formulario avisa al momento y la API tiene la última palabra; si la API rechaza un campo, el error aparece junto a ese campo. El formulario se bloquea mientras se guarda, para no perder lo que se escriba entretanto.
- **Accesibilidad.** Todos los campos tienen etiqueta, los errores se asocian con `aria-describedby`, los avisos usan `role="alert"` y `role="status"`, el filtro marca la opción activa con `aria-pressed` y cada botón de estado incluye el título de la tarea en su nombre accesible.
- **Tests.** El backend se prueba con Supertest contra la app real y una base de datos SQLite en memoria nueva en cada test. El frontend se prueba con Testing Library simulando `fetch` y comprobando lo que ve el usuario: carga, error y reintento, filtro, cambio de estado, creación y validación.

## Qué haría con más tiempo

- Paginación en el listado y búsqueda por título o responsable.
- Editar y borrar tareas, responsables como usuarios reales en lugar de texto libre, y autenticación.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.
- Un paquete compartido con los tipos y las reglas de validación, o un contrato OpenAPI del que generar el cliente, para no duplicarlos entre backend y frontend.
- Documentación OpenAPI, logs estructurados con pino, cabeceras de seguridad con helmet y límite de peticiones.
- TanStack Query en el frontend para caché, reintentos y actualizaciones optimistas.
- ESLint y Prettier en CI, tests end-to-end con Playwright y medición de cobertura.

## Cómo usé la IA

Usé Claude Code, el asistente de programación de Anthropic, durante toda la prueba.

- **Qué le pedí:** le pasé el enunciado tal cual y le pedí la aplicación completa: API, frontend, tests, Docker Compose y este README.
- **Qué hizo:** propuso el stack y la estructura que explico en «Decisiones», escribió el código y los tests, los ejecutó y probó la aplicación en un navegador: crear, filtrar, cambiar de estado, error y reintento con la API caída, y vista móvil.
- **Qué se corrigió al probar:**
  - El nombre accesible de los botones de estado se calculaba mal en jsdom; se cambió a `aria-label` y los tests lo comprueban.
  - Si escribías en el formulario mientras se guardaba la tarea anterior, el reseteo borraba lo escrito. Ahora el formulario se bloquea mientras guarda, y hay un test que lo cubre.
  - En móvil, el filtro de estados se partía en dos líneas.
- **Qué acepté y qué cambié yo:** _pendiente de completar tras mi revisión._
