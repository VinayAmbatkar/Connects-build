import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '@/src/constants/phoneCountries';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (country: PhoneCountry) => void;
};

export function PhoneCountryPicker({ visible, selectedId, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select country</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {PHONE_COUNTRIES.map((country) => {
              const selected = country.id === selectedId;
              return (
                <Pressable
                  key={country.id}
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(country);
                    onClose();
                  }}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <View style={styles.copy}>
                    <Text style={styles.name}>{country.name}</Text>
                    <Text style={styles.meta}>
                      {country.dialCode} · {country.maxLength} digits
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: '#F0FDF7',
    borderRadius: radius.md,
    borderBottomWidth: 0,
  },
  flag: {
    fontSize: 22,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
