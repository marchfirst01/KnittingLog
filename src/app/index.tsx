import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProjectCard } from '../components/ProjectCard';
import { InviteCard, RecruitCard } from '../components/RecruitCard';
import { Avatar, Button, Chip, EmptyState, IconButton, Segmented } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors, fonts, statusStyles } from '../theme';
import { ProjectStatus } from '../types';
import { sortProjects } from '../utils/format';

type Tab = 'mine' | 'recruit';
type Category = 'all' | 'solo' | 'group';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('mine');
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const me = state.users[state.meId];

  const myProjects = useMemo(
    () => sortProjects(state.projects.filter((p) => p.memberIds.includes(state.meId)), state.logs),
    [state.projects, state.logs, state.meId],
  );
  const filtered = category === 'all' ? myProjects : myProjects.filter((p) => p.type === category);
  const sections = (['active', 'ready', 'done'] as ProjectStatus[])
    .map((status) => ({ status, items: filtered.filter((p) => p.status === status) }))
    .filter((s) => s.items.length > 0);

  // 공개방 중 내가 아직 참여하지 않았고 자리가 남은 방
  const recruiting = useMemo(
    () =>
      state.projects.filter(
        (p) =>
          p.type === 'group' &&
          p.visibility === 'public' &&
          p.status !== 'done' &&
          !p.memberIds.includes(state.meId) &&
          p.memberIds.length < p.maxMembers,
      ),
    [state.projects, state.meId],
  );

  // 검색: 참여 코드가 정확히 일치하면 비공개방까지 찾고, 그 외에는 공개방을 제목·실·방장 이름으로 찾는다
  const q = query.trim();
  const codeMatch = q
    ? state.projects.find((p) => p.type === 'group' && p.status !== 'done' && p.code === q.toUpperCase())
    : undefined;
  const searchResults = q
    ? recruiting.filter(
        (p) =>
          p.id !== codeMatch?.id &&
          [p.title, p.yarn, state.users[p.ownerId]?.name ?? ''].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      )
    : recruiting;

  const count = (c: Category) => (c === 'all' ? myProjects.length : myProjects.filter((p) => p.type === c).length);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>뜨개로그</Text>
            <Text style={styles.subtitle}>나의 뜨개 기록</Text>
          </View>
          <Button small title="새 프로젝트" icon="add" onPress={() => router.push('/project/new')} style={{ marginRight: 10 }} />
          <Pressable onPress={() => router.push('/mypage')} hitSlop={6} accessibilityLabel="마이페이지">
            <Avatar user={me} size={44} />
            {state.incomingRequestIds.length > 0 && (
              <View style={styles.dot}>
                <Text style={styles.dotText}>{state.incomingRequestIds.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: '나의 프로젝트' },
            { value: 'recruit', label: '모집 중', badge: state.incomingInvites.length },
          ]}
        />

        {tab === 'mine' ? (
          <>
            <View style={styles.filterRow}>
              <View style={styles.chips}>
                <Chip label={`전체 ${count('all')}`} active={category === 'all'} onPress={() => setCategory('all')} />
                <Chip label={`혼자 ${count('solo')}`} active={category === 'solo'} onPress={() => setCategory('solo')} />
                <Chip label={`함뜨 ${count('group')}`} active={category === 'group'} onPress={() => setCategory('group')} />
              </View>
            </View>

            {sections.length === 0 && (
              <EmptyState emoji="🧶" title="아직 프로젝트가 없어요" desc="새 프로젝트를 만들어 뜨개 기록을 시작해 보세요." />
            )}
            {sections.map((s) => (
              <View key={s.status} style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>
                  {statusStyles[s.status].label} <Text style={styles.sectionCount}>{s.items.length}</Text>
                </Text>
                <View style={{ gap: 12 }}>
                  {s.items.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={{ gap: 12, marginTop: 20 }}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textSub} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="방 이름 또는 참여 코드 검색"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {!!query && <IconButton name="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} />}
            </View>

            {!q && state.incomingInvites.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  받은 초대 <Text style={styles.sectionCount}>{state.incomingInvites.length}</Text>
                </Text>
                {state.incomingInvites.map((inv) => (
                  <InviteCard key={inv.id} invite={inv} />
                ))}
                <View style={{ height: 8 }} />
              </>
            )}

            {codeMatch && (
              <>
                <Text style={styles.sectionTitle}>코드로 찾은 방</Text>
                <RecruitCard project={codeMatch} joinByCode />
                <View style={{ height: 8 }} />
              </>
            )}

            {!(codeMatch && searchResults.length === 0) && (
              <Text style={styles.sectionTitle}>
                {q ? '검색 결과' : '공개 모집 중'} <Text style={styles.sectionCount}>{searchResults.length}</Text>
              </Text>
            )}
            {!q && <Text style={styles.hint}>다른 뜨개인들이 공개로 연 함뜨예요. 비공개방은 참여 코드로 검색해 들어갈 수 있어요.</Text>}
            {codeMatch && searchResults.length === 0 ? null : searchResults.length === 0 ? (
              <EmptyState
                emoji="🪡"
                title={q ? '검색 결과가 없어요' : '모집 중인 프로젝트가 없어요'}
                desc={q ? '비공개방은 6자리 참여 코드를 정확히 입력해 주세요.' : undefined}
              />
            ) : (
              searchResults.map((p) => <RecruitCard key={p.id} project={p} />)
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
  filterRow: { marginTop: 16, marginBottom: 20 },
  chips: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  sectionCount: { color: colors.primary },
  hint: { fontSize: 13, color: colors.textSub, lineHeight: 19, marginTop: -4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
});
