# Flety → plataforma de servicios: rediseño del inicio + Grúas

> Documento de análisis y plan (etapa 0). **No se modificó código todavía.**
> Se aprueba este plan antes de cualquier cambio estructural.

## Cómo se organiza el trabajo (equipo de agentes)

| Agente | Responsabilidad | Entrega en este documento |
|---|---|---|
| 1. Director de producto | Entender Flety, definir cómo entra Grúas sin romper nada, coordinar | §1 Diagnóstico, §8 Decisiones |
| 2. Marketing y branding | Identidad, propuesta de valor, mensajes, diferenciar los dos servicios | §2 Marca y comunicación |
| 3. UX/UI mobile first | Nuevo inicio, flujos, componentes, navegación | §3 Inicio, §5 Flujos |
| 4. Arquitecto de software | Separación de negocios, datos, escalabilidad | §4 Arquitectura |
| 5. Desarrollo | Implementar por etapas respetando el stack | §6 Plan por etapas |
| 6. QA y testing | Regresiones, móviles, permisos, estados | §7 Plan de calidad |

En cada etapa los roles se encadenan así: Producto define → Marketing y UX diseñan → Arquitectura valida → Desarrollo implementa → QA revisa y aprueba antes de pasar a la siguiente.

---

## 1. Diagnóstico de Flety (Director de producto)

### Qué es hoy
Marketplace de fletes y mudanzas en Mendoza con tres apps en una (Expo + React Native, web y celular) sobre Supabase:

| Actor | Qué hace | Rutas |
|---|---|---|
| Cliente | Pide flete/mudanza (retiro, entrega con pin, tamaño, ayudantes, fecha, fotos), elige fletero o "cualquier empresa", sigue el viaje en vivo, chatea, califica, paga, historial, ayuda, cuenta | `/cliente/*` |
| Chofer | Disponible/no disponible, recibe solicitudes (reserva de 5 min), avanza etapas, navegación, cobro, historial y facturación, perfil, vehículo, seguro | `/chofer/*` |
| Empresa | Panel, cola de pedidos, flota, fichas de choferes, tarifas propias, cobros | `/empresa/*` |
| Flety (superadmin, contabilidad, marketing) | Aprobación de empresas, contabilidad, marketing, anuncios, soporte, verificación de seguros | `/empresa/*` |

**Datos:** 19 tablas en `public` (`orders`, `drivers`, `companies`, `tarifas`, `company_tarifas`, `pagos`, `seguros`, `calificaciones`, `mensajes`, …), máquina de estados del pedido en la base, reglas de acceso por fila en todas las tablas, tiempo real para seguimiento y chat.

**Código:** ~23.000 líneas en 46 pantallas y 55 componentes. Mapas con MapLibre/OpenFreeMap en web y react-native-maps en el celular. Rutas con OSRM y direcciones con Photon.

### Fortalezas a conservar
- Seguridad sólida (auditada): la lógica crítica vive en la base y no en la app.
- Componentes reutilizables: mapa, buscador de direcciones con pin, barra inferior, cuenta, ayuda, historial, chat, calificaciones.
- Tiempo real ya resuelto (seguimiento y chat).
- Identidad visual propia: amarillo + tinta, Bricolage Grotesque + Figtree, lienzo de puntos y paneles flotantes.

### Problemas y oportunidades
1. **El inicio está atado a fletes.** Hoy el cliente entra directo al mapa "¿Qué movemos hoy?". No hay lugar para un segundo servicio.
2. **Los roles son globales.** `users.role` es un solo valor (cliente, chofer, empresa…). Si se le agregara "gruista", Grúas quedaría acoplado a Flety. Hay que usar **membresías por negocio**.
3. **Las rutas no tienen espacio por negocio.** `/cliente`, `/chofer` y `/empresa` son de Flety. Grúas necesita su propio espacio (`/gruas/*`).
4. **El despacho es distinto.** Flety: el cliente elige un fletero (o va a la cola) y hay reserva de 5 minutos. Grúas: urgencia; se ofrece automáticamente a los prestadores más cercanos y gana el primero que acepta.
5. **Notificaciones.** Para Grúas es crítico que el prestador reciba la solicitud con la app cerrada. Eso pide **notificaciones push** (Expo Push, gratis), que hoy no existen.

### Cómo entra Grúas sin afectar Flety
- **Nada de lo existente cambia de lugar** en las primeras etapas: `/cliente`, `/chofer` y `/empresa` siguen igual, y "Solicitar flete" lleva al mismo flujo de hoy.
- Grúas vive en su **propio esquema de base de datos** y su **propio espacio de rutas**.
- Lo compartido se limita a la infraestructura: cuenta, mapa, direcciones, rutas, tiempo real, componentes visuales.

