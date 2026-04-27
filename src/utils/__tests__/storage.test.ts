import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadState, saveState} from '../storage';
import type {AppState} from '../../types';

const EMPTY_STATE: AppState = {packs: []};
const SAMPLE_STATE: AppState = {
  packs: [
    {
      id: 'pack-1',
      name: 'Test Pack',
      publisher: 'PaqueteStickers',
      trayIconFile: '/docs/tray.webp',
      stickers: [],
    },
  ],
};

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('storage', () => {
  beforeEach(() => AsyncStorage.clear());

  it('loadState returns empty state when nothing stored', async () => {
    const state = await loadState();
    expect(state).toEqual(EMPTY_STATE);
  });

  it('saveState then loadState round-trips data', async () => {
    await saveState(SAMPLE_STATE);
    const state = await loadState();
    expect(state).toEqual(SAMPLE_STATE);
  });
});
