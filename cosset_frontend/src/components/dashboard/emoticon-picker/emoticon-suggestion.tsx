'use client';

import type { Editor } from '@tiptap/react';
import type { EmoticonOption } from 'src/constants/emoticons';
import type { PopperPlacementType } from '@mui/material/Popper';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Portal from '@mui/material/Portal';
import Typography from '@mui/material/Typography';

import { filterEmoticons } from 'src/constants/emoticons';

// ----------------------------------------------------------------------

type SuggestionRange = { from: number; to: number };

type SuggestionState = {
  query: string;
  range: SuggestionRange;
  items: EmoticonOption[];
  selectedIndex: number;
};

type VirtualCaretAnchor = {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
};

function matchColonQuery(
  textBeforeCaret: string
): { query: string; matchLength: number } | null {
  const match = textBeforeCaret.match(/:([a-z]*)$/i);
  if (!match) {
    return null;
  }

  return {
    query: match[1].toLowerCase(),
    matchLength: match[0].length,
  };
}

function createCaretAnchor(editor: Editor, pos: number): VirtualCaretAnchor {
  return {
    contextElement: editor.view.dom,
    getBoundingClientRect: () => {
      const coords = editor.view.coordsAtPos(pos);
      const height = Math.max(coords.bottom - coords.top, 20);
      const width = Math.max(coords.right - coords.left, 1);

      return new DOMRect(coords.left, coords.top, width, height);
    },
  };
}

const INPUT_CARET_STYLE_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
] as const;

/** Mirror the input/textarea to measure caret viewport coordinates. */
function getInputCaretRect(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number
): DOMRect {
  const isInput = element.tagName.toLowerCase() === 'input';
  const computed = window.getComputedStyle(element);
  const mirror = document.createElement('div');
  const marker = document.createElement('span');

  mirror.setAttribute('data-emoticon-caret-mirror', 'true');
  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: isInput ? 'pre' : 'pre-wrap',
    wordWrap: 'break-word',
    top: '0',
    left: '-9999px',
  });

  INPUT_CARET_STYLE_PROPS.forEach((prop) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mirror.style as any)[prop] = computed[prop as keyof CSSStyleDeclaration];
  });

  // Match the visible content box so wrapping lines up with the real textarea.
  mirror.style.width = `${element.clientWidth}px`;

  if (isInput) {
    mirror.style.overflow = 'hidden';
    mirror.style.height = `${element.clientHeight}px`;
    mirror.style.whiteSpace = 'nowrap';
  }

  const value = element.value.slice(0, position);
  mirror.textContent = value;

  // Trailing newline needs a filler so the caret sits on the next line.
  if (value.endsWith('\n')) {
    mirror.appendChild(document.createTextNode('\u200b'));
  }

  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const elementRect = element.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const top =
    elementRect.top +
    (markerRect.top - mirrorRect.top) -
    element.scrollTop +
    Number.parseFloat(computed.borderTopWidth || '0');
  const left =
    elementRect.left +
    (markerRect.left - mirrorRect.left) -
    element.scrollLeft +
    Number.parseFloat(computed.borderLeftWidth || '0');
  const height = Math.max(markerRect.height || Number.parseFloat(computed.lineHeight) || 20, 16);

  mirror.remove();

  return new DOMRect(left, top, 1, height);
}

function createInputCaretAnchor(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number
): VirtualCaretAnchor {
  return {
    contextElement: element,
    getBoundingClientRect: () => getInputCaretRect(element, position),
  };
}

type SuggestionListProps = {
  items: EmoticonOption[];
  selectedIndex: number;
  listRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (option: EmoticonOption) => void;
};

