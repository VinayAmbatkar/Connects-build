import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** What a step points at: a bottom tab (by its position in the visible tab
 *  bar), the profile button in the header, or nothing (a centered card). */
export type TourTarget =
  | { kind: 'tab'; index: number }
  | { kind: 'header-profile' }
  /** An on-page element the screen measures and passes in by key. */
  | { kind: 'element'; key: string }
  | { kind: 'none' };

/** An element's on-screen box (from measureInWindow). */
export type TourRect = { x: number; y: number; width: number; height: number };

export type TourStep = {
  id: string;
  title: string;
  body: string;
  icon: IconName;
  target: TourTarget;
};

/** Visible tabs, in order: Home, Discover, Connect, My Connections,
 *  Messages (Profile is opened from the header). Keep in sync with
 *  app/(tabs)/_layout.tsx. */
export const VISIBLE_TAB_COUNT = 5;

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CoBilds',
    body: 'Take a quick 30-second tour to see where everything lives.',
    icon: 'sparkles',
    target: { kind: 'none' },
  },
  {
    id: 'feed',
    title: 'Home feed',
    body: 'Posts, project updates and events from people in your industry.',
    icon: 'home',
    target: { kind: 'tab', index: 0 },
  },
  {
    id: 'vendors',
    title: 'Discover',
    body: 'Search consultants, builders, contractors and vendors by role, discipline or city.',
    icon: 'search',
    target: { kind: 'tab', index: 1 },
  },
  {
    id: 'connect',
    title: 'Connect',
    body: 'Tell us what you need and we will match you with the right professionals.',
    icon: 'git-network',
    target: { kind: 'tab', index: 2 },
  },
  {
    id: 'network',
    title: 'My Connections',
    body: 'Send and accept connection requests to grow your construction network.',
    icon: 'people',
    target: { kind: 'tab', index: 3 },
  },
  {
    id: 'messages',
    title: 'Messages',
    body: 'Chat with your connections, share images and keep project talks in one place.',
    icon: 'chatbubble-ellipses',
    target: { kind: 'tab', index: 4 },
  },
  {
    id: 'profile',
    title: 'Your profile',
    body: 'Tap your photo for your profile, projects, plans and settings.',
    icon: 'person-circle',
    target: { kind: 'header-profile' },
  },
];

/** Consumers' tour, on Find Connections (where they land after signup):
 *  how to find and hire the right professional. The keys match the
 *  elements ConnectRolePickerScreen measures. */
export const CONSUMER_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Find the right people',
    body: 'Planning to build or renovate? We will help you find trusted professionals in four quick steps.',
    icon: 'home',
    target: { kind: 'none' },
  },
  {
    id: 'roles',
    title: 'Who do you need?',
    body: 'Start by tapping the kind of professional you are looking for: a consultant, builder, vendor or contractor.',
    icon: 'people',
    target: { kind: 'element', key: 'roles' },
  },
  {
    id: 'steps',
    title: 'Four quick steps',
    body: 'Then pick your location, project type and specialty. We narrow the list down as you go.',
    icon: 'list',
    target: { kind: 'element', key: 'steps' },
  },
  {
    id: 'search',
    title: 'Know the role already?',
    body: 'Search by name, like "interior" or "materials", to jump straight to it.',
    icon: 'search',
    target: { kind: 'element', key: 'search' },
  },
  {
    id: 'profile',
    title: 'Your account',
    body: 'Tap your photo for your saved connections, messages and settings.',
    icon: 'person-circle',
    target: { kind: 'header-profile' },
  },
];
