export type AppTab = 'daily' | 'community' | 'coach' | 'reviews' | 'drills';

export type TabItem = {
  key: AppTab;
  label: string;
};

export const TABS: TabItem[] = [
  { key: 'daily', label: 'Today' },
  { key: 'community', label: 'Community' },
  { key: 'coach', label: 'Coach' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'drills', label: 'Drills' },
];
