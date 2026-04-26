# WhatsApp Sticker Manager — Design Spec

**Date:** 2026-04-26  
**Platform:** React Native (bare workflow), iOS + Android  

---

## Overview

A React Native app to create and manage WhatsApp sticker packs. Users can create sticker packages, import images from camera/gallery/files, crop them, and send the pack directly to WhatsApp using the official sticker integration API.

Scope is intentionally minimal: package management, image import, image crop, and WhatsApp export. Nothing else.

---

## Architecture

### Navigation

React Navigation with a single `NativeStackNavigator`. Four screens in a linear stack:

```
PackageListScreen
  └── PackageDetailScreen
        └── ImportScreen
              └── CropScreen
```

No tab navigation. No modal overlays.

### State Management

React Context + `useReducer` for global sticker pack state. The state tree is simple:

```ts
type AppState = {
  packs: StickerPack[]
}
```

All mutations go through a single reducer. No Redux, no Zustand.

### Storage

- **`react-native-fs`** — stores sticker images as WebP files under the app's document directory: `<Documents>/stickers/<packId>/<stickerId>.webp` and `<Documents>/stickers/<packId>/tray.webp`
- **`@react-native-async-storage/async-storage`** — persists the `AppState` JSON (package metadata, ordering, emoji tags)

On app launch, AsyncStorage is read once and hydrated into Context.

---

## Data Model

```ts
type StickerPack = {
  id: string           // UUID
  name: string         // display name (max 128 chars), set by user on creation
  publisher: string    // defaults to "PaqueteStickers", not user-editable
  trayIconFile: string // absolute path, 96×96 WebP — auto-generated from first sticker
  stickers: Sticker[]  // 3–30 stickers (WhatsApp requirement)
}

type Sticker = {
  id: string           // UUID
  imageFile: string    // absolute path, 512×512 WebP, max 100KB
  emojis: string[]     // 1–3 emojis (WhatsApp requirement)
}
```

WhatsApp hard limits: minimum 3 stickers, maximum 30 per pack, each image ≤ 100KB, all WebP format.

---

## Screens

### 1. PackageListScreen

- Lists all sticker packs with name, tray icon thumbnail, and sticker count
- FAB (floating action button) to create a new pack — shows an inline text input for the pack name
- Tap a pack to navigate to PackageDetailScreen
- Swipe-to-delete on a pack row (with confirmation)

### 2. PackageDetailScreen

- Header: pack name, back button, "Send to WhatsApp" button (disabled if < 3 stickers)
- Grid (3 columns) of sticker thumbnails
- Last cell is always an "+" add button — taps navigate to ImportScreen
- Long-press a sticker to delete it (with confirmation)
- Tray icon: auto-set from the first sticker added (96×96 WebP saved alongside the sticker file)

### 3. ImportScreen

- Three options presented as tappable rows:
  - **Camera** — opens device camera via `react-native-image-picker`, captures photo
  - **Photo Library** — opens system photo picker
  - **Files** — opens system file picker (accepts images only)
- After selection, navigates immediately to CropScreen with the chosen image

### 4. CropScreen

- Full-screen dark background with the image displayed underneath
- Gesture-driven crop box:
  - Drag inside to pan the image
  - Drag corner handles to resize the crop area
  - Pinch to zoom the image
- "Square" toggle button — constrains crop box to 1:1 aspect ratio when active; remembers last used state
- Rule-of-thirds grid lines shown while dragging, fades out when still
- Output size is always 512×512 WebP regardless of crop shape — free-form crops get transparent padding
- "Done" button in nav bar: crops the image, converts to WebP via `react-native-image-manipulator`, saves to filesystem, updates state, then calls `navigation.navigate('PackageDetail')` to pop back directly (skipping ImportScreen). If this is the first sticker added to the pack, also saves a 96×96 WebP copy as the tray icon.

---

## Libraries

| Purpose | Library |
|---|---|
| Image import | `react-native-image-picker` |
| Crop gestures | `react-native-gesture-handler` + `react-native-reanimated` |
| Image resize & WebP conversion | `react-native-image-manipulator` |
| Filesystem | `react-native-fs` |
| Metadata persistence | `@react-native-async-storage/async-storage` |
| Navigation | `@react-navigation/native` + `@react-navigation/native-stack` |

---

## WhatsApp Integration

### Android

Implement a custom `ContentProvider` in Kotlin (`StickerContentProvider`) registered in `AndroidManifest.xml` with the authority `<appId>.stickercontentprovider`. This follows the official WhatsApp sticker sample app pattern.

The provider responds to two URI patterns:
- `content://<authority>/metadata` — returns a `Cursor` with all pack metadata
- `content://<authority>/<packId>/<stickerId>` — returns an `AssetFileDescriptor` for a sticker WebP file

WhatsApp queries this provider when the user taps "Add to WhatsApp". The app triggers this by calling `startActivity` with the Intent action `com.whatsapp.intent.action.ENABLE_STICKER_PACK`.

### iOS

Implement a custom native module in Swift (`WhatsAppStickerModule`) that:
1. Copies sticker WebP files to a shared temporary directory accessible by WhatsApp
2. Constructs the sticker pack payload as JSON
3. Opens WhatsApp via URL scheme: `whatsapp://stickerPack?...` with the pack parameters encoded

The module is called from JS via `NativeModules.WhatsAppStickerModule.sendPack(pack)`.

### Shared constraints

Both platforms require WhatsApp to be installed. The "Send to WhatsApp" button checks for WhatsApp availability before enabling:
- Android: `PackageManager.getApplicationInfo("com.whatsapp", 0)`
- iOS: `UIApplication.shared.canOpenURL(URL(string: "whatsapp://")!)`

---

## Error Handling

- **Image too large after crop** (> 100KB): show an alert prompting the user to crop tighter or use a simpler image. Do not add the sticker.
- **WhatsApp not installed**: "Send to WhatsApp" button is hidden/disabled with a tooltip explaining WhatsApp is required.
- **File picker cancelled**: no-op, stay on ImportScreen.
- **Storage errors** (disk full, permissions denied): show an alert with the error message.
- **Pack < 3 stickers**: "Send to WhatsApp" button is disabled with a count badge showing how many more are needed (e.g. "Need 2 more").

---

## File Structure

```
src/
  context/
    StickersContext.tsx      # Context + useReducer
  screens/
    PackageListScreen.tsx
    PackageDetailScreen.tsx
    ImportScreen.tsx
    CropScreen.tsx
  components/
    CropBox.tsx              # Gesture-driven crop overlay
    StickerGrid.tsx          # 3-column sticker grid
    PackageRow.tsx           # Single row in package list
  hooks/
    useStickers.ts           # Context consumer hook
    useWhatsApp.ts           # WhatsApp availability + send
  utils/
    imageUtils.ts            # Crop, resize, WebP conversion
    storage.ts               # AsyncStorage read/write helpers
  navigation/
    AppNavigator.tsx         # NativeStackNavigator setup
android/
  app/src/main/java/.../
    StickerContentProvider.kt
ios/
  PaqueteStickers/
    WhatsAppStickerModule.swift
    WhatsAppStickerModule.m   # ObjC bridge header
```
