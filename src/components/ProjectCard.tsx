import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../store/AppStore';
import { colors, fonts, shadow } from '../theme';
import { Project } from '../types';
import { lastActivity, shortDate } from '../utils/format';
import { AvatarStack, StatusBadge, Thumb, monoText } from './ui';

export function ProjectCard({ project }: { project: Project }) {
  const { state } = useStore();
  const last = lastActivity(project, state.logs);
  const latestPhoto = state.logs
    .filter((l) => l.projectId === project.id && l.photoUri)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.photoUri;

  return (
    <Pressable
      onPress={() => router.push(`/project/${project.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View>
        <Thumb uri={project.coverUri ?? latestPhoto} seed={project.id} size={92} />
        {project.type === 'group' && (
          <View style={styles.people}>
            <Ionicons name="people-outline" size={12} color="#fff" />
            <Text style={styles.peopleText}>{project.memberIds.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {project.title}
          </Text>
          <StatusBadge status={project.status} />
        </View>
        <Text style={monoText} numberOfLines={1}>
          {project.yarn}
        </Text>
        <View style={styles.footer}>
          <AvatarStack users={project.memberIds.map((id) => state.users[id])} size={24} />
          {!!last && <Text style={styles.date}>{shortDate(last)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  people: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  peopleText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontFamily: fonts.mono, fontSize: 13, color: colors.textSub },
});
