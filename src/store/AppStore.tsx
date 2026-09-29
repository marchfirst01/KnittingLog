import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { createInitialState } from '../data/mock';
import {
  AppState,
  KnitLog,
  Project,
  ProjectStatus,
  ProjectType,
  RawState,
  TimerState,
  User,
  Visibility,
} from '../types';
import { uid } from '../utils/format';

const STORAGE_KEY = 'knittinglog/state/v2';

export type NewProjectInput = Pick<
  Project,
  'title' | 'yarn' | 'needle' | 'status' | 'type' | 'coverUri' | 'visibility' | 'maxMembers' | 'description'
> & {
  /** 초대를 보낼 친구 */
  inviteIds: string[];
};

export type GroupSettings = Partial<Pick<Project, 'type' | 'visibility' | 'maxMembers' | 'description'>>;

export type LogInput = Pick<KnitLog, 'startedAt' | 'durationSec' | 'text' | 'photoUri'>;

type Action =
  | { type: 'hydrate'; state: RawState }
  | { type: 'reset' }
  | { type: 'signup'; user: User; username: string; passwordHash: string }
  | { type: 'login'; userId: string }
  | { type: 'logout' }
  | { type: 'createProject'; project: Project; inviteIds: string[] }
  | { type: 'setProjectStatus'; projectId: string; status: ProjectStatus }
  | { type: 'updateGroupSettings'; projectId: string; settings: GroupSettings }
  | { type: 'apply'; projectId: string }
  | { type: 'cancelApply'; projectId: string }
  | { type: 'acceptApplicant'; projectId: string; userId: string }
  | { type: 'rejectApplicant'; projectId: string; userId: string }
  | { type: 'joinProject'; projectId: string }
  | { type: 'leaveProject'; projectId: string }
  | { type: 'invite'; projectId: string; userId: string }
  | { type: 'cancelInvite'; projectId: string; userId: string }
  | { type: 'acceptInvite'; inviteId: string }
  | { type: 'declineInvite'; inviteId: string }
  | { type: 'addLog'; projectId: string; input: LogInput }
  | { type: 'updateLog'; logId: string; input: LogInput }
  | { type: 'deleteLog'; logId: string }
  | { type: 'toggleReaction'; logId: string; emoji: string }
  | { type: 'addComment'; logId: string; text: string }
  | { type: 'deleteComment'; logId: string; commentId: string }
  | { type: 'timerStart'; projectId: string; now: number }
  | { type: 'timerPause'; projectId: string; now: number }
  | { type: 'timerReset'; projectId: string }
  | { type: 'updateBio'; bio: string }
  | { type: 'sendFriendRequest'; userId: string }
  | { type: 'cancelFriendRequest'; userId: string }
  | { type: 'acceptFriend'; userId: string }
  | { type: 'rejectFriend'; userId: string }
  | { type: 'removeFriend'; userId: string };

const without = (arr: string[], id: string) => arr.filter((x) => x !== id);
const withId = (arr: string[], id: string) => (arr.includes(id) ? arr : [...arr, id]);
const isPair = (p: [string, string], a: string, b: string) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

const emptyTimer: TimerState = { runningSince: null, accumulatedMs: 0, firstStartedAt: null };
const USER_COLORS = ['#C4704A', '#4A7BC4', '#7A9A72', '#9A7AB8', '#4E9C9A', '#C49A3A', '#C45A7A', '#6B8FA8'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeCode = (taken: Set<string>) => {
  for (;;) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!taken.has(code)) return code;
  }
};

export const hashPassword = (username: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `knittinglog:${username}:${password}`);

function mapProject(state: RawState, id: string, fn: (p: Project) => Project): RawState {
  return { ...state, projects: state.projects.map((p) => (p.id === id ? fn(p) : p)) };
}

function mapLog(state: RawState, id: string, fn: (l: KnitLog) => KnitLog): RawState {
  return { ...state, logs: state.logs.map((l) => (l.id === id ? fn(l) : l)) };
}

/** 프로젝트에 멤버를 추가하고, 그 사람에게 걸려 있던 신청·초대는 정리한다 */
function addMember(state: RawState, projectId: string, userId: string): RawState {
  const next = mapProject(state, projectId, (p) =>
    p.memberIds.length >= p.maxMembers && !p.memberIds.includes(userId)
      ? p
      : { ...p, memberIds: withId(p.memberIds, userId), applicantIds: without(p.applicantIds, userId) },
  );
  return { ...next, invites: next.invites.filter((i) => !(i.projectId === projectId && i.to === userId)) };
}

