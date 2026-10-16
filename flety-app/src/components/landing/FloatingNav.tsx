import { router } from 'expo-router';
import { Menu, Truck, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme';

export type NavLink = { id: string; label: string };

const transition = {
  transitionProperty: 'background-color, border-color, box-shadow, transform',
  transitionDuration: '300ms',
} as unknown as ViewStyle;

// Barra flotante de la landing: transparente sobre el hero y, al bajar, una
// cápsula blanca con sombra (estética de paneles flotantes).
export function FloatingNav({
  links,
  onGo,
  scrolled,
  isWide,
}: {
  links: NavLink[];
  onGo: (id: string) => void;
  scrolled: boolean;
  isWide: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fg = scrolled ? colors.ink : colors.white;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        role="navigation"
        aria-label="Principal"
        style={[styles.bar, transition, scrolled ? styles.barScrolled : styles.barTop, !isWide && styles.barNarrow]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Flety, inicio"
          onPress={() => onGo('top')}
          style={styles.brand}>
          <View style={styles.brandMark}>
            <Truck size={20} color={colors.ink} strokeWidth={2.1} />
          </View>
          <Text style={[styles.brandWord, { color: fg }]}>flety</Text>
        </Pressable>

        {isWide ? (
          <View style={styles.links}>
            {links.map((l) => (
              <Pressable
                key={l.id}
                accessibilityRole="link"
                onPress={() => onGo(l.id)}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.link,
                  hovered && { backgroundColor: scrolled ? '#F1F2F4' : 'rgba(255,255,255,0.08)' },
                ]}>
                <Text style={[styles.linkText, { color: scrolled ? '#3A3F45' : '#C5CBD3' }]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {isWide ? (
            <Pressable accessibilityRole="link" onPress={() => router.push('/login')} style={styles.login}>
              <Text style={[styles.loginText, { color: fg }]}>Iniciar sesión</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/pedir')}
            style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={styles.ctaText}>Pedir un flete</Text>
          </Pressable>
          {!isWide ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={open ? 'Cerrar menú' : 'Abrir menú'}
              onPress={() => setOpen((o) => !o)}
              style={[styles.menuBtn, { borderColor: scrolled ? '#E3E6EA' : '#3A424D' }]}>
              {open ? <X size={20} color={fg} strokeWidth={2.2} /> : <Menu size={20} color={fg} strokeWidth={2.2} />}
            </Pressable>
          ) : null}
        </View>
      </View>

      {!isWide && open ? (
        <View style={styles.dropdown}>
          {links.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="link"
              onPress={() => {
                setOpen(false);
                onGo(l.id);
              }}
              style={styles.dropItem}>
              <Text style={styles.dropText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/login')}
            style={[styles.dropItem, styles.dropLogin]}>
            <Text style={[styles.dropText, { fontFamily: fonts.bold }]}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    zIndex: 50,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 1180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  barTop: { backgroundColor: 'rgba(18,22,28,0.55)', borderColor: 'rgba(255,255,255,0.08)' },
  barScrolled: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: '#E8E8E3',
    boxShadow: '0 10px 30px rgba(18, 22, 28, 0.10)',
  },
  barNarrow: { paddingLeft: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4 },
  links: { flexDirection: 'row', gap: 2 },
  link: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  linkText: { fontFamily: fonts.medium, fontSize: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  login: { paddingHorizontal: 14, paddingVertical: 10 },
  loginText: { fontFamily: fonts.semibold, fontSize: 15 },
  cta: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  menuBtn: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dropdown: {
    width: '100%',
    marginTop: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    boxShadow: '0 16px 40px rgba(18, 22, 28, 0.14)',
  },
  dropItem: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12 },
  dropLogin: { borderTopWidth: 1, borderTopColor: '#EFEFEA', marginTop: 4 },
  dropText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
});
