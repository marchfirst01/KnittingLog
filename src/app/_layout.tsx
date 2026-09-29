import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStoreProvider, useStore } from '../store/AppStore';
import { colors } from '../theme';

function RootStack() {
  const { state } = useStore();
  const loggedIn = !!state.session;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="mypage" />
        <Stack.Screen name="project/[id]" />
        <Stack.Screen name="project/new" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
