'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { isUserAdmin } from 'src/auth/utils/role';
import { useAuthContext } from 'src/auth/hooks';

import {
  updateWebsiteTestingDisclosure,
  useGetWebsiteTestingDisclosure,
} from 'src/actions/website-testing-disclosure';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { WebsiteTestingDisclosureContent } from 'src/components/website-testing-disclosure/website-testing-disclosure-content';

import type { WebsiteTestingDisclosureSection } from 'src/content/website-testing-disclosure';

// ----------------------------------------------------------------------

function sectionsToEditorValue(sections: WebsiteTestingDisclosureSection[]) {
  return JSON.stringify(sections, null, 2);
}

function parseSectionsEditorValue(value: string): WebsiteTestingDisclosureSection[] {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error('Sections must be a JSON array');
  }
  return parsed as WebsiteTestingDisclosureSection[];
}

export function TestingDisclosureView() {
  const { user } = useAuthContext();
  const canEdit = isUserAdmin(user?.role);
  const { disclosure, disclosureLoading } = useGetWebsiteTestingDisclosure();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(disclosure.title);
  const [intro, setIntro] = useState(disclosure.intro);
  const [sectionsJson, setSectionsJson] = useState(sectionsToEditorValue(disclosure.sections));

  useEffect(() => {
    if (!editing) {
      setTitle(disclosure.title);
      setIntro(disclosure.intro);
      setSectionsJson(sectionsToEditorValue(disclosure.sections));
    }
  }, [disclosure, editing]);

  const handleStartEdit = () => {
    setTitle(disclosure.title);
    setIntro(disclosure.intro);
    setSectionsJson(sectionsToEditorValue(disclosure.sections));
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setTitle(disclosure.title);
    setIntro(disclosure.intro);
    setSectionsJson(sectionsToEditorValue(disclosure.sections));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sections = parseSectionsEditorValue(sectionsJson);
      if (!sections.length) {
        toast.error('Add at least one section');
        return;
      }

      await updateWebsiteTestingDisclosure({
        title: title.trim(),
        intro: intro.trim(),
        sections,
      });
      toast.success('Testing disclosure updated');
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update disclosure');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Website Testing Disclosure"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Settings', href: paths.dashboard.settings.root },
          { name: 'Testing Disclosure' },
        ]}
        action={
          canEdit ? (
            editing ? (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" color="inherit" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <LoadingButton
                  variant="contained"
                  loading={saving}
                  onClick={handleSave}
                  startIcon={<Iconify icon="solar:diskette-bold" />}
                >
                  Save update
                </LoadingButton>
              </Stack>
            ) : (
              <Button
                variant="contained"
                onClick={handleStartEdit}
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                Update content
              </Button>
            )
          ) : undefined
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          {disclosureLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : editing ? (
            <Stack spacing={2.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Update the Website Testing Disclosure content. Sections use JSON format
                (`title`, `paragraphs`, optional `bullets`).
              </Typography>
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                fullWidth
              />
              <TextField
                label="Intro"
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Sections (JSON)"
                value={sectionsJson}
                onChange={(event) => setSectionsJson(event.target.value)}
                fullWidth
                multiline
                minRows={16}
                InputProps={{
                  sx: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 13,
                  },
                }}
              />
              <Box>
                <Typography variant="caption" color="text.disabled">
                  Tip: Keep paragraph and bullet text clear. Saving replaces the live disclosure on
                  sign-up and Settings.
                </Typography>
              </Box>
            </Stack>
          ) : (
            <WebsiteTestingDisclosureContent content={disclosure} showUpdatedAt />
          )}
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
