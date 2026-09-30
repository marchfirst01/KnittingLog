import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogItem } from '../../components/LogItem';
import { PostCard } from '../../components/PostCard';
import { ReportSheet } from '../../components/ReportSheet';
import { ActionMenu, Avatar, Button, EmptyState, IconButton, MenuItem, Segmented, monoText } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors, fonts, shadow } from '../../theme';
import { showAlert } from '../../utils/alert';

type Tab = 'logs' | 'posts';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const user = state.users[id];
  const isMe = id === state.meId;
  const [tab, setTab] = useState<Tab>('logs');
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);

  const logs = useMemo(
    () => state.logs.filter((l) => l.authorId === id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [state.logs, id],
  );
  const posts = useMemo(
    () => state.posts.filter((p) => p.authorId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.posts, id],
  );
  const projectCount = state.memberships.filter((m) => m.userId === id).length;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <IconButton name="chevron-back" size={26} onPress={() => router.back()} />
      <Text style={styles.headerTitle}>{isMe ? '내 프로필' : '프로필'}</Text>
      {isMe || !user ? <View style={{ width: 34 }} /> : <IconButton name="ellipsis-horizontal" onPress={() => setMenu(true)} />}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.flex}>
        {header}
        <EmptyState emoji="🤷" title="사용자를 찾을 수 없어요" />
      </View>
    );
  }

  const blockedByMe = state.blockedIds.includes(id);
  const blockedMe = !blockedByMe && state.hiddenIds.includes(id);
  const isFriend = state.friendIds.includes(id);
  const canSeeLogs = isMe || !user.isPrivate;

  const block = () =>
    showAlert(`${user.name}님 차단`, '차단하면 서로의 프로필·게시글·기록이 보이지 않고, 친구 관계와 요청·초대가 모두 끊어져요.', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => actions.block(id) },
    ]);

  const menuItems: MenuItem[] = [
    { label: '신고하기', icon: 'alert-circle-outline', destructive: true, onPress: () => setReporting(true) },
    blockedByMe
      ? { label: '차단 해제', icon: 'refresh-outline', onPress: () => actions.unblock(id) }
      : { label: '차단하기', icon: 'ban-outline', destructive: true, onPress: block },
    ...(isFriend
      ? [
          {
            label: '친구 해제',
            icon: 'person-remove-outline' as const,
            destructive: true,
            onPress: () =>
              showAlert('친구 해제', `${user.name}님을 친구 목록에서 삭제할까요?`, [
                { text: '취소', style: 'cancel' },
                { text: '해제', style: 'destructive', onPress: () => actions.removeFriend(id) },
              ]),
          },
        ]
      : []),
  ];

  let friendButton = null;
  if (!isMe && !blockedByMe && !blockedMe) {
    if (isFriend) friendButton = <Button small variant="soft" icon="checkmark" title="친구" disabled />;
    else if (state.incomingRequestIds.includes(id))
      friendButton = <Button small title="친구 요청 수락" onPress={() => actions.acceptFriend(id)} />;
    else if (state.outgoingRequestIds.includes(id))
      friendButton = <Button small variant="soft" title="요청됨 · 취소" onPress={() => actions.cancelFriendRequest(id)} />;
    else friendButton = <Button small icon="person-add-outline" title="친구 추가" onPress={() => actions.sendFriendRequest(id)} />;
  }

  return (
    <View style={styles.flex}>
      {header}
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar user={user} size={68} gray={blockedByMe || blockedMe} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.name}>{user.name}</Text>
                {user.isPrivate && <Ionicons name="lock-closed" size={14} color={colors.textSub} />}
              </View>
              <Text style={monoText}>@{user.handle}</Text>
            </View>
          </View>
          {!blockedByMe && !blockedMe && (
            <>
              {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
              <View style={styles.stats}>
                <Stat label="프로젝트" value={projectCount} />
                <Stat label="기록" value={canSeeLogs ? logs.length : '-'} />
                <Stat label="게시글" value={posts.length} />
              </View>
              {friendButton && <View style={{ marginTop: 16 }}>{friendButton}</View>}
              {isMe && (
                <Button small variant="outline" title="마이페이지로" style={{ marginTop: 16 }} onPress={() => router.push('/mypage')} />
              )}
            </>
          )}
        </View>

        {blockedByMe ? (
          <View style={{ alignItems: 'center' }}>
            <EmptyState emoji="🚫" title="차단한 사용자예요" desc="차단을 해제하면 다시 프로필을 볼 수 있어요." />
            <Button small variant="outline" title="차단 해제" onPress={() => actions.unblock(id)} />
          </View>
        ) : blockedMe ? (
          <EmptyState emoji="🚫" title="프로필을 볼 수 없어요" />
        ) : (
          <>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'logs', label: '기록' },
                { value: 'posts', label: '게시글' },
              ]}
            />
            <View style={{ marginTop: 20 }}>
              {tab === 'logs' ? (
                !canSeeLogs ? (
                  <EmptyState
                    emoji="🔒"
                    title="비공개 프로필이에요"
                    desc="함께 하는 프로젝트가 있다면 그 프로젝트 안에서는 기록을 볼 수 있어요."
                  />
                ) : logs.length === 0 ? (
                  <EmptyState emoji="📝" title="아직 기록이 없어요" />
                ) : (
                  logs.map((l, i) => (
                    <LogItem
                      key={l.id}
                      log={l}
                      isLast={i === logs.length - 1}
                      projectTitle={state.projects.find((p) => p.id === l.projectId)?.title}
                    />
                  ))
                )
              ) : posts.length === 0 ? (
                <EmptyState emoji="📷" title="아직 게시글이 없어요" />
              ) : (
                <View style={{ gap: 16 }}>
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ActionMenu visible={menu} onClose={() => setMenu(false)} title={`${user.name}님`} items={menuItems} />
      {reporting && <ReportSheet userId={id} onClose={() => setReporting(false)} />}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { paddingHorizontal: 20, paddingTop: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
    ...shadow,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  bio: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 14 },
  stats: { flexDirection: 'row', marginTop: 16 },
  statNum: { fontFamily: fonts.mono, fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSub, marginTop: 2 },
});
