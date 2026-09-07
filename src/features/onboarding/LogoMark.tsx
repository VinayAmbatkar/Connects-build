import { Image } from 'react-native';
import { brandLogo } from '@/src/features/onboarding/assets';

type Props = {
  size?: number;
};

/** COBILDS hard-hat "C" mark. */
export function LogoMark({ size = 36 }: Props) {
  return (
    <Image
      source={brandLogo}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
