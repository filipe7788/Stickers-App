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
  cropRegion: CropRegion | null,
  packId: string,
  stickerId: string,
): Promise<ProcessedSticker> {
  await ensurePackDir(packId);
  const destPath = stickerPath(packId, stickerId);

  const actions: ImageManipulator.Action[] = [];
  if (cropRegion) actions.push({crop: cropRegion});
  actions.push({resize: {width: 512, height: 512}});

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    actions,
    {compress: 0.85, format: ImageManipulator.SaveFormat.WEBP},
  );

  await RNFS.moveFile(result.uri, destPath);
  const stat = await RNFS.stat(destPath);
  return {uri: `file://${destPath}`, filePath: destPath, sizeBytes: Number(stat.size)};
}

export async function processTrayIcon(
  sourceUri: string,
  cropRegion: CropRegion | null,
  packId: string,
): Promise<string> {
  await ensurePackDir(packId);
  const destPath = trayIconPath(packId);

  const actions: ImageManipulator.Action[] = [];
  if (cropRegion) actions.push({crop: cropRegion});
  actions.push({resize: {width: 96, height: 96}});

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    actions,
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
