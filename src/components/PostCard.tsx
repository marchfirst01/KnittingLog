import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, shadow } from '../theme';
import { Post } from '../types';
import { showAlert } from '../utils/alert';
import { relative } from '../utils/format';
import { ReportSheet } from './ReportSheet';
import { ActionMenu, Avatar, IconButton, MenuItem } from './ui';

const tints = ['#E9D5C6', '#D9CFC3', '#E4D9CB', '#D6C4B4', '#E8DCD0'];

/** 커뮤니티 게시글 카드 (작품 자랑) */
export function PostCard({ post }: { post: Post }) {
  const { state, actions } = useStore();
  const author = state.users[post.authorId];
  const mine = post.authorId === state.meId;
  const liked = post.likeIds.includes(state.meId);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const tint = tints[[...post.id].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length];

  const openProfile = () => router.push(`/user/${post.authorId}`);

  const menuItems: MenuItem[] = mine
    ? [
        {
          label: '게시글 삭제',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            showAlert('게시글 삭제', '이 게시글을 삭제할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => actions.deletePost(post.id) },
            ]),
        },
      ]
    : [
        { label: '프로필 보기', icon: 'person-outline', onPress: openProfile },
        { label: '신고하기', icon: 'alert-circle-outline', destructive: true, onPress: () => setReporting(true) },
        {
          label: '차단하기',
          icon: 'ban-outline',
          destructive: true,
          onPress: () =>
            showAlert(`${author?.name}님 차단`, '차단하면 서로의 프로필·게시글·기록이 보이지 않고, 친구 관계도 끊어져요.', [
              { text: '취소', style: 'cancel' },
              { text: '차단', style: 'destructive', onPress: () => actions.block(post.authorId) },
            ]),
        },
      ];

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    actions.addPostComment(post.id, text);
    setDraft('');
    setShowComments(true);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Pressable onPress={openProfile} style={styles.author} hitSlop={4}>
          <Avatar user={author} size={34} />
          <View>
            <Text style={styles.name}>{author?.name}</Text>
            <Text style={styles.time}>{relative(post.createdAt)}</Text>
          </View>
        </Pressable>
        <IconButton name="ellipsis-horizontal" size={20} color={colors.textSub} onPress={() => setMenu(true)} />
      </View>

      <View style={[styles.photo, { backgroundColor: tint }]}>
        {post.photoUri ? (
          <Image source={{ uri: post.photoUri }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={{ fontSize: 64 }}>🧶</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.actions}>
          <Pressable onPress={() => actions.toggleLike(post.id)} style={styles.action} hitSlop={6} accessibilityLabel="좋아요">
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? '#E0475B' : colors.text} />
            <Text style={styles.count}>{post.likeIds.length}</Text>
          </Pressable>
          <Pressable onPress={() => setShowComments((v) => !v)} style={styles.action} hitSlop={6}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
            <Text style={styles.count}>{post.comments.length}</Text>
          </Pressable>
        </View>
        {!!post.projectTitle && (
          <View style={styles.projectTag}>
            <Text style={styles.projectTagText}>🧶 {post.projectTitle}</Text>
          </View>
        )}
        {!!post.text && (
          <Text style={styles.text}>
            <Text style={{ fontWeight: '700' }}>{author?.name} </Text>
            {post.text}
          </Text>
        )}
        {post.comments.length > 0 && !showComments && (
          <Pressable onPress={() => setShowComments(true)}>
            <Text style={styles.more}>댓글 {post.comments.length}개 보기</Text>
          </Pressable>
        )}
        {showComments && (
          <View style={{ gap: 8, marginTop: 8 }}>
            {post.comments
              .filter((c) => !state.hiddenIds.includes(c.authorId))
              .map((c) => (
                <Pressable
                  key={c.id}
                  onLongPress={() =>
                    c.authorId === state.meId &&
                    showAlert('댓글 삭제', '이 댓글을 삭제할까요?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => actions.deletePostComment(post.id, c.id) },
                    ])
                  }
                >
                  <Text style={styles.comment}>
                    <Text style={{ fontWeight: '700' }}>{state.users[c.authorId]?.name} </Text>
                    {c.text}
                  </Text>
                </Pressable>
              ))}
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="댓글 달기..."
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={submit}
              />
              <IconButton name="send-outline" size={18} color={draft.trim() ? colors.primary : colors.textMuted} onPress={submit} />
            </View>
          </View>
        )}
      </View>

      <ActionMenu visible={menu} onClose={() => setMenu(false)} items={menuItems} />
      {reporting && <ReportSheet userId={post.authorId} postId={post.id} onClose={() => setReporting(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  photo: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 6 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { fontSize: 14, fontWeight: '600', color: colors.text },
  projectTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  projectTagText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  text: { fontSize: 14, lineHeight: 21, color: colors.text },
  more: { fontSize: 13, color: colors.textSub, marginTop: 2 },
  comment: { fontSize: 13, lineHeight: 19, color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
});
