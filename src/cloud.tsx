import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { seedData, type DiscId, type EventKind, type PrType } from './data';
import { todayISO, weekStartISO } from './format';
import { shrinkPhoto } from './photo';
import { useStore } from './store';
import { canon, hashOf, mergePersonal, personalOf, type Personal } from './sync';

// The shared group lives in Supabase. Without these variables the app keeps working fully on the phone, as before.
const URL_ = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Opened from the email's link (read before the client consumes the address): same as entering with the code.
const ARRIVED_BY_LINK = /type=(magiclink|signup|recovery|invite)/.test(location.hash);
const sb: SupabaseClient | null = URL_ && KEY_ ? createClient(URL_, KEY_) : null;

const JOIN_KEY = 'myrm.join';
const REFRESH_MS = 60_000;
/** Per account: the version of the backup this phone last agreed on with the server. */
const SYNC_KEY = 'myrm.sync.';
interface SyncMark { at: string; hash: string }
const readMark = (uid: string): SyncMark | null => { try { return JSON.parse(localStorage.getItem(SYNC_KEY + uid) || 'null'); } catch { return null; } };
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
  /** class_time: 'HH:MM' of the class this WOD is for ('' when posted without one). */
  id: string; day: string; class_time: string; title: string; description: string; score_type: PrType; created_by: string;
  scores: WodScore[];
}
/** "I came today": class time (HH:MM, or '' if not said), mood arriving and (later) leaving, 1 low – 5 high. */
export interface Checkin { user_id: string; class_time: string; mood_in: number; mood_out: number | null }
export type NewWod = Pick<CloudWod, 'title' | 'description' | 'score_type'>;
/** One of your own results today in another group, offered to copy over. */
export interface OtherScore { group: string; title: string; class_time: string; score_type: PrType; value: number; scaled: boolean }
export type NewFeedItem = Pick<CloudFeedItem, 'kind' | 'disc' | 'what'> & Partial<Pick<CloudFeedItem, 'type' | 'unit_label' | 'value' | 'stage'>>;

