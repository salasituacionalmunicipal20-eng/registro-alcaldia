# 1x10 — Guia para el operador admin

Este documento explica como funciona la pagina publica de registro **1x10**, como compartirla con los jefes y como administrar los datos desde Firebase. Es una guia para el operador admin del sistema **Sala Situacional — Alcaldia de Cristobal Rojas (Charallave)**.

---

## 1. Como funciona la pagina publica

La pagina `1x10.html` es un formulario publico que cada **jefe 1x10** abre desde su telefono para registrar:

1. **Sus propios datos** como jefe (cedula, nombres, apellidos, telefono, comuna, comunidad, etc.).
2. **Los 10 afines** que componen su patrulla — uno por uno, cada uno con su propia cedula y datos basicos.

La pagina:
- No requiere login: cualquiera con el link puede entrar.
- Valida que la cedula no este duplicada antes de guardar.
- Guarda los datos directamente en Firebase Realtime Database bajo `/jefes_1x10` y `/afines_1x10`.
- Muestra un resumen al final con el total de afines registrados por ese jefe.

El jefe puede volver a entrar despues con la misma cedula para **continuar** registrando afines si no termino los 10 en una sola sesion.

---

## 2. URL larga (link publico oficial)

```
https://salasituacional.alcaldiadecharallave.com/1x10.html
```

Este es el link **canonico**, hosteado en GitHub Pages desde el repo `registro-alcaldia` (carpeta local `alcaldia-admin`). Cada `git push origin main` redeploya automaticamente.

---

## 3. URL corta sugerida (TinyURL)

```
tinyurl.com/1x10cr2026
```

- El alias **termina en `cr2026`** siguiendo la convencion del proyecto (CR = Cristobal Rojas, 2026 = ano).
- Crear el alias en https://tinyurl.com/app apuntando a la URL larga del punto 2.
- Si el alias ya esta tomado, probar variantes como `1x10cr2026v2`, pero mantener el sufijo `cr2026`.

---

## 4. Como compartirlo a los jefes 1x10

Por **WhatsApp**, mandar el siguiente mensaje a cada jefe (uno por uno o por difusion):

> Hola, eres jefe 1x10. Registra tu patrulla aqui: tinyurl.com/1x10cr2026

Recomendaciones:
- Mandarlo desde el numero oficial del partido o de la alcaldia para que confien.
- Reforzar por audio: "abre el link, llena tus datos primero, despues los de tus 10 afines".
- Si un jefe pierde el link, puede pedirlo de nuevo — no hay limite de aperturas.

---

## 5. Como ver los registros desde el admin

Cuando `1x10-resultados.html` este implementado (proxima entrega), el admin podra:

1. Entrar a `admin.html` con su usuario.
2. Abrir la vista **"Resultados 1x10"**.
3. Filtrar por **comuna**, **comunidad** o **cedula de jefe**.
4. Ver el total de jefes, total de afines y porcentaje de patrullas completas (10/10).
5. Exportar a PDF o CSV.

Mientras esa vista no existe, los datos se pueden consultar directamente en la **Firebase Console** (ver punto 6).

---

## 6. Como editar manualmente un jefe que se equivoco

Si un jefe se equivoco al escribir (cedula mal, nombre con typo, etc.), el admin puede corregirlo asi:

1. Abrir https://console.firebase.google.com → proyecto `alcaldia-admin`.
2. Ir a **Realtime Database**.
3. Navegar al nodo:
   - `/jefes_1x10/{cedula_del_jefe}` para corregir datos del jefe.
   - `/afines_1x10/{cedula_jefe}/{cedula_afin}` para corregir un afin especifico.
4. Hacer click en el campo a editar, escribir el valor correcto y presionar Enter.
5. Si la cedula del jefe estaba mal escrita, **NO** se puede renombrar el nodo en Firebase: hay que crear uno nuevo con la cedula correcta, copiar todos los hijos, y borrar el viejo. (O hacerlo programaticamente desde un script.)

**Importante**: cualquier cambio queda inmediatamente reflejado en la pagina publica si el jefe la vuelve a abrir.

---

## 7. Estructura de datos en Firebase

```
/jefes_1x10/{cedula}
    ├── cedula: "V12345678"
    ├── nombres: "Juan Carlos"
    ├── apellidos: "Perez Gomez"
    ├── telefono: "04141234567"
    ├── comuna: "Comuna Bolivariana"
    ├── comunidad: "Sector La Mata"
    ├── fecha_registro: "2026-06-12T14:30:00Z"
    └── total_afines: 7

/afines_1x10/{cedula_jefe}/{cedula_afin}
    ├── cedula: "V87654321"
    ├── nombres: "Maria"
    ├── apellidos: "Lopez"
    ├── telefono: "04241112233"
    ├── parentesco: "hermana"  (opcional)
    └── fecha_registro: "2026-06-12T14:35:00Z"
```

- La **cedula del jefe** es la **key** del nodo `/jefes_1x10` — esto garantiza unicidad.
- Los afines viven en una **subcoleccion** indexada por la cedula del jefe, lo que permite consultar rapido "todos los afines del jefe X" sin escanear toda la base.
- Cada afin tambien usa su **cedula como key** dentro de la subcoleccion para evitar duplicados dentro de la misma patrulla.

---

## Notas finales

- Este flujo **no usa el modelo de operadores/comunas asignadas** del resto del panel: el formulario es publico y cualquiera con el link entra. La unica proteccion es la unicidad de cedula.
- Si en el futuro se requiere restringir por comuna, habria que agregar un campo `comuna_jefe` validado contra una whitelist en `/config/comunas_1x10_activas`.
- El operador admin (`carlos.admin@alcaldia.com`) es el unico autorizado a borrar masivamente jefes o afines via Firebase Console.
