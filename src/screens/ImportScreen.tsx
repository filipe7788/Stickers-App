import React from 'react';
import {View, Text, TouchableOpacity, Alert, StyleSheet, Platform} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import type {ScreenNavigationProp, ScreenRouteProp} from '../types';

type Props = {
  navigation: ScreenNavigationProp<'Import'>;
  route: ScreenRouteProp<'Import'>;
};

export function ImportScreen({navigation, route}: Props) {
  const {packId} = route.params;

  async function handleCamera() {
    const result = await launchCamera({mediaType: 'photo', quality: 1, saveToPhotos: false});
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    navigation.navigate('Crop', {packId, imageUri: result.assets[0].uri});
  }

  async function handleLibrary() {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 1, selectionLimit: 1});
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    navigation.navigate('Crop', {packId, imageUri: result.assets[0].uri});
  }

  async function handleFiles() {
    const DocumentPicker = require('react-native-document-picker').default;
    try {
      const res = await DocumentPicker.pickSingle({type: [DocumentPicker.types.images]});
      if (!res?.uri) return;
      const uri =
        Platform.OS === 'android'
          ? res.uri
          : `file://${decodeURIComponent(res.uri.replace('file://', ''))}`;
      navigation.navigate('Crop', {packId, imageUri: uri});
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        Alert.alert('Error', 'Could not open file picker.');
      }
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.option} onPress={handleCamera}>
        <Text style={styles.icon}>📷</Text>
        <View>
          <Text style={styles.label}>Camera</Text>
          <Text style={styles.sub}>Take a new photo</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleLibrary}>
        <Text style={styles.icon}>🖼️</Text>
        <View>
          <Text style={styles.label}>Photo Library</Text>
          <Text style={styles.sub}>Choose from your photos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleFiles}>
        <Text style={styles.icon}>📁</Text>
        <View>
          <Text style={styles.label}>Files</Text>
          <Text style={styles.sub}>Browse your files</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', padding: 16},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  icon: {fontSize: 32},
  label: {fontSize: 16, fontWeight: '600'},
  sub: {fontSize: 13, color: '#888', marginTop: 2},
});
