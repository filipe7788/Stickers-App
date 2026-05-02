import {useState, useEffect} from 'react';
import {NativeModules, Platform, Linking} from 'react-native';
import type {StickerPack} from '../types';

// Loaded lazily so Android doesn't try to import the iOS-only module
let WhatsAppStickerModule: {sendPack(p: object): Promise<void>} | null = null;
if (Platform.OS === 'ios') {
  WhatsAppStickerModule = require('whatsapp-sticker').default;
}

export function useWhatsApp() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    Linking.canOpenURL('whatsapp://').then(setIsAvailable).catch(() => {});
  }, []);

  async function sendPack(pack: StickerPack): Promise<void> {
    if (Platform.OS === 'android') {
      await NativeModules.StateModule?.saveState(JSON.stringify({packs: [pack]}));
      const intentUrl =
        `intent:#Intent;` +
        `action=com.whatsapp.intent.action.ENABLE_STICKER_PACK;` +
        `S.sticker_pack_id=${encodeURIComponent(pack.id)};` +
        `S.sticker_pack_authority=com.filipecruz.paquetestickers.stickercontentprovider;` +
        `S.sticker_pack_name=${encodeURIComponent(pack.name)};` +
        `end`;
      await Linking.openURL(intentUrl);
      return;
    }

    await WhatsAppStickerModule!.sendPack({
      identifier: pack.id.replace(/-/g, ''),
      name: pack.name,
      publisher: pack.publisher || 'PaqueteStickers',
      trayImagePath: pack.trayIconFile,
      stickers: pack.stickers.map(s => ({imagePath: s.imageFile, emojis: s.emojis})),
    });
  }

  return {isAvailable, sendPack};
}
