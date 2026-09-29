import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../theme';

/** 로그인/회원가입 공통 레이아웃 */
export function AuthLayout({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>🧶</Text>
        <Text style={styles.title}>뜨개로그</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthField({
  label,
  error,
  secure,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; secure?: boolean; hint?: string }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && { borderColor: colors.danger }]}>
        <TextInput
          {...props}
          secureTextEntry={secure && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} accessibilityLabel="비밀번호 보기">
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSub} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  logo: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, textAlign: 'center', marginTop: 8 },
  subtitle: {
    fontSize: 13,
    color: colors.textSub,
    fontFamily: fonts.mono,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
    letterSpacing: 1,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  error: { fontSize: 12, color: colors.danger, marginTop: 5 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 5 },
});
