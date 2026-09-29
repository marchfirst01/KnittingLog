export type ProjectStatus = 'active' | 'ready' | 'done';
export type ProjectType = 'solo' | 'group';
export type Visibility = 'public' | 'private';

export interface User {
  id: string;
  name: string;
  handle: string;
  bio: string;
  color: string;
}

export interface Account {
  userId: string;
  /** 로그인 아이디 (= handle) */
  username: string;
  passwordHash: string;
}

export interface Project {
  id: string;
  title: string;
  yarn: string;
  needle: string;
  status: ProjectStatus;
  /** 혼자 뜨기 / 함뜨 — 나중에 전환 가능 */
  type: ProjectType;
  ownerId: string;
  memberIds: string[];
  coverUri?: string;
  createdAt: string;
  /** 아래는 함뜨 설정. 혼자 뜨기일 때도 값은 유지돼서 다시 함뜨로 바꾸면 그대로 쓴다. */
  /** 공개: '모집 중'에 노출, 참여 신청 → 방장 수락 / 비공개: 참여 코드나 초대로만 참여 */
  visibility: Visibility;
  /** 참여 코드 (공개/비공개 모두 코드로 바로 참여 가능) */
  code: string;
  maxMembers: number;
  description: string;
  /** 공개방 참여 신청자 */
  applicantIds: string[];
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
  logs: KnitLog[];
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
  /** 내 타이머 (projectId → 타이머) */
  timers: Record<string, TimerState>;
}
