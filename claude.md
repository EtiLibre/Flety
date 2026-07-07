# Flety — Especificación del Proyecto

## 1. Resumen

Plataforma tipo marketplace para fletes, mudanzas y transporte de larga distancia. Conecta clientes con empresas de mudanza, retiene el pago hasta confirmar el servicio, y lo libera a la empresa correspondiente.

## 2. Arquitectura de plataforma (definición clave)

El proyecto se construye como **un solo código base** que cubre tres formatos:

1. **Página web:** sitio accesible desde cualquier navegador, sin instalación. Sirve para SEO, acceso rápido, y paneles de escritorio (Empresa, Contabilidad, Super Admin).
2. **PWA (Progressive Web App):** el mismo sitio, con `manifest.json` y `service worker`, instalable desde el navegador (ícono en pantalla de inicio, funciona parcialmente offline) sin pasar por Google Play / App Store.
3. **Capacitor:** empaqueta ese mismo código como app nativa real (.apk / .ipa) para publicar en Google Play y App Store, habilitando funciones nativas necesarias para choferes (GPS en segundo plano, notificaciones push confiables, cámara).

**Por qué esta combinación:** se programa la interfaz y la lógica una sola vez, y se cubren los tres canales de acceso (web, instalable sin tienda, e instalable vía tienda oficial) sin triplicar el trabajo de desarrollo.

---

## 3. Roles y permisos

| Rol | Ve | Puede hacer |
|---|---|---|
| **Super Admin** | Todo: usuarios, empresas, choferes, pedidos, pagos, comisiones | Alta/baja de empresas, configurar comisiones, resolver disputas, ver reportes globales |
| **Empresa de mudanzas** | Sus propios choferes, pedidos asignados a su empresa | Gestionar disponibilidad de choferes, aceptar/rechazar pedidos, asignar chofer a pedido |
| **Chofer/Fletero** | Sus pedidos asignados | Marcar disponible/no disponible, aceptar viaje, actualizar estado (en camino, cargando, entregado) |
| **Cliente/Usuario** | Sus propios pedidos, historial | Pedir flete/mudanza/larga distancia, pagar, calificar, chatear con IA |
| **Contabilidad** | Movimientos de dinero, liquidaciones, comisiones | Ver reportes, exportar datos, conciliar pagos con empresas (sin editar operación) |

> Nota de diseño: en el modelo de datos, cada usuario tiene un `role` y opcionalmente un `companyId` (para Empresa y Chofer). Esto permite agregar roles nuevos sin reescribir la lógica de permisos.

> **Curaduría, no alta libre:** a diferencia de un marketplace abierto, ninguna empresa puede empezar a operar sin aprobación manual del Super Admin (verificación de CUIT, documentación, seguro de mercadería). Flety no es "cualquiera se registra y ya publica" — es una red curada de empresas verificadas. Esto es una decisión de producto, no solo un filtro técnico: es lo que diferencia a Flety de un marketplace abierto de fletes.

---

## 4. Flujo principal del cliente

1. Login (patrón heredado/mejorado de Etify: Firebase Auth, Google + email/contraseña, verificación de email).
2. Pantalla principal: mapa con ubicación del usuario + **chat IA flotante** en la parte inferior.
3. El chat entiende la necesidad (flete / mudanza / larga distancia) y arma la cotización, o el usuario elige manualmente.
4. Confirmación de pedido → **pago a la plataforma** (no directo a la empresa).
5. Plataforma retiene el fondo (vía modo *marketplace/split* del proveedor de pagos, no en cuenta propia).
6. Empresa asignada realiza el servicio, chofer actualiza estados.
7. Cliente confirma entrega (o se auto-confirma tras X horas) → se libera el pago a la empresa, menos comisión de la plataforma.
8. Calificación mutua (cliente ↔ empresa/chofer).

---

## 5. Modelo de datos (borrador inicial)

