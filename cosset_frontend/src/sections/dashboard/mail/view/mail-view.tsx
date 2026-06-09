'use client';

import { useRef, useEffect, useCallback } from 'react';

import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { markMailAsRead, useGetMail, useGetMails, useGetLabels } from 'src/actions/mail';

import { Layout } from '../layout';
import { MailNav } from '../mail-nav';
import { MailList } from '../mail-list';
import { MailHeader } from '../mail-header';
import { MailCompose } from '../mail-compose';
import { MailDetails } from '../mail-details';

// ----------------------------------------------------------------------

const LABEL_INDEX = 'inbox';

export function MailView() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const selectedLabelId = searchParams.get('label') ?? LABEL_INDEX;

  const selectedMailId = searchParams.get('id') ?? '';

  const mdUp = useResponsive('up', 'md');

  const openNav = useBoolean();

  const openMail = useBoolean();

  const openCompose = useBoolean();

  const markedReadRef = useRef<Set<string>>(new Set());

  const { labels, labelsLoading, labelsEmpty } = useGetLabels();

  const { mails, mailsLoading, mailsError, mailsEmpty } = useGetMails(selectedLabelId);

  const { mail, mailLoading, mailError } = useGetMail(selectedMailId);

  const firstMailId = mails.allIds[0] || '';

  const handleToggleCompose = useCallback(() => {
    if (openNav.value) {
      openNav.onFalse();
    }
    openCompose.onToggle();
  }, [openCompose, openNav]);

  const handleClickLabel = useCallback(
    (labelId: string) => {
      if (!mdUp) {
        openNav.onFalse();
      }

      if (labelId) {
        const href =
          labelId !== LABEL_INDEX
            ? `${paths.dashboard.mail}?label=${labelId}`
            : paths.dashboard.mail;
        router.push(href);
      }
    },
    [openNav, router, mdUp]
  );

  const handleClickMail = useCallback(
    (mailId: string) => {
      if (!mdUp) {
        openMail.onFalse();
      }

      const href =
        selectedLabelId !== LABEL_INDEX
          ? `${paths.dashboard.mail}?id=${mailId}&label=${selectedLabelId}`
          : `${paths.dashboard.mail}?id=${mailId}`;

      router.push(href);
    },
    [openMail, router, selectedLabelId, mdUp]
  );

  const handleMailDeleted = useCallback(
    (deletedMailId: string) => {
      const remainingIds = mails.allIds.filter((id) => id !== deletedMailId);
      const nextMailId = remainingIds[0];

      if (nextMailId) {
        handleClickMail(nextMailId);
        return;
      }

      const href =
        selectedLabelId !== LABEL_INDEX
          ? `${paths.dashboard.mail}?label=${selectedLabelId}`
          : paths.dashboard.mail;
      router.push(href);
    },
    [handleClickMail, mails.allIds, router, selectedLabelId],
  );

  useEffect(() => {
    if (mailsError || mailError) {
      router.push(paths.dashboard.mail);
    }
  }, [mailError, mailsError, router]);

  useEffect(() => {
    if (!selectedMailId && firstMailId) {
      handleClickMail(firstMailId);
    }
  }, [firstMailId, handleClickMail, selectedMailId]);

  useEffect(() => {
    if (!selectedMailId) {
      return;
    }

    const listMail = mails.byId[selectedMailId];
    if (!listMail?.isUnread || markedReadRef.current.has(selectedMailId)) {
      return;
    }

    markedReadRef.current.add(selectedMailId);

    markMailAsRead(selectedMailId, listMail).catch(() => {
      markedReadRef.current.delete(selectedMailId);
    });
  }, [mails.byId, selectedMailId]);

  useEffect(() => {
    if (openCompose.value) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [openCompose.value]);

  return (
    <>
      <DashboardContent
        maxWidth={false}
        sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}
      >
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Mail
        </Typography>

        <Layout
          sx={{
            p: 1,
            borderRadius: 2,
            flex: '1 1 auto',
            bgcolor: 'background.neutral',
          }}
          slots={{
            header: (
              <MailHeader
                onOpenNav={openNav.onTrue}
                onOpenMail={mailsEmpty ? undefined : openMail.onTrue}
                sx={{ display: { md: 'none' } }}
              />
            ),
            nav: (
              <MailNav
                labels={labels}
                empty={labelsEmpty}
                loading={labelsLoading}
                openNav={openNav.value}
                onCloseNav={openNav.onFalse}
                selectedLabelId={selectedLabelId}
                handleClickLabel={handleClickLabel}
                onToggleCompose={handleToggleCompose}
              />
            ),
            list: (
              <MailList
                mails={mails}
                empty={mailsEmpty}
                loading={mailsLoading || labelsLoading}
                openMail={openMail.value}
                onCloseMail={openMail.onFalse}
                onClickMail={handleClickMail}
                selectedLabelId={selectedLabelId}
                selectedMailId={selectedMailId}
              />
            ),
            details: (
              <MailDetails
                mail={mail}
                empty={mailsEmpty}
                loading={mailsLoading || mailLoading}
                renderLabel={(id: string) => labels.filter((label) => label.id === id)[0]}
                onReplySent={() => router.push(`${paths.dashboard.mail}?label=sent`)}
                onDeleted={handleMailDeleted}
              />
            ),
          }}
        />
      </DashboardContent>

      {openCompose.value && (
        <MailCompose
          onCloseCompose={openCompose.onFalse}
          onSent={() => router.push(`${paths.dashboard.mail}?label=sent`)}
        />
      )}
    </>
  );
}
