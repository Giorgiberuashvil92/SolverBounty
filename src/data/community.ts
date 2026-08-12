export type CommunityMember = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  role: string;
};

export const COACH = {
  name: 'AI Coach',
  title: 'Your poker mentor',
  initials: 'PC',
} as const;

export const COMMUNITY: CommunityMember[] = [
  { id: '1', name: 'Nika', initials: 'N', tone: '#7c3aed', role: 'Grinder' },
  { id: '2', name: 'Ana', initials: 'A', tone: '#a855f7', role: 'MTT' },
  { id: '3', name: 'Luka', initials: 'L', tone: '#c026d3', role: 'Cash' },
  { id: '4', name: 'Mari', initials: 'M', tone: '#9333ea', role: 'Study' },
  { id: '5', name: 'Gio', initials: 'G', tone: '#db2777', role: 'Spins' },
  { id: '6', name: 'Saba', initials: 'S', tone: '#6d28d9', role: 'Coach circle' },
  { id: '7', name: 'Tamo', initials: 'T', tone: '#d946ef', role: 'Ranges' },
  { id: '8', name: 'Dato', initials: 'D', tone: '#8b5cf6', role: 'Live' },
];
