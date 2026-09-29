import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { TimerState } from '../types';
import { stopwatch } from '../utils/format';

export const elapsedMs = (t: TimerState | undefined, now = Date.now()) =>
  t ? t.accumulatedMs + (t.runningSince ? now - t.runningSince : 0) : 0;

/** 뜨개 타이머. 종료를 누르면 onFinish 로 시작 시각과 경과 시간을 넘긴다. */
export function TimerCard({
  projectId,
  onFinish,
}: {
  projectId: string;
  onFinish: (startedAt: number, durationSec: number) => void;
}) {
  const { state, actions } = useStore();
  const timer = state.timers[projectId];
  const running = !!timer?.runningSince;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const ms = elapsedMs(timer, running ? now : undefined);
  const hasTime = ms > 0;

  const finish = () => {
    actions.timerPause(projectId);
    const end = Date.now();
    onFinish(timer?.firstStartedAt ?? end, Math.round(elapsedMs(timer, end) / 1000));
  };

  return (
    <View style={[styles.card, running && styles.cardRunning]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, running && { color: 'rgba(255,255,255,0.8)' }]}>
          {running ? '뜨는 중…' : hasTime ? '일시 정지' : '뜨개 타이머'}
        </Text>
        <Text style={[styles.time, running && { color: '#fff' }]}>{stopwatch(ms)}</Text>
      </View>
      {hasTime && (
        <Pressable onPress={finish} style={[styles.round, styles.stop, running && styles.stopRunning]} accessibilityLabel="타이머 종료">
          <Ionicons name="stop" size={20} color={running ? '#fff' : colors.primary} />
        </Pressable>
      )}
      <Pressable
        onPress={() => (running ? actions.timerPause(projectId) : actions.timerStart(projectId))}
        style={[styles.round, running ? styles.pauseRunning : styles.play]}
        accessibilityLabel={running ? '일시 정지' : '시작'}
      >
        <Ionicons name={running ? 'pause' : 'play'} size={24} color={running ? colors.primary : '#fff'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  cardRunning: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSub, marginBottom: 2 },
  time: { fontFamily: fonts.mono, fontSize: 30, fontWeight: '700', color: colors.text, letterSpacing: 1 },
  round: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  play: { backgroundColor: colors.primary },
  pauseRunning: { backgroundColor: '#fff' },
  stop: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft },
  stopRunning: { backgroundColor: 'rgba(255,255,255,0.22)' },
});
