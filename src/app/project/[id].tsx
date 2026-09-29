import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditorMode, LogEditor } from '../../components/LogEditor';
import { LogItem } from '../../components/LogItem';
import { ProjectSettings } from '../../components/ProjectSettings';
import { TimerCard } from '../../components/TimerCard';
import { Avatar, Button, EmptyState, IconButton, Sheet, StatusBadge, monoText } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors, fonts, statusStyles } from '../../theme';
import { ProjectStatus } from '../../types';
import { hoursMinutes } from '../../utils/format';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const project = state.projects.find((p) => p.id === id);
  const isMember = !!project?.memberIds.includes(state.meId);
  const [viewId, setViewId] = useState(isMember ? state.meId : project?.ownerId ?? state.meId);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [statusSheet, setStatusSheet] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const logs = useMemo(
    () =>
      state.logs
        .filter((l) => l.projectId === id && l.authorId === viewId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [state.logs, id, viewId],
  );

  if (!project) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 40 }]}>
        <EmptyState emoji="🧶" title="프로젝트를 찾을 수 없어요" />
        <Button title="돌아가기" variant="outline" onPress={() => router.back()} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  const viewing = state.users[viewId];
  const viewingMe = viewId === state.meId;
  const isOwner = project.ownerId === state.meId;
  const isGroup = project.type === 'group';
  const totalSec = logs.reduce((s, l) => s + l.durationSec, 0);
  const hasApplicants = isGroup && project.visibility === 'public' && project.applicantIds.length > 0;
  const showSettings = isOwner || (isGroup && isMember);

  const saveLog = (input: Parameters<typeof actions.addLog>[1]) => {
    if (editor?.kind === 'edit') actions.updateLog(editor.log.id, input);
    else actions.addLog(project.id, input);
    if (editor?.kind === 'timer') actions.timerReset(project.id);
    setEditor(null);
  };

  const skipLog = () => {
    actions.timerReset(project.id);
    setEditor(null);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => router.back()} size={26} />
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.title} numberOfLines={1}>
            {project.title}
          </Text>
          <Text style={[monoText, { marginTop: 2 }]} numberOfLines={1}>
            {project.needle}
          </Text>
        </View>
        <StatusBadge status={project.status} onPress={isMember ? () => setStatusSheet(true) : undefined} />
        {showSettings && (
          <View style={{ marginLeft: 8 }}>
            <IconButton
              name={isOwner ? 'settings-outline' : 'people-outline'}
              onPress={() => setSettingsOpen(true)}
              accessibilityLabel="프로젝트 설정"
            />
            {isOwner && hasApplicants && <View style={styles.manageDot} pointerEvents="none" />}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {/* 진행 현황 */}
        <View style={styles.progressBox}>
          {isGroup && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.members}>
              {project.memberIds.map((mid) => {
                const u = state.users[mid];
                const on = mid === viewId;
                return (
                  <Pressable key={mid} onPress={() => setViewId(mid)} style={[styles.member, on && styles.memberOn]}>
                    <Avatar user={u} size={26} style={on ? { borderWidth: 1.5, borderColor: '#fff' } : undefined} />
                    <Text style={[styles.memberName, on && { color: '#fff' }]}>{u?.name}</Text>
                    {mid === state.meId && <Text style={[styles.meTag, on && { color: 'rgba(255,255,255,0.75)' }]}>(나)</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.progressRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>{viewingMe ? '나' : viewing?.name}의 진행 현황</Text>
              <Text style={[monoText, { marginTop: 6 }]}>{project.yarn}</Text>
              <Text style={[monoText, { marginTop: 4 }]}>
                기록 {logs.length}개{isGroup ? ` · ${project.visibility === 'public' ? '공개방' : '비공개방'}` : ''}
              </Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeNum}>{hoursMinutes(totalSec)}</Text>
              <Text style={styles.timeUnit}>누적 시간</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* 타이머 & 수동 추가: 내 기록을 볼 때만 */}
          {viewingMe && isMember && (
            <View style={{ gap: 10, marginBottom: 24 }}>
              {project.status !== 'done' && (
                <TimerCard
                  projectId={project.id}
                  onFinish={(startedAt, durationSec) => setEditor({ kind: 'timer', startedAt, durationSec })}
                />
              )}
              <Button title="기록 직접 추가" icon="create-outline" variant="soft" onPress={() => setEditor({ kind: 'manual' })} />
            </View>
          )}

          {!isMember && (
            <View style={styles.notice}>
              <Ionicons name="eye-outline" size={16} color={colors.textSub} />
              <Text style={{ color: colors.textSub, fontSize: 13 }}>참여하지 않은 프로젝트는 구경만 할 수 있어요.</Text>
            </View>
          )}

          {logs.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="아직 기록이 없어요"
              desc={viewingMe ? '타이머로 뜨개를 시작하거나 기록을 직접 추가해 보세요.' : `${viewing?.name}님의 기록을 기다려요.`}
            />
          ) : (
            logs.map((l, i) => (
              <LogItem key={l.id} log={l} isLast={i === logs.length - 1} onEdit={() => setEditor({ kind: 'edit', log: l })} />
            ))
          )}
        </View>
      </ScrollView>

      {editor && (
        <LogEditor
          key={editor.kind === 'edit' ? editor.log.id : editor.kind}
          mode={editor}
          onClose={() => setEditor(null)}
          onSave={saveLog}
          onSkip={skipLog}
        />
      )}

      {/* 상태 변경 */}
      <Sheet visible={statusSheet} onClose={() => setStatusSheet(false)} title="프로젝트 상태">
        {(['active', 'ready', 'done'] as ProjectStatus[]).map((s) => (
          <Pressable
            key={s}
            style={styles.option}
            onPress={() => {
              actions.setProjectStatus(project.id, s);
              setStatusSheet(false);
            }}
          >
            <View style={[styles.optionDot, { backgroundColor: statusStyles[s].fg }]} />
            <Text style={styles.optionText}>{statusStyles[s].label}</Text>
            {project.status === s && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </Pressable>
        ))}
      </Sheet>

      <ProjectSettings project={project} visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  manageDot: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  progressBox: {
    backgroundColor: colors.primarySoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3DDD3',
    paddingVertical: 18,
  },
  members: { gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  memberOn: { backgroundColor: colors.primary },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meTag: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  timeBox: {
    minWidth: 84,
    height: 76,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
    backgroundColor: '#FBE3D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNum: { fontFamily: fonts.mono, fontSize: 22, fontWeight: '700', color: colors.primary },
  timeUnit: { fontSize: 11, color: colors.primary, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 22 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chipBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 16, color: colors.text },
});
