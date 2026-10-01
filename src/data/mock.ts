import { Account, Counter, KnitLog, Membership, Post, RawState } from '../types';

const t = (s: string) => new Date(s).toISOString();

const users: RawState['users'] = {
  me: { id: 'me', name: '세은', handle: 'seeun_knits', bio: '뜨개 3년차 🧶 메리노 덕후', color: '#C4704A', visibility: 'public' },
  sungyu: { id: 'sungyu', name: '선규', handle: 'sungyu_kr', bio: '가끔 뜨개, 자주 커피', color: '#4A7BC4', visibility: 'friends' },
  jiyeon: { id: 'jiyeon', name: '지연', handle: 'jiyeon_wool', bio: '울 실 컬렉터 | 대바늘 전문', color: '#7A9A72', visibility: 'public' },
  minji: { id: 'minji', name: '민지', handle: 'minji.knit', bio: '코바늘로 시작해 대바늘로 정착', color: '#9A7AB8', visibility: 'public' },
  haneul: { id: 'haneul', name: '하늘', handle: 'sky_yarn', bio: '양말만 30켤레 뜬 사람', color: '#4E9C9A', visibility: 'public' },
  doyun: { id: 'doyun', name: '도윤', handle: 'doyun_stitch', bio: '퇴근 후 한 시간 뜨개', color: '#C49A3A', visibility: 'private' },
  sua: { id: 'sua', name: '수아', handle: 'sua_loop', bio: '아란 무늬 좋아해요', color: '#C45A7A', visibility: 'private' },
};

const log = (l: Omit<KnitLog, 'reactions' | 'comments'> & Partial<KnitLog>): KnitLog => ({
  reactions: [],
  comments: [],
  ...l,
});

/** 로그인 아이디(변경 불가)와 비밀번호 해시. 계정 ID(handle)와는 별개 */
const LOGINS: Record<string, { username: string; hash: string }> = {
  me: { username: 'seeun', hash: 'f082002b7ebf2b1612c605da398ec7f902a67f36cfebdc1bee528c8c9b99eb98' },
  sungyu: { username: 'sungyu', hash: '63887f4bb307324eb94e22d355860eed89dc8db2dea819f79d81bdcc83e13662' },
  jiyeon: { username: 'jiyeon', hash: '03da2ac6f4a58feae153a9afc56263ef5a9167ba25ba4f2958e87970dbc8e078' },
  minji: { username: 'minji', hash: '869799fb566db4c26c6e2783ae0b341c78a433339323e016ebbef0e4a764386d' },
  haneul: { username: 'haneul', hash: 'fee505d6c170bc354619eb9c92b0f82faef8eb3d4b0ca2d3df7e581d20ae4596' },
  doyun: { username: 'doyun', hash: 'e6440d31a091c4d89fbc7a6ff42674633cb3b6139dbbfe108fa935e6ceeb6e8d' },
  sua: { username: 'sua', hash: 'f863dd282116114504b74f5ba5f5652df3d001cfa264e193d047d33265487e3a' },
};

/** 데모 계정: 모든 계정의 비밀번호는 1234 */
export const DEMO_PASSWORD = '1234';

const accounts: Account[] = Object.values(users).map((u) => ({
  userId: u.id,
  username: LOGINS[u.id].username,
  passwordHash: LOGINS[u.id].hash,
}));

