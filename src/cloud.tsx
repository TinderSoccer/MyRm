import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DiscId, EventKind, PrType } from './data';
import { todayISO } from './format';
import { useStore } from './store';
import { canon, mergePersonal, personalOf, type Personal } from './sync';

// The shared group lives in Supabase. Without these variables the app keeps working fully on the phone, as before.
const URL_ = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb: SupabaseClient | null = URL_ && KEY_ ? createClient(URL_, KEY_) : null;

const JOIN_KEY = 'myrm.join';
const REFRESH_MS = 60_000;
/** Set once a phone has joined its marks with the account's; from then on the newest copy wins. */
const SYNCED_KEY = 'myrm.synced.';
const PUSH_DELAY_MS = 2000;

export interface CloudGroup { id: string; name: string; invite_code: string; created_by: string }
export interface CloudMember { id: string; name: string; birthday: string | null }
export interface CloudFeedItem {
  id: string; user_id: string; kind: 'pr' | 'skill'; disc: DiscId; what: string;
  type: PrType | null; unit_label: string | null; value: number | null; stage: string | null;
  created_at: string; cheers: number; cheered: boolean;
}
export interface CloudEvent {
  id: string; kind: EventKind; title: string; day: string; time: string; place: string; created_by: string;
  going: string[]; notGoing: string[];
}
export interface WodScore { user_id: string; value: number; scaled: boolean; note: string }
export interface CloudWod {
  id: string; day: string; title: string; description: string; score_type: PrType; created_by: string;
  scores: WodScore[];
}
export type NewWod = Pick<CloudWod, 'title' | 'description' | 'score_type'>;
export type NewFeedItem = Pick<CloudFeedItem, 'kind' | 'disc' | 'what'> & Partial<Pick<CloudFeedItem, 'type' | 'unit_label' | 'value' | 'stage'>>;

interface Cloud {
  /** False when Supabase isn't configured: callers fall back to the local-only group. */
  enabled: boolean;
  /** True once the first session check finished. */
  ready: boolean;
  userId: string | null;
  email: string | null;
  group: CloudGroup | null;
  members: CloudMember[];
  feed: CloudFeedItem[];
  events: CloudEvent[];
  /** Today's WOD on the group board; `wodBoard` is false while the board's tables aren't created yet. */
  wod: CloudWod | null;
  wodBoard: boolean;
  /** An invite code from a link, waiting for the user to sign in. */
  pendingJoin: string | null;
  /** Marks and settings are saved to the account (signed in and the first sync went through). */
  backedUp: boolean;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
  leaveGroup: () => Promise<void>;
  post: (item: NewFeedItem) => void;
  toggleCheer: (id: string) => void;
  addEvent: (e: Pick<CloudEvent, 'kind' | 'title' | 'day' | 'time' | 'place'>) => Promise<string | null>;
  deleteEvent: (id: string) => void;
  rsvp: (id: string, going: boolean) => void;
  saveProfile: (name: string, birthday: string | null) => void;
  postWod: (w: NewWod) => Promise<string | null>;
  deleteWod: () => void;
  saveScore: (s: Omit<WodScore, 'user_id'>) => Promise<string | null>;
  dropScore: () => void;
  inviteLink: () => string;
}

const Ctx = createContext<Cloud | null>(null);

