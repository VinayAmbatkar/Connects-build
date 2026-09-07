import { apiClient } from '@/src/api/client';

export const portfolioApi = {
  listPhotos: (userId: string | number) =>
    apiClient.get(`/portfolio/${userId}/photos`).then((r) => r.data),
  upload: (formData: FormData) =>
    apiClient
      .post('/portfolio/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  remove: (photoId: string | number) =>
    apiClient.delete(`/portfolio/photos/${photoId}`).then((r) => r.data),
};
