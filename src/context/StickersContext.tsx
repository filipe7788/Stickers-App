import React, {createContext, useReducer, useEffect, useRef} from 'react';
import {Platform, NativeModules} from 'react-native';
import type {AppState, StickerPack, Sticker} from '../types';
import {loadState, saveState} from '../utils/storage';

type Action =
  | {type: 'LOAD_STATE'; payload: AppState}
  | {type: 'ADD_PACK'; payload: {id: string; name: string}}
  | {type: 'DELETE_PACK'; payload: {packId: string}}
  | {type: 'ADD_STICKER'; payload: {packId: string; sticker: Sticker; trayIconFile?: string}}
  | {type: 'DELETE_STICKER'; payload: {packId: string; stickerId: string}};

export const initialState: AppState = {packs: []};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_PACK': {
      const pack: StickerPack = {
        id: action.payload.id,
        name: action.payload.name,
        publisher: 'PaqueteStickers',
        trayIconFile: '',
        stickers: [],
      };
      return {packs: [...state.packs, pack]};
    }

    case 'DELETE_PACK':
      return {packs: state.packs.filter(p => p.id !== action.payload.packId)};

    case 'ADD_STICKER':
      return {
        packs: state.packs.map(p => {
          if (p.id !== action.payload.packId) return p;
          return {
            ...p,
            trayIconFile: action.payload.trayIconFile ?? p.trayIconFile,
            stickers: [...p.stickers, action.payload.sticker],
          };
        }),
      };

    case 'DELETE_STICKER':
      return {
        packs: state.packs.map(p => {
          if (p.id !== action.payload.packId) return p;
          return {
            ...p,
            stickers: p.stickers.filter(s => s.id !== action.payload.stickerId),
          };
        }),
      };

    default:
      return state;
  }
}

type ContextValue = {state: AppState; dispatch: React.Dispatch<Action>};
export const StickersContext = createContext<ContextValue>({
  state: initialState,
  dispatch: () => {},
});

export function StickersProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);

  useEffect(() => {
    loadState().then(s => {
      loaded.current = true;
      dispatch({type: 'LOAD_STATE', payload: s});
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    saveState(state);
    if (Platform.OS === 'android') {
      NativeModules.StateModule?.saveState(JSON.stringify(state));
    }
  }, [state]);

  return (
    <StickersContext.Provider value={{state, dispatch}}>
      {children}
    </StickersContext.Provider>
  );
}
