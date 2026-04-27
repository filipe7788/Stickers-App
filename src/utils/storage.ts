import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AppState} from '../types';

const STATE_KEY = '@paquestickers/state';
const EMPTY: AppState = {packs: []};

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return EMPTY;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return EMPTY;
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}
