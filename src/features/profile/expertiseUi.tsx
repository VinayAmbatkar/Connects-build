import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  filterSpecializationsByDiscipline,
  isIdSelected,
  optionIdsMatch,
  type ProfileOption,
} from '@/src/features/profile/profileOptions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export function countSpecsForDiscipline(
  disciplineId: string,
  specializationIds: string[],
  specializations: ProfileOption[],
  disciplineLinked: boolean,
) {
  const scoped = filterSpecializationsByDiscipline(
    specializations,
    disciplineId,
  );
  return specializationIds.filter((id) =>
    scoped.some((item) => isIdSelected([id], item.id)),
  ).length;
}

type DisciplineTabsProps = {
  disciplines: ProfileOption[];
  activeId: string | null;
  specializationIds: string[];
  allSpecializations: ProfileOption[];
  disciplineLinked: boolean;
  onChange: (disciplineId: string) => void;
};

export function DisciplineTabs({
  disciplines,
  activeId,
  specializationIds,
  allSpecializations,
  disciplineLinked,
  onChange,
}: DisciplineTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsRow}
    >
      {disciplines.map((discipline) => {
        const isActive = optionIdsMatch(discipline.id, activeId ?? '');
        const count = countSpecsForDiscipline(
          discipline.id,
          specializationIds,
          allSpecializations,
          disciplineLinked,
        );
        return (
          <Pressable
            key={discipline.id}
            onPress={() => onChange(discipline.id)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {discipline.label}
              {count > 0 ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type ChipProps = {
  label: string;
  onRemove?: () => void;
};

export function ExpertiseChip({ label, onRemove }: ChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={6}>
          <Ionicons name="close-circle" size={16} color={colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

type SectionActionsProps = {
  onSelectAll?: () => void;
  onClear?: () => void;
};

export function SectionActions({ onSelectAll, onClear }: SectionActionsProps) {
  if (!onSelectAll && !onClear) return null;
  return (
    <View style={styles.sectionActions}>
      {onSelectAll ? (
        <Pressable onPress={onSelectAll} hitSlop={6}>
          <Text style={styles.actionText}>Select all</Text>
        </Pressable>
      ) : null}
      {onSelectAll && onClear ? <Text style={styles.dot}>·</Text> : null}
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={6}>
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  tabTextActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.primaryDark,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  dot: {
    color: colors.textMuted,
  },
});
