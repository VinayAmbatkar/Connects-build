import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

/**
 * The app's own dialog, replacing React Native's Alert.alert (which renders
 * the stock Android/iOS system dialog and can't be styled).
 *
 * appAlert() takes exactly Alert.alert's arguments, so every call site is a
 * drop-in swap. Dialogs queue: a second appAlert while one is open shows
 * after the first closes, instead of replacing it mid-read.
 *
 * <AppDialogHost /> is mounted once at the root (app/_layout.tsx).
 */

type Dialog = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
};

let queue: Dialog[] = [];
let nextId = 1;
const listeners = new Set<(d: Dialog | null) => void>();

function emit() {
  const current = queue[0] ?? null;
  listeners.forEach((l) => l(current));
}

export function appAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean },
): void {
  const list = buttons?.length ? buttons : [{ text: 'OK' }];
  queue = [
    ...queue,
    {
      id: nextId++,
      title,
      message,
      buttons: list,
      // Tapping outside / back only closes it when there's a safe way out.
      cancelable: options?.cancelable ?? (list.length === 1 || list.some((b) => b.style === 'cancel')),
    },
  ];
  emit();
}

function close(dialog: Dialog, button?: AlertButton) {
  queue = queue.filter((d) => d.id !== dialog.id);
  emit();
  // After the dialog is gone, so a handler that opens another dialog or
  // navigates doesn't fight this one's exit.
  if (button?.onPress) setTimeout(() => button.onPress?.(), 0);
}

/** For tests: drop anything queued. */
export function resetAppDialogs() {
  queue = [];
  emit();
}

export function AppDialogHost() {
  const [dialog, setDialog] = useState<Dialog | null>(queue[0] ?? null);

  useEffect(() => {
    listeners.add(setDialog);
    return () => {
      listeners.delete(setDialog);
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dialog.cancelable) close(dialog, dialog.buttons.find((b) => b.style === 'cancel'));
      return true; // never let back navigate away under an open dialog
    });
    return () => sub.remove();
  }, [dialog]);

  if (!dialog) return null;

  // Cancel goes first (left), the main action last (right) -- or a stack
  // when there are more than two choices.
  const ordered = [
    ...dialog.buttons.filter((b) => b.style === 'cancel'),
    ...dialog.buttons.filter((b) => b.style !== 'cancel'),
  ];
  const stacked = ordered.length > 2;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <Pressable
        style={styles.backdrop}
        onPress={() => dialog.cancelable && close(dialog, dialog.buttons.find((b) => b.style === 'cancel'))}
        accessibilityLabel="Close dialog"
      >
        <Pressable style={styles.card} onPress={() => undefined} accessibilityRole="alert">
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {ordered.map((b, i) => {
              const primary = !stacked && i === ordered.length - 1 && b.style !== 'cancel';
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => close(dialog, b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    stacked ? styles.btnStacked : styles.btnInline,
                    b.style === 'cancel' && styles.btnCancel,
                    primary && (b.style === 'destructive' ? styles.btnDanger : styles.btnPrimary),
                    stacked && b.style === 'destructive' && styles.btnDangerOutline,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      primary && styles.btnTextOnFill,
                      !primary && b.style === 'destructive' && styles.btnTextDanger,
                    ]}
                  >
                    {b.text ?? 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionsStacked: { flexDirection: 'column' },
  btn: {
    minHeight: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  btnInline: { flex: 1 },
  btnStacked: { width: '100%' },
  btnCancel: { borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  btnDangerOutline: { borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  btnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  btnTextOnFill: { color: colors.white },
  btnTextDanger: { color: colors.danger },
});
