# WhatsApp Sticker Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bare React Native app (iOS + Android) to create WhatsApp sticker packs, import/crop images, and send packs to WhatsApp via the official native API.

**Architecture:** NativeStackNavigator with 4 screens (PackageList → PackageDetail → Import → Crop). React Context + useReducer for state. `react-native-fs` stores WebP files on disk, AsyncStorage persists metadata. Custom Kotlin `ContentProvider` on Android and Swift native module on iOS for WhatsApp integration.

**Tech Stack:** React Native 0.75 (bare), TypeScript, `@react-navigation/native-stack`, `react-native-gesture-handler`, `react-native-reanimated` v3, `expo-image-manipulator`, `react-native-image-picker`, `react-native-fs`, `@react-native-async-storage/async-storage`

---

## File Map

```
src/
  types.ts                          create — StickerPack, Sticker, nav param list
  context/
    StickersContext.tsx             create — Context, useReducer, provider
  hooks/
    useStickers.ts                  create — consumer hook
    useWhatsApp.ts                  create — availability check + send
  utils/
    storage.ts                      create — AsyncStorage load/save helpers
    imageUtils.ts                   create — crop coords → image pixels, WebP save
  navigation/
    AppNavigator.tsx                create — NativeStackNavigator
  screens/
    PackageListScreen.tsx           create
    PackageDetailScreen.tsx         create
    ImportScreen.tsx                create
    CropScreen.tsx                  create
  components/
    PackageRow.tsx                  create — single row in list
    StickerGrid.tsx                 create — 3-col grid with + cell
    CropBox.tsx                     create — gesture-driven crop overlay
App.tsx                             modify — wrap with GestureHandlerRootView + Provider
android/app/src/main/
  java/com/paquestickers/
    StickerContentProvider.kt       create
  AndroidManifest.xml               modify — register ContentProvider + queries
ios/PaqueteStickers/
  WhatsAppStickerModule.swift       create
  WhatsAppStickerModule.m           create — ObjC bridge header
  Info.plist                        modify — LSApplicationQueriesSchemes
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `App.tsx` (via RN init)
- Modify: `App.tsx`

- [ ] **Step 1: Initialise the project**

```bash
cd /Users/filipecruz/Desktop
npx react-native@0.75 init PaqueteStickers --template react-native-template-typescript
cd PaqueteStickers
```

- [ ] **Step 2: Install JS dependencies**

```bash
npm install \
  @react-navigation/native \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-image-picker \
  react-native-fs \
  @react-native-async-storage/async-storage \
  expo-modules-core \
  expo-image-manipulator
```

- [ ] **Step 3: Install iOS pods**

```bash
cd ios && pod install && cd ..
```

- [ ] **Step 4: Configure Reanimated — add babel plugin**

Open `babel.config.js`. It must look like this (the reanimated plugin **must be last**):

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

- [ ] **Step 5: Configure Expo modules (required for expo-image-manipulator)**

```bash
npx expo install --fix
```

If prompted, accept defaults. This sets up `expo-modules-core` in `AppDelegate.mm` (iOS) and `MainApplication.kt` (Android).

- [ ] **Step 6: Replace App.tsx with the GestureHandler + SafeArea wrapper**

```tsx
// App.tsx
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {StickersProvider} from './src/context/StickersContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StickersProvider>
          <AppNavigator />
        </StickersProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 7: Verify the app boots**

```bash
npx react-native run-ios
# or
npx react-native run-android
```

Expected: Metro bundler starts, app opens on simulator/device with no crash.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: initialise bare RN project with all dependencies"
```

---

## Task 2: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types.ts
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

export type Sticker = {
  id: string;
  imageFile: string;  // absolute path, 512×512 WebP
  emojis: string[];   // 1–3 emojis
};

export type StickerPack = {
  id: string;
  name: string;
  publisher: string;
  trayIconFile: string; // absolute path, 96×96 WebP
  stickers: Sticker[];
};

export type AppState = {
  packs: StickerPack[];
};

export type RootStackParamList = {
  PackageList: undefined;
  PackageDetail: {packId: string};
  Import: {packId: string};
  Crop: {packId: string; imageUri: string};
};

export type ScreenNavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type ScreenRouteProp<T extends keyof RootStackParamList> =
  RouteProp<RootStackParamList, T>;
```

- [ ] **Step 2: Write type tests (compile-only)**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript types for sticker packs and navigation"
```

---

## Task 3: Storage Utilities

**Files:**
- Create: `src/utils/storage.ts`
- Test: `src/utils/__tests__/storage.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/__tests__/storage.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/utils/__tests__/storage.test.ts
```

Expected: FAIL — `loadState` not found.

- [ ] **Step 3: Implement storage.ts**

```ts
// src/utils/storage.ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/utils/__tests__/storage.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/__tests__/storage.test.ts
git commit -m "feat: add AsyncStorage load/save helpers with tests"
```

---

## Task 4: Image Utilities

**Files:**
- Create: `src/utils/imageUtils.ts`
- Test: `src/utils/__tests__/imageUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/__tests__/imageUtils.test.ts
import {computeCropRegion, stickerDir, trayIconPath, stickerPath} from '../imageUtils';

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/docs',
  mkdir: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({uri: '/mock/output.webp'}),
  SaveFormat: {WEBP: 'webp'},
}));

