import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Portal from '@mui/material/Portal';
import Typography from '@mui/material/Typography';

import { filterEmoticons } from 'src/constants/emoticons';

import type { Editor } from '@tiptap/react';
import type { EmoticonOption } from 'src/constants/emoticons';

// ----------------------------------------------------------------------

type SuggestionState = {
  query: string;
  range: { from: number; to: number };
  items: EmoticonOption[];
  selectedIndex: number;
};

type VirtualCaretAnchor = {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
};

function getSuggestionState(editor: Editor): Omit<SuggestionState, 'selectedIndex'> | null {
  const { from, empty } = editor.state.selection;

  if (!empty || !editor.isEditable) {
    return null;
  }

  const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\0', '\0');
  const match = textBefore.match(/:([a-z]*)$/i);

  if (!match) {
    return null;
  }

  const query = match[1].toLowerCase();
  const items = filterEmoticons(query);

  return {
    query,
    range: { from: from - match[0].length, to: from },
    items,
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

// ----------------------------------------------------------------------

type Props = {
  editor: Editor | null;
};

export function EmoticonSuggestion({ editor }: Props) {
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

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(option.value)
        .run();

      closeSuggestion();
    },
    [closeSuggestion, editor]
  );

  const syncSuggestion = useCallback(() => {
    if (!editor) {
      closeSuggestion();
      return;
    }

    const next = getSuggestionState(editor);

    if (!next) {
      closeSuggestion();
      return;
    }

    setPositionTick((tick) => tick + 1);
    setState((current) => {
      const keepSelection = current?.query === next.query && current?.range.to === next.range.to;
      const selectedIndex = keepSelection
        ? Math.min(current.selectedIndex, Math.max(next.items.length - 1, 0))
        : 0;

      return {
        ...next,
        selectedIndex,
      };
    });
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

  useEffect(() => {
    if (!editor || !state) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = stateRef.current;

      if (!current) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
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
          insertEmoticon(option);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeSuggestion();
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown, true);

    return () => dom.removeEventListener('keydown', handleKeyDown, true);
  }, [closeSuggestion, editor, insertEmoticon, state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [state?.selectedIndex, state?.items.length]);

  if (!editor || !state || !caretAnchor) {
    return null;
  }

  return (
    <Portal>
      <Popper
        open
        anchorEl={caretAnchor as unknown as HTMLElement}
        placement="right-start"
        popperOptions={{
          strategy: 'fixed',
        }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [8, 0],
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['left-start', 'bottom-start', 'top-start'],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          },
        ]}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
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
            {state.items.length === 0 ? (
              <Typography variant="body2" sx={{ px: 1.5, py: 1, color: 'text.secondary' }}>
                No emoticons found
              </Typography>
            ) : (
              state.items.map((option, index) => {
                const selected = index === state.selectedIndex;

                return (
                  <Box
                    key={option.shortcut}
                    data-selected={selected ? 'true' : undefined}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertEmoticon(option);
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
                    <Box component="span" sx={{ fontSize: 20, lineHeight: 1, width: 24, textAlign: 'center' }}>
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
      </Popper>
    </Portal>
  );
}
