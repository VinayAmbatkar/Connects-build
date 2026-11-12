import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OTHER_BODY_CODE,
  credentialsApi,
  type Credential,
  type CredentialKind,
  type PickedFile,
} from '@/src/api/credentials';
import { profileApi } from '@/src/api/profile';
import { getErrorMessage } from '@/src/api/client';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { ErrorState } from '@/src/components/EmptyState';
import { TextField } from '@/src/components/TextField';
import {
  emptyForm,
  formFromCredential,
  formatMonthYear,
  groupBodies,
  issuerLabel,
  maskDate,
  toRequest,
  validateForm,
  type CredentialForm,
} from '@/src/features/credentials/credentialLogic';
import { normalizeOptions, resolveOptionLabel } from '@/src/features/profile/profileOptions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { ListSkeleton } from '@/src/components/Skeleton';
import { openInApp } from '@/src/utils/openInApp';
const LIST_KEY = ['credentials'] as const;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type DocChange = { kind: 'none' } | { kind: 'upload'; file: PickedFile } | { kind: 'remove' };

/**
 * "Licenses & Certifications" editor -- the app counterpart of the web
 * profile's credentials editor. Entries show on the user's public profile.
 */
export function CredentialsScreen() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({ queryKey: LIST_KEY, queryFn: credentialsApi.list });
  const optionsQuery = useQuery({
    queryKey: ['credential-options'],
    queryFn: credentialsApi.options,
    staleTime: 60 * 60 * 1000,
  });
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });
  const profileOptionsQuery = useQuery({ queryKey: ['profile-options'], queryFn: profileApi.options });

  const [editing, setEditing] = useState<{ id: number | null; form: CredentialForm; documentUrl: string } | null>(
    null,
  );
  const [docChange, setDocChange] = useState<DocChange>({ kind: 'none' });
  const [formError, setFormError] = useState('');
  const [bodyPickerOpen, setBodyPickerOpen] = useState(false);

  const specializations = useMemo(
    () => (profileQuery.data?.specializationIds ?? []).map(String),
    [profileQuery.data?.specializationIds],
  );
  const specOptions = normalizeOptions(profileOptionsQuery.data?.specializations);
  const bodies = useMemo(() => groupBodies(optionsQuery.data, specializations), [optionsQuery.data, specializations]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Nothing to save.');
      const body = toRequest(editing.form);
      const saved =
        editing.id === null ? await credentialsApi.create(body) : await credentialsApi.update(editing.id, body);
      // Second step: the entry is saved; attach / remove its file. A failed
      // upload keeps the sheet open on the (now saved) entry to retry.
      try {
        if (docChange.kind === 'upload') return await credentialsApi.uploadDocument(saved.id, docChange.file);
        if (docChange.kind === 'remove' && saved.documentUrl) return await credentialsApi.removeDocument(saved.id);
      } catch (e) {
        setEditing({ id: saved.id, form: formFromCredential(saved), documentUrl: saved.documentUrl });
        throw new Error(`Saved, but the certificate file could not be uploaded: ${getErrorMessage(e)}`);
      }
      return saved;
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e) => {
      invalidate();
      setFormError(getErrorMessage(e, "Couldn't save. Please try again."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => credentialsApi.remove(id),
    onSuccess: invalidate,
    onError: (e) => appAlert("Couldn't delete", getErrorMessage(e)),
  });

  const openAdd = (kind: CredentialKind) => {
    setEditing({ id: null, form: emptyForm(kind, specializations.length === 1 ? specializations[0] : ''), documentUrl: '' });
    setDocChange({ kind: 'none' });
    setFormError('');
  };
  const openEdit = (c: Credential) => {
    setEditing({ id: c.id, form: formFromCredential(c), documentUrl: c.documentUrl });
    setDocChange({ kind: 'none' });
    setFormError('');
  };
  function closeForm() {
    setEditing(null);
    setDocChange({ kind: 'none' });
    setFormError('');
  }
  const update = (patch: Partial<CredentialForm>) => {
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));
    setFormError('');
  };

  const confirmDelete = (c: Credential) =>
    appAlert('Delete this entry?', `"${c.name || issuerLabel(c)}" will be removed from your profile.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(c.id) },
    ]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    if ((a.size ?? 0) > MAX_FILE_BYTES) {
      setFormError('The file must be 10 MB or less.');
      return;
    }
    setDocChange({
      kind: 'upload',
      file: { uri: a.uri, name: a.name || 'certificate', type: a.mimeType || 'application/pdf', file: a.file },
    });
    setFormError('');
  };

  const save = () => {
    if (!editing || saveMutation.isPending) return;
    const error = validateForm(editing.form);
    if (error) {
      setFormError(error);
      return;
    }
    saveMutation.mutate();
  };

  if (listQuery.isLoading) return <ListSkeleton />;
  if (listQuery.isError || !listQuery.data) {
    return (
      <ErrorState
        title="Couldn't load your licenses"
        message={getErrorMessage(listQuery.error, 'Check your connection and try again.')}
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  const { licenses, certifications, max } = listQuery.data;
  const form = editing?.form;
  const isLicense = form?.kind === 'LICENSE';
  const selectedBody = optionsQuery.data?.bodies.find((b) => b.code === form?.bodyCode);
  const bodyLabel =
    form?.bodyCode === OTHER_BODY_CODE
      ? 'Other (type the name)'
      : selectedBody
        ? `${selectedBody.shortName} — ${selectedBody.name}`
        : 'Select a licensing body';
  const currentDocName =
    docChange.kind === 'upload'
      ? docChange.file.name
      : docChange.kind === 'remove'
        ? ''
        : editing?.documentUrl
          ? 'Uploaded certificate'
          : '';

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isRefetching} onRefresh={() => void listQuery.refetch()} />}
      >
        <Text style={styles.intro}>
          Add your licenses, registrations and professional certificates. They appear on your public profile.
        </Text>

        <Section
          title="Licenses & registrations"
          subtitle="State or council licence, registration, or professional licence."
          icon="shield-checkmark-outline"
          items={licenses}
          canAdd={licenses.length < max}
          addLabel={licenses.length ? 'Add license' : 'Add your first license'}
          onAdd={() => openAdd('LICENSE')}
          onEdit={openEdit}
          onDelete={confirmDelete}
          specLabel={(code) => resolveOptionLabel(specOptions, code) ?? ''}
        />
        <Section
          title="Certifications"
          subtitle="Project management, safety, green building or other certificates."
          icon="ribbon-outline"
          items={certifications}
          canAdd={certifications.length < max}
          addLabel={certifications.length ? 'Add certificate' : 'Add your first certificate'}
          onAdd={() => openAdd('CERTIFICATION')}
          onEdit={openEdit}
          onDelete={confirmDelete}
          specLabel={() => ''}
        />
      </ScrollView>

      <BottomSheet
        visible={!!editing}
        tall
        title={
          editing?.id === null
            ? isLicense
              ? 'Add license'
              : 'Add certificate'
            : isLicense
              ? 'Edit license'
              : 'Edit certification'
        }
        onClose={() => (saveMutation.isPending ? undefined : closeForm())}
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={closeForm} disabled={saveMutation.isPending} style={styles.footerBtn} />
            <Button title="Save" onPress={save} loading={saveMutation.isPending} style={styles.footerBtn} />
          </View>
        }
      >
        {form ? (
          <View style={styles.formGap}>
            {isLicense ? (
              <>
                {specializations.length > 1 ? (
                  <View>
                    <Text style={styles.label}>Which specialization is this for?</Text>
                    <View style={styles.chips}>
                      {['', ...specializations].map((code) => {
                        const active = form.specialization === code;
                        return (
                          <Pressable
                            key={code || 'general'}
                            onPress={() => update({ specialization: code })}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {code ? resolveOptionLabel(specOptions, code) ?? code : 'General'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View>
                  <Text style={styles.label}>
                    Licensing body<Text style={styles.required}> *</Text>
                  </Text>
                  <Pressable style={styles.select} onPress={() => setBodyPickerOpen(true)} accessibilityRole="button">
                    <Text style={[styles.selectText, !form.bodyCode && styles.placeholder]} numberOfLines={2}>
                      {bodyLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                {form.bodyCode === OTHER_BODY_CODE ? (
                  <TextField
                    label="Licensing body name"
                    required
                    value={form.issuerName}
                    onChangeText={(v) => update({ issuerName: v })}
                  />
                ) : null}
                <TextField
                  label="License / registration no."
                  value={form.credentialNumber}
                  onChangeText={(v) => update({ credentialNumber: v })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <TextField
                  label="Certificate name"
                  required
                  placeholder="e.g. IGBC Accredited Professional"
                  value={form.name}
                  onChangeText={(v) => update({ name: v })}
                />
                <TextField
                  label="Issuing organization"
                  required
                  value={form.issuerName}
                  onChangeText={(v) => update({ issuerName: v })}
                />
                <TextField
                  label="Credential ID"
                  value={form.credentialNumber}
                  onChangeText={(v) => update({ credentialNumber: v })}
                  autoCorrect={false}
                />
              </>
            )}

            <TextField
              label="Date of issue"
              required={!isLicense}
              placeholder="YYYY-MM-DD"
              keyboardType="number-pad"
              maxLength={10}
              value={form.issueDate}
              onChangeText={(v) => update({ issueDate: maskDate(v) })}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Does not expire</Text>
              <Switch
                value={form.noExpiry}
                onValueChange={(noExpiry) => update({ noExpiry })}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            {!form.noExpiry ? (
              <TextField
                label="Expiry date"
                placeholder="YYYY-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
                value={form.expiryDate}
                onChangeText={(v) => update({ expiryDate: maskDate(v) })}
              />
            ) : null}
            <TextField
              label="Certificate link"
              placeholder="https://"
              autoCapitalize="none"
              keyboardType="url"
              value={form.credentialUrl}
              onChangeText={(v) => update({ credentialUrl: v })}
            />

            <View>
              <Text style={styles.label}>Certificate file</Text>
              <Text style={styles.hint}>PDF or image, up to 10 MB.</Text>
              {currentDocName ? (
                <View style={styles.docRow}>
                  <Ionicons name="document-attach-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.docName} numberOfLines={1}>
                    {currentDocName}
                  </Text>
                  {docChange.kind === 'none' && editing?.documentUrl ? (
                    <Pressable hitSlop={8} onPress={() => openInApp(editing.documentUrl)}>
                      <Text style={styles.link}>View</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel="Remove file"
                    onPress={() => setDocChange(editing?.documentUrl ? { kind: 'remove' } : { kind: 'none' })}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}
              <Button
                title={currentDocName ? 'Replace file' : 'Attach file'}
                variant="outline"
                onPress={() => void pickFile()}
                style={styles.attach}
              />
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={bodyPickerOpen}
        tall
        title="Licensing body"
        subtitle={specializations.length ? 'Suggested for your specializations first' : undefined}
        onClose={() => setBodyPickerOpen(false)}
      >
        {optionsQuery.isLoading ? <ListSkeleton /> : null}
        {[
          { title: 'Suggested', items: bodies.suggested },
          { title: 'All licensing bodies', items: bodies.others },
        ].map((group) =>
          group.items.length ? (
            <View key={group.title} style={styles.bodyGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((b) => {
                const active = form?.bodyCode === b.code;
                return (
                  <Pressable
                    key={b.code}
                    style={[styles.bodyRow, active && styles.bodyRowActive]}
                    onPress={() => {
                      update({ bodyCode: b.code, issuerName: '' });
                      setBodyPickerOpen(false);
                    }}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.bodyShort}>{b.shortName}</Text>
                      <Text style={styles.bodyName}>{b.name}</Text>
                    </View>
                    {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null,
        )}
        <Pressable
          style={[styles.bodyRow, form?.bodyCode === OTHER_BODY_CODE && styles.bodyRowActive]}
          onPress={() => {
            update({ bodyCode: OTHER_BODY_CODE });
            setBodyPickerOpen(false);
          }}
        >
          <Text style={styles.bodyShort}>Other (type the name)</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

function Section({
  title,
  subtitle,
  icon,
  items,
  canAdd,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  specLabel,
}: {
  title: string;
  subtitle: string;
  icon: 'shield-checkmark-outline' | 'ribbon-outline';
  items: Credential[];
  canAdd: boolean;
  addLabel: string;
  onAdd: () => void;
  onEdit: (c: Credential) => void;
  onDelete: (c: Credential) => void;
  specLabel: (code: string) => string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
      {items.map((c) => {
        const issued = formatMonthYear(c.issueDate);
        const expires = formatMonthYear(c.expiryDate);
        const spec = c.specialization ? specLabel(c.specialization) : '';
        return (
          <View key={c.id} style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons name={icon} size={20} color="#0A66C2" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{c.name || issuerLabel(c)}</Text>
              {c.name ? <Text style={styles.itemSub}>{issuerLabel(c)}</Text> : null}
              {spec ? <Text style={styles.itemMeta}>{spec}</Text> : null}
              {c.credentialNumber ? (
                <Text style={styles.itemMeta}>
                  {c.kind === 'LICENSE' ? 'Reg. no.' : 'Credential ID'} {c.credentialNumber}
                </Text>
              ) : null}
              <Text style={[styles.itemMeta, c.expired && styles.expired]}>
                {[issued ? `Issued ${issued}` : '', c.expired ? 'Expired' : expires ? `Expires ${expires}` : 'No expiry']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {c.documentUrl ? (
                <Pressable onPress={() => openInApp(c.documentUrl)} hitSlop={6}>
                  <Text style={styles.link}>View certificate</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.itemActions}>
              <Pressable hitSlop={8} accessibilityLabel="Edit" onPress={() => onEdit(c)}>
                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel="Delete" onPress={() => onDelete(c)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        );
      })}
      {canAdd ? (
        <Pressable style={styles.addBtn} onPress={onAdd} accessibilityRole="button">
          <Ionicons name="add" size={18} color={colors.primaryDark} />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>You've reached the maximum for this section.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  flex: { flex: 1 },
  intro: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, lineHeight: 20 },
  section: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  sectionTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.md, color: colors.text },
  sectionSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  itemSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.text },
  itemMeta: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  expired: { color: colors.danger },
  itemActions: { gap: spacing.md, alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addText: { fontFamily: typography.fontFamily.semibold, color: colors.primaryDark },
  formGap: { gap: spacing.sm, paddingBottom: spacing.md },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: { color: colors.danger },
  hint: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectText: { flex: 1, fontFamily: typography.fontFamily.regular, color: colors.text },
  placeholder: { color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.primaryDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontFamily: typography.fontFamily.medium, color: colors.text },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
  },
  docName: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.text },
  link: { marginTop: 2, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.primaryDark },
  attach: { marginTop: spacing.sm },
  error: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.danger },
  footer: { flexDirection: 'row', gap: spacing.sm },
  footerBtn: { flex: 1 },
  bodyGroup: { marginBottom: spacing.md },
  groupTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  bodyRowActive: { backgroundColor: colors.primaryMuted },
  bodyShort: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  bodyName: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textSecondary },
});
