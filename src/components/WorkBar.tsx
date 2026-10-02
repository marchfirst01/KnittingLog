import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { Counter, TimerState } from '../types';
import { showAlert } from '../utils/alert';
import { relative, stopwatch } from '../utils/format';
import { CounterManager } from './CounterManager';

export const elapsedMs = (t: TimerState | undefined, now = Date.now()) =>
  t ? t.accumulatedMs + (t.runningSince ? now - t.runningSince : 0) : 0;

const RING = 40;
const STROKE = 3.5;
/** 접힌 상태에서 보이는 카운터 수 */
const PEEK_COUNTERS = 2;
const HANDLE_H = 22;
const TIMER_H = 58;
const ROW_H = 58;
const MANAGE_H = 40;

/** 웹에서 시트를 끌 때 마우스가 지나간 글자가 선택(드래그)되지 않게 한다 */
const clearWebSelection = () => {
  if (Platform.OS === 'web') window.getSelection?.()?.removeAllRanges();
};

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
        <Ionicons name="remove" size={20} color={counter.value <= 0 ? colors.textMuted : colors.text} />
      </Pressable>
      <CounterRing value={counter.value} max={counter.max} />
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.6 }]}
        onPress={() => set(counter.value + 1)}
        accessibilityLabel={`${counter.label} 더하기`}
      >
        <Ionicons name="add" size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={reset} style={styles.meta} hitSlop={6} accessibilityLabel={`${counter.label} 초기화`}>
        <Text style={styles.metaText} numberOfLines={1}>
          {relative(counter.updatedAt)}
        </Text>
        <Ionicons name="refresh" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/**
 * 프로젝트 상세 하단에 고정된 작업바(바텀시트): 타이머 + 단수 카운터.
 * 기본으로는 화면 하단 약 30% 높이에 카운터 2개까지 보이고,
 * 손잡이·타이머 영역을 잡고 위로 끌어당기면 나머지 카운터가 펼쳐진다.
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
  const { height: screenH } = useWindowDimensions();
  const { state, actions } = useStore();
  const timer = state.timers[projectId];
  const running = !!timer?.runningSince;
  const [now, setNow] = useState(() => Date.now());
  const [managing, setManaging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visible = counters.filter((c) => c.visible);
  const bottomPad = Math.max(insets.bottom, 10);
  const chrome = HANDLE_H + TIMER_H + bottomPad + 8;
  // 접힌 높이: 타이머 + 카운터 딱 2개 (아이폰 기준 화면의 약 30%). 카운터가 2개 이하면 관리 버튼까지 보인다.
  const minH = chrome + PEEK_COUNTERS * ROW_H + (visible.length <= PEEK_COUNTERS ? MANAGE_H : 0);
  // 펼친 높이: 모든 카운터 + 관리 버튼, 화면의 80%를 넘지 않게
  const maxH = Math.max(
    minH + MANAGE_H,
    Math.min(Math.round(screenH * 0.8), chrome + visible.length * ROW_H + MANAGE_H),
  );

  const [height] = useState(() => new Animated.Value(minH));
  const base = useRef(minH);
  const bounds = useRef({ minH, maxH });
  const isOpen = useRef(false);
  const listRef = useRef<ScrollView>(null);

  // 화면 크기나 카운터 수가 바뀌면 현재 상태(접힘/펼침)의 높이로 다시 맞춘다
  useEffect(() => {
    bounds.current = { minH, maxH };
    const target = isOpen.current ? maxH : minH;
    base.current = target;
    height.setValue(target);
    onHeight?.(minH);
  }, [minH, maxH, height, onHeight]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  /** 손을 뗐을 때: 빠르게 튕기면 그 방향으로, 아니면 가까운 쪽(접힘/펼침)으로 붙는다 */
  function settle(dy: number, vy: number) {
    const { minH: lo, maxH: hi } = bounds.current;
    const current = Math.min(hi, Math.max(lo, base.current - dy));
    const open = vy < -0.5 ? true : vy > 0.5 ? false : current > (lo + hi) / 2;
    const target = open ? hi : lo;
    base.current = target;
    isOpen.current = open;
    Animated.spring(height, { toValue: target, useNativeDriver: false, bounciness: 0, speed: 18 }).start();
    if (!open) listRef.current?.scrollTo({ y: 0, animated: true });
    setExpanded(open);
  }

  // 제스처 핸들러는 렌더 중이 아니라 드래그할 때만 ref를 읽는다 (린터가 이를 구분하지 못해 이 줄만 예외 처리)
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      // 손잡이·타이머 영역을 누르면 바로 잡는다. 버튼은 더 안쪽에 있어서 버튼 탭이 먼저 처리된다.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        height.stopAnimation((v) => (base.current = v));
        clearWebSelection();
      },
      onPanResponderMove: (_, g) => {
        clearWebSelection();
        const { minH: lo, maxH: hi } = bounds.current;
        height.setValue(Math.min(hi, Math.max(lo, base.current - g.dy)));
      },
      // 끄는 도중에 아래 카운터 목록(ScrollView)이 제스처를 가져가지 못하게 한다
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: (_, g) => settle(g.dy, g.vy),
      onPanResponderRelease: (_, g) => settle(g.dy, g.vy),
    }),
  );

  const ms = elapsedMs(timer, running ? now : undefined);

  const finish = () => {
    if (ms <= 0) return;
    actions.timerPause(projectId);
    const end = Date.now();
    onFinish(timer?.firstStartedAt ?? end, Math.round(elapsedMs(timer, end) / 1000));
  };

  return (
    <Animated.View style={[styles.bar, { height, paddingBottom: bottomPad }]}>
      {/* 잡고 끄는 영역: 손잡이 + 타이머 줄 */}
      <View {...pan.panHandlers}>
        <View style={styles.handleArea} accessibilityLabel="작업바 손잡이">
          <View style={styles.handle} />
        </View>
        <View style={styles.timerRow}>
          <Text style={[styles.time, running && { color: colors.primary }]}>{stopwatch(ms)}</Text>
          <Pressable
            onPress={() => (running ? actions.timerPause(projectId) : actions.timerStart(projectId))}
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.8 }]}
            accessibilityLabel={running ? '일시 정지' : '시작'}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={22} color="#fff" style={!running && { marginLeft: 2 }} />
          </Pressable>
          <Pressable
            onPress={finish}
            disabled={ms <= 0}
            style={({ pressed }) => [styles.stop, pressed && { opacity: 0.7 }, ms <= 0 && { opacity: 0.4 }]}
            accessibilityLabel="타이머 종료"
          >
            <Ionicons name="stop" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        scrollEnabled={expanded}
        showsVerticalScrollIndicator={expanded}
        bounces={false}
      >
        {visible.map((c) => (
          <CounterRow key={c.id} projectId={projectId} counter={c} />
        ))}
        <Pressable onPress={() => setManaging(true)} style={styles.manage} hitSlop={6}>
          <Ionicons name={visible.length ? 'options-outline' : 'add'} size={15} color={colors.textSub} />
          <Text style={styles.manageText}>
            {visible.length ? `단수 카운터 관리 (${visible.length}/${counters.length})` : '단수 카운터 추가'}
          </Text>
        </Pressable>
      </ScrollView>

      {managing && (
        <CounterManager
          projectId={projectId}
          counters={counters}
          onClose={() => {
            setManaging(false);
            // 접힌 상태면 목록을 다시 맨 위(카운터 2개)로 맞춘다
            setTimeout(() => !isOpen.current && listRef.current?.scrollTo({ y: 0, animated: false }), 50);
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: { height: HANDLE_H, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  timerRow: { height: TIMER_H, flexDirection: 'row', alignItems: 'center', gap: 10 },
  // userSelect: 웹에서 끌 때 숫자가 선택되지 않도록
  time: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    userSelect: 'none',
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.segmentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterRow: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterLabel: { flex: 1, fontSize: 15, color: colors.text, userSelect: 'none' },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.segmentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  ringValue: { fontSize: 15, fontWeight: '700', color: colors.text, userSelect: 'none' },
  meta: { width: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  metaText: { flexShrink: 1, fontSize: 12, color: colors.textMuted },
  manage: { height: MANAGE_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  manageText: { fontSize: 13, color: colors.textSub, fontWeight: '600', userSelect: 'none' },
});
