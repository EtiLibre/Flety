import { supabase } from './supabase';

// Centro de ayuda: un asistente automático que busca la respuesta en esta base
// de preguntas frecuentes (por palabras clave, sin servicios externos) y, si no
// la encuentra, ofrece escribirle a soporte (migración 0017).

export type RolAyuda = 'cliente' | 'chofer' | 'empresa';

// A dónde puede mandar una respuesta. Cada pantalla decide cómo navegar.
export type Destino =
  | 'pedir'
  | 'fletes'
  | 'cuenta'
  | 'unirse'
  | 'perfil'
  | 'vehiculo'
  | 'viajes'
  | 'panel'
  | 'pedidos'
  | 'choferes'
  | 'tarifas'
  | 'soporte'
  | `flete:${string}`;

export type Accion = { label: string; destino: Destino };

export type Pregunta = {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
  // Palabras o frases que la identifican (sin tildes, en minúscula).
  claves: string[];
  acciones?: Accion[];
};

const OLVIDE: Pregunta = {
  id: 'olvide',
  categoria: 'Mi cuenta',
  pregunta: 'Me olvidé la contraseña',
  respuesta:
    'En la pantalla de Iniciar sesión tocá “¿Olvidaste tu contraseña?”, escribí tu correo y te mandamos un link para crear una nueva. Si ya estás adentro, la podés cambiar en Cuenta.',
  claves: ['olvide', 'olvidaste', 'no me acuerdo', 'recuperar', 'no puedo entrar', 'no puedo ingresar', 'restablecer'],
};

