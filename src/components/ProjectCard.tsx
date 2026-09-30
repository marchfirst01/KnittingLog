import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { membersOf, useStore } from '../store/AppStore';
import { colors, fonts, shadow } from '../theme';
import { Membership, ProjectInvite } from '../types';
import { period, relative } from '../utils/format';
import { Avatar, AvatarStack, Button, StatusBadge, Thumb, monoText } from './ui';

/** 방장 표시: 👑 이름 */
export function OwnerTag({ ownerId, size = 12 }: { ownerId: string; size?: number }) {
  const { state } = useStore();
  const isMe = ownerId === state.meId;
  return (
    <View style={styles.owner}>
      <MaterialCommunityIcons name="crown" size={size + 2} color="#D4A233" />
      <Text style={[styles.ownerText, { fontSize: size }]}>{isMe ? '내가 방장' : state.users[ownerId]?.name}</Text>
    </View>
  );
}

/** 내 프로젝트 카드. 상태·기간·실은 내 기준 */
export function ProjectCard({ membership }: { membership: Membership }) {
  const { state } = useStore();
  const project = state.projects.find((p) => p.id === membership.projectId);
  if (!project) return null;
  const members = membersOf(state, project.id);
  const shared = members.length > 1;
  const latestPhoto = state.logs
    .filter((l) => l.projectId === project.id && l.authorId === state.meId && l.photoUri)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.photoUri;

  return (
    <Pressable
      onPress={() => router.push(`/project/${project.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Thumb uri={project.coverUri ?? latestPhoto} seed={project.id} size={96} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {project.title}
          </Text>
          <StatusBadge status={membership.status} />
        </View>
        <OwnerTag ownerId={project.ownerId} />
        {!!membership.yarn && (
          <Text style={[monoText, { fontSize: 12 }]} numberOfLines={1}>
            {membership.yarn}
          </Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.period}>{period(membership)}</Text>
          {shared ? (
            <View style={styles.shared}>
              <AvatarStack users={members.map((m) => state.users[m.userId])} size={20} />
              <Text style={styles.sharedText}>{members.length}명 공유</Text>
            </View>
          ) : (
            <View style={styles.shared}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.sharedText, { color: colors.textMuted }]}>개인</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** 받은 프로젝트 초대 카드 */
export function InviteCard({ invite }: { invite: ProjectInvite }) {
  const { state, actions } = useStore();
  const project = state.projects.find((p) => p.id === invite.projectId);
  const from = state.users[invite.from];
  if (!project) return null;
  const members = membersOf(state, project.id);

  const accept = () => {
    actions.acceptInvite(invite.id);
    router.push(`/project/${project.id}`);
  };

  return (
    <View style={[styles.card, styles.invite]}>
      <Thumb uri={project.coverUri} seed={project.id} size={72} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Avatar user={from} size={18} />
          <Text style={styles.inviteFrom} numberOfLines={1}>
            {from?.name}님의 초대
          </Text>
          <Text style={styles.time}>{relative(invite.createdAt)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {project.title}
        </Text>
        <View style={[styles.footer, { marginTop: 4 }]}>
          <AvatarStack users={members.map((m) => state.users[m.userId])} size={20} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button small variant="outline" title="거절" onPress={() => actions.declineInvite(invite.id)} />
            <Button small title="수락" onPress={accept} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  invite: { borderColor: colors.primaryMuted, backgroundColor: '#FFFBF8', alignItems: 'center' },
  inviteFrom: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSub },
  time: { fontSize: 11, color: colors.textMuted },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  owner: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ownerText: { color: colors.textSub, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  period: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSub },
  shared: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sharedText: { fontSize: 12, fontWeight: '600', color: colors.primary },
});