---

## 2. Marca y comunicación (Marketing y branding)

### Arquitectura de marca recomendada
**Flety** pasa a ser la plataforma (la app que se descarga). Adentro hay dos servicios con nombre propio:

| | **Flety Mudanzas** | **Flety Grúas** |
|---|---|---|
| Necesidad | Planificada: "tengo que mover cosas" | Urgente: "mi auto no anda / necesito trasladarlo" |
| Emoción | Tranquilidad, cuidado, organización | Rapidez, contención, seguridad |
| Color de acento | **Amarillo Flety** `#FFC233` (el actual) | **Naranja baliza** `#FF6B1A` (auxilio vial, urgencia, misma familia cálida) |
| Fondo de las pantallas del servicio | Claro (como hoy) | Oscuro: se usa mucho de noche y en la calle |
| Ícono | Camioneta con cajas | Grúa con plancha |

Se mantienen la tipografía, el estilo de íconos (Lucide, trazo 2), los radios grandes, los paneles flotantes y el lienzo de puntos: se nota que es la misma plataforma, pero cada servicio se reconoce al instante por el color.

> Alternativa a evaluar: azul eléctrico para Grúas (más contraste con el amarillo). Recomiendo el naranja porque comunica "auxilio" sin romper la paleta.

### Propuesta de valor
- **Plataforma:** "Resolvés traslados en Mendoza desde una sola app: lo que tenés que mover y el auto que no arranca."
- **Mudanzas:** "Empresas verificadas, precio antes de confirmar y tu carga en el mapa hasta que llega."
- **Grúas:** "Pedís, ves la grúa en el mapa y sabés cuánto tarda. Sin llamadas, sin vueltas."

### Textos del nuevo inicio (app)
- Saludo: **"Hola, Martín"** + **"¿Qué necesitás resolver hoy?"**
- Tarjeta Mudanzas: título **"Mudanzas y fletes"** · bajada "Muebles, electrodomésticos o tu casa entera, con empresas verificadas." · botón **"Solicitar flete"**
- Tarjeta Grúas: título **"Grúas"** · bajada "Auxilio y traslado de tu vehículo. Seguís la grúa en vivo." · botón **"Solicitar grúa"** · indicador "En minutos" (o "4 grúas cerca" cuando haya datos reales)
- Si hay algo en curso: tarjeta superior **"Tu flete está en camino · 8 min"** o **"Tu grúa llega en 6 min"**.

### Landing web (visitantes)
- Hero: **"Una app para mover lo que importa"** + subtítulo con los dos servicios + dos botones grandes (Mudanzas / Grúas).
- Una sección por servicio, con su color y su "cómo funciona" en 3 pasos.
- **"Trabajá con Flety":** dos caminos, fleteros/empresas de mudanzas y gruistas/empresas de auxilio.
- Se evitan frases genéricas ("la mejor solución", "líderes en…") y el tono es concreto, local y en voseo.

---

## 3. Nuevo inicio mobile first (UX/UI)

### Estructura (pantalla del cliente con sesión iniciada)
```
┌─────────────────────────────────┐
│ [flety]        📍 Godoy Cruz  (●)│  ← logo · ubicación · avatar → Cuenta
│                                 │
│ Hola, Martín                    │
│ ¿Qué necesitás resolver hoy?    │
│                                 │
│ ┌─ en curso ──────────────────┐ │  ← solo si hay un servicio activo
│ │ 🚚 Tu flete está en camino  │ │
│ │ Llega en 8 min · Ver   →    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [ilustración camioneta]     │ │  ← tarjeta grande, acento amarillo
│ │ Mudanzas y fletes           │ │
│ │ Muebles, electro o tu casa  │ │
│ │ [ Solicitar flete       → ] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [ilustración grúa]   ● 24 h │ │  ← tarjeta grande, acento naranja
│ │ Grúas                       │ │
│ │ Auxilio y traslado en vivo  │ │
│ │ [ Solicitar grúa        → ] │ │
│ └─────────────────────────────┘ │
│                                 │
│  Inicio   Actividad  Ayuda  Cuenta │ ← barra inferior global
└─────────────────────────────────┘
```

