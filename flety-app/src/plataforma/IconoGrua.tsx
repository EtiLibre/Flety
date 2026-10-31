import Svg, { Circle, Path } from 'react-native-svg';

// Ícono de grúa de plancha llevando un auto, con el trazo de Lucide.
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
      <Path d="M14 15.5V10h4l3.5 3.5v4H20" />
      <Path d="M1.5 13H14" />
      <Path d="M3 13l1.6-3h5.2l2 3" />
      <Path d="M2.5 15.5H14" />
      <Circle cx={6} cy={17.5} r={2} />
      <Circle cx={17.5} cy={17.5} r={2} />
    </Svg>
  );
}
