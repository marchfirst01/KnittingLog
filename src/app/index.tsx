import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '../components/PostCard';
import { InviteCard, ProjectCard } from '../components/ProjectCard';
import { Avatar, Button, Chip, EmptyState, Segmented } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors, fonts, statusStyles } from '../theme';
import { MemberStatus } from '../types';
import { sortMemberships } from '../utils/format';

type Tab = 'projects' | 'feed';
type Filter = 'all' | MemberStatus;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('projects');
  const [filter, setFilter] = useState<Filter>('all');
  const me = state.users[state.meId];

  const mine = useMemo(
    () => sortMemberships(state.memberships.filter((m) => m.userId === state.meId), state.logs),
    [state.memberships, state.logs, state.meId],
  );
  const filtered = filter === 'all' ? mine : mine.filter((m) => m.status === filter);
  const sections = (['active', 'paused', 'done'] as MemberStatus[])
    .map((status) => ({ status, items: filtered.filter((m) => m.status === status) }))
    .filter((s) => s.items.length > 0);
  const count = (f: Filter) => (f === 'all' ? mine.length : mine.filter((m) => m.status === f).length);

  const posts = useMemo(
    () =>
      state.posts
        .filter((p) => !state.hiddenIds.includes(p.authorId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.posts, state.hiddenIds],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* 두 번째 자식(내 프로젝트/피드 탭)은 스크롤해도 상단에 고정된다 */}
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.header, styles.container, { paddingTop: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>뜨개로그</Text>
            <Text style={styles.subtitle}>나의 뜨개 기록</Text>
          </View>
          <Button
            small
            title={tab === 'projects' ? '새 프로젝트' : '게시글 쓰기'}
            icon="add"
            onPress={() => router.push(tab === 'projects' ? '/project/new' : '/post/new')}
            style={{ marginRight: 10 }}
          />
          <Pressable onPress={() => router.push('/mypage')} hitSlop={6} accessibilityLabel="마이페이지">
            <Avatar user={me} size={44} />
            {state.incomingRequestIds.length > 0 && (
              <View style={styles.dot}>
                <Text style={styles.dotText}>{state.incomingRequestIds.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.container, styles.sticky]}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'projects', label: '내 프로젝트', badge: state.incomingInvites.length },
              { value: 'feed', label: '피드' },
            ]}
          />
        </View>

        <View style={styles.container}>

        {tab === 'projects' ? (
          <>
            {state.incomingInvites.length > 0 && (
              <View style={{ gap: 10, marginTop: 20 }}>
                <Text style={styles.sectionTitle}>
                  받은 초대 <Text style={styles.sectionCount}>{state.incomingInvites.length}</Text>
                </Text>
                {state.incomingInvites.map((inv) => (
                  <InviteCard key={inv.id} invite={inv} />
                ))}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
              <Chip label={`전체 ${count('all')}`} active={filter === 'all'} onPress={() => setFilter('all')} />
              {(['active', 'paused', 'done'] as MemberStatus[]).map((s) => (
                <Chip key={s} label={`${statusStyles[s].label} ${count(s)}`} active={filter === s} onPress={() => setFilter(s)} />
              ))}
            </ScrollView>

            {sections.length === 0 && (
              <EmptyState
                emoji="🧶"
                title={filter === 'all' ? '아직 프로젝트가 없어요' : `${statusStyles[filter].label} 프로젝트가 없어요`}
                desc={filter === 'all' ? '새 프로젝트를 만들어 뜨개 기록을 시작해 보세요.' : undefined}
              />
            )}
            {sections.map((s) => (
              <View key={s.status} style={{ marginBottom: 20 }}>
                {filter === 'all' && (
                  <Text style={styles.sectionTitle}>
                    {statusStyles[s.status].label} <Text style={styles.sectionCount}>{s.items.length}</Text>
                  </Text>
                )}
                <View style={{ gap: 12 }}>
                  {s.items.map((m) => (
                    <ProjectCard key={m.projectId} membership={m} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={{ gap: 16, marginTop: 20 }}>
            {posts.length === 0 ? (
              <EmptyState emoji="📷" title="아직 게시글이 없어요" desc="완성한 작품을 자랑해 보세요!" />
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sticky: { backgroundColor: colors.bg, paddingVertical: 8 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  subtitle: { fontSize: 13, color: colors.textSub, fontFamily: fonts.mono, marginTop: 6, letterSpacing: 1 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chipsWrap: { marginTop: 12, marginBottom: 18, marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  sectionCount: { color: colors.primary },
});