### Principios
- **Dos decisiones, nada más.** La pantalla no tiene mapa ni formularios: elegir un servicio es lo único que se pide.
- **Tarjetas grandes:** se tocan en cualquier parte, no solo en el botón; área mínima de 48 px.
- **Jerarquía clara:** saludo y pregunta → lo que está en curso (si hay) → los dos servicios.
- **Rápido:** carga sin esperar el mapa ni datos pesados; la ubicación se pide recién dentro de cada servicio.
- **Animación sutil:** las tarjetas entran con un leve desplazamiento y escala al tocarlas, igual que el resto de la app.
- **Escritorio:** las dos tarjetas lado a lado, con más aire; la barra superior reemplaza a la inferior.

### Navegación global
- **Barra inferior:** Inicio · Actividad · Ayuda · Cuenta.
- **Actividad:** dos pestañas, "Mudanzas" y "Grúas". Cada una lee su propio historial; los datos no se mezclan.
- **Ayuda:** el asistente sabe en qué servicio estás y usa la base de preguntas de ese negocio.
- **Cuenta:** una sola (perfil, pagos, seguridad), compartida entre los dos servicios.
- Dentro de cada servicio la pantalla toma el color de ese servicio y aparece una flecha "volver al inicio".

---

## 4. Arquitectura (Arquitecto de software)

### Principio rector
**Infraestructura compartida, negocio separado.** Se comparten cuenta, mapa, direcciones, rutas, tiempo real, componentes y diseño. **Nunca** se comparten tablas de pedidos, tarifas, prestadores, estados, comisiones ni reglas.

### 4.1 Base de datos: un esquema por negocio
```
public  (plataforma, compartido)   users · visitas · soporte · anuncios · config de plataforma
public  (Flety, sin cambios)       orders · drivers · companies · tarifas · pagos · seguros · …
gruas   (Grúas, nuevo)             todo lo de abajo
```
Un esquema separado (`gruas`) da aislamiento real: tablas, funciones y permisos propios, nombres sin choque, y la posibilidad de borrar o migrar el negocio entero sin tocar Flety. Supabase lo expone con `supabase.schema('gruas')`.

> Requiere un paso tuyo una sola vez: agregar `gruas` en "Exposed schemas" de la configuración de la API de Supabase (es gratis).

**Tablas de `gruas`:**

| Tabla | Para qué |
|---|---|
| `miembros` | Membresía en el negocio: `prestador`, `empresa`, `operador`, `admin`. **No toca `users.role` de Flety.** |
| `empresas` | Empresas de auxilio con flota (opcional: un gruista puede ser independiente) |
| `prestadores` | Conductor de grúa: verificación, disponible, ubicación, última señal |
| `unidades` | Cada grúa: patente, modalidad (plancha, arrastre, grúa para motos), capacidad, qué tipos de vehículo acepta |
| `documentos` | Licencia profesional, seguro, VTV/RTO, habilitación. Archivos en un bucket privado propio |
| `tipos_vehiculo` | Auto, camioneta/SUV, moto, utilitario, otro (editable) |
| `motivos` | No arranca, choque, pinchadura sin auxilio, traslado programado… (editable) |
| `zonas` | Zonas de cobertura (polígonos con PostGIS) |
| `tarifas` | Por zona y tipo de vehículo: base, por km, km mínimos, mínimo total |
| `recargos` | Nocturno, fin de semana, feriado, especiales (subsuelo, volcado, sin llaves…): porcentaje o monto fijo |
| `config` | Comisión de la plataforma, radio de búsqueda, segundos por oferta, intentos, reglas de cancelación |
| `solicitudes` | El servicio: cliente, origen, destino, vehículo, motivo, estado, prestador, unidad, **cotización congelada** (desglose del precio) |
| `ofertas` | A qué prestador se le ofreció, cuándo y qué respondió (el despacho queda registrado) |
| `eventos` | Historial de estados con hora (para reportes y reclamos) |
| `calificaciones`, `mensajes`, `pagos` | Propias de Grúas |

**Funciones en la base (las reglas no viven en la app):**
- `gruas.cotizar(origen, destino, tipo_vehiculo, extras)` arma el precio con tarifas, zona, recargos y comisión.
- `gruas.solicitar(...)` crea la solicitud con la cotización congelada y arranca el despacho.
- `gruas.despachar(solicitud)` busca prestadores disponibles con PostGIS (cercanía, unidad compatible, documentación vigente) y crea ofertas.
- `gruas.aceptar(oferta)` es atómica: si dos aceptan a la vez, gana uno solo.
- `gruas.avanzar(solicitud, estado)` aplica la máquina de estados (quién puede pasar a qué estado).
- Tarea automática con **pg_cron** (gratis): vence las ofertas sin respuesta, amplía el radio, reintenta y, si no hay nadie, pasa a "sin grúas disponibles".

