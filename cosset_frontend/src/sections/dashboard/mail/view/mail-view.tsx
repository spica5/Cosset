'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
import { useDebouncedValue } from 'src/hooks/use-debounced-value';
import { useMailLayoutMode } from 'src/hooks/use-mail-layout-mode';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { useSettingsContext } from 'src/components/dashboard/settings';

import { markMailAsRead, useGetMail, useGetMails, useGetLabels } from 'src/actions/mail';

import { Layout } from '../layout';
import { MailNav } from '../mail-nav';
import { MailList } from '../mail-list';
import { MailHeader } from '../mail-header';
import { MailCompose } from '../mail-compose';
import { MailDetails } from '../mail-details';
import { MailTopBar } from '../mail-top-bar';
import { MailNavHorizontal } from '../mail-nav-horizontal';

// ----------------------------------------------------------------------

const LABEL_INDEX = 'inbox';

type MailUrlOptions = {
  label?: string;
  id?: string;
  q?: string;
};

function buildMailUrl({ label = LABEL_INDEX, id, q }: MailUrlOptions = {}) {
  const params = new URLSearchParams();

  if (label !== LABEL_INDEX) {
    params.set('label', label);
  }

  if (id) {
    params.set('id', id);
  }

  if (q?.trim()) {
    params.set('q', q.trim());
  }

  const query = params.toString();
  return query ? `${paths.dashboard.mail}?${query}` : paths.dashboard.mail;
}

export function MailView() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const selectedLabelId = searchParams.get('label') ?? LABEL_INDEX;

  const selectedMailId = searchParams.get('id') ?? '';

  const urlSearchQuery = searchParams.get('q') ?? '';

  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const mdUp = useResponsive('up', 'md');

  const { layoutMode, setMailLayoutMode } = useMailLayoutMode();

  const settings = useSettingsContext();
  const isNavHorizontal = settings.navLayout === 'horizontal';

  const isHorizontal = layoutMode === 'horizontal';

  const openNav = useBoolean();

  const openMail = useBoolean();

  const openCompose = useBoolean();

  const markedReadRef = useRef<Set<string>>(new Set());

  const { labels, labelsLoading, labelsEmpty } = useGetLabels();

  const { mails, mailsLoading, mailsError, mailsEmpty } = useGetMails(
    selectedLabelId,
    debouncedSearchQuery
  );

  const { mail, mailLoading, mailError } = useGetMail(selectedMailId);

  const firstMailId = mails.allIds[0] || '';

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

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
        router.push(
          buildMailUrl({
            label: labelId,
            q: debouncedSearchQuery,
          })
        );
      }
    },
    [debouncedSearchQuery, openNav, router, mdUp]
  );

  const handleClickMail = useCallback(
    (mailId: string) => {
      if (!mdUp) {
        openMail.onFalse();
      }

      router.push(
        buildMailUrl({
          label: selectedLabelId,
          id: mailId,
          q: debouncedSearchQuery,
        })
      );
    },
    [debouncedSearchQuery, openMail, router, selectedLabelId, mdUp]
  );

  const handleMailDeleted = useCallback(
    (deletedMailId: string) => {
      const remainingIds = mails.allIds.filter((id) => id !== deletedMailId);
      const nextMailId = remainingIds[0];

      if (nextMailId) {
        handleClickMail(nextMailId);
        return;
      }

      router.push(
        buildMailUrl({
          label: selectedLabelId,
          q: debouncedSearchQuery,
        })
      );
    },
    [debouncedSearchQuery, handleClickMail, mails.allIds, router, selectedLabelId]
  );

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    const nextUrl = buildMailUrl({
      label: selectedLabelId,
      id: selectedMailId || undefined,
      q: debouncedSearchQuery,
    });

    const currentUrl = buildMailUrl({
      label: selectedLabelId,
      id: selectedMailId || undefined,
      q: urlSearchQuery,
    });

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl);
    }
  }, [debouncedSearchQuery, router, selectedLabelId, selectedMailId, urlSearchQuery]);

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
    if (!selectedMailId || !mails.allIds.length) {
      return;
    }

    if (!mails.byId[selectedMailId]) {
      handleClickMail(mails.allIds[0]);
    }
  }, [handleClickMail, mails.allIds, mails.byId, selectedMailId]);

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
        sx={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          height: {
            xs: 'calc(100dvh - var(--layout-header-mobile-height) - var(--layout-dashboard-content-pt) - var(--layout-dashboard-content-pb))',
            lg: isNavHorizontal
              ? 'calc(100dvh - var(--layout-header-desktop-height) - var(--layout-nav-horizontal-height) - var(--layout-dashboard-content-pt) - var(--layout-dashboard-content-pb))'
              : 'calc(100dvh - var(--layout-header-desktop-height) - var(--layout-dashboard-content-pt) - var(--layout-dashboard-content-pb))',
          },
        }}
      >
        <Layout
          layoutMode={layoutMode}
          sx={{
            p: isHorizontal ? 0 : 1,
            borderRadius: 2,
            flex: '1 1 0',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: isHorizontal ? 'transparent' : 'background.neutral',
          }}
          slots={{
            topBar: (
              <MailTopBar
                layoutMode={layoutMode}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onToggleLayout={() =>
                  setMailLayoutMode(layoutMode === 'horizontal' ? 'sidebar' : 'horizontal')
                }
                onSetLayoutMode={setMailLayoutMode}
                onToggleCompose={handleToggleCompose}
              />
            ),
            header: (
              <MailHeader
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onOpenNav={openNav.onTrue}
                onOpenMail={mailsEmpty ? undefined : openMail.onTrue}
                hideSearch={!isHorizontal}
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
            navHorizontal: (
              <MailNavHorizontal
                labels={labels}
                selectedLabelId={selectedLabelId}
                onSelectLabel={handleClickLabel}
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
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                hideSearch
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
