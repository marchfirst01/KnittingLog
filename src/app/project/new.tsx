import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickImage } from '../../components/ProjectSheets';
import { Avatar, Button, IconButton, SectionLabel, Segmented } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors } from '../../theme';
import { MemberStatus } from '../../types';

export default function NewProjectScreen() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const [title, setTitle] = useState('');
  const [yarn, setYarn] = useState('');
  const [needle, setNeedle] = useState('');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [invited, setInvited] = useState<string[]>([]);
  const [coverUri, setCoverUri] = useState<string>();

  const friends = state.friendIds.filter((id) => !state.hiddenIds.includes(id));
  const toggleInvite = (id: string) =>
    setInvited((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const create = () => {
    if (!title.trim()) return;
    const id = actions.createProject({
      title: title.trim(),
      yarn: yarn.trim(),
      needle: needle.trim(),
      status,
      coverUri,
      inviteIds: invited,
    });
    router.replace(`/project/${id}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
        <IconButton name="close" onPress={() => router.back()} size={26} />
        <Text style={styles.headerTitle}>새 프로젝트</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={async () => setCoverUri((await pickImage()) ?? coverUri)} style={styles.cover}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} />
          ) : (
            <>
              <Ionicons name="image-outline" size={28} color={colors.textSub} />
              <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>대표 사진</Text>
            </>
          )}
        </Pressable>

        <Input label="프로젝트 이름" value={title} onChangeText={setTitle} placeholder="예: 후드 가디건" />
        <Input label="내 실" value={yarn} onChangeText={setYarn} placeholder="예: 메리노울 아이보리 400g" />
        <Input label="내 바늘" value={needle} onChangeText={setNeedle} placeholder="예: 5.0mm 대바늘" />

        <SectionLabel>내 상태</SectionLabel>
        <Segmented<MemberStatus>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: '진행중' },
            { value: 'paused', label: '보관' },
          ]}
        />

        <View style={styles.inviteBox}>
          <SectionLabel>친구 초대 (선택)</SectionLabel>
          <Text style={styles.muted}>
            프로젝트는 기본으로 나만 볼 수 있어요. 친구를 초대하면 공유 기록 탭이 생겨 함께 볼 수 있고, 상태·실·기록은 각자
            관리해요.
          </Text>
          {friends.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 8 }]}>아직 친구가 없어요. 나중에 프로젝트 메뉴에서도 초대할 수 있어요.</Text>
          ) : (
            <View style={styles.friends}>
              {friends.map((fid) => {
                const on = invited.includes(fid);
                return (
                  <Pressable key={fid} onPress={() => toggleInvite(fid)} style={[styles.friend, on && styles.friendOn]}>
                    <Avatar user={state.users[fid]} size={24} />
                    <Text style={[styles.friendName, on && { color: colors.primary }]}>{state.users[fid]?.name}</Text>
                    {on && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Button title="프로젝트 만들기" onPress={create} style={{ marginTop: 24 }} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionLabel>{label}</SectionLabel>
      <TextInput {...props} placeholderTextColor={colors.textMuted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { padding: 20 },
  cover: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inviteBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friends: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  friendName: { fontSize: 14, fontWeight: '600', color: colors.text },
  muted: { fontSize: 12, lineHeight: 17, color: colors.textSub },
});
