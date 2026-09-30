import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, IconButton } from '../components/ui';
import { colors } from '../theme';

type DocKey = 'terms' | 'privacy' | 'community';

/** 정책 문서 초안. 서비스 출시 전에 법률 검토를 거쳐 실제 문구로 바꿔야 한다. */
const DOCS: Record<DocKey, { title: string; sections: { h: string; p: string }[] }> = {
  terms: {
    title: '이용약관',
    sections: [
      { h: '제1조 (목적)', p: '이 약관은 뜨개로그(이하 "서비스")를 이용하는 데 필요한 회원과 서비스 사이의 권리·의무와 책임을 정합니다.' },
      { h: '제2조 (계정)', p: '회원은 아이디와 비밀번호로 계정을 만들며, 계정 정보를 안전하게 관리할 책임은 회원에게 있습니다. 타인을 사칭하거나 타인의 계정을 사용해서는 안 됩니다.' },
      { h: '제3조 (게시물)', p: '회원이 작성한 기록·게시글·댓글의 권리는 회원에게 있습니다. 회원은 서비스 안에서 이를 표시·공유하는 데 필요한 범위에서 서비스가 이용하는 것에 동의합니다.' },
      { h: '제4조 (이용 제한)', p: '커뮤니티 가이드를 위반한 게시물은 숨김·삭제될 수 있으며, 반복되거나 심각한 위반은 계정 이용이 제한될 수 있습니다.' },
      { h: '제5조 (탈퇴)', p: '회원은 언제든 탈퇴할 수 있으며, 탈퇴 시 관련 법령에 따라 보관해야 하는 정보를 제외한 데이터는 삭제됩니다.' },
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    sections: [
      { h: '수집하는 정보', p: '아이디, 닉네임, 비밀번호(암호화 저장), 한 줄 소개, 사용자가 올린 사진·기록·게시글, 친구 관계 정보.' },
      { h: '이용 목적', p: '회원 식별과 로그인, 뜨개 기록 저장과 공유, 친구·프로젝트 초대, 신고 처리와 서비스 안전 유지.' },
      { h: '공개 범위', p: '프로필을 비공개로 하면 다른 사용자가 프로필에서 내 기록을 볼 수 없습니다. 함께 하는 프로젝트의 공유 기록 탭과 피드 게시글은 각각의 공개 범위를 따릅니다.' },
      { h: '보관 기간', p: '회원 탈퇴 시까지 보관하며, 관련 법령이 정한 경우에는 해당 기간 동안 보관합니다.' },
      { h: '문의', p: '개인정보 관련 문의는 앱 내 문의 창구로 보내 주세요.' },
    ],
  },
  community: {
    title: '커뮤니티 가이드',
    sections: [
      { h: '서로 존중해요', p: '욕설, 비하, 괴롭힘, 혐오 표현은 허용되지 않습니다. 실력과 속도는 사람마다 달라요.' },
      { h: '내 작품만 올려요', p: '다른 사람의 사진이나 도안을 허락 없이 올리지 마세요. 도안 출처는 밝혀 주세요.' },
      { h: '광고·스팸 금지', p: '허가되지 않은 판매 홍보, 반복 게시, 외부 링크 유도는 삭제될 수 있습니다.' },
      { h: '신고와 차단', p: '불편한 사용자는 프로필이나 게시글 메뉴에서 신고하거나 차단할 수 있어요. 차단하면 서로의 프로필·게시글·기록이 보이지 않고 친구 관계와 초대가 끊어집니다. 접수된 신고는 운영 정책에 따라 검토합니다.' },
    ],
  },
};

export default function PolicyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: DocKey }>();
  const [doc, setDoc] = useState<DocKey>(params.doc && params.doc in DOCS ? params.doc : 'terms');
  const current = DOCS[doc];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" size={26} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>약관 및 정책</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.chips}>
          {(Object.keys(DOCS) as DocKey[]).map((k) => (
            <Chip key={k} label={DOCS[k].title} active={doc === k} onPress={() => setDoc(k)} />
          ))}
        </View>
        <Text style={styles.draft}>초안 문서예요. 서비스 출시 전에 법률 검토를 거쳐 확정해야 해요.</Text>
        <Text style={styles.title}>{current.title}</Text>
        {current.sections.map((s) => (
          <View key={s.h} style={{ marginBottom: 18 }}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 14 },
  draft: {
    fontSize: 12,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 18,
    overflow: 'hidden',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  h: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  p: { fontSize: 14, lineHeight: 22, color: colors.text },
});