function setMyTimer(state: RawState, me: string, projectId: string, timer: TimerState | null): RawState {
  const mine = { ...(state.timers[me] ?? {}) };
  if (timer) mine[projectId] = timer;
  else delete mine[projectId];
  return { ...state, timers: { ...state.timers, [me]: mine } };
}

function reducer(state: RawState, action: Action): RawState {
  if (action.type === 'hydrate') return action.state;
  if (action.type === 'reset') return createInitialState();
  if (action.type === 'signup')
    return {
      ...state,
      session: action.user.id,
      users: { ...state.users, [action.user.id]: action.user },
      accounts: [...state.accounts, { userId: action.user.id, username: action.username, passwordHash: action.passwordHash }],
    };
  if (action.type === 'login') return { ...state, session: action.userId };

  const me = state.session;
  if (!me) return state;

  switch (action.type) {
    case 'logout':
      return { ...state, session: null };

    case 'createProject': {
      const invites = action.inviteIds.map((to) => ({
        id: uid(),
        projectId: action.project.id,
        from: me,
        to,
        createdAt: new Date().toISOString(),
      }));
      return { ...state, projects: [action.project, ...state.projects], invites: [...state.invites, ...invites] };
    }
    case 'setProjectStatus':
      return mapProject(state, action.projectId, (p) => ({ ...p, status: action.status }));
    case 'updateGroupSettings':
      return mapProject(state, action.projectId, (p) => {
        const next = { ...p, ...action.settings };
        next.maxMembers = Math.max(next.maxMembers, next.memberIds.length);
        // 비공개로 바꾸면 대기 중이던 공개 참여 신청은 정리
        if (next.visibility === 'private') next.applicantIds = [];
        return next;
      });

    case 'apply':
      return mapProject(state, action.projectId, (p) => ({ ...p, applicantIds: withId(p.applicantIds, me) }));
    case 'cancelApply':
      return mapProject(state, action.projectId, (p) => ({ ...p, applicantIds: without(p.applicantIds, me) }));
    case 'acceptApplicant':
      return addMember(state, action.projectId, action.userId);
    case 'rejectApplicant':
      return mapProject(state, action.projectId, (p) => ({ ...p, applicantIds: without(p.applicantIds, action.userId) }));
    case 'joinProject':
      return addMember(state, action.projectId, me);
    case 'leaveProject': {
      const next = mapProject(state, action.projectId, (p) => ({ ...p, memberIds: without(p.memberIds, me) }));
      return setMyTimer(next, me, action.projectId, null);
    }

    case 'invite':
      if (state.invites.some((i) => i.projectId === action.projectId && i.to === action.userId)) return state;
      return {
        ...state,
        invites: [
          ...state.invites,
          { id: uid(), projectId: action.projectId, from: me, to: action.userId, createdAt: new Date().toISOString() },
        ],
      };
    case 'cancelInvite':
      return {
        ...state,
        invites: state.invites.filter((i) => !(i.projectId === action.projectId && i.to === action.userId)),
      };
    case 'acceptInvite': {
      const inv = state.invites.find((i) => i.id === action.inviteId);
      return inv ? addMember(state, inv.projectId, me) : state;
    }
    case 'declineInvite':
      return { ...state, invites: state.invites.filter((i) => i.id !== action.inviteId) };

    case 'addLog': {
      const newLog: KnitLog = {
        id: uid(),
        projectId: action.projectId,
        authorId: me,
        reactions: [],
        comments: [],
        ...action.input,
      };
      // 기록이 생기면 '시작 전' 프로젝트는 자동으로 '작업 중'이 된다
      const next = mapProject(state, action.projectId, (p) => (p.status === 'ready' ? { ...p, status: 'active' } : p));
      return { ...next, logs: [...next.logs, newLog] };
    }
    case 'updateLog':
      return mapLog(state, action.logId, (l) => ({ ...l, ...action.input }));
    case 'deleteLog':
      return { ...state, logs: state.logs.filter((l) => l.id !== action.logId) };
    case 'toggleReaction':
      return mapLog(state, action.logId, (l) => {
        const existing = l.reactions.find((r) => r.emoji === action.emoji);
        const reactions = existing
          ? l.reactions.map((r) =>
              r.emoji === action.emoji
                ? { ...r, userIds: r.userIds.includes(me) ? without(r.userIds, me) : [...r.userIds, me] }
                : r,
            )
          : [...l.reactions, { emoji: action.emoji, userIds: [me] }];
        return { ...l, reactions: reactions.filter((r) => r.userIds.length > 0) };
      });
    case 'addComment':
      return mapLog(state, action.logId, (l) => ({
        ...l,
        comments: [...l.comments, { id: uid(), authorId: me, text: action.text, createdAt: new Date().toISOString() }],
      }));
    case 'deleteComment':
      return mapLog(state, action.logId, (l) => ({ ...l, comments: l.comments.filter((c) => c.id !== action.commentId) }));

    case 'timerStart': {
      const cur = state.timers[me]?.[action.projectId] ?? emptyTimer;
      if (cur.runningSince) return state;
      return setMyTimer(state, me, action.projectId, {
        ...cur,
        runningSince: action.now,
        firstStartedAt: cur.firstStartedAt ?? action.now,
      });
    }
    case 'timerPause': {
      const cur = state.timers[me]?.[action.projectId];
      if (!cur?.runningSince) return state;
      return setMyTimer(state, me, action.projectId, {
        ...cur,
        runningSince: null,
        accumulatedMs: cur.accumulatedMs + (action.now - cur.runningSince),
      });
    }
    case 'timerReset':
      return setMyTimer(state, me, action.projectId, null);

    case 'updateBio':
      return { ...state, users: { ...state.users, [me]: { ...state.users[me], bio: action.bio } } };
    case 'sendFriendRequest':
      if (state.friendRequests.some((r) => r.from === me && r.to === action.userId)) return state;
      // 상대가 이미 나에게 요청했다면 바로 친구가 된다
      if (state.friendRequests.some((r) => r.from === action.userId && r.to === me))
        return reducer(state, { type: 'acceptFriend', userId: action.userId });
      return { ...state, friendRequests: [...state.friendRequests, { from: me, to: action.userId }] };
    case 'cancelFriendRequest':
      return { ...state, friendRequests: state.friendRequests.filter((r) => !(r.from === me && r.to === action.userId)) };
    case 'acceptFriend':
      return {
        ...state,
        friendships: state.friendships.some((p) => isPair(p, me, action.userId))
          ? state.friendships
          : [...state.friendships, [me, action.userId]],
        friendRequests: state.friendRequests.filter((r) => !isPair([r.from, r.to], me, action.userId)),
      };
    case 'rejectFriend':
      return { ...state, friendRequests: state.friendRequests.filter((r) => !(r.from === action.userId && r.to === me)) };
    case 'removeFriend':
      return { ...state, friendships: state.friendships.filter((p) => !isPair(p, me, action.userId)) };
  }
  return state;
}

