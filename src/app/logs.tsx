import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogItem } from '../components/LogItem';
import { EmptyState, IconButton } from '../components/ui';
import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { duration } from '../utils/format';

/** 내 기록 모아보기: 프로젝트 구분 없이 시간순 */
export default function MyLogsScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const logs = useMemo(
    () => state.logs.filter((l) => l.authorId === state.meId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [state.logs, state.meId],
  );
  const total = logs.reduce((s, l) => s + l.durationSec, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" size={26} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>내 기록 모아보기</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.summary}>
          기록 {logs.length}개 · 총 {duration(total)}
        </Text>
        {logs.length === 0 ? (
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  summary: { fontSize: 13, color: colors.textSub, marginBottom: 18 },
});
