import React from 'react';
import {View, Image, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import type {Sticker} from '../types';

const COLS = 3;
const GAP = 4;
const CELL = (Dimensions.get('window').width - GAP * (COLS + 1)) / COLS;

type Props = {
  stickers: Sticker[];
  onAdd: () => void;
  onLongPress: (sticker: Sticker) => void;
  canAdd: boolean;
};

export function StickerGrid({stickers, onAdd, onLongPress, canAdd}: Props) {
  const cells: (Sticker | '__add__')[] = canAdd ? [...stickers, '__add__'] : [...stickers];

  return (
    <View style={styles.grid}>
      {cells.map(item => {
        if (item === '__add__') {
          return (
            <TouchableOpacity key="__add__" style={[styles.cell, styles.addCell]} onPress={onAdd}>
              <View style={styles.plusH} />
              <View style={styles.plusV} />
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.cell}
            onLongPress={() => onLongPress(item)}
            delayLongPress={400}>
            <Image source={{uri: `file://${item.imageFile}`}} style={styles.stickerImg} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: GAP},
  cell: {width: CELL, height: CELL, margin: GAP / 2, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee'},
  addCell: {alignItems: 'center', justifyContent: 'center', backgroundColor: '#ede9fe'},
  plusH: {position: 'absolute', width: 24, height: 3, backgroundColor: '#6d28d9', borderRadius: 2},
  plusV: {position: 'absolute', width: 3, height: 24, backgroundColor: '#6d28d9', borderRadius: 2},
  stickerImg: {width: CELL, height: CELL},
});