interface Cloud {
  /** False when Supabase isn't configured: callers fall back to the local-only group. */
  enabled: boolean;
  /** True once the first session check finished. */
  ready: boolean;
  userId: string | null;
  email: string | null;
  /** All your groups; `group` is the one you're looking at (you can be in several: your 7 AM crew, the whole box…). */
  groups: CloudGroup[];
  group: CloudGroup | null;
  selectGroup: (id: string) => void;
  members: CloudMember[];
  feed: CloudFeedItem[];
  events: CloudEvent[];
  /** Today's WODs in the group, one per class, and the one on screen (by default your class, from your check-in).
   *  `wodBoard` is false while the board's tables aren't created yet. */
  wods: CloudWod[];
  wod: CloudWod | null;
  selectClass: (classTime: string) => void;
  /** Your results today in your other groups, to copy here in one tap. */
  otherScores: OtherScore[];
  wodBoard: boolean;
  /** Today's check-ins in the group; `checkinsOn` is false until their table exists (migration 0006). */
  checkins: Checkin[];
  checkinsOn: boolean;
  checkIn: (classTime: string, moodIn: number) => Promise<string | null>;
  checkOut: (moodOut: number) => Promise<string | null>;
  undoCheckin: () => void;
  /** An invite code from a link, waiting for the user to sign in. */
  pendingJoin: string | null;
  /** Marks and settings are saved to the account (signed in and the first sync went through). */
  backedUp: boolean;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signInPassword: (email: string, password: string) => Promise<string | null>;
  /** Signed in but without a password yet (first time), or after entering with a code because it was forgotten. */
  needsPassword: boolean;
  setPassword: (password: string) => Promise<string | null>;
  /** From Profile: ask for a new password now (`false` cancels). */
  changePassword: (on: boolean) => void;
  hasPassword: boolean;
  /** Null when done; otherwise why it didn't sign out. */
  signOut: () => Promise<string | null>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
  leaveGroup: () => Promise<void>;
  post: (item: NewFeedItem) => void;
  toggleCheer: (id: string) => void;
  /** Takes one of your own posts off the group's feed. */
  deleteFeedItem: (id: string) => void;
  /** Takes back the record post that matches a mark entry you deleted or corrected (same name and value). */
  unpost: (what: string, value: number) => void;
  addEvent: (e: Pick<CloudEvent, 'kind' | 'title' | 'day' | 'time' | 'place'>) => Promise<string | null>;
  deleteEvent: (id: string) => void;
  /** Changes an event you created; RSVPs stay. */
  updateEvent: (id: string, e: Pick<CloudEvent, 'kind' | 'title' | 'day' | 'time' | 'place'>) => Promise<string | null>;
  rsvp: (id: string, going: boolean) => void;
  saveProfile: (name: string, birthday: string | null) => void;
  postWod: (w: NewWod, classTime: string) => Promise<string | null>;
  /** A photo of the box's whiteboard read into a WOD (server-side AI); a string is an error to show. */
  readBoardPhoto: (photo: Blob) => Promise<NewWod | string>;
  deleteWod: () => void;
  /** Fixes the WOD you posted (a misread line from a photo) without touching anyone's scores. */
  updateWod: (w: NewWod) => Promise<string | null>;
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
  if (/invalid login credentials/i.test(m)) return 'Correo o clave incorrectos. Si es tu primera vez o no te acuerdas, entra con código.';
  if (/reauthenticat/i.test(m)) return 'Por seguridad, cierra sesión, entra con código y crea la clave ahí.';
  if (/should be different/i.test(m)) return 'La clave nueva tiene que ser distinta a la anterior.';
  if (/password/i.test(m) && /least|short|weak/i.test(m)) return 'La clave es muy corta o muy fácil. Usa al menos 8 caracteres.';
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
  // Supabase doesn't say whether a user has a password, so the app marks it in the user's metadata when one is set.
  const [hasPassword, setHasPassword] = useState(false);
  const [wantsPassword, setWantsPassword] = useState(ARRIVED_BY_LINK);
  // "Ahora no" on the password screen: the app stays usable (e.g. offline at the box) and asks again next time.
  const [skippedPassword, setSkippedPassword] = useState(false);
  const [group, setGroup] = useState<CloudGroup | null>(null);
  const [members, setMembers] = useState<CloudMember[]>([]);
  const [feed, setFeed] = useState<CloudFeedItem[]>([]);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [wods, setWods] = useState<CloudWod[]>([]);
  const [pickedClass, setPickedClass] = useState<string | null>(null);
  const [groups, setGroups] = useState<CloudGroup[]>([]);
  const [otherScores, setOtherScores] = useState<OtherScore[]>([]);
  // Which group is on screen, per account, across restarts.
  const groupKey = `myrm.group.${userId ?? ''}`;
  const [groupPick, setGroupPick] = useState<string | null>(null);
  const [wodBoard, setWodBoard] = useState(true);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinsOn, setCheckinsOn] = useState(true);
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
    // INITIAL_SESSION arrives first with whatever the phone had saved; that marks the session as known.
    const { data: sub } = sb.auth.onAuthStateChange((e, s) => {
      setUserId(s?.user.id ?? null); setEmail(s?.user.email ?? null); setHasPassword(!!s?.user.user_metadata?.has_password);
      if (e === 'INITIAL_SESSION') setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // The saved session can be old: a password set on another phone only shows up in the user's current record.
  useEffect(() => {
    if (!sb || !userId) return;
    sb.auth.getUser().then(({ data: u }) => { if (u.user) setHasPassword(!!u.user.user_metadata?.has_password); });
  }, [userId]);

  const refresh = useCallback(async () => {
    const clear = () => { setGroups([]); setGroup(null); setMembers([]); setFeed([]); setEvents([]); setWods([]); setCheckins([]); setOtherScores([]); };
    if (!sb || !userId) { clear(); return; }
    const { data: mine } = await sb.from('group_members').select('group_id, groups(id, name, invite_code, created_by)').eq('user_id', userId).order('joined_at');
    const all = (mine ?? []).map(r => r.groups as unknown as CloudGroup).filter(Boolean);
    setGroups(all);
    let stored: string | null = null;
    try { stored = groupPick ?? localStorage.getItem(groupKey); } catch { /* private mode */ }
    const gid = (all.find(g => g.id === stored) ?? all[0])?.id;
    if (!gid) { clear(); return; }
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [g, mem, fd, ev, wd, ck] = await Promise.all([
      sb.from('groups').select('id, name, invite_code, created_by').eq('id', gid).single(),
      sb.from('group_members').select('user_id').eq('group_id', gid),
      sb.from('feed_items').select('*, cheers(user_id)').eq('group_id', gid).order('created_at', { ascending: false }).limit(60),
      sb.from('events').select('*, rsvps(user_id, going)').eq('group_id', gid).gte('day', yesterday).order('day'),
      // The phone's own date: a 7 AM class in Chile is still "today", whatever the UTC date says.
      sb.from('wods').select('*, wod_scores(user_id, value, scaled, note)').eq('group_id', gid).eq('day', todayISO()),
      sb.from('checkins').select('user_id, class_time, mood_in, mood_out').eq('group_id', gid).eq('day', todayISO()).order('class_time')
    ]);
    // Same rule as the board: only a missing table turns check-ins off; a dropped connection keeps what was there.
    if (ck.error) { if (ck.error.code === '42P01' || ck.error.code === 'PGRST205') setCheckinsOn(false); }
    else { setCheckinsOn(true); setCheckins(ck.data as Checkin[]); }
    // Only a missing table turns the board off; a dropped connection just keeps what was there.
    if (wd.error) { if (wd.error.code === '42P01' || wd.error.code === 'PGRST205') setWodBoard(false); }
    else {
      setWodBoard(true);
      const ws = (wd.data ?? []) as (Omit<CloudWod, 'scores'> & { wod_scores: WodScore[] })[];
      setWods(ws.map(w => ({ ...w, class_time: w.class_time ?? '', scores: w.wod_scores.map(s => ({ ...s, value: Number(s.value) })) }))
        .sort((a, b) => a.class_time.localeCompare(b.class_time)));
    }
    // Your own results today in your other groups (one tap to copy them here).
    if (all.length > 1) {
      const { data: os } = await sb.from('wod_scores').select('value, scaled, wods!inner(group_id, day, title, class_time, score_type)')
        .eq('user_id', userId).eq('wods.day', todayISO()).neq('wods.group_id', gid);
      setOtherScores(((os ?? []) as unknown as { value: number; scaled: boolean; wods: { group_id: string; title: string; class_time: string; score_type: PrType } }[])
        .map(o => ({ group: all.find(g => g.id === o.wods.group_id)?.name ?? '', title: o.wods.title, class_time: o.wods.class_time ?? '', score_type: o.wods.score_type, value: Number(o.value), scaled: o.scaled })));
    } else setOtherScores([]);
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
  }, [userId, groupPick]); // eslint-disable-line react-hooks/exhaustive-deps

  // The WOD on screen: the class you picked, else the class you checked in to, else the first of the day.
  const myClass = checkins.find(c => c.user_id === userId)?.class_time;
  const wod = wods.find(w => w.class_time === pickedClass) ?? wods.find(w => w.class_time === myClass) ?? wods[0] ?? null;
  useEffect(() => { if (groupPick) refresh(); }, [groupPick]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Each phone remembers (across restarts) the version it last agreed on with the account: its server timestamp and a
  // fingerprint of the content. Comparing both sides against it says who changed: only the phone → upload; only the
  // account → download; both → join them. Nothing is uploaded before the account has been checked in this session.
  const mine = useMemo(() => canon(personalOf(data)),
    [data.name, data.goals, data.freq, data.units, data.bar, data.level, data.classTime, data.theme, data.aim, data.prs, data.skills, data.birthdays]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef({ mine, owner: data.owner });
  latest.current = { mine, owner: data.owner };
  const [mark, setMarkState] = useState<SyncMark | null>(null);
  const [checked, setChecked] = useState(false);
  const saveMark = useCallback((m: SyncMark) => {
    setMarkState(m);
    try { localStorage.setItem(SYNC_KEY + userId, JSON.stringify(m)); } catch { /* private mode */ }
  }, [userId]);
  const mineIsSynced = data.owner === userId && !!mark && hashOf(mine) === mark.hash;

  const push = useCallback(async (json: string) => {
    if (!sb || !userId) return false;
    const { data: row, error } = await sb.from('user_data').upsert({ user_id: userId, data: JSON.parse(json), updated_at: new Date().toISOString() }).select('updated_at').single();
    if (error) return false;
    saveMark({ at: row.updated_at, hash: hashOf(json) });
    return true;
  }, [userId, saveMark]);

  const pull = useCallback(async () => {
    if (!sb || !userId) return;
    const { data: row, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) return; // offline (or table missing): the phone keeps working and checks again later
    const { mine: local, owner } = latest.current;
    const remote = (row?.data ?? null) as Personal | null;
    const m = readMark(userId);
    if (owner && owner !== userId) {
      // Another account's marks are on this phone: never mix them. Start from this account's copy.
      set(() => ({ ...seedData(weekStartISO()), ...(remote ?? {}), owner: userId, onboarded: !!remote, screen: remote ? 'home' : 'w2' }));
      if (row) saveMark({ at: row.updated_at, hash: hashOf(canon(remote)) });
    } else if (!owner) {
      // Marks from before signing in (or a clean phone): they join the account, nothing lost.
      const merged = remote ? mergePersonal(JSON.parse(local) as Personal, remote) : JSON.parse(local) as Personal;
      // An account that already has data is a returning athlete: skip the profile questions on this phone.
      set(d => ({ ...merged, owner: userId, ...(remote && !d.onboarded ? { onboarded: true, screen: 'home' as const } : {}) }));
      await push(canon(merged));
    } else {
      const phoneChanged = !m || hashOf(local) !== m.hash;
      const accountChanged = !!row && (!m || row.updated_at !== m.at);
      if (!row || (phoneChanged && !accountChanged)) await push(local);
      else if (phoneChanged && accountChanged) {
        const merged = mergePersonal(JSON.parse(local) as Personal, remote!);
        set(() => merged);
        await push(canon(merged));
      } else if (accountChanged) {
        set(() => remote!);  // logged from another phone
        saveMark({ at: row.updated_at, hash: hashOf(canon(remote)) });
      } else setMarkState(m);
    }
    setChecked(true);
  }, [userId, push, set, saveMark]);

  useEffect(() => {
    setChecked(false); setMarkState(userId ? readMark(userId) : null);
    pull();
    if (!sb || !userId) return;
    const onVis = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every change goes up shortly after it settles, once the account has been checked this session.
  useEffect(() => {
    if (!checked || data.owner !== userId || mineIsSynced) return;
    const t = window.setTimeout(() => push(mine), PUSH_DELAY_MS);
    return () => clearTimeout(t);
  }, [mine, checked, data.owner, userId, mineIsSynced, push]);
  const backedUp = checked && mineIsSynced;

  // Stay fresh while open: on return to the app and once a minute.
  useEffect(() => {
    if (!sb || !userId) return;
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(id); };
  }, [userId, refresh]);

  const value = useMemo<Cloud>(() => ({
    enabled: !!sb, ready, userId, email, hasPassword, needsPassword: !!userId && (wantsPassword || (!hasPassword && !skippedPassword)), groups, group, members, feed, events, wods, wod, wodBoard, otherScores, checkins, checkinsOn, pendingJoin, backedUp,
    selectGroup: id => {
      try { localStorage.setItem(groupKey, id); } catch { /* private mode */ }
      setPickedClass(null); setGroupPick(id);
    },
    selectClass: t => setPickedClass(t),
    sendCode: async addr => {
      if (!sb) return null;
      const { error } = await sb.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: location.origin + location.pathname } });
      return explain(error);
    },
    verifyCode: async (addr, code) => {
      if (!sb) return null;
      const { error } = await sb.auth.verifyOtp({ email: addr, token: code.trim(), type: 'email' });
      // Entering with a code means it's the first time or the password was forgotten: either way, set one now.
      if (!error) setWantsPassword(true);
      return explain(error);
    },
    signInPassword: async (addr, password) => {
      if (!sb) return null;
      const { error } = await sb.auth.signInWithPassword({ email: addr, password });
      return explain(error);
    },
    setPassword: async password => {
      if (!sb) return null;
      const { error } = await sb.auth.updateUser({ password, data: { has_password: true } });
      if (!error) { setHasPassword(true); setWantsPassword(false); setSkippedPassword(false); }
      return explain(error);
    },
    changePassword: on => { setWantsPassword(on); if (!on) setSkippedPassword(true); },
    // Your marks live in the account; signing out leaves this phone clean for whoever signs in next.
    // Unsent changes go up first; without a connection the session stays, so nothing is lost.
    signOut: async () => {
      if (!sb) return null;
      if (data.owner === userId && !mineIsSynced && !(await push(mine))) return 'Tienes cambios sin respaldar y no hay conexión. Conéctate y vuelve a intentar.';
      await sb.auth.signOut({ scope: 'local' });
      setWantsPassword(false); setSkippedPassword(false);
      set(() => seedData(weekStartISO()));
      return null;
    },
    createGroup: async name => {
      if (!sb) return null;
      const { data: g, error } = await sb.rpc('create_group', { group_name: name });
      // The new group is the one you want to see next.
      if (!error && g) { try { localStorage.setItem(groupKey, (g as CloudGroup).id); } catch { /* */ } setPickedClass(null); setGroupPick((g as CloudGroup).id); }
      else if (!error) await refresh();
      return explain(error);
    },
    joinGroup: async code => {
      if (!sb) return null;
      // Accept either the bare code or the whole invite link pasted in.
      const bare = code.includes('join=') ? new URL(code, location.href).searchParams.get('join') ?? code : code;
      const { data: g, error } = await sb.rpc('join_group', { code: bare });
      if (!error && g) { try { localStorage.setItem(groupKey, (g as CloudGroup).id); } catch { /* */ } setPickedClass(null); setGroupPick((g as CloudGroup).id); }
      else if (!error) await refresh();
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
    updateEvent: async (id, e) => {
      if (!sb) return null;
      const { error } = await sb.from('events').update(e).eq('id', id);
      await refresh();
      return explain(error);
    },
    deleteFeedItem: id => {
      if (!sb) return;
      setFeed(fs => fs.filter(f => f.id !== id));
      sb.from('feed_items').delete().eq('id', id).then(() => refresh());
    },
    unpost: (what, value) => {
      if (!sb || !userId || !group) return;
      sb.from('feed_items').delete().eq('group_id', group.id).eq('user_id', userId).eq('kind', 'pr').eq('what', what).eq('value', value).then(() => refresh());
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
    postWod: async (w, classTime) => {
      if (!sb || !group || !userId) return null;
      const row = { ...w, group_id: group.id, day: todayISO(), created_by: userId };
      let { error } = await sb.from('wods').insert({ ...row, class_time: classTime });
      // Before migration 0007 there is no class_time column: post as the day's single WOD, as before.
      if (error && /class_time/.test(error.message)) ({ error } = await sb.from('wods').insert(row));
      if (!error) setPickedClass(classTime);
      await refresh();
      // Someone posted this class's WOD a moment earlier: theirs is the board now, and the person should know.
      return error?.code === '23505' ? 'Alguien subió el WOD de esa clase justo antes que tú: es el que ves en la pizarra.' : explain(error);
    },
    readBoardPhoto: async photo => {
      if (!sb) return 'La lectura de fotos necesita conexión.';
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return 'Entra a MyRm para usar la foto.';
      let body: string;
      try { const p = await shrinkPhoto(photo); body = JSON.stringify({ image: p.data, mediaType: p.mediaType }); }
      catch { return 'No pudimos abrir esa foto. Prueba con otra.'; }
      try {
        const res = await fetch('/api/wod-photo', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${s.session.access_token}` }, body });
        const out = await res.json().catch(() => ({})) as Partial<NewWod> & { error?: string };
        if (!res.ok || !out.title) return out.error ?? 'No pudimos leer esta foto. Escribe el WOD a mano.';
        return { title: out.title, description: out.description ?? '', score_type: out.score_type ?? 'time' };
      } catch { return 'Sin conexión. Revisa tu internet e intenta de nuevo.'; }
    },
    // One trip to the box is one check-in: it goes to every group you're in, so each crew sees you came.
    checkIn: async (classTime, moodIn) => {
      if (!sb || !group || !userId) return null;
      const rows = groups.map(g => ({ group_id: g.id, user_id: userId, day: todayISO(), class_time: classTime, mood_in: moodIn }));
      setCheckins(cs => [...cs.filter(c => c.user_id !== userId), { user_id: userId, class_time: classTime, mood_in: moodIn, mood_out: null }]);
      const { error } = await sb.from('checkins').upsert(rows);
      if (error) await refresh();
      return explain(error);
    },
    checkOut: async moodOut => {
      if (!sb || !group || !userId) return null;
      setCheckins(cs => cs.map(c => c.user_id === userId ? { ...c, mood_out: moodOut } : c));
      const { error } = await sb.from('checkins').update({ mood_out: moodOut }).eq('user_id', userId).eq('day', todayISO()).in('group_id', groups.map(g => g.id));
      if (error) await refresh();
      return explain(error);
    },
    undoCheckin: () => {
      if (!sb || !group || !userId) return;
      setCheckins(cs => cs.filter(c => c.user_id !== userId));
      sb.from('checkins').delete().eq('user_id', userId).eq('day', todayISO()).in('group_id', groups.map(g => g.id)).then(() => refresh());
    },
    updateWod: async w => {
      if (!sb || !wod) return null;
      const { error } = await sb.from('wods').update(w).eq('id', wod.id);
      await refresh();
      return explain(error);
    },
    deleteWod: () => {
      if (!sb || !wod) return;
      setWods(ws => ws.filter(x => x.id !== wod.id)); setPickedClass(null);
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
      setWods(ws => ws.map(x => x.id === wod.id ? { ...x, scores: x.scores.filter(sc => sc.user_id !== userId) } : x));
      sb.from('wod_scores').delete().eq('wod_id', wod.id).eq('user_id', userId).then(() => refresh());
    },
    inviteLink: () => group ? `${location.origin}${location.pathname}?join=${group.invite_code}` : ''
  }), [set, push, mine, mineIsSynced, data.owner, ready, userId, email, hasPassword, wantsPassword, skippedPassword, groups, group, members, feed, events, wods, wod, wodBoard, otherScores, groupKey, checkins, checkinsOn, pendingJoin, backedUp, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud outside CloudProvider');
  return c;
}
