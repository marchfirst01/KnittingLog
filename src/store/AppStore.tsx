import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { createInitialState, defaultCounters } from '../data/mock';
import {
  AppState,
  Counter,
  KnitLog,
  Membership,
  MemberStatus,
  Post,
  Project,
  RawState,
  ReportReason,
  TimerState,
  User,
} from '../types';
import { uid } from '../utils/format';

const STORAGE_KEY = 'knittinglog/state/v3';

export type NewProjectInput = Pick<Project, 'title' | 'coverUri'> &
  Pick<Membership, 'yarn' | 'needle' | 'status'> & {
    /** 초대를 보낼 친구 */
    inviteIds: string[];
  };

export type LogInput = Pick<KnitLog, 'startedAt' | 'durationSec' | 'text' | 'photoUri'>;
export type PostInput = Pick<Post, 'photoUri' | 'text' | 'projectId'>;

type Action =
  | { type: 'hydrate'; state: RawState }
  | { type: 'reset' }
  | { type: 'signup'; user: User; username: string; passwordHash: string }
  | { type: 'login'; userId: string }
  | { type: 'logout' }
  | { type: 'createProject'; project: Project; membership: Membership; inviteIds: string[] }
  | { type: 'updateProject'; projectId: string; patch: Partial<Pick<Project, 'title' | 'coverUri'>> }
  | { type: 'updateMembership'; projectId: string; patch: Partial<Pick<Membership, 'yarn' | 'needle'>> }
  | { type: 'setMyStatus'; projectId: string; status: MemberStatus }
  | { type: 'setCounter'; projectId: string; index: 0 | 1; patch: Partial<Counter> }
  | { type: 'deleteProject'; projectId: string }
  | { type: 'transferOwner'; projectId: string; userId: string }
  | { type: 'removeMember'; projectId: string; userId: string; newProjectId: string }
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
  | { type: 'createPost'; post: Post }
  | { type: 'deletePost'; postId: string }
  | { type: 'toggleLike'; postId: string }
  | { type: 'addPostComment'; postId: string; text: string }
  | { type: 'deletePostComment'; postId: string; commentId: string }
  | { type: 'updateBio'; bio: string }
  | { type: 'setPrivate'; isPrivate: boolean }
  | { type: 'report'; targetUserId: string; targetPostId?: string; reason: ReportReason; detail: string }
  | { type: 'block'; userId: string }
  | { type: 'unblock'; userId: string }
  | { type: 'sendFriendRequest'; userId: string }
  | { type: 'cancelFriendRequest'; userId: string }
  | { type: 'acceptFriend'; userId: string }
  | { type: 'rejectFriend'; userId: string }
  | { type: 'removeFriend'; userId: string };

const without = (arr: string[], id: string) => arr.filter((x) => x !== id);
const toggle = (arr: string[], id: string) => (arr.includes(id) ? without(arr, id) : [...arr, id]);
const isPair = (a1: string, b1: string, a: string, b: string) => (a1 === a && b1 === b) || (a1 === b && b1 === a);
const now = () => new Date().toISOString();

const emptyTimer: TimerState = { runningSince: null, accumulatedMs: 0, firstStartedAt: null };
const USER_COLORS = ['#C4704A', '#4A7BC4', '#7A9A72', '#9A7AB8', '#4E9C9A', '#C49A3A', '#C45A7A', '#6B8FA8'];

export const hashPassword = (username: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `knittinglog:${username}:${password}`);

export const membersOf = (state: Pick<RawState, 'memberships'>, projectId: string) =>
  state.memberships.filter((m) => m.projectId === projectId).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

const isBlockedBetween = (state: RawState, a: string, b: string) =>
  state.blocks.some((x) => isPair(x.blocker, x.blocked, a, b));

function mapMembership(state: RawState, projectId: string, userId: string, fn: (m: Membership) => Membership): RawState {
  return {
    ...state,
    memberships: state.memberships.map((m) => (m.projectId === projectId && m.userId === userId ? fn(m) : m)),
  };
}

