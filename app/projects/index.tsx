import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useProjectsLock } from '@/src/features/profile/profileLocks';
import { Button } from '@/src/components/Button';
import { KeyboardAwareScrollView } from '@/src/components/KeyboardAwareScrollView';
import { LocationAutocomplete } from '@/src/components/LocationAutocomplete';
import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import {
  projectsApi,
  type PickedProjectPhoto,
  type ProjectPayload,
} from '@/src/api/projects';
import { EmptyState, ErrorState } from '@/src/components/EmptyState';
import { appAlert } from '@/src/components/AppDialog';
import { ListSkeleton } from '@/src/components/Skeleton';
import { staticLocationLabel, usePlaceLabel } from '@/src/hooks/usePlaceLabels';
import type { Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const MAX_PROJECT_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

type ProjectForm = {
  id?: string | number;
  name: string;
  locationId: string;
  size: string;
  sizeUnit: 'SQFT' | 'SQM';
  awards: string;
  description: string;
  photoUrls: string[];
};

const EMPTY_FORM: ProjectForm = {
  name: '',
  locationId: '',
  size: '',
  sizeUnit: 'SQFT',
  awards: '',
  description: '',
  photoUrls: [],
};

function projectToForm(project: Project): ProjectForm {
  return {
    id: project.id,
    name: String(project.name ?? project.title ?? ''),
    locationId: String(project.locationId ?? ''),
    size: project.sizeSqft ? String(project.sizeSqft) : '',
    sizeUnit: project.sizeUnit === 'SQM' ? 'SQM' : 'SQFT',
    awards: String(project.awards ?? ''),
    description: String(project.description ?? ''),
    photoUrls: Array.isArray(project.photos) ? project.photos.map(String) : [],
  };
}

function projectPayload(form: ProjectForm): ProjectPayload {
  return {
    name: form.name.trim(),
    locationId: form.locationId.trim(),
    sizeSqft: Number(form.size.replace(/,/g, '')) || 0,
    sizeUnit: form.sizeUnit,
    awards: form.awards.trim(),
    description: form.description.trim(),
  };
}

type ProjectListItemProps = {
  project: Project;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

function ProjectListItem({
  project,
  active,
  onSelect,
  onDelete,
}: ProjectListItemProps) {
  const placeName = usePlaceLabel(project.locationId);
  const photos = Array.isArray(project.photos) ? project.photos : [];
  const locationName = project.locationId
    ? placeName || staticLocationLabel(project.locationId) || 'Selected location'
    : '';

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.projectCard, active && styles.projectCardActive]}
      accessibilityRole="button"
    >
      {photos[0] ? (
        <Image source={{ uri: photos[0] }} style={styles.projectThumb} />
      ) : (
        <View style={[styles.projectThumb, styles.projectThumbPlaceholder]}>
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.projectCopy}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {project.name || 'Untitled project'}
        </Text>
        <Text style={styles.projectMeta} numberOfLines={1}>
          {[
            locationName || null,
            project.sizeSqft
              ? `${project.sizeSqft} ${project.sizeUnit === 'SQM' ? 'sq m' : 'sq ft'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Add project details'}
        </Text>
        {project.description ? (
          <Text style={styles.projectDescription} numberOfLines={2}>
            {project.description}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${project.name ?? 'project'}`}
      >
        <Ionicons name="trash-outline" size={19} color={colors.danger} />
      </Pressable>
    </Pressable>
  );
}

export default function ProjectsScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [pendingPhotos, setPendingPhotos] = useState<PickedProjectPhoto[]>([]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const locationLabel = usePlaceLabel(form.locationId);

  const listQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listMine,
  });

  // Projects unlock only after Role & Expertise is saved and verification
  // is complete (same rule as the web). Enforced here so every way into
  // this screen -- My Profile, Edit Profile, links -- is covered.
  const projectsLock = useProjectsLock();

  // Edit Profile opens a specific project with ?id=...; without it the
  // screen starts on a blank "Add project" form.
  const { id: requestedId } = useLocalSearchParams<{ id?: string }>();
  const openedRequested = useRef(false);
  useEffect(() => {
    if (openedRequested.current || !requestedId || !Array.isArray(listQuery.data)) return;
    const match = listQuery.data.find((project) => String(project.id) === String(requestedId));
    openedRequested.current = true;
    if (match) setForm(projectToForm(match));
  }, [requestedId, listQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = projectPayload(form);
      let saved = form.id
        ? await projectsApi.update(form.id, payload)
        : await projectsApi.create(payload);

      setForm(projectToForm(saved));
      for (const photo of pendingPhotos) {
        try {
          saved = await projectsApi.uploadPhoto(saved.id, photo);
        } catch (error) {
          throw new Error(
            `Project details were saved, but a photo could not be uploaded. ${getErrorMessage(error)}`,
          );
        }
        setForm(projectToForm(saved));
        setPendingPhotos((current) => current.slice(1));
      }

      return saved;
    },
    onSuccess: (saved) => {
      setForm(projectToForm(saved));
      setPendingPhotos([]);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      appAlert('Project saved', 'Your project details have been updated.');
    },
    onError: (error) => appAlert('Could not save project', getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => projectsApi.remove(id),
    onSuccess: (_result, id) => {
      if (String(form.id) === String(id)) {
        setForm(EMPTY_FORM);
        setPendingPhotos([]);
      }
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      appAlert('Project deleted', 'The project has been removed from your profile.');
    },
    onError: (error) => appAlert('Could not delete project', getErrorMessage(error)),
  });

  const removePhotoMutation = useMutation({
    mutationFn: ({ id, url }: { id: string | number; url: string }) =>
      projectsApi.removePhoto(id, url),
    onSuccess: (updated) => {
      if (String(form.id) === String(updated.id)) setForm(projectToForm(updated));
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => appAlert('Could not remove photo', getErrorMessage(error)),
  });

  const startNewProject = () => {
    setForm(EMPTY_FORM);
    setPendingPhotos([]);
    setFormError('');
  };

  const pickPhotos = async () => {
    const remaining = MAX_PROJECT_PHOTOS - form.photoUrls.length - pendingPhotos.length;
    if (remaining <= 0) {
      setFormError('A project can have up to 3 photos.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert('Permission needed', 'Allow photo library access to add project photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;

    const added: PickedProjectPhoto[] = [];
    const errors: string[] = [];
    for (const asset of result.assets) {
      const mime = (asset.mimeType ?? 'image/jpeg').toLowerCase();
      const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
      if (!ALLOWED_PHOTO_TYPES.has(normalizedMime)) {
        errors.push('Use JPEG, PNG, or WebP photos.');
        continue;
      }
      if (asset.fileSize != null && asset.fileSize > MAX_PHOTO_BYTES) {
        errors.push('Each photo must be 5 MB or smaller.');
        continue;
      }
      added.push({
        uri: asset.uri,
        name: asset.fileName ?? `project-photo-${Date.now()}-${added.length}.jpg`,
        type: normalizedMime,
        fileSize: asset.fileSize,
      });
    }

    setPendingPhotos((current) => [...current, ...added].slice(0, remaining));
    setFormError(errors[0] ?? '');
  };

  const submit = () => {
    const missingName = !form.name.trim();
    const missingDescription = !form.description.trim();
    const missingPhoto = form.photoUrls.length + pendingPhotos.length === 0;
    const missing: string[] = [];
    if (missingName) missing.push('project name');
    if (missingDescription) missing.push('description');
    if (missingPhoto) missing.push('at least one photo');
    if (missing.length) {
      setFormError(`Add ${missing.join(', ')} to save this project.`);
      return;
    }

    const size = Number(form.size.replace(/,/g, ''));
    if (form.size.trim() && (!Number.isFinite(size) || size < 0)) {
      setFormError('Enter a valid project size.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  const projects = Array.isArray(listQuery.data) ? listQuery.data : [];
  const selectedLocation =
    locationLabel ||
    staticLocationLabel(form.locationId) ||
    (form.locationId ? 'Selected location' : '');
  const canAddPhoto =
    form.photoUrls.length + pendingPhotos.length < MAX_PROJECT_PHOTOS;

  if (listQuery.isLoading || projectsLock.loading) return <ListSkeleton />;

  if (projectsLock.locked) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={26} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Projects are locked</Text>
          <Text style={styles.lockedBody}>{projectsLock.message}</Text>
          <Button
            title={projectsLock.needsRoleExpertise ? 'Complete Role & Expertise' : 'Continue to Verification'}
            onPress={() =>
              router.replace(
                projectsLock.needsRoleExpertise ? '/edit-profile?tab=role-expertise' : '/verification',
              )
            }
          />
          <Button title="Go back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.formHeadingRow}>
              <View style={styles.flex}>
                <Text style={styles.heading}>
                  {form.id ? 'Edit project' : 'Add project'}
                </Text>
                <Text style={styles.subheading}>
                  Add details and photos to showcase your work.
                </Text>
              </View>
              {form.id ? (
                <Pressable onPress={startNewProject} accessibilityRole="button">
                  <Text style={styles.newProjectLink}>New</Text>
                </Pressable>
              ) : null}
            </View>

            <TextField
              label="Project name"
              required
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="Enter project name"
            />

            <Text style={styles.fieldLabel}>Project size</Text>
            <View style={styles.sizeRow}>
              <View style={styles.sizeField}>
                <TextField
                  accessibilityLabel="Project size"
                  keyboardType="number-pad"
                  value={form.size}
                  onChangeText={(size) =>
                    setForm((current) => ({
                      ...current,
                      size: size.replace(/[^\d]/g, ''),
                    }))
                  }
                  placeholder="Enter size"
                  inputRowStyle={styles.sizeInputRow}
                />
              </View>
              <View style={styles.unitToggle}>
                {(['SQFT', 'SQM'] as const).map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setForm((current) => ({ ...current, sizeUnit: unit }))}
                    style={[
                      styles.unitOption,
                      form.sizeUnit === unit && styles.unitOptionActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: form.sizeUnit === unit }}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        form.sizeUnit === unit && styles.unitTextActive,
                      ]}
                    >
                      {unit === 'SQFT' ? 'sq ft' : 'sq m'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.fieldLabel}>Project location</Text>
            <Pressable
              style={styles.locationButton}
              onPress={() => setLocationPickerOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="location-outline" size={19} color={colors.textMuted} />
              <Text
                style={[
                  styles.locationText,
                  !selectedLocation && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {selectedLocation || 'Select location'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <TextField
              label="Awards"
              value={form.awards}
              onChangeText={(awards) =>
                setForm((current) => ({ ...current, awards }))
              }
              placeholder="Add project awards or recognition"
            />
            <TextField
              label="Project description"
              required
              multiline
              value={form.description}
              onChangeText={(description) =>
                setForm((current) => ({ ...current, description }))
              }
              placeholder="Describe the project, your role, and its highlights"
              style={styles.descriptionInput}
              inputRowStyle={styles.descriptionInputRow}
            />

            <View style={styles.photosHeader}>
              <View>
                <Text style={styles.fieldLabel}>Project photos</Text>
                <Text style={styles.photoHint}>Add 1–3 photos. Max 5 MB each.</Text>
              </View>
              <Text style={styles.photoCount}>
                {form.photoUrls.length + pendingPhotos.length}/{MAX_PROJECT_PHOTOS}
              </Text>
            </View>
            <View style={styles.photoGrid}>
              {form.photoUrls.map((url, index) => (
                <View key={`saved-${url}`} style={styles.photoSlot}>
                  <Image source={{ uri: url }} style={styles.photoImage} />
                  <Pressable
                    style={styles.removePhotoButton}
                    onPress={() =>
                      form.id &&
                      removePhotoMutation.mutate({ id: form.id, url })
                    }
                    disabled={removePhotoMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove project photo ${index + 1}`}
                  >
                    <Ionicons name="close" size={15} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {pendingPhotos.map((photo, index) => (
                <View key={photo.uri} style={styles.photoSlot}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <Pressable
                    style={styles.removePhotoButton}
                    onPress={() =>
                      setPendingPhotos((current) =>
                        current.filter((_, photoIndex) => photoIndex !== index),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove selected photo ${index + 1}`}
                  >
                    <Ionicons name="close" size={15} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {canAddPhoto ? (
                <Pressable
                  style={[styles.photoSlot, styles.addPhotoSlot]}
                  onPress={() => void pickPhotos()}
                  accessibilityRole="button"
                  accessibilityLabel="Add project photo"
                >
                  <Ionicons name="add" size={28} color={colors.primary} />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </Pressable>
              ) : null}
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Button
              title={form.id ? 'Save changes' : 'Save project'}
              loading={saveMutation.isPending}
              onPress={submit}
            />
          </View>

          <View style={styles.projectsSection}>
            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>Your projects</Text>
              <Text style={styles.projectCount}>{projects.length}</Text>
            </View>
            {listQuery.isError ? (
              <ErrorState
                title="Couldn't load projects"
                message={getErrorMessage(listQuery.error, 'Please try again.')}
                onRetry={() => void listQuery.refetch()}
              />
            ) : projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                message="Your saved projects will appear here."
              />
            ) : (
              projects.map((project) => {
                return (
                  <ProjectListItem
                    key={String(project.id)}
                    project={project}
                    active={String(form.id) === String(project.id)}
                    onSelect={() => {
                      setForm(projectToForm(project));
                      setPendingPhotos([]);
                      setFormError('');
                    }}
                    onDelete={() =>
                      appAlert(
                        'Delete project?',
                        'This project and its photos will be removed from your profile.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteMutation.mutate(project.id),
                          },
                        ],
                      )
                    }
                  />
                );
              })
            )}
          </View>
        </KeyboardAwareScrollView>
      </View>

      <LocationAutocomplete
        visible={locationPickerOpen}
        initialValue={selectedLocation}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(location) => {
          setForm((current) => ({
            ...current,
            locationId: location.placeId || location.name,
          }));
          setLocationPickerOpen(false);
        }}
        placeholder="Search city or area"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  lockedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  lockedIcon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  lockedTitle: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  lockedBody: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  formCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  formHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  heading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  subheading: {
    marginTop: 3,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  newProjectLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sizeField: { flex: 1, minWidth: 0 },
  sizeInputRow: {
    minHeight: 48,
  },
  unitToggle: {
    flexDirection: 'row',
    marginTop: 26,
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  unitOption: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  unitOptionActive: {
    backgroundColor: colors.white,
    elevation: 1,
  },
  unitText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  unitTextActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  locationButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  locationText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  placeholderText: { color: colors.textMuted },
  descriptionInput: {
    minHeight: 104,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  descriptionInputRow: {
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  photoHint: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  photoCount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  addPhotoText: {
    marginTop: 2,
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    color: colors.primary,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  formError: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.danger,
  },
  projectsSection: { gap: spacing.sm },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  listTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  projectCount: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  projectCardActive: {
    borderColor: colors.primary,
  },
  projectThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  projectThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCopy: { flex: 1, minWidth: 0 },
  projectTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  projectMeta: {
    marginTop: 3,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  projectDescription: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
