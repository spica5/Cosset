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
