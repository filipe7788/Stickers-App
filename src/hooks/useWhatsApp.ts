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
      try {
        return await NativeModules.WhatsAppStickerModule?.isWhatsAppInstalled() ?? false;
      } catch {
        return false;
      }
    }
    // Android: check if WhatsApp is installed via Linking
    return Linking.canOpenURL('whatsapp://send?text=hello').catch(() => false);
  }

  async function sendPack(pack: StickerPack): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModules.WhatsAppStickerModule.sendPack(pack);
      return;
    }

    // Android: save state for the ContentProvider, then fire the intent
    await NativeModules.StateModule?.saveState(JSON.stringify({packs: [pack]}));

    const intentUrl =
      `intent:#Intent;` +
      `action=com.whatsapp.intent.action.ENABLE_STICKER_PACK;` +
      `S.sticker_pack_id=${encodeURIComponent(pack.id)};` +
      `S.sticker_pack_authority=com.paquetestickers.stickercontentprovider;` +
      `S.sticker_pack_name=${encodeURIComponent(pack.name)};` +
      `end`;

    await Linking.openURL(intentUrl);
  }

  return {isAvailable, sendPack};
}
