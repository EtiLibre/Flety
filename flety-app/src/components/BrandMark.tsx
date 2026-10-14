import { Truck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Logo: cuadrado amarillo con camión + "flety".
export function BrandMark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Flety">
      <View style={styles.mark}>
        <Truck size={24} color={colors.ink} strokeWidth={2} />
      </View>
      <Text style={[styles.word, { color: tone === 'dark' ? colors.white : colors.ink }]}>flety</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
  },
});
