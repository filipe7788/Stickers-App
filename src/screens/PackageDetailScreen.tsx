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
    if (!pack) return;
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
