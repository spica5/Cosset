'use client';

import type { IconButtonProps } from '@mui/material/IconButton';
import type { CrmNotificationItem } from 'src/actions/notification';

import { m } from 'framer-motion';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import {
  deleteNotification,
  archiveNotification,
  deleteAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from 'src/actions/notification';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { NotificationItem } from './notification-item';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'archived', label: 'Archived' },
];

// ----------------------------------------------------------------------

export type NotificationsDrawerProps = IconButtonProps & {
  data?: CrmNotificationItem[];
  customerId?: string;
};

export function NotificationsDrawer({
  data = [],
  customerId,
  sx,
  ...other
}: NotificationsDrawerProps) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');
  const [notifications, setNotifications] = useState(data);

  useEffect(() => {
    setNotifications(data);
  }, [data]);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  }, []);

  const totalUnRead = notifications.filter((item) => item.isUnRead && !item.archived).length;
  const allCount = notifications.filter((item) => !item.archived).length;
  const unreadCount = totalUnRead;
  const archivedCount = notifications.filter((item) => item.archived).length;

  const filteredNotifications = useMemo(() => {
    if (currentTab === 'unread') {
      return notifications.filter((item) => item.isUnRead && !item.archived);
    }

    if (currentTab === 'archived') {
      return notifications.filter((item) => item.archived);
    }

    return notifications.filter((item) => !item.archived);
  }, [currentTab, notifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((notification) => notification.isUnRead)
      .map((notification) => notification.id);

    if (!unreadIds.length) {
      return;
    }

    const previousNotifications = notifications;
    setNotifications((prev) => prev.map((item) => ({ ...item, isUnRead: false })));

    try {
      await markAllNotificationsAsRead(unreadIds, customerId);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      setNotifications(previousNotifications);
    }
  }, [customerId, notifications]);

  const handleReadOne = useCallback(
    async (id: string) => {
      const target = notifications.find((notification) => notification.id === id);
      if (!target || !target.isUnRead) {
        return;
      }

      const previousNotifications = notifications;
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, isUnRead: false } : notification,
        ),
      );

      try {
        await markNotificationAsRead(id, customerId);
      } catch (error) {
        console.error('Failed to mark notification as read', error);
        setNotifications(previousNotifications);
      }
    },
    [customerId, notifications],
  );

  const handleArchiveOne = useCallback(
    async (id: string) => {
      const target = notifications.find((notification) => notification.id === id);
      if (!target || target.archived) {
        return;
      }

      const previousNotifications = notifications;
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isUnRead: false, archived: true }
            : notification,
        ),
      );

      try {
        await archiveNotification(id, customerId);
      } catch (error) {
        console.error('Failed to archive notification', error);
        setNotifications(previousNotifications);
      }
    },
    [customerId, notifications],
  );

  const handleDeleteOne = useCallback(
    async (id: string) => {
      const target = notifications.find((notification) => notification.id === id);
      if (!target) {
        return;
      }

      const previousNotifications = notifications;
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));

      try {
        await deleteNotification(id, customerId);
      } catch (error) {
        console.error('Failed to delete notification', error);
        setNotifications(previousNotifications);
      }
    },
    [customerId, notifications],
  );

  const handleClearAll = useCallback(async () => {
    if (!notifications.length) {
      return;
    }

    const previousNotifications = notifications;
    const notificationIds = notifications.map((notification) => notification.id);
    setNotifications([]);

    try {
      await deleteAllNotifications(notificationIds, customerId);
    } catch (error) {
      console.error('Failed to clear notifications', error);
      setNotifications(previousNotifications);
    }
  }, [customerId, notifications]);

  const renderHead = () => (
    <Box
      sx={{
        py: 2,
        pr: 1,
        pl: 2.5,
        minHeight: 68,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

      {!!totalUnRead && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={onClose} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>

      <Tooltip title="Customer & payment alerts">
        <IconButton>
          <Iconify icon="solar:settings-bold-duotone" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const renderTabs = () => (
    <Tabs variant="fullWidth" value={currentTab} onChange={handleChangeTab} indicatorColor="custom">
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={
                (tab.value === 'unread' && 'info') ||
                (tab.value === 'archived' && 'success') ||
                'default'
              }
            >
              {(tab.value === 'all' && allCount) ||
                (tab.value === 'unread' && unreadCount) ||
                (tab.value === 'archived' && archivedCount) ||
                0}
            </Label>
          }
        />
      ))}
    </Tabs>
  );

  const renderList = () => (
    <Scrollbar>
      <Box component="ul">
        {filteredNotifications.length ? (
          filteredNotifications.map((notification) => (
            <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
              <NotificationItem
                notification={notification}
                onRead={handleReadOne}
                onArchive={handleArchiveOne}
                onDelete={handleDeleteOne}
              />
            </Box>
          ))
        ) : (
          <Box sx={{ px: 2.5, py: 8, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No customer or payment notifications yet.
            </Typography>
          </Box>
        )}
      </Box>
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Notifications button"
        onClick={onOpen}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </IconButton>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: 1, maxWidth: 420 } },
        }}
      >
        {renderHead()}
        {renderTabs()}
        {renderList()}

        <Box sx={{ p: 1 }}>
          <Stack direction="row" spacing={1}>
            <Button fullWidth size="large" onClick={handleMarkAllAsRead}>
              View all
            </Button>
            <Button
              fullWidth
              size="large"
              color="error"
              variant="outlined"
              onClick={handleClearAll}
              disabled={!notifications.length}
            >
              Clear all
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
