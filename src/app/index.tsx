import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProjectCard } from '../components/ProjectCard';
import { RecruitCard } from '../components/RecruitCard';
import { Avatar, Button, Chip, EmptyState, Segmented } from '../components/ui';
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
  const me = state.users[state.meId];

  const myProjects = useMemo(
    () => sortProjects(state.projects.filter((p) => p.memberIds.includes(state.meId)), state.logs),
    [state.projects, state.logs, state.meId],
  );
  const filtered = category === 'all' ? myProjects : myProjects.filter((p) => p.type === category);
  const sections = (['active', 'ready', 'done'] as ProjectStatus[])
    .map((status) => ({ status, items: filtered.filter((p) => p.status === status) }))
    .filter((s) => s.items.length > 0);

  const recruiting = useMemo(
    () =>
      state.projects.filter(
        (p) =>
          p.recruit?.isOpen &&
          p.status !== 'done' &&
          !p.memberIds.includes(state.meId) &&
          p.memberIds.length < p.recruit.maxMembers,
      ),
    [state.projects, state.meId],
  );

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
            { value: 'recruit', label: `모집 중 ${recruiting.length}` },
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
            <Text style={styles.hint}>다른 뜨개인들이 공개로 연 함뜨예요. 참여 신청으로 함께 떠 보세요.</Text>
            {recruiting.length === 0 ? (
              <EmptyState emoji="🪡" title="모집 중인 프로젝트가 없어요" />
            ) : (
              recruiting.map((p) => <RecruitCard key={p.id} project={p} />)
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
  hint: { fontSize: 13, color: colors.textSub, lineHeight: 19 },
});
