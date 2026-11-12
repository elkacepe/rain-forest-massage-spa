# Rain Forest Massage Spa · Sesiones y liquidaciones

Webapp para que un spa urbano de México registre cada sesión y liquide lo que le corresponde a cada terapeuta. Está pensada primero para el móvil y se probó a 360 px. Hecha con React 18, Tailwind CSS 3 y Vite 5. No tiene backend: todo se guarda en el `localStorage` del navegador.

---

## 1. Cómo arrancar el proyecto

**Requisitos:** Node **18.18 o superior** (recomendado: Node 20 LTS, que figura en `.nvmrc`) y npm 9 o superior. Vite 5 no funciona con Node 16 o anteriores.

```bash
git clone https://github.com/elkacepe/rain-forest-massage-spa.git
cd rain-forest-massage-spa
nvm use            # opcional, toma Node 20 de .nvmrc
npm install        # instala las dependencias
npm run dev        # levanta en local → http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Corre los 13 tests del motor de cálculo, la agenda y la persistencia (usa `node --test`, sin dependencias extra). |
| `npm run build` | Genera **un solo archivo** `dist/index.html`, con JS, CSS y fuentes adentro. Se puede abrir con doble clic o subir a cualquier hosting estático. |
| `npm run preview` | Sirve el build en local para revisarlo. |

**Para entrar:** la clave del panel es `selva2026`. Después se elige el rol (Dirección, Recepción o Terapeuta) y, si es Terapeuta, cuál de las cinco.

### Dónde está cada cosa

```
├── index.html              Punto de entrada HTML (idioma, viewport, color de tema)
├── tailwind.config.js      Paleta y tipografías: arena, selva, terracota, oro, noche, salvia
├── vite.config.js          Build de archivo único (vite-plugin-singlefile)
├── tests/
│   └── engine.test.js      Tests de reglas: comisiones, escalón, cancelaciones, adelantos, agenda, persistencia
└── src/
    ├── main.jsx            Monta React
    ├── index.css           Fuentes (DM Serif Display, Source Sans 3) y estilos base
    ├── App.jsx             Carga de datos, roles y permisos, navegación, barra inferior, guardado
    ├── ui.jsx              Componentes visuales compartidos: botones, chips de estado, hojas modales, avisos,
    │                       íconos, avatar, calendario propio (Calendar, DateField), selectores en bloque
    │                       (OptionGrid, PersonList, Segmented) y navegador de quincenas (QuincenaSelect)
    ├── screens/            Las 10 pantallas
    │   ├── Login.jsx           1. Acceso: clave + rol + terapeuta (lista con avatar)
    │   ├── Agenda.jsx          2. Agenda por día: semana lun–dom, flechas día a día, calendario, filtro por terapeuta
    │   ├── SessionForm.jsx     3. Nueva sesión: masaje, terapeuta y colonia en bloques, horarios libres calculados
    │   ├── SessionDetail.jsx   4. Detalle de sesión: realizada, cancelar, no se presentó, propina, notas
    │   ├── MyQuincena.jsx      5. Mi quincena (terapeuta): acumulado, escalón, mis recibos
    │   ├── Liquidacion.jsx     6. Liquidación: Abierta → En revisión → Aprobada → Pagada
    │   ├── Recibo.jsx          7. Recibo sesión por sesión + Compartir por WhatsApp
    │   ├── Adelantos.jsx       8. Registro de adelantos con tope del 40 %
    │   ├── Panel.jsx           9. Métricas de Dirección
    │   └── Ajustes.jsx        10. Tarifas, comisiones, viáticos, especialidades, restaurar datos
    └── lib/                Lógica de datos, sin React (se testea en Node)
        ├── constants.js        Claves de almacenamiento, clave del panel, estados, roles
        ├── config.js           Catálogo, cabinas, colonias y viáticos, horarios, tasas (configuración inicial)
        ├── dates.js            Fechas y quincenas (1–15 y 16–fin de mes)
        ├── engine.js           Motor de liquidación: comisiones, escalón, cancelaciones, adelantos, arrastre, métricas
        ├── schedule.js         Validación de agenda: cabinas, preparación, traslados, horario, especialidades
        ├── store.js            Acciones sobre el estado + lectura y escritura en localStorage
        ├── seed.js             Datos de ejemplo sintéticos
        └── format.js           Formato de dinero y porcentajes
