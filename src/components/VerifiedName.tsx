import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VERIFIED_BLUE } from '@/src/components/PremiumBadge';

type Props = {
  name: ReactNode;
  /** The person's profile badge (`verified` / `otherPartyVerified` /
   *  `ownerVerified` from the backend). */
  verified?: boolean | null;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  tickSize?: number;
};

/** A person's name with the blue verified tick after it -- the same badge
 *  the profile page shows, used in every people list (search, suggestions,
 *  Find Connections results, connections, saved profiles). The name
 *  truncates; the tick never gets pushed off. */
export function VerifiedName({
  name,
  verified,
  style,
  containerStyle,
  numberOfLines = 1,
  tickSize = 15,
}: Props) {
  return (
    <View style={[styles.row, containerStyle]}>
      {/* noGrow last: a caller's `flex: 1` would push the tick to the far edge. */}
      <Text style={[styles.name, style, styles.noGrow]} numberOfLines={numberOfLines}>
        {name}
      </Text>
      {verified ? (
        <Ionicons
          testID="verified-tick"
          name="checkmark-circle"
          size={tickSize}
          color={VERIFIED_BLUE}
          accessibilityLabel="Verified"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
  },
  // A caller's `flex: 1` means grow + basis 0; undo both so the name sizes
  // to its text (shrinking only when long) and the tick follows it.
  noGrow: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
  },
});
