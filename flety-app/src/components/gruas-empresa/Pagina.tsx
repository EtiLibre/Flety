import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmpresaGruasShell, PANEL_GRUAS_BG, type SeccionGruas } from '@/components/web/EmpresaGruasShell';
import type { MiGruista } from '@/modulos/gruas/api';
import { RUTA_GRUISTA } from '@/modulos/gruas/nav';
import { useDatosEmpresa, useEmpresaGruas, type DatosEmpresa } from '@/modulos/gruas/panelEmpresa';
import type { Empresa } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

export type CtxPanelGruas = {
  demo: boolean;
  empresa: Empresa;
  gruista: MiGruista | null;
  datos: DatosEmpresa | null;
  cargando: boolean;
  recargar: () => void;
};

// Cada pantalla del panel de la empresa de grúas: resuelve quién entra (dueño
// de una empresa de grúas, o el superadmin con datos de ejemplo) y carga los
// datos de la empresa.
export function PaginaPanelGruas({
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  active: SeccionGruas;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: (ctx: CtxPanelGruas) => React.ReactNode;
}) {
  const panel = useEmpresaGruas();
  const { datos, error, cargando, recargar } = useDatosEmpresa(panel);

  if (panel.estado === 'cargando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={G.acento} />
      </View>
    );
  }
  if (panel.estado === 'sin-empresa') {
    return (
      <View style={styles.centro}>
        <View style={styles.sin}>
          <Text style={styles.sinTitulo}>Este panel es para empresas de grúas</Text>
          <Text style={styles.sinTexto}>
            Si tenés una empresa de grúas o auxilio, dala de alta desde la app del gruista y acá vas a manejar tus
            gruistas, servicios y tarifas.
          </Text>
          <Button title="Dar de alta mi empresa" variant="grua" onPress={() => router.replace(RUTA_GRUISTA)} />
        </View>
      </View>
    );
  }

  return (
    <EmpresaGruasShell
      active={active}
      empresa={panel.empresa}
      demo={panel.demo}
      title={title}
      subtitle={subtitle}
      actions={actions}
      aviso={error}>
      {children({ demo: panel.demo, empresa: panel.empresa, gruista: panel.gruista, datos, cargando, recargar })}
    </EmpresaGruasShell>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: PANEL_GRUAS_BG },
  sin: { maxWidth: 440, gap: 12, padding: 24, borderRadius: 22, backgroundColor: colors.white },
  sinTitulo: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  sinTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
});
