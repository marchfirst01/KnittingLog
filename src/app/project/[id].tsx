import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Counters } from '../../components/Counters';
import { EditorMode, LogEditor } from '../../components/LogEditor';
import { LogItem } from '../../components/LogItem';
import { OwnerTag } from '../../components/ProjectCard';
import { EditProjectSheet, InviteSheet, StatusSheet, TransferSheet } from '../../components/ProjectSheets';
import { TimerCard } from '../../components/TimerCard';
import {
  ActionMenu,
  Avatar,
  Button,
  EmptyState,
  IconButton,
  MenuItem,
  Segmented,
  StatusBadge,
  monoText,
} from '../../components/ui';
import { LogInput, membersOf, useStore } from '../../store/AppStore';
import { colors, fonts } from '../../theme';
import { KnitLog, Membership } from '../../types';
import { showAlert } from '../../utils/alert';
import { hoursMinutes, period } from '../../utils/format';

type Tab = 'mine' | 'shared';
type SheetName = 'menu' | 'edit' | 'invite' | 'transfer' | 'status' | null;

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const project = state.projects.find((p) => p.id === id);
  const members = useMemo(() => (project ? membersOf(state, project.id) : []), [state, project]);
  const me = members.find((m) => m.userId === state.meId);
  const others = members.filter((m) => m.userId !== state.meId);
  const shared = members.length > 1;

  const [tab, setTab] = useState<Tab>('mine');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);

  const logsOf = (userId: string) =>
    state.logs
      .filter((l) => l.projectId === id && l.authorId === userId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  if (!project || !me) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 40 }]}>
        <EmptyState emoji="🧶" title="프로젝트를 찾을 수 없어요" desc="삭제됐거나 참여하지 않은 프로젝트예요." />
        <Button title="돌아가기" variant="outline" onPress={() => router.back()} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  const isOwner = project.ownerId === state.meId;
  const activeTab: Tab = shared ? tab : 'mine';
  const selected = others.find((m) => m.userId === selectedId) ?? others[0];

  // ── 메뉴 동작 ──
  const leave = () => {
    if (isOwner) {
      showAlert('먼저 방장을 양도해 주세요', '멤버가 있는 프로젝트는 방장을 다른 멤버에게 넘긴 뒤 나갈 수 있어요.', [
        { text: '취소', style: 'cancel' },
        { text: '양도하기', onPress: () => setSheet('transfer') },
      ]);
      return;
    }
    showAlert('프로젝트 나가기', '공유 기록 탭에서 빠지고, 내 기록은 개인 프로젝트로 그대로 남아 이어서 기록할 수 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          const newId = actions.leaveProject(project.id);
          router.replace(`/project/${newId}`);
        },
      },
    ]);
  };

  const remove = () => {
    if (others.length > 0) {
      showAlert(
        '삭제할 수 없어요',
        '멤버가 있는 프로젝트는 삭제할 수 없어요. 방장을 다른 멤버에게 양도한 뒤 나가기를 하면 내 기록은 개인 프로젝트로 남아요.',
        [
          { text: '닫기', style: 'cancel' },
          { text: '방장 양도', onPress: () => setSheet('transfer') },
        ],
      );
      return;
    }
    showAlert('프로젝트 삭제', `'${project.title}'와 내 기록이 모두 삭제돼요. 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          actions.deleteProject(project.id);
          router.back();
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    { label: '수정', icon: 'create-outline', onPress: () => setSheet('edit') },
    { label: '친구 초대', icon: 'person-add-outline', onPress: () => setSheet('invite') },
    ...(isOwner && others.length > 0
      ? [{ label: '방장 양도', icon: 'swap-horizontal-outline' as const, onPress: () => setSheet('transfer') }]
      : []),
    ...(shared ? [{ label: '나가기', icon: 'exit-outline' as const, destructive: true, onPress: leave }] : []),
    ...(isOwner ? [{ label: '삭제', icon: 'trash-outline' as const, destructive: true, onPress: remove }] : []),
  ];

  const saveLog = (input: LogInput) => {
    if (editor?.kind === 'edit') actions.updateLog(editor.log.id, input);
    else actions.addLog(project.id, input);
    if (editor?.kind === 'timer') actions.timerReset(project.id);
    setEditor(null);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => router.back()} size={26} />
        <View style={{ flex: 1, marginLeft: 6, gap: 3 }}>
          <Text style={styles.title} numberOfLines={1}>
            {project.title}
          </Text>
          <OwnerTag ownerId={project.ownerId} />
        </View>
        <StatusBadge status={me.status} onPress={() => setSheet('status')} />
        <IconButton
          name="ellipsis-horizontal"
          onPress={() => setSheet('menu')}
          style={{ marginLeft: 6 }}
          accessibilityLabel="프로젝트 메뉴"
        />
      </View>

      {shared && (
        <View style={styles.tabs}>
          <Segmented<Tab>
            value={activeTab}
            onChange={setTab}
            options={[
              { value: 'mine', label: '내 기록' },
              { value: 'shared', label: `공유 기록 ${members.length}` },
            ]}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {activeTab === 'mine' ? (
          <MyTab
            membership={me}
            logs={logsOf(state.meId)}
            onEditInfo={() => setSheet('edit')}
            onEditor={setEditor}
            onInvite={() => setSheet('invite')}
            shared={shared}
          />
        ) : (
          <SharedTab
            members={members}
            selected={selected}
            onSelect={setSelectedId}
            logs={selected ? logsOf(selected.userId) : []}
            isOwner={isOwner}
            projectId={project.id}
            onInvite={() => setSheet('invite')}
          />
        )}
      </ScrollView>

      {editor && (
        <LogEditor
          key={editor.kind === 'edit' ? editor.log.id : editor.kind}
          mode={editor}
          onClose={() => setEditor(null)}
          onSave={saveLog}
          onSkip={() => {
            actions.timerReset(project.id);
            setEditor(null);
          }}
        />
      )}
      <ActionMenu visible={sheet === 'menu'} onClose={() => setSheet(null)} items={menuItems} />
      {sheet === 'edit' && <EditProjectSheet project={project} membership={me} onClose={() => setSheet(null)} />}
      {sheet === 'invite' && <InviteSheet project={project} onClose={() => setSheet(null)} />}
      {sheet === 'transfer' && <TransferSheet project={project} onClose={() => setSheet(null)} />}
      {sheet === 'status' && (
        <StatusSheet
          current={me.status}
          onSelect={(s) => actions.setMyStatus(project.id, s)}
          onClose={() => setSheet(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

/** 진행상황 요약 박스 */
function ProgressBox({ membership, logs, title, onEdit }: { membership: Membership; logs: KnitLog[]; title: string; onEdit?: () => void }) {
  const totalSec = logs.reduce((s, l) => s + l.durationSec, 0);
  const done = membership.status === 'done';
  return (
    <View style={[styles.progressBox, done && styles.progressDone]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.progressTitle}>{title}</Text>
        <Text style={styles.period}>{period(membership)}</Text>
        <Text style={monoText}>기록 {logs.length}개</Text>
        <Pressable onPress={onEdit} disabled={!onEdit} style={styles.yarnRow} hitSlop={4}>
          <Text style={[monoText, { fontSize: 12, flexShrink: 1 }]} numberOfLines={2}>
            {[membership.yarn, membership.needle].filter(Boolean).join(' · ') || (onEdit ? '실·바늘 정보를 입력해 보세요' : '실 정보 없음')}
          </Text>
          {onEdit && <Ionicons name="pencil" size={12} color={colors.textMuted} />}
        </Pressable>
      </View>
      <View style={[styles.timeBox, done && { borderColor: colors.borderStrong, backgroundColor: colors.chipBg }]}>
        <Text style={[styles.timeNum, done && { color: colors.textSub }]}>{hoursMinutes(totalSec)}</Text>
        <Text style={[styles.timeUnit, done && { color: colors.textSub }]}>누적 시간</Text>
      </View>
    </View>
  );
}

function MyTab({
  membership,
  logs,
  onEditInfo,
  onEditor,
  onInvite,
  shared,
}: {
  membership: Membership;
  logs: KnitLog[];
  onEditInfo: () => void;
  onEditor: (m: EditorMode) => void;
  onInvite: () => void;
  shared: boolean;
}) {
  const done = membership.status === 'done';
  return (
    <>
      <ProgressBox membership={membership} logs={logs} title="나의 진행상황" onEdit={onEditInfo} />
      <View style={styles.content}>
        {done ? (
          <View style={styles.notice}>
            <Ionicons name="flag-outline" size={16} color={colors.textSub} />
            <Text style={styles.noticeText}>종료한 프로젝트예요. 상태를 진행중으로 바꾸면 이어서 기록할 수 있어요.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 24 }}>
            <TimerCard
              projectId={membership.projectId}
              onFinish={(startedAt, durationSec) => onEditor({ kind: 'timer', startedAt, durationSec })}
            />
            <Counters projectId={membership.projectId} counters={membership.counters} />
            <Button title="기록 직접 추가" icon="create-outline" variant="soft" onPress={() => onEditor({ kind: 'manual' })} />
            {!shared && (
              <Pressable onPress={onInvite} style={styles.shareHint}>
                <Ionicons name="people-outline" size={16} color={colors.primary} />
                <Text style={styles.shareHintText}>친구를 초대하면 공유 기록 탭에서 함께 볼 수 있어요</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}
        {logs.length === 0 ? (
          <EmptyState emoji="📝" title="아직 기록이 없어요" desc="타이머로 뜨개를 시작하거나 기록을 직접 추가해 보세요." />
        ) : (
          logs.map((l, i) => (
            <LogItem key={l.id} log={l} isLast={i === logs.length - 1} onEdit={() => onEditor({ kind: 'edit', log: l })} />
          ))
        )}
      </View>
    </>
  );
}

function SharedTab({
  members,
  selected,
  onSelect,
  logs,
  isOwner,
  projectId,
  onInvite,
}: {
  members: Membership[];
  selected?: Membership;
  onSelect: (id: string) => void;
  logs: KnitLog[];
  isOwner: boolean;
  projectId: string;
  onInvite: () => void;
}) {
  const { state, actions } = useStore();
  const [memberMenu, setMemberMenu] = useState(false);
  const others = members.filter((m) => m.userId !== state.meId);
  if (!selected) return null;

  const user = state.users[selected.userId];
  const hidden = state.hiddenIds.includes(selected.userId);
  const isFriend = state.friendIds.includes(selected.userId);
  const requested = state.outgoingRequestIds.includes(selected.userId);
  const project = state.projects.find((p) => p.id === projectId);

  const kick = () =>
    showAlert(
      `${user?.name}님 내보내기`,
      `공유 기록 탭에서 ${user?.name}님이 사라져요. ${user?.name}님의 기록은 개인 프로젝트로 유지돼요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '내보내기', style: 'destructive', onPress: () => actions.kickMember(projectId, selected.userId) },
      ],
    );

  const ownerItems: MenuItem[] = [
    {
      label: '방장 양도',
      icon: 'swap-horizontal-outline',
      onPress: () =>
        showAlert('방장 양도', `${user?.name}님에게 방장을 넘길까요?`, [
          { text: '취소', style: 'cancel' },
          { text: '양도', onPress: () => actions.transferOwner(projectId, selected.userId) },
        ]),
    },
    { label: '내보내기', icon: 'remove-circle-outline', destructive: true, onPress: kick },
  ];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.members} style={styles.membersWrap}>
        {others.map((m) => {
          const u = state.users[m.userId];
          const on = m.userId === selected.userId;
          const ended = m.status === 'done';
          return (
            <Pressable key={m.userId} onPress={() => onSelect(m.userId)} style={[styles.member, on && styles.memberOn]}>
              <Avatar user={u} size={26} gray={ended} style={on ? { borderWidth: 1.5, borderColor: '#fff' } : undefined} />
              <Text style={[styles.memberName, on && { color: '#fff' }, ended && !on && { color: colors.textMuted }]}>{u?.name}</Text>
              {m.userId === project?.ownerId && <Text style={{ fontSize: 11 }}>👑</Text>}
            </Pressable>
          );
        })}
        <Pressable onPress={onInvite} style={[styles.member, styles.memberAdd]} accessibilityLabel="친구 초대">
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[styles.memberName, { color: colors.primary }]}>초대</Text>
        </Pressable>
      </ScrollView>

      <ProgressBox membership={selected} logs={hidden ? [] : logs} title={`${user?.name}의 진행상황`} />

      <View style={styles.content}>
        <View style={styles.memberActions}>
          <Button small variant="outline" icon="person-outline" title="프로필" onPress={() => router.push(`/user/${selected.userId}`)} />
          {!hidden &&
            (isFriend ? (
              <Button small variant="soft" icon="checkmark" title="친구" disabled />
            ) : requested ? (
              <Button small variant="soft" title="요청됨" onPress={() => actions.cancelFriendRequest(selected.userId)} />
            ) : (
              <Button small icon="person-add-outline" title="친구 추가" onPress={() => actions.sendFriendRequest(selected.userId)} />
            ))}
          {isOwner && (
            <Button small variant="ghost" icon="ellipsis-horizontal" title="관리" onPress={() => setMemberMenu(true)} />
          )}
        </View>

        {selected.status === 'done' && (
          <View style={styles.endedBanner}>
            <Text style={styles.endedText}>프로젝트 종료 유저입니다!</Text>
          </View>
        )}

        {hidden ? (
          <EmptyState emoji="🚫" title="차단한 사용자의 기록은 보이지 않아요" />
        ) : logs.length === 0 ? (
          <EmptyState emoji="📝" title="아직 기록이 없어요" desc={`${user?.name}님의 기록을 기다려요.`} />
        ) : (
          <View style={selected.status === 'done' ? { opacity: 0.75 } : undefined}>
            {logs.map((l, i) => (
              <LogItem key={l.id} log={l} isLast={i === logs.length - 1} />
            ))}
          </View>
        )}
      </View>

      <ActionMenu visible={memberMenu} onClose={() => setMemberMenu(false)} title={`${user?.name}님`} items={ownerItems} />
    </>
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
  tabs: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 12 },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3DDD3',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  progressDone: { backgroundColor: '#F2EFEC', borderColor: colors.border },
  progressTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  period: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: colors.primary },
  yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  content: { paddingHorizontal: 20, paddingTop: 20 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.chipBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  noticeText: { flex: 1, color: colors.textSub, fontSize: 13, lineHeight: 18 },
  shareHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryMuted,
  },
  shareHintText: { flex: 1, fontSize: 13, color: colors.primary },
  membersWrap: { backgroundColor: colors.bg, paddingVertical: 14 },
  members: { gap: 8, paddingHorizontal: 20 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  memberOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberAdd: { paddingLeft: 10, borderStyle: 'dashed', borderColor: colors.primaryMuted },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberActions: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  endedBanner: {
    backgroundColor: colors.chipBg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  endedText: { fontSize: 14, fontWeight: '700', color: colors.textSub },
});
