/** 개인별 프로젝트 상태: 진행중 / 보관(잠시 중단) / 종료(본인 기록 종료) */
export type MemberStatus = 'active' | 'paused' | 'done';

/** 프로필 공개 범위: 전체 공개 / 친구 공개 / 비공개 (함께 하는 프로젝트 안에서는 항상 보임) */
export type ProfileVisibility = 'public' | 'friends' | 'private';

export interface User {
  id: string;
  name: string;
  /** 계정 ID (@handle) — 친구 찾기·표시에 쓰고, 바꿀 수 있다 */
  handle: string;
  bio: string;
  color: string;
  visibility: ProfileVisibility;
}

export interface Account {
  userId: string;
  /** 로그인 아이디 — 가입 후 변경 불가, 다른 사람에게 보이지 않는다 */
  username: string;
  passwordHash: string;
}

/** 프로젝트 자체는 이름·대표 사진·방장만 가진다. 상태·실·기록은 멤버 개인 소유 */
export interface Project {
  id: string;
  title: string;
  ownerId: string;
  coverUri?: string;
  createdAt: string;
}

export interface Counter {
  id: string;
  label: string;
  value: number;
  /** 목표 단수 */
  max: number;
  /** 작업바에 표시 */
  visible: boolean;
  /** 마지막으로 값이 바뀐 시각 (ISO) */
  updatedAt: string;
}

/** 프로젝트에 대한 한 사람의 참여 정보 (개인 소유) */
export interface Membership {
  projectId: string;
  userId: string;
  status: MemberStatus;
  /** 작업 시작일 (ISO) */
  startedAt: string;
  /** 종료로 바꾼 날 (ISO) */
  endedAt?: string;
  yarn: string;
  needle: string;
  counters: Counter[];
  joinedAt: string;
}

export interface FriendRequest {
  from: string;
  to: string;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  from: string;
  to: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface KnitLog {
  id: string;
  projectId: string;
  authorId: string;
  /** 뜨개를 시작한 시각 (ISO) */
  startedAt: string;
  durationSec: number;
  text: string;
  photoUri?: string;
  reactions: Reaction[];
  comments: Comment[];
}

/** 커뮤니티 게시글 (작품 자랑) */
export interface Post {
  id: string;
  authorId: string;
  photoUri?: string;
  text: string;
  /** 연결한 내 프로젝트 (선택) */
  projectId?: string;
  projectTitle?: string;
  likeIds: string[];
  comments: Comment[];
  createdAt: string;
}

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'impersonation' | 'etc';

export interface Report {
  id: string;
  reporterId: string;
  targetUserId: string;
  targetPostId?: string;
  reason: ReportReason;
  detail: string;
  createdAt: string;
}

export interface Block {
  blocker: string;
  blocked: string;
}

export interface TimerState {
  /** 실행 중이면 마지막으로 시작한 시각(ms), 멈춰 있으면 null */
  runningSince: number | null;
  accumulatedMs: number;
  /** 첫 시작 시각(ms) — 기록의 시작 시각으로 사용 */
  firstStartedAt: number | null;
}

/** 저장되는 원본 상태 (기기 안의 모든 계정 데이터) */
export interface RawState {
  /** 로그인한 유저 id */
  session: string | null;
  users: Record<string, User>;
  accounts: Account[];
  friendships: [string, string][];
  friendRequests: FriendRequest[];
  invites: ProjectInvite[];
  projects: Project[];
  memberships: Membership[];
  logs: KnitLog[];
  posts: Post[];
  reports: Report[];
  blocks: Block[];
  /** userId → projectId → 타이머 */
  timers: Record<string, Record<string, TimerState>>;
}

/** 화면에서 쓰는 상태: 로그인한 유저 기준으로 계산된 값이 붙는다 */
export interface AppState extends Omit<RawState, 'timers'> {
  meId: string;
  friendIds: string[];
  incomingRequestIds: string[];
  outgoingRequestIds: string[];
  /** 내가 받은 프로젝트 초대 */
  incomingInvites: ProjectInvite[];
  /** 내가 차단한 유저 */
  blockedIds: string[];
  /** 나를 차단했거나 내가 차단한 유저 (서로 안 보임) */
  hiddenIds: string[];
  /** 내 타이머 (projectId → 타이머) */
  timers: Record<string, TimerState>;
}
