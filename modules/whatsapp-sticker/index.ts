import { requireNativeModule } from 'expo-modules-core';

type Sticker = { imagePath: string; emojis: string[] };

type SendPackParams = {
  identifier: string;
  name: string;
  publisher: string;
  trayImagePath: string;
  stickers: Sticker[];
};

type WhatsAppStickerModule = {
  sendPack(params: SendPackParams): Promise<void>;
};

export default requireNativeModule<WhatsAppStickerModule>('WhatsAppSticker');
