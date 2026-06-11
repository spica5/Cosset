'use client';

import { useEffect } from 'react';

import { MAIL_WRITING_FONTS_STYLESHEET } from 'src/constants/mail-writing-fonts';

const STYLE_LINK_ID = 'mail-writing-fonts';

export function MailWritingFonts() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_LINK_ID)) {
      return undefined;
    }

    const link = document.createElement('link');
    link.id = STYLE_LINK_ID;
    link.rel = 'stylesheet';
    link.href = MAIL_WRITING_FONTS_STYLESHEET;
    document.head.appendChild(link);

    return () => {
      document.getElementById(STYLE_LINK_ID)?.remove();
    };
  }, []);

  return null;
}
