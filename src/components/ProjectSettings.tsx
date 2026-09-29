import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { Project, ProjectType, Visibility } from '../types';
import { Avatar, Button, IconButton, Segmented, Sheet, monoText } from './ui';
import { showAlert } from '../utils/alert';

/** 프로젝트 설정 시트: 혼자/함뜨 전환, 공개/비공개 전환, 참여 코드, 멤버·신청·친구 초대 */
export function ProjectSettings({ project, visible, onClose }: { project: Project; visible: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const isOwner = project.ownerId === state.meId;
  const isGroup = project.type === 'group';

  const changeType = (type: ProjectType) => {
    if (type === 'solo' && project.memberIds.length > 1) {
      showAlert('혼자 뜨기로 바꿀 수 없어요', '다른 멤버가 있는 함뜨는 혼자 뜨기로 바꿀 수 없어요.');
      return;
    }
    actions.setProjectType(project.id, type);
  };

  const changeVisibility = (v: Visibility) => actions.setVisibility(project.id, v);

  const shareCode = () =>
    Share.share({ message: `뜨개로그에서 '${project.title}' 함뜨에 같이 참여해요!\n참여 코드: ${project.code}` }).catch(() => {});

  const leave = () =>
    showAlert('함뜨 나가기', `'${project.title}'에서 나갈까요? 내가 남긴 기록은 그대로 남아요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          onClose();
          actions.leaveProject(project.id);
          router.back();
        },
      },
    ]);

  const full = project.memberIds.length >= project.maxMembers;
  const invitable = state.friendIds.filter((id) => !project.memberIds.includes(id));
  const invitedIds = state.invites.filter((i) => i.projectId === project.id).map((i) => i.to);

  return (
    <Sheet visible={visible} onClose={onClose} title={isOwner ? '프로젝트 설정' : '함뜨 정보'}>
      <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {isOwner && (
          <Section label="진행 방식">
            <Segmented<ProjectType>
              value={project.type}
              onChange={changeType}
              options={[
                { value: 'solo', label: '혼자 뜨기' },
                { value: 'group', label: '함뜨' },
              ]}
            />
            {!isGroup && <Text style={styles.help}>함뜨로 바꾸면 친구를 초대하거나 참여 코드로 사람을 모을 수 있어요.</Text>}
          </Section>
        )}

        {isGroup && (
          <>
            {isOwner && (
              <Section label="공개 범위">
                <Segmented<Visibility>
                  value={project.visibility}
                  onChange={changeVisibility}
                  options={[
                    { value: 'public', label: '공개방' },
                    { value: 'private', label: '비공개방' },
                  ]}
                />
                <Text style={styles.help}>
                  {project.visibility === 'public'
                    ? "'모집 중' 목록에 보이고, 참여 신청을 받아 수락할 수 있어요."
                    : "목록에 보이지 않아요. 참여 코드나 친구 초대로만 들어올 수 있어요."}
                </Text>
              </Section>
            )}

            <Section label="참여 코드">
              <View style={styles.codeRow}>
                <Text style={styles.code}>{project.code}</Text>
                <Button small variant="soft" icon="share-outline" title="공유" onPress={shareCode} />
              </View>
              <Text style={styles.help}>{"'모집 중' 탭 검색창에 이 코드를 입력하면 바로 참여할 수 있어요."}</Text>
            </Section>

            {isOwner && (
              <Section label="모집 설정">
                <View style={styles.stepper}>
                  <Text style={styles.rowTitle}>최대 인원</Text>
                  <View style={styles.stepperCtrl}>
                    <IconButton
                      name="remove-circle-outline"
                      color={colors.primary}
                      onPress={() =>
                        actions.updateGroupSettings(project.id, {
                          maxMembers: Math.max(project.memberIds.length, 2, project.maxMembers - 1),
                        })
                      }
                    />
                    <Text style={styles.stepperNum}>{project.maxMembers}명</Text>
                    <IconButton
                      name="add-circle-outline"
                      color={colors.primary}
                      onPress={() => actions.updateGroupSettings(project.id, { maxMembers: Math.min(20, project.maxMembers + 1) })}
                    />
                  </View>
                </View>
                <DescriptionInput project={project} />
              </Section>
            )}

            <Section label={`멤버 ${project.memberIds.length}/${project.maxMembers}`}>
              {project.memberIds.map((mid) => (
                <View key={mid} style={styles.personRow}>
                  <Avatar user={state.users[mid]} size={32} />
                  <Text style={styles.personName}>
                    {state.users[mid]?.name}
                    {mid === state.meId && <Text style={styles.tag}> (나)</Text>}
                    {mid === project.ownerId && <Text style={styles.tag}> · 방장</Text>}
                  </Text>
                </View>
              ))}
            </Section>

            {isOwner && project.visibility === 'public' && (
              <Section label={`참여 신청 ${project.applicantIds.length}`}>
                {project.applicantIds.length === 0 && <Text style={styles.muted}>새 신청이 없어요.</Text>}
                {project.applicantIds.map((aid) => (
                  <View key={aid} style={styles.personRow}>
                    <Avatar user={state.users[aid]} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{state.users[aid]?.name}</Text>
                      <Text style={[monoText, { fontSize: 12 }]}>@{state.users[aid]?.handle}</Text>
                    </View>
                    <Button small title="거절" variant="outline" onPress={() => actions.rejectApplicant(project.id, aid)} />
                    <Button
                      small
                      title="수락"
                      disabled={full}
                      onPress={() => actions.acceptApplicant(project.id, aid)}
                    />
                  </View>
                ))}
              </Section>
            )}

            <Section label="친구 초대">
              {full && <Text style={styles.muted}>인원이 가득 찼어요. 최대 인원을 늘리면 더 초대할 수 있어요.</Text>}
              {!full && invitable.length === 0 && <Text style={styles.muted}>초대할 수 있는 친구가 없어요.</Text>}
              {!full &&
                invitable.map((fid) => {
                  const invited = invitedIds.includes(fid);
                  return (
                    <View key={fid} style={styles.personRow}>
                      <Avatar user={state.users[fid]} size={32} />
                      <Text style={styles.personName}>{state.users[fid]?.name}</Text>
                      {invited ? (
                        <Button small variant="soft" title="초대 취소" onPress={() => actions.cancelInvite(project.id, fid)} />
                      ) : (
                        <Button small icon="paper-plane-outline" title="초대" onPress={() => actions.invite(project.id, fid)} />
                      )}
                    </View>
                  );
                })}
            </Section>

            {!isOwner && project.memberIds.includes(state.meId) && (
              <Button title="함뜨 나가기" variant="ghost" onPress={leave} style={{ marginBottom: 8 }} />
            )}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

/** 시트가 열릴 때마다 새로 마운트되므로 현재 소개글로 초기화된다 */
function DescriptionInput({ project }: { project: Project }) {
  const { actions } = useStore();
  const [description, setDescription] = useState(project.description);
  return (
    <TextInput
      value={description}
      onChangeText={setDescription}
      onEndEditing={() => actions.updateGroupSettings(project.id, { description: description.trim() })}
      placeholder="함뜨 소개 (예: 매주 일요일 진행 공유)"
      placeholderTextColor={colors.textMuted}
      multiline
      style={styles.input}
    />
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 8 },
  help: { fontSize: 12, lineHeight: 17, color: colors.textSub, marginTop: 8 },
  muted: { fontSize: 13, color: colors.textMuted },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  code: { fontFamily: fonts.mono, fontSize: 22, fontWeight: '700', letterSpacing: 4, color: colors.text },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  stepperCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperNum: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 40, textAlign: 'center' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  personName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  tag: { fontSize: 12, color: colors.textSub, fontWeight: '500' },
});
