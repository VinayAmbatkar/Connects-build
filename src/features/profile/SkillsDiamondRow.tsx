import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/theme/tokens';

type Props = {
  skills: string[];
  maxVisible?: number;
};

export function formatSkillsSummary(skills: string[], maxVisible = 2) {
  if (!skills.length) return '';
  if (skills.length <= maxVisible) return skills.join(', ');
  const visible = skills.slice(0, maxVisible).join(', ');
  return `${visible} and +${skills.length - maxVisible} skills`;
}

export function SkillsDiamondRow({ skills, maxVisible = 2 }: Props) {
  if (!skills.length) return null;

  return (
    <View style={styles.row}>
      <Ionicons name="diamond-outline" size={14} color={colors.textSecondary} />
      <Text style={styles.text}>{formatSkillsSummary(skills, maxVisible)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
});
