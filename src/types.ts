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