```
users
  - id, email, nombre, role (superadmin | empresa | chofer | cliente | contabilidad)
  - companyId (si aplica)
  - authProvider, emailVerified, avatar

companies
  - id, nombre, cuit, estadoAprobacion
  - paymentGatewayConfig (credenciales/ID de marketplace en Mercado Pago)
  - comisionPct

drivers
  - id, userId, companyId, disponibilidad, ubicacionActual, vehiculo

orders
  - id, clienteId, companyId, driverId
  - tipo (flete | mudanza | larga_distancia)
  - origen, destino, estado (pendiente | pagado | asignado | en_curso | entregado | cancelado)
  - montoTotal, montoRetenido, montoLiberado
  - paymentId (referencia externa a Mercado Pago)

payments
  - id, orderId, estado (retenido | liberado | reembolsado)
  - montoPlataforma, montoEmpresa

chatSessions
  - id, userId, historial, contexto (preferencias, pedidos previos)
```

---

## 6. Pantallas y pestañas por rol

### 6.1 Cliente/Usuario

| Pantalla | Contenido / acciones |
|---|---|
| **Login / Registro** | Email+contraseña, login con Google, verificación de email, recuperar contraseña |
| **Home (mapa)** | Mapa con ubicación actual, botón "Pedir servicio", chat IA flotante fijo abajo |
| **Nuevo pedido — Tipo de servicio** | Selección: Flete / Mudanza / Larga distancia (tarjetas con ícono y descripción corta) |
| **Nuevo pedido — Detalle** | Origen (autocompletar con mapa), destino, fecha/hora, tipo de carga, tamaño estimado (según tipo de servicio), fotos opcionales de la carga |
| **Cotización** | Precio estimado, tiempo estimado, empresa/chofer sugerido (o "buscando disponibilidad") |
| **Checkout / Pago** | Resumen del pedido, medio de pago (Mercado Pago), botón confirmar y pagar |
| **Seguimiento en curso** | Mapa con ubicación del chofer en tiempo real, estado del pedido (línea de tiempo), botón de chat/llamada con el chofer, botón "Cancelar" (con condiciones) |
| **Confirmación de entrega** | Botón "Confirmar que recibí el servicio", calificación (estrellas + comentario) |
| **Historial de pedidos** | Lista de pedidos pasados, estado, recibo/factura, opción de repetir pedido |
| **Perfil** | Datos personales, direcciones guardadas, medios de pago guardados, cambiar contraseña |
| **Soporte / Chat IA** | Historial de conversación, contexto de pedidos activos, escalamiento a soporte humano |

### 6.2 Chofer/Fletero

| Pantalla | Contenido / acciones |
|---|---|
| **Login** | Mismo sistema, pero cuenta vinculada a una empresa (`companyId`) |
| **Estado de disponibilidad** | Switch "Disponible / No disponible", visible para la empresa en tiempo real |
| **Pedidos entrantes** | Notificación de nuevo pedido asignado, con datos básicos (origen, destino, tipo), botón aceptar/rechazar |
| **Pedido activo** | Mapa con ruta hacia origen y luego destino, botones de cambio de estado ("Llegué al origen", "Cargando", "En camino", "Entregado"), datos de contacto del cliente |
| **Historial de viajes** | Pedidos completados, calificaciones recibidas |
| **Perfil / Vehículo** | Datos del chofer, datos del vehículo, documentación (licencia, seguro) |

### 6.3 Empresa de mudanzas

| Pantalla | Contenido / acciones |
|---|---|
| **Dashboard** | Pedidos activos, choferes disponibles ahora mismo, ingresos del período |
| **Gestión de choferes** | Alta/baja de choferes, ver disponibilidad de cada uno en un mapa, asignar manualmente un pedido a un chofer específico |
| **Pedidos entrantes** | Cola de pedidos asignados a la empresa (por el algoritmo o elegidos manualmente), aceptar/rechazar, reasignar |
| **Historial y facturación** | Pedidos completados, montos liquidados, montos pendientes de liberación, descarga de comprobantes |
| **Configuración de la empresa** | Datos fiscales (CUIT), zonas de cobertura, tipos de servicio que ofrece, configuración de la cuenta de cobro (vinculación con Mercado Pago Marketplace) |
| **Calificaciones** | Reseñas recibidas de clientes, por chofer y generales |

