import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthField, AuthLayout } from '../components/AuthForm';
import { Button } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { ID_RE, ID_RULE, normalizeId } from '../utils/validate';

export default function SignupScreen() {
  const { state, actions } = useStore();
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const id = normalizeId(username);
  const h = normalizeId(handle);
  const errors = {
    username: !id
      ? '로그인 아이디를 입력해 주세요.'
      : !ID_RE.test(id)
        ? ID_RULE
        : state.accounts.some((a) => a.username === id)
          ? '이미 사용 중인 아이디예요.'
          : '',
    handle: !h
      ? '계정 ID를 입력해 주세요.'
      : !ID_RE.test(h)
        ? ID_RULE
        : Object.values(state.users).some((u) => u.handle === h)
          ? '이미 사용 중인 계정 ID예요.'
          : serverError,
    name: !name.trim() ? '닉네임을 입력해 주세요.' : name.trim().length > 10 ? '닉네임은 10자 이하로 입력해 주세요.' : '',
    password: password.length < 4 ? '비밀번호는 4자 이상이어야 해요.' : '',
    confirm: confirm !== password ? '비밀번호가 일치하지 않아요.' : '',
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : '');

  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    setLoading(true);
    const err = await actions.signup(id, h, password, name.trim());
    setLoading(false);
    if (err) setServerError(err);
  };

  return (
    <AuthLayout subtitle="새 계정 만들기">
      <AuthField
        label="로그인 아이디"
        value={username}
        onChangeText={setUsername}
        placeholder="예: seeun2026"
        hint="로그인할 때만 쓰고 다른 사람에게 보이지 않아요. 가입 후에는 바꿀 수 없어요."
        error={show('username')}
      />
      <AuthField
        label="계정 ID"
        value={handle}
        onChangeText={(v) => {
          setHandle(v);
          setServerError('');
        }}
        placeholder="예: knit_lover"
        hint="친구가 나를 찾을 때 쓰는 @아이디예요. 나중에 마이페이지에서 바꿀 수 있어요."
        error={show('handle')}
      />
      <AuthField label="닉네임" value={name} onChangeText={setName} placeholder="예: 세은" error={show('name')} />
      <AuthField label="비밀번호" value={password} onChangeText={setPassword} placeholder="4자 이상" secure error={show('password')} />
      <AuthField
        label="비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="비밀번호를 한 번 더 입력"
        secure
        error={show('confirm')}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Text style={styles.terms}>
        가입하면 <Text style={styles.termsLink} onPress={() => router.push('/policy?doc=terms')}>이용약관</Text>과{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/policy?doc=privacy')}>개인정보처리방침</Text>에 동의하게 돼요.
      </Text>
      <Button title={loading ? '가입 중…' : '가입하기'} onPress={submit} disabled={loading} style={{ marginTop: 8 }} />

      <View style={styles.row}>
        <Text style={styles.muted}>이미 계정이 있나요?</Text>
        <Text style={styles.link} onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
          로그인
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  muted: { fontSize: 14, color: colors.textSub },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  terms: { fontSize: 12, lineHeight: 18, color: colors.textSub, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  termsLink: { color: colors.primary, textDecorationLine: 'underline' },
});