### 4.2 Estados de una solicitud de grúa
```
buscando ──► asignada ──► en_camino ──► en_origen ──► trasladando ──► finalizada
   │            │             │             │
   ├──► sin_grua (nadie aceptó)             │
   └──► cancelada_cliente / cancelada_prestador / cancelada_admin  (con reglas propias de penalidad)
```
"Solicitud enviada" es lo que ve el cliente mientras está en "buscando" (a cuántas grúas se les ofreció).

### 4.3 Frontend: plataforma + módulos de negocio
```
src/
  plataforma/          registro de servicios, inicio, actividad, tema por servicio
  shared (existente)   componentes, mapa, geocoding, routing, realtime, cuenta, ayuda
  app/cliente, chofer, empresa   Flety, sin cambios
  app/inicio.tsx       nuevo selector de servicios
  app/gruas/...        cliente de Grúas (solicitar, seguimiento, historial)
  app/gruas-prestador/ app del gruista
  modulos/gruas/       lib, hooks y componentes propios de Grúas
```
- **Registro de servicios** (`plataforma/servicios.ts`): cada negocio declara nombre, color, ícono, rutas y si está activo. Sumar un tercer negocio es agregar una entrada y su módulo, sin rehacer el inicio.
- **Tema por servicio:** el color de acento sale del servicio activo (amarillo o naranja) y se usan los mismos componentes.
- **Ayuda:** el mismo asistente, con una base de preguntas propia por negocio.
- **Panel de administración:** selector **"Negocio: Flety | Grúas"** en la barra lateral, con secciones separadas para cada uno (Grúas: operaciones en vivo, prestadores, documentación, tarifas y zonas, recargos, reportes, pagos y comisiones).

### 4.4 Tiempo real y ubicación (pensado para crecer)
- La ubicación del gruista viaja por **Realtime Broadcast**, sin escribir en la base cada pocos segundos. Se guarda cada tanto para el despacho.
- La búsqueda de grúas cercanas usa un índice geográfico (PostGIS).
- **Notificaciones push** (Expo Push) para ofertas y cambios de estado. En la web: aviso dentro de la app con sonido mientras esté abierta.

### 4.5 Pagos
Mismo criterio que acordamos para Flety: se cobra **al solicitar** con Mercado Pago (reserva o cobro), con split y una comisión propia de Grúas configurable. El módulo de pagos es compartido, pero cada negocio tiene sus montos, comisión y reglas de cancelación. Hasta integrar Mercado Pago, Grúas puede arrancar en modo prueba.

---

## 5. Flujos

### 5.1 Cliente: pedir una grúa (mobile first, mapa al centro)
1. **Inicio → "Solicitar grúa".** Mapa a pantalla completa con tu ubicación y las grúas disponibles cerca (puntos naranjas).
2. **¿Dónde está el vehículo?** Arranca en tu ubicación; podés mover el pin o buscar una dirección.
3. **¿A dónde lo llevamos?** Destino (taller, casa, concesionaria) con buscador; opcional "todavía no sé" (se cotiza un mínimo y se ajusta).
4. **Vehículo y motivo** en una hoja inferior: tipo (íconos grandes), marca, modelo, patente (opcional), motivo (chips) y comentario.
5. **Precio y tiempo estimado** con el desglose (base, km, recargo nocturno…) → **"Solicitar grúa"** (más adelante, con pago).
6. **Buscando:** animación sobre el mapa con "Se lo ofrecimos a 3 grúas cerca" y botón para cancelar gratis.
7. **Grúa asignada:** foto y nombre del gruista, calificación, patente de la grúa, llegada estimada y chat.
8. **En camino → En el punto → Trasladando → Finalizado,** con la grúa moviéndose en el mapa y una línea de tiempo.
9. **Fin:** resumen, comprobante y calificación.

### 5.2 Gruista (prestador)
1. **Alta:** cuenta → "Quiero ser gruista" → datos personales → su grúa (patente, modalidad, capacidad, tipos que acepta) → documentos → revisión de Flety.
2. **Panel oscuro, con mapa:** interruptor Disponible / No disponible.
3. **Oferta entrante:** pantalla completa con sonido y vibración, distancia al vehículo, tipo, motivo, destino, ganancia estimada y cuenta regresiva (por ejemplo, 30 s). **Aceptar** o **Rechazar**.
4. **En servicio:** botón grande para la próxima etapa (Salí → Llegué → Cargué, trasladando → Entregué), navegación con un toque y chat con el cliente.
5. **Historial y ganancias:** por día, semana y mes; liquidaciones y comisiones.
6. **Perfil, documentación y vencimientos** con avisos antes de que venzan (reutiliza lo hecho para el seguro de Flety).

