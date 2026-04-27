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
