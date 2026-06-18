export const GLOBAL_EMOTICON_OPTIONS = [
  { label: 'Smile', value: '😀', shortcut: 'smile' },
  { label: 'Love', value: '😍', shortcut: 'love' },
  { label: 'Laugh', value: '😂', shortcut: 'laugh' },
  { label: 'Sad', value: '😢', shortcut: 'sad' },
  { label: 'Heart', value: '❤️', shortcut: 'heart' },
  { label: 'Party', value: '🎉', shortcut: 'party' },
  { label: 'Thanks', value: '🙏', shortcut: 'thanks' },
  { label: 'Cool', value: '😎', shortcut: 'cool' },
  { label: 'Surprised', value: '😮', shortcut: 'surprised' },
  { label: 'Thinking', value: '🤔', shortcut: 'thinking' },
  { label: 'Clap', value: '👏', shortcut: 'clap' },
  { label: 'Fire', value: '🔥', shortcut: 'fire' },
  { label: 'Like', value: '👍', shortcut: 'like' },
  { label: 'Cry', value: '😭', shortcut: 'cry' },
  { label: 'Angry', value: '😡', shortcut: 'angry' },
  { label: 'Wow', value: '😲', shortcut: 'wow' },
  { label: 'Kiss', value: '😘', shortcut: 'kiss' },
] as const;

export type EmoticonOption = (typeof GLOBAL_EMOTICON_OPTIONS)[number];

export function filterEmoticons(query: string): EmoticonOption[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [...GLOBAL_EMOTICON_OPTIONS];
  }

  return GLOBAL_EMOTICON_OPTIONS.filter(
    (option) =>
      option.shortcut.includes(normalized) || option.label.toLowerCase().includes(normalized)
  );
}
