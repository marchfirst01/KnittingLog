import { Alert, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts, shadow } from '../theme';
import { Project } from '../types';
import { Avatar, AvatarStack, Button, StatusBadge, monoText } from './ui';

/** 모집 중인 공개 프로젝트 카드 */
export function RecruitCard({ project }: { project: Project }) {
  const { state, actions } = useStore();
  const owner = state.users[project.ownerId];
  const recruit = project.recruit!;
  const applied = recruit.applicantIds.includes(state.meId);
  const isFriend = state.friendIds.includes(project.ownerId);

  const onApply = () => {
    if (applied) {
      Alert.alert('참여 신청 취소', `'${project.title}' 참여 신청을 취소할까요?`, [
        { text: '아니요', style: 'cancel' },
        { text: '신청 취소', style: 'destructive', onPress: () => actions.cancelApply(project.id) },
      ]);
    } else {
      actions.apply(project.id);
      Alert.alert('참여 신청 완료', `${owner.name}님이 수락하면 함께 뜰 수 있어요.`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar user={owner} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={styles.owner}>
            {owner.name}
            {isFriend && <Text style={styles.friendTag}> · 친구</Text>}
          </Text>
          <Text style={[monoText, { fontSize: 12 }]}>@{owner.handle}</Text>
        </View>
        <StatusBadge status={project.status} />
      </View>

      <Text style={styles.title}>{project.title}</Text>
      <Text style={monoText}>
        {project.yarn} · {project.needle}
      </Text>
      {!!recruit.description && <Text style={styles.desc}>{recruit.description}</Text>}

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AvatarStack users={project.memberIds.map((id) => state.users[id])} size={24} />
          <Text style={styles.count}>
            {project.memberIds.length}/{recruit.maxMembers}명
          </Text>
        </View>
        <Button
          small
          title={applied ? '승인 대기 중' : '참여 신청'}
          variant={applied ? 'soft' : 'primary'}
          icon={applied ? 'time-outline' : 'hand-left-outline'}
          onPress={onApply}
        />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  owner: { fontSize: 14, fontWeight: '700', color: colors.text },
  friendTag: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  desc: { fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  count: { fontFamily: fonts.mono, fontSize: 13, color: colors.textSub },
});
