// src/hooks/useWhatsApp.ts  (stub — real implementation in Task 14)
import type {StickerPack} from '../types';

export function useWhatsApp() {
  return {
    isAvailable: false,
    sendPack: async (_pack: StickerPack) => {},
  };
}
