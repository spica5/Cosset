import type { IChatConversation } from 'src/types/chat';

import { formatCallHistoryNavText, parseCallHistoryBody } from './call-history';

// ----------------------------------------------------------------------

type Props = {
  currentUserId: string;
  conversation: IChatConversation;
};

export function getNavItem({ currentUserId, conversation }: Props) {
  const { messages, participants } = conversation;

  const participantsInConversation = participants.filter(
    (participant) => participant.id !== currentUserId
  );

  const lastMessage = messages[messages.length - 1];

  const group = participantsInConversation.length > 1;

  const displayName = participantsInConversation.map((participant) => participant.name).join(', ');

  const hasOnlineInGroup = group
    ? participantsInConversation.map((item) => item.status).includes('online')
    : false;

  let displayText = '';

  if (lastMessage?.body) {
    const sender = lastMessage.senderId === currentUserId ? 'You: ' : '';

    let message = lastMessage.body;
    if (lastMessage.contentType === 'image') {
      message = 'Sent a photo';
    } else if (lastMessage.contentType === 'call') {
      const payload = parseCallHistoryBody(lastMessage.body);
      message = payload ? formatCallHistoryNavText(payload) : 'Call';
    }

    displayText = `${sender}${message}`;
  } else {
    displayText = 'No messages yet';
  }

  return {
    group,
    displayName,
    displayText,
    participants: participantsInConversation,
    lastActivity: lastMessage?.createdAt || new Date().toISOString(),
    hasOnlineInGroup,
  };
}