const CLIENTE: Pregunta[] = [
  {
    id: 'pedir',
    categoria: 'Pedir un flete',
    pregunta: '¿Cómo pido un flete o una mudanza?',
    respuesta:
      'En Inicio tocá “¿A dónde lo llevamos?”. Cargá el retiro y la entrega (si la dirección no aparece bien, marcala con el pin en el mapa), elegí el tamaño de la carga, cuántos ayudantes necesitás y si es para ahora o para más tarde. Después elegís el vehículo y ves el precio antes de confirmar.',
    claves: [
      'pedir',
      'pido',
      'solicitar',
      'contratar',
      'nuevo flete',
      'como funciona',
      'mudanza',
      'empezar',
      'reservar',
    ],
    acciones: [{ label: 'Pedir un flete', destino: 'pedir' }],
  },
  {
    id: 'precio',
    categoria: 'Precios y pagos',
    pregunta: '¿Cómo se calcula el precio?',
    respuesta:
      'El precio sale de las tarifas de cada empresa: un valor base según el vehículo, más un monto por kilómetro (por calles) y por cada ayudante. Lo ves antes de confirmar, y si elegís un fletero en particular ves el precio de su empresa.',
    claves: [
      'precio',
      'cuanto',
      'sale',
      'cuesta',
      'costo',
      'tarifa',
      'caro',
      'barato',
      'presupuesto',
      'cotizar',
      'valor',
    ],
  },
  {
    id: 'pago',
    categoria: 'Precios y pagos',
    pregunta: '¿Cómo pago?',
    respuesta:
      'Por ahora el pago se arregla directamente con la empresa que hace el flete (efectivo o transferencia, según la empresa). Estamos sumando el pago dentro de la app con Mercado Pago, con el dinero retenido hasta que confirmes la entrega.',
    claves: ['pago', 'pagar', 'cobran', 'efectivo', 'transferencia', 'tarjeta', 'mercado pago', 'factura', 'seña'],
  },
  {
    id: 'elegir',
    categoria: 'Pedir un flete',
    pregunta: '¿Puedo elegir el fletero?',
    respuesta:
      'Sí. En “Elegí tu fletero” ves los disponibles cerca, con su foto, calificaciones, vehículo y precio. Si elegís uno, tiene 5 minutos para aceptar; si no responde, tu pedido pasa a todas las empresas. También podés elegir “Cualquier empresa” para que lo tome la primera disponible.',
    claves: [
      'elegir',
      'fletero',
      'chofer',
      'empresa',
      'marketplace',
      'disponibles',
      'reserva',
      '5 minutos',
      'cualquier empresa',
    ],
  },
  {
    id: 'seguimiento',
    categoria: 'Durante el viaje',
    pregunta: '¿Dónde está mi flete?',
    respuesta:
      'En Mis fletes abrí el flete: ves en qué etapa está (buscando empresa, en camino al retiro, cargando, en camino al destino) y al chofer en el mapa en vivo.',
    claves: [
      'donde esta',
      'seguir',
      'seguimiento',
      'ubicacion',
      'mapa',
      'llega',
      'demora',
      'tarda',
      'estado',
      'en camino',
      'cuando llega',
    ],
    acciones: [{ label: 'Ver mis fletes', destino: 'fletes' }],
  },
  {
    id: 'cancelar',
    categoria: 'Durante el viaje',
    pregunta: '¿Cómo cancelo?',
    respuesta:
      'Abrí el flete en Mis fletes y tocá “Cancelar pedido”. Podés cancelar mientras se busca empresa o cuando ya está asignado, antes de que el chofer salga para el retiro. Después de eso, escribile al chofer por el chat o a soporte.',
    claves: ['cancelar', 'cancelo', 'anular', 'arrepenti', 'dar de baja', 'ya no'],
    acciones: [{ label: 'Ver mis fletes', destino: 'fletes' }],
  },
  {
    id: 'chat',
    categoria: 'Durante el viaje',
    pregunta: '¿Cómo hablo con el chofer?',
    respuesta:
      'Cuando el flete tiene chofer asignado, en el detalle aparece “Chatear”. Ahí coordinan detalles como el piso, el portero o dónde estacionar.',
    claves: ['hablar', 'chat', 'mensaje', 'contactar chofer', 'telefono del chofer', 'comunicar', 'avisar'],
  },
  {
    id: 'programar',
    categoria: 'Pedir un flete',
    pregunta: '¿Puedo programarlo para otro día?',
    respuesta: 'Sí. Al pedir, en “¿Cuándo?” elegí “Programar” y marcá el día y la hora en el calendario.',
    claves: [
      'programar',
      'otro dia',
      'manana',
      'fecha',
      'hora',
      'agendar',
      'mas tarde',
      'calendario',
      'fin de semana',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
      'domingo',
    ],
  },
  {
    id: 'fotos',
    categoria: 'Pedir un flete',
    pregunta: '¿Para qué sirven las fotos de la carga?',
    respuesta:
      'Son opcionales (hasta 5). La empresa y el chofer las ven para saber qué llevar y preparar el viaje: así no hay sorpresas con el tamaño.',
    claves: ['foto', 'fotos', 'imagen', 'subir foto'],
  },
  {
    id: 'seguridad',
    categoria: 'Seguridad',
    pregunta: '¿Es seguro? ¿Quién viene?',
    respuesta:
      'Solo trabajan empresas verificadas por Flety. Antes de elegir ves el nombre, la foto, las calificaciones y el vehículo del fletero; la patente completa aparece cuando acepta tu pedido, para que lo reconozcas al llegar. Cada viaje queda registrado en la app.',
    claves: ['seguro', 'seguridad', 'confianza', 'verificado', 'patente', 'quien viene', 'robo', 'estafa'],
  },
  {
    id: 'problema',
    categoria: 'Problemas',
    pregunta: 'Tuve un problema con el flete (daño, faltante, demora)',
    respuesta:
      'Lamentamos lo que pasó. Abrí el flete y tocá “Reportar un problema”: el equipo de Flety lo revisa con la empresa. Si querés, contanos el detalle escribiendo a soporte.',
    claves: [
      'problema',
      'rompio',
      'roto',
      'dano',
      'danado',
      'falta',
      'perdio',
      'reclamo',
      'queja',
      'mal servicio',
      'no vino',
      'no llego',
    ],
    acciones: [
      { label: 'Ver mis fletes', destino: 'fletes' },
      { label: 'Escribir a soporte', destino: 'soporte' },
    ],
  },
  {
    id: 'calificar',
    categoria: 'Durante el viaje',
    pregunta: '¿Cómo califico al chofer?',
    respuesta:
      'Cuando el flete termina, en el detalle te aparece para calificar con estrellas y dejar un comentario. Ayuda a otros clientes a elegir.',
    claves: ['calificar', 'estrellas', 'resena', 'opinion', 'puntuar', 'comentario'],
  },
  {
    id: 'cuenta',
    categoria: 'Mi cuenta',
    pregunta: '¿Cómo cambio mis datos o mi contraseña?',
    respuesta: 'En Cuenta podés cambiar tu nombre, apellido, usuario, teléfono, correo y contraseña.',
    claves: [
      'contrasena',
      'clave',
      'password',
      'correo',
      'email',
      'mail',
      'nombre',
      'telefono',
      'usuario',
      'datos',
      'perfil',
      'cuenta',
    ],
    acciones: [{ label: 'Ir a mi cuenta', destino: 'cuenta' }],
  },
  {
    id: 'zona',
    categoria: 'Pedir un flete',
    pregunta: '¿En qué zonas funciona?',
    respuesta:
      'En todo el Gran Mendoza (Capital, Godoy Cruz, Guaymallén, Las Heras, Luján, Maipú). Para viajes entre ciudades elegí “Larga distancia”.',
    claves: [
      'zona',
      'donde funciona',
      'ciudad',
      'provincia',
      'larga distancia',
      'otra ciudad',
      'san juan',
      'san rafael',
      'cobertura',
    ],
  },
  {
    id: 'ser_fletero',
    categoria: 'Trabajar con Flety',
    pregunta: 'Quiero trabajar como fletero',
    respuesta:
      'Si manejás para una empresa que ya está en Flety, pedile un código de invitación y cargalo en Cuenta → “Soy chofer · tengo un código”. Si tenés tu propia empresa de fletes, registrala desde la página de inicio (“Soy empresa de mudanzas”) y la aprobamos.',
    claves: [
      'trabajar',
      'ser fletero',
      'ser chofer',
      'sumarme',
      'codigo',
      'invitacion',
      'mi empresa',
      'registrar empresa',
      'tengo camioneta',
    ],
    acciones: [{ label: 'Tengo un código', destino: 'unirse' }],
  },
];

