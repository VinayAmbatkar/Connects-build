import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const LINKEDIN_BLUE = '#0A66C2';

type Props = {
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  onAdd?: () => void;
  footer?: string;
  onFooterPress?: () => void;
  children: ReactNode;
};

export function ProfileSectionCard({
  title,
  subtitle,
  onEdit,
  onAdd,
  footer,
  onFooterPress,
  children,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.cardActions}>
          {onAdd ? (
            <Pressable onPress={onAdd} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="add" size={22} color={LINKEDIN_BLUE} />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="pencil" size={18} color={LINKEDIN_BLUE} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
      {footer ? (
        <Pressable onPress={onFooterPress} style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{footer}</Text>
          <Ionicons name="arrow-forward" size={16} color={LINKEDIN_BLUE} />
        </Pressable>
      ) : null}
    </View>
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooterText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
});
