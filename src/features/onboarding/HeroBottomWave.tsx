import Svg, { Path } from 'react-native-svg';

type Props = {
  width: number;
  height?: number;
  /** Fill for the area below the curve (screen background). */
  fill?: string;
};

/**
 * Downward U-curve like HAPMINDS — green hero bulges down in the center
 * into the white content below.
 */
export function HeroBottomWave({
  width,
  height = 64,
  fill = '#FFFFFF',
}: Props) {
  // Left & right start near top; center dips down (downward curve)
  const d = [
    `M0 0`,
    `C ${width * 0.2} ${height * 0.15}, ${width * 0.3} ${height}, ${width * 0.5} ${height}`,
    `C ${width * 0.7} ${height}, ${width * 0.8} ${height * 0.15}, ${width} 0`,
    `L ${width} ${height + 4}`,
    `L 0 ${height + 4}`,
    `Z`,
  ].join(' ');

  return (
    <Svg width={width} height={height + 4} style={{ marginTop: -1 }}>
      <Path d={d} fill={fill} />
    </Svg>
  );
}