const CHOFER: Pregunta[] = [
  {
    id: 'recibir',
    categoria: 'Viajes',
    pregunta: '¿Cómo recibo viajes?',
    respuesta:
      'Activá “Estás disponible” arriba en Viaje y dejá la ubicación encendida. Así aparecés en el marketplace para los clientes cercanos y tu empresa te puede asignar pedidos. Si dejás de estar disponible, no te llegan solicitudes.',
    claves: ['recibir', 'no me llegan', 'viajes', 'disponible', 'trabajo', 'pedidos', 'conectar', 'aparecer'],
    acciones: [{ label: 'Ir a Viaje', destino: 'panel' }],
  },
  {
    id: 'solicitud',
    categoria: 'Viajes',
    pregunta: 'Me eligió un cliente, ¿qué hago?',
    respuesta:
      'Te aparece la solicitud con un contador: tenés 5 minutos para aceptarla o rechazarla. Si no respondés, el pedido pasa a la cola de todas las empresas.',
    claves: ['solicitud', 'me eligio', 'aceptar', 'rechazar', '5 minutos', 'contador', 'reserva'],
  },
  {
    id: 'etapas',
    categoria: 'Viajes',
    pregunta: '¿Cómo avanzo el viaje?',
    respuesta:
      'Con el botón grande de abajo vas marcando cada etapa: “Salir hacia el retiro”, “Llegué al retiro”, “Ya cargué, salir a la entrega” y “Entregué la carga”. El cliente lo ve en vivo. Con el botón de la flecha abrís la navegación en Google Maps.',
    claves: [
      'avanzar',
      'etapa',
      'llegue',
      'cargando',
      'entregue',
      'terminar',
      'boton',
      'navegar',
      'google maps',
      'ruta',
      'gps',
    ],
  },
  {
    id: 'ubicacion',
    categoria: 'Viajes',
    pregunta: 'Dice que active la ubicación',
    respuesta:
      'Flety necesita tu ubicación mientras estás disponible o en un viaje, para mostrarte a los clientes cercanos y para que el cliente te siga. Dale permiso de ubicación al navegador o a la app en los ajustes del celular.',
    claves: ['ubicacion', 'permiso', 'gps', 'no me ven', 'mapa', 'localizacion'],
  },
  {
    id: 'cobro',
    categoria: 'Cobros',
    pregunta: '¿Cómo y cuándo cobro?',
    respuesta:
      'Lo que cobrás lo arreglás con tu empresa. En Mis viajes ves cuántos viajes hiciste y el total facturado por día, semana y mes, para controlar con tu empresa.',
    claves: ['cobro', 'cobrar', 'pago', 'plata', 'ganancia', 'gane', 'sueldo', 'comision', 'liquidacion'],
    acciones: [{ label: 'Ver mis viajes', destino: 'viajes' }],
  },
  {
    id: 'vehiculo',
    categoria: 'Mi perfil',
    pregunta: '¿Cómo cargo mi vehículo y sus fotos?',
    respuesta:
      'En Cuenta → Mi vehículo cargás tipo, marca, modelo, año, color y patente, y subís hasta 3 fotos. Si no subís fotos, los clientes ven una foto de referencia de tu modelo. Sin vehículo cargado no aparecés en el marketplace.',
    claves: ['vehiculo', 'camioneta', 'patente', 'foto del vehiculo', 'modelo', 'marca', 'auto', 'camion'],
    acciones: [{ label: 'Mi vehículo', destino: 'vehiculo' }],
  },
  {
    id: 'perfil',
    categoria: 'Mi perfil',
    pregunta: '¿Quién ve mis datos personales?',
    respuesta:
      'Tu DNI, domicilio, teléfono, licencia y contacto de emergencia solo los ven vos, tu empresa y Flety. Los clientes ven tu nombre de pila con la inicial del apellido, tu foto, tus calificaciones y tu vehículo.',
    claves: ['datos', 'dni', 'domicilio', 'privacidad', 'quien ve', 'licencia', 'foto de perfil', 'perfil'],
    acciones: [{ label: 'Mi perfil', destino: 'perfil' }],
  },
  {
    id: 'calificaciones',
    categoria: 'Mi perfil',
    pregunta: '¿Cómo funcionan las calificaciones?',
    respuesta:
      'Al terminar cada viaje el cliente te califica de 1 a 5 estrellas y puede dejar un comentario. Tu promedio se ve en tu perfil del marketplace: puntualidad, cuidado de la carga y buen trato suman.',
    claves: ['calificacion', 'estrellas', 'resena', 'puntaje', 'me calificaron', 'mala calificacion'],
  },
  {
    id: 'empresa',
    categoria: 'Mi cuenta',
    pregunta: '¿Cómo me sumo a una empresa?',
    respuesta:
      'Pedile a tu empresa un código de invitación (lo generan en su panel, en Choferes) y cargalo al entrar a la app.',
    claves: ['empresa', 'codigo', 'invitacion', 'sumarme', 'unirme', 'cambiar de empresa'],
  },
  {
    id: 'problema',
    categoria: 'Problemas',
    pregunta: 'Tuve un problema en un viaje',
    respuesta:
      'Si es algo para coordinar con el cliente, usá el chat del viaje. Si pasó algo más serio (accidente, daño, el cliente no estaba), avisale a tu empresa y escribinos a soporte con el detalle.',
    claves: [
      'problema',
      'accidente',
      'cliente no esta',
      'no estaba',
      'dano',
      'choque',
      'chocaron',
      'robo',
      'robaron',
      'reclamo',
      'queja',
      'multa',
      'policia',
    ],
    acciones: [{ label: 'Escribir a soporte', destino: 'soporte' }],
  },
  {
    id: 'cuenta',
    categoria: 'Mi cuenta',
    pregunta: '¿Cómo cambio mi contraseña o correo?',
    respuesta: 'En Cuenta podés cambiar tu nombre, usuario, teléfono, correo y contraseña.',
    claves: ['contrasena', 'clave', 'password', 'correo', 'email', 'mail', 'usuario', 'telefono'],
    acciones: [{ label: 'Ir a mi cuenta', destino: 'cuenta' }],
  },
];

