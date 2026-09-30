import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickImage } from '../../components/ProjectSheets';
import { Button, IconButton, SectionLabel } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { colors } from '../../theme';

const MAX_TEXT = 300;

export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useStore();
  const [photoUri, setPhotoUri] = useState<string>();
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState<string>();

  const myProjects = state.memberships
    .filter((m) => m.userId === state.meId)
    .map((m) => state.projects.find((p) => p.id === m.projectId))
    .filter((p) => !!p);

  const canPost = !!photoUri || !!text.trim();
  const submit = () => {
    if (!canPost) return;
    actions.createPost({ photoUri, text: text.trim(), projectId });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
        <IconButton name="close" onPress={() => router.back()} size={26} />
        <Text style={styles.headerTitle}>게시글 쓰기</Text>
        <Button small title="게시" onPress={submit} disabled={!canPost} />
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={async () => setPhotoUri((await pickImage()) ?? photoUri)} style={styles.photo}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
              <Pressable style={styles.remove} onPress={() => setPhotoUri(undefined)} hitSlop={8}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={36} color={colors.textSub} />
              <Text style={styles.photoText}>작품 사진을 올려 주세요</Text>
            </>
          )}
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="작품 이야기를 들려주세요"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_TEXT}
          style={styles.textarea}
        />
        <Text style={styles.counter}>
          {text.length}/{MAX_TEXT}
        </Text>

        {myProjects.length > 0 && (
          <>
            <SectionLabel>프로젝트 연결 (선택)</SectionLabel>
            <View style={styles.projects}>
              {myProjects.map((p) => {
                const on = projectId === p.id;
                return (
                  <Pressable key={p.id} onPress={() => setProjectId(on ? undefined : p.id)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && { color: colors.primary }]}>🧶 {p.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        <Text style={styles.help}>게시글은 피드에서 모든 사용자에게 보여요. 프로필 공개 설정과는 별개예요.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { padding: 20 },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoText: { color: colors.textSub, fontSize: 13, marginTop: 6 },
  remove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  projects: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  help: { fontSize: 12, lineHeight: 17, color: colors.textSub },
});
