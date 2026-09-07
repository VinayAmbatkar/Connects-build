import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/theme/tokens';

export type ProfileContentTab = 'overview' | 'projects' | 'events';

const TABS: Array<{
  id: ProfileContentTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'projects', label: 'Projects', icon: 'folder-outline' },
  { id: 'events', label: 'Events', icon: 'document-text-outline' },
];

type Props = {
  active: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
};

export function ProfileContentTabs({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
              hitSlop={4}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.primary : '#64748B'}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: '#64748B',
  },
  labelActive: {
    color: colors.primary,
  },
});
