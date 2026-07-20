import type { IChatParticipant } from 'src/types/chat';

import { useRef, useMemo, useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today } from 'src/utils/format-time';

import { sendMessage, createConversation } from 'src/actions/chat';

import { Iconify } from 'src/components/dashboard/iconify';
import {
  EmoticonPickerButton,
  InputEmoticonSuggestion,
  insertTextAtSelection,
} from 'src/components/dashboard/emoticon-picker';

import { useAuthContext } from 'src/auth/hooks';

import { initialConversation } from './utils/initial-conversation';

// ----------------------------------------------------------------------

type Props = {
  disabled: boolean;
  recipients: IChatParticipant[];
  selectedConversationId: string;
  onAddRecipients: (recipients: IChatParticipant[]) => void;
};

export function ChatMessageInput({
  disabled,
  recipients,
  onAddRecipients,
  selectedConversationId,
}: Props) {
  const router = useRouter();

  const { user } = useAuthContext();

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  const myContact = useMemo(
    () => ({
      id: `${user?.id}`,
      role: `${user?.role}`,
      email: `${user?.email}`,
      address: `${user?.address}`,
      name: `${user?.displayName}`,
      lastActivity: today(),
      avatarUrl: `${user?.photoURL}`,
      phoneNumber: `${user?.phoneNumber}`,
      status: 'online' as 'online' | 'offline' | 'alway' | 'busy',
    }),
    [user]
  );

  const { messageData, conversationData } = initialConversation({
    message,
    recipients,
    me: myContact,
  });

  const handleAttach = useCallback(() => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  }, []);

  const applyMessageValue = useCallback((nextValue: string, nextCaret?: number) => {
    setMessage(nextValue);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      const caret = typeof nextCaret === 'number' ? nextCaret : nextValue.length;
      input.setSelectionRange(caret, caret);
    });
  }, []);

  const handleChangeMessage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  }, []);

  const handleInsertEmoticon = useCallback(
    (emoticon: string) => {
      const input = inputRef.current;
      const { nextValue, nextCaret } = insertTextAtSelection(
        message,
        emoticon,
        input?.selectionStart,
        input?.selectionEnd
      );

      applyMessageValue(nextValue, nextCaret);
    },
    [applyMessageValue, message]
  );

  const handleSuggestionChange = useCallback(
    (nextValue: string, nextCaret: number) => {
      applyMessageValue(nextValue, nextCaret);
    },
    [applyMessageValue]
  );

  const handleSendMessage = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }

      // Suggestion panel handles Enter for selecting an emoticon.
      if (suggestionOpen) {
        return;
      }

      if (!message.trim()) {
        return;
      }

      event.preventDefault();

      try {
        if (selectedConversationId) {
          await sendMessage(selectedConversationId, messageData);
        } else {
          const res = await createConversation(conversationData);
          router.push(`${paths.dashboard.chat}?id=${res.conversation.id}`);

          onAddRecipients([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setMessage('');
      }
    },
    [
      conversationData,
      message,
      messageData,
      onAddRecipients,
      router,
      selectedConversationId,
      suggestionOpen,
    ]
  );

  return (
    <>
      <InputBase
        name="chat-message"
        id="chat-message-input"
        inputRef={inputRef}
        value={message}
        onKeyDown={handleSendMessage}
        onChange={handleChangeMessage}
        placeholder="Type a message"
        disabled={disabled}
        startAdornment={
          <EmoticonPickerButton
            disabled={disabled}
            onSelect={handleInsertEmoticon}
            tooltip="Insert emoticon"
          />
        }
        endAdornment={
          <Stack direction="row" sx={{ flexShrink: 0 }}>
            <IconButton onClick={handleAttach} disabled={disabled}>
              <Iconify icon="solar:gallery-add-bold" />
            </IconButton>
            <IconButton onClick={handleAttach} disabled={disabled}>
              <Iconify icon="eva:attach-2-fill" />
            </IconButton>
            <IconButton disabled={disabled}>
              <Iconify icon="solar:microphone-bold" />
            </IconButton>
          </Stack>
        }
        sx={{
          px: 1,
          height: 56,
          flexShrink: 0,
          borderTop: (theme) => `solid 1px ${theme.vars.palette.divider}`,
        }}
      />

      <InputEmoticonSuggestion
        inputRef={inputRef}
        value={message}
        disabled={disabled}
        onChange={handleSuggestionChange}
        onOpenChange={setSuggestionOpen}
      />

      <input type="file" ref={fileRef} style={{ display: 'none' }} />
    </>
  );
}