### 6.4 Super Admin

| Pantalla | Contenido / acciones |
|---|---|
| **Dashboard general** | Métricas globales: pedidos totales, GMV, comisiones generadas, empresas activas, usuarios activos |
| **Gestión de empresas** | Alta/aprobación/baja de empresas, ver estado de documentación, configurar % de comisión por empresa |
| **Gestión de usuarios** | Ver/buscar todos los usuarios (clientes, choferes, empresas), bloquear/desbloquear cuentas |
| **Gestión de pedidos** | Ver todos los pedidos del sistema, filtrar por estado/empresa/fecha, intervenir manualmente en casos problemáticos |
| **Disputas** | Bandeja de reclamos (cliente vs. empresa), historial del pedido en disputa, decisión de liberar/reembolsar/repartir el pago |
| **Configuración global** | Comisión por defecto, textos legales (T&C, privacidad), parámetros de la IA del chat |
| **Reportes** | Exportables (CSV/Excel) de operación, financieros y de uso |

### 6.5 Contabilidad

| Pantalla | Contenido / acciones |
|---|---|
| **Dashboard financiero** | Fondos retenidos, fondos liberados, comisiones acumuladas, por período |
| **Liquidaciones a empresas** | Detalle de qué se le debe pagar a cada empresa y cuándo, estado (pendiente/liquidado) |
| **Conciliación de pagos** | Cruce entre pedidos, pagos en Mercado Pago y liquidaciones — solo lectura, sin poder alterar pedidos |
| **Exportación contable** | Reportes descargables para uso con sistemas contables externos |

---

## 7. Procesos detallados

### 7.1 Ciclo de vida de un pedido (estados)

```
pendiente → pagado → buscando_asignacion → asignado → en_camino_origen
→ cargando → en_camino_destino → entregado → confirmado → liquidado

Estados alternativos:
- cancelado_cliente (antes de "asignado", con posible penalidad)
- cancelado_empresa (empresa rechaza, vuelve a buscar otra)
- en_disputa (cliente reporta problema tras "entregado")
- reembolsado (resolución de disputa a favor del cliente)
```

Cada cambio de estado dispara: (a) actualización en la base de datos, (b) notificación push a las partes relevantes, (c) evento de log para trazabilidad/auditoría.

### 7.2 Ciclo de vida de un pago

```
1. Cliente confirma pedido → se crea "orden de pago" en Mercado Pago Marketplace.
2. Cliente paga → estado del pago: "retenido" (fondos en custodia del proveedor de pago).
3. Pedido avanza hasta "entregado".
4. Cliente confirma recepción (o vence el plazo de auto-confirmación, ej. 48hs) → 
   se dispara la orden de liberación vía API.
5. Proveedor de pago transfiere: 
   - % comisión → cuenta de la plataforma
   - resto → cuenta de la empresa
6. Estado del pago pasa a "liberado".

Camino alternativo (disputa):
3b. Cliente reporta problema → pedido pasa a "en_disputa", pago queda "retenido" 
    (no se libera hasta resolución).
4b. Super Admin revisa el caso → decide: liberar completo, reembolsar completo, 
    o split parcial.
```

### 7.3 Asignación de chofer/empresa a un pedido

Dos modos posibles (a definir cuál usar primero, se puede empezar simple e ir sumando):

- **Modo manual/simple (Fase 1):** el pedido entra a una cola visible para las empresas de la zona; la primera que lo acepta se lo queda.
- **Modo automático (Fase posterior):** algoritmo que prioriza por cercanía del chofer disponible, calificación, y carga de trabajo actual de la empresa — similar a cómo asignan viaje las apps de transporte.

### 7.4 Flujo del chat con IA