const EMPRESA: Pregunta[] = [
  {
    id: 'aprobacion',
    categoria: 'Mi empresa',
    pregunta: '¿Cuándo aprueban mi empresa?',
    respuesta:
      'El equipo de Flety revisa los datos que cargaste (CUIT y contacto) y aprueba la empresa lo antes posible. Mientras tanto podés cargar tus tarifas; los fletes, los choferes y el marketplace se activan con la aprobación.',
    claves: ['aprobacion', 'aprobar', 'aprobada', 'pendiente', 'verificar', 'cuit', 'alta', 'activar'],
  },
  {
    id: 'invitar',
    categoria: 'Choferes',
    pregunta: '¿Cómo sumo choferes a mi flota?',
    respuesta:
      'En Choferes tocá “Generar código” y pasáselo al chofer. Él se registra en Flety y carga el código; queda en tu flota al instante. Cada código vale 7 días y se usa una sola vez.',
    claves: [
      'invitar',
      'agregar',
      'agrego',
      'sumar',
      'chofer',
      'choferes',
      'codigo',
      'flota',
      'nuevo chofer',
      'empleado',
    ],
    acciones: [{ label: 'Ir a Choferes', destino: 'choferes' }],
  },
  {
    id: 'ficha',
    categoria: 'Choferes',
    pregunta: '¿Dónde veo los datos de mis choferes?',
    respuesta:
      'En Choferes tocá a cualquiera para ver su ficha: DNI, fecha de nacimiento, teléfono, domicilio, licencia (con aviso si está vencida) y contacto de emergencia. Lo carga cada chofer en “Mi perfil”.',
    claves: ['datos del chofer', 'ficha', 'dni', 'licencia', 'documentacion', 'telefono del chofer', 'vencida'],
    acciones: [{ label: 'Ir a Choferes', destino: 'choferes' }],
  },
  {
    id: 'tarifas',
    categoria: 'Precios',
    pregunta: '¿Cómo pongo mis precios?',
    respuesta:
      'En Tarifas cargás, para cada vehículo, un valor base, el precio por km y por ayudante. Con eso se calcula lo que ve el cliente cuando elige a uno de tus choferes.',
    claves: ['tarifa', 'precio', 'cobrar', 'cuanto cobro', 'base', 'por km', 'ayudante'],
    acciones: [{ label: 'Ir a Tarifas', destino: 'tarifas' }],
  },
  {
    id: 'pedidos',
    categoria: 'Fletes',
    pregunta: '¿Cómo tomo y asigno fletes?',
    respuesta:
      'En Fletes ves la cola de pedidos abiertos de la zona: tomá el que te sirva y asignale un chofer disponible. Los pedidos donde el cliente eligió a uno de tus choferes le llegan directo a ese chofer.',
    claves: ['tomar', 'asignar', 'cola', 'fletes', 'pedidos', 'nuevo pedido', 'aceptar pedido'],
    acciones: [{ label: 'Ir a Fletes', destino: 'pedidos' }],
  },
  {
    id: 'comision',
    categoria: 'Pagos',
    pregunta: '¿Cuánto cobra Flety?',
    respuesta:
      'Flety cobra una comisión por cada flete terminado (hoy, 10% del precio). Por ahora el cliente le paga a tu empresa y la comisión se liquida aparte; estamos sumando el cobro con Mercado Pago, que separa la comisión automáticamente.',
    claves: ['comision', 'cuanto cobra flety', 'porcentaje', 'pago', 'liquidacion', 'mercado pago', 'factura'],
  },
  {
    id: 'cuenta',
    categoria: 'Mi cuenta',
    pregunta: '¿Cómo cambio mi contraseña o correo?',
    respuesta: 'En Mi cuenta podés cambiar tus datos, usuario, teléfono, correo y contraseña.',
    claves: ['contrasena', 'clave', 'password', 'correo', 'email', 'mail', 'usuario', 'telefono'],
    acciones: [{ label: 'Ir a mi cuenta', destino: 'cuenta' }],
  },
  {
    id: 'problema',
    categoria: 'Problemas',
    pregunta: 'Tengo un problema con un cliente o un flete',
    respuesta:
      'Si el cliente reportó un problema, el flete aparece “En revisión” y lo vemos con vos. Para cualquier otra cosa, escribinos a soporte con el detalle.',
    claves: ['problema', 'reclamo', 'disputa', 'en revision', 'queja', 'cliente', 'error'],
    acciones: [{ label: 'Escribir a soporte', destino: 'soporte' }],
  },
];

