# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Sala Situacional" — a territorial census / case-management admin panel for the Alcaldía de Cristóbal Rojas (Charallave, Venezuela). Each page is a self-contained static HTML file with inline `<style>` and inline `<script type="module">`. There is **no build system, no package manager, no test suite, and no linter**. To run the app, open `index.html` in a browser (or serve the directory with any static server). All UI strings, comments, and commit messages are in Spanish — preserve Spanish when editing.

## Architecture

**Backend = Firebase Realtime Database** (project `alcaldia-admin`, region default). Each HTML page reimports Firebase ESM modules from `https://www.gstatic.com/firebasejs/9.23.0/` and **redeclares the same `firebaseConfig` literal inline** — there is no shared config file. Rotating credentials or upgrading SDK versions means editing every `*.html`.

### Auth model
- Firebase Auth with synthesized fake emails: the user types a `usuario` and the page logs in as `{usuario}@alcaldia.com`.
- One hardcoded super-admin: `carlos.admin@alcaldia.com`. Several routes ([admin.html](admin.html), [respaldo.html](respaldo.html), [migrador.html](migrador.html)) gate features by string-comparing `user.email` to this address — do not refactor this without checking every caller.
- After login [index.html](index.html) reads `/operadores/{uid}` and routes to [password.html](password.html) (forced reset), [admin.html](admin.html) (role `admin`), or [registro.html](registro.html) otherwise. The forced-reset check **must run before the role check** — this ordering is load-bearing (see comment "REGLA DE ORO" at [index.html:161](index.html#L161)).

### Realtime DB tree
- `/operadores/{uid}` — `{nombre, apellido, cargo, rol, comunas_asignadas: [...], usuario, cambio_obligatorio, fecha_registro}`. `rol` is `"admin"` or operator. `comunas_asignadas` may contain the sentinel `"TODAS"` to mean unrestricted.
- `/habitantes/{push-id}` — flat list of citizens (heads-of-household and dependents in the same collection; dependents carry a `ubch`/jefe linkage assigned at insert time in [registro.html](registro.html)).
- `/presencia/{uid}` — live presence beacon. Pages that need it set `window.presenciaRef`, register `onDisconnect(...).update({estado: 'offline', ...})`, and continually push human-readable `ultima_accion` strings (e.g. "Llenando datos de C.I: V12345"). The monitor in [respaldo.html](respaldo.html) reads this to render the live operator panel.
- `/historial_sesiones/{push-id}` — append-only session audit log. Records may be empty/partial (old rows lack fields); the read-side renderer in [respaldo.html](respaldo.html) has a defensive guard ("escudo anti-crash") — preserve it.
- `/config/sistema/failover_activo` — boolean flag toggled from the bóveda.

### Comuna-based access control (client-side)
Operators can only see/write rows whose `comuna` is in their `comunas_asignadas`. This is enforced **in the browser** by every page that reads `/habitantes` ([registro.html](registro.html), [consulta.html](consulta.html), [estadisticas.html](estadisticas.html)). Pattern:

```js
let misComunas = window.perfilOperador.comunas_asignadas
                 || (window.perfilOperador.comuna_asignada ? [window.perfilOperador.comuna_asignada] : []);
if (!esAdmin && misComunas.length > 0 && !misComunas.includes('TODAS')) {
    if (!misComunas.includes(h.comuna)) continue; // filter out
}
```

When adding a new view over `/habitantes`, replicate this exact gate — admins bypass, `'TODAS'` bypasses, otherwise filter. The legacy single-comuna field `comuna_asignada` is still read for backwards compatibility; keep that fallback.

### Supabase mirror ([respaldo.html](respaldo.html))
Supabase is a **read-only backup target**, not a live source. The bóveda batches `/habitantes` in chunks of 50 and `upsert`s into the Supabase `habitantes` table keyed by `id_firebase` (the original Firebase push key). The full-wipe button is intentionally destructive and gated behind multiple confirms — leave the confirmations in place.

### External CDN dependencies
- Chart.js (BI charts in [estadisticas.html](estadisticas.html))
- PapaParse 5.3.2 (CSV ingest in [migrador.html](migrador.html), [actualizador.html](actualizador.html))
- `@supabase/supabase-js` via jsdelivr ESM ([respaldo.html](respaldo.html))

There is no offline fallback — these CDNs must be reachable.

### Operator-creation flow ([crear-operador.html](crear-operador.html))
Uses a **secondary Firebase Auth instance** (`secondaryAuth`) so that creating a user does not sign the admin out. After `createUserWithEmailAndPassword`, it writes `/operadores/{uid}` with `cambio_obligatorio: true`, then signs out the secondary auth. Do not collapse this to a single auth instance.

## Workflow notes

- **No tests / no build**. "Running" the app means opening HTML in a browser. There is nothing to lint, compile, or bundle.
- Commits on this repo are Spanish first-person summaries describing the user-visible change (see `git log`). Match that style.
- The `false/` directory at the repo root is an npm cache artifact (from someone running `npm install --prefix false`), not source. Ignore it.
- When editing one page, check whether the same logic is duplicated across the other HTML files (auth bootstrap, comuna gate, presencia setup) and update them in lockstep — there is no shared module to change once.
