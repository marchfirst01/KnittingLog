import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Chip, EmptyState, IconButton, monoText } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors, fonts, shadow } from '../theme';
import { User } from '../types';
import { showAlert } from '../utils/alert';

type Tab = 'friends' | 'requests';

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const me = state.users[state.meId];
  const [tab, setTab] = useState<Tab>('friends');
  const [query, setQuery] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(me.bio);
  const [showBlocked, setShowBlocked] = useState(false);

  const stats = useMemo(
    () => ({
      projects: state.memberships.filter((m) => m.userId === state.meId).length,
      logs: state.logs.filter((l) => l.authorId === state.meId).length,
    }),
    [state.memberships, state.logs, state.meId],
  );

  const q = query.trim().toLowerCase().replace(/^@/, '');
  const searchResults = q
    ? Object.values(state.users).filter(
        (u) =>
          u.id !== state.meId &&
          !state.hiddenIds.includes(u.id) &&
          (u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)),
      )
    : [];

  const saveBio = () => {
    actions.updateBio(bioDraft.trim());
    setEditingBio(false);
  };

  const confirmRemove = (u: User) =>
    showAlert('친구 해제', `${u.name}님을 친구 목록에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '해제', style: 'destructive', onPress: () => actions.removeFriend(u.id) },
    ]);

  /** 검색 결과에서 관계에 따라 알맞은 버튼 */
  const relationAction = (u: User) => {
    if (state.friendIds.includes(u.id)) return <Button small variant="outline" title="친구 해제" onPress={() => confirmRemove(u)} />;
    if (state.incomingRequestIds.includes(u.id))
      return <Button small title="수락" onPress={() => actions.acceptFriend(u.id)} />;
    if (state.outgoingRequestIds.includes(u.id))
      return <Button small variant="soft" title="요청 취소" onPress={() => actions.cancelFriendRequest(u.id)} />;
    return <Button small icon="person-add-outline" title="친구 요청" onPress={() => actions.sendFriendRequest(u.id)} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" size={26} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {/* 프로필 */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar user={me} size={68} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.name}>{me.name}</Text>
                <View style={styles.meTag}>
                  <Text style={styles.meTagText}>나</Text>
                </View>
              </View>
              <Text style={[monoText, { marginTop: 4 }]}>@{me.handle}</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat label="프로젝트" value={stats.projects} />
            <Stat label="기록" value={stats.logs} />
            <Stat label="친구" value={state.friendIds.length} />
          </View>

          <View style={styles.divider} />
          <View style={styles.bioHead}>
            <Text style={styles.bioLabel}>한 줄 소개</Text>
            {editingBio ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button
                  small
                  variant="ghost"
                  title="취소"
                  onPress={() => {
                    setBioDraft(me.bio);
                    setEditingBio(false);
                  }}
                />
                <Button small variant="soft" title="저장" onPress={saveBio} />
              </View>
            ) : (
              <Button small variant="soft" title="수정" onPress={() => setEditingBio(true)} />
            )}
          </View>
          {editingBio ? (
            <TextInput
              value={bioDraft}
              onChangeText={setBioDraft}
              maxLength={40}
              autoFocus
              style={styles.bioInput}
              placeholder="나를 한 줄로 소개해 보세요"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={saveBio}
              returnKeyType="done"
            />
          ) : (
            <Text style={styles.bio}>{me.bio || '아직 소개가 없어요.'}</Text>
          )}

          <View style={styles.divider} />
          <View style={styles.privacyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>프로필 공개</Text>
              <Text style={styles.rowDesc}>
                {me.isPrivate
                  ? '비공개: 다른 사람이 내 프로필에서 기록을 볼 수 없어요. 함께 하는 프로젝트 안에서는 보여요.'
                  : '공개: 누구나 내 프로필에서 모든 기록을 볼 수 있어요.'}
              </Text>
            </View>
            <Switch
              value={!me.isPrivate}
              onValueChange={(v) => actions.setPrivate(!v)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 메뉴 */}
        <View style={[styles.card, { paddingVertical: 4 }]}>
          <MenuRow icon="albums-outline" label="내 기록 모아보기" onPress={() => router.push('/logs')} />
          <MenuRow icon="person-circle-outline" label="내 프로필 미리보기" onPress={() => router.push(`/user/${state.meId}`)} />
          <MenuRow
            icon="ban-outline"
            label={`차단한 사용자 ${state.blockedIds.length}`}
            onPress={() => setShowBlocked((v) => !v)}
            expanded={showBlocked}
          />
          {showBlocked && (
            <View style={{ paddingBottom: 10 }}>
              {state.blockedIds.length === 0 && <Text style={[styles.muted, { paddingVertical: 8 }]}>차단한 사용자가 없어요.</Text>}
              {state.blockedIds.map((id) => (
                <View key={id} style={styles.blockedRow}>
                  <Avatar user={state.users[id]} size={30} gray />
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{state.users[id]?.name}</Text>
                  <Button small variant="outline" title="차단 해제" onPress={() => actions.unblock(id)} />
                </View>
              ))}
            </View>
          )}
          <MenuRow icon="document-text-outline" label="약관 및 정책" onPress={() => router.push('/policy')} last />
        </View>

        {/* 검색 */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textSub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="닉네임 또는 핸들 검색..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && <IconButton name="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} />}
        </View>

        {q ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.resultLabel}>검색 결과 {searchResults.length}</Text>
            {searchResults.length === 0 && <EmptyState emoji="🔍" title="찾는 뜨개인이 없어요" />}
            {searchResults.map((u) => (
              <PersonRow key={u.id} user={u} right={relationAction(u)} />
            ))}
          </View>
        ) : (
          <>
            <View style={styles.chips}>
              <Chip label={`친구 ${state.friendIds.length}`} active={tab === 'friends'} onPress={() => setTab('friends')} />
              <Chip
                label="요청"
                active={tab === 'requests'}
                onPress={() => setTab('requests')}
                badge={state.incomingRequestIds.length}
              />
            </View>

            {tab === 'friends' ? (
              <View style={{ gap: 10 }}>
                {state.friendIds.length === 0 && (
                  <EmptyState emoji="🤝" title="아직 친구가 없어요" desc="닉네임이나 핸들로 검색해 친구 요청을 보내 보세요." />
                )}
                {state.friendIds.map((id) => (
                  <PersonRow
                    key={id}
                    user={state.users[id]}
                    right={<Button small variant="outline" title="친구 해제" onPress={() => confirmRemove(state.users[id])} />}
                  />
                ))}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={styles.resultLabel}>받은 요청</Text>
                {state.incomingRequestIds.length === 0 && <Text style={styles.muted}>새로 들어온 친구 요청이 없어요.</Text>}
                {state.incomingRequestIds.map((id) => (
                  <PersonRow
                    key={id}
                    user={state.users[id]}
                    right={
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Button small variant="outline" title="거절" onPress={() => actions.rejectFriend(id)} />
                        <Button small title="수락" onPress={() => actions.acceptFriend(id)} />
                      </View>
                    }
                  />
                ))}
                {state.outgoingRequestIds.length > 0 && (
                  <>
                    <Text style={[styles.resultLabel, { marginTop: 12 }]}>보낸 요청</Text>
                    {state.outgoingRequestIds.map((id) => (
                      <PersonRow
                        key={id}
                        user={state.users[id]}
                        right={<Button small variant="soft" title="요청 취소" onPress={() => actions.cancelFriendRequest(id)} />}
                      />
                    ))}
                  </>
                )}
              </View>
            )}
          </>
        )}

        <Button
          title="로그아웃"
          variant="outline"
          icon="log-out-outline"
          style={{ marginTop: 36 }}
          onPress={() =>
            showAlert('로그아웃', '로그아웃할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: actions.logout },
            ])
          }
        />
        <Pressable
          style={{ alignSelf: 'center', marginTop: 20 }}
          onPress={() =>
            showAlert('데모 데이터 초기화', '이 기기의 모든 계정과 변경 사항을 지우고 처음 상태로 되돌릴까요? 로그아웃돼요.', [
              { text: '취소', style: 'cancel' },
              { text: '초기화', style: 'destructive', onPress: actions.reset },
            ])
          }
        >
          <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>데모 데이터 초기화</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  expanded,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  expanded?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={[styles.rowTitle, { flex: 1 }]}>{label}</Text>
      <Ionicons
        name={expanded === undefined ? 'chevron-forward' : expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PersonRow({ user, right }: { user?: User; right: React.ReactNode }) {
  if (!user) return null;
  return (
    <View style={styles.person}>
      <Pressable onPress={() => router.push(`/user/${user.id}`)} style={styles.personLink}>
      <Avatar user={user} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={styles.personName}>{user.name}</Text>
        <Text style={[monoText, { fontSize: 12, marginTop: 2 }]}>@{user.handle}</Text>
        {!!user.bio && (
          <Text style={styles.personBio} numberOfLines={1}>
            {user.bio}
          </Text>
        )}
      </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { paddingHorizontal: 20, paddingTop: 10 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowDesc: { fontSize: 12, lineHeight: 17, color: colors.textSub, marginTop: 3 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  personLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  meTag: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  meTagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  stats: { flexDirection: 'row', marginTop: 18 },
  statNum: { fontFamily: fonts.mono, fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  bioHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  bioLabel: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  bio: { fontSize: 15, color: colors.text, lineHeight: 22 },
  bioInput: {
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  resultLabel: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  muted: { fontSize: 13, color: colors.textMuted },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  personName: { fontSize: 16, fontWeight: '700', color: colors.text },
  personBio: { fontSize: 13, color: colors.textSub, marginTop: 2 },
});