```

La regla de diseño del código es que **toda la lógica de negocio está en `src/lib/`** y son funciones puras: reciben el estado y devuelven el resultado o un error. Las pantallas no calculan montos; llaman a `engine.js` y `store.js`.

### Permisos por rol

| Rol | Ve | Puede hacer |
|---|---|---|
| **Dirección** | Todo | Configurar tarifas y reglas, registrar adelantos, pasar a revisión, aprobar y pagar liquidaciones |
| **Recepción** | Agenda completa, precios de lista | Cargar sesiones, cambiar estados, registrar propinas y medio de pago. **No ve porcentajes, comisiones, viáticos ni métricas.** |
| **Terapeuta** | Solo su agenda, su acumulado y sus recibos | Nada: es solo lectura |

Los permisos están en `ACCESS` y `NAV` dentro de `src/App.jsx`. Son controles de interfaz, no de seguridad: ver la sección 2.

---

## 2. Qué está simulado y cómo se comporta

Nada sale del navegador: no hay servidor, correo, pagos ni envíos automáticos. Esta tabla dice qué hace hoy cada punto y dónde enchufar la versión real.

| Funcionalidad | Cómo se comporta hoy | Dónde conectar lo real |
|---|---|---|
| **Base de datos** | Todo el estado (config, terapeutas, sesiones, adelantos, quincenas) es un único JSON en `localStorage`, bajo la clave `rainforest-spa.liquidaciones.v1`. Cada dispositivo tiene sus propios datos: lo que carga recepción en su móvil **no** lo ve dirección en el suyo. | `src/lib/store.js` → `loadState()`, `saveState()` y `restoreSeed()`. `App.jsx` las llama en un único lugar (`commit`). Las acciones (`createSession`, `updateSession`, `addAdvance`, `setQuincenaStatus`, `updateConfig`…) ya devuelven `{ state }` o `{ error }`, así que se pueden traducir a llamadas a una API una por una. |
| **Acceso y roles** | Una clave compartida, `selva2026`, se compara en el navegador (`PANEL_KEY` en `src/lib/constants.js`). El rol se elige con un selector y se guarda en `sessionStorage` (`rainforest-spa.rol.v1`), así que dura hasta que se cierra la pestaña. No hay cuentas, alta de usuarios ni recuperación de clave. Quien lea el código ve la clave. | `src/screens/Login.jsx` (validación) y `src/App.jsx` (`readRole`, `login`, `logout`, tabla `ACCESS`). Con un backend, el rol y el `therapistId` tienen que venir del token de sesión, no del selector. |
| **Recibo por WhatsApp** | El botón «Compartir por WhatsApp» es un enlace `https://wa.me/?text=…` con el recibo ya armado en texto. Abre WhatsApp y **la persona elige el contacto y envía a mano**. No hay número de teléfono cargado ni envío automático. También hay un botón «Copiar texto» que usa el portapapeles. | `src/screens/Recibo.jsx` → `receiptText()` arma el texto y `waUrl` el enlace. Para enviar de verdad, hay que reemplazarlo por una llamada a la WhatsApp Business API con el teléfono de la terapeuta (hoy no existe ese campo). |
| **Correo** | No hay correo en la app: nada se envía ni se muestra como enviado. | — |
| **Cobros al cliente** | No se procesa ningún pago. El «medio de pago» (efectivo, tarjeta, transferencia) es un dato que se anota en la sesión. Los cargos por cancelación (50 %) se calculan y se muestran, pero no se cobran. No hay simulación de tarjeta rechazada ni números de prueba. | Campo `paymentMethod` de cada sesión (`store.js` → `createSession` / `updateSession`). Un cobro real iría en `SessionDetail.jsx`, al marcar Realizada o al cancelar con cargo. |
| **Pago a terapeutas** | «Marcar como pagada» solo cambia el estado de la quincena y guarda la fecha de pago que se ingresa a mano. No mueve dinero. | `store.js` → `setQuincenaStatus(state, qid, 'pagada', { paymentDate })`. |
| **Impresión y descargas** | No hay botón de imprimir ni de descargar: en la versión publicada como artefacto el navegador los bloquea, y se reemplazaron por «Copiar texto». | `Recibo.jsx`. |
| **Fecha de «hoy»** | Se toma del reloj del dispositivo. La semilla se arma relativa a esa fecha (ver la sección 3). | `src/lib/dates.js` → `todayISO()`. |

