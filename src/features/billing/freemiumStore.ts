import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { freemiumApi, type Celebration, type FreemiumOffer, type Nudge, type OfferAction } from '@/src/api/freemium';
import { useAuthStore } from '@/src/store/authStore';

/** One popup on screen: an offer for a locked feature, or a server nudge. */
export interface FreemiumPopup {
  source: 'offer' | 'nudge';
  id?: string;
  title: string;
  message: string;
  quote?: string;
  ctaLabel: string;
  ctaAction: OfferAction;
  dismissLabel: string;
  feature?: string;
}

/** A follow-up message after the popup closes (claimed / failed). */
export interface FreemiumNotice {
  kind: 'success' | 'error';
  text: string;
}

const SEEN_KEY = 'cb_seen_nudges';
const NUDGE_CHECK_EVERY_MS = 15 * 60 * 1000;

let queryClient: QueryClient | null = null;
/** Set once by FreemiumBridge so a claim can refresh every screen's data. */
export function setFreemiumQueryClient(qc: QueryClient) {
  queryClient = qc;
}

function userKey() {
  const u = useAuthStore.getState().user as { id?: unknown; userId?: unknown } | null;
  return `${SEEN_KEY}:${String(u?.id ?? u?.userId ?? '')}`;
}

async function readSeen(): Promise<string[]> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(userKey())) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function markSeen(id: string) {
  try {
    const list = [...(await readSeen()).filter((x) => x !== id), id].slice(-60);
    await AsyncStorage.setItem(userKey(), JSON.stringify(list));
  } catch {
    // storage unavailable -- the nudge may show again, which is harmless
  }
}

type FreemiumState = {
  popup: FreemiumPopup | null;
  notice: FreemiumNotice | null;
  celebration: Celebration | null;
  closeCelebration: () => void;
  claiming: boolean;
  /** Bumped after each successful claim. */
  claimCount: number;
  lastOfferKey: string;
  lastOfferAt: number;
  lastNudgeCheck: number;

  showOffer: (offer: FreemiumOffer | null | undefined) => boolean;
  dismiss: () => void;
  act: () => Promise<void>;
  claim: (feature: string) => Promise<boolean>;
  checkNudges: (force?: boolean) => Promise<void>;
  clearNotice: () => void;
};

export const useFreemiumStore = create<FreemiumState>((set, get) => ({
  popup: null,
  notice: null,
  celebration: null,
  closeCelebration: () => set({ celebration: null }),
  claiming: false,
  claimCount: 0,
  lastOfferKey: '',
  lastOfferAt: 0,
  lastNudgeCheck: 0,

  showOffer: (offer) => {
    if (!offer || !offer.title) return false;
    const key = `${offer.type}:${offer.feature}`;
    const now = Date.now();
    // Several parallel requests can hit the same lock: show it once.
    if (key === get().lastOfferKey && now - get().lastOfferAt < 4000 && get().popup) return true;
    set({
      lastOfferKey: key,
      lastOfferAt: now,
      popup: {
        source: 'offer',
        title: offer.title,
        message: offer.message,
        ctaLabel: offer.cta_label,
        ctaAction: offer.cta_action,
        dismissLabel: offer.dismiss_label,
        feature: offer.feature,
      },
    });
    return true;
  },

  dismiss: () => {
    if (get().claiming) return;
    set({ popup: null });
  },

  act: async () => {
    const p = get().popup;
    if (!p) return;
    if (p.ctaAction === 'CLAIM') {
      await get().claim(p.feature ?? '');
      return;
    }
    set({ popup: null });
    if (p.ctaAction === 'OPEN_PLANS') router.push('/premium');
  },

  claim: async (feature) => {
    if (get().claiming) return false;
    set({ claiming: true });
    try {
      const res = await freemiumApi.claim(feature);
      // A new claim gets the celebration popup; a repeat claim the banner.
      set((s) => ({
        popup: null,
        claimCount: s.claimCount + 1,
        celebration: res.celebration?.title ? res.celebration : null,
        notice: !res.celebration?.title && res.message ? { kind: 'success', text: res.message } : null,
      }));
      // Plan, project cap, locked profiles -- everything may have changed.
      void queryClient?.invalidateQueries();
      return true;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      set({ popup: null });
      if (status === 409 || status === 403) {
        // Campaign switched off (or not for this account) since the offer
        // was shown: the paid plans are the way in now.
        router.push('/premium');
      } else {
        const msg = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined;
        set({ notice: { kind: 'error', text: msg || 'Something went wrong, please try again.' } });
      }
      return false;
    } finally {
      set({ claiming: false });
    }
  },

  checkNudges: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastNudgeCheck < NUDGE_CHECK_EVERY_MS) return;
    if (!useAuthStore.getState().accessToken) return;
    set({ lastNudgeCheck: now });
    let nudges: Nudge[];
    try {
      nudges = await freemiumApi.nudges();
    } catch {
      return;
    }
    if (get().popup) return; // never cover an offer the user is looking at
    const seen = await readSeen();
    const next = nudges.find((n) => n?.id && !seen.includes(n.id));
    if (!next) return;
    // Remembered as soon as it's shown: a nudge is never repeated.
    await markSeen(next.id);
    set({
      popup: {
        source: 'nudge',
        id: next.id,
        title: next.title,
        message: next.body,
        quote: next.quote,
        ctaLabel: next.cta?.label ?? '',
        ctaAction: next.cta?.action ?? 'DISMISS',
        dismissLabel: next.dismiss_label,
      },
    });
  },

  clearNotice: () => set({ notice: null }),
}));
