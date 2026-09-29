import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LogInput } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { KnitLog } from '../types';
import { clockTime, duration, fullDate, parseDateTime, toDateInput, toTimeInput } from '../utils/format';
import { Button, Sheet } from './ui';
import { showAlert } from '../utils/alert';

export type EditorMode =
  | { kind: 'timer'; startedAt: number; durationSec: number }
  | { kind: 'manual' }
  | { kind: 'edit'; log: KnitLog };

const MAX_TEXT = 150;

/**
 * 뜨개 기록 작성 팝업.
 * - timer: 타이머 종료 후. 날짜·시간·소요 시간은 자동으로 채워진다.
 * - manual: 수동 추가. 날짜·시간·소요 시간을 직접 입력한다.
 * - edit: 기존 기록 수정.
 */
export function LogEditor({
  mode,
  onClose,
  onSave,
  onSkip,
}: {
  mode: EditorMode;
  onClose: () => void;
  onSave: (input: LogInput) => void;
  /** timer 모드에서 '기록 안 함' */
  onSkip?: () => void;
}) {
  // 열릴 때마다 새로 마운트되므로(부모에서 key 지정) 초기값을 props에서 바로 계산한다
  const [start] = useState(() =>
    mode.kind === 'edit'
      ? new Date(mode.log.startedAt)
      : mode.kind === 'timer'
        ? new Date(mode.startedAt)
        : new Date(Date.now() - 3600 * 1000),
  );
  const [text, setText] = useState(mode.kind === 'edit' ? mode.log.text : '');
  const [photoUri, setPhotoUri] = useState(mode.kind === 'edit' ? mode.log.photoUri : undefined);
  const [date, setDate] = useState(toDateInput(start));
  const [time, setTime] = useState(toTimeInput(start));
  const [minutes, setMinutes] = useState(mode.kind === 'edit' ? String(Math.round(mode.log.durationSec / 60)) : '60');

  const pickPhoto = async (source: 'library' | 'camera') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('권한 필요', source === 'camera' ? '카메라 권한을 허용해 주세요.' : '사진 접근 권한을 허용해 주세요.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const choosePhoto = () =>
    showAlert('사진 추가', undefined, [
      { text: '앨범에서 선택', onPress: () => pickPhoto('library') },
      { text: '사진 찍기', onPress: () => pickPhoto('camera') },
      { text: '취소', style: 'cancel' },
    ]);

  const save = () => {
    let startedAt: string;
    let durationSec: number;
    if (mode.kind === 'timer') {
      startedAt = new Date(mode.startedAt).toISOString();
      durationSec = mode.durationSec;
    } else {
      const d = parseDateTime(date, time);
      if (!d) {
        showAlert('날짜/시간 확인', '날짜는 2026-09-15, 시간은 21:00 형식으로 입력해 주세요.');
        return;
      }
      const m = Number(minutes);
      if (!Number.isFinite(m) || m < 0) {
        showAlert('소요 시간 확인', '뜬 시간을 분 단위 숫자로 입력해 주세요.');
        return;
      }
      startedAt = d.toISOString();
      durationSec = Math.round(m * 60);
    }
    if (!text.trim() && !photoUri) {
      showAlert('내용을 입력해 주세요', '글이나 사진 중 하나는 남겨야 해요.');
      return;
    }
    onSave({
      startedAt,
      durationSec,
      text: text.trim(),
      photoUri,
    });
  };

  const title = mode.kind === 'timer' ? '오늘의 뜨개를 기록할까요?' : mode.kind === 'edit' ? '기록 수정' : '기록 추가';

  return (
    <Sheet visible onClose={onClose} title={title}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode.kind === 'timer' ? (
          <View style={styles.autoInfo}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.autoText}>
              {fullDate(new Date(mode.startedAt).toISOString())} {clockTime(new Date(mode.startedAt).toISOString())} ·{' '}
              {duration(mode.durationSec)}
            </Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Field label="날짜" value={date} onChangeText={setDate} placeholder="2026-09-15" flex={1.4} />
            <Field label="시작 시각" value={time} onChangeText={setTime} placeholder="21:00" flex={1} />
            <Field label="뜬 시간(분)" value={minutes} onChangeText={setMinutes} placeholder="60" numeric flex={1} />
          </View>
        )}

        <Text style={styles.label}>오늘의 기록</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="오늘 뜬 내용을 2~3줄로 남겨 보세요"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_TEXT}
          style={styles.textarea}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>
          {text.length}/{MAX_TEXT}
        </Text>

        <Text style={styles.label}>사진 (1장)</Text>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Pressable style={styles.photoRemove} onPress={() => setPhotoUri(undefined)} hitSlop={8}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoAdd} onPress={choosePhoto}>
            <Ionicons name="camera-outline" size={26} color={colors.textSub} />
            <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>사진 추가</Text>
          </Pressable>
        )}

        <View style={[styles.row, { marginTop: 22 }]}>
          {mode.kind === 'timer' ? (
            <Button title="기록 안 함" variant="outline" onPress={onSkip} style={{ flex: 1 }} />
          ) : (
            <Button title="취소" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          )}
          <Button title="저장" onPress={save} style={{ flex: 1.4 }} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

function Field({
  label,
  flex,
  numeric,
  ...props
}: {
  label: string;
  flex: number;
  numeric?: boolean;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        keyboardType={numeric ? 'number-pad' : 'numbers-and-punctuation'}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  autoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  autoText: { fontFamily: fonts.mono, fontSize: 13, color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.mono,
  },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    minHeight: 88,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  photoAdd: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  photoWrap: { width: 96, height: 96 },
  photo: { width: 96, height: 96, borderRadius: 14 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