**Si `localStorage` falla** (navegador en modo privado estricto, cuota llena, almacenamiento bloqueado), la app guarda primero y recién después confirma. Si falla, muestra «No se pudo guardar…» o «No hay espacio…», **no cambia nada en pantalla** (códigos, montos y estados quedan como estaban) y el formulario conserva lo que se escribió para reintentar. Si los datos guardados están corruptos, aparece una pantalla de error que **no los sobrescribe** sola: ofrece recargar o restaurar con confirmación.

---

## 3. Datos de ejemplo y cómo reiniciarlos

Todos los nombres son **sintéticos**. Los precios del catálogo son los que publica el negocio, y el resto (cabinas, viáticos, terapeutas, clientes) es de prueba.

### Configuración precargada (`src/lib/config.js`)

- **6 masajes, en duraciones de 60 y 90 min:** Relajante ($1,000 / $1,300), Holístico ($1,100 / $1,450), Piedras calientes ($1,200 / $1,550), Deep tissue, Thai y Terapéutico ($1,250 / $1,600 cada uno).
- **3 cabinas:** Ceiba, Helecho y Bambú. Una sesión por vez, con 15 min de preparación.
- **4 colonias con viático:** Roma Norte $120, Condesa $150, Polanco $220 y Del Valle $250.
- **Horario:** de lunes a viernes de 9:00 a 18:00; sábados y domingos de 9:00 a 20:00.
- **5 terapeutas** (Thai y Deep tissue solo los hacen Valentina y Camila):

| Terapeuta | Especialidades |
|---|---|
| Valentina Robledo | Relajante, Deep tissue, Thai, Terapéutico |
| Mariana Olvera | Relajante, Holístico, Piedras calientes |
| Lucía Ferrer | Relajante, Holístico, Terapéutico |
| Camila Ibarra | Deep tissue, Thai, Piedras calientes, Terapéutico |
| Renata Solís | Relajante, Holístico, Piedras calientes, Terapéutico |

### Movimientos precargados (`src/lib/seed.js`)

Las fechas son **relativas al día en que se abre la app por primera vez**, para que siempre haya una quincena abierta para revisar. La quincena del escenario es la actual si ya pasaron 9 días o más desde su inicio; si no, es la anterior. Generada el 12/11/2026, la semilla trae:

- **107 sesiones** con **20 clientes** sintéticos:
  - Quincena anterior (16–31 oct), **Pagada**: 15 sesiones realizadas, 3 por terapeuta, con recibos históricos.
  - Quincena del escenario (1–15 nov), **Abierta**: 81 realizadas, 2 canceladas con cargo, 1 cancelada a tiempo, 1 no se presentó y 7 agendadas (de hoy en adelante).
  - 19 de ellas a domicilio y 58 con propina.
- **1 adelanto:** Camila, $2,500, del día 5 de la quincena («Pedido por WhatsApp — gastos personales»).

**El caso del briefing que queda armado:**

| Terapeuta | Qué la hace interesante | Ventas | Neto* |
|---|---|---|---|
| Valentina Robledo | **Supera el escalón:** $43,800 en ventas. Solo los $3,800 de excedente pagan +5 puntos, o sea +$190. | $43,800 | $19,540 |
| Mariana Olvera | **Seis domicilios en Polanco:** 6 × $220 = $1,320 de viáticos. | $10,550 | $6,987.50 |
| Lucía Ferrer | **Dos cancelaciones con menos de 3 h** (avisó 1 h 30 min y 2 h antes): se le cobran $800 al cliente por cada una y ella recibe $320 por cada una. | $21,100 | $9,945 |
| Camila Ibarra | **Adelanto de $2,500** descontado en la misma liquidación. | $25,200 | $9,740 |
| Renata Solís | 1 «No se presentó», 1 cancelación a tiempo y 1 domicilio en Del Valle. | $8,850 | $3,952.50 |
| **Total a pagar** | | $109,500 | **$50,165** |

\* Son los valores con la semilla generada el 12/11/2026. Si se genera otro día, las sesiones caen en otras fechas y, como el horario de cierre cambia según el día de la semana, los montos pueden variar un poco. La estructura del caso es siempre la misma.

**Para reproducirlo:** entrá como Dirección → Liquidación → tocá Valentina para ver el detalle sesión por sesión. La sesión que cruza los $40,000 muestra «35 % / 40 %». Después: Pasar a revisión → Aprobar quincena → abrir un recibo → Compartir por WhatsApp. Para probar el rechazo de adelanto: Adelantos → Camila → $5,000; la app lo rechaza porque el máximo disponible es $2,396.

