jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {reducer, initialState} from '../StickersContext';
import type {AppState} from '../../types';

const PACK = {
  id: 'p1', name: 'Pack 1', publisher: 'PaqueteStickers',
  trayIconFile: '', stickers: [],
};
const STICKER = {id: 's1', imageFile: '/s1.webp', emojis: ['😀']};

describe('stickers reducer', () => {
  it('ADD_PACK inserts a new pack', () => {
    const state = reducer(initialState, {type: 'ADD_PACK', payload: {name: 'Pack 1', id: 'p1'}});
    expect(state.packs).toHaveLength(1);
    expect(state.packs[0].name).toBe('Pack 1');
    expect(state.packs[0].publisher).toBe('PaqueteStickers');
  });

  it('DELETE_PACK removes the pack', () => {
    const withPack: AppState = {packs: [PACK]};
    const state = reducer(withPack, {type: 'DELETE_PACK', payload: {packId: 'p1'}});
    expect(state.packs).toHaveLength(0);
  });

  it('ADD_STICKER appends sticker to pack', () => {
    const withPack: AppState = {packs: [PACK]};
    const state = reducer(withPack, {
      type: 'ADD_STICKER',
      payload: {packId: 'p1', sticker: STICKER},
    });
    expect(state.packs[0].stickers).toHaveLength(1);
    expect(state.packs[0].stickers[0].id).toBe('s1');
  });

  it('ADD_STICKER sets trayIconFile when provided', () => {
    const withPack: AppState = {packs: [PACK]};
    const state = reducer(withPack, {
      type: 'ADD_STICKER',
      payload: {packId: 'p1', sticker: STICKER, trayIconFile: '/tray.webp'},
    });
    expect(state.packs[0].trayIconFile).toBe('/tray.webp');
  });

  it('DELETE_STICKER removes the sticker', () => {
    const withSticker: AppState = {packs: [{...PACK, stickers: [STICKER]}]};
    const state = reducer(withSticker, {
      type: 'DELETE_STICKER',
      payload: {packId: 'p1', stickerId: 's1'},
    });
    expect(state.packs[0].stickers).toHaveLength(0);
  });

  it('LOAD_STATE replaces entire state', () => {
    const loaded: AppState = {packs: [PACK]};
    const state = reducer(initialState, {type: 'LOAD_STATE', payload: loaded});
    expect(state).toEqual(loaded);
  });
});
