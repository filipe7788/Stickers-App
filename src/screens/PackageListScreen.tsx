import React, {useState} from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStickers} from '../hooks/useStickers';
import {PackageRow} from '../components/PackageRow';
import {deletePackDir} from '../utils/imageUtils';
import type {ScreenNavigationProp} from '../types';
import {v4 as uuidv4} from 'uuid';

type Props = {navigation: ScreenNavigationProp<'PackageList'>};

export function PackageListScreen({navigation}: Props) {
  const {state, dispatch} = useStickers();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const insets = useSafeAreaInsets();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    dispatch({type: 'ADD_PACK', payload: {id: uuidv4(), name}});
    setNewName('');
    setCreating(false);
  }

  function handleDelete(packId: string) {
    Alert.alert('Delete Pack', 'This will permanently delete the sticker pack.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deletePackDir(packId);
          dispatch({type: 'DELETE_PACK', payload: {packId}});
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={state.packs}
        keyExtractor={p => p.id}
        renderItem={({item}) => (
          <PackageRow
            pack={item}
            onPress={() => navigation.navigate('PackageDetail', {packId: item.id})}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sticker packs yet.</Text>
            <Text style={styles.emptyText}>Tap + to create one.</Text>
          </View>
        }
        contentContainerStyle={{flexGrow: 1}}
      />

      {creating && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Pack name"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={128}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, {bottom: insets.bottom + 24}]}
        onPress={() => setCreating(c => !c)}>
        <Text style={styles.fabText}>{creating ? '✕' : '+'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#888', fontSize: 15, marginTop: 4},
  inputRow: {flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee'},
  input: {flex: 1, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, marginRight: 8},
  createBtn: {backgroundColor: '#6d28d9', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center'},
  createBtnText: {color: '#fff', fontWeight: '600'},
  fab: {position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: {width: 0, height: 3}},
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
