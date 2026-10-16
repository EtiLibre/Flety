import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

// Aparece (sube y se hace visible) cuando entra en pantalla. Solo se usa en la
// landing web; respeta "reducir movimiento" del sistema.
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<View>(null);
  // Sin IntersectionObserver o con "reducir movimiento", se muestra directo.
  const [visible, setVisible] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const anim = {
    opacity: visible ? 1 : 0,
    transform: [{ translateY: visible ? 0 : 28 }],
    transitionProperty: 'opacity, transform',
    transitionDuration: '700ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    transitionDelay: `${delay}ms`,
  } as unknown as ViewStyle;

  return (
    <View ref={ref} style={[anim, style]}>
      {children}
    </View>
  );
}
