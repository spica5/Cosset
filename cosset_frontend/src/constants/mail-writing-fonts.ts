export type MailWritingFontOption = {
  label: string;
  value: string;
};

export const MAIL_WRITING_FONTS: MailWritingFontOption[] = [
  { label: 'Default', value: '' },
  { label: 'Classic Letter', value: 'Lora, Georgia, serif' },
  { label: 'Warm Serif', value: 'Merriweather, Georgia, serif' },
  { label: 'Handwritten', value: 'Caveat, "Segoe Script", cursive' },
  { label: 'Flowing Script', value: '"Dancing Script", cursive' },
  { label: 'Notebook', value: '"Patrick Hand", "Comic Sans MS", cursive' },
  { label: 'Typewriter', value: '"Courier New", Courier, monospace' },
  { label: 'Clean Sans', value: 'Inter, Helvetica, Arial, sans-serif' },
];

export const MAIL_INK_COLORS = [
  { label: 'Black', value: '#1a1a1a' },
  { label: 'Ink blue', value: '#1e3a8a' },
  { label: 'Burgundy', value: '#7f1d1d' },
  { label: 'Forest', value: '#14532d' },
  { label: 'Plum', value: '#581c87' },
  { label: 'Sepia', value: '#78350f' },
] as const;

export const MAIL_WRITING_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Dancing+Script:wght@400;600&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Patrick+Hand&display=swap';