function mapLog(state: RawState, id: string, fn: (l: KnitLog) => KnitLog): RawState {
  return { ...state, logs: state.logs.map((l) => (l.id === id ? fn(l) : l)) };
}

function mapPost(state: RawState, id: string, fn: (p: Post) => Post): RawState {
  return { ...state, posts: state.posts.map((p) => (p.id === id ? fn(p) : p)) };
}

function setTimer(state: RawState, userId: string, projectId: string, timer: TimerState | null): RawState {
  const mine = { ...(state.timers[userId] ?? {}) };
  if (timer) mine[projectId] = timer;
  else delete mine[projectId];
  return { ...state, timers: { ...state.timers, [userId]: mine } };
}

/**
 * 멤버가 공유 프로젝트에서 빠질 때(나가기·추방): 방에서는 빠지지만
 * 그 사람의 상태·실 정보·기록은 새 개인 프로젝트로 옮겨서 계속 이어 쓸 수 있게 한다.
 */
function detachMember(state: RawState, projectId: string, userId: string, newProjectId: string): RawState {
  const project = state.projects.find((p) => p.id === projectId);
  const membership = state.memberships.find((m) => m.projectId === projectId && m.userId === userId);
  if (!project || !membership || project.ownerId === userId) return state;
  const timer = state.timers[userId]?.[projectId];
  let next: RawState = {
    ...state,
    projects: [
      ...state.projects,
      { id: newProjectId, title: project.title, coverUri: project.coverUri, ownerId: userId, createdAt: now() },
    ],
    memberships: state.memberships.map((m) => (m === membership ? { ...m, projectId: newProjectId } : m)),
    logs: state.logs.map((l) => (l.projectId === projectId && l.authorId === userId ? { ...l, projectId: newProjectId } : l)),
    invites: state.invites.filter((i) => !(i.projectId === projectId && i.from === userId)),
  };
  if (timer) next = setTimer(setTimer(next, userId, projectId, null), userId, newProjectId, timer);
  return next;
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
  const project = 'projectId' in action ? state.projects.find((p) => p.id === action.projectId) : undefined;
  const isOwner = project?.ownerId === me;

  switch (action.type) {
    case 'logout':
      return { ...state, session: null };

    // ── 프로젝트 ──
    case 'createProject': {
      const invites = action.inviteIds.map((to) => ({
        id: uid(),
        projectId: action.project.id,
        from: me,
        to,
        createdAt: now(),
      }));
      return {
        ...state,
        projects: [action.project, ...state.projects],
        memberships: [...state.memberships, action.membership],
        invites: [...state.invites, ...invites],
      };
    }
    case 'updateProject':
      if (!isOwner) return state;
      return { ...state, projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, ...action.patch } : p)) };
    case 'updateMembership':
      return mapMembership(state, action.projectId, me, (m) => ({ ...m, ...action.patch }));
    case 'setMyStatus':
      return mapMembership(state, action.projectId, me, (m) => ({
        ...m,
        status: action.status,
        endedAt: action.status === 'done' ? (m.status === 'done' ? m.endedAt : now()) : undefined,
      }));
    case 'setCounter':
      return mapMembership(state, action.projectId, me, (m) => {
        const counters = [...m.counters] as [Counter, Counter];
        const c = { ...counters[action.index], ...action.patch };
        c.value = Math.max(0, c.value);
        c.max = Math.max(1, c.max);
        counters[action.index] = c;
        return { ...m, counters };
      });
    case 'deleteProject': {
      // 멤버가 나 혼자인 방장만 삭제할 수 있다
      if (!isOwner || membersOf(state, action.projectId).length > 1) return state;
      return setTimer(
        {
          ...state,
          projects: state.projects.filter((p) => p.id !== action.projectId),
          memberships: state.memberships.filter((m) => m.projectId !== action.projectId),
          logs: state.logs.filter((l) => l.projectId !== action.projectId),
          invites: state.invites.filter((i) => i.projectId !== action.projectId),
        },
        me,
        action.projectId,
        null,
      );
    }
    case 'transferOwner':
      if (!isOwner || !state.memberships.some((m) => m.projectId === action.projectId && m.userId === action.userId))
        return state;
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, ownerId: action.userId } : p)),
      };
    case 'removeMember':
      // 나가기(본인) 또는 추방(방장). 방장 본인은 양도 후에만 나갈 수 있다.
      if (action.userId !== me && !isOwner) return state;
      return detachMember(state, action.projectId, action.userId, action.newProjectId);

    case 'invite':
      if (
        isBlockedBetween(state, me, action.userId) ||
        state.invites.some((i) => i.projectId === action.projectId && i.to === action.userId)
      )
        return state;
      return {
        ...state,
        invites: [...state.invites, { id: uid(), projectId: action.projectId, from: me, to: action.userId, createdAt: now() }],
      };
    case 'cancelInvite':
      return {
        ...state,
        invites: state.invites.filter((i) => !(i.projectId === action.projectId && i.to === action.userId)),
      };
    case 'acceptInvite': {
      const inv = state.invites.find((i) => i.id === action.inviteId);
      if (!inv) return state;
      const invites = state.invites.filter((i) => !(i.projectId === inv.projectId && i.to === me));
      if (state.memberships.some((m) => m.projectId === inv.projectId && m.userId === me)) return { ...state, invites };
      const joinedAt = now();
      return {
        ...state,
        invites,
        memberships: [
          ...state.memberships,
          {
            projectId: inv.projectId,
            userId: me,
            status: 'active',
            startedAt: joinedAt,
            joinedAt,
            yarn: '',
            needle: '',
            counters: defaultCounters(),
          },
        ],
      };
    }
    case 'declineInvite':
      return { ...state, invites: state.invites.filter((i) => i.id !== action.inviteId) };

    // ── 기록 ──
    case 'addLog':
      return {
        ...state,
        logs: [
          ...state.logs,
          { id: uid(), projectId: action.projectId, authorId: me, reactions: [], comments: [], ...action.input },
        ],
      };
    case 'updateLog':
      return mapLog(state, action.logId, (l) => (l.authorId === me ? { ...l, ...action.input } : l));
    case 'deleteLog':
      return { ...state, logs: state.logs.filter((l) => !(l.id === action.logId && l.authorId === me)) };
    case 'toggleReaction':
      return mapLog(state, action.logId, (l) => {
        const existing = l.reactions.find((r) => r.emoji === action.emoji);
        const reactions = existing
          ? l.reactions.map((r) => (r.emoji === action.emoji ? { ...r, userIds: toggle(r.userIds, me) } : r))
          : [...l.reactions, { emoji: action.emoji, userIds: [me] }];
        return { ...l, reactions: reactions.filter((r) => r.userIds.length > 0) };
      });
    case 'addComment':
      return mapLog(state, action.logId, (l) => ({
        ...l,
        comments: [...l.comments, { id: uid(), authorId: me, text: action.text, createdAt: now() }],
      }));
    case 'deleteComment':
      return mapLog(state, action.logId, (l) => ({
        ...l,
        comments: l.comments.filter((c) => !(c.id === action.commentId && c.authorId === me)),
      }));

    case 'timerStart': {
      const cur = state.timers[me]?.[action.projectId] ?? emptyTimer;
      if (cur.runningSince) return state;
      return setTimer(state, me, action.projectId, {
        ...cur,
        runningSince: action.now,
        firstStartedAt: cur.firstStartedAt ?? action.now,
      });
    }
    case 'timerPause': {
      const cur = state.timers[me]?.[action.projectId];
      if (!cur?.runningSince) return state;
      return setTimer(state, me, action.projectId, {
        ...cur,
        runningSince: null,
        accumulatedMs: cur.accumulatedMs + (action.now - cur.runningSince),
      });
    }
    case 'timerReset':
      return setTimer(state, me, action.projectId, null);

    // ── 게시글 ──
    case 'createPost':
      return { ...state, posts: [action.post, ...state.posts] };
    case 'deletePost':
      return { ...state, posts: state.posts.filter((p) => !(p.id === action.postId && p.authorId === me)) };
    case 'toggleLike':
      return mapPost(state, action.postId, (p) => ({ ...p, likeIds: toggle(p.likeIds, me) }));
    case 'addPostComment':
      return mapPost(state, action.postId, (p) => ({
        ...p,
        comments: [...p.comments, { id: uid(), authorId: me, text: action.text, createdAt: now() }],
      }));
    case 'deletePostComment':
      return mapPost(state, action.postId, (p) => ({
        ...p,
        comments: p.comments.filter((c) => !(c.id === action.commentId && c.authorId === me)),
      }));

    // ── 프로필 · 신고 · 차단 ──
    case 'updateBio':
      return { ...state, users: { ...state.users, [me]: { ...state.users[me], bio: action.bio } } };
    case 'setPrivate':
      return { ...state, users: { ...state.users, [me]: { ...state.users[me], isPrivate: action.isPrivate } } };
    case 'report':
      return {
        ...state,
        reports: [
          ...state.reports,
          {
            id: uid(),
            reporterId: me,
            targetUserId: action.targetUserId,
            targetPostId: action.targetPostId,
            reason: action.reason,
            detail: action.detail,
            createdAt: now(),
          },
        ],
      };
    case 'block': {
      const u = action.userId;
      if (u === me || state.blocks.some((b) => b.blocker === me && b.blocked === u)) return state;
      return {
        ...state,
        blocks: [...state.blocks, { blocker: me, blocked: u }],
        friendships: state.friendships.filter(([a, b]) => !isPair(a, b, me, u)),
        friendRequests: state.friendRequests.filter((r) => !isPair(r.from, r.to, me, u)),
        invites: state.invites.filter((i) => !isPair(i.from, i.to, me, u)),
      };
    }
    case 'unblock':
      return { ...state, blocks: state.blocks.filter((b) => !(b.blocker === me && b.blocked === action.userId)) };

    // ── 친구 ──
    case 'sendFriendRequest':
      if (isBlockedBetween(state, me, action.userId)) return state;
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
        friendships: state.friendships.some(([a, b]) => isPair(a, b, me, action.userId))
          ? state.friendships
          : [...state.friendships, [me, action.userId]],
        friendRequests: state.friendRequests.filter((r) => !isPair(r.from, r.to, me, action.userId)),
      };
    case 'rejectFriend':
      return { ...state, friendRequests: state.friendRequests.filter((r) => !(r.from === action.userId && r.to === me)) };
    case 'removeFriend':
      return { ...state, friendships: state.friendships.filter(([a, b]) => !isPair(a, b, me, action.userId)) };
  }
  return state;
}

