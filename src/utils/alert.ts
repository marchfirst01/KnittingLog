import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Alert.alert 대체. iOS/Android에서는 그대로 Alert.alert를 쓰고,
 * 웹(react-native-web은 Alert가 동작하지 않음)에서는 브라우저 confirm/alert로 흉내 낸다.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  if (actions.length === 0) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  if (actions.length === 1) {
    if (window.confirm(text)) actions[0].onPress?.();
    return;
  }
  // 선택지가 여러 개면 하나씩 물어본다
  for (const b of actions) {
    if (window.confirm(`${text}\n\n→ ${b.text}`)) {
      b.onPress?.();
      return;
    }
  }
}
