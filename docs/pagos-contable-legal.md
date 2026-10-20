# Flety — Cobros, retención y liberación del dinero (contable y legal)

> Documento de trabajo para decidir con contador, abogado y Mercado Pago.
> **No es asesoramiento legal ni contable.** Los puntos marcados "a confirmar" hay que validarlos antes de programar los pagos.

## 1. Lo que se busca

El cliente paga al pedir, la plata queda "en garantía" mientras se hace el viaje, y se libera a la empresa cuando el cliente confirma la entrega (o pasan 48 h sin reclamo). Si hay un problema, Flety decide: liberar, devolver o repartir. Flety se queda con su comisión.

## 2. Las dos formas de hacerlo

| | **A. Flety cobra todo y después transfiere** | **B. La empresa cobra y Flety se lleva su comisión (recomendada)** |
|---|---|---|
| ¿Dónde está la plata durante el viaje? | En la cuenta de Mercado Pago **de Flety** | **Reservada en la tarjeta del cliente** (todavía no cobrada) o en la cuenta de la empresa |
| ¿Quién factura el servicio al cliente? | Flety, por el total (o como "cobranza por cuenta de terceros", si se arma bien) | **La empresa** factura su servicio. Flety factura **solo su comisión** a la empresa |
| Impuestos (IVA, Ingresos Brutos, impuesto al cheque) | Riesgo de tributar sobre el **total** y pagar el impuesto al cheque dos veces (al entrar y al salir) | Flety tributa **solo sobre la comisión** |
| Regulación | Tener plata de terceros puede encuadrar como **proveedor de servicios de pago** (régimen del BCRA, reformado en 2026) y sumar obligaciones ante la UIF | Mercado Pago es el que procesa y tiene la plata. Flety no custodia fondos |
| Posición legal (sección 10.2) | Más control del dinero = más fácil que lo vean como prestador del servicio, no como intermediario | Refuerza que el cliente contrata a la empresa y Flety es la plataforma |
| Control sobre la liberación | Total | Alto con tarjeta de crédito (reserva). Con otros medios, vía devoluciones |

**Recomendación: B**, la que más protege a Flety en lo legal y lo impositivo. La "retención" se consigue con la **reserva de fondos** de Mercado Pago, no con plata en la cuenta de Flety.

## 3. Cómo funciona la opción B paso a paso

1. **La empresa vincula su cuenta de Mercado Pago** a Flety al darse de alta (OAuth de Mercado Pago Marketplace). El cobro de cada viaje se acredita en la cuenta de la empresa.
2. **El cliente confirma el pedido y paga con tarjeta de crédito:** se hace una **reserva de fondos** (`capture=false`). El monto queda bloqueado en el límite de la tarjeta, pero **todavía no se cobró**.
   - En Argentina la reserva **vale 7 días**: si no se captura, se cancela sola (a confirmar con Mercado Pago).
3. **Durante el viaje:** la plata sigue reservada. Si se cancela antes de que salga el chofer, se **anula la reserva** y el cliente no paga nada.
4. **El cliente confirma la entrega** (o pasan 48 h sin reclamo): Flety **captura** el pago. En ese momento Mercado Pago lo reparte solo:
   - el monto, menos la comisión de Mercado Pago, va a la empresa;
   - la **comisión de Flety** (`application_fee` / `marketplace_fee`) va a la cuenta de Flety.
5. **Si hay reclamo antes de capturar:** la reserva queda en pausa mientras el superadmin decide. Puede capturar el total, una parte (penalidad o descuento) o anularla.
6. **Si hay reclamo después de capturar:** se hace una **devolución** total o parcial por la API de Mercado Pago. Sale de la cuenta de la empresa, como lo exige el contrato con Flety.

### Casos que la reserva no cubre
- **Débito, dinero en cuenta o efectivo:** no admiten reserva. Se cobra al aceptar el pedido y los conflictos se resuelven con devoluciones. Se puede sumar que la empresa configure en Mercado Pago un **plazo de liberación** más largo (a confirmar qué opciones hay hoy).
- **Viajes programados a más de 7 días:** se reserva o cobra **cerca de la fecha** (por ejemplo, 48 h antes) y no al crear el pedido.

