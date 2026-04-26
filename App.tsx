// App.tsx
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {StickersProvider} from './src/context/StickersContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StickersProvider>
          <AppNavigator />
        </StickersProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
