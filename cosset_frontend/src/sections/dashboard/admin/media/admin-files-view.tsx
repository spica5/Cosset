'use client';

import { toast } from 'sonner';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  copyAdminFilesS3ToR2,
  type StorageObjectItem,
  type StorageProviderId,
  listAdminStorageObjects,
  listAllAdminStorageKeys,
  deleteAdminStorageObject,
  getAdminStorageObjectUrl,
  getAdminStorageProviders,
  deleteAdminStorageObjects,
  type StorageProvidersStatus,
} from 'src/actions/admin-files';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

// ----------------------------------------------------------------------

type FolderNode = {
  prefix: string;
  label: string;
  childrenLoaded: boolean;
  children: FolderNode[];
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Request failed');
  }
  return 'Request failed';
}

function getFolderLabel(prefix: string) {
  const trimmed = prefix.replace(/\/+$/, '');
  const parts = trimmed.split('/').filter(Boolean);
  return parts[parts.length - 1] || prefix || '/';
}

function fileNameFromKey(key: string, currentPrefix: string) {
  if (currentPrefix && key.startsWith(currentPrefix)) {
    return key.slice(currentPrefix.length) || key;
  }
  return key;
}

function buildPathCrumbs(prefix: string) {
  if (!prefix) {
    return [{ label: 'Root', prefix: '' }];
  }

  const parts = prefix.replace(/\/+$/, '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Root', prefix: '' }];
  let current = '';

  parts.forEach((part) => {
    current = `${current}${part}/`;
    crumbs.push({ label: part, prefix: current });
  });

  return crumbs;
}

function upsertFolderChildren(
  nodes: FolderNode[],
  parentPrefix: string,
  childPrefixes: string[],
): FolderNode[] {
  if (!parentPrefix) {
    return childPrefixes.map((prefix) => ({
      prefix,
      label: getFolderLabel(prefix),
      childrenLoaded: false,
      children: [],
    }));
  }

  return nodes.map((node) => {
    if (node.prefix === parentPrefix) {
      return {
        ...node,
        childrenLoaded: true,
        children: childPrefixes.map((prefix) => ({
          prefix,
          label: getFolderLabel(prefix),
          childrenLoaded: false,
          children: [],
        })),
      };
    }

    if (parentPrefix.startsWith(node.prefix)) {
      return {
        ...node,
        children: upsertFolderChildren(node.children, parentPrefix, childPrefixes),
      };
    }

    return node;
  });
}

function renderFolderTreeItems(nodes: FolderNode[]) {
  return nodes.map((node) => (
    <TreeItem
      key={node.prefix}
      itemId={node.prefix}
      label={
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
          <Iconify icon="solar:folder-bold" width={18} />
          <Typography variant="body2" noWrap>
            {node.label}
          </Typography>
        </Stack>
      }
    >
      {node.childrenLoaded
        ? renderFolderTreeItems(node.children)
        : [
            <TreeItem
              key={`${node.prefix}__loading`}
              itemId={`${node.prefix}__loading`}
              label={
                <Typography variant="caption" color="text.secondary">
                  Loading…
                </Typography>
              }
            />,
          ]}
    </TreeItem>
  ));
}

function getParentPrefix(folderPrefix: string) {
  const normalized = folderPrefix.replace(/\/+$/, '');
  if (!normalized) {
    return '';
  }

  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `${parts.join('/')}/` : '';
}

// ----------------------------------------------------------------------

