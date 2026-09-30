import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { membersOf, useStore } from '../store/AppStore';
import { colors, statusStyles } from '../theme';
import { MemberStatus, Membership, Project } from '../types';
import { showAlert } from '../utils/alert';
import { Avatar, Button, Sheet, statusDescriptions } from './ui';

export async function pickImage(): Promise<string | undefined> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    showAlert('권한 필요', '사진 접근 권한을 허용해 주세요.');
    return;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
  return !res.canceled && res.assets[0] ? res.assets[0].uri : undefined;
}

/** 수정: 방장은 이름·대표 사진, 모든 멤버는 본인의 실·바늘 */
export function EditProjectSheet({ project, membership, onClose }: { project: Project; membership: Membership; onClose: () => void }) {
  const { state, actions } = useStore();
  const isOwner = project.ownerId === state.meId;
  const [title, setTitle] = useState(project.title);
  const [coverUri, setCoverUri] = useState(project.coverUri);
  const [yarn, setYarn] = useState(membership.yarn);
  const [needle, setNeedle] = useState(membership.needle);

  const save = () => {
    if (isOwner) {
      if (!title.trim()) return showAlert('프로젝트 이름을 입력해 주세요');
      actions.updateProject(project.id, { title: title.trim(), coverUri });
    }
    actions.updateMembership(project.id, { yarn: yarn.trim(), needle: needle.trim() });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title="프로젝트 수정">
      {isOwner && (
        <>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end', marginBottom: 14 }}>
            <Pressable onPress={async () => setCoverUri((await pickImage()) ?? coverUri)} style={styles.cover}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} />
              ) : (
                <Ionicons name="image-outline" size={24} color={colors.textSub} />
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Field label="프로젝트 이름 (방장)" value={title} onChangeText={setTitle} />
            </View>
          </View>
        </>
      )}
      <Text style={styles.help}>실과 바늘 정보는 멤버마다 따로 기록돼요.</Text>
      <Field label="내 실" value={yarn} onChangeText={setYarn} placeholder="예: 메리노울 아이보리 400g" />
      <Field label="내 바늘" value={needle} onChangeText={setNeedle} placeholder="예: 5.0mm 대바늘" />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Button title="취소" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="저장" onPress={save} style={{ flex: 1.3 }} />
      </View>
    </Sheet>
  );
}

/** 친구 초대 */
export function InviteSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const { state, actions } = useStore();
  const memberIds = membersOf(state, project.id).map((m) => m.userId);
  const friends = state.friendIds.filter((id) => !memberIds.includes(id) && !state.hiddenIds.includes(id));
  const invited = state.invites.filter((i) => i.projectId === project.id).map((i) => i.to);

  return (
    <Sheet visible onClose={onClose} title="친구 초대">
      <Text style={[styles.help, { marginBottom: 12 }]}>
        초대를 수락한 친구와 공유 기록 탭에서 서로의 기록을 함께 볼 수 있어요. 상태와 기록은 각자 관리해요.
      </Text>
      {friends.length === 0 && <Text style={styles.muted}>초대할 수 있는 친구가 없어요. 마이페이지에서 친구를 추가해 보세요.</Text>}
      {friends.map((fid) => (
        <View key={fid} style={styles.row}>
          <Avatar user={state.users[fid]} size={34} />
          <Text style={styles.name}>{state.users[fid]?.name}</Text>
          {invited.includes(fid) ? (
            <Button small variant="soft" title="초대 취소" onPress={() => actions.cancelInvite(project.id, fid)} />
          ) : (
            <Button small icon="paper-plane-outline" title="초대" onPress={() => actions.invite(project.id, fid)} />
          )}
        </View>
      ))}
    </Sheet>
  );
}

/** 방장 양도 */
export function TransferSheet({ project, onClose, onDone }: { project: Project; onClose: () => void; onDone?: () => void }) {
  const { state, actions } = useStore();
  const others = membersOf(state, project.id).filter((m) => m.userId !== state.meId);

  const transfer = (userId: string) => {
    const name = state.users[userId]?.name;
    showAlert('방장 양도', `${name}님에게 방장을 넘길까요? 양도하면 나는 일반 멤버가 돼요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '양도',
        onPress: () => {
          actions.transferOwner(project.id, userId);
          onClose();
          onDone?.();
        },
      },
    ]);
  };

  return (
    <Sheet visible onClose={onClose} title="방장 양도">
      <Text style={[styles.help, { marginBottom: 12 }]}>새 방장을 선택하세요. 방장은 멤버를 내보내거나 프로젝트 이름·사진을 바꿀 수 있어요.</Text>
      {others.map((m) => (
        <Pressable key={m.userId} style={styles.row} onPress={() => transfer(m.userId)}>
          <Avatar user={state.users[m.userId]} size={34} gray={m.status === 'done'} />
          <Text style={styles.name}>{state.users[m.userId]?.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </Sheet>
  );
}

/** 내 상태 변경 */
export function StatusSheet({ current, onSelect, onClose }: { current: MemberStatus; onSelect: (s: MemberStatus) => void; onClose: () => void }) {
  return (
    <Sheet visible onClose={onClose} title="내 진행 상태">
      {(['active', 'paused', 'done'] as MemberStatus[]).map((s) => (
        <Pressable
          key={s}
          style={styles.option}
          onPress={() => {
            onSelect(s);
            onClose();
          }}
        >
          <View style={[styles.optionDot, { backgroundColor: statusStyles[s].fg }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionText}>{statusStyles[s].label}</Text>
            <Text style={styles.optionDesc}>{statusDescriptions[s]}</Text>
          </View>
          {current === s && <Ionicons name="checkmark" size={20} color={colors.primary} />}
        </Pressable>
      ))}
    </Sheet>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.textMuted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  help: { fontSize: 12, lineHeight: 17, color: colors.textSub, marginBottom: 10 },
  muted: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 16, color: colors.text },
  optionDesc: { fontSize: 12, color: colors.textSub, marginTop: 2 },
});
