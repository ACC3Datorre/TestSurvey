# Recognition Points · FY26

Encuesta interna de reconocimiento para FinOps · CFO&EV.

## Estructura del proyecto

```
recognition-points/
├── index.html          ← página pública (votación)
├── admin.html          ← panel privado (login + dashboard)
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── config.js       ← ⚙ configuración (contraseña, URLs, equipo)
    ├── data.js         ← capa de datos (local / Power Automate)
    ├── auth.js         ← login simple
    ├── app.js          ← lógica de la página pública
    └── dashboard.js    ← lógica del dashboard de admin
```

## Cosas a editar antes de publicar

Abrí `js/config.js` y cambiá:

1. **Contraseña de admin** → `ADMIN.PASSWORD`. Por defecto está `CambiarEsto2026!`.
2. **Lista del equipo** → `TEAM` (ya viene precargada con FinOps).
3. **Modo de almacenamiento** → `STORAGE_MODE`:
   - `'local'` → todo en localStorage del navegador, con export/import JSON manual. **Andá con esto al principio.**
   - `'powerautomate'` → cuando tengas los flows armados, cambialo a este modo.

## Subir a GitHub + activar GitHub Pages

```bash
# 1. Inicializar repo
cd recognition-points
git init
git add .
git commit -m "Initial commit"

# 2. Crear repo en github.com (vacío, sin README)
#    y conectar:
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Después en GitHub:
1. Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)` → Save
4. Esperás un minuto y la URL queda en `https://TU_USUARIO.github.io/TU_REPO/`

## Modo `local` (cómo opera hoy)

- Cada votante carga la página pública, escribe su nombre, vota.
- Los votos se guardan en **su navegador**.
- Cuando termina, descarga un JSON con sus votos (botón "Descargar mis votos").
- **El votante envía ese JSON a la jefa por Teams o mail** (canales corporativos OK con compliance).
- La jefa entra a `/admin.html`, se loguea, y **importa cada JSON** que recibe.
- Una vez importados, ve gráficos, palabras frecuentes, etc.

> **Por qué este flujo y no la nube**: ningún dato sale de la red de Accenture vía web pública. Pasa solo por canales corporativos aprobados (Teams/mail).

## Modo `powerautomate` (más adelante)

Cuando lo quieras conectar a SharePoint sin fricción para los votantes:

### Paso 1 — Crear el Excel en SharePoint
1. En SharePoint del equipo, creá un Excel `recognition_points.xlsx`.
2. Adentro, insertá una **Tabla** (Insert → Table) con estas columnas:
   `id` · `voter` · `nominee` · `justification` · `timestamp`
3. Nombrala `tblVotes` (en el menú Table Design).

### Paso 2 — Flow para escribir votos (POST)
1. Andá a [make.powerautomate.com](https://make.powerautomate.com).
2. Crear → **Instant cloud flow**.
3. Trigger: **"When a HTTP request is received"**.
4. JSON Schema (pegalo en el trigger):
   ```json
   {
     "type": "object",
     "properties": {
       "id": {"type": "string"},
       "voter": {"type": "string"},
       "nominee": {"type": "string"},
       "justification": {"type": "string"},
       "timestamp": {"type": "string"}
     }
   }
   ```
5. Acción: **Excel Online (Business) → Add a row into a table**.
   - Location: SharePoint
   - Document Library: la del equipo
   - File: `recognition_points.xlsx`
   - Table: `tblVotes`
   - Mapeás los campos del JSON a las columnas.
6. Acción final: **Response** (200 OK).
7. **Guardar.** Volvé al trigger, copiá la "HTTP POST URL" generada → pegala en `config.js` → `POWER_AUTOMATE.SUBMIT_VOTE_URL`.

### Paso 3 — Flow para leer votos (GET)
1. Mismo proceso, otro flow con trigger HTTP.
2. Acción: **Excel Online (Business) → List rows present in a table**.
3. Acción: **Response** con body `@{outputs('List_rows_present_in_a_table')?['body/value']}`.
4. Copiá la URL → pegala en `config.js` → `POWER_AUTOMATE.GET_VOTES_URL`.

### Paso 4 — Cambiar el modo
En `config.js`:
```js
STORAGE_MODE: 'powerautomate',
```
Commit, push, listo.

> **Nota de seguridad**: las URLs de Power Automate incluyen un token (`sig=...`) que las hace no-adivinables, pero son técnicamente accesibles para quien las vea. El `SHARED_TOKEN` que mandamos en el header agrega una capa extra: en cada flow, después del trigger, agregás un **Condition** `triggerOutputs()?['headers']?['X-Shared-Token']` igual al token; si no coincide, devolvés 401.

## Funcionalidades del dashboard de admin

- **4 KPIs**: total de nominaciones, personas nominadas, votantes únicos, promedio.
- **Gráfico de barras horizontal**: top 12 más nominados.
- **Gráfico de torta (doughnut)**: distribución de los votos.
- **Word cloud global**: palabras más repetidas en todas las justificaciones.
- **Word cloud por nominado**: seleccionás a una persona y ves qué destacaron de ella.
- **Tabla detallada** ordenada por nominado más votado.
- **Export Excel** con dos hojas (detalle + resumen).
- **Import / Export JSON** para mover datos entre máquinas.

## Sesión de admin

- Dura 4 horas. Después tenés que loguearte de nuevo.
- Se guarda en `sessionStorage` (al cerrar el browser, se borra).
- Cerrar sesión manualmente: botón "↩ Cerrar sesión" arriba a la derecha.

## Limitaciones honestas

- La contraseña vive en el código. Cualquiera técnico que abra DevTools la ve. Es una traba para curiosos casuales, no seguridad real.
- En modo `local`, los datos viven solo en cada navegador. Si limpiás cookies/site data, se borran.
- El word cloud usa una lista de stopwords en español. Si querés agregar palabras a ignorar, editá `config.js → STOPWORDS`.

## Branding

Los colores y la tipografía siguen la identidad visual de Accenture (acento `#A100FF`, símbolo "&gt;" característico). El logo oficial de Accenture **no** está embebido por respeto a la propiedad intelectual; si la página queda restringida al uso interno y querés agregarlo, pegá el SVG oficial en `assets/` y referencialo desde el HTML.
