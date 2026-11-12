jest.mock('@/src/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from '@/src/api/client';
import { groupsApi, MAX_GROUP_MEMBERS, messagesApi } from '@/src/api/messages';
import { routeForNotification } from '@/src/notifications/push';

const client = apiClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock>;
const mockGet = client.get;
const mockPost = client.post;
const mockPut = client.put;
const mockPatch = client.patch;
const mockDel = client.delete;

beforeEach(() => {
  for (const fn of [mockGet, mockPost, mockPut, mockPatch, mockDel]) {
    fn.mockReset();
    fn.mockResolvedValue({ data: {} });
  }
});

describe('groupsApi', () => {
  it('matches the backend member cap', () => {
    expect(MAX_GROUP_MEMBERS).toBe(15);
  });

  it('lists groups and unwraps them', async () => {
    mockGet.mockResolvedValue({ data: { groups: [{ id: 3, name: 'Team' }] } });
    await expect(groupsApi.list()).resolves.toEqual([{ id: 3, name: 'Team' }]);
    expect(mockGet).toHaveBeenCalledWith('/messages/groups', { params: { page: 1, limit: 50 } });
  });

  it('creates, adds, removes and leaves on the group endpoints', async () => {
    await groupsApi.create('Site team', ['a', 'b']);
    expect(mockPost).toHaveBeenCalledWith('/messages/groups', { name: 'Site team', memberIds: ['a', 'b'] });

    await groupsApi.addMembers(3, ['c']);
    expect(mockPost).toHaveBeenCalledWith('/messages/groups/3/members', { memberIds: ['c'] });

    await groupsApi.removeMember(3, 'c d');
    expect(mockDel).toHaveBeenCalledWith('/messages/groups/3/members/c%20d');

    await groupsApi.leave(3);
    expect(mockPost).toHaveBeenCalledWith('/messages/groups/3/leave');

    await groupsApi.rename(3, 'New');
    expect(mockPatch).toHaveBeenCalledWith('/messages/groups/3', { name: 'New' });
  });

  it('sends text and attachments into the group, not a conversation', async () => {
    await groupsApi.sendText(3, 'hi');
    expect(mockPost).toHaveBeenCalledWith('/messages/groups/3/messages', { body: 'hi' });

    await groupsApi.sendAttachment(3, { uri: 'file://a.pdf', name: 'a.pdf', type: 'application/pdf' }, ' cap ');
    const [url, form] = mockPost.mock.calls[mockPost.mock.calls.length - 1];
    expect(url).toBe('/messages/groups/3/attachment');
    expect(form).toBeInstanceOf(FormData);

    await groupsApi.markRead(3);
    expect(mockPut).toHaveBeenCalledWith('/messages/groups/3/read');
  });

  it('marks a group as the open thread', async () => {
    await messagesApi.setActiveGroup(3);
    expect(mockPut).toHaveBeenCalledWith('/messages/active', { conversationId: null, groupId: 3 });
  });
});

describe('push routing', () => {
  it('opens the right chat for message notifications', () => {
    expect(routeForNotification({ type: 'NEW_MESSAGE', referenceId: 7 })).toBe('/chat/7');
    expect(routeForNotification({ type: 'NEW_GROUP_MESSAGE', referenceId: 3 })).toBe('/group/3');
    expect(routeForNotification({ type: 'ADDED_TO_GROUP', referenceId: 3 })).toBe('/group/3');
    expect(routeForNotification({ type: 'NEW_GROUP_MESSAGE' })).toBe('/notifications');
  });
});