```
1. Usuario escribe/habla en el chat flotante (ej. "necesito llevar un sillón 
   y una heladera mañana a la tarde").
2. El backend arma el prompt combinando: mensaje del usuario + contexto 
   (ubicación, pedidos previos, dirección guardada) + historial de la conversación.
3. Se llama a la API de Claude con ese contexto.
4. La IA responde de forma conversacional Y, cuando tiene datos suficientes, 
   devuelve también una estructura (JSON) con: tipo de servicio sugerido, 
   origen/destino detectado, fecha/hora, ítems a trasladar.
5. Esa estructura se usa para prellenar el formulario de "Nuevo pedido", 
   que el usuario confirma o ajusta antes de pagar.
6. La IA nunca confirma el pedido ni ejecuta el pago por sí sola — 
   siempre hay un paso de confirmación humana antes de cobrar.
```

### 7.5 Cancelaciones

- **Antes de "asignado":** cancelación libre o con penalidad menor (a definir %).
- **Después de "asignado", antes de "en_camino_origen":** penalidad intermedia (el chofer ya se movilizó o reservó el horario).
- **Después de "en_camino_origen":** cancelación con penalidad mayor o no reembolsable, salvo excepción validada por Super Admin.

### 7.6 Calificaciones

- Bidireccional: cliente califica a empresa/chofer, y empresa/chofer puede calificar al cliente (útil para detectar clientes problemáticos).
- Calificación obligatoria para poder pedir un nuevo servicio si hay calificaciones pendientes acumuladas (opcional, a definir).

---

## 8. Matriz de notificaciones

| Evento | Cliente | Chofer | Empresa | Super Admin |
|---|---|---|---|---|
| Pedido pagado | ✅ confirmación | — | ✅ nuevo pedido disponible | — |
| Pedido aceptado por empresa | ✅ "tu pedido fue aceptado" | ✅ si ya se asignó chofer | — | — |
| Chofer en camino | ✅ | — | — | — |
| Cambios de estado (cargando, en camino, etc.) | ✅ | — | ✅ (opcional, resumen) | — |
| Pedido entregado | ✅ pedir confirmación/calificación | ✅ resumen | ✅ | — |
| Pago liberado | — | — | ✅ | — |
| Disputa iniciada | ✅ confirmación de reclamo recibido | — | ✅ notificación de reclamo | ✅ alerta para revisar |
| Cancelación | ✅/✅ según quién cancela | ✅ si ya estaba asignado | ✅ | — |

---

## 9. Stack técnico propuesto

| Capa | Tecnología |
|---|---|
| Frontend | React / Next.js (una base para web, PWA y Capacitor) |
| Empaquetado móvil | Capacitor (Android/iOS desde el mismo código) |
| Auth | Firebase Authentication (base heredada de Etify) |
| Base de datos | Firestore o Supabase |
| Mapas | Google Maps API (geolocalización, rutas) |
| Pagos | Mercado Pago Marketplace / Split de pagos (ver punto 10.1 — pendiente de confirmar el modelo exacto de retención) |
| Chat IA (cliente) | API de Claude o GPT, llamada directa desde el backend de la app (no vía n8n, por latencia) |
| Automatizaciones internas | n8n — para flujos disparados por eventos: liquidaciones, notificaciones a empresas/contabilidad, sincronización con planillas, alertas de disputa |
| Notificaciones push | Firebase Cloud Messaging (vía Capacitor en nativo) |

---

## 10. Decisiones de negocio y zonas grises a resolver

### 10.1 Retención de pagos con Mercado Pago — pendiente de confirmar

Mercado Pago ofrece **Split de pagos** para marketplaces, que reparte automáticamente el cobro entre la plataforma y la empresa al momento del pago. Sin embargo, ese split parece ejecutarse **inmediatamente**, no queda en una retención condicionada esperando confirmación de entrega (a diferencia de lo que ofrecen algunas plataformas empresariales tipo VTEX).

Para lograr el modelo que se busca ("la plataforma retiene y libera al finalizar el servicio"), hay dos caminos:

