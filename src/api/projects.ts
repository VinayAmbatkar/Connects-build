import { apiClient } from '@/src/api/client';
import type { Project } from '@/src/types/api';

function unwrapProjects(data: unknown): Project[] {
  if (Array.isArray(data)) return data as Project[];
  if (data && typeof data === 'object') {
    const body = data as { projects?: Project[] };
    if (Array.isArray(body.projects)) return body.projects;
  }
  return [];
}

function normalizeProject(raw: Project): Project {
  const photoUrls = (raw as { photoUrls?: string[] }).photoUrls;
  const photos =
    Array.isArray(raw.photos) && raw.photos.length
      ? raw.photos
      : Array.isArray(photoUrls)
        ? photoUrls
        : [];

  return {
    ...raw,
    photos: photos.map(String),
  };
}

export const projectsApi = {
  listMine: () =>
    apiClient.get('/projects').then((r) => unwrapProjects(r.data).map(normalizeProject)),

  listByUser: (userId: string | number) =>
    apiClient
      .get(`/projects/user/${userId}`)
      .then((r) => unwrapProjects(r.data).map(normalizeProject)),

  create: (payload: { name: string; locationId: string; sizeSqft: number }) =>
    apiClient.post<Project>('/projects', payload).then((r) => r.data),

  update: (
    id: string | number,
    payload: { name: string; locationId: string; sizeSqft: number },
  ) => apiClient.put<Project>(`/projects/${id}`, payload).then((r) => r.data),

  remove: (id: string | number) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),
};
