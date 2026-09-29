import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, statusStyles } from '../theme';
import { ProjectStatus, User } from '../types';

export function Avatar({
  user,
  size = 28,
  ring,
  style,
}: {
  user?: User;
  size?: number;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: user?.color ?? colors.textMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring && { borderWidth: 2, borderColor: colors.surface },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{user?.name.slice(0, 1) ?? '?'}</Text>
    </View>
  );
}

export function AvatarStack({ users, size = 26 }: { users: (User | undefined)[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {users.map((u, i) => (
        <Avatar key={u?.id ?? i} user={u} size={size} ring style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }} />
      ))}
    </View>
  );
}

export function StatusBadge({ status, onPress }: { status: ProjectStatus; onPress?: () => void }) {
  const s = statusStyles[status];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      style={[styles.badge, { backgroundColor: s.bg }]}
    >
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
      {onPress && <Ionicons name="chevron-down" size={12} color={s.fg} style={{ marginLeft: 2 }} />}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  badge,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      {!!badge && (
        <View style={[styles.chipBadge, active && { backgroundColor: '#fff' }]}>
          <Text style={[styles.chipBadgeText, active && { color: colors.primary }]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const thumbTints = ['#E9D5C6', '#D9CFC3', '#E4D9CB', '#D6C4B4', '#E8DCD0'];

/** 사진이 있으면 사진을, 없으면 뜨개 아이콘 자리표시자를 보여준다 */
export function Thumb({
  uri,
  seed = '',
  size = 88,
  label,
  style,
}: {
  uri?: string;
  seed?: string;
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = thumbTints[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % thumbTints.length];
  return (
    <View style={[{ width: size, height: size, borderRadius: 14, overflow: 'hidden', backgroundColor: tint }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: size * 0.36 }}>🧶</Text>
        </View>
      )}
      {label && (
        <View style={styles.thumbLabel}>
          <Text style={styles.thumbLabelText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'soft' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        v.box,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 15 : 18} color={v.text.color} style={{ marginRight: 4 }} />}
      <Text style={[styles.buttonText, small && { fontSize: 13 }, v.text]}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<string, { box: ViewStyle; text: TextStyle & { color: string } }> = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: '#fff' } },
  outline: {
    box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
    text: { color: colors.text },
  },
  soft: { box: { backgroundColor: colors.primarySoft }, text: { color: colors.primary } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.textSub } },
};

export function IconButton({
  name,
  onPress,
  color = colors.text,
  size = 22,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.5 }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

/** 하단에서 올라오는 시트 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.grabber} />
          {title && <Text style={styles.sheetTitle}>{title}</Text>}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function EmptyState({ emoji, title, desc }: { emoji: string; title: string; desc?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 6 }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{title}</Text>
      {desc && <Text style={{ fontSize: 13, color: colors.textSub, textAlign: 'center' }}>{desc}</Text>}
    </View>
  );
}

export const monoText: TextStyle = { fontFamily: fonts.mono, fontSize: 13, color: colors.textSub };

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: fonts.mono },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.segmentBg,
    borderRadius: 14,
    padding: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.textSub },
  segmentTextOn: { color: colors.text, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSub },
  chipTextOn: { color: '#fff', fontWeight: '700' },
  chipBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  thumbLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(196, 112, 74, 0.85)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbLabelText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  buttonSmall: { paddingHorizontal: 12, paddingVertical: 7 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: 8 },
});
