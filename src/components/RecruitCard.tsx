import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts, shadow } from '../theme';
import { Project, ProjectInvite } from '../types';
import { relative } from '../utils/format';
import { Avatar, AvatarStack, Button, StatusBadge, monoText } from './ui';
import { showAlert } from '../utils/alert';

function VisibilityTag({ project }: { project: Project }) {
  const priv = project.visibility === 'private';
  return (
    <View style={[styles.visTag, priv && { backgroundColor: colors.chipBg }]}>
      <Ionicons name={priv ? 'lock-closed' : 'globe-outline'} size={11} color={priv ? colors.textSub : colors.primary} />
      <Text style={[styles.visText, priv && { color: colors.textSub }]}>{priv ? '비공개' : '공개'}</Text>
    </View>
  );
}

function ProjectSummary({ project }: { project: Project }) {
  const { state } = useStore();
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {project.title}
        </Text>
        <VisibilityTag project={project} />
      </View>
      <Text style={monoText}>
        {project.yarn} · {project.needle}
      </Text>
      {!!project.description && <Text style={styles.desc}>{project.description}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <AvatarStack users={project.memberIds.map((id) => state.users[id])} size={24} />
        <Text style={styles.count}>
          {project.memberIds.length}/{project.maxMembers}명
        </Text>
      </View>
    </>
  );
}

/**
 * 모집 중 / 코드 검색 결과 카드.
 * - 공개방 목록: 참여 신청 → 방장 수락 대기
 * - 코드로 찾은 방(joinByCode): 코드를 알고 있으므로 바로 참여
 */
export function RecruitCard({ project, joinByCode }: { project: Project; joinByCode?: boolean }) {
  const { state, actions } = useStore();
  const owner = state.users[project.ownerId];
  const applied = project.applicantIds.includes(state.meId);
  const isMember = project.memberIds.includes(state.meId);
  const full = project.memberIds.length >= project.maxMembers;
  const isFriend = state.friendIds.includes(project.ownerId);

  const onApply = () => {
    if (applied) {
      showAlert('참여 신청 취소', `'${project.title}' 참여 신청을 취소할까요?`, [
        { text: '아니요', style: 'cancel' },
        { text: '신청 취소', style: 'destructive', onPress: () => actions.cancelApply(project.id) },
      ]);
    } else {
      actions.apply(project.id);
      showAlert('참여 신청 완료', `${owner?.name}님이 수락하면 함께 뜰 수 있어요.`);
    }
  };

  const onJoin = () => {
    actions.joinProject(project.id);
    router.push(`/project/${project.id}`);
  };

  let action;
  if (isMember) action = <Button small variant="soft" title="참여 중" icon="checkmark" onPress={() => router.push(`/project/${project.id}`)} />;
  else if (full) action = <Button small variant="outline" title="인원 마감" disabled />;
  else if (joinByCode) action = <Button small icon="enter-outline" title="참여하기" onPress={onJoin} />;
  else
    action = (
      <Button
        small
        title={applied ? '승인 대기 중' : '참여 신청'}
        variant={applied ? 'soft' : 'primary'}
        icon={applied ? 'time-outline' : 'hand-left-outline'}
        onPress={onApply}
      />
    );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar user={owner} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={styles.owner}>
            {owner?.name}
            {isFriend && <Text style={styles.friendTag}> · 친구</Text>}
          </Text>
          <Text style={[monoText, { fontSize: 12 }]}>@{owner?.handle}</Text>
        </View>
        <StatusBadge status={project.status} />
      </View>
      <ProjectSummary project={project} />
      <View style={styles.footer}>{action}</View>
    </View>
  );
}

/** 받은 프로젝트 초대 카드 */
export function InviteCard({ invite }: { invite: ProjectInvite }) {
  const { state, actions } = useStore();
  const project = state.projects.find((p) => p.id === invite.projectId);
  const from = state.users[invite.from];
  if (!project) return null;
  const full = project.memberIds.length >= project.maxMembers;

  const accept = () => {
    actions.acceptInvite(invite.id);
    router.push(`/project/${project.id}`);
  };

  return (
    <View style={[styles.card, styles.inviteCard]}>
      <View style={styles.header}>
        <Avatar user={from} size={30} />
        <Text style={[styles.owner, { flex: 1 }]}>
          {from?.name}님이 함뜨에 초대했어요
        </Text>
        <Text style={styles.time}>{relative(invite.createdAt)}</Text>
      </View>
      <ProjectSummary project={project} />
      <View style={[styles.footer, { gap: 8 }]}>
        <Button small variant="outline" title="거절" onPress={() => actions.declineInvite(invite.id)} />
        <Button small title={full ? '인원 마감' : '수락'} disabled={full} onPress={accept} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
    ...shadow,
  },
  inviteCard: { borderColor: colors.primaryMuted, backgroundColor: '#FFFBF8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  owner: { fontSize: 14, fontWeight: '700', color: colors.text },
  friendTag: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  time: { fontSize: 12, color: colors.textMuted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  visTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  visText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  desc: { fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  count: { fontFamily: fonts.mono, fontSize: 13, color: colors.textSub },
});