### Preguntas para Mercado Pago (equipo de integraciones)
1. ¿Se puede combinar **split con `application_fee` y `capture=false`** en el mismo pago?
2. ¿Siguen siendo **7 días** de validez de la reserva? ¿Se puede **capturar un monto menor** al reservado?
3. Si hay devolución parcial, ¿cómo se reparte entre la empresa y la comisión de Flety?
4. ¿Qué **plazos de liberación** puede elegir la empresa y qué cuesta cada uno?

## 4. ¿Y el chofer?

La plata va a la **empresa**, no al chofer. Cada empresa le paga a sus choferes según la relación que tengan (empleado o independiente). Eso es responsabilidad de la empresa y no pasa por Flety.

Cuando se abra a **fleteros independientes** (fase 5 del roadmap), cada uno se da de alta como "empresa unipersonal" (monotributista con su propia cuenta de Mercado Pago) y funciona igual.

## 5. Parte contable

- **Empresa → cliente:** factura el servicio. Flety puede pedirle que suba la factura o el link al pedido, para que el cliente la descargue.
- **Flety → empresa:** factura mensual por las comisiones del período, con el detalle de cada pedido.
- **Panel de Contabilidad** (rol contabilidad, sección 6.5):
  - pedidos con monto, comisión, comisión de Mercado Pago y neto de la empresa;
  - estado del pago: reservado, capturado, anulado, devuelto o en disputa;
  - comisiones del mes por empresa, para facturar;
  - exportación CSV/Excel para el estudio contable;
  - conciliación con los reportes de Mercado Pago, solo lectura.
- **Para hablar con el contador:**
  - encuadre de Flety (servicios de plataforma);
  - IVA sobre la comisión;
  - **Ingresos Brutos en Mendoza** (y en otras provincias si hay empresas de afuera);
  - retenciones y percepciones que aplica Mercado Pago;
  - cómo documentar la comisión.

## 6. Parte legal (para el abogado)

- **Términos y condiciones del cliente:**
  - Flety es intermediario tecnológico y el servicio lo presta la empresa;
  - reglas de cancelación (abajo);
  - plazo de 48 h para reclamar;
  - qué cubre y qué no.
- **Contrato con cada empresa:**
  - responsabilidad total por el traslado;
  - **seguro de carga vigente** como condición para darse de alta;
  - obligación de facturar al cliente;
  - acepta devoluciones decididas por Flety en disputas;
  - comisión y tarifas.
- **Política de cancelación** (sección 7.5, ajustada a la reserva):
  - antes de que una empresa acepte: gratis, se anula la reserva;
  - aceptado, antes de salir: penalidad chica, se captura solo un porcentaje;
  - con el chofer en camino: penalidad mayor.
  - Los porcentajes están a definir.
- **Defensa del consumidor:** revisar si aplica el **botón de arrepentimiento** en la web y la información obligatoria de precio total.
- **Datos personales (Ley 25.326):**
  - política de privacidad;
  - registrar la base de datos ante la AAIP;
  - la ubicación del chofer se comparte solo durante el servicio (ya está así).

## 7. Qué cambia en la app cuando se decida

1. Alta de empresa: botón **"Vincular Mercado Pago"** (OAuth). Sin cuenta vinculada no recibe pedidos.
2. Tabla `payments` (pedido, id de Mercado Pago, monto, comisión, estado: reservado, capturado, anulado o devuelto).
3. Servidor (Supabase Edge Functions) para crear el pago, capturar, anular, devolver y recibir las notificaciones de Mercado Pago. Las claves de Mercado Pago **nunca** van en la app.
4. **Auto-confirmación a las 48 h** de "entregado" → captura automática.
5. El superadmin resuelve disputas con tres botones: capturar total, capturar parcial o anular/devolver.
6. Se elimina **"Simular pago"**.

## Fuentes

- [Mercado Pago — Reservar fondos (Argentina)](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/payment-management/make-value-reserve)
- [Mercado Pago — Split de pagos para marketplace (Argentina)](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)
- [Marval — Nueva regulación sobre Proveedores de Servicios de Pago](https://www.marval.com/Publicacion/nueva-regulacion-sobre-proveedores-de-servicios-de-pago-17601)
- [abogados.com.ar — El BCRA sumó exigencias al régimen de PSP](https://abogados.com.ar/el-bcra-sumo-exigencias-al-regimen-de-proveedores-de-servicios-de-pago-e-incorporo-la-figura-de-pspcp-como-servicio/39246)
