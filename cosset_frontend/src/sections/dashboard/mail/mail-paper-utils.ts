import {
  DEFAULT_MAIL_PAPER_STYLE,
  isMailPaperStyleId,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';

// ----------------------------------------------------------------------

const PAPER_COMMENT_RE = /^<!--\s*mail-paper:([\w-]+)\s*-->\s*/i;

export function extractMailPaperStyle(message: string): {
  paperStyle: MailPaperStyleId;
  content: string;
} {
  const match = message.match(PAPER_COMMENT_RE);
  if (!match) {
    return { paperStyle: DEFAULT_MAIL_PAPER_STYLE, content: message };
  }

  const styleId = match[1];
  return {
    paperStyle: isMailPaperStyleId(styleId) ? styleId : DEFAULT_MAIL_PAPER_STYLE,
    content: message.slice(match[0].length),
  };
}

export function resolveMailPaperStyle(
  message: string,
  paperStyle?: MailPaperStyleId | string | null,
): MailPaperStyleId {
  const fromComment = extractMailPaperStyle(message);
  if (message.match(PAPER_COMMENT_RE)) {
    return fromComment.paperStyle;
  }

  if (paperStyle && isMailPaperStyleId(paperStyle)) {
    return paperStyle;
  }

  return DEFAULT_MAIL_PAPER_STYLE;
}

export function resolveMailMessageContent(
  message: string,
  paperStyle?: MailPaperStyleId | string | null,
): string {
  if (paperStyle && isMailPaperStyleId(paperStyle)) {
    return extractMailPaperStyle(message).content;
  }

  return extractMailPaperStyle(message).content;
}