describe('imageUtils', () => {
  describe('computeCropRegion', () => {
    it('converts screen crop rect to image pixel coordinates', () => {
      // Image displayed at 375x375 on screen, original is 750x750
      // Crop box at screen x=50, y=50, w=275, h=275
      const region = computeCropRegion(
        {x: 50, y: 50, width: 275, height: 275},
        {displayX: 0, displayY: 0, displayWidth: 375, displayHeight: 375},
        {imageWidth: 750, imageHeight: 750},
      );
      expect(region).toEqual({originX: 100, originY: 100, width: 550, height: 550});
    });
  });

  describe('path helpers', () => {
    it('stickerDir returns correct path', () => {
      expect(stickerDir('pack-1')).toBe('/mock/docs/stickers/pack-1');
    });
    it('stickerPath returns correct path', () => {
      expect(stickerPath('pack-1', 'stk-1')).toBe('/mock/docs/stickers/pack-1/stk-1.webp');
    });
    it('trayIconPath returns correct path', () => {
      expect(trayIconPath('pack-1')).toBe('/mock/docs/stickers/pack-1/tray.webp');
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/utils/__tests__/imageUtils.test.ts
```

Expected: FAIL — `computeCropRegion` not found.

- [ ] **Step 3: Implement imageUtils.ts**

```ts
// src/utils/imageUtils.ts
import RNFS from 'react-native-fs';
import * as ImageManipulator from 'expo-image-manipulator';

export type ScreenRect = {x: number; y: number; width: number; height: number};
export type DisplayRect = {displayX: number; displayY: number; displayWidth: number; displayHeight: number};
export type ImageSize = {imageWidth: number; imageHeight: number};
export type CropRegion = {originX: number; originY: number; width: number; height: number};

export function computeCropRegion(
  screenCrop: ScreenRect,
  display: DisplayRect,
  original: ImageSize,
): CropRegion {
  const scaleX = original.imageWidth / display.displayWidth;
  const scaleY = original.imageHeight / display.displayHeight;
  return {
    originX: Math.round((screenCrop.x - display.displayX) * scaleX),
    originY: Math.round((screenCrop.y - display.displayY) * scaleY),
    width: Math.round(screenCrop.width * scaleX),
    height: Math.round(screenCrop.height * scaleY),
  };
}

export function stickerDir(packId: string): string {
  return `${RNFS.DocumentDirectoryPath}/stickers/${packId}`;
}

export function stickerPath(packId: string, stickerId: string): string {
  return `${stickerDir(packId)}/${stickerId}.webp`;
}

export function trayIconPath(packId: string): string {
  return `${stickerDir(packId)}/tray.webp`;
}

export async function ensurePackDir(packId: string): Promise<void> {
  const dir = stickerDir(packId);
  const exists = await RNFS.exists(dir);
  if (!exists) await RNFS.mkdir(dir);
}

export type ProcessedSticker = {uri: string; filePath: string; sizeBytes: number};

export async function processAndSaveSticker(
  sourceUri: string,
  cropRegion: CropRegion,
  packId: string,
  stickerId: string,
): Promise<ProcessedSticker> {
  await ensurePackDir(packId);
  const destPath = stickerPath(packId, stickerId);

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      {crop: cropRegion},
      {resize: {width: 512, height: 512}},
    ],
    {compress: 0.85, format: ImageManipulator.SaveFormat.WEBP},
  );

  await RNFS.moveFile(result.uri, destPath);
  const stat = await RNFS.stat(destPath);
  return {uri: `file://${destPath}`, filePath: destPath, sizeBytes: Number(stat.size)};
}

export async function processTrayIcon(
  sourceUri: string,
  cropRegion: CropRegion,
  packId: string,
): Promise<string> {
  await ensurePackDir(packId);
  const destPath = trayIconPath(packId);

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      {crop: cropRegion},
      {resize: {width: 96, height: 96}},
    ],
    {compress: 0.85, format: ImageManipulator.SaveFormat.WEBP},
  );

  await RNFS.moveFile(result.uri, destPath);
  return destPath;
}

export async function deleteStickerFile(filePath: string): Promise<void> {
  const exists = await RNFS.exists(filePath);
  if (exists) await RNFS.unlink(filePath);
}

export async function deletePackDir(packId: string): Promise<void> {
  const dir = stickerDir(packId);
  const exists = await RNFS.exists(dir);
  if (exists) await RNFS.unlink(dir);
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/utils/__tests__/imageUtils.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/imageUtils.ts src/utils/__tests__/imageUtils.test.ts
git commit -m "feat: add image utility functions for crop, resize, WebP save"
```

---

## Task 5: Context + Reducer

**Files:**
- Create: `src/context/StickersContext.tsx`
- Create: `src/hooks/useStickers.ts`
- Test: `src/context/__tests__/reducer.test.ts`

- [ ] **Step 1: Write failing reducer tests**

```ts
// src/context/__tests__/reducer.test.ts
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest src/context/__tests__/reducer.test.ts
```

Expected: FAIL — `reducer` not found.

- [ ] **Step 3: Implement StickersContext.tsx**

```tsx
// src/context/StickersContext.tsx
import React, {createContext, useReducer, useEffect, useRef} from 'react';
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
      dispatch({type: 'LOAD_STATE', payload: s});
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveState(state);
  }, [state]);

  return (
    <StickersContext.Provider value={{state, dispatch}}>
      {children}
    </StickersContext.Provider>
  );
}
```

- [ ] **Step 4: Implement useStickers.ts**

```ts
// src/hooks/useStickers.ts
import {useContext} from 'react';
import {StickersContext} from '../context/StickersContext';

