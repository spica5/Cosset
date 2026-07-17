'use client';

import type { IChatParticipant } from 'src/types/chat';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import CircularProgress from '@mui/material/CircularProgress';

import { useGetCommunityUsers } from 'src/actions/user';
import { addChatContact, removeChatContact } from 'src/actions/chat';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { ChatAvatar } from './chat-avatar';

// ----------------------------------------------------------------------

type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  contacts: IChatParticipant[];
};

export function ChatManageContactsDialog({ open, onClose, contacts }: Props) {
  const { user } = useAuthContext();
  const currentUserId = user?.id ? String(user.id).trim().toLowerCase() : '';

  const { users, usersLoading } = useGetCommunityUsers(500, 0, open && Boolean(currentUserId));

  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const contactIds = useMemo(
    () => new Set(contacts.map((contact) => String(contact.id).trim().toLowerCase())),
    [contacts]
  );

  const directoryUsers = useMemo<DirectoryUser[]>(() => {
    if (!currentUserId) return [];

    return users
      .map((entry) => {
        const id = String(entry.id || '')
          .trim()
          .toLowerCase();
        if (!id || id === currentUserId) return null;

        const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();

        return {
          id,
          name: fullName || entry.email || 'Member',
          email: String(entry.email || ''),
          avatarUrl: String(entry.photoURL || ''),
        };
      })
      .filter(Boolean) as DirectoryUser[];
  }, [currentUserId, users]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return directoryUsers;

    return directoryUsers.filter(
      (entry) =>
        entry.name.toLowerCase().includes(normalized) ||
        entry.email.toLowerCase().includes(normalized)
    );
  }, [directoryUsers, query]);

  const handleToggle = useCallback(
    async (entry: DirectoryUser) => {
      const isContact = contactIds.has(entry.id);
      setPendingId(entry.id);

      try {
        if (isContact) {
          await removeChatContact(entry.id);
          toast.success(`${entry.name} removed from contacts`);
        } else {
          await addChatContact(entry.id);
          toast.success(`${entry.name} added to contacts`);
        }
      } catch (error) {
        console.error(error);
        toast.error(isContact ? 'Failed to remove contact' : 'Failed to add contact');
      } finally {
        setPendingId(null);
      }
    },
    [contactIds]
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setPendingId(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
      <DialogTitle>Manage contacts</DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Add or remove Cosset users from your chat contacts.
        </Typography>

        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Cosset users..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        {usersLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Scrollbar sx={{ maxHeight: 420 }}>
            <List disablePadding>
              {filteredUsers.map((entry) => {
                const isContact = contactIds.has(entry.id);
                const busy = pendingId === entry.id;

                return (
                  <ListItem
                    key={entry.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant={isContact ? 'outlined' : 'contained'}
                        color={isContact ? 'error' : 'primary'}
                        disabled={busy || pendingId !== null}
                        onClick={() => handleToggle(entry)}
                        startIcon={
                          busy ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <Iconify
                              width={16}
                              icon={isContact ? 'solar:user-minus-bold' : 'solar:user-plus-bold'}
                            />
                          )
                        }
                      >
                        {isContact ? 'Remove' : 'Add'}
                      </Button>
                    }
                    sx={{ px: 0.5, py: 1 }}
                  >
                    <ListItemAvatar>
                      <ChatAvatar alt={entry.name} src={entry.avatarUrl} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={entry.name}
                      secondary={entry.email}
                      primaryTypographyProps={{ noWrap: true, typography: 'subtitle2' }}
                      secondaryTypographyProps={{ noWrap: true, typography: 'caption' }}
                      sx={{ pr: 12 }}
                    />
                  </ListItem>
                );
              })}

              {!filteredUsers.length && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {query ? 'No users match your search.' : 'No Cosset users found.'}
                  </Typography>
                </Box>
              )}
            </List>
          </Scrollbar>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
