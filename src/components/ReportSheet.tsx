import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors } from '../theme';
import { ReportReason } from '../types';
import { showAlert } from '../utils/alert';
import { Button, Sheet } from './ui';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '스팸 · 광고' },
  { value: 'abuse', label: '욕설 · 비하 · 괴롭힘' },
  { value: 'inappropriate', label: '부적절한 사진이나 내용' },
  { value: 'impersonation', label: '사칭' },
  { value: 'etc', label: '기타' },
];

/** 유저(또는 게시글) 신고. 열릴 때마다 새로 마운트해서 쓴다. */
export function ReportSheet({ userId, postId, onClose }: { userId: string; postId?: string; onClose: () => void }) {
  const { state, actions } = useStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const name = state.users[userId]?.name ?? '사용자';

  const submit = () => {
    if (!reason) return;
    actions.report(userId, reason, detail.trim(), postId);
    if (alsoBlock) actions.block(userId);
    onClose();
    showAlert(
      '신고가 접수됐어요',
      alsoBlock ? `${name}님을 차단했어요. 서로의 프로필·게시글·기록이 보이지 않아요.` : '검토 후 운영 정책에 따라 조치할게요.',
    );
  };

  return (
    <Sheet visible onClose={onClose} title={postId ? '게시글 신고' : `${name}님 신고`}>
      {REPORT_REASONS.map((r) => {
        const on = reason === r.value;
        return (
          <Pressable key={r.value} style={styles.option} onPress={() => setReason(r.value)}>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.textMuted} />
            <Text style={styles.optionText}>{r.label}</Text>
          </Pressable>
        );
      })}
      <TextInput
        value={detail}
        onChangeText={setDetail}
        placeholder="자세한 내용 (선택)"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={300}
        style={styles.input}
      />
      <Pressable style={styles.option} onPress={() => setAlsoBlock((v) => !v)}>
        <Ionicons name={alsoBlock ? 'checkbox' : 'square-outline'} size={20} color={alsoBlock ? colors.primary : colors.textMuted} />
        <Text style={styles.optionText}>{name}님 차단하기</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button title="취소" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="신고하기" onPress={submit} disabled={!reason} style={{ flex: 1.3 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  optionText: { fontSize: 15, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    marginTop: 6,
  },
});