export function useStickers() {
  return useContext(StickersContext);
}
```

- [ ] **Step 5: Run reducer tests**

```bash
npx jest src/context/__tests__/reducer.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/context/StickersContext.tsx src/hooks/useStickers.ts src/context/__tests__/reducer.test.ts
git commit -m "feat: add stickers context, reducer, and useStickers hook"
```

---

## Task 6: Navigation

**Files:**
- Create: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Create the navigator**

```tsx
// src/navigation/AppNavigator.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';
import {PackageListScreen} from '../screens/PackageListScreen';
import {PackageDetailScreen} from '../screens/PackageDetailScreen';
import {ImportScreen} from '../screens/ImportScreen';
import {CropScreen} from '../screens/CropScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PackageList">
        <Stack.Screen
          name="PackageList"
          component={PackageListScreen}
          options={{title: 'My Sticker Packs'}}
        />
        <Stack.Screen
          name="PackageDetail"
          component={PackageDetailScreen}
          options={{title: ''}}
        />
        <Stack.Screen
          name="Import"
          component={ImportScreen}
          options={{title: 'Add Sticker'}}
        />
        <Stack.Screen
          name="Crop"
          component={CropScreen}
          options={{title: 'Crop Image', headerBackVisible: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Create placeholder screens so navigation compiles**

Create each file with a minimal placeholder. Replace in later tasks.

```tsx
// src/screens/PackageListScreen.tsx
import React from 'react';
import {View, Text} from 'react-native';
export function PackageListScreen() {
  return <View><Text>PackageList</Text></View>;
}
```

```tsx
// src/screens/PackageDetailScreen.tsx
import React from 'react';
import {View, Text} from 'react-native';
export function PackageDetailScreen() {
  return <View><Text>PackageDetail</Text></View>;
}
```

```tsx
// src/screens/ImportScreen.tsx
import React from 'react';
import {View, Text} from 'react-native';
export function ImportScreen() {
  return <View><Text>Import</Text></View>;
}
```

```tsx
// src/screens/CropScreen.tsx
import React from 'react';
import {View, Text} from 'react-native';
export function CropScreen() {
  return <View><Text>Crop</Text></View>;
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/screens/
git commit -m "feat: add navigation stack with placeholder screens"
```

---

## Task 7: PackageListScreen

**Files:**
- Modify: `src/screens/PackageListScreen.tsx`
- Create: `src/components/PackageRow.tsx`

- [ ] **Step 1: Create PackageRow component**

```tsx
// src/components/PackageRow.tsx
import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import type {StickerPack} from '../types';

type Props = {
  pack: StickerPack;
  onPress: () => void;
  onDelete: () => void;
};

export function PackageRow({pack, onPress, onDelete}: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.thumbnail}>
        {pack.trayIconFile ? (
          <Image source={{uri: `file://${pack.trayIconFile}`}} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{pack.name}</Text>
        <Text style={styles.count}>{pack.stickers.length} sticker{pack.stickers.length !== 1 ? 's' : ''}</Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginBottom: 1},
  thumbnail: {width: 48, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee'},
  image: {width: 48, height: 48},
  placeholder: {flex: 1, backgroundColor: '#ddd'},
  info: {flex: 1, marginLeft: 12},
  name: {fontSize: 16, fontWeight: '600'},
  count: {fontSize: 13, color: '#888', marginTop: 2},
  deleteBtn: {paddingHorizontal: 8},
  deleteText: {color: '#d00', fontSize: 13},
});
```

- [ ] **Step 2: Implement PackageListScreen**

```tsx
// src/screens/PackageListScreen.tsx
import React, {useState} from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStickers} from '../hooks/useStickers';
import {PackageRow} from '../components/PackageRow';
import {deletePackDir} from '../utils/imageUtils';
import type {ScreenNavigationProp} from '../types';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

// Note: install uuid: npm install uuid react-native-get-random-values
// add: import 'react-native-get-random-values' to index.js before App import

type Props = {navigation: ScreenNavigationProp<'PackageList'>};

