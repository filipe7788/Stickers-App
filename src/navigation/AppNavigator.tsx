import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';
import {PackageListScreen} from '../screens/PackageListScreen';
import {PackageDetailScreen} from '../screens/PackageDetailScreen';
import {ImportScreen} from '../screens/ImportScreen';
import {CropScreen} from '../screens/CropScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PackageList">
        <Stack.Screen
          name="PackageList"
          component={PackageListScreen}
          options={{title: 'My Sticker Packs'}}
        />
        <Stack.Screen
          name="PackageDetail"
          component={PackageDetailScreen}
          options={{title: ''}}
        />
        <Stack.Screen
          name="Import"
          component={ImportScreen}
          options={{title: 'Add Sticker'}}
        />
        <Stack.Screen
          name="Crop"
          component={CropScreen}
          options={{title: 'Crop Image', headerBackVisible: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
