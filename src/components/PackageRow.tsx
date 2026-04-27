import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import type {StickerPack} from '../types';

type Props = {
  pack: StickerPack;
  onPress: () => void;
  onDelete: () => void;
};

export function PackageRow({pack, onPress, onDelete}: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.thumbnail}>
        {pack.trayIconFile ? (
          <Image source={{uri: `file://${pack.trayIconFile}`}} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{pack.name}</Text>
        <Text style={styles.count}>{pack.stickers.length} sticker{pack.stickers.length !== 1 ? 's' : ''}</Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginBottom: 1},
  thumbnail: {width: 48, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee'},
  image: {width: 48, height: 48},
  placeholder: {flex: 1, backgroundColor: '#ddd'},
  info: {flex: 1, marginLeft: 12},
  name: {fontSize: 16, fontWeight: '600'},
  count: {fontSize: 13, color: '#888', marginTop: 2},
  deleteBtn: {paddingHorizontal: 8},
  deleteText: {color: '#d00', fontSize: 13},
});