/** 로그인한 유저 기준으로 화면에서 쓰기 편한 값을 계산한다 */
function selectView(raw: RawState): AppState {
  const me = raw.session ?? '';
  const blockedIds = raw.blocks.filter((b) => b.blocker === me).map((b) => b.blocked);
  const blockedMe = raw.blocks.filter((b) => b.blocked === me).map((b) => b.blocker);
  return {
    ...raw,
    meId: me,
    friendIds: raw.friendships.filter((p) => p.includes(me)).map((p) => (p[0] === me ? p[1] : p[0])),
    incomingRequestIds: raw.friendRequests.filter((r) => r.to === me).map((r) => r.from),
    outgoingRequestIds: raw.friendRequests.filter((r) => r.from === me).map((r) => r.to),
    incomingInvites: raw.invites.filter(
      (i) =>
        i.to === me &&
        raw.projects.some((p) => p.id === i.projectId) &&
        !raw.memberships.some((m) => m.projectId === i.projectId && m.userId === me),
    ),
    blockedIds,
    hiddenIds: [...new Set([...blockedIds, ...blockedMe])],
    timers: raw.timers[me] ?? {},
  };
}

type Actions = ReturnType<typeof createActions>;

function createActions(dispatch: React.Dispatch<Action>, s: RawState) {
  const me = s.session ?? '';
  return {
    reset: () => dispatch({ type: 'reset' }),

    /** 성공하면 null, 실패하면 에러 메시지 */
    signup: async (username: string, password: string, name: string): Promise<string | null> => {
      if (s.accounts.some((a) => a.username === username)) return '이미 사용 중인 아이디예요.';
      const passwordHash = await hashPassword(username, password);
      const user: User = {
        id: uid(),
        name,
        handle: username,
        bio: '',
        color: USER_COLORS[Object.keys(s.users).length % USER_COLORS.length],
        isPrivate: false,
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
      const createdAt = now();
      const project: Project = { id: uid(), title: input.title, coverUri: input.coverUri, ownerId: me, createdAt };
      const membership: Membership = {
        projectId: project.id,
        userId: me,
        status: input.status,
        startedAt: createdAt,
        endedAt: input.status === 'done' ? createdAt : undefined,
        joinedAt: createdAt,
        yarn: input.yarn,
        needle: input.needle,
        counters: defaultCounters(),
      };
      dispatch({ type: 'createProject', project, membership, inviteIds: input.inviteIds });
      return project.id;
    },
    updateProject: (projectId: string, patch: Partial<Pick<Project, 'title' | 'coverUri'>>) =>
      dispatch({ type: 'updateProject', projectId, patch }),
    updateMembership: (projectId: string, patch: Partial<Pick<Membership, 'yarn' | 'needle'>>) =>
      dispatch({ type: 'updateMembership', projectId, patch }),
    setMyStatus: (projectId: string, status: MemberStatus) => dispatch({ type: 'setMyStatus', projectId, status }),
    setCounter: (projectId: string, index: 0 | 1, patch: Partial<Counter>) =>
      dispatch({ type: 'setCounter', projectId, index, patch }),
    deleteProject: (projectId: string) => dispatch({ type: 'deleteProject', projectId }),
    transferOwner: (projectId: string, userId: string) => dispatch({ type: 'transferOwner', projectId, userId }),
    /** 나가기. 내 기록이 옮겨진 새 개인 프로젝트 id를 돌려준다 */
    leaveProject: (projectId: string) => {
      const newProjectId = uid();
      dispatch({ type: 'removeMember', projectId, userId: me, newProjectId });
      return newProjectId;
    },
    kickMember: (projectId: string, userId: string) =>
      dispatch({ type: 'removeMember', projectId, userId, newProjectId: uid() }),
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

    createPost: (input: PostInput) => {
      const project = s.projects.find((p) => p.id === input.projectId);
      dispatch({
        type: 'createPost',
        post: {
          id: uid(),
          authorId: me,
          ...input,
          projectTitle: project?.title,
          likeIds: [],
          comments: [],
          createdAt: now(),
        },
      });
    },
    deletePost: (postId: string) => dispatch({ type: 'deletePost', postId }),
    toggleLike: (postId: string) => dispatch({ type: 'toggleLike', postId }),
    addPostComment: (postId: string, text: string) => dispatch({ type: 'addPostComment', postId, text }),
    deletePostComment: (postId: string, commentId: string) => dispatch({ type: 'deletePostComment', postId, commentId }),

    updateBio: (bio: string) => dispatch({ type: 'updateBio', bio }),
    setPrivate: (isPrivate: boolean) => dispatch({ type: 'setPrivate', isPrivate }),
    report: (targetUserId: string, reason: ReportReason, detail: string, targetPostId?: string) =>
      dispatch({ type: 'report', targetUserId, targetPostId, reason, detail }),
    block: (userId: string) => dispatch({ type: 'block', userId }),
    unblock: (userId: string) => dispatch({ type: 'unblock', userId }),
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
