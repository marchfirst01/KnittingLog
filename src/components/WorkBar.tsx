import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { Counter, TimerState } from '../types';
import { showAlert } from '../utils/alert';
import { relative, stopwatch } from '../utils/format';
import { CounterManager } from './CounterManager';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

export const elapsedMs = (t: TimerState | undefined, now = Date.now()) =>
  t ? t.accumulatedMs + (t.runningSince ? now - t.runningSince : 0) : 0;

const RING = 50;
const STROKE = 4;

/** 현재값/목표값만큼 채워지는 원형 프로그레스. 목표를 넘으면 100%로 고정되고 숫자만 올라간다 */
export function CounterRing({ value, max, size = RING }: { value: number; max: number; size?: number }) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = Math.min(1, max > 0 ? value / max : 0);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.segmentBg} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={value >= max ? '#2E9E6A' : colors.text}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}

function CounterRow({ projectId, counter }: { projectId: string; counter: Counter }) {
  const { actions } = useStore();
  const set = (value: number) => actions.setCounter(projectId, counter.id, { value });
  const reset = () =>
    showAlert(`${counter.label} 초기화`, '현재 단을 0으로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: () => set(0) },
    ]);
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel} numberOfLines={1}>
        {counter.label}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.6 }]}
        onPress={() => set(counter.value - 1)}
        disabled={counter.value <= 0}
        accessibilityLabel={`${counter.label} 빼기`}
      >
        <Ionicons name="remove" size={24} color={counter.value <= 0 ? colors.textMuted : colors.text} />
      </Pressable>
      <CounterRing value={counter.value} max={counter.max} />
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.6 }]}
        onPress={() => set(counter.value + 1)}
        accessibilityLabel={`${counter.label} 더하기`}
      >
        <Ionicons name="add" size={24} color={colors.text} />
      </Pressable>
      <Pressable onPress={reset} style={styles.meta} hitSlop={6} accessibilityLabel={`${counter.label} 초기화`}>
        <Text style={styles.metaText} numberOfLines={1}>
          {relative(counter.updatedAt)}
        </Text>
        <Ionicons name="refresh" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/**
 * 프로젝트 상세 하단에 고정된 작업바: 타이머 + 단수 카운터.
 * 손잡이를 위아래로 끌거나 눌러서 카운터 부분을 접고 펼친다.
 */
export function WorkBar({
  projectId,
  counters,
  onFinish,
  onHeight,
}: {
  projectId: string;
  counters: Counter[];
  onFinish: (startedAt: number, durationSec: number) => void;
  onHeight?: (h: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const timer = state.timers[projectId];
  const running = !!timer?.runningSince;
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(true);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const ms = elapsedMs(timer, running ? now : undefined);
  const visible = counters.filter((c) => c.visible);

  const toggle = (next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
        onPanResponderRelease: (_, g) => {
          if (g.dy > 20) toggle(false);
          else if (g.dy < -20) toggle(true);
        },
      }),
    [],
  );

  const finish = () => {
    if (ms <= 0) return;
    actions.timerPause(projectId);
    const end = Date.now();
    onFinish(timer?.firstStartedAt ?? end, Math.round(elapsedMs(timer, end) / 1000));
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]} onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}>
      <Pressable {...pan.panHandlers} onPress={() => toggle(!expanded)} style={styles.handleArea} accessibilityLabel="작업바 접기/펼치기">
        <View style={styles.handle} />
      </Pressable>

      <View style={styles.timerRow}>
        <Text style={[styles.time, running && { color: colors.primary }]}>{stopwatch(ms)}</Text>
        <Pressable
          onPress={() => (running ? actions.timerPause(projectId) : actions.timerStart(projectId))}
          style={({ pressed }) => [styles.play, pressed && { opacity: 0.8 }]}
          accessibilityLabel={running ? '일시 정지' : '시작'}
        >
          <Ionicons name={running ? 'pause' : 'play'} size={26} color="#fff" style={!running && { marginLeft: 3 }} />
        </Pressable>
        <Pressable
          onPress={finish}
          disabled={ms <= 0}
          style={({ pressed }) => [styles.stop, pressed && { opacity: 0.7 }, ms <= 0 && { opacity: 0.4 }]}
          accessibilityLabel="타이머 종료"
        >
          <Ionicons name="stop" size={20} color={colors.text} />
        </Pressable>
      </View>

      {expanded && (
        <>
          <ScrollView style={{ maxHeight: 216 }} bounces={false}>
            {visible.map((c) => (
              <CounterRow key={c.id} projectId={projectId} counter={c} />
            ))}
          </ScrollView>
          <Pressable onPress={() => setManaging(true)} style={styles.manage} hitSlop={6}>
            <Ionicons name={visible.length ? 'options-outline' : 'add'} size={15} color={colors.textSub} />
            <Text style={styles.manageText}>
              {visible.length ? `단수 카운터 관리 (${visible.length}/${counters.length})` : '단수 카운터 추가'}
            </Text>
          </Pressable>
        </>
      )}

      {managing && <CounterManager projectId={projectId} counters={counters} onClose={() => setManaging(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  time: { flex: 1, fontSize: 38, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  play: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  stop: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.segmentBg, alignItems: 'center', justifyContent: 'center' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  counterLabel: { flex: 1, fontSize: 16, color: colors.text },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.segmentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 8 },
  ringValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { width: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  metaText: { flexShrink: 1, fontSize: 13, color: colors.textMuted },
  manage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  manageText: { fontSize: 13, color: colors.textSub, fontWeight: '600' },
});