- **Opción A:** el pago completo ingresa primero a la cuenta de Mercado Pago de la plataforma, y se transfiere a la empresa vía API cuando el pedido se confirma. Da el control deseado, pero implica que dinero de terceros pasa por la cuenta de la plataforma (relevante para el punto 10.2 y para la carga impositiva/contable).
- **Opción B:** usar el split automático de Mercado Pago (la plata se reparte al momento del pago) y manejar los conflictos post-entrega vía reembolsos parciales, no vía retención previa.

**Acción pendiente:** confirmar con el equipo de integraciones de Mercado Pago cuál es el modelo real disponible antes de definir la arquitectura de pagos en el código.

### 10.2 Responsabilidad del traslado vs. control del dinero

El objetivo es que la responsabilidad legal del transporte (daños, demoras, seguro de la carga) sea de las empresas asociadas, no de la plataforma. Esto se sostiene con:

- Términos y condiciones que posicionan a Flety como intermediario tecnológico (el cliente contrata a la empresa, no a Flety).
- Contrato con cada empresa asociada donde asume responsabilidad total por la operación y exige seguro de mercadería vigente como condición de alta.

**Tensión a tener en cuenta:** cuanto más controle la plataforma el dinero (reteniéndolo, decidiendo cuándo liberarlo) y la operación (asignación de choferes, fijación de precios), más se puede interpretar en un conflicto legal que Flety no es un simple intermediario sino que ejerce control real del servicio — es la misma discusión legal que enfrentan Uber y PedidosYa en distintos países. Esto no es asesoramiento legal; se recomienda definir la arquitectura de pagos y el texto contractual con un abogado especializado antes del lanzamiento.

### 10.3 Curaduría de empresas (diferencial de posicionamiento)

Flety no es un marketplace de alta libre. Toda empresa pasa por aprobación manual del Super Admin (verificación de CUIT, documentación, seguro) antes de poder operar. Esto es intencional: el objetivo es una red curada y confiable, no una vidriera abierta de oferta y demanda sin control de calidad.

### 10.4 Región de lanzamiento

- **Argentina, inicio en Mendoza.**
- Fase 1: empresas de mudanza/despacho ya establecidas y verificadas.
- Fase 2 (posterior): apertura a fleteros/choferes independientes, una vez validado el proceso con empresas formales.

---

## 11. Roadmap sugerido

**Fase 1 — Base**
- Login (mejora de patrón Etify) + roles.
- CRUD de empresas y choferes (Super Admin), con flujo de aprobación/verificación de empresas.
- Pantalla de pedido simple (sin mapa en tiempo real todavía).
- Lanzamiento acotado a Mendoza, con un número reducido de empresas de mudanza/despacho ya establecidas.

**Fase 2 — Operación**
- Mapa + geolocalización en tiempo real.
- Asignación de pedidos a empresa/chofer.
- Estados de pedido y notificaciones.

**Fase 3 — Pagos**
- Definir y confirmar con Mercado Pago el modelo real de retención/split (ver 10.1).
- Panel de Contabilidad.

**Fase 4 — Diferencial**
- Chat IA flotante personalizado (Claude/GPT) + automatizaciones internas con n8n.
- Empaquetado con Capacitor + publicación en tiendas.

**Fase 5 — Expansión**
- Apertura a choferes/fleteros independientes (terceros), fuera de la red de empresas formales.
- Evaluar expansión a otras ciudades de Argentina.

---

## 12. Preguntas abiertas

- Modelo de choferes: empleados en relación de dependencia, independientes, o mixto (asumido mixto; los independientes recién en Fase 5).
- Modelo exacto de retención de pagos en Mercado Pago — pendiente de confirmar con su equipo de integraciones (ver 10.1).
- Texto contractual y de T&C para blindar la responsabilidad hacia las empresas — pendiente de definir con abogado (ver 10.2).
- ¿La plataforma cobra comisión fija o variable por tipo de servicio (flete / mudanza / larga distancia)?
- Criterios concretos de verificación para aprobar una empresa (documentación, seguro mínimo, antigüedad).
