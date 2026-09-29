import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthField, AuthLayout } from '../components/AuthForm';
import { Button } from '../components/ui';
import { DEMO_PASSWORD } from '../data/mock';
import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';

export default function LoginScreen() {
  const { actions } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) return setError('아이디와 비밀번호를 입력해 주세요.');
    setLoading(true);
    const err = await actions.login(username.trim().toLowerCase(), password);
    setLoading(false);
    if (err) setError(err);
    // 성공하면 보호된 화면이 열리면서 메인으로 이동한다
  };

  return (
    <AuthLayout subtitle="나의 뜨개 기록">
      <AuthField
        label="아이디"
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setError('');
        }}
        placeholder="아이디"
        returnKeyType="next"
      />
      <AuthField
        label="비밀번호"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
        placeholder="비밀번호"
        secure
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error}
      />
      <Button title={loading ? '로그인 중…' : '로그인'} onPress={submit} disabled={loading} style={{ marginTop: 8 }} />

      <View style={styles.row}>
        <Text style={styles.muted}>아직 계정이 없나요?</Text>
        <Link href="/signup" style={styles.link}>
          회원가입
        </Link>
      </View>

      <View style={styles.demo}>
        <Text style={styles.demoTitle}>데모 계정으로 둘러보기</Text>
        <Text style={styles.demoText}>
          seeun_knits · sungyu_kr · jiyeon_wool{'\n'}비밀번호 {DEMO_PASSWORD}
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  muted: { fontSize: 14, color: colors.textSub },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  demo: { marginTop: 36, padding: 14, borderRadius: 14, backgroundColor: colors.chipBg, alignItems: 'center' },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.textSub, marginBottom: 4 },
  demoText: { fontSize: 12, lineHeight: 18, color: colors.textSub, fontFamily: fonts.mono, textAlign: 'center' },
});
