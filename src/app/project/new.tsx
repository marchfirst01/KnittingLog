import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

import { Avatar, Button, IconButton, Segmented, SectionLabel } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';
import { ProjectStatus, ProjectType, Visibility } from '../../types';
import { showAlert } from '../../utils/alert';

export default function NewProjectScreen() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const [title, setTitle] = useState('');
  const [yarn, setYarn] = useState('');
  const [needle, setNeedle] = useState('');
  const [type, setType] = useState<ProjectType>('solo');
  const [status, setStatus] = useState<ProjectStatus>('ready');
  const [invited, setInvited] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [maxMembers, setMaxMembers] = useState(4);
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string>();

  const toggleInvite = (id: string) =>
    setInvited((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showAlert('권한 필요', '사진 접근 권한을 허용해 주세요.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setCoverUri(res.assets[0].uri);
  };

  const minMembers = 1 + invited.length;
  const isPublic = visibility === 'public';
  const create = () => {
    if (!title.trim()) return showAlert('프로젝트 이름을 입력해 주세요');
    const id = actions.createProject({
      title: title.trim(),
      yarn: yarn.trim() || '실 미정',
      needle: needle.trim() || '바늘 미정',
      status,
      type,
      coverUri,
      inviteIds: invited,
      visibility,
      maxMembers: Math.max(maxMembers, minMembers + 1),
      description: description.trim(),
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
        <Pressable onPress={pickCover} style={styles.cover}>
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
        <Input label="실" value={yarn} onChangeText={setYarn} placeholder="예: 메리노울 아이보리 400g" />
        <Input label="바늘" value={needle} onChangeText={setNeedle} placeholder="예: 5.0mm 대바늘" />

        <SectionLabel>상태</SectionLabel>
        <Segmented<ProjectStatus>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ready', label: '시작 전' },
            { value: 'active', label: '작업 중' },
          ]}
        />

        <View style={{ height: 18 }} />
        <SectionLabel>진행 방식</SectionLabel>
        <Segmented<ProjectType>
          value={type}
          onChange={setType}
          options={[
            { value: 'solo', label: '혼자 뜨기' },
            { value: 'group', label: '함뜨' },
          ]}
        />

        {type === 'group' && (
          <View style={styles.groupBox}>
            <SectionLabel>친구 초대 (선택)</SectionLabel>
            {state.friendIds.length === 0 && <Text style={styles.muted}>아직 친구가 없어요. 공개 모집으로 함께할 사람을 찾아보세요.</Text>}
            <View style={styles.friends}>
              {state.friendIds.map((fid) => {
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

            <View style={{ height: 18 }} />
            <SectionLabel>공개 범위</SectionLabel>
            <Segmented<Visibility>
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'private', label: '비공개방' },
                { value: 'public', label: '공개방' },
              ]}
            />
            <Text style={[styles.muted, { marginTop: 8, marginBottom: 16 }]}>
              {isPublic
                ? "'모집 중' 목록에 보이고, 참여 신청을 받아 수락할 수 있어요."
                : '목록에 보이지 않아요. 만들면 생기는 참여 코드나 친구 초대로만 들어올 수 있어요.'}
            </Text>

            <View style={styles.stepper}>
              <Text style={styles.switchTitle}>최대 인원</Text>
              <View style={styles.stepperCtrl}>
                <IconButton name="remove-circle-outline" color={colors.primary} onPress={() => setMaxMembers((n) => Math.max(minMembers + 1, n - 1))} />
                <Text style={styles.stepperNum}>{Math.max(maxMembers, minMembers + 1)}명</Text>
                <IconButton name="add-circle-outline" color={colors.primary} onPress={() => setMaxMembers((n) => Math.min(20, Math.max(n, minMembers + 1) + 1))} />
              </View>
            </View>
            {isPublic && (
              <Input
                label="모집 소개"
                value={description}
                onChangeText={setDescription}
                placeholder="예: 10월 첫째 주 시작해요. 초보도 환영!"
                multiline
              />
            )}
          </View>
        )}

        <Text style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>
          진행 방식과 공개 범위는 만든 뒤에도 프로젝트 설정에서 바꿀 수 있어요.
        </Text>
        <Button title="프로젝트 만들기" onPress={create} style={{ marginTop: 12 }} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  multiline,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionLabel>{label}</SectionLabel>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
      />
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
  groupBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friends: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  switchTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, lineHeight: 17, color: colors.textSub, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  stepperCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperNum: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 40, textAlign: 'center' },
});
