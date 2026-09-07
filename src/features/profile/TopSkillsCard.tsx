import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  skills: string[];
  onPress?: () => void;
};

export function TopSkillsCard({ skills, onPress }: Props) {
  if (!skills.length) return null;

  const preview = skills.slice(0, 4).join(' • ');
  const suffix = skills.length > 4 ? '...' : '';

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="diamond-outline" size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Top skills</Text>
        <Text style={styles.skills} numberOfLines={2}>
          {preview}
          {suffix}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 2,
  },
  skills: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
