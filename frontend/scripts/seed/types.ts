export type SeedExpect = [string, string, string, string, boolean | null];
export type SeedHistory = [string, string, string, string];

export interface SeedWork {
  name: string; zone: string; contr: string; ps: string; pe: string; fact: number; status: string;
  why?: string; obs?: string; reptag?: [string, string]; sched?: string;
  fs?: string; fe?: string; fc?: string; fcast?: string; plan0?: [string, string];
  cam?: string; ladder?: Array<boolean | null>; expect?: SeedExpect[]; causes?: string[];
  days?: Record<string, number>; verdict?: string; history?: SeedHistory[]; evidence?: Array<[string, string]>;
}
export interface SeedObject {
  name: string; short: string; stage: string; type: 'area' | 'linear'; cams: number; zonelbl: string;
  zones: string[]; plan: number; rep: number; cnf: number | null;
  camlist: Array<[string, string, string, string]>; acts?: Array<[string, string]>;
  order: string[]; works: Record<string, SeedWork>;
}
export interface SeedAlert {
  id: string; obj: string; work: string; kind: 'bad' | 'warn' | 'ok' | 'setup' | 'acc'; obs: string; sched?: string;
  sev: number; plan: number; rep: number; cnfd: number; days: number; cover?: string; stale: number;
  handling: 'new' | 'seen' | 'contacted' | 'closed';
  who?: string; role?: string; at?: string; target?: string; channel?: string; due?: string; outcome?: string;
  text: string; frame: string; frameLbl: string; frameSub: string;
}
export interface SeedContact { name: string; role: string; phone: string; tg: string; scope: string; esc: string }
export interface SeedCam {
  date: string; obj: string; id: string; zone: string; work: string; day: string; note: string;
  frames: Array<{ t: string; hit: boolean; det: Array<[string, number, [number, number, number, number]]> }>;
}
