import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { useAccion } from '@/hooks/use-accion';
import { borrarInvitacion, crearInvitacion, invitacionesVigentes, type Invitacion } from '@/lib/empresa';
import { colors, fonts } from '@/theme';

import { BotonChico, Card, Vacio } from './ui';

const vence = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

function mensaje(code: string, empresa: string) {
  return `Te invito a sumarte como chofer de ${empresa} en Flety. Creá tu cuenta en la app, entrá a "Soy chofer · tengo un código" y escribí: ${code}`;
}

// La empresa genera códigos de un solo uso (vencen a los 7 días) para sumar choferes.
export function InvitarChofer({ empresa, onCambio }: { empresa: string; onCambio?: () => void }) {
  const [codigos, setCodigos] = useState<Invitacion[]>([]);
  const [version, setVersion] = useState(0);
  const { pendiente, error, ejecutar } = useAccion(() => {
    setVersion((v) => v + 1);
    onCambio?.();
  });

  useEffect(() => {
    let cancelled = false;
    invitacionesVigentes().then((lista) => !cancelled && setCodigos(lista));
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <Card
      title="Invitar choferes"
      right={
        <BotonChico
          title="Generar código"
          variant="dark"
          loading={pendiente === 'crear'}
          onPress={() => ejecutar('crear', async () => void (await crearInvitacion()))}
        />
      }>
      <Text style={styles.texto}>
        Pasale el código al chofer: crea su cuenta en Flety, toca “Soy chofer · tengo un código” y queda en tu flota. Cada
        código sirve para una sola persona y vence en 7 días.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {codigos.length ? (
        codigos.map((inv) => (
          <View key={inv.code} style={styles.codigo}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.code} selectable accessibilityLabel={`Código ${inv.code.split('').join(' ')}`}>
                {inv.code}
              </Text>
              <Text style={styles.muted}>Vence el {vence.format(new Date(inv.expires_at))}</Text>
            </View>
            <BotonChico
              title="Compartir"
              variant="accent"
              onPress={() => Share.share({ message: mensaje(inv.code, empresa) }).catch(() => {})}
            />
            <BotonChico
              title="Borrar"
              variant="danger"
              loading={pendiente === `borrar-${inv.code}`}
              onPress={() => ejecutar(`borrar-${inv.code}`, () => borrarInvitacion(inv.code))}
            />
          </View>
        ))
      ) : (
        <Vacio texto="No tenés códigos vigentes. Generá uno para invitar a un chofer." />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#3A3F45' },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  code: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 4, color: colors.ink },
});
