import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { Counter } from '../types';
import { showAlert } from '../utils/alert';
import { relative } from '../utils/format';

/** 단수 카운터 관리: 작업바 표시 여부, 순서, 삭제, 추가, 수정 */
export function CounterManager({ projectId, counters, onClose }: { projectId: string; counters: Counter[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { actions } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = counters.find((c) => c.id === editingId);
  const shown = counters.filter((c) => c.visible).length;

  const confirmDelete = (c: Counter, after?: () => void) =>
    showAlert(`${c.label} 삭제`, '이 카운터를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          actions.deleteCounter(projectId, c.id);
          after?.();
        },
      },
    ]);

  return (
    <Modal visible animationType="slide" onRequestClose={() => (editing ? setEditingId(null) : onClose())}>
      <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top + 8 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {editing ? (
          <CounterEditor
            key={editing.id}
            counter={editing}
            onBack={() => setEditingId(null)}
            onSave={(patch) => {
              actions.setCounter(projectId, editing.id, patch);
              setEditingId(null);
            }}
            onDelete={() => confirmDelete(editing, () => setEditingId(null))}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8} style={styles.headerSide}>
                <Text style={styles.headerAction}>확인</Text>
              </Pressable>
              <Text style={styles.headerTitle}>단수 카운터</Text>
              <View style={styles.headerSide} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
              <Text style={styles.summary}>
                {counters.length}개 중 {shown}개를 작업바에 표시
              </Text>
              {counters.map((c, i) => (
                <View key={c.id} style={styles.item}>
                  <Pressable
                    style={styles.iconCircle}
                    onPress={() => actions.setCounter(projectId, c.id, { visible: !c.visible })}
                    accessibilityLabel={c.visible ? '작업바에서 숨기기' : '작업바에 표시'}
                  >
                    <Ionicons name={c.visible ? 'eye-outline' : 'eye-off-outline'} size={22} color={c.visible ? colors.text : colors.textMuted} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, !c.visible && { color: colors.textMuted }]} numberOfLines={1}>
                      {c.label}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {c.max}단 중 {c.value}단 · {relative(c.updatedAt)}
                    </Text>
                  </View>
                  <IconCircle name="arrow-up" disabled={i === 0} onPress={() => actions.moveCounter(projectId, c.id, -1)} />
                  <IconCircle
                    name="arrow-down"
                    disabled={i === counters.length - 1}
                    onPress={() => actions.moveCounter(projectId, c.id, 1)}
                  />
                  <IconCircle name="trash-outline" color={colors.danger} onPress={() => confirmDelete(c)} bare />
                  <IconCircle name="pencil" onPress={() => setEditingId(c.id)} bare />
                </View>
              ))}
              <Pressable style={styles.add} onPress={() => setEditingId(actions.addCounter(projectId))}>
                <Ionicons name="add" size={20} color={colors.text} />
                <Text style={styles.addText}>단수 카운터 추가</Text>
              </Pressable>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function IconCircle({
  name,
  onPress,
  disabled,
  color = colors.text,
  bare,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  bare?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.smallCircle, bare && { backgroundColor: 'transparent' }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={name} size={19} color={disabled ? colors.borderStrong : color} />
    </Pressable>
  );
}

function CounterEditor({
  counter,
  onBack,
  onSave,
  onDelete,
}: {
  counter: Counter;
  onBack: () => void;
  onSave: (patch: Partial<Omit<Counter, 'id'>>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(counter.label);
  const [value, setValue] = useState(String(counter.value));
  const [max, setMax] = useState(String(counter.max));

  const save = () => {
    const v = Number(value);
    const m = Number(max);
    if (!Number.isInteger(v) || v < 0) return showAlert('현재 단 확인', '0 이상의 숫자를 입력해 주세요.');
    if (!Number.isInteger(m) || m < 1) return showAlert('목표 단수 확인', '1 이상의 숫자를 입력해 주세요.');
    onSave({ label: label.trim() || counter.label, value: v, max: m });
  };

  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={[styles.headerSide, { flexDirection: 'row', alignItems: 'center' }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textSub} />
          <Text style={styles.headerAction}>카운터</Text>
        </Pressable>
        <Text style={styles.headerTitle}>단수 카운터 수정</Text>
        <Pressable onPress={save} hitSlop={8} style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <Text style={styles.headerAction}>저장</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>제목</Text>
        <TextInput value={label} onChangeText={setLabel} maxLength={20} style={styles.input} placeholder="예: 몸판, 소매" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>현재 단</Text>
            <TextInput value={value} onChangeText={setValue} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>목표 단수</Text>
            <TextInput value={max} onChangeText={setMax} keyboardType="number-pad" style={styles.input} />
          </View>
        </View>
        <Text style={styles.help}>목표에 도달해도 계속 셀 수 있어요. 원은 가득 찬 채로 숫자만 올라가요.</Text>
        <Pressable style={styles.grayButton} onPress={() => setValue('0')}>
          <Text style={styles.grayButtonText}>초기화</Text>
        </Pressable>
        <Pressable style={styles.grayButton} onPress={onDelete}>
          <Text style={[styles.grayButtonText, { color: colors.danger }]}>삭제</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerSide: { width: 90 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 17, color: colors.textSub },
  summary: { fontSize: 14, color: colors.textSub, marginBottom: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.chipBg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.segmentBg, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 13, color: colors.textSub, marginTop: 2 },
  smallCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.segmentBg, alignItems: 'center', justifyContent: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 16,
    paddingVertical: 16,
  },
  addText: { fontSize: 16, fontWeight: '600', color: colors.text },
  label: { fontSize: 13, color: colors.textSub, marginBottom: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
    marginBottom: 10,
  },
  help: { fontSize: 12, color: colors.textSub, lineHeight: 17, marginBottom: 14 },
  grayButton: { backgroundColor: colors.segmentBg, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  grayButtonText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
