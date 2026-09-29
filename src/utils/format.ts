import { KnitLog, Project, ProjectStatus } from '../types';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** 9/15 */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 2026.09.15 (화) */
export const fullDate = (iso: string) => {
  const d = new Date(iso);
  const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${day})`;
};

/** 21:00 */
export const clockTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 01:05:09 */
export const stopwatch = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** 1시간 20분 */
export const duration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${Math.max(m, sec > 0 ? 1 : 0)}분`;
};

/** 방금 전 / 3시간 전 / 9/15 */
export const relative = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return shortDate(iso);
};

export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "2026-09-15" + "21:00" → Date, 형식이 틀리면 null */
export const parseDateTime = (date: string, time: string): Date | null => {
  const dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) return null;
  const d = new Date(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]);
  if (isNaN(d.getTime()) || d.getMonth() !== +dm[2] - 1 || +tm[1] > 23 || +tm[2] > 59) return null;
  return d;
};

const statusOrder: Record<ProjectStatus, number> = { active: 0, ready: 1, done: 2 };

export const lastActivity = (project: Project, logs: KnitLog[]) =>
  logs
    .filter((l) => l.projectId === project.id)
    .reduce((max, l) => (l.startedAt > max ? l.startedAt : max), '');

/** 작업 중 → 시작 전 → 종료, 같은 상태끼리는 최근 활동 순 */
export const sortProjects = (projects: Project[], logs: KnitLog[]) =>
  [...projects].sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s) return s;
    const la = lastActivity(a, logs) || a.createdAt;
    const lb = lastActivity(b, logs) || b.createdAt;
    return lb.localeCompare(la);
  });

/** 4:40 (시:분) */
export const hoursMinutes = (sec: number) => `${Math.floor(sec / 3600)}:${pad(Math.floor((sec % 3600) / 60))}`;
