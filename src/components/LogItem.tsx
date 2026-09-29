import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts } from '../theme';
import { KnitLog } from '../types';
import { clockTime, duration, relative, shortDate } from '../utils/format';
import { Avatar, IconButton, Thumb } from './ui';
import { showAlert } from '../utils/alert';

export const EMOJIS = ['❤️', '👏', '🧶', '✨', '🔥', '😍'];

export function LogItem({ log, isLast, onEdit }: { log: KnitLog; isLast: boolean; onEdit: () => void }) {
  const { state, actions } = useStore();
  const me = state.users[state.meId];
  const mine = log.authorId === state.meId;
  const [showComments, setShowComments] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState('');
  const [zoom, setZoom] = useState(false);

  const openMenu = () =>
    showAlert('기록', undefined, [
      { text: '수정', onPress: onEdit },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          showAlert('기록 삭제', '이 기록을 삭제할까요? 되돌릴 수 없어요.', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => actions.deleteLog(log.id) },
          ]),
      },
      { text: '닫기', style: 'cancel' },
    ]);

  const submitComment = () => {
    const text = draft.trim();
    if (!text) return;
    actions.addComment(log.id, text);
    setDraft('');
    setShowComments(true);
  };

  const react = (emoji: string) => {
    actions.toggleReaction(log.id, emoji);
    setShowPicker(false);
  };

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Pressable onPress={() => log.photoUri && setZoom(true)}>
          <Thumb uri={log.photoUri} seed={log.id} size={88} />
        </Pressable>
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={styles.body}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{shortDate(log.startedAt)}</Text>
            <Text style={styles.meta}>
              {clockTime(log.startedAt)} · {duration(log.durationSec)}
            </Text>
          </View>
          <IconButton name="happy-outline" size={20} color={colors.primary} onPress={() => setShowPicker((v) => !v)} />
          <Pressable style={styles.commentBtn} onPress={() => setShowComments((v) => !v)} hitSlop={6}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            {log.comments.length > 0 && <Text style={styles.commentCount}>{log.comments.length}</Text>}
          </Pressable>
          {mine && <IconButton name="ellipsis-horizontal" size={18} color={colors.textSub} onPress={openMenu} />}
        </View>

        {showPicker && (
          <View style={styles.picker}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => react(e)} style={styles.pickerItem} hitSlop={4}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {log.reactions.length > 0 && (
          <View style={styles.reactions}>
            {log.reactions.map((r) => {
              const on = r.userIds.includes(state.meId);
              return (
                <Pressable
                  key={r.emoji}
                  onPress={() => actions.toggleReaction(log.id, r.emoji)}
                  onLongPress={() =>
                    showAlert(r.emoji, r.userIds.map((id) => state.users[id]?.name ?? '알 수 없음').join(', '))
                  }
                  style={[styles.reaction, on && styles.reactionOn]}
                >
                  <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
                  <Text style={[styles.reactionCount, on && { color: colors.primary }]}>{r.userIds.length}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!!log.text && <Text style={styles.text}>{log.text}</Text>}

        {log.comments.length > 0 && !showComments && (
          <Pressable onPress={() => setShowComments(true)} hitSlop={6}>
            <Text style={styles.more}>댓글 {log.comments.length}개 보기</Text>
          </Pressable>
        )}

        {showComments && (
          <View style={styles.comments}>
            {log.comments.map((c) => {
              const author = state.users[c.authorId];
              return (
                <Pressable
                  key={c.id}
                  style={styles.comment}
                  onLongPress={() =>
                    c.authorId === state.meId &&
                    showAlert('댓글 삭제', '이 댓글을 삭제할까요?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => actions.deleteComment(log.id, c.id) },
                    ])
                  }
                >
                  <Avatar user={author} size={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentText}>
                      <Text style={{ fontWeight: '700' }}>{author?.name} </Text>
                      {c.text}
                    </Text>
                    <Text style={styles.commentTime}>{relative(c.createdAt)}</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.inputRow}>
              <Avatar user={me} size={22} />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="댓글 달기..."
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <IconButton name="send-outline" size={18} color={draft.trim() ? colors.primary : colors.textMuted} onPress={submitComment} />
            </View>
          </View>
        )}
      </View>

      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={styles.zoomBg} onPress={() => setZoom(false)}>
          {log.photoUri && <Image source={{ uri: log.photoUri }} style={styles.zoomImg} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16 },
  left: { alignItems: 'center' },
  line: { flex: 1, width: 1, backgroundColor: colors.primaryMuted, marginTop: 4, minHeight: 20 },
  body: { flex: 1, paddingBottom: 28 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  date: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '700', color: colors.primary },
  meta: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSub, marginTop: 2 },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 4 },
  commentCount: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  picker: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pickerItem: { paddingHorizontal: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionOn: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
  reactionCount: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  text: { fontSize: 15, lineHeight: 23, color: colors.text },
  more: { marginTop: 10, fontSize: 13, fontWeight: '700', color: colors.primaryMuted },
  comments: { marginTop: 10, gap: 10 },
  comment: { flexDirection: 'row', gap: 8 },
  commentText: { fontSize: 14, lineHeight: 20, color: colors.text },
  commentTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  zoomBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  zoomImg: { width: '100%', height: '80%' },
});