### Cómo volver al estado inicial

Hay dos formas. En ambas se borra solo lo de esta app:

1. **Desde la app:** entrá como Dirección → **Ajustes** → **«Restaurar datos de prueba»** → confirmá. Reemplaza el contenido de la clave `rainforest-spa.liquidaciones.v1` por una semilla nueva.
2. **Desde el navegador:** en las herramientas de desarrollo → Application → Local Storage, borrá la clave `rainforest-spa.liquidaciones.v1` (o corré `localStorage.removeItem('rainforest-spa.liquidaciones.v1')` en la consola) y recargá.

La semilla se carga **solo si esa clave no existe**. Si alguien borra todas las sesiones, la lista vacía es un dato válido: al recargar no vuelve la semilla.

---

## 4. Interfaz

- **Sin controles nativos:** no hay desplegables (`<select>`) ni el selector de fecha del navegador. Todo se elige con componentes propios de `src/ui.jsx`, pensados para el dedo en un móvil de 360 px (zonas táctiles de 44 px o más):

  | Qué se elige | Cómo |
  |---|---|
  | Rol y terapeuta (acceso) | Lista de bloques con check; la terapeuta lleva avatar |
  | Masaje y colonia | Tarjetas en grilla (`OptionGrid`) |
  | Terapeuta (nueva sesión, adelantos) | Lista con avatar (`PersonList`) |
  | Modalidad, duración, cabina, medio de pago | Control segmentado (`Segmented`) |
  | Fechas | `DateField`: muestra la fecha completa («Jueves 12 de noviembre 2026») y despliega el calendario debajo |
  | Quincena (liquidación, panel) | Flechas ‹ › (`QuincenaSelect`) |

- **Calendario (`Calendar`):**
  - La semana empieza en lunes.
  - Hoy se marca en terracota y el día elegido en verde selva.
  - En la agenda, los días con sesiones llevan un punto.
  - Tocar el mes («Noviembre 2026 ▾») abre la **vista de año**: las flechas cambian de año y se elige el mes. Desde ahí, «Volver a 2026» regresa al año en curso.
  - Es el mismo componente en la agenda, nueva sesión, aviso de cancelación, adelantos y fecha de pago.
- **Agenda:**
  - Muestra la semana de lunes a domingo del día elegido.
  - Las flechas avanzan de **a un día**. «Ver mes» despliega el calendario e «Ir a hoy» vuelve al día actual.
  - El filtro por terapeuta es una fila de botones con avatar que se desliza de costado. No aparece para el rol Terapeuta, que solo ve su propia agenda.
- **Tablas:**
  - En Liquidación y en el Recibo, la tabla aparece desde 1024 px de ancho.
  - Por debajo, cada fila se muestra como tarjeta con el neto grande a la derecha.
  - Si aun así la tabla no entra, se desplaza de costado en lugar de cortarse.

---

## 5. Reglas implementadas

- **Comisión base:** 35 % del precio en cabina y 45 % a domicilio. El precio que se usa es el guardado en la sesión al momento de agendarla.
- **Escalón por quincena:** las sesiones Realizadas de cada terapeuta se ordenan por fecha y hora. Los primeros $40,000 pagan la tasa base y lo que supera esa cifra paga 5 puntos más. Si una sesión cruza el tope, se divide: la parte hasta $40,000 paga la tasa base y el resto la tasa con escalón.
- **Viático:** el importe fijo de la colonia, en cada sesión a domicilio Realizada.
- **Propinas:** van al 100 % para la terapeuta y no cuentan para el escalón.
- **Cancelación con menos de 3 h o No se presentó:** se cobra al cliente el 50 % de la tarifa, la terapeuta recibe el 20 % y la sesión no suma para el escalón.
- **Cancelación con 3 h o más:** sin cargo y sin pago.
- **Neto** = comisiones (incluido el 20 % de cancelaciones) + viáticos + propinas − adelantos − «A descontar».
- **Adelantos:** el total no puede pasar del 40 % de lo ganado en la quincena. Cada adelanto nuevo se compara con *(40 % de lo ganado) − adelantos ya registrados*, así varios adelantos chicos no superan el tope. Si se rechaza, la app muestra el motivo con los montos.
- **Saldo negativo:** pasa a la quincena siguiente como «A descontar».
- **Quincenas:** van del 1 al 15 y del 16 a fin de mes. Una quincena se abre sola con el primer registro cuya fecha cae en ella.
  - **En revisión:** bloquea la carga y la edición de sesiones y adelantos de esa quincena.
  - **Aprobada:** guarda una copia completa de los montos. Si después se cambian tarifas, la quincena no se mueve.
  - **Pagada:** exige fecha de pago.
