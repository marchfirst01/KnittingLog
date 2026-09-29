export type ProjectStatus = 'active' | 'ready' | 'done';
export type ProjectType = 'solo' | 'group';

export interface User {
  id: string;
  name: string;
  handle: string;
  bio: string;
  color: string;
}

export interface Recruit {
  /** 모집 중인 공개 프로젝트인지 */
  isOpen: boolean;
  maxMembers: number;
  description: string;
  /** 참여 신청한 유저 id 목록 */
  applicantIds: string[];
}

export interface Project {
  id: string;
  title: string;
  yarn: string;
  needle: string;
  status: ProjectStatus;
  type: ProjectType;
  ownerId: string;
  memberIds: string[];
  coverUri?: string;
  recruit?: Recruit;
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
  rows?: number;
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

export interface AppState {
  meId: string;
  users: Record<string, User>;
  friendIds: string[];
  /** 나에게 온 친구 요청 */
  incomingRequestIds: string[];
  /** 내가 보낸 친구 요청 */
  outgoingRequestIds: string[];
  projects: Project[];
  logs: KnitLog[];
  timers: Record<string, TimerState>;
}