/** 로그인한 유저 기준으로 화면에서 쓰기 편한 값을 계산한다 */
function selectView(raw: RawState): AppState {
  const me = raw.session ?? '';
  return {
    ...raw,
    meId: me,
    friendIds: raw.friendships.filter((p) => p.includes(me)).map((p) => (p[0] === me ? p[1] : p[0])),
    incomingRequestIds: raw.friendRequests.filter((r) => r.to === me).map((r) => r.from),
    outgoingRequestIds: raw.friendRequests.filter((r) => r.from === me).map((r) => r.to),
    incomingInvites: raw.invites.filter((i) => {
      const p = raw.projects.find((x) => x.id === i.projectId);
      return i.to === me && p && !p.memberIds.includes(me) && p.status !== 'done';
    }),
    timers: raw.timers[me] ?? {},
  };
}

type Actions = ReturnType<typeof createActions>;

function createActions(dispatch: React.Dispatch<Action>, s: RawState) {
  return {
    reset: () => dispatch({ type: 'reset' }),

    /** 성공하면 null, 실패하면 에러 메시지 */
    signup: async (username: string, password: string, name: string): Promise<string | null> => {
      if (s.accounts.some((a) => a.username === username)) return '이미 사용 중인 아이디예요.';
      const passwordHash = await hashPassword(username, password);
      const id = uid();
      const user: User = {
        id,
        name,
        handle: username,
        bio: '',
        color: USER_COLORS[Object.keys(s.users).length % USER_COLORS.length],
      };
      dispatch({ type: 'signup', user, username, passwordHash });
      return null;
    },
    login: async (username: string, password: string): Promise<string | null> => {
      const account = s.accounts.find((a) => a.username === username);
      if (!account) return '아이디 또는 비밀번호가 맞지 않아요.';
      const hash = await hashPassword(username, password);
      if (hash !== account.passwordHash) return '아이디 또는 비밀번호가 맞지 않아요.';
      dispatch({ type: 'login', userId: account.userId });
      return null;
    },
    logout: () => dispatch({ type: 'logout' }),

    createProject: (input: NewProjectInput) => {
      const project: Project = {
        id: uid(),
        title: input.title,
        yarn: input.yarn,
        needle: input.needle,
        status: input.status,
        type: input.type,
        coverUri: input.coverUri,
        ownerId: s.session!,
        memberIds: [s.session!],
        createdAt: new Date().toISOString(),
        visibility: input.visibility,
        code: makeCode(new Set(s.projects.map((p) => p.code))),
        maxMembers: input.maxMembers,
        description: input.description,
        applicantIds: [],
      };
      dispatch({ type: 'createProject', project, inviteIds: input.type === 'group' ? input.inviteIds : [] });
      return project.id;
    },
    setProjectStatus: (projectId: string, status: ProjectStatus) => dispatch({ type: 'setProjectStatus', projectId, status }),
    setProjectType: (projectId: string, type: ProjectType) =>
      dispatch({ type: 'updateGroupSettings', projectId, settings: { type } }),
    setVisibility: (projectId: string, visibility: Visibility) =>
      dispatch({ type: 'updateGroupSettings', projectId, settings: { visibility } }),
    updateGroupSettings: (projectId: string, settings: GroupSettings) =>
      dispatch({ type: 'updateGroupSettings', projectId, settings }),

    apply: (projectId: string) => dispatch({ type: 'apply', projectId }),
    cancelApply: (projectId: string) => dispatch({ type: 'cancelApply', projectId }),
    acceptApplicant: (projectId: string, userId: string) => dispatch({ type: 'acceptApplicant', projectId, userId }),
    rejectApplicant: (projectId: string, userId: string) => dispatch({ type: 'rejectApplicant', projectId, userId }),
    joinProject: (projectId: string) => dispatch({ type: 'joinProject', projectId }),
    leaveProject: (projectId: string) => dispatch({ type: 'leaveProject', projectId }),
    invite: (projectId: string, userId: string) => dispatch({ type: 'invite', projectId, userId }),
    cancelInvite: (projectId: string, userId: string) => dispatch({ type: 'cancelInvite', projectId, userId }),
    acceptInvite: (inviteId: string) => dispatch({ type: 'acceptInvite', inviteId }),
    declineInvite: (inviteId: string) => dispatch({ type: 'declineInvite', inviteId }),

    addLog: (projectId: string, input: LogInput) => dispatch({ type: 'addLog', projectId, input }),
    updateLog: (logId: string, input: LogInput) => dispatch({ type: 'updateLog', logId, input }),
    deleteLog: (logId: string) => dispatch({ type: 'deleteLog', logId }),
    toggleReaction: (logId: string, emoji: string) => dispatch({ type: 'toggleReaction', logId, emoji }),
    addComment: (logId: string, text: string) => dispatch({ type: 'addComment', logId, text }),
    deleteComment: (logId: string, commentId: string) => dispatch({ type: 'deleteComment', logId, commentId }),
    timerStart: (projectId: string) => dispatch({ type: 'timerStart', projectId, now: Date.now() }),
    timerPause: (projectId: string) => dispatch({ type: 'timerPause', projectId, now: Date.now() }),
    timerReset: (projectId: string) => dispatch({ type: 'timerReset', projectId }),

    updateBio: (bio: string) => dispatch({ type: 'updateBio', bio }),
    sendFriendRequest: (userId: string) => dispatch({ type: 'sendFriendRequest', userId }),
    cancelFriendRequest: (userId: string) => dispatch({ type: 'cancelFriendRequest', userId }),
    acceptFriend: (userId: string) => dispatch({ type: 'acceptFriend', userId }),
    rejectFriend: (userId: string) => dispatch({ type: 'rejectFriend', userId }),
    removeFriend: (userId: string) => dispatch({ type: 'removeFriend', userId }),
  };
}

const StoreContext = createContext<{ state: AppState; actions: Actions } | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [raw, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  // 회원가입·로그인 검증 등에서 현재 상태를 읽으므로 상태가 바뀌면 액션도 새로 만든다
  const actions = useMemo(() => createActions(dispatch, raw), [raw]);
  const skipNextSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) dispatch({ type: 'hydrate', state: JSON.parse(json) as RawState });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(raw)).catch(() => {});
  }, [raw, hydrated]);

  const value = useMemo(() => ({ state: selectView(raw), actions }), [raw, actions]);
  if (!hydrated) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}