### 5.3 Administración Grúas
- Mapa de operaciones en vivo (solicitudes y grúas).
- Prestadores: aprobación, documentos, suspensión.
- Tarifas, zonas, recargos, tipos de vehículo, motivos y comisión, **editables sin tocar código**.
- Reportes: solicitudes, tiempos de llegada, tasa de aceptación, cancelaciones, facturación y comisiones.

---

## 6. Plan por etapas (Desarrollo)

Cada etapa termina con revisión de QA y tu aprobación antes de la siguiente. Todo dentro de los planes gratuitos.

| Etapa | Qué se hace | Qué ves al terminar | Riesgo para Flety |
|---|---|---|---|
| **1. Base de la plataforma** | Registro de servicios, tema por servicio, estructura de carpetas, notificaciones push (base) | Nada visible todavía | Nulo |
| **2. Nuevo inicio + landing** | Selector de servicios (app), Actividad con pestañas, landing con los dos servicios. Grúas aparece como "Muy pronto" | El inicio nuevo; "Solicitar flete" sigue igual | Bajo (se prueba todo el flujo de Flety) |
| **3. Datos y precios de Grúas** | Esquema `gruas`, tablas, cotizador, panel para configurar tarifas, zonas, recargos, tipos y comisión | Panel de configuración de Grúas | Nulo (esquema aparte) |
| **4. Gruistas** | Alta, unidades, documentos, verificación, panel con disponibilidad | Un gruista se registra y vos lo aprobás | Nulo |
| **5. Pedir grúa + despacho en vivo** | Flujo del cliente, despacho automático, ofertas, aceptación atómica, seguimiento en vivo, estados, chat | El circuito completo con dos cuentas de prueba | Nulo |
| **6. Operación y reportes** | Mapa de operaciones, historial y ganancias del gruista, reportes, calificaciones, cancelaciones con reglas | Grúas listo para operar | Nulo |
| **7. Pagos** | Mercado Pago con split y comisión por negocio, en modo prueba (sirve para Flety y Grúas) | Cobro al solicitar, con tarjetas de prueba | Medio (toca el pago de Flety; se prueba a fondo) |

---

## 7. Calidad (QA y testing)

En **cada** etapa:
- **Verificación automática del código:** tipos y reglas de estilo; la versión de producción tiene que compilar.
- **Regresión de Flety:** recorrer el flujo completo (inicio → pedir → elegir fletero → seguimiento → calificar → pagar) y las demos de chofer y empresa.
- **Responsive:** todas las pantallas en 320, 360, 768 y 1280 px, sin textos cortados ni desbordes (la herramienta automática que usamos en la auditoría).
- **Seguridad de la base:** sin cuenta no se ve ni se escribe nada; un cliente no ve solicitudes ajenas; un gruista solo ve sus ofertas; nadie puede saltear estados ni cambiar precios.
- **Estados y concurrencia (Grúas):** dos gruistas aceptan a la vez y gana uno; las ofertas vencen; cancelaciones en cada estado.
- **Notificaciones y permisos:** ubicación denegada, push denegado, app en segundo plano.
- **Independencia:** cambiar tarifas o la comisión de Grúas no altera ningún precio de Flety, y viceversa.

---

## 8. Decisiones para aprobar (Director de producto)

1. **Marca:** Flety como plataforma, con "Flety Mudanzas" y "Flety Grúas". El acento de Grúas sería naranja baliza (o azul).
2. **Prestadores de grúa:** independientes **y** empresas de auxilio con flota (como Flety). ¿O solo uno de los dos al principio?
3. **Asignación:** automática al más cercano (gana el primero que acepta). Más adelante se puede sumar que el cliente elija.
4. **Zona inicial:** Gran Mendoza.
5. **Precio:** cotización cerrada al solicitar, con adicionales que el cliente aprueba en la app si aparecen en el lugar (por ejemplo, el vehículo está en un subsuelo).
6. **Orden:** las etapas como están, o adelantar Grúas (3 a 5) antes del nuevo inicio.
7. **Paso técnico tuyo:** agregar el esquema `gruas` a "Exposed schemas" en Supabase cuando llegue la etapa 3. Te guío.
