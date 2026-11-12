import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppDialogHost, appAlert, resetAppDialogs } from '@/src/components/AppDialog';
import { isPlaceId, staticLocationLabel } from '@/src/hooks/usePlaceLabels';
import { toCategoryParam, useSearchFlowStore } from '@/src/features/search/searchFlowStore';

jest.mock('@/src/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
import { apiClient } from '@/src/api/client';
import { blocksApi } from '@/src/api/blocks';

describe('appAlert (in-app dialog replacing the Android system popup)', () => {
  afterEach(() => act(() => resetAppDialogs()));

  it('shows title, message and buttons, and runs the tapped handler', () => {
    jest.useFakeTimers();
    const onBlock = jest.fn();
    render(<AppDialogHost />);
    act(() =>
      appAlert('Block Piyush?', 'They will not be told.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: onBlock },
      ]),
    );
    expect(screen.getByText('Block Piyush?')).toBeTruthy();
    expect(screen.getByText('They will not be told.')).toBeTruthy();
    fireEvent.press(screen.getByText('Block'));
    act(() => jest.runAllTimers());
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Block Piyush?')).toBeNull();
    jest.useRealTimers();
  });

  it('queues a second dialog instead of replacing the first', () => {
    render(<AppDialogHost />);
    act(() => {
      appAlert('First');
      appAlert('Second');
    });
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.queryByText('Second')).toBeNull();
    fireEvent.press(screen.getByText('OK'));
    expect(screen.getByText('Second')).toBeTruthy();
  });
});

describe('location labels (profiles showed raw place IDs)', () => {
  it('recognises Google place IDs, not codes or typed text', () => {
    expect(isPlaceId('ChIJx9Lr6tqZyzsRwvu6koO3k64')).toBe(true);
    expect(isPlaceId('MUMBAI')).toBe(false);
    expect(isPlaceId('Navi Mumbai, Maharashtra')).toBe(false);
  });

  it('never returns a place ID as display text', () => {
    expect(staticLocationLabel('ChIJx9Lr6tqZyzsRwvu6koO3k64')).toBe('');
    expect(staticLocationLabel('MUMBAI')).toBe('Mumbai');
    expect(staticLocationLabel('NAVI_MUMBAI_X')).toBe('Navi Mumbai X');
    expect(staticLocationLabel('Pune, Maharashtra')).toBe('Pune, Maharashtra');
  });
});

describe('Find Connections multi-select', () => {
  beforeEach(() => act(() => useSearchFlowStore.getState().setRole('CONSULTANTS')));

  it('toggles several project types and types', () => {
    const s = useSearchFlowStore.getState();
    act(() => {
      s.toggleProjectType('LOW_RISE_RESIDENTIAL');
      s.toggleProjectType('COMMERCIAL');
      s.toggleDiscipline('DESIGNERS');
      s.toggleDiscipline('ENGINEERS');
    });
    const st = useSearchFlowStore.getState();
    expect(st.projectTypes).toEqual(['LOW_RISE_RESIDENTIAL', 'COMMERCIAL']);
    expect(st.disciplines).toEqual(['DESIGNERS', 'ENGINEERS']);
  });

  it('deselecting a type drops its categories', () => {
    const s = useSearchFlowStore.getState();
    act(() => {
      s.toggleDiscipline('DESIGNERS');
      s.toggleSpecialization('ARCHITECT');
      s.toggleDiscipline('DESIGNERS');
    });
    expect(useSearchFlowStore.getState().specializations).toEqual([]);
  });

  it('builds the backend category groups', () => {
    expect(toCategoryParam(['DESIGNERS', 'ENGINEERS'], ['ARCHITECT', 'URBAN_PLANNER'])).toBe(
      'DESIGNERS:ARCHITECT|URBAN_PLANNER,ENGINEERS',
    );
    expect(toCategoryParam(['BUILDINGS'], [])).toBe('BUILDINGS');
  });
});

describe('blocked users list', () => {
  it("reads the backend's { blockedUsers } shape (the list used to look empty)", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { blockedUserIds: ['u1'], blockedUsers: [{ userId: 'u1', fullName: 'Piyush', role: 'CONSULTANTS' }] },
    });
    await expect(blocksApi.list()).resolves.toEqual([{ userId: 'u1', fullName: 'Piyush', role: 'CONSULTANTS' }]);
  });
});
