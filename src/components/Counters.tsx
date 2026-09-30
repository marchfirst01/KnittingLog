import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { Counter } from '../types';
import { showAlert } from '../utils/alert';
import { Button, Sheet } from './ui';

const RING = 104;
const STROKE = 8;

/** 현재값/최대값만큼 채워지는 원형 프로그레스. 최대값을 넘으면 100%로 고정 */
function Ring({ value, max }: { value: number; max: number }) {
  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = Math.min(1, max > 0 ? value / max : 0);
  const done = value >= max;
  return (
    <Svg width={RING} height={RING}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.segmentBg} strokeWidth={STROKE} fill="none" />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={done ? '#2E9E6A' : colors.primary}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - ratio)}
        // 12시 방향부터 시계 방향으로 채운다
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

function CounterItem({ counter, onChange, onEdit }: { counter: Counter; onChange: (v: number) => void; onEdit: () => void }) {
  return (
    <View style={styles.item}>
      <Pressable onPress={onEdit} hitSlop={6} style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {counter.label}
        </Text>
        <Ionicons name="settings-outline" size={12} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={onEdit} style={styles.ringWrap} accessibilityLabel={`${counter.label} 설정`}>
        <Ring value={counter.value} max={counter.max} />
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.value}>{counter.value}</Text>
          <Text style={styles.max}>/ {counter.max}</Text>
        </View>
      </Pressable>
      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.minus, pressed && { opacity: 0.6 }]}
          onPress={() => onChange(counter.value - 1)}
          disabled={counter.value <= 0}
          accessibilityLabel={`${counter.label} 빼기`}
        >
          <Ionicons name="remove" size={22} color={counter.value <= 0 ? colors.textMuted : colors.primary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.plus, pressed && { opacity: 0.7 }]}
          onPress={() => onChange(counter.value + 1)}
          accessibilityLabel={`${counter.label} 더하기`}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/** 단수 카운터 2개. 타이머 아래에 놓인다 */
export function Counters({ projectId, counters }: { projectId: string; counters: [Counter, Counter] }) {
  const { actions } = useStore();
  const [editing, setEditing] = useState<0 | 1 | null>(null);

  return (
    <View style={styles.card}>
      {counters.map((c, i) => (
        <CounterItem
          key={i}
          counter={c}
          onChange={(value) => actions.setCounter(projectId, i as 0 | 1, { value })}
          onEdit={() => setEditing(i as 0 | 1)}
        />
      ))}
      {editing !== null && (
        <CounterEditor
          counter={counters[editing]}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            actions.setCounter(projectId, editing, patch);
            setEditing(null);
          }}
        />
      )}
    </View>
  );
}

function CounterEditor({
  counter,
  onClose,
  onSave,
}: {
  counter: Counter;
  onClose: () => void;
  onSave: (patch: Partial<Counter>) => void;
}) {
  const [label, setLabel] = useState(counter.label);
  const [max, setMax] = useState(String(counter.max));

  const save = (extra?: Partial<Counter>) => {
    const m = Number(max);
    if (!Number.isInteger(m) || m < 1) {
      showAlert('최대값 확인', '1 이상의 숫자를 입력해 주세요.');
      return;
    }
    onSave({ label: label.trim() || counter.label, max: m, ...extra });
  };

  return (
    <Sheet visible onClose={onClose} title="카운터 설정">
      <Text style={styles.fieldLabel}>이름</Text>
      <TextInput value={label} onChangeText={setLabel} maxLength={10} style={styles.input} placeholder="예: 단, 코, 무늬 반복" />
      <Text style={styles.fieldLabel}>최대값</Text>
      <TextInput value={max} onChangeText={setMax} keyboardType="number-pad" style={styles.input} placeholder="예: 40" />
      <Text style={styles.help}>최대값에 도달해도 계속 셀 수 있어요. 원은 가득 찬 채로 숫자만 올라가요.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Button
          title="0으로 초기화"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => save({ value: 0 })}
        />
        <Button title="저장" style={{ flex: 1.3 }} onPress={() => save()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  item: { flex: 1, alignItems: 'center', gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '90%' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  ringWrap: { width: RING, height: RING },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fonts.mono, fontSize: 28, fontWeight: '700', color: colors.text },
  max: { fontFamily: fonts.mono, fontSize: 11, color: colors.textSub, marginTop: -2 },
  buttons: { flexDirection: 'row', gap: 12 },
  btn: { width: 44, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  minus: { backgroundColor: colors.primarySoft },
  plus: { backgroundColor: colors.primary },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  help: { fontSize: 12, lineHeight: 17, color: colors.textSub },
});