/** Spanish, human messages for the errors a person can actually act on. */
function explain(err: { message?: string } | null): string | null {
  if (!err) return null;
  const m = err.message || '';
  if (/invalid invite code/i.test(m)) return 'Ese link de invitación no existe o expiró. Pide uno nuevo.';
  if (/token has expired|invalid/i.test(m)) return 'El código no es válido o ya venció. Pide uno nuevo.';
  if (/rate limit|security purposes/i.test(m)) return 'Pediste muchos códigos seguidos. Espera un minuto y vuelve a intentar.';
  if (/fetch|network/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return 'Algo falló. Intenta de nuevo en un momento.';
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { data, set } = useStore();
  const [ready, setReady] = useState(!sb);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [group, setGroup] = useState<CloudGroup | null>(null);
  const [members, setMembers] = useState<CloudMember[]>([]);
  const [feed, setFeed] = useState<CloudFeedItem[]>([]);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [wod, setWod] = useState<CloudWod | null>(null);
  const [wodBoard, setWodBoard] = useState(true);
  const [pendingJoin, setPendingJoin] = useState<string | null>(() => {
    // An invite link looks like …/?join=CODE. Keep the code until the person signs in, and clean the address bar.
    const code = new URLSearchParams(location.search).get('join');
    if (code) {
      try { localStorage.setItem(JOIN_KEY, code); } catch { /* private mode */ }
      history.replaceState(null, '', location.pathname);
      return code;
    }
    try { return localStorage.getItem(JOIN_KEY); } catch { return null; }
  });
  const nameRef = useRef(data.name);
  nameRef.current = data.name;

  // Session
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data: s }) => {
      setUserId(s.session?.user.id ?? null); setEmail(s.session?.user.email ?? null); setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setUserId(s?.user.id ?? null); setEmail(s?.user.email ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!sb || !userId) { setGroup(null); setMembers([]); setFeed([]); setEvents([]); setWod(null); return; }
    const { data: mine } = await sb.from('group_members').select('group_id').eq('user_id', userId).order('joined_at').limit(1);
    const gid = mine?.[0]?.group_id as string | undefined;
    if (!gid) { setGroup(null); setMembers([]); setFeed([]); setEvents([]); setWod(null); return; }
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [g, mem, fd, ev, wd] = await Promise.all([
      sb.from('groups').select('id, name, invite_code, created_by').eq('id', gid).single(),
      sb.from('group_members').select('user_id').eq('group_id', gid),
      sb.from('feed_items').select('*, cheers(user_id)').eq('group_id', gid).order('created_at', { ascending: false }).limit(60),
      sb.from('events').select('*, rsvps(user_id, going)').eq('group_id', gid).gte('day', yesterday).order('day'),
      // The phone's own date: a 7 AM class in Chile is still "today", whatever the UTC date says.
      sb.from('wods').select('*, wod_scores(user_id, value, scaled, note)').eq('group_id', gid).eq('day', todayISO()).maybeSingle()
    ]);
    setWodBoard(!wd.error);
    const w = wd.data as (Omit<CloudWod, 'scores'> & { wod_scores: WodScore[] }) | null;
    setWod(w ? { ...w, scores: w.wod_scores.map(s => ({ ...s, value: Number(s.value) })) } : null);
    if (g.data) setGroup(g.data as CloudGroup);
    // Members reference auth.users, not profiles, so their names come in a second query.
    const ids = (mem.data ?? []).map(r => r.user_id as string);
    const { data: profs } = ids.length ? await sb.from('profiles').select('id, name, birthday').in('id', ids) : { data: [] };
    setMembers(ids.map(id => { const p = profs?.find(x => x.id === id); return { id, name: p?.name || 'Sin nombre', birthday: p?.birthday ?? null }; }));
    setFeed(((fd.data ?? []) as (Omit<CloudFeedItem, 'cheers' | 'cheered'> & { cheers: { user_id: string }[] })[]).map(f => ({
      ...f, value: f.value == null ? null : Number(f.value), cheers: f.cheers.length, cheered: f.cheers.some(c => c.user_id === userId)
    })));
    setEvents(((ev.data ?? []) as (Omit<CloudEvent, 'going' | 'notGoing'> & { rsvps: { user_id: string; going: boolean }[] })[]).map(e => ({
      ...e, going: e.rsvps.filter(r => r.going).map(r => r.user_id), notGoing: e.rsvps.filter(r => !r.going).map(r => r.user_id)
    })));
  }, [userId]);

  // On sign-in: make sure there's a profile with the name from onboarding, use a pending invite, then load.
  useEffect(() => {
    if (!sb || !userId) { refresh(); return; }
    (async () => {
      const { data: prof } = await sb.from('profiles').select('id, name').eq('id', userId).maybeSingle();
      if (!prof) await sb.from('profiles').insert({ id: userId, name: nameRef.current.trim() });
      else if (!prof.name && nameRef.current.trim()) await sb.from('profiles').update({ name: nameRef.current.trim() }).eq('id', userId);
      if (pendingJoin) {
        await sb.rpc('join_group', { code: pendingJoin });
        try { localStorage.removeItem(JOIN_KEY); } catch { /* ignore */ }
        setPendingJoin(null);
      }
      refresh();
    })();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Personal backup: marks, skills and settings follow the account ───
  const [backedUp, setBackedUp] = useState(false);
  const mine = useMemo(() => canon(personalOf(data)), [data]);
  const latestMine = useRef(mine);
  latestMine.current = mine;
  const sent = useRef<string | null>(null);     // last copy the server has (or that came from it)
  const remoteAt = useRef<string | null>(null);  // updated_at of that copy

  const push = useCallback(async (json: string) => {
    if (!sb || !userId) return;
    const { data: row, error } = await sb.from('user_data').upsert({ user_id: userId, data: JSON.parse(json), updated_at: new Date().toISOString() }).select('updated_at').single();
    if (!error) { sent.current = json; remoteAt.current = row.updated_at; setBackedUp(true); }
  }, [userId]);

  const pull = useCallback(async () => {
    if (!sb || !userId) return;
    const { data: row, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) return; // table not created yet, or offline: the phone keeps working on its own
    const local = latestMine.current;
    const firstTime = (() => { try { return !localStorage.getItem(SYNCED_KEY + userId); } catch { return true; } })();
    if (!row) { await push(local); }
    else if (firstTime) {
      const merged = canon(mergePersonal(JSON.parse(local) as Personal, row.data as Personal));
      // An account that already has data is a returning athlete: skip the profile questions on this phone.
      set(d => ({ ...JSON.parse(merged), ...(d.onboarded ? {} : { onboarded: true, screen: 'home' as const }) }));
      await push(merged);
    } else if (local !== sent.current) {
      await push(local);  // unsent changes on this phone are the newest
    } else if (row.updated_at !== remoteAt.current) {
      const json = canon(row.data);
      sent.current = json; remoteAt.current = row.updated_at;
      set(() => row.data as Personal);  // logged from another phone
      setBackedUp(true);
    } else setBackedUp(true);
    try { localStorage.setItem(SYNCED_KEY + userId, '1'); } catch { /* private mode */ }
  }, [userId, push, set]);

  useEffect(() => {
    sent.current = null; remoteAt.current = null; setBackedUp(false);
    pull();
    if (!sb || !userId) return;
    const onVis = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every change goes up shortly after it settles.
  useEffect(() => {
    if (!backedUp || mine === sent.current) return;
    const t = window.setTimeout(() => push(mine), PUSH_DELAY_MS);
    return () => clearTimeout(t);
  }, [mine, backedUp, push]);

  // Stay fresh while open: on return to the app and once a minute.
  useEffect(() => {
    if (!sb || !userId) return;
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(id); };
  }, [userId, refresh]);

  const value = useMemo<Cloud>(() => ({
    enabled: !!sb, ready, userId, email, group, members, feed, events, wod, wodBoard, pendingJoin, backedUp,
    sendCode: async addr => {
      if (!sb) return null;
      const { error } = await sb.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: location.origin + location.pathname } });
      return explain(error);
    },
    verifyCode: async (addr, code) => {
      if (!sb) return null;
      const { error } = await sb.auth.verifyOtp({ email: addr, token: code.trim(), type: 'email' });
      return explain(error);
    },
    signOut: async () => { await sb?.auth.signOut(); },
    createGroup: async name => {
      if (!sb) return null;
      const { error } = await sb.rpc('create_group', { group_name: name });
      if (!error) await refresh();
      return explain(error);
    },
    joinGroup: async code => {
      if (!sb) return null;
      // Accept either the bare code or the whole invite link pasted in.
      const bare = code.includes('join=') ? new URL(code, location.href).searchParams.get('join') ?? code : code;
      const { error } = await sb.rpc('join_group', { code: bare });
      if (!error) await refresh();
      return explain(error);
    },
    leaveGroup: async () => {
      if (!sb || !group || !userId) return;
      await sb.from('group_members').delete().eq('group_id', group.id).eq('user_id', userId);
      await refresh();
    },
    post: item => {
      if (!sb || !group || !userId) return;
      sb.from('feed_items').insert({ ...item, group_id: group.id, user_id: userId }).then(() => refresh());
    },
    toggleCheer: id => {
      if (!sb || !userId) return;
      const item = feed.find(f => f.id === id);
      if (!item) return;
      // Optimistic: the flame reacts instantly, the server catches up.
      setFeed(fs => fs.map(f => f.id === id ? { ...f, cheered: !f.cheered, cheers: f.cheers + (f.cheered ? -1 : 1) } : f));
      const q = item.cheered
        ? sb.from('cheers').delete().eq('feed_item_id', id).eq('user_id', userId)
        : sb.from('cheers').insert({ feed_item_id: id, user_id: userId });
      q.then(({ error }) => { if (error) refresh(); });
    },
    addEvent: async e => {
      if (!sb || !group || !userId) return null;
      const { error } = await sb.from('events').insert({ ...e, group_id: group.id, created_by: userId });
      if (!error) await refresh();
      return explain(error);
    },
    deleteEvent: id => {
      if (!sb) return;
      setEvents(es => es.filter(e => e.id !== id));
      sb.from('events').delete().eq('id', id).then(() => refresh());
    },
    rsvp: (id, going) => {
      if (!sb || !userId) return;
      setEvents(es => es.map(e => e.id !== id ? e : {
        ...e,
        going: going ? [...new Set([...e.going, userId])] : e.going.filter(x => x !== userId),
        notGoing: going ? e.notGoing.filter(x => x !== userId) : [...new Set([...e.notGoing, userId])]
      }));
      sb.from('rsvps').upsert({ event_id: id, user_id: userId, going }).then(({ error }) => { if (error) refresh(); });
    },
    saveProfile: (name, birthday) => {
      if (!sb || !userId) return;
      sb.from('profiles').upsert({ id: userId, name: name.trim(), birthday, updated_at: new Date().toISOString() }).then(() => refresh());
    },
    postWod: async w => {
      if (!sb || !group || !userId) return null;
      const { error } = await sb.from('wods').insert({ ...w, group_id: group.id, day: todayISO(), created_by: userId });
      await refresh();
      // Someone else posted it a moment earlier: theirs is the board now.
      return error?.code === '23505' ? null : explain(error);
    },
    deleteWod: () => {
      if (!sb || !wod) return;
      setWod(null);
      sb.from('wods').delete().eq('id', wod.id).then(() => refresh());
    },
    saveScore: async s => {
      if (!sb || !wod || !userId) return null;
      const { error } = await sb.from('wod_scores').upsert({ ...s, wod_id: wod.id, user_id: userId });
      await refresh();
      return explain(error);
    },
    dropScore: () => {
      if (!sb || !wod || !userId) return;
      setWod({ ...wod, scores: wod.scores.filter(x => x.user_id !== userId) });
      sb.from('wod_scores').delete().eq('wod_id', wod.id).eq('user_id', userId).then(() => refresh());
    },
    inviteLink: () => group ? `${location.origin}${location.pathname}?join=${group.invite_code}` : ''
  }), [ready, userId, email, group, members, feed, events, wod, wodBoard, pendingJoin, backedUp, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud outside CloudProvider');
  return c;
}