export function PackageListScreen({navigation}: Props) {
  const {state, dispatch} = useStickers();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const insets = useSafeAreaInsets();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    dispatch({type: 'ADD_PACK', payload: {id: uuidv4(), name}});
    setNewName('');
    setCreating(false);
  }

  function handleDelete(packId: string) {
    Alert.alert('Delete Pack', 'This will permanently delete the sticker pack.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deletePackDir(packId);
          dispatch({type: 'DELETE_PACK', payload: {packId}});
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={state.packs}
        keyExtractor={p => p.id}
        renderItem={({item}) => (
          <PackageRow
            pack={item}
            onPress={() => navigation.navigate('PackageDetail', {packId: item.id})}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sticker packs yet.</Text>
            <Text style={styles.emptyText}>Tap + to create one.</Text>
          </View>
        }
        contentContainerStyle={{flexGrow: 1}}
      />

      {creating && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Pack name"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={128}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, {bottom: insets.bottom + 24}]}
        onPress={() => setCreating(c => !c)}>
        <Text style={styles.fabText}>{creating ? '✕' : '+'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#888', fontSize: 15, marginTop: 4},
  inputRow: {flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee'},
  input: {flex: 1, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, marginRight: 8},
  createBtn: {backgroundColor: '#6d28d9', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center'},
  createBtnText: {color: '#fff', fontWeight: '600'},
  fab: {position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: {width: 0, height: 3}},
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
```

- [ ] **Step 3: Install uuid**

```bash
npm install uuid react-native-get-random-values
npm install --save-dev @types/uuid
```

Add to `index.js` (before the App import):

```js
import 'react-native-get-random-values';
```

- [ ] **Step 4: Verify the app renders PackageListScreen**

```bash
npx react-native run-ios
```

Expected: home screen shows "No sticker packs yet", FAB in bottom right.

- [ ] **Step 5: Commit**

```bash
git add src/screens/PackageListScreen.tsx src/components/PackageRow.tsx index.js
git commit -m "feat: implement PackageListScreen with FAB and pack creation"
```

---

## Task 8: PackageDetailScreen

**Files:**
- Modify: `src/screens/PackageDetailScreen.tsx`
- Create: `src/components/StickerGrid.tsx`

- [ ] **Step 1: Create StickerGrid component**

```tsx
// src/components/StickerGrid.tsx
import React from 'react';
import {View, Image, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import type {Sticker} from '../types';

const COLS = 3;
const GAP = 4;
const CELL = (Dimensions.get('window').width - GAP * (COLS + 1)) / COLS;

type Props = {
  stickers: Sticker[];
  onAdd: () => void;
  onLongPress: (sticker: Sticker) => void;
  canAdd: boolean; // false when pack has 30 stickers
};

export function StickerGrid({stickers, onAdd, onLongPress, canAdd}: Props) {
  const cells = [...stickers, canAdd ? '__add__' : null].filter(Boolean);

  return (
    <View style={styles.grid}>
      {cells.map(item => {
        if (item === '__add__') {
          return (
            <TouchableOpacity key="__add__" style={[styles.cell, styles.addCell]} onPress={onAdd}>
              <View style={styles.addIcon}><Image source={require('../assets/plus.png')} style={styles.plusIcon} /></View>
            </TouchableOpacity>
          );
        }
        const sticker = item as Sticker;
        return (
          <TouchableOpacity
            key={sticker.id}
            style={styles.cell}
            onLongPress={() => onLongPress(sticker)}
            delayLongPress={400}>
            <Image source={{uri: `file://${sticker.imageFile}`}} style={styles.stickerImg} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: GAP},
  cell: {width: CELL, height: CELL, margin: GAP / 2, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee'},
  addCell: {alignItems: 'center', justifyContent: 'center', backgroundColor: '#ede9fe'},
  addIcon: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  plusIcon: {width: 32, height: 32, tintColor: '#6d28d9'},
  stickerImg: {width: CELL, height: CELL},
});
```

- [ ] **Step 2: Add a plus icon asset**

Create `src/assets/plus.png`. Use any 64×64 plus icon PNG (white or transparent), or generate one:

```bash
# Quick approach: copy a system plus icon, or use a base64 embedded image.
# Alternatively, replace the Image with a Text component:
```

Replace the `<Image source={require('../assets/plus.png')} ...>` in StickerGrid with:

```tsx
<View style={styles.addIcon}>
  <View style={styles.plusH} />
  <View style={styles.plusV} />
</View>
```

And add to styles:

```ts
plusH: {position: 'absolute', width: 24, height: 3, backgroundColor: '#6d28d9', borderRadius: 2},
plusV: {position: 'absolute', width: 3, height: 24, backgroundColor: '#6d28d9', borderRadius: 2},
```

Remove the `plusIcon` style and the `Image` import for the plus icon.

- [ ] **Step 3: Implement PackageDetailScreen**

```tsx
// src/screens/PackageDetailScreen.tsx
import React from 'react';
import {View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView} from 'react-native';
import {useStickers} from '../hooks/useStickers';
import {StickerGrid} from '../components/StickerGrid';
import {deleteStickerFile} from '../utils/imageUtils';
import {useWhatsApp} from '../hooks/useWhatsApp';
import type {ScreenNavigationProp, ScreenRouteProp, Sticker} from '../types';

type Props = {
  navigation: ScreenNavigationProp<'PackageDetail'>;
  route: ScreenRouteProp<'PackageDetail'>;
};

export function PackageDetailScreen({navigation, route}: Props) {
  const {packId} = route.params;
  const {state, dispatch} = useStickers();
  const {isAvailable, sendPack} = useWhatsApp();

  const pack = state.packs.find(p => p.id === packId);
  if (!pack) return null;

  const needed = Math.max(0, 3 - pack.stickers.length);

  React.useLayoutEffect(() => {
    navigation.setOptions({title: pack.name});
  }, [navigation, pack.name]);

  function handleDeleteSticker(sticker: Sticker) {
    Alert.alert('Delete Sticker', 'Remove this sticker from the pack?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteStickerFile(sticker.imageFile);
          dispatch({type: 'DELETE_STICKER', payload: {packId, stickerId: sticker.id}});
        },
      },
    ]);
  }

  async function handleSend() {
    try {
      await sendPack(pack);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send to WhatsApp');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <StickerGrid
          stickers={pack.stickers}
          canAdd={pack.stickers.length < 30}
          onAdd={() => navigation.navigate('Import', {packId})}
          onLongPress={handleDeleteSticker}
        />
      </ScrollView>

      <View style={styles.footer}>
        {needed > 0 ? (
          <Text style={styles.needed}>Need {needed} more sticker{needed !== 1 ? 's' : ''} to send</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.sendBtn, (!isAvailable || needed > 0) && styles.sendBtnDisabled]}
          disabled={!isAvailable || needed > 0}
          onPress={handleSend}>
          <Text style={styles.sendBtnText}>
            {isAvailable ? 'Send to WhatsApp' : 'WhatsApp not installed'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  footer: {padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee'},
  needed: {textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 8},
  sendBtn: {backgroundColor: '#25d366', borderRadius: 10, padding: 14, alignItems: 'center'},
  sendBtnDisabled: {backgroundColor: '#ccc'},
  sendBtnText: {color: '#fff', fontWeight: '700', fontSize: 16},
});
```

- [ ] **Step 4: Create useWhatsApp stub so it compiles**

```ts
// src/hooks/useWhatsApp.ts  (stub — real implementation in Task 12)
import type {StickerPack} from '../types';

export function useWhatsApp() {
  return {
    isAvailable: false,
    sendPack: async (_pack: StickerPack) => {},
  };
}
```

- [ ] **Step 5: Verify navigation to PackageDetail works**

Run the app, create a pack, tap it. Expected: PackageDetail screen with empty grid and "Send to WhatsApp" disabled.

- [ ] **Step 6: Commit**

```bash
git add src/screens/PackageDetailScreen.tsx src/components/StickerGrid.tsx src/hooks/useWhatsApp.ts
git commit -m "feat: implement PackageDetailScreen and StickerGrid"
```

---

## Task 9: ImportScreen

**Files:**
- Modify: `src/screens/ImportScreen.tsx`

- [ ] **Step 1: Implement ImportScreen**

```tsx
// src/screens/ImportScreen.tsx
import React from 'react';
import {View, Text, TouchableOpacity, Alert, StyleSheet, Platform} from 'react-native';
import {launchCamera, launchImageLibrary, launchDocumentPicker} from 'react-native-image-picker';
import type {ScreenNavigationProp, ScreenRouteProp} from '../types';

// Note: react-native-image-picker v5+ uses launchCamera / launchImageLibrary.
// File picker: use react-native-document-picker for the Files option.
// Install: npm install react-native-document-picker

type Props = {
  navigation: ScreenNavigationProp<'Import'>;
  route: ScreenRouteProp<'Import'>;
};

export function ImportScreen({navigation, route}: Props) {
  const {packId} = route.params;

  async function handleCamera() {
    const result = await launchCamera({mediaType: 'photo', quality: 1, saveToPhotos: false});
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    navigation.navigate('Crop', {packId, imageUri: result.assets[0].uri});
  }

  async function handleLibrary() {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 1, selectionLimit: 1});
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    navigation.navigate('Crop', {packId, imageUri: result.assets[0].uri});
  }

  async function handleFiles() {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const res = await DocumentPicker.pickSingle({type: [DocumentPicker.types.images]});
      if (!res?.uri) return;
      const uri = Platform.OS === 'android' ? res.uri : decodeURIComponent(res.uri.replace('file://', ''));
      navigation.navigate('Crop', {packId, imageUri: Platform.OS === 'android' ? res.uri : `file://${uri}`});
    } catch (e: any) {
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Error', 'Could not open file picker.');
      }
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.option} onPress={handleCamera}>
        <Text style={styles.icon}>📷</Text>
        <View>
          <Text style={styles.label}>Camera</Text>
          <Text style={styles.sub}>Take a new photo</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleLibrary}>
        <Text style={styles.icon}>🖼️</Text>
        <View>
          <Text style={styles.label}>Photo Library</Text>
          <Text style={styles.sub}>Choose from your photos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleFiles}>
        <Text style={styles.icon}>📁</Text>
        <View>
          <Text style={styles.label}>Files</Text>
          <Text style={styles.sub}>Browse your files</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', padding: 16},
  option: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, gap: 16},
  icon: {fontSize: 32},
  label: {fontSize: 16, fontWeight: '600'},
  sub: {fontSize: 13, color: '#888', marginTop: 2},
});
```

- [ ] **Step 2: Install react-native-document-picker**

```bash
npm install react-native-document-picker
cd ios && pod install && cd ..
```

- [ ] **Step 3: Add iOS permissions to Info.plist**

In `ios/PaqueteStickers/Info.plist`, add:

```xml
<key>NSCameraUsageDescription</key>
<string>Used to take photos for stickers</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Used to pick photos for stickers</string>
```

- [ ] **Step 4: Add Android permissions to AndroidManifest.xml**

In `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

- [ ] **Step 5: Verify import screen works end-to-end (manual test)**

Run app, create pack, tap +, choose Photo Library. Expected: system photo picker opens, selecting a photo navigates to Crop screen (which still shows placeholder).

- [ ] **Step 6: Commit**

```bash
git add src/screens/ImportScreen.tsx android/app/src/main/AndroidManifest.xml ios/PaqueteStickers/Info.plist
git commit -m "feat: implement ImportScreen with camera, library, and file picker"
```

---

## Task 10: CropBox Component

**Files:**
- Create: `src/components/CropBox.tsx`

The CropBox renders the draggable/resizable overlay. It receives the container dimensions and exposes the current crop rect via a ref.

- [ ] **Step 1: Implement CropBox**

```tsx
// src/components/CropBox.tsx
import React, {useImperativeHandle, forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export type CropRect = {x: number; y: number; width: number; height: number};

export type CropBoxHandle = {
  getCropRect: () => CropRect;
};

type Props = {
  containerWidth: number;
  containerHeight: number;
  isSquare: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

const MIN_SIZE = 60;
const HANDLE_SIZE = 28;

export const CropBox = forwardRef<CropBoxHandle, Props>(
  ({containerWidth, containerHeight, isSquare, onDragStart, onDragEnd}, ref) => {
    const initialSize = Math.min(containerWidth, containerHeight) * 0.8;
    const initialX = (containerWidth - initialSize) / 2;
    const initialY = (containerHeight - initialSize) / 2;

    const x = useSharedValue(initialX);
    const y = useSharedValue(initialY);
    const w = useSharedValue(initialSize);
    const h = useSharedValue(initialSize);
    const showGrid = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      getCropRect: () => ({
        x: x.value,
        y: y.value,
        width: w.value,
        height: h.value,
      }),
    }));

    function clamp(value: number, min: number, max: number) {
      'worklet';
      return Math.min(Math.max(value, min), max);
    }

    // Move the whole box by panning inside it
    const moveGesture = Gesture.Pan()
      .onStart(() => {
        showGrid.value = withTiming(1, {duration: 100});
        if (onDragStart) runOnJS(onDragStart)();
      })
      .onUpdate(e => {
        x.value = clamp(x.value + e.changeX, 0, containerWidth - w.value);
        y.value = clamp(y.value + e.changeY, 0, containerHeight - h.value);
      })
      .onEnd(() => {
        showGrid.value = withTiming(0, {duration: 300});
        if (onDragEnd) runOnJS(onDragEnd)();
      });

    function makeCornerGesture(corner: 'tl' | 'tr' | 'bl' | 'br') {
      return Gesture.Pan()
        .onStart(() => {
          showGrid.value = withTiming(1, {duration: 100});
          if (onDragStart) runOnJS(onDragStart)();
        })
        .onUpdate(e => {
          const dx = e.changeX;
          const dy = e.changeY;
          if (corner === 'tl') {
            const newW = clamp(w.value - dx, MIN_SIZE, x.value + w.value);
            const newH = isSquare ? newW : clamp(h.value - dy, MIN_SIZE, y.value + h.value);
            x.value = clamp(x.value + (w.value - newW), 0, containerWidth - MIN_SIZE);
            y.value = clamp(y.value + (h.value - newH), 0, containerHeight - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else if (corner === 'tr') {
            const newW = clamp(w.value + dx, MIN_SIZE, containerWidth - x.value);
            const newH = isSquare ? newW : clamp(h.value - dy, MIN_SIZE, y.value + h.value);
            y.value = clamp(y.value + (h.value - newH), 0, containerHeight - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else if (corner === 'bl') {
            const newW = clamp(w.value - dx, MIN_SIZE, x.value + w.value);
            const newH = isSquare ? newW : clamp(h.value + dy, MIN_SIZE, containerHeight - y.value);
            x.value = clamp(x.value + (w.value - newW), 0, containerWidth - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else {
            const newW = clamp(w.value + dx, MIN_SIZE, containerWidth - x.value);
            const newH = isSquare ? newW : clamp(h.value + dy, MIN_SIZE, containerHeight - y.value);
            w.value = newW;
            h.value = newH;
          }
        })
        .onEnd(() => {
          showGrid.value = withTiming(0, {duration: 300});
          if (onDragEnd) runOnJS(onDragEnd)();
        });
    }

    const boxStyle = useAnimatedStyle(() => ({
      position: 'absolute',
      left: x.value,
      top: y.value,
      width: w.value,
      height: h.value,
    }));

    const gridStyle = useAnimatedStyle(() => ({opacity: showGrid.value}));

    return (
      <>
        {/* Dark overlay — four panels around the crop box */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none" />

        <Animated.View style={boxStyle}>
          {/* Clear crop window */}
          <GestureDetector gesture={moveGesture}>
            <Animated.View style={styles.cropWindow}>
              {/* Grid lines */}
              <Animated.View style={[StyleSheet.absoluteFill, gridStyle]} pointerEvents="none">
                <View style={[styles.gridLine, styles.gridH, {top: '33%'}]} />
                <View style={[styles.gridLine, styles.gridH, {top: '66%'}]} />
                <View style={[styles.gridLine, styles.gridV, {left: '33%'}]} />
                <View style={[styles.gridLine, styles.gridV, {left: '66%'}]} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {/* Border */}
          <View style={[StyleSheet.absoluteFill, styles.border]} pointerEvents="none" />

          {/* Corner handles */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
            <GestureDetector key={corner} gesture={makeCornerGesture(corner)}>
              <View style={[styles.handle, styles[corner]]} />
            </GestureDetector>
          ))}
        </Animated.View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {backgroundColor: 'rgba(0,0,0,0.5)'},
  cropWindow: {flex: 1},
  border: {borderWidth: 1.5, borderColor: '#fff'},
  gridLine: {position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)'},
  gridH: {left: 0, right: 0, height: 1},
  gridV: {top: 0, bottom: 0, width: 1},
  handle: {position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE},
  tl: {top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff'},
  tr: {top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#fff'},
  bl: {bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#fff'},
  br: {bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#fff'},
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CropBox.tsx
git commit -m "feat: implement gesture-driven CropBox with reanimated"
```

---

## Task 11: CropScreen

**Files:**
- Modify: `src/screens/CropScreen.tsx`

- [ ] **Step 1: Implement CropScreen**

```tsx
// src/screens/CropScreen.tsx
import React, {useRef, useState, useCallback} from 'react';
import {
  View, Image, Text, TouchableOpacity, Alert,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CropBox, CropBoxHandle} from '../components/CropBox';
import {computeCropRegion, processAndSaveSticker, processTrayIcon} from '../utils/imageUtils';
import {useStickers} from '../hooks/useStickers';
import type {ScreenNavigationProp, ScreenRouteProp} from '../types';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

const MAX_STICKER_BYTES = 100 * 1024; // 100 KB

type Props = {
  navigation: ScreenNavigationProp<'Crop'>;
  route: ScreenRouteProp<'Crop'>;
};

const SCREEN = Dimensions.get('window');

export function CropScreen({navigation, route}: Props) {
  const {packId, imageUri} = route.params;
  const {state, dispatch} = useStickers();
  const insets = useSafeAreaInsets();
  const cropBoxRef = useRef<CropBoxHandle>(null);
  const [isSquare, setIsSquare] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [imageSize, setImageSize] = useState<{width: number; height: number} | null>(null);

  // The image fills the full screen width, height proportional
  const displayWidth = SCREEN.width;
  const displayHeight = SCREEN.height - insets.top - insets.bottom - 44; // minus nav bar

  const pack = state.packs.find(p => p.id === packId);

  const handleDone = useCallback(async () => {
    if (!cropBoxRef.current || !imageSize) return;
    const cropRect = cropBoxRef.current.getCropRect();

    const region = computeCropRegion(
      cropRect,
      {displayX: 0, displayY: 0, displayWidth, displayHeight},
      {imageWidth: imageSize.width, imageHeight: imageSize.height},
    );

    setProcessing(true);
    try {
      const stickerId = uuidv4();
      const {filePath, sizeBytes} = await processAndSaveSticker(
        imageUri, region, packId, stickerId,
      );

      if (sizeBytes > MAX_STICKER_BYTES) {
        Alert.alert(
          'Image Too Large',
          `The cropped sticker is ${Math.round(sizeBytes / 1024)}KB. WhatsApp requires ≤ 100KB. Try cropping tighter or use a simpler image.`,
        );
        return;
      }

      const isFirstSticker = !pack || pack.stickers.length === 0;
      let trayIconFile: string | undefined;

      if (isFirstSticker) {
        trayIconFile = await processTrayIcon(imageUri, region, packId);
      }

      dispatch({
        type: 'ADD_STICKER',
        payload: {
          packId,
          sticker: {id: stickerId, imageFile: filePath, emojis: ['😀']},
          trayIconFile,
        },
      });

      navigation.navigate('PackageDetail', {packId});
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  }, [cropBoxRef, imageSize, imageUri, packId, pack, dispatch, navigation, displayWidth, displayHeight]);

  return (
    <View style={styles.container}>
      {/* Image behind crop box */}
      <Image
        source={{uri: imageUri}}
        style={{width: displayWidth, height: displayHeight}}
        resizeMode="contain"
        onLoad={e => setImageSize({
          width: e.nativeEvent.source.width,
          height: e.nativeEvent.source.height,
        })}
      />

      {/* Crop overlay */}
      <View style={[StyleSheet.absoluteFill, {top: insets.top + 44}]} pointerEvents="box-none">
        <CropBox
          ref={cropBoxRef}
          containerWidth={displayWidth}
          containerHeight={displayHeight}
          isSquare={isSquare}
        />
      </View>

      {/* Bottom controls */}
      <View style={[styles.controls, {paddingBottom: insets.bottom + 12}]}>
        <TouchableOpacity
          style={[styles.squareToggle, isSquare && styles.squareToggleActive]}
          onPress={() => setIsSquare(s => !s)}>
          <Text style={[styles.squareToggleText, isSquare && styles.squareToggleTextActive]}>
            ⬛ Square
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} disabled={processing}>
          {processing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.doneBtnText}>Done</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  squareToggle: {borderWidth: 1.5, borderColor: '#888', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7},
  squareToggleActive: {borderColor: '#a78bfa', backgroundColor: 'rgba(109,40,217,0.2)'},
  squareToggleText: {color: '#aaa', fontSize: 13, fontWeight: '500'},
  squareToggleTextActive: {color: '#a78bfa'},
  doneBtn: {backgroundColor: '#6d28d9', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 9},
  doneBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},
});
```

- [ ] **Step 2: Manual end-to-end test**

Run app → create pack → tap + → Photo Library → select photo → CropScreen opens with crop overlay → move corners → tap Done. Expected: sticker appears in PackageDetail grid.

- [ ] **Step 3: Commit**

```bash
git add src/screens/CropScreen.tsx
git commit -m "feat: implement CropScreen with image processing and sticker save"
```

---

## Task 12: Android ContentProvider

**Files:**
- Create: `android/app/src/main/java/com/paquestickers/StickerContentProvider.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Create StickerContentProvider.kt**

Place in `android/app/src/main/java/com/paquestickers/`:

```kotlin
package com.paquestickers

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.ReactApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import android.content.SharedPreferences

class StickerContentProvider : ContentProvider() {

    companion object {
        const val AUTHORITY = "com.paquestickers.stickercontentprovider"
        const val METADATA_CODE = 1
        const val STICKERS_CODE = 2

        val uriMatcher = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, "metadata", METADATA_CODE)
            addURI(AUTHORITY, "*/stickers/*", STICKERS_CODE)
        }
    }

    override fun onCreate() = true

    override fun query(uri: Uri, projection: Array<String>?, selection: String?,
                       selectionArgs: Array<String>?, sortOrder: String?): Cursor? {
        if (uriMatcher.match(uri) != METADATA_CODE) return null

        val prefs = context!!.getSharedPreferences("paquestickers_state", 0)
        val raw = prefs.getString("state", null) ?: return null
        val packs = JSONObject(raw).getJSONArray("packs")

        // Pack list cursor
        if (uri.pathSegments.size == 1) {
            val cursor = MatrixCursor(arrayOf(
                "identifier", "name", "publisher", "tray_image_file",
                "android_play_store_link", "ios_app_store_link"
            ))
            for (i in 0 until packs.length()) {
                val p = packs.getJSONObject(i)
                cursor.addRow(arrayOf(
                    p.getString("id"),
                    p.getString("name"),
                    p.getString("publisher"),
                    p.getString("trayIconFile"),
                    "", ""
                ))
            }
            return cursor
        }
        return null
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        if (uriMatcher.match(uri) != STICKERS_CODE) return null
        // URI format: content://authority/<packId>/stickers/<stickerId>
        val segments = uri.pathSegments
        val packId = segments[0]
        val stickerId = segments[2]
        val docsDir = context!!.filesDir.parent ?: return null
        val file = File("$docsDir/files/stickers/$packId/$stickerId.webp")
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun getType(uri: Uri) = when (uriMatcher.match(uri)) {
        METADATA_CODE -> "vnd.android.cursor.dir/vnd.$AUTHORITY.metadata"
        STICKERS_CODE -> "image/webp"
        else -> null
    }

    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?) = 0
}
```

- [ ] **Step 2: Register ContentProvider in AndroidManifest.xml**

Inside the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<provider
    android:name=".StickerContentProvider"
    android:authorities="com.paquestickers.stickercontentprovider"
    android:exported="true" />

<queries>
    <package android:name="com.whatsapp" />
    <package android:name="com.whatsapp.w4b" />
</queries>
```

The `<queries>` block goes inside `<manifest>` (not inside `<application>`).

- [ ] **Step 3: Write state bridge — save AsyncStorage state to SharedPreferences**

AsyncStorage stores data in SQLite on Android, but the ContentProvider needs it in SharedPreferences. Add a native module to bridge this.

Create `android/app/src/main/java/com/paquestickers/StateModule.kt`:

```kotlin
package com.paquestickers

import com.facebook.react.bridge.*

class StateModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "StateModule"

    @ReactMethod
    fun saveState(stateJson: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("paquestickers_state", 0)
            prefs.edit().putString("state", stateJson).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
```

Create `android/app/src/main/java/com/paquestickers/StatePackage.kt`:

```kotlin
package com.paquestickers

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class StatePackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(StateModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
```

Register in `MainApplication.kt` inside `getPackages()`:

```kotlin
packages.add(StatePackage())
```

- [ ] **Step 4: Call saveState from JS whenever state changes**

In `src/context/StickersContext.tsx`, update the save effect:

```ts
useEffect(() => {
  if (!loaded.current) return;
  saveState(state);
  // Mirror state to Android SharedPreferences for ContentProvider
  if (Platform.OS === 'android') {
    NativeModules.StateModule?.saveState(JSON.stringify(state));
  }
}, [state]);
```

Add `import {NativeModules, Platform} from 'react-native';` at the top.

- [ ] **Step 5: Commit**

```bash
git add android/
git commit -m "feat: implement Android ContentProvider for WhatsApp sticker integration"
```

---

## Task 13: iOS WhatsApp Native Module

**Files:**
- Create: `ios/PaqueteStickers/WhatsAppStickerModule.swift`
- Create: `ios/PaqueteStickers/WhatsAppStickerModule.m`
- Modify: `ios/PaqueteStickers/Info.plist`

- [ ] **Step 1: Create the Swift module**

```swift
// ios/PaqueteStickers/WhatsAppStickerModule.swift
import Foundation
import UIKit

@objc(WhatsAppStickerModule)
class WhatsAppStickerModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  @objc func sendPack(_ pack: NSDictionary,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let name = pack["name"] as? String,
          let publisher = pack["publisher"] as? String,
          let stickers = pack["stickers"] as? [[String: Any]],
          let packId = pack["id"] as? String else {
      reject("INVALID_PACK", "Invalid pack data", nil)
      return
    }

    // Build query items
    var queryItems = [URLQueryItem]()
    queryItems.append(URLQueryItem(name: "identifier", value: packId))
    queryItems.append(URLQueryItem(name: "name", value: name))
    queryItems.append(URLQueryItem(name: "publisher", value: publisher))

    // Encode tray icon
    if let trayPath = pack["trayIconFile"] as? String,
       let trayData = try? Data(contentsOf: URL(fileURLWithPath: trayPath)) {
      queryItems.append(URLQueryItem(name: "tray_image", value: trayData.base64EncodedString()))
    }

    // Encode sticker images (first 30 max)
    for (i, sticker) in stickers.prefix(30).enumerated() {
      if let imagePath = sticker["imageFile"] as? String,
         let imageData = try? Data(contentsOf: URL(fileURLWithPath: imagePath)) {
        queryItems.append(URLQueryItem(name: "sticker_image_\(i)", value: imageData.base64EncodedString()))
        if let emojis = sticker["emojis"] as? [String] {
          queryItems.append(URLQueryItem(name: "sticker_emojis_\(i)", value: emojis.joined()))
        }
      }
    }

    var components = URLComponents()
    components.scheme = "whatsapp"
    components.host = "stickerPack"
    components.queryItems = queryItems

    guard let url = components.url else {
      reject("URL_ERROR", "Could not build WhatsApp URL", nil)
      return
    }

    DispatchQueue.main.async {
      if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url, options: [:]) { success in
          if success { resolve(nil) }
          else { reject("OPEN_FAILED", "WhatsApp did not open", nil) }
        }
      } else {
        reject("NOT_INSTALLED", "WhatsApp is not installed", nil)
      }
    }
  }

  @objc func isWhatsAppInstalled(_ resolve: RCTPromiseResolveBlock,
                                  rejecter reject: RCTPromiseRejectBlock) {
    guard let url = URL(string: "whatsapp://") else {
      resolve(false); return
    }
    resolve(UIApplication.shared.canOpenURL(url))
  }
}
```

- [ ] **Step 2: Create the ObjC bridge header**

```objc
// ios/PaqueteStickers/WhatsAppStickerModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WhatsAppStickerModule, NSObject)

RCT_EXTERN_METHOD(sendPack:(NSDictionary *)pack
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isWhatsAppInstalled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

- [ ] **Step 3: Register whatsapp:// URL scheme in Info.plist**

In `ios/PaqueteStickers/Info.plist`, add inside the root `<dict>`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>whatsapp</string>
</array>
```

- [ ] **Step 4: Run pod install**

```bash
cd ios && pod install && cd ..
```

- [ ] **Step 5: Commit**

```bash
git add ios/PaqueteStickers/WhatsAppStickerModule.swift ios/PaqueteStickers/WhatsAppStickerModule.m ios/PaqueteStickers/Info.plist
git commit -m "feat: implement iOS WhatsApp native module for sticker pack transfer"
```

---

## Task 14: Wire Up useWhatsApp + Final Integration

**Files:**
- Modify: `src/hooks/useWhatsApp.ts`

- [ ] **Step 1: Implement useWhatsApp**

```ts
// src/hooks/useWhatsApp.ts
import {useState, useEffect} from 'react';
import {NativeModules, Platform, Linking} from 'react-native';
import type {StickerPack} from '../types';

export function useWhatsApp() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkAvailability().then(setIsAvailable);
  }, []);

  async function checkAvailability(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return NativeModules.WhatsAppStickerModule?.isWhatsAppInstalled() ?? false;
    }
    // Android: check if whatsapp:// can be opened
    return Linking.canOpenURL('whatsapp://send?text=hello').catch(() => false);
  }

  async function sendPack(pack: StickerPack): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModules.WhatsAppStickerModule.sendPack(pack);
    } else {
      // Android: trigger the ContentProvider intent via a native module
      // The ContentProvider is already registered; WhatsApp queries it automatically
      // when we fire the ENABLE_STICKER_PACK intent.
      const {NativeModules: NM} = require('react-native');
      await NM.StateModule?.saveState(JSON.stringify({packs: [pack]}));

      const intentUrl = `intent:#Intent;action=com.whatsapp.intent.action.ENABLE_STICKER_PACK;S.sticker_pack_id=${pack.id};S.sticker_pack_authority=com.paquestickers.stickercontentprovider;S.sticker_pack_name=${encodeURIComponent(pack.name)};end`;
      await Linking.openURL(intentUrl);
    }
  }

  return {isAvailable, sendPack};
}
```

- [ ] **Step 2: Full end-to-end manual test**

1. Install WhatsApp on the test device/simulator
2. Run the app
3. Create a sticker pack
4. Add 3+ stickers via camera or library
5. Tap "Send to WhatsApp"
6. Expected on Android: WhatsApp opens and prompts to add the sticker pack
7. Expected on iOS: WhatsApp opens with the sticker pack

- [ ] **Step 3: Run all tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass.

- [ ] **Step 4: Final commit**

```bash
git add src/hooks/useWhatsApp.ts
git commit -m "feat: implement useWhatsApp hook and complete WhatsApp integration"
```

---

## Summary

| Task | Deliverable |
|---|---|
| 1 | Project scaffold, all deps installed |
| 2 | TypeScript types |
| 3 | AsyncStorage load/save (tested) |
| 4 | Image utilities — crop coords, WebP save (tested) |
| 5 | Context + reducer (tested) |
| 6 | Navigation stack |
| 7 | PackageListScreen + PackageRow |
| 8 | PackageDetailScreen + StickerGrid |
| 9 | ImportScreen |
| 10 | CropBox gesture component |
| 11 | CropScreen |
| 12 | Android ContentProvider |
| 13 | iOS WhatsApp native module |
| 14 | useWhatsApp hook + full integration |
