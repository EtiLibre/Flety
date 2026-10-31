import Svg, { Circle, Path } from 'react-native-svg';

// Ícono de grúa con el mismo trazo que los de Lucide (Lucide no trae uno).
export function IconoGrua({
  size = 24,
  color = '#12161C',
  strokeWidth = 2,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M4 17H2v-3h11V9h4l3 3v5h-1" />
      <Path d="M8 17h7" />
      <Path d="M15 9v3h5" />
      <Path d="M5 14l4-7h2v3" />
      <Path d="M11 10a1 1 0 0 1-1 1" />
      <Circle cx={6} cy={17} r={2} />
      <Circle cx={17} cy={17} r={2} />
    </Svg>
  );
}