function EmoticonSuggestionList({ items, selectedIndex, listRef, onSelect }: SuggestionListProps) {
  return (
    <Paper
      elevation={8}
      sx={{
        width: 220,
        maxHeight: 240,
        overflow: 'hidden',
        border: (theme) => `1px solid ${theme.vars.palette.divider}`,
      }}
    >
      <Box
        ref={listRef}
        sx={{
          maxHeight: 240,
          overflowY: 'auto',
          py: 0.5,
        }}
      >
        {items.length === 0 ? (
          <Typography variant="body2" sx={{ px: 1.5, py: 1, color: 'text.secondary' }}>
            No emoticons found
          </Typography>
        ) : (
          items.map((option, index) => {
            const selected = index === selectedIndex;

            return (
              <Box
                key={option.shortcut}
                data-selected={selected ? 'true' : undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  cursor: 'pointer',
                  bgcolor: selected ? 'action.selected' : 'transparent',
                  '&:hover': {
                    bgcolor: selected ? 'action.selected' : 'action.hover',
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{ fontSize: 20, lineHeight: 1, width: 24, textAlign: 'center' }}
                >
                  {option.value}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    :{option.shortcut}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
}

type SuggestionPopperProps = {
  anchorEl: HTMLElement | VirtualCaretAnchor;
  placement: PopperPlacementType;
  offset: [number, number];
  fallbackPlacements: PopperPlacementType[];
  strategy?: 'absolute' | 'fixed';
  children: React.ReactNode;
};

function EmoticonSuggestionPopper({
  anchorEl,
  placement,
  offset,
  fallbackPlacements,
  strategy = 'absolute',
  children,
}: SuggestionPopperProps) {
  return (
    <Portal>
      <Popper
        open
        anchorEl={anchorEl as HTMLElement}
        placement={placement}
        popperOptions={{ strategy }}
        modifiers={[
          {
            name: 'offset',
            options: { offset },
          },
          {
            name: 'flip',
            options: { fallbackPlacements },
          },
          {
            name: 'preventOverflow',
            options: { padding: 8 },
          },
        ]}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        {children}
      </Popper>
    </Portal>
  );
}

function useSuggestionKeyboard(
  target: HTMLElement | null,
  state: SuggestionState | null,
  setState: React.Dispatch<React.SetStateAction<SuggestionState | null>>,
  insertEmoticon: (option: EmoticonOption) => void,
  closeSuggestion: () => void
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!target || !state) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setState((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex: Math.min(prev.selectedIndex + 1, Math.max(prev.items.length - 1, 0)),
              }
            : prev
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setState((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex: Math.max(prev.selectedIndex - 1, 0),
              }
            : prev
        );
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const option = current.items[current.selectedIndex];
        if (option) {
          event.preventDefault();
          event.stopPropagation();
          insertEmoticon(option);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSuggestion();
      }
    };

    target.addEventListener('keydown', handleKeyDown, true);
    return () => target.removeEventListener('keydown', handleKeyDown, true);
  }, [closeSuggestion, insertEmoticon, setState, state, target]);
}

function useScrollSelectedIntoView(
  listRef: React.RefObject<HTMLDivElement | null>,
  state: SuggestionState | null
) {
  useEffect(() => {
    if (!state) {
      return;
    }

    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [listRef, state?.selectedIndex, state?.items.length, state]);
}

function mergeSuggestionState(
  current: SuggestionState | null,
  next: Omit<SuggestionState, 'selectedIndex'>
): SuggestionState {
  const keepSelection =
    current?.query === next.query &&
    current?.range.from === next.range.from &&
    current?.range.to === next.range.to;

  return {
    ...next,
    selectedIndex: keepSelection
      ? Math.min(current.selectedIndex, Math.max(next.items.length - 1, 0))
      : 0,
  };
}

// ----------------------------------------------------------------------
// TipTap editor (`:` suggestions)
// ----------------------------------------------------------------------

function getEditorSuggestionState(editor: Editor): Omit<SuggestionState, 'selectedIndex'> | null {
  const { from, empty } = editor.state.selection;

  if (!empty || !editor.isEditable) {
    return null;
  }

  const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\0', '\0');
  const matched = matchColonQuery(textBefore);

  if (!matched) {
    return null;
  }

  return {
    query: matched.query,
    range: { from: from - matched.matchLength, to: from },
    items: filterEmoticons(matched.query),
  };
}

type EditorSuggestionProps = {
  editor: Editor | null;
};

/** `:` emoticon suggestions for TipTap editors (mail, blog, etc.). */
export function EmoticonSuggestion({ editor }: EditorSuggestionProps) {
  const [state, setState] = useState<SuggestionState | null>(null);
  const [positionTick, setPositionTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);

  stateRef.current = state;

  const closeSuggestion = useCallback(() => {
    setState(null);
  }, []);

  const insertEmoticon = useCallback(
    (option: EmoticonOption) => {
      if (!editor || !stateRef.current) {
        return;
      }

      const { range } = stateRef.current;

      editor.chain().focus().deleteRange(range).insertContent(option.value).run();
      closeSuggestion();
    },
    [closeSuggestion, editor]
  );

  const syncSuggestion = useCallback(() => {
    if (!editor) {
      closeSuggestion();
      return;
    }

    const next = getEditorSuggestionState(editor);

    if (!next) {
      closeSuggestion();
      return;
    }

    setPositionTick((tick) => tick + 1);
    setState((current) => mergeSuggestionState(current, next));
  }, [closeSuggestion, editor]);

  const caretAnchor = useMemo(() => {
    if (!editor || !state) {
      return null;
    }

    return createCaretAnchor(editor, state.range.to);
    // positionTick keeps the popper aligned while scrolling/resizing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, state?.range.to, positionTick]);

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const handleUpdate = () => {
      syncSuggestion();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, syncSuggestion]);

  useEffect(() => {
    if (!editor || !state) {
      return undefined;
    }

    const bumpPosition = () => {
      setPositionTick((tick) => tick + 1);
    };

    window.addEventListener('scroll', bumpPosition, true);
    window.addEventListener('resize', bumpPosition);

    return () => {
      window.removeEventListener('scroll', bumpPosition, true);
      window.removeEventListener('resize', bumpPosition);
    };
  }, [editor, state]);

  useSuggestionKeyboard(
    editor?.view.dom ?? null,
    state,
    setState,
    insertEmoticon,
    closeSuggestion
  );
  useScrollSelectedIntoView(listRef, state);

  if (!editor || !state || !caretAnchor) {
    return null;
  }

  return (
    <EmoticonSuggestionPopper
      anchorEl={caretAnchor}
      placement="right-start"
      offset={[8, 0]}
      fallbackPlacements={['left-start', 'bottom-start', 'top-start']}
      strategy="fixed"
    >
      <EmoticonSuggestionList
        items={state.items}
        selectedIndex={state.selectedIndex}
        listRef={listRef}
        onSelect={insertEmoticon}
      />
    </EmoticonSuggestionPopper>
  );
}

// ----------------------------------------------------------------------
// Plain input / textarea (`:` suggestions)
// ----------------------------------------------------------------------

function getInputSuggestionState(
  value: string,
  caret: number
): Omit<SuggestionState, 'selectedIndex'> | null {
  if (caret < 0 || caret > value.length) {
    return null;
  }

  const textBefore = value.slice(Math.max(0, caret - 50), caret);
  const matched = matchColonQuery(textBefore);

  if (!matched) {
    return null;
  }

  return {
    query: matched.query,
    range: { from: caret - matched.matchLength, to: caret },
    items: filterEmoticons(matched.query),
  };
}

type InputSuggestionProps = {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  disabled?: boolean;
  onChange: (nextValue: string, nextCaret: number) => void;
  /** Called when suggestion open state changes (e.g. to suppress Enter-to-send). */
  onOpenChange?: (open: boolean) => void;
};

/** `:` emoticon suggestions for plain inputs / textareas (Chat, notes, etc.). */
export function InputEmoticonSuggestion({
  inputRef,
  value,
  disabled,
  onChange,
  onOpenChange,
}: InputSuggestionProps) {
  const [state, setState] = useState<SuggestionState | null>(null);
  const [positionTick, setPositionTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const onOpenChangeRef = useRef(onOpenChange);

  stateRef.current = state;
  onOpenChangeRef.current = onOpenChange;

  const closeSuggestion = useCallback(() => {
    setState(null);
    onOpenChangeRef.current?.(false);
  }, []);

  const syncSuggestion = useCallback(() => {
    const input = inputRef.current;

    if (disabled || !input) {
      closeSuggestion();
      return;
    }

    const caret =
      typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
    const next = getInputSuggestionState(value, caret);

    if (!next) {
      closeSuggestion();
      return;
    }

    setPositionTick((tick) => tick + 1);
    setState((current) => mergeSuggestionState(current, next));
    // Only treat as "open" when there is something to select (so Enter can still send).
    onOpenChangeRef.current?.(next.items.length > 0);
  }, [closeSuggestion, disabled, inputRef, value]);

  const insertEmoticon = useCallback(
    (option: EmoticonOption) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }

      const nextValue = `${value.slice(0, current.range.from)}${option.value}${value.slice(current.range.to)}`;
      const nextCaret = current.range.from + option.value.length;

      onChange(nextValue, nextCaret);
      closeSuggestion();
    },
    [closeSuggestion, onChange, value]
  );

  const caretAnchor = useMemo(() => {
    const input = inputRef.current;
    if (!input || !state) {
      return null;
    }

    return createInputCaretAnchor(input, state.range.to);
    // positionTick keeps the popper aligned while scrolling/resizing/typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputRef, state?.range.to, positionTick]);

  useEffect(() => {
    // Defer so selectionStart is settled after controlled value updates.
    const frame = window.requestAnimationFrame(() => {
      syncSuggestion();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [syncSuggestion]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return undefined;
    }

    const handleSelectionChange = () => {
      syncSuggestion();
    };

    const handleDocumentSelectionChange = () => {
      if (document.activeElement === input) {
        syncSuggestion();
      }
    };

    input.addEventListener('click', handleSelectionChange);
    input.addEventListener('keyup', handleSelectionChange);
    input.addEventListener('select', handleSelectionChange);
    input.addEventListener('scroll', handleSelectionChange);
    document.addEventListener('selectionchange', handleDocumentSelectionChange);

    return () => {
      input.removeEventListener('click', handleSelectionChange);
      input.removeEventListener('keyup', handleSelectionChange);
      input.removeEventListener('select', handleSelectionChange);
      input.removeEventListener('scroll', handleSelectionChange);
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
    };
  }, [inputRef, syncSuggestion]);

  useEffect(() => {
    if (!state) {
      return undefined;
    }

    const bumpPosition = () => {
      setPositionTick((tick) => tick + 1);
    };

    window.addEventListener('scroll', bumpPosition, true);
    window.addEventListener('resize', bumpPosition);

    return () => {
      window.removeEventListener('scroll', bumpPosition, true);
      window.removeEventListener('resize', bumpPosition);
    };
  }, [state]);

  useSuggestionKeyboard(
    inputRef.current ?? null,
    state,
    setState,
    insertEmoticon,
    closeSuggestion
  );
  useScrollSelectedIntoView(listRef, state);

  if (disabled || !state || !caretAnchor) {
    return null;
  }

  return (
    <EmoticonSuggestionPopper
      anchorEl={caretAnchor}
      placement="bottom-start"
      offset={[0, 6]}
      fallbackPlacements={['top-start', 'bottom-end', 'top-end']}
      strategy="fixed"
    >
      <EmoticonSuggestionList
        items={state.items}
        selectedIndex={state.selectedIndex}
        listRef={listRef}
        onSelect={insertEmoticon}
      />
    </EmoticonSuggestionPopper>
  );
}
