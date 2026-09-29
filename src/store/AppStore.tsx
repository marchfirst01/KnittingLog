import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { createInitialState } from '../data/mock';
import { AppState, KnitLog, Project, ProjectStatus, TimerState } from '../types';
import { uid } from '../utils/format';

const STORAGE_KEY = 'knittinglog/state/v1';

export type NewProjectInput = Pick<Project, 'title' | 'yarn' | 'needle' | 'status' | 'type' | 'coverUri'> & {
  memberIds: string[];
  recruit?: { maxMembers: number; description: string };
};

export type LogInput = Pick<KnitLog, 'startedAt' | 'durationSec' | 'rows' | 'text' | 'photoUri'>;

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset' }
  | { type: 'createProject'; id: string; input: NewProjectInput }
  | { type: 'setProjectStatus'; projectId: string; status: ProjectStatus }
  | { type: 'setRecruitOpen'; projectId: string; isOpen: boolean }
  | { type: 'apply'; projectId: string }
  | { type: 'cancelApply'; projectId: string }
  | { type: 'acceptApplicant'; projectId: string; userId: string }
  | { type: 'rejectApplicant'; projectId: string; userId: string }
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

const emptyTimer: TimerState = { runningSince: null, accumulatedMs: 0, firstStartedAt: null };

function mapProject(state: AppState, id: string, fn: (p: Project) => Project): AppState {
  return { ...state, projects: state.projects.map((p) => (p.id === id ? fn(p) : p)) };
}

function mapLog(state: AppState, id: string, fn: (l: KnitLog) => KnitLog): AppState {
  return { ...state, logs: state.logs.map((l) => (l.id === id ? fn(l) : l)) };
}

function reducer(state: AppState, action: Action): AppState {
  const me = state.meId;
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'reset':
      return createInitialState();

    case 'createProject': {
      const { input } = action;
      const project: Project = {
        id: action.id,
        title: input.title,
        yarn: input.yarn,
        needle: input.needle,
        status: input.status,
        type: input.type,
        coverUri: input.coverUri,
        ownerId: me,
        memberIds: [me, ...input.memberIds.filter((m) => m !== me)],
        recruit: input.recruit ? { isOpen: true, applicantIds: [], ...input.recruit } : undefined,
        createdAt: new Date().toISOString(),
      };
      return { ...state, projects: [project, ...state.projects] };
    }
    case 'setProjectStatus':
      return mapProject(state, action.projectId, (p) => ({ ...p, status: action.status }));
    case 'setRecruitOpen':
      return mapProject(state, action.projectId, (p) =>
        p.recruit ? { ...p, recruit: { ...p.recruit, isOpen: action.isOpen } } : p,
      );
    case 'apply':
      return mapProject(state, action.projectId, (p) =>
        p.recruit ? { ...p, recruit: { ...p.recruit, applicantIds: withId(p.recruit.applicantIds, me) } } : p,
      );
    case 'cancelApply':
      return mapProject(state, action.projectId, (p) =>
        p.recruit ? { ...p, recruit: { ...p.recruit, applicantIds: without(p.recruit.applicantIds, me) } } : p,
      );
    case 'acceptApplicant':
      return mapProject(state, action.projectId, (p) => {
        if (!p.recruit) return p;
        const memberIds = withId(p.memberIds, action.userId);
        return {
          ...p,
          memberIds,
          recruit: {
            ...p.recruit,
            applicantIds: without(p.recruit.applicantIds, action.userId),
            isOpen: p.recruit.isOpen && memberIds.length < p.recruit.maxMembers,
          },
        };
      });
    case 'rejectApplicant':
      return mapProject(state, action.projectId, (p) =>
        p.recruit
          ? { ...p, recruit: { ...p.recruit, applicantIds: without(p.recruit.applicantIds, action.userId) } }
          : p,
      );

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
        let reactions = existing
          ? l.reactions.map((r) =>
              r.emoji === action.emoji
                ? { ...r, userIds: r.userIds.includes(me) ? without(r.userIds, me) : [...r.userIds, me] }
                : r,
            )
          : [...l.reactions, { emoji: action.emoji, userIds: [me] }];
        reactions = reactions.filter((r) => r.userIds.length > 0);
        return { ...l, reactions };
      });
    case 'addComment':
      return mapLog(state, action.logId, (l) => ({
        ...l,
        comments: [...l.comments, { id: uid(), authorId: me, text: action.text, createdAt: new Date().toISOString() }],
      }));
    case 'deleteComment':
      return mapLog(state, action.logId, (l) => ({
        ...l,
        comments: l.comments.filter((c) => c.id !== action.commentId),
      }));

    case 'timerStart': {
      const cur = state.timers[action.projectId] ?? emptyTimer;
      if (cur.runningSince) return state;
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.projectId]: {
            ...cur,
            runningSince: action.now,
            firstStartedAt: cur.firstStartedAt ?? action.now,
          },
        },
      };
    }
    case 'timerPause': {
      const cur = state.timers[action.projectId];
      if (!cur?.runningSince) return state;
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.projectId]: {
            ...cur,
            runningSince: null,
            accumulatedMs: cur.accumulatedMs + (action.now - cur.runningSince),
          },
        },
      };
    }
    case 'timerReset': {
      const timers = { ...state.timers };
      delete timers[action.projectId];
      return { ...state, timers };
    }

    case 'updateBio':
      return { ...state, users: { ...state.users, [me]: { ...state.users[me], bio: action.bio } } };
    case 'sendFriendRequest':
      return { ...state, outgoingRequestIds: withId(state.outgoingRequestIds, action.userId) };
    case 'cancelFriendRequest':
      return { ...state, outgoingRequestIds: without(state.outgoingRequestIds, action.userId) };
    case 'acceptFriend':
      return {
        ...state,
        friendIds: withId(state.friendIds, action.userId),
        incomingRequestIds: without(state.incomingRequestIds, action.userId),
      };
    case 'rejectFriend':
      return { ...state, incomingRequestIds: without(state.incomingRequestIds, action.userId) };
    case 'removeFriend':
      return { ...state, friendIds: without(state.friendIds, action.userId) };
  }
}

type Actions = ReturnType<typeof createActions>;

function createActions(dispatch: React.Dispatch<Action>) {
  return {
    reset: () => dispatch({ type: 'reset' }),
    createProject: (input: NewProjectInput) => {
      const id = uid();
      dispatch({ type: 'createProject', id, input });
      return id;
    },
    setProjectStatus: (projectId: string, status: ProjectStatus) =>
      dispatch({ type: 'setProjectStatus', projectId, status }),
    setRecruitOpen: (projectId: string, isOpen: boolean) => dispatch({ type: 'setRecruitOpen', projectId, isOpen }),
    apply: (projectId: string) => dispatch({ type: 'apply', projectId }),
    cancelApply: (projectId: string) => dispatch({ type: 'cancelApply', projectId }),
    acceptApplicant: (projectId: string, userId: string) => dispatch({ type: 'acceptApplicant', projectId, userId }),
    rejectApplicant: (projectId: string, userId: string) => dispatch({ type: 'rejectApplicant', projectId, userId }),
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
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const actions = useMemo(() => createActions(dispatch), []);
  const skipNextSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) as AppState });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  if (!hydrated) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}