export const PREGUNTAS: Record<RolAyuda, Pregunta[]> = {
  cliente: [...CLIENTE, OLVIDE],
  chofer: [...CHOFER, OLVIDE],
  empresa: [...EMPRESA, OLVIDE],
};

export const SUGERENCIAS: Record<RolAyuda, string[]> = {
  cliente: ['¿Dónde está mi flete?', '¿Cómo se calcula el precio?', 'Quiero cancelar', 'Tuve un problema'],
  chofer: ['No me llegan viajes', '¿Cómo cobro?', 'Cargar mi vehículo', 'Tuve un problema'],
  empresa: ['Sumar choferes', 'Poner mis precios', '¿Cuánto cobra Flety?', 'Aprobación de mi empresa'],
};

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SALUDOS = /^(hola|buenas|buen dia|buenas tardes|buenas noches|hey|que tal)\b/;
const GRACIAS = /\b(gracias|genial|perfecto|listo|joya|barbaro|ok|dale)\b/;

export type Respuesta = {
  texto: string;
  acciones: Accion[];
  // Si no encontró nada, se ofrece escribir a soporte con lo que preguntó.
  sinRespuesta?: boolean;
  relacionadas?: Pregunta[];
};

// Información en vivo que mejora la respuesta (p. ej. el flete en curso).
export type ContextoAyuda = {
  fleteActivo?: { id: string; estado: string; etiqueta: string } | null;
};