export function AdminFilesView() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const isAdmin = isUserAdmin(user?.role);

  const [providers, setProviders] = useState<StorageProvidersStatus | null>(null);
  const [provider, setProvider] = useState<StorageProviderId>('s3');
  const [prefix, setPrefix] = useState('');
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [objects, setObjects] = useState<StorageObjectItem[]>([]);
  const [folderPrefixes, setFolderPrefixes] = useState<string[]>([]);
  const [bucket, setBucket] = useState('');
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [tokenHistory, setTokenHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [copyProgress, setCopyProgress] = useState<{
    total: number;
    completed: number;
    copied: number;
    skipped: number;
    failed: number;
    currentKey: string;
    phase?: 'listing' | 'copying';
  } | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{
    total: number;
    completed: number;
    deleted: number;
    failed: number;
    currentKey: string;
    phase: 'listing' | 'deleting';
  } | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      router.replace(paths.dashboard.root);
    }
  }, [authLoading, isAdmin, router, user]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let mounted = true;

    getAdminStorageProviders()
      .then((status) => {
        if (!mounted) {
          return;
        }
        setProviders(status);
        if (status.s3.configured) {
          setProvider('s3');
        } else if (status.r2.configured) {
          setProvider('r2');
        }
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const loadFolderChildren = useCallback(
    async (folderPrefix: string) => {
      if (!isAdmin) {
        return;
      }

      setTreeLoading(true);
      try {
        const result = await listAdminStorageObjects({
          provider,
          prefix: folderPrefix,
          maxKeys: 1000,
        });

        setFolderTree((prev) =>
          folderPrefix
            ? upsertFolderChildren(prev, folderPrefix, result.prefixes)
            : result.prefixes.map((item) => ({
                prefix: item,
                label: getFolderLabel(item),
                childrenLoaded: false,
                children: [],
              })),
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setTreeLoading(false);
      }
    },
    [isAdmin, provider],
  );

  const loadObjects = useCallback(
    async (options?: { token?: string | null; resetHistory?: boolean; nextPrefix?: string }) => {
      if (!isAdmin) {
        return;
      }

      const activePrefix = options?.nextPrefix ?? prefix;

      setLoading(true);
      try {
        const result = await listAdminStorageObjects({
          provider,
          prefix: activePrefix,
          continuationToken: options?.token || undefined,
          maxKeys: rowsPerPage,
        });

        setObjects(result.objects);
        setFolderPrefixes(result.prefixes);
        setBucket(result.bucket);
        setContinuationToken(result.nextContinuationToken);
        setSelectedKeys([]);

        if (options?.resetHistory) {
          setTokenHistory([null]);
          setPageIndex(0);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        setObjects([]);
        setFolderPrefixes([]);
        setContinuationToken(null);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, prefix, provider, rowsPerPage],
  );

  useEffect(() => {
    if (!isAdmin || !providers) {
      return;
    }

    const configured =
      provider === 's3' ? providers.s3.configured : providers.r2.configured;
    if (!configured) {
      setObjects([]);
      setFolderTree([]);
      setFolderPrefixes([]);
      setBucket('');
      setContinuationToken(null);
      return;
    }

    setPrefix('');
    setSelectedFolder('');
    setExpandedFolders([]);
    loadFolderChildren('');
    loadObjects({ token: null, resetHistory: true, nextPrefix: '' });
    // Intentionally only re-run when provider/providers/rowsPerPage change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, provider, providers, rowsPerPage]);

  useEffect(() => {
    if (!isAdmin || !providers) {
      return;
    }

    const configured =
      provider === 's3' ? providers.s3.configured : providers.r2.configured;
    if (!configured) {
      return;
    }

    loadObjects({ token: null, resetHistory: true });
  }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = objects.length > 0 && selectedKeys.length === objects.length;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < objects.length;
  const pathCrumbs = useMemo(() => buildPathCrumbs(prefix), [prefix]);

  const providerLabel = useMemo(
    () => (provider === 's3' ? 'AWS S3' : 'Cloudflare R2'),
    [provider],
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys(objects.map((item) => item.key));
  };

  const handleToggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleProviderChange = (
    _: React.MouseEvent<HTMLElement>,
    next: StorageProviderId | null,
  ) => {
    if (!next) {
      return;
    }
    setProvider(next);
    setSelectedKeys([]);
  };

  const handleSelectFolder = (folderPrefix: string) => {
    setSelectedFolder(folderPrefix);
    setPrefix(folderPrefix);
  };

  const handleExpandedItemsChange = async (
    _: React.SyntheticEvent,
    itemIds: string[],
  ) => {
    setExpandedFolders(itemIds);

    const newlyExpanded = itemIds.find(
      (itemId) =>
        itemId &&
        !itemId.endsWith('__loading') &&
        !expandedFolders.includes(itemId),
    );

    if (!newlyExpanded) {
      return;
    }

    const findNode = (nodes: FolderNode[]): FolderNode | null => {
      const direct = nodes.find((node) => node.prefix === newlyExpanded);
      if (direct) {
        return direct;
      }

      return nodes.reduce<FolderNode | null>((found, node) => {
        if (found) {
          return found;
        }
        return findNode(node.children);
      }, null);
    };

    const node = findNode(folderTree);
    if (node && !node.childrenLoaded) {
      await loadFolderChildren(newlyExpanded);
    }
  };

  const handleNextPage = async () => {
    if (!continuationToken) {
      return;
    }
    const nextHistory = [...tokenHistory, continuationToken];
    setTokenHistory(nextHistory);
    setPageIndex((prev) => prev + 1);
    await loadObjects({ token: continuationToken });
  };

  const handlePrevPage = async () => {
    if (pageIndex <= 0) {
      return;
    }
    const prevIndex = pageIndex - 1;
    const token = tokenHistory[prevIndex] || null;
    setPageIndex(prevIndex);
    setTokenHistory((prev) => prev.slice(0, prevIndex + 1));
    await loadObjects({ token });
  };

  const handleView = async (key: string) => {
    setBusyKey(key);
    try {
      const url = await getAdminStorageObjectUrl(provider, key);
      if (!url) {
        throw new Error('Signed URL missing');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Delete "${key}" from ${providerLabel}?`)) {
      return;
    }

    setBusyKey(key);
    try {
      await deleteAdminStorageObject(provider, key);
      toast.success('File deleted');
      await loadObjects({
        token: tokenHistory[pageIndex] || null,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyKey('');
    }
  };

  const handleCopyKeys = async (keys: string[]) => {
    const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    if (!uniqueKeys.length) {
      toast.error('Select at least one file');
      return;
    }

    if (!providers?.s3.configured || !providers?.r2.configured) {
      toast.error('Both AWS S3 and Cloudflare R2 must be configured to copy files');
      return;
    }

    setCopying(true);
    setCopyProgress({
      total: uniqueKeys.length,
      completed: 0,
      copied: 0,
      skipped: 0,
      failed: 0,
      currentKey: uniqueKeys[0],
      phase: 'copying',
    });

    let copied = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const copySequentially = async (remaining: string[], completed: number): Promise<void> => {
        if (!remaining.length) {
          return;
        }

        const [key, ...rest] = remaining;
        setCopyProgress({
          total: uniqueKeys.length,
          completed,
          copied,
          skipped,
          failed,
          currentKey: key,
          phase: 'copying',
        });

        try {
          const { results } = await copyAdminFilesS3ToR2({
            keys: [key],
            overwrite,
          });
          const status = results[0]?.status || 'failed';
          if (status === 'copied') {
            copied += 1;
          } else if (status === 'skipped') {
            skipped += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }

        setCopyProgress({
          total: uniqueKeys.length,
          completed: completed + 1,
          copied,
          skipped,
          failed,
          currentKey: key,
          phase: 'copying',
        });

        await copySequentially(rest, completed + 1);
      };

      await copySequentially(uniqueKeys, 0);

      toast.success(
        `Copy finished: ${copied} copied, ${skipped} skipped, ${failed} failed`,
      );
      setSelectedKeys([]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCopying(false);
      setCopyProgress(null);
    }
  };

  const handleCopyFolder = async (folderPrefix: string) => {
    if (copying || deleting) {
      return;
    }

    if (!providers?.s3.configured || !providers?.r2.configured) {
      toast.error('Both AWS S3 and Cloudflare R2 must be configured to copy files');
      return;
    }

    const folderLabel = folderPrefix || 'the entire bucket (root)';
    if (
      !window.confirm(
        `Copy all files inside ${folderLabel} from AWS S3 to Cloudflare R2 (same keys)?`,
      )
    ) {
      return;
    }

    setCopying(true);
    setCopyProgress({
      total: 0,
      completed: 0,
      copied: 0,
      skipped: 0,
      failed: 0,
      currentKey: 'Listing folder files…',
      phase: 'listing',
    });

    try {
      const keys = await listAllAdminStorageKeys({
        provider: 's3',
        prefix: folderPrefix,
        onProgress: (listedCount) => {
          setCopyProgress({
            total: listedCount,
            completed: 0,
            copied: 0,
            skipped: 0,
            failed: 0,
            currentKey: `Listing folder files… (${listedCount})`,
            phase: 'listing',
          });
        },
      });

      if (!keys.length) {
        toast.error('No files found in this folder');
        setCopying(false);
        setCopyProgress(null);
        return;
      }

      // Reuse the file-by-file copy loop (it manages copying/progress state).
      setCopying(false);
      await handleCopyKeys(keys);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setCopying(false);
      setCopyProgress(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedKeys.length) {
      toast.error('Select at least one file');
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedKeys.length} selected file${selectedKeys.length === 1 ? '' : 's'} from ${providerLabel}?`,
      )
    ) {
      return;
    }

    await deleteKeysWithProgress(selectedKeys);
  };

  const deleteKeysWithProgress = async (keys: string[]) => {
    const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    if (!uniqueKeys.length) {
      toast.error('No files to delete');
      return;
    }

    setDeleting(true);
    setDeleteProgress({
      total: uniqueKeys.length,
      completed: 0,
      deleted: 0,
      failed: 0,
      currentKey: uniqueKeys[0],
      phase: 'deleting',
    });

    let deleted = 0;
    let failed = 0;
    const batchSize = 50;

    try {
      const batches = uniqueKeys.reduce<string[][]>((acc, key, index) => {
        const batchIndex = Math.floor(index / batchSize);
        if (!acc[batchIndex]) {
          acc[batchIndex] = [];
        }
        acc[batchIndex].push(key);
        return acc;
      }, []);

      const deleteBatches = async (
        remaining: string[][],
        completed: number,
      ): Promise<void> => {
        if (!remaining.length) {
          return;
        }

        const [batch, ...rest] = remaining;
        setDeleteProgress({
          total: uniqueKeys.length,
          completed,
          deleted,
          failed,
          currentKey: batch[0],
          phase: 'deleting',
        });

        try {
          const { summary } = await deleteAdminStorageObjects(provider, batch);
          deleted += summary.deleted;
          failed += summary.failed;
        } catch {
          failed += batch.length;
        }

        const nextCompleted = Math.min(completed + batch.length, uniqueKeys.length);
        setDeleteProgress({
          total: uniqueKeys.length,
          completed: nextCompleted,
          deleted,
          failed,
          currentKey: batch[batch.length - 1],
          phase: 'deleting',
        });

        await deleteBatches(rest, nextCompleted);
      };

      await deleteBatches(batches, 0);

      toast.success(`Delete finished: ${deleted} deleted, ${failed} failed`);
      setSelectedKeys([]);
      await loadObjects({
        token: tokenHistory[pageIndex] || null,
      });
      await loadFolderChildren(prefix || '');
      if (!prefix) {
        await loadFolderChildren('');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
      setDeleteProgress(null);
    }
  };

  const handleDeleteFolder = async (folderPrefix: string) => {
    if (copying || deleting) {
      return;
    }

    const folderLabel = folderPrefix || 'the entire bucket (root)';
    const warning = folderPrefix
      ? `Delete folder "${folderLabel}" and ALL files inside it from ${providerLabel}? This cannot be undone.`
      : `Delete ALL files in the ${providerLabel} bucket? This cannot be undone.`;

    if (!window.confirm(warning)) {
      return;
    }

    if (folderPrefix === '' && !window.confirm('Final confirmation: delete every object in this bucket?')) {
      return;
    }

    setDeleting(true);
    setDeleteProgress({
      total: 0,
      completed: 0,
      deleted: 0,
      failed: 0,
      currentKey: 'Listing folder files…',
      phase: 'listing',
    });

    try {
      const keys = await listAllAdminStorageKeys({
        provider,
        prefix: folderPrefix,
        onProgress: (listedCount) => {
          setDeleteProgress({
            total: listedCount,
            completed: 0,
            deleted: 0,
            failed: 0,
            currentKey: `Listing folder files… (${listedCount})`,
            phase: 'listing',
          });
        },
      });

      if (!keys.length) {
        toast.error('No files found in this folder');
        setDeleting(false);
        setDeleteProgress(null);
        return;
      }

      setDeleting(false);
      await deleteKeysWithProgress(keys);

      // Navigate out of a deleted folder and refresh the tree.
      if (folderPrefix && (prefix === folderPrefix || prefix.startsWith(folderPrefix))) {
        const parent = getParentPrefix(folderPrefix);
        setSelectedFolder(parent);
        setPrefix(parent);
      }

      setFolderTree([]);
      setExpandedFolders([]);
      await loadFolderChildren('');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleting(false);
      setDeleteProgress(null);
    }
  };

  if (authLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Manage Files"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Admin', href: paths.dashboard.admin.media.root },
            { name: 'Media', href: paths.dashboard.admin.media.root },
            { name: 'Files' },
          ]}
          sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
        />

        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} href={paths.dashboard.root} color="inherit" size="small">
              Go back
            </Button>
          }
        >
          Only administrators can manage storage files.
        </Alert>
      </DashboardContent>
    );
  }

  const tableColSpan = 6;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Manage Files"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admin', href: paths.dashboard.admin.media.root },
          { name: 'Media', href: paths.dashboard.admin.media.root },
          { name: 'Files' },
        ]}
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="solar:cloud-storage-bold" width={26} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5">Storage files</Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse folders, see which keys are referenced in the database, and copy files from
                  S3 to R2 with the same key.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`Active: ${providers?.activeProvider === 'r2' ? 'R2' : 'S3'}`}
                  color="info"
                  variant="soft"
                />
                <Chip
                  size="small"
                  label={`S3: ${providers?.s3.configured ? providers.s3.bucket || 'ready' : 'not configured'}`}
                  color={providers?.s3.configured ? 'success' : 'default'}
                  variant="soft"
                />
                <Chip
                  size="small"
                  label={`R2: ${providers?.r2.configured ? providers.r2.bucket || 'ready' : 'not configured'}`}
                  color={providers?.r2.configured ? 'success' : 'default'}
                  variant="soft"
                />
              </Stack>
            </Stack>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={provider}
                onChange={handleProviderChange}
                color="primary"
              >
                <ToggleButton value="s3" disabled={!providers?.s3.configured}>
                  AWS S3
                </ToggleButton>
                <ToggleButton value="r2" disabled={!providers?.r2.configured}>
                  Cloudflare R2
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant="outlined"
                onClick={() => {
                  loadFolderChildren(prefix || '');
                  loadObjects({ token: tokenHistory[pageIndex] || null });
                }}
                disabled={loading || treeLoading}
              >
                Refresh
              </Button>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              {provider === 's3' ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overwrite}
                      onChange={(event) => setOverwrite(event.target.checked)}
                    />
                  }
                  label="Overwrite existing keys on R2"
                />
              ) : (
                <Box />
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {provider === 's3' && (
                  <Button
                    variant="outlined"
                    color="primary"
                    disabled={copying || deleting || !providers?.r2.configured}
                    startIcon={
                      copying && copyProgress?.phase === 'listing' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="solar:cloud-upload-bold" />
                      )
                    }
                    onClick={() => handleCopyFolder(prefix)}
                  >
                    {prefix ? 'Copy this folder to R2' : 'Copy all files to R2'}
                  </Button>
                )}

                {provider === 's3' && (
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!selectedKeys.length || copying || deleting || !providers?.r2.configured}
                    startIcon={
                      copying && copyProgress?.phase !== 'listing' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="solar:copy-bold" />
                      )
                    }
                    onClick={() => handleCopyKeys(selectedKeys)}
                  >
                    {copying && copyProgress?.phase === 'copying'
                      ? `Copying ${copyProgress.completed}/${copyProgress.total}`
                      : `Copy selected to R2 (${selectedKeys.length})`}
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color="error"
                  disabled={copying || deleting}
                  startIcon={
                    deleting && deleteProgress?.phase === 'listing' ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    )
                  }
                  onClick={() => handleDeleteFolder(prefix)}
                >
                  {prefix ? 'Delete this folder' : 'Delete all files'}
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  disabled={!selectedKeys.length || copying || deleting}
                  startIcon={
                    deleting && deleteProgress?.phase === 'deleting' ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    )
                  }
                  onClick={handleDeleteSelected}
                >
                  {deleting && deleteProgress?.phase === 'deleting'
                    ? `Deleting ${deleteProgress.completed}/${deleteProgress.total}`
                    : `Delete selected (${selectedKeys.length})`}
                </Button>
              </Stack>
            </Stack>

            {copying && copyProgress && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Typography variant="subtitle2">
                      {copyProgress.phase === 'listing'
                        ? `Listing folder files… (${copyProgress.total})`
                        : `Copying to R2… ${copyProgress.completed}/${copyProgress.total}`}
                    </Typography>
                    {copyProgress.phase === 'copying' && (
                      <Typography variant="caption" color="text.secondary">
                        {copyProgress.copied} copied · {copyProgress.skipped} skipped ·{' '}
                        {copyProgress.failed} failed
                      </Typography>
                    )}
                  </Stack>

                  <LinearProgress
                    variant={copyProgress.phase === 'listing' ? 'indeterminate' : 'determinate'}
                    value={
                      copyProgress.phase === 'copying' && copyProgress.total > 0
                        ? (copyProgress.completed / copyProgress.total) * 100
                        : undefined
                    }
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  >
                    {copyProgress.phase === 'listing'
                      ? copyProgress.currentKey
                      : `Current: ${copyProgress.currentKey}`}
                  </Typography>
                </Stack>
              </Card>
            )}

            {deleting && deleteProgress && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Typography variant="subtitle2">
                      {deleteProgress.phase === 'listing'
                        ? `Listing folder files… (${deleteProgress.total})`
                        : `Deleting… ${deleteProgress.completed}/${deleteProgress.total}`}
                    </Typography>
                    {deleteProgress.phase === 'deleting' && (
                      <Typography variant="caption" color="text.secondary">
                        {deleteProgress.deleted} deleted · {deleteProgress.failed} failed
                      </Typography>
                    )}
                  </Stack>

                  <LinearProgress
                    color="error"
                    variant={deleteProgress.phase === 'listing' ? 'indeterminate' : 'determinate'}
                    value={
                      deleteProgress.phase === 'deleting' && deleteProgress.total > 0
                        ? (deleteProgress.completed / deleteProgress.total) * 100
                        : undefined
                    }
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  >
                    {deleteProgress.phase === 'listing'
                      ? deleteProgress.currentKey
                      : `Current: ${deleteProgress.currentKey}`}
                  </Typography>
                </Stack>
              </Card>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
              <Card
                variant="outlined"
                sx={{
                  width: { xs: 1, md: 280 },
                  flexShrink: 0,
                  p: 1.5,
                  minHeight: 360,
                  maxHeight: { md: 640 },
                  overflow: 'auto',
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2">Folders</Typography>
                    {treeLoading && <CircularProgress size={14} />}
                  </Stack>

                  <Button
                    size="small"
                    variant={prefix === '' ? 'soft' : 'text'}
                    color={prefix === '' ? 'primary' : 'inherit'}
                    startIcon={<Iconify icon="solar:home-2-bold" width={16} />}
                    onClick={() => handleSelectFolder('')}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Root
                  </Button>

                  <SimpleTreeView
                    expandedItems={expandedFolders}
                    selectedItems={selectedFolder || ''}
                    onExpandedItemsChange={handleExpandedItemsChange}
                    onSelectedItemsChange={(_, itemId) => {
                      if (!itemId || String(itemId).endsWith('__loading')) {
                        return;
                      }
                      handleSelectFolder(String(itemId));
                    }}
                  >
                    {renderFolderTreeItems(folderTree)}
                  </SimpleTreeView>

                  {!folderTree.length && !treeLoading && (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      No folders found.
                    </Typography>
                  )}
                </Stack>
              </Card>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Breadcrumbs separator="/">
                      {pathCrumbs.map((crumb) => (
                        <Link
                          key={crumb.prefix || 'root'}
                          component="button"
                          type="button"
                          underline="hover"
                          color={crumb.prefix === prefix ? 'text.primary' : 'inherit'}
                          onClick={() => handleSelectFolder(crumb.prefix)}
                          sx={{ typography: 'body2' }}
                        >
                          {crumb.label}
                        </Link>
                      ))}
                    </Breadcrumbs>

                    <Typography variant="body2" color="text.secondary">
                      Viewing {providerLabel}
                      {bucket ? ` · ${bucket}` : ''}
                    </Typography>
                  </Stack>

                  {loading && <LinearProgress />}

                  {folderPrefixes.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {folderPrefixes.map((folder) => (
                        <Stack key={folder} direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            clickable
                            size="small"
                            icon={<Iconify icon="solar:folder-bold" width={16} />}
                            label={getFolderLabel(folder)}
                            onClick={() => handleSelectFolder(folder)}
                            variant="outlined"
                            disabled={copying || deleting}
                          />
                          {provider === 's3' && (
                            <IconButton
                              size="small"
                              title={`Copy folder ${getFolderLabel(folder)} to R2`}
                              disabled={copying || deleting || !providers?.r2.configured}
                              onClick={() => handleCopyFolder(folder)}
                            >
                              <Iconify icon="solar:copy-bold" width={16} />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            title={`Delete folder ${getFolderLabel(folder)}`}
                            disabled={copying || deleting}
                            onClick={() => handleDeleteFolder(folder)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={someSelected}
                              checked={allSelected}
                              onChange={handleToggleSelectAll}
                              disabled={!objects.length}
                            />
                          </TableCell>
                          <TableCell>Key</TableCell>
                          <TableCell width={120}>In DB</TableCell>
                          <TableCell width={110}>Size</TableCell>
                          <TableCell width={180}>Last modified</TableCell>
                          <TableCell align="right" width={160}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!loading && objects.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={tableColSpan} align="center" sx={{ py: 6 }}>
                              <Typography variant="body2" color="text.secondary">
                                No files in this folder
                                {prefix ? ` (${prefix})` : ''}.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}

                        {objects.map((item) => {
                          const selected = selectedKeys.includes(item.key);
                          const rowBusy = busyKey === item.key;
                          const inDatabase = Boolean(item.inDatabase);
                          const isCopyingRow = copying && copyProgress?.currentKey === item.key;

                          return (
                            <TableRow
                              key={item.key}
                              hover
                              selected={selected || isCopyingRow}
                              sx={
                                isCopyingRow
                                  ? { bgcolor: 'primary.lighter' }
                                  : undefined
                              }
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selected}
                                  onChange={() => handleToggleKey(item.key)}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                    {fileNameFromKey(item.key, prefix)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      wordBreak: 'break-all',
                                      fontFamily:
                                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    }}
                                  >
                                    {item.key}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={inDatabase ? 'Yes' : 'No'}
                                  color={inDatabase ? 'success' : 'warning'}
                                  variant="soft"
                                />
                              </TableCell>
                              <TableCell>{formatBytes(item.size)}</TableCell>
                              <TableCell>{formatDateTime(item.lastModified)}</TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  {provider === 's3' && (
                                    <IconButton
                                      size="small"
                                      title="Copy to R2"
                                      disabled={copying || !providers?.r2.configured}
                                      onClick={() => handleCopyKeys([item.key])}
                                    >
                                      <Iconify icon="solar:copy-bold" width={18} />
                                    </IconButton>
                                  )}
                                  <IconButton
                                    size="small"
                                    title="View / download"
                                    disabled={rowBusy}
                                    onClick={() => handleView(item.key)}
                                  >
                                    {rowBusy ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <Iconify icon="solar:eye-bold" width={18} />
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    title="Delete"
                                    disabled={rowBusy}
                                    onClick={() => handleDelete(item.key)}
                                  >
                                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="caption" color="text.secondary">
                      Page {pageIndex + 1} · {objects.length} file
                      {objects.length === 1 ? '' : 's'}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        select
                        size="small"
                        label="Rows"
                        value={rowsPerPage}
                        onChange={(event) => setRowsPerPage(Number(event.target.value))}
                        SelectProps={{ native: true }}
                        sx={{ width: 96 }}
                      >
                        {[25, 50, 100].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </TextField>
                      <Button
                        size="small"
                        disabled={pageIndex <= 0 || loading}
                        onClick={handlePrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        disabled={!continuationToken || loading}
                        onClick={handleNextPage}
                      >
                        Next
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
