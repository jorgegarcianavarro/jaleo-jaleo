# Jaleo Jaleo: guía para publicarla (de cero, paso a paso)

Tiempo estimado: 30–40 minutos. Coste: 0 €. Los nombres de algunos botones pueden variar un poco con el tiempo, pero la idea es siempre la misma.

**Qué vas a hacer:** subir estos archivos a GitHub (donde viven guardados), conectar Vercel (que publica la web), añadirle una base de datos gratuita y ponerle tu contraseña de administrador.

---

## 0. Prepara los archivos
1. Descomprime `jaleo-jaleo.zip` en tu ordenador.
2. Dentro verás: carpetas `api` y `public`, y los archivos `package.json`, `vercel.json` y `GUIA.md`.

## 1. Crea tu cuenta de GitHub
1. Entra en **github.com** y pulsa **Sign up**.
2. Usa tu correo, una contraseña larga y un nombre de usuario. Confirma el correo que te envían.
3. Recomendado: activa la verificación en dos pasos (Settings → Password and authentication).

## 2. Crea el repositorio (la "carpeta" en GitHub)
1. Pulsa el **+** de arriba a la derecha → **New repository**.
2. Nombre: `jaleo-jaleo`. Marca **Private** (así nadie ve el código; la web sí será visible para quien tenga el enlace).
3. Pulsa **Create repository**.

## 3. Sube los archivos
1. En la página del repositorio vacío, pulsa el enlace **uploading an existing file**.
2. Arrastra a la ventana **todo lo que hay dentro de la carpeta descomprimida**: las carpetas `api` y `public` y los archivos `package.json` y `vercel.json`. (No arrastres la carpeta contenedora, sino su contenido.)
3. Espera a que termine de subir y pulsa **Commit changes**.
4. Comprueba que en el repositorio se ven las carpetas `api` y `public`. Si dentro de `api` ves 6 archivos (`_lib.js`, `plans.js`, `login.js`, `export.js`, `ics.js`, `p.js`), va bien.

## 4. Crea tu cuenta de Vercel
1. Entra en **vercel.com** → **Sign Up**.
2. Elige el plan **Hobby** (gratuito, uso personal) y pulsa **Continue with GitHub**. Autoriza el acceso.

## 5. Publica el proyecto
1. En Vercel: **Add New… → Project**.
2. Busca `jaleo-jaleo` y pulsa **Import** (si no aparece, pulsa "Adjust GitHub App Permissions" y dale acceso a ese repositorio).
3. **Framework Preset: Other.** No toques nada más (ni Build Command ni Output Directory).
4. Pulsa **Deploy**. En un minuto tendrás una dirección tipo `jaleo-jaleo.vercel.app`.
   Todavía no funcionará del todo: faltan la base de datos y tu contraseña.

## 6. Añade la base de datos (gratis)
1. Dentro del proyecto en Vercel, entra en la pestaña **Storage**.
2. **Create Database** → elige **Neon** (Postgres) → plan **Free**.
3. Región: la más cercana a España (por ejemplo, Frankfurt o París).
4. Pulsa **Connect** al proyecto `jaleo-jaleo` y marca los tres entornos (Production, Preview, Development).
   Vercel añade solo las variables de conexión (`DATABASE_URL`). No tienes que copiar nada.

## 7. Pon tu contraseña de administrador
1. Proyecto → **Settings** → **Environment Variables**.
2. **Key:** `ADMIN_PASSWORD`
3. **Value:** una contraseña larga, de **al menos 10 caracteres** (mejor una frase de 4–5 palabras). Guárdala en un gestor de contraseñas o apúntala en un sitio seguro.
4. Marca los tres entornos y pulsa **Save**.

## 8. Vuelve a publicar para que lo aplique
1. Pestaña **Deployments** → en el último → menú **⋯** → **Redeploy** → confirma.

## 9. Pruébalo
1. Abre tu dirección `…vercel.app`. Debe aparecer "Sin planes".
2. Pulsa **ADMIN**, escribe tu contraseña y entra. Aparecerá el botón **Añadir plan**.
3. Crea un plan de prueba. Ábrelo y comprueba que la dirección cambia a `…/p/xxxxxxxx` (ese es el enlace propio de ese plan).
4. Abre la web en otro navegador o en una ventana de incógnito: tienes que ver el plan **sin** botones de edición.

## 10. Compártela
- El enlace general es tu dirección `…vercel.app`.
- Cada plan tiene su enlace (`/p/…`), que es el que se incluye al compartir por WhatsApp y muestra título y datos del plan en la vista previa.
- La web no aparece en buscadores (lleva la etiqueta "noindex"): solo la ve quien tenga el enlace.

---

## Seguridad: cómo está protegido
- Cualquiera puede **leer** el listado; **nadie puede escribir** sin tu contraseña. Las comprobaciones se hacen en el servidor, no en la página.
- Tu contraseña no está en el código: solo vive en la configuración privada de Vercel.
- La sesión se guarda en una cookie cifrada y firmada, que el navegador no puede leer desde la página (HttpOnly), válida 30 días.
- Tras 5 contraseñas erróneas desde un mismo sitio, se bloquea el acceso 15 minutos.
- Si cambias `ADMIN_PASSWORD`, todas las sesiones abiertas se cierran.
- La base de datos no está abierta al público: solo la usa el servidor.
- Haz tú también tu parte: activa la verificación en dos pasos en GitHub y en Vercel.

## Copia de seguridad
Con el modo administrador activo: **ADMIN → Descargar copia de seguridad**. Guarda un archivo con todos los planes. Hazlo de vez en cuando.

## Cambios futuros
- Los cambios de código se hacen en GitHub (o me los pides y subes los archivos nuevos). Vercel vuelve a publicar solo cada vez que cambia algo.
- Los planes se añaden y editan desde la propia web, sin tocar GitHub.

## Si algo falla
| Síntoma | Qué hacer |
|---|---|
| "Sin conexión" o "No he podido cargar los planes" | Falta la base de datos o no se ha vuelto a publicar. Revisa el paso 6 y haz **Redeploy** (paso 8). |
| "Falta configurar la contraseña de administrador…" | Revisa el paso 7 (nombre exacto `ADMIN_PASSWORD`, mínimo 10 caracteres) y haz **Redeploy**. |
| "Demasiados intentos" | Espera 15 minutos. |
| La vista previa de WhatsApp no muestra el plan | WhatsApp guarda la vista previa un rato. Prueba con un plan nuevo o espera. |
| Cualquier otra cosa | Vercel → Deployments → último → **Logs**, y cuéntame qué mensaje aparece. |

## Qué incluye este proyecto
- `public/index.html`: la aplicación (el ticket).
- `api/plans.js`: leer planes (público) y crear, editar o borrar (solo administrador).
- `api/login.js`: entrar y salir como administrador.
- `api/p.js`: enlace propio de cada plan con vista previa para WhatsApp.
- `api/ics.js`: "Añadir a otro calendario" (Apple, Outlook, Google…).
- `api/export.js`: copia de seguridad.
- `api/_lib.js`: base de datos, seguridad y validaciones.
- `vercel.json`: configuración y cabeceras de seguridad.
