import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStoreProvider } from '../store/AppStore';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="mypage" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="project/new" options={{ presentation: 'modal' }} />
        </Stack>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
