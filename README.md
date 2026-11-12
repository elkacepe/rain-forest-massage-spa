# Rain Forest Massage Spa · Sesiones y liquidaciones

Webapp para registrar cada sesión y liquidar lo que le corresponde a cada terapeuta. Pensada para el móvil (probada a 360 px). React 18 + Tailwind CSS 3 + Vite. Sin backend: todo vive en `localStorage`.

## Uso

```bash
npm install
npm run dev     # desarrollo
npm test        # 13 tests del motor de cálculo, agenda y persistencia
npm run build   # genera un único dist/index.html (con las fuentes incluidas)
```

**Clave del panel:** `selva2026` (en `src/lib/constants.js`, `PANEL_KEY`). Es una clave compartida que se valida en el navegador. No hay cuentas individuales, alta de usuarios ni recuperación de acceso. El rol se elige con un selector y no es autenticación real.

**Clave de almacenamiento:** `rainforest-spa.liquidaciones.v1`. El rol activo va en `sessionStorage` (`rainforest-spa.rol.v1`).

## Pantallas (10)

| # | Pantalla | Roles |
|---|---|---|
| 1 | Acceso (clave + rol) | todos |
| 2 | Agenda por día | Recepción y Dirección: todas las terapeutas. Terapeuta: solo la suya |
| 3 | Nueva sesión (con horarios libres calculados) | Recepción, Dirección |
| 4 | Detalle de sesión (realizada, cancelación con hora del aviso, no se presentó, propina, notas) | todos (la terapeuta solo ve las suyas y no puede editarlas) |
| 5 | Mi quincena («Esta quincena llevás…», escalón, mis recibos) | Terapeuta |
| 6 | Liquidación (Abierta → En revisión → Aprobada → Pagada) | Dirección |
| 7 | Recibo, sesión por sesión, + Compartir por WhatsApp | Dirección; la terapeuta solo ve el suyo |
| 8 | Adelantos | Dirección |
| 9 | Panel de métricas | Dirección |
| 10 | Ajustes (comisiones, tarifas, viáticos, especialidades, restaurar) | Dirección |

Cada lista tiene su estado vacío (día sin sesiones, quincena sin movimientos, sin adelantos, sin recibos, panel sin datos). También hay una pantalla de error si los datos guardados no se pueden leer.

Recepción no ve porcentajes, comisiones, viáticos ni métricas.

## Reglas implementadas (`src/lib/engine.js`, `src/lib/schedule.js`)

- **Comisión base:** 35 % en cabina y 45 % a domicilio, sobre el precio guardado en la sesión.
- **Escalón por quincena:** las sesiones Realizadas se ordenan por fecha y hora. Los primeros $40,000 de ventas pagan la tasa base y el excedente paga 5 puntos más. Si una sesión cruza el tope, se divide: una parte paga la tasa base y la otra la tasa con escalón.
- **Viático:** el importe fijo de la colonia, solo en sesiones a domicilio Realizadas.
- **Propinas:** van al 100 % para la terapeuta y no cuentan para el escalón.
- **Cancelación con menos de 3 h o No se presentó:** se le cobra al cliente el 50 % de la tarifa, la terapeuta recibe el 20 % y la sesión no suma para el escalón. Recepción carga la hora en que avisó el cliente y la app decide si la cancelación fue a tiempo o con cargo.
- **Cancelación con 3 h o más:** sin cargo y sin pago.
- **Neto** = comisiones (incluido el 20 % de las cancelaciones) + viáticos + propinas − adelantos − «A descontar».
- **Adelantos:** el total no puede pasar del 40 % de lo ganado en la quincena, donde lo ganado son comisiones + viáticos + propinas. Cada adelanto nuevo se compara con *(40 % de lo ganado) − adelantos ya registrados*, así varios adelantos chicos no pueden superar el tope. Si se rechaza, la app muestra el motivo con los montos. Si el neto queda negativo, el saldo pasa a la quincena siguiente como «A descontar».
- **Quincenas:** van del 1 al 15 y del 16 a fin de mes. Una quincena se abre sola con el primer registro que cae en sus fechas. En revisión ya no se pueden cargar ni modificar sesiones ni adelantos, y se puede reabrir. Al Aprobar se guarda una copia de todos los montos (filas, líneas y tasas), así que cambiar tarifas después no la mueve. Pagada exige fecha de pago. Para aprobar una quincena, la anterior tiene que estar aprobada antes, por el arrastre.
- **Agenda:** cada cabina admite una sesión por vez y queda ocupada por la duración más 15 min de preparación. Una terapeuta en cabina queda ocupada por la duración más los 15 min de preparación. Una terapeuta a domicilio queda bloqueada 45 min antes y 45 min después. La sesión tiene que empezar y terminar dentro del horario: de lunes a viernes de 9 a 18 y sábados y domingos de 9 a 20. Las cancelaciones liberan el lugar. Cada masaje solo se puede asignar a quien lo tiene entre sus especialidades.
- **Notas:** rechazan términos de salud (lesión, embarazo, dolor, etc.).

### Métricas

- **Ingresos:** ventas realizadas + cargos por cancelación. Las propinas no cuentan porque van directo a la terapeuta.
- **% en comisiones:** comisiones ÷ ingresos.
- **Ticket promedio:** ventas ÷ sesiones realizadas.
- **Ocupación de cabinas:** minutos de sesiones realizadas en cabina (duración + preparación) ÷ minutos de apertura × 3 cabinas, desde el inicio de la quincena hasta hoy.
- **% de cancelaciones:** canceladas (las tres variantes) ÷ sesiones ya cerradas (sin contar Agendadas).
- **Ranking:** ventas y neto por terapeuta.

## Persistencia

- La semilla se carga **solo** si no existe la clave propia. Una lista guardada vacía se respeta.
- La app guarda primero y recién después muestra el éxito. Si `localStorage` falla, el estado no cambia (códigos, cantidades y estados quedan igual) y el formulario conserva lo escrito.
- «Restaurar datos de prueba» (en Ajustes) pide confirmación y reemplaza solo la clave de esta app.

## Caso del briefing (semilla sintética)

La semilla arma la quincena en curso (o la anterior, si la actual tiene menos de 9 días) con:

- **Valentina Robledo** supera el escalón: $43,800 en ventas, $3,800 de excedente y $190 de extra (5 % de $3,800).
- **Mariana Olvera** con seis domicilios en Polanco: 6 × $220 = $1,320 de viáticos.
- **Lucía Ferrer** con dos cancelaciones sobre la hora: Terapéutico 90 min a $1,600, el cliente paga $800 por cada una y ella cobra $320 por cada una.
- **Camila Ibarra** con un adelanto de $2,500 de la semana pasada, que se descuenta en la misma liquidación.
- **Renata Solís** con una ausencia, una cancelación a tiempo y un domicilio en Del Valle.
- Una quincena anterior ya Pagada, para tener recibos históricos.

Con la semilla del 12/11/2026, los netos son: Valentina $19,540 · Mariana $6,987.50 · Lucía $9,945 · Camila $9,740 · Renata $3,952.50 → total $50,165. Las propinas de la semilla dependen de la fecha en que se genera.

Para reproducirlo: entrá como Dirección → Liquidación → Valentina (ver el detalle sesión por sesión) → Pasar a revisión → Aprobar → Compartir por WhatsApp.

Todos los nombres de terapeutas y clientes son sintéticos. Los precios son los que publica el negocio y el resto de los valores es de prueba.
