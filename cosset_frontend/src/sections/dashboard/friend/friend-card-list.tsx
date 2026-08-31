import type { IFriendCard } from 'src/types/friend';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';

import { FriendCard } from './friend-card';

// ----------------------------------------------------------------------

type Props = {
  friends: IFriendCard[];
  processingRelationId?: number | null;
  processingNotifyFriendId?: string | null;
  onAccept?: (friend: IFriendCard) => void | Promise<void>;
  onReject?: (friend: IFriendCard) => void | Promise<void>;
  onCancel?: (friend: IFriendCard) => void | Promise<void>;
  onRemove?: (friend: IFriendCard) => void | Promise<void>;
  onToggleActivityNotify?: (friend: IFriendCard, enabled: boolean) => void | Promise<void>;
};

export function FriendCardList({
  friends,
  processingRelationId = null,
  processingNotifyFriendId = null,
  onAccept,
  onReject,
  onCancel,
  onRemove,
  onToggleActivityNotify,
}: Props) {
  const [page, setPage] = useState(1);

  const rowsPerPage = 12;

  const handleChangePage = useCallback((event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {friends
          .slice((page - 1) * rowsPerPage, (page - 1) * rowsPerPage + rowsPerPage)
          .map((friend) => (
            <FriendCard
              key={`${friend.id}-${friend.relationId ?? 'accepted'}`}
              friend={friend}
              actionLoading={friend.relationId != null && processingRelationId === friend.relationId}
              notifyLoading={processingNotifyFriendId === friend.id}
              onAccept={() => onAccept?.(friend)}
              onReject={() => onReject?.(friend)}
              onCancel={() => onCancel?.(friend)}
              onRemove={() => onRemove?.(friend)}
              onToggleActivityNotify={(enabled) => onToggleActivityNotify?.(friend, enabled)}
            />
          ))}
      </Box>

      <Pagination
        page={page}
        shape="circular"
        count={Math.ceil(friends.length / rowsPerPage)}
        onChange={handleChangePage}
        sx={{ mt: { xs: 5, md: 8 }, mx: 'auto' }}
      />
    </>
  );
}
