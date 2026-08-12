export type TableTheme = {
    id: string;
    name: string;
    primaryColor: string;
    gradientColors: [string, string, string];
    borderColor: string;
  };
  
  export const TABLE_THEMES: TableTheme[] = [
    {
      id: 'classic_green',
      name: 'Classic Green',
      primaryColor: '#1A6B3C',
      gradientColors: ['#228B22', '#145A32', '#0E3A20'],
      borderColor: '#2ECC71',
    },
    {
      id: 'poker_blue',
      name: 'Poker Blue',
      primaryColor: '#1A4B8C',
      gradientColors: ['#1E56A0', '#163172', '#0D1B2A'],
      borderColor: '#4DA3FF',
    },
    {
      id: 'royal_red',
      name: 'Royal Red',
      primaryColor: '#8B1A1A',
      gradientColors: ['#A93226', '#641E16', '#340B0B'],
      borderColor: '#FF4D5E',
    },
    {
      id: 'midnight_dark',
      name: 'Midnight',
      primaryColor: '#2C3E50',
      gradientColors: ['#34495E', '#1C2833', '#0A1118'],
      borderColor: '#AAB7B8',
    },
  ];