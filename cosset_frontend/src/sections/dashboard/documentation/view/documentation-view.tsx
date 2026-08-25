'use client';

import type { DocumentationCategory, IDocumentationDocument } from 'src/types/documentation';

import { useMemo, useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import {
  deleteDocumentationDocument,
  setDocumentationFavorite,
  useGetDocumentationDocuments,
  useGetDocumentationUsage,
} from 'src/actions/documentation';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { DocumentationFormDialog } from '../documentation-form-dialog';
import { DocumentationThumb } from '../documentation-thumb';
import {
  DOCUMENTATION_SORT_OPTIONS,
  sortDocumentationDocuments,
  type DocumentationSortValue,
} from '../documentation-sort';
import {
  DOCUMENTATION_CATEGORY_OPTIONS,
  formatBytes,
  getDocumentationCategoryLabel,
  normalizeDocumentationCategory,
} from '../documentation-utils';

// ----------------------------------------------------------------------

type CategoryFilter = DocumentationCategory | 'all' | 'favorites';

type Props = {
  /** When set from a submenu route, documents are scoped to this purpose. */
  initialCategory?: DocumentationCategory | 'all' | 'favorites';
};

export function DocumentationView({ initialCategory = 'all' }: Props) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const canManage = !!user?.id;
  const routeCategory = initialCategory;

  const { documents, documentsLoading } = useGetDocumentationDocuments(user?.id);
  const { usage } = useGetDocumentationUsage(user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(routeCategory);
  const [sortBy, setSortBy] = useState<DocumentationSortValue>('latest');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<IDocumentationDocument | null>(null);
  const [savingFavoriteId, setSavingFavoriteId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    setCategoryFilter(routeCategory);
  }, [routeCategory]);

  const heading =
    routeCategory === 'all'
      ? 'Documentation'
      : routeCategory === 'favorites'
        ? 'Favorites'
        : getDocumentationCategoryLabel(routeCategory);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = documents.filter((document) => {
      if (categoryFilter === 'favorites' && !(document.isFavorite === 1)) {
        return false;
      }

      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'favorites' &&
        normalizeDocumentationCategory(document.category) !== categoryFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        document.title,
        document.description,
        document.originalFileName,
        document.fileType,
        getDocumentationCategoryLabel(document.category),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    return sortDocumentationDocuments(filtered, sortBy);
  }, [categoryFilter, documents, searchQuery, sortBy]);

  const handleOpenCreate = useCallback(() => {
    setEditingDocument(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((document: IDocumentationDocument) => {
    setEditingDocument(document);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingDocument(null);
  }, []);

  useEffect(() => {
    if (documentsLoading || !documents.length) {
      return;
    }

    const docId = Number(searchParams.get('docId'));
    if (!Number.isFinite(docId)) {
      return;
    }

    const match = documents.find((item) => item.id === docId);
    if (match) {
      handleOpenEdit(match);
    }
  }, [documents, documentsLoading, handleOpenEdit, searchParams]);

  const handleDelete = useCallback(
    async (document: IDocumentationDocument) => {
      const confirmed = window.confirm(`Delete "${document.title}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteDocumentationDocument(document.id, user?.id);
        toast.success('Document deleted');
      } catch (error) {
        console.error('Failed to delete document:', error);
        toast.error('Failed to delete document');
      }
    },
    [user?.id],
  );

  const handleToggleFavorite = useCallback(
    async (document: IDocumentationDocument) => {
      try {
        setSavingFavoriteId(document.id);
        await setDocumentationFavorite(document.id, !(document.isFavorite === 1), user?.id);
      } catch (error) {
        console.error('Failed to update favorite:', error);
        toast.error('Failed to update favorite');
      } finally {
        setSavingFavoriteId(null);
      }
    },
    [user?.id],
  );

  const handleOpenFile = useCallback(async (document: IDocumentationDocument) => {
    try {
      setOpeningId(document.id);
      const url = await getS3SignedUrl(document.fileUrl);
      if (!url) {
        toast.error('Could not open this file');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open document:', error);
      toast.error('Failed to open document');
    } finally {
      setOpeningId(null);
    }
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Documentation', href: paths.dashboard.documentation.root },
          ...(routeCategory === 'all' ? [] : [{ name: heading }]),
        ]}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenCreate}
            >
              Upload document
            </Button>
          ) : null
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle1">Your secure document space</Typography>
            <Typography variant="body2" color="text.secondary">
              Store files that matter for study, work, and life. Usage is measured by file size for
              future storage billing.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${usage.documentCount} documents`} variant="soft" color="default" />
            <Chip
              label={`${formatBytes(usage.totalBytes)} used`}
              variant="soft"
              color="primary"
            />
          </Stack>
        </Stack>
      </Card>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ md: 'center' }}
      >
        <TextField
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search documents..."
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        {routeCategory === 'all' ? (
          <TextField
            select
            label="Filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="favorites">Favorites</MenuItem>
            {DOCUMENTATION_CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Chip
            label={heading}
            variant="soft"
            color={routeCategory === 'favorites' ? 'warning' : 'primary'}
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
          />
        )}
        <TextField
          select
          label="Sort by"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as DocumentationSortValue)}
          sx={{ minWidth: { md: 180 } }}
        >
          {DOCUMENTATION_SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {documentsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredDocuments.length === 0 ? (
        <EmptyContent
          title={documents.length ? 'No matching documents' : 'No documents yet'}
          description={
            documents.length
              ? 'Try another search or filter.'
              : 'Upload certificates, notes, contracts, or anything important to keep online.'
          }
          action={
            canManage && !documents.length ? (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleOpenCreate}
                sx={{ mt: 2 }}
              >
                Upload your first document
              </Button>
            ) : null
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {filteredDocuments.map((document) => (
            <Card key={document.id} sx={{ p: 2 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ minWidth: 0, flex: { md: '1 1 280px' }, maxWidth: { md: 360 } }}
                >
                  <DocumentationThumb document={document} size={56} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {document.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {document.originalFileName || document.fileUrl}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={getDocumentationCategoryLabel(document.category)}
                        variant="soft"
                      />
                      <Chip
                        size="small"
                        label={String(document.fileType || 'file').toUpperCase()}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={formatBytes(Number(document.fileSizeBytes) || 0)}
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    flex: { md: '1 1 220px' },
                    minWidth: 0,
                    px: { md: 1 },
                    alignSelf: { md: 'stretch' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ mb: 0.5, fontWeight: 600, letterSpacing: 0.4 }}
                  >
                    Notes
                  </Typography>
                  <Typography
                    variant="body2"
                    color={document.description?.trim() ? 'text.secondary' : 'text.disabled'}
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {document.description?.trim() || 'No notes'}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'center' } }}
                >
                  <IconButton
                    onClick={() => handleToggleFavorite(document)}
                    disabled={savingFavoriteId === document.id}
                    color={document.isFavorite === 1 ? 'warning' : 'default'}
                  >
                    <Iconify
                      icon={
                        document.isFavorite === 1
                          ? 'solar:star-bold'
                          : 'solar:star-line-duotone'
                      }
                    />
                  </IconButton>
                  <Button
                    size="small"
                    onClick={() => handleOpenFile(document)}
                    disabled={openingId === document.id}
                    startIcon={
                      openingId === document.id ? (
                        <CircularProgress size={14} />
                      ) : (
                        <Iconify icon="solar:eye-bold" />
                      )
                    }
                  >
                    Open
                  </Button>
                  <IconButton onClick={() => handleOpenEdit(document)}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(document)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <DocumentationFormDialog
        open={formOpen}
        document={editingDocument}
        defaultCategory={
          routeCategory === 'all' || routeCategory === 'favorites' ? undefined : routeCategory
        }
        onClose={handleCloseForm}
      />
    </DashboardContent>
  );
}
