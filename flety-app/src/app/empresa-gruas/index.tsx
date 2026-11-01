import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, StatCard, Vacio } from '@/components/empresa/ui';
import { FilaServicio } from '@/components/gruas-empresa/FilaServicio';
import { PaginaPanelGruas } from '@/components/gruas-empresa/Pagina';
import { useIsWide } from '@/hooks/use-is-wide';
import { formatARS } from '@/lib/pricing';
import { ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useCatalogoGruas } from '@/modulos/gruas/hooks';
import { nombreGruista } from '@/modulos/gruas/panelEmpresa';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

// Panel de la empresa de grúas: lo que está pasando hoy y lo que hay que atender.
export default function PanelEmpresaGruas() {
  const isWide = useIsWide();
  const { catalogo } = useCatalogoGruas();
  return (
    <PaginaPanelGruas active="panel" title="Panel" subtitle="Tus servicios de grúa y auxilio, en vivo.">
      {({ demo, empresa, datos, cargando }) => {
        if (cargando || !datos) return <ActivityIndicator color={G.acento} style={{ marginTop: 20 }} />;
        const servicios = datos.servicios;
        const enCurso = servicios.filter((s) => ESTADOS_ACTIVOS.includes(s.estado));
        const hoy = new Date().toDateString();
        const deHoy = servicios.filter((s) => new Date(s.created_at).toDateString() === hoy);
        const mes = new Date();
        const ganado = servicios
          .filter((s) => {
            const f = new Date(s.finalizada_at ?? s.created_at);
            return (
              s.estado === 'finalizada' && f.getMonth() === mes.getMonth() && f.getFullYear() === mes.getFullYear()
            );
          })
          .reduce((t, s) => t + (s.precio_prestador ?? 0), 0);
        const aprobados = datos.gruistas.filter((g) => g.estado === 'aprobado');
        const disponibles = aprobados.filter((g) => g.disponible);
        const pendientes = datos.gruistas.filter((g) => g.estado === 'pendiente');

        return (
          <View style={{ gap: 20 }}>
            <View style={[styles.stats, isWide && styles.statsAncho]}>
              <StatCard label="En curso" value={String(enCurso.length)} dot={enCurso.length > 0} />
              <StatCard label="Servicios de hoy" value={String(deHoy.length)} />
              <StatCard label="Ganado este mes" value={formatARS(ganado)} />
              <StatCard
                label="Gruistas disponibles"
                value={String(disponibles.length)}
                suffix={`de ${aprobados.length}`}
              />
            </View>

            {empresa.estado !== 'aprobada' || pendientes.length ? (
              <Card title="Para atender">
                {empresa.estado !== 'aprobada' ? (
                  <Text style={styles.texto}>
                    Tu empresa está {empresa.estado === 'pendiente' ? 'en revisión' : empresa.estado}. Cuando Flety la
                    apruebe, tus gruistas van a empezar a recibir servicios.
                  </Text>
                ) : null}
                {pendientes.length ? (
                  <Pressable accessibilityRole="link" onPress={() => router.navigate('/empresa-gruas/gruistas')}>
                    <Text style={styles.texto}>
                      {pendientes.length === 1 ? '1 gruista espera' : `${pendientes.length} gruistas esperan`} la
                      aprobación de Flety (documentación). <Text style={styles.link}>Ver gruistas</Text>
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}

            <Card title="Servicios en curso">
              {enCurso.length ? (
                <View style={{ gap: 10 }}>
                  {enCurso.map((s) => (
                    <FilaServicio
                      key={s.id}
                      s={s}
                      catalogo={catalogo}
                      gruista={nombreGruista(datos, s.prestador_id)}
                      demo={demo}
                    />
                  ))}
                </View>
              ) : (
                <Vacio texto="Ahora no hay servicios en curso." />
              )}
            </Card>
          </View>
        );
      }}
    </PaginaPanelGruas>
  );
}

const styles = StyleSheet.create({
  stats: { gap: 12 },
  statsAncho: { flexDirection: 'row', flexWrap: 'wrap' },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  link: { fontFamily: fonts.bold, color: G.texto, textDecorationLine: 'underline' },
});