// Misma raíz: "chocaron" ~ "choque", "cancele" ~ "cancelar", "fotos" ~ "foto".
function parecida(a: string, b: string) {
  if (a === b) return true;
  const corta = Math.min(a.length, b.length);
  if (corta < 4) return false;
  let comun = 0;
  while (comun < corta && a[comun] === b[comun]) comun++;
  return comun >= Math.max(4, corta - 2);
}

// Los problemas (daños, accidentes, reclamos) pesan más: es lo más urgente.
const PESO: Record<string, number> = { problema: 1.5 };

function puntaje(q: string, p: Pregunta) {
  const palabras = q.split(' ');
  let total = 0;
  for (const clave of p.claves) {
    if (clave.includes(' ')) {
      if (q.includes(clave)) total += 3;
    } else if (palabras.some((w) => parecida(w, clave))) {
      total += 2;
    }
  }
  // Coincidencia con las palabras de la pregunta en sí.
  for (const w of normalizar(p.pregunta).split(' '))
    if (w.length >= 5 && palabras.some((x) => parecida(x, w))) total += 1;
  return total * (PESO[p.id] ?? 1);
}

export function responder(texto: string, rol: RolAyuda, ctx: ContextoAyuda = {}): Respuesta {
  const q = normalizar(texto);
  if (!q) return { texto: 'Contame en qué te puedo ayudar.', acciones: [] };
  if (SALUDOS.test(q) && q.split(' ').length <= 3) {
    return { texto: '¡Hola! Soy el asistente de Flety. ¿En qué te ayudo?', acciones: [] };
  }
  if (GRACIAS.test(q) && q.split(' ').length <= 3) {
    return { texto: '¡De nada! Si necesitás algo más, preguntame.', acciones: [] };
  }
  if (/\b(persona|humano|operador|soporte|asesor|atencion al cliente)\b/.test(q)) {
    return {
      texto: 'Te comunico con el equipo de Flety: dejanos tu consulta y te respondemos acá mismo, en “Mis consultas”.',
      acciones: [{ label: 'Escribir a soporte', destino: 'soporte' }],
    };
  }

  const ranking = PREGUNTAS[rol]
    .map((p) => ({ p, n: puntaje(q, p) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const mejor = ranking[0];

  if (!mejor || mejor.n < 2) {
    return {
      texto:
        'No estoy seguro de haber entendido. Probá con otras palabras o elegí una de estas preguntas. Si preferís, dejale tu consulta al equipo de Flety.',
      acciones: [{ label: 'Escribir a soporte', destino: 'soporte' }],
      sinRespuesta: true,
      relacionadas: PREGUNTAS[rol].slice(0, 3),
    };
  }

  let textoRespuesta = mejor.p.respuesta;
  const acciones = [...(mejor.p.acciones ?? [])];
  // Con un flete en curso, la respuesta sobre el estado es concreta.
  if (rol === 'cliente' && ctx.fleteActivo && ['seguimiento', 'cancelar', 'chat'].includes(mejor.p.id)) {
    textoRespuesta = `Tu flete está en: “${ctx.fleteActivo.etiqueta}”. ${textoRespuesta}`;
    acciones.unshift({ label: 'Ver mi flete', destino: `flete:${ctx.fleteActivo.id}` });
  }
  return {
    texto: textoRespuesta,
    acciones: acciones.filter((a, i) => acciones.findIndex((b) => b.destino === a.destino) === i),
    relacionadas: ranking
      .slice(1, 3)
      .filter((x) => x.n >= 2)
      .map((x) => x.p),
  };
}

// ── Consultas a soporte ──────────────────────────────────────────────────
export type Consulta = {
  id: string;
  asunto: string;
  mensaje: string;
  estado: 'abierta' | 'respondida' | 'cerrada';
  respuesta: string | null;
  created_at: string;
  respondida_at: string | null;
};

export async function misConsultas(userId: string): Promise<Consulta[]> {
  const { data, error } = await supabase
    .from('soporte_consultas')
    .select('id, asunto, mensaje, estado, respuesta, created_at, respondida_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error('No pudimos cargar tus consultas.');
  return (data as Consulta[]) ?? [];
}

export async function enviarConsulta(userId: string, rol: string | null, asunto: string, mensaje: string) {
  const { error } = await supabase
    .from('soporte_consultas')
    .insert({ user_id: userId, rol, asunto: asunto.trim(), mensaje: mensaje.trim() });
  if (error) {
    throw new Error(
      error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Falta actualizar la base de datos (migración 0017).'
        : 'No pudimos enviar tu consulta. Probá de nuevo.'
    );
  }
}

// Superadmin: bandeja de soporte.
export type ConsultaAdmin = Consulta & { user_id: string; rol: string | null; usuario: string | null };

export async function bandejaSoporte(): Promise<ConsultaAdmin[]> {
  const { data, error } = await supabase
    .from('soporte_consultas')
    .select(
      'id, user_id, rol, asunto, mensaje, estado, respuesta, created_at, respondida_at, user:users(nombre, email)'
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('No pudimos cargar las consultas. ¿Corriste la migración 0017?');
  return (
    (data ?? []) as unknown as (Consulta & {
      user_id: string;
      rol: string | null;
      user: { nombre: string | null; email: string } | { nombre: string | null; email: string }[] | null;
    })[]
  ).map((r) => {
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return { ...r, usuario: u ? `${u.nombre ?? 'Sin nombre'} · ${u.email}` : null };
  });
}

export async function responderConsulta(id: string, respuesta: string) {
  const { error } = await supabase
    .from('soporte_consultas')
    .update({ respuesta: respuesta.trim(), estado: 'respondida', respondida_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error('No pudimos guardar la respuesta.');
}

export async function cerrarConsulta(id: string) {
  const { error } = await supabase.from('soporte_consultas').update({ estado: 'cerrada' }).eq('id', id);
  if (error) throw new Error('No pudimos cerrar la consulta.');
}
