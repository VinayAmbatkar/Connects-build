import { apiClient } from '@/src/api/client';
import type { Project } from '@/src/types/api';
import { appendNativeFile } from '@/src/utils/nativeFormData';

export type ProjectPayload = {
  name: string;
  locationId: string;
  sizeSqft: number;
  sizeUnit: 'SQFT' | 'SQM';
  awards: string;
  description: string;
};

export type PickedProjectPhoto = {
  uri: string;
  name: string;
  type: string;
  fileSize?: number | null;
};

function unwrapProjects(data: unknown): Project[] {
  if (Array.isArray(data)) return data as Project[];
  if (data && typeof data === 'object') {
    const body = data as { projects?: Project[] };
    if (Array.isArray(body.projects)) return body.projects;
  }
  throw new Error('The server returned an invalid projects response.');
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

function normalizeProjectResponse(data: unknown): Project {
  if (!data || typeof data !== 'object') {
    throw new Error('The server returned an invalid project response.');
  }
  const body = data as { data?: Project };
  const raw = body.data && typeof body.data === 'object' ? body.data : (data as Project);
  return normalizeProject(raw);
}

function photoForm(photo: PickedProjectPhoto): FormData {
  const form = new FormData();
  appendNativeFile(form, 'file', {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  });
  return form;
}

export const projectsApi = {
  listMine: () =>
    apiClient.get('/projects').then((r) => unwrapProjects(r.data).map(normalizeProject)),

  listByUser: (userId: string | number) =>
    apiClient
      .get(`/projects/user/${userId}`)
      .then((r) => unwrapProjects(r.data).map(normalizeProject)),

  create: (payload: ProjectPayload) =>
    apiClient.post<unknown>('/projects', payload).then((r) => normalizeProjectResponse(r.data)),

  update: (id: string | number, payload: ProjectPayload) =>
    apiClient
      .put<unknown>(`/projects/${id}`, payload)
      .then((r) => normalizeProjectResponse(r.data)),

  remove: (id: string | number) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),

  uploadPhoto: (id: string | number, photo: PickedProjectPhoto) =>
    apiClient
      .post<unknown>(`/projects/${id}/photos`, photoForm(photo), {
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => normalizeProjectResponse(r.data)),

  removePhoto: (id: string | number, photoUrl: string) =>
    apiClient
      .delete<unknown>(`/projects/${id}/photos`, { data: { photoUrl } })
      .then((r) => normalizeProjectResponse(r.data)),
};
