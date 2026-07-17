export const CINEMA_SERIF = '"Playfair Display", "Times New Roman", Georgia, serif';
export const CINEMA_GOLD = '#D4B05A';
export const CINEMA_CREAM = '#F5E6C8';

export const cinemaPageShellSx = {
  minHeight: '100%',
  color: CINEMA_CREAM,
  position: 'relative' as const,
  overflow: 'hidden',
  borderRadius: { xs: 2, md: 3 },
  background: 'linear-gradient(180deg, #0B0705 0%, #1A100C 42%, #0B0705 100%)',
};

/** Floating dock buttons (audience / chat) on the cinema viewing page */
export const cinemaMobileFabSx = {
  width: 48,
  height: 48,
  bgcolor: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(212,176,90,0.35)',
  color: '#FFF8E7',
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
} as const;
