import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatoPatente } from '@/lib/vehiculos';
import { guardarUnidad, type MiGruista } from '@/modulos/gruas/api';
import { useCatalogoGruas, useMiGruista } from '@/modulos/gruas/hooks';
import { Campo, estilosGruista as eg, Subpantalla, Tarjeta, Titulo } from '@/modulos/gruas/pantalla';
import type { Catalogo } from '@/modulos/gruas/tipos';
import { Chips, G } from '@/modulos/gruas/ui';

// Mi grúa: la unidad con la que trabaja el gruista (patente, modalidad y qué
// vehículos puede llevar). Con esto se decide qué pedidos le llegan.
export default function UnidadGruista() {
  const { gruista, cargando } = useMiGruista();
  const { catalogo } = useCatalogoGruas();
  return (
    <Subpantalla titulo="Mi grúa" subtitulo="Solo te llegan pedidos de vehículos que tu grúa puede llevar.">
      {cargando || !catalogo ? (
        <ActivityIndicator color={G.acento} />
      ) : !gruista ? (
        <Text style={eg.muted}>Primero date de alta como gruista.</Text>
      ) : (
        <Formulario key={gruista.unidad?.id ?? 'nueva'} g={gruista} catalogo={catalogo} />
      )}
    </Subpantalla>
  );
}

function Formulario({ g, catalogo }: { g: MiGruista; catalogo: Catalogo }) {
  const u = g.unidad;
  const [patente, setPatente] = useState(u?.patente ?? '');
  const [marca, setMarca] = useState(u?.marca ?? '');
  const [modelo, setModelo] = useState(u?.modelo ?? '');
  const [modalidad, setModalidad] = useState(u?.modalidad ?? catalogo.modalidades[0]?.id ?? '');
  const [capacidad, setCapacidad] = useState(u?.capacidad_kg ? String(u.capacidad_kg) : '');
  const [tipos, setTipos] = useState<string[]>(u?.tipos_vehiculo ?? ['auto', 'camioneta']);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const patenteOk = patente.replace(/[^A-Za-z0-9]/g, '').length >= 6;
  const listo = patenteOk && !!modalidad && tipos.length > 0;
  const descripcion = catalogo.modalidades.find((m) => m.id === modalidad)?.descripcion;

  async function guardar() {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      await guardarUnidad(
        g.prestador.id,
        {
          patente,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          modalidad,
          capacidad_kg: capacidad ? Number(capacidad.replace(/\D/g, '')) || null : null,
          tipos_vehiculo: tipos,
        },
        u?.id
      );
      setOk(true);
      if (!u) router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu grúa.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Tarjeta>
        <Titulo>Datos de la grúa</Titulo>
        <Campo
          label="Patente"
          value={patente}
          onChangeText={(v) => setPatente(formatoPatente(v))}
          autoCapitalize="characters"
          placeholder="AB 123 CD"
          maxLength={10}
          error={patente && !patenteOk ? 'Revisá la patente.' : null}
        />
        <View style={eg.fila}>
          <Campo label="Marca" value={marca} onChangeText={setMarca} placeholder="Ford" maxLength={40} />
          <Campo label="Modelo" value={modelo} onChangeText={setModelo} placeholder="F-4000" maxLength={40} />
        </View>
        <Campo
          label="Capacidad de carga en kg (opcional)"
          value={capacidad}
          onChangeText={setCapacidad}
          keyboardType="number-pad"
          placeholder="3500"
          maxLength={6}
        />
      </Tarjeta>

      <Tarjeta>
        <Titulo>Modalidad</Titulo>
        <Chips oscuro opciones={catalogo.modalidades} valor={modalidad} onCambio={setModalidad} />
        {descripcion ? <Text style={eg.muted}>{descripcion}</Text> : null}
      </Tarjeta>

      <Tarjeta>
        <Titulo>Qué vehículos podés llevar</Titulo>
        <Chips
          oscuro
          multiple
          opciones={catalogo.tipos.filter((t) => t.activo !== false)}
          valor={tipos}
          onCambio={(id) => setTipos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
        />
      </Tarjeta>

      {error ? <Text style={eg.error}>{error}</Text> : null}
      {ok ? <Text style={eg.ok}>Guardado.</Text> : null}
      <Button title="Guardar" variant="grua" loading={guardando} disabled={!listo} onPress={guardar} />
    </View>
  );
}