- **Agenda:**
  - **Cabina:** cada una queda ocupada por la duración más 15 min de preparación.
  - **Terapeuta en cabina:** queda ocupada por la duración más los 15 min de preparación.
  - **Terapeuta a domicilio:** queda bloqueada 45 min antes y 45 min después por el traslado.
  - **Horario y cancelaciones:** si la sesión no entra en el horario, el formulario la rechaza. Al cancelar se libera el lugar.
  - **Especialidades:** cada masaje solo se puede asignar a quien lo tiene entre sus especialidades.
- **Métricas:**
  - **Ingresos:** ventas + cargos por cancelación.
  - **% en comisiones:** comisiones ÷ ingresos.
  - **Ticket promedio:** ventas ÷ sesiones realizadas.
  - **Ocupación de cabinas:** minutos ocupados ÷ minutos de apertura × 3 cabinas, desde el inicio de la quincena hasta hoy.
  - **% de cancelaciones:** canceladas ÷ sesiones cerradas.
  - **Ranking:** ventas y neto por terapeuta.

---

## 6. Decisiones que no estaban en el encargo

- **Lo ganado (para el tope de adelantos)** son comisiones + viáticos + propinas. El encargo no aclaraba si las propinas entraban; si no deben contar, el cambio es una línea en `engine.js` → `advanceCheck`.
- **Ingresos del panel** son ventas realizadas + cargos por cancelación. Las propinas quedan afuera porque pasan directo a la terapeuta.
- **Cierre del horario:** la sesión tiene que *terminar* antes del cierre. Los 15 min de preparación pueden caer después, porque si no, a las 17:00 de un día hábil no entraría ningún masaje de 60 min.
- **Viático solo en sesiones Realizadas.** Una cancelación a domicilio, aunque sea con cargo, no paga viático.
- **El estado de la quincena es uno solo para todo el spa**, no uno por terapeuta: se aprueba la quincena entera, como en el escenario del día 15.
- **«En revisión» se puede reabrir** para corregir. «Aprobada» y «Pagada» no vuelven atrás.
- **Una quincena no se puede aprobar si la anterior sigue abierta o en revisión**, porque el saldo «A descontar» depende de ella.
- **Cancelación con cargo o a tiempo:** recepción no elige entre los dos estados. Ingresa la fecha y hora del aviso, y la app calcula las horas de anticipación y asigna el estado.
- **Se agregó el campo «Cliente»** a la ficha de sesión. El encargo hablaba de clientes sintéticos pero no lo incluía en la ficha.
- **Las notas rechazan palabras de salud** (lesión, embarazo, dolor, diagnóstico, etc.) para cumplir «notas sin datos de salud». La lista está en `constants.js` → `HEALTH_WORDS`.
- **Propinas solo en sesiones Realizadas.** Si una sesión pasa a cancelada, su propina vuelve a cero.
- **Se puede volver una sesión a «Agendada»** desde cualquier estado mientras la quincena esté abierta, siempre que el horario siga libre. Sirve para corregir errores de carga.
- **La clave del panel sirve para los tres roles.** El encargo pedía una clave compartida sin cuentas, y se interpretó como una sola clave de entrada más el selector de rol.
- **La pantalla de liquidación abre por defecto en la quincena más antigua que todavía no está pagada.**
- **«Imprimir» se reemplazó por «Copiar texto»**, porque el visor de artefactos bloquea la impresión.
- **Las flechas de quincena solo recorren quincenas que ya tienen registros**, más la del día de hoy. No se puede navegar a quincenas futuras vacías: se abren solas con el primer registro.
- **La hora del aviso de cancelación** sigue usando el selector de hora nativo del teléfono (la rueda de iOS o Android), que en móvil es más cómodo que uno propio.
- **Los montos se redondean a centavos** en cada línea, y se muestran sin decimales cuando son enteros (por ejemplo $18,450 o $437.50).