let counterSeq = 0;
export const makeCounter = (label: string, max: number, value = 0, updatedAt = new Date().toISOString()): Counter => ({
  id: `c${Date.now().toString(36)}${(counterSeq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  label,
  value,
  max,
  visible: true,
  updatedAt,
});

export const defaultCounters = (): Counter[] => [makeCounter('단수 카운터 1', 40), makeCounter('단수 카운터 2', 20)];

const member = (
  m: Pick<Membership, 'projectId' | 'userId' | 'status' | 'startedAt' | 'yarn' | 'needle'> & Partial<Membership>,
): Membership => ({
  counters: defaultCounters(),
  joinedAt: m.startedAt,
  ...m,
});

const post = (p: Omit<Post, 'likeIds' | 'comments'> & Partial<Post>): Post => ({ likeIds: [], comments: [], ...p });

export function createInitialState(): RawState {
  return {
    session: null,
    users,
    accounts,
    friendships: [
      ['me', 'sungyu'],
      ['me', 'jiyeon'],
      ['sungyu', 'jiyeon'],
      ['jiyeon', 'haneul'],
    ],
    friendRequests: [
      { from: 'minji', to: 'me' },
      { from: 'haneul', to: 'me' },
      { from: 'me', to: 'sua' },
    ],
    invites: [
      { id: 'i1', projectId: 'p9', from: 'jiyeon', to: 'me', createdAt: t('2026-09-27T20:00:00') },
      { id: 'i2', projectId: 'p9', from: 'jiyeon', to: 'sungyu', createdAt: t('2026-09-27T20:00:00') },
    ],
    timers: {},
    reports: [],
    blocks: [],
    projects: [
      { id: 'p1', title: '후드 가디건', ownerId: 'me', createdAt: t('2026-09-01T10:00:00') },
      { id: 'p2', title: '베레모 for 겨울', ownerId: 'me', createdAt: t('2026-09-05T10:00:00') },
      { id: 'p3', title: '크림 숄 가디건', ownerId: 'me', createdAt: t('2026-09-20T10:00:00') },
      { id: 'p4', title: '줄무늬 머플러', ownerId: 'sungyu', createdAt: t('2026-07-01T10:00:00') },
      { id: 'p9', title: '크리스마스 장갑', ownerId: 'jiyeon', createdAt: t('2026-09-26T10:00:00') },
    ],
    memberships: [
      member({
        projectId: 'p1',
        userId: 'me',
        status: 'active',
        startedAt: t('2026-09-10T10:00:00'),
        yarn: '메리노울 아이보리 400g',
        needle: '5.0mm 대바늘',
        counters: [
          makeCounter('몸판', 80, 62, t('2026-09-15T22:10:00')),
          makeCounter('무늬 반복', 8, 3, t('2026-09-15T22:05:00')),
        ],
      }),
      member({
        projectId: 'p1',
        userId: 'sungyu',
        status: 'active',
        startedAt: t('2026-09-12T10:00:00'),
        yarn: '메리노울 차콜 420g',
        needle: '4.5mm 대바늘',
      }),
      member({
        projectId: 'p1',
        userId: 'jiyeon',
        status: 'done',
        startedAt: t('2026-09-11T10:00:00'),
        endedAt: t('2026-09-25T21:00:00'),
        yarn: '램스울 오트밀 400g',
        needle: '5.0mm 대바늘',
      }),
      member({
        projectId: 'p2',
        userId: 'me',
        status: 'active',
        startedAt: t('2026-09-13T10:00:00'),
        yarn: '알파카 혼방 그레이 150g',
        needle: '4.0mm 줄바늘',
        counters: [makeCounter('고무단', 30, 12, t('2026-09-13T10:40:00'))],
      }),
      member({
        projectId: 'p3',
        userId: 'me',
        status: 'paused',
        startedAt: t('2026-09-20T10:00:00'),
        yarn: '캐시미어 크림 550g',
        needle: '4.5mm 대바늘',
      }),
      member({
        projectId: 'p4',
        userId: 'sungyu',
        status: 'done',
        startedAt: t('2026-07-01T10:00:00'),
        endedAt: t('2026-08-18T22:00:00'),
        yarn: '울 믹스 네이비/화이트',
        needle: '6.0mm 대바늘',
      }),
      member({
        projectId: 'p4',
        userId: 'me',
        status: 'done',
        startedAt: t('2026-07-02T10:00:00'),
        endedAt: t('2026-08-20T21:00:00'),
        yarn: '울 믹스 버건디/크림',
        needle: '6.0mm 대바늘',
      }),
      member({
        projectId: 'p9',
        userId: 'jiyeon',
        status: 'active',
        startedAt: t('2026-09-26T10:00:00'),
        yarn: '셰틀랜드 울 레드/화이트',
        needle: '3.0mm 장갑바늘',
      }),
      member({
        projectId: 'p9',
        userId: 'haneul',
        status: 'active',
        startedAt: t('2026-09-27T10:00:00'),
        yarn: '셰틀랜드 울 그린/화이트',
        needle: '3.0mm 장갑바늘',
      }),
    ],
    posts: [
      post({
        id: 'post1',
        authorId: 'jiyeon',
        text: '후드 가디건 드디어 완성했어요! 오트밀 색이 가을이랑 너무 잘 어울려요 🍂',
        projectTitle: '후드 가디건',
        likeIds: ['me', 'sungyu', 'minji'],
        comments: [{ id: 'pc1', authorId: 'me', text: '너무 예쁘다 ㅠㅠ 나도 얼른 끝내야지', createdAt: t('2026-09-25T22:10:00') }],
        createdAt: t('2026-09-25T21:30:00'),
      }),
      post({
        id: 'post2',
        authorId: 'minji',
        text: '모헤어 라글란 스웨터 게이지 스와치 떴어요. 실크 섞인 모헤어는 처음인데 폭신폭신',
        likeIds: ['haneul'],
        createdAt: t('2026-09-28T19:00:00'),
      }),
      post({
        id: 'post3',
        authorId: 'me',
        text: '여름 내내 뜬 줄무늬 머플러 🧣 배색 실 정리하느라 고생했지만 뿌듯!',
        projectId: 'p4',
        projectTitle: '줄무늬 머플러',
        likeIds: ['sungyu', 'jiyeon'],
        comments: [{ id: 'pc2', authorId: 'sungyu', text: '같이 떠서 더 재밌었다', createdAt: t('2026-08-21T09:00:00') }],
        createdAt: t('2026-08-20T22:00:00'),
      }),
      post({
        id: 'post4',
        authorId: 'sua',
        text: '아란 조끼 케이블 무늬 차트 보면서 뜨는 중. 꽈배기 바늘 없이 뜨는 법 익혔어요',
        likeIds: [],
        createdAt: t('2026-09-29T13:00:00'),
      }),
    ],
    logs: [
      log({
        id: 'l1',
        projectId: 'p1',
        authorId: 'me',
        startedAt: t('2026-09-10T20:10:00'),
        durationSec: 2 * 3600,
        text: '뒤판 30단 완성. 텐션이 처음보다 훨씬 고르게 잡힌다. 오늘 2시간 뜬 것 같아',
        reactions: [{ emoji: '👏', userIds: ['jiyeon'] }],
      }),
      log({
        id: 'l2',
        projectId: 'p1',
        authorId: 'me',
        startedAt: t('2026-09-13T14:00:00'),
        durationSec: 5400,
        text: '오늘은 앞판 마무리. 넥라인 곡선이 생각보다 까다로웠지만 성공적 ✓',
        reactions: [
          { emoji: '❤️', userIds: ['sungyu', 'jiyeon', 'minji'] },
          { emoji: '👏', userIds: ['sungyu'] },
        ],
        comments: [{ id: 'c1', authorId: 'sungyu', text: '넥라인 줍는 법 나중에 알려줘요!', createdAt: t('2026-09-13T18:20:00') }],
      }),
      log({
        id: 'l3',
        projectId: 'p1',
        authorId: 'me',
        startedAt: t('2026-09-15T21:00:00'),
        durationSec: 4200,
        text: '드디어 소매 연결 완료! 어깨 부분이 생각보다 자연스럽게 이어졌다. 남은 건 후드 달기',
        reactions: [
          { emoji: '🧶', userIds: ['jiyeon', 'sungyu'] },
          { emoji: '✨', userIds: ['jiyeon'] },
        ],
        comments: [
          { id: 'c2', authorId: 'jiyeon', text: '와 속도 엄청 빠르다 👀', createdAt: t('2026-09-15T22:40:00') },
          { id: 'c3', authorId: 'sungyu', text: '나는 아직 뒤판인데…', createdAt: t('2026-09-16T08:10:00') },
        ],
      }),
      log({
        id: 'l4',
        projectId: 'p1',
        authorId: 'sungyu',
        startedAt: t('2026-09-12T22:00:00'),
        durationSec: 3000,
        text: '고무단 끝내고 몸판 시작. 게이지가 살짝 커서 바늘 한 호수 내렸어요.',
        reactions: [{ emoji: '❤️', userIds: ['jiyeon'] }],
      }),
      log({
        id: 'l5',
        projectId: 'p1',
        authorId: 'sungyu',
        startedAt: t('2026-09-17T21:30:00'),
        durationSec: 3600,
        text: '뒤판 절반! 출퇴근 지하철에서 조금씩 뜨는 중',
      }),
      log({
        id: 'l6',
        projectId: 'p1',
        authorId: 'jiyeon',
        startedAt: t('2026-09-11T19:00:00'),
        durationSec: 7200,
        text: '실 색이 사진보다 따뜻한 톤이라 너무 마음에 들어요. 뒤판 40단까지.',
        reactions: [{ emoji: '😍', userIds: ['me'] }],
        comments: [{ id: 'c4', authorId: 'me', text: '색 진짜 예쁘다!', createdAt: t('2026-09-11T21:30:00') }],
      }),
      log({
        id: 'l7',
        projectId: 'p1',
        authorId: 'jiyeon',
        startedAt: t('2026-09-18T20:00:00'),
        durationSec: 5400,
        text: '앞판 두 장 다 떴어요. 이번 주말에 단추 사러 가야지 🛍',
      }),
      log({
        id: 'l8',
        projectId: 'p2',
        authorId: 'me',
        startedAt: t('2026-09-13T10:00:00'),
        durationSec: 2400,
        text: '베레모 고무단 시작. 알파카라 보들보들하다',
      }),
      log({
        id: 'l9',
        projectId: 'p4',
        authorId: 'me',
        startedAt: t('2026-08-20T20:00:00'),
        durationSec: 3600,
        text: '머플러 완성! 술 달고 스팀 블로킹까지 끝 🎉',
        reactions: [{ emoji: '🔥', userIds: ['sungyu'] }],
      }),
      log({
        id: 'l10',
        projectId: 'p4',
        authorId: 'sungyu',
        startedAt: t('2026-08-18T20:00:00'),
        durationSec: 4000,
        text: '줄무늬 배색 바꿀 때마다 실 정리하는 게 제일 힘들었다',
      }),
    ],
  };
}
