// SlipGang Brand System
export const COLORS = {
  // Backgrounds
  bg: '#07090D',
  bgCard: '#0F1218',
  bgCardHover: '#161B23',
  bgInput: '#161B23',

  // Brand
  brand: '#F5A623',
  brandDark: '#D4890A',
  brandGlow: 'rgba(245, 166, 35, 0.25)',
  brandGradientStart: '#F5A623',
  brandGradientEnd: '#FF6B35',

  // Status
  winning: '#00D26A',
  winningBg: 'rgba(0, 210, 106, 0.12)',
  losing: '#FF4D6A',
  losingBg: 'rgba(255, 77, 106, 0.12)',
  pending: '#8B95A5',
  pendingBg: 'rgba(139, 149, 165, 0.12)',
  live: '#FF4D6A',

  // Text
  text: '#FFFFFF',
  textMid: '#8B95A5',
  textDim: '#505866',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',

  // Sportsbooks
  fanduel: '#1493FF',
  draftkings: '#53D337',
  betmgm: '#C4A44A',
  caesars: '#00833E',
  espnbet: '#FF4747',
  fanatics: '#E53D2E',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SPORTSBOOK_COLORS = {
  fanduel: COLORS.fanduel,
  draftkings: COLORS.draftkings,
  betmgm: COLORS.betmgm,
  caesars: COLORS.caesars,
  espnbet: COLORS.espnbet,
  fanatics: COLORS.fanatics,
};

export const SPORTSBOOK_NAMES = {
  fanduel: 'FanDuel',
  draftkings: 'DraftKings',
  betmgm: 'BetMGM',
  caesars: 'Caesars',
  espnbet: 'ESPN BET',
  fanatics: 'Fanatics',
};

export const STATUS_COLORS = {
  pending: COLORS.pending,
  winning: COLORS.winning,
  losing: COLORS.losing,
  won: COLORS.winning,
  lost: COLORS.losing,
  pushed: COLORS.pending,
  cashed_out: COLORS.brand,
};

export const PICK_STATUS_COLORS = {
  pending: COLORS.pending,
  live: COLORS.live,
  won: COLORS.winning,
  lost: COLORS.losing,
  pushed: COLORS.pending,
  void: COLORS.pending,
};

export const PICK_STATUS_LABELS = {
  pending: 'Pending',
  live: 'Live',
  won: 'Won',
  lost: 'Lost',
  pushed: 'Push',
  void: 'Void',
};
