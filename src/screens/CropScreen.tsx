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

  const NAV_BAR_HEIGHT = 44;
  const displayWidth = SCREEN.width;
  const displayHeight = SCREEN.height - insets.top - insets.bottom - NAV_BAR_HEIGHT;

  const pack = state.packs.find(p => p.id === packId);

  const handleDone = useCallback(async () => {
    if (!cropBoxRef.current || !imageSize || !pack) return;
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

      const isFirstSticker = pack.stickers.length === 0;
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
      <Image
        source={{uri: imageUri}}
        style={{width: displayWidth, height: displayHeight}}
        resizeMode="contain"
        onLoad={e => setImageSize({
          width: e.nativeEvent.source.width,
          height: e.nativeEvent.source.height,
        })}
      />

      <View
        style={[StyleSheet.absoluteFill, {top: insets.top + NAV_BAR_HEIGHT}]}
        pointerEvents="box-none">
        <CropBox
          ref={cropBoxRef}
          containerWidth={displayWidth}
          containerHeight={displayHeight}
          isSquare={isSquare}
        />
      </View>

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
