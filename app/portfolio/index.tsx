import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { getErrorMessage } from '@/src/api/client';
import { portfolioApi } from '@/src/api/portfolio';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export default function PortfolioScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => portfolioApi.listPhotos(userId as string | number),
    enabled: Boolean(userId),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library permission is required.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) {
        throw new Error('No image selected');
      }
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'portfolio.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      return portfolioApi.upload(formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
      Alert.alert('Uploaded', 'Portfolio photo added.');
    },
    onError: (error) => {
      if (getErrorMessage(error) !== 'No image selected') {
        Alert.alert('Upload failed', getErrorMessage(error));
      }
    },
  });

  if (!userId) {
    return <EmptyState title="Sign in required" message="Log in to manage portfolio photos." />;
  }

  if (listQuery.isLoading) return <LoadingState />;

  const data = Array.isArray(listQuery.data)
    ? listQuery.data
    : Array.isArray((listQuery.data as { photos?: unknown[] })?.photos)
      ? ((listQuery.data as { photos: unknown[] }).photos)
      : [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Button
          title="Upload photo"
          onPress={() => uploadMutation.mutate()}
          loading={uploadMutation.isPending}
        />
      </View>
      <FlatList
        data={data as Array<{ id?: string | number; url?: string }>}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState title="No photos" message="Upload work samples to your portfolio." />
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.title}>Photo {index + 1}</Text>
            <Text style={styles.meta}>{item.url ?? `ID ${item.id}`}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  list: { padding: spacing.md },
  empty: { flexGrow: 1 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 4 },
});
