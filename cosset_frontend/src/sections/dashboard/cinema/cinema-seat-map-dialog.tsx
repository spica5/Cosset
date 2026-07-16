'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import { Iconify } from 'src/components/universe/iconify';

import {
  CINEMA_SEAT_MAP,
  CINEMA_SEAT_ROWS,
  CINEMA_SEAT_TIERS,
  type CinemaSeat,
  formatCinemaSeatPrice,
  getCinemaSeatTierMeta,
  getSeatsByRowAndBlock,
} from './cinema-seat-map';
import { CINEMA_SERIF } from './cinema-theater-theme';

// ----------------------------------------------------------------------

type SessionInfo = {
  cinemaName: string;
  sessionLabel: string;
  roomLabel: string;
};

type Props = {
  open: boolean;
  session: SessionInfo;
  selectedSeatIds: string[];
  onToggleSeat?: (seatId: string) => void;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmIcon?: string;
  confirming?: boolean;
  /** When true, seats are shown but not selectable (reserved booking view). */
  readOnly?: boolean;
  title?: string;
};

function SeatButton({
  seat,
  selected,
  onToggle,
  readOnly,
}: {
  seat: CinemaSeat;
  selected: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}) {
  const tier = getCinemaSeatTierMeta(seat.tier);
  const isSweetbox = seat.tier === 'sweetbox';

  return (
    <Box
      component="button"
      type="button"
      onClick={readOnly ? undefined : onToggle}
      disabled={readOnly}
      aria-pressed={selected}
      title={seat.pairLabel || seat.id}
      sx={{
        minWidth: isSweetbox ? 52 : 30,
        height: isSweetbox ? 30 : 28,
        px: isSweetbox ? 0.75 : 0.25,
        border: 'none',
        borderRadius: 0.9,
        cursor: readOnly ? 'default' : 'pointer',
        bgcolor: selected ? tier.selectedColor : tier.color,
        color: selected ? '#fff' : '#1A1A1A',
        opacity: readOnly && !selected ? 0.45 : 1,
        fontSize: isSweetbox ? '0.58rem' : '0.58rem',
        fontWeight: 700,
        lineHeight: 1.1,
        boxShadow: selected ? '0 0 0 2px rgba(25,25,25,0.35)' : 'none',
        transition: (theme) =>
          theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:hover': readOnly
          ? undefined
          : {
              transform: 'translateY(-1px)',
              filter: 'brightness(1.05)',
            },
        '&.Mui-disabled': {
          opacity: readOnly && !selected ? 0.45 : 1,
        },
      }}
    >
      {seat.pairLabel || seat.id}
    </Box>
  );
}

function SeatRow({
  row,
  selectedSeatIds,
  onToggleSeat,
  readOnly,
}: {
  row: string;
  selectedSeatIds: string[];
  onToggleSeat?: (seatId: string) => void;
  readOnly?: boolean;
}) {
  const left = getSeatsByRowAndBlock(CINEMA_SEAT_MAP, row, 'left');
  const center = getSeatsByRowAndBlock(CINEMA_SEAT_MAP, row, 'center');
  const right = getSeatsByRowAndBlock(CINEMA_SEAT_MAP, row, 'right');

  const renderSeat = (seat: CinemaSeat) => (
    <SeatButton
      key={seat.id}
      seat={seat}
      selected={selectedSeatIds.includes(seat.id)}
      readOnly={readOnly}
      onToggle={() => onToggleSeat?.(seat.id)}
    />
  );

  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
      <Typography
        variant="caption"
        sx={{ width: 16, textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}
      >
        {row}
      </Typography>

      <Stack direction="row" spacing={0.45}>
        {left.map(renderSeat)}
      </Stack>

      <Box sx={{ width: { xs: 10, sm: 18 } }} />

      <Stack direction="row" spacing={0.45}>
        {center.map(renderSeat)}
      </Stack>

      <Box sx={{ width: { xs: 10, sm: 18 } }} />

      <Stack direction="row" spacing={0.45}>
        {right.map(renderSeat)}
      </Stack>

      <Typography
        variant="caption"
        sx={{ width: 16, textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}
      >
        {row}
      </Typography>
    </Stack>
  );
}

export function CinemaSeatMapDialog({
  open,
  session,
  selectedSeatIds,
  onToggleSeat,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm & watch',
  confirmIcon = 'solar:play-bold',
  confirming = false,
  readOnly = false,
  title,
}: Props) {
  const selectedSeats = useMemo(
    () => CINEMA_SEAT_MAP.filter((seat) => selectedSeatIds.includes(seat.id)),
    [selectedSeatIds],
  );

  const totalPrice = useMemo(
    () =>
      selectedSeats.reduce((sum, seat) => sum + getCinemaSeatTierMeta(seat.tier).price, 0),
    [selectedSeats],
  );

  const dialogTitle = title || (readOnly ? 'Your reservation' : 'Select your seat');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Typography sx={{ fontFamily: CINEMA_SERIF, fontWeight: 700, fontSize: '1.25rem' }}>
          {dialogTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {readOnly
            ? 'Your reserved seat for this screening is highlighted on the map.'
            : 'Choose one seat. Every seat stays available — pick freely even if others selected it before.'}
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#F7F7F7' }}>
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            spacing={2.5}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              bgcolor: 'common.white',
              borderRadius: 2,
              px: 2,
              py: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {CINEMA_SEAT_TIERS.map((tier) => (
              <Stack key={tier.id} spacing={0.35} alignItems="center" sx={{ minWidth: 88 }}>
                <Box
                  sx={{
                    width: tier.id === 'sweetbox' ? 48 : 28,
                    height: 22,
                    borderRadius: 0.8,
                    bgcolor: tier.color,
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {tier.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatCinemaSeatPrice(tier.price)}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Box
            sx={{
              bgcolor: 'common.white',
              borderRadius: 2,
              px: 2,
              py: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Cinema
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {session.cinemaName}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Session
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {session.sessionLabel}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Room
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {session.roomLabel}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              bgcolor: 'common.white',
              borderRadius: 2,
              px: { xs: 1, sm: 2 },
              py: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflowX: 'auto',
            }}
          >
            <Stack spacing={1.5} alignItems="center" sx={{ minWidth: 720 }}>
              <Box sx={{ width: 1, maxWidth: 520, position: 'relative', mb: 1 }}>
                <Box
                  sx={{
                    height: 18,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(ellipse at 50% 0%, rgba(33,150,243,0.35), transparent 70%)',
                    mb: -1,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    fontWeight: 700,
                    letterSpacing: '0.35em',
                    color: 'text.secondary',
                    borderBottom: '2px solid',
                    borderColor: 'grey.500',
                    pb: 0.75,
                    mx: 4,
                  }}
                >
                  SCREEN
                </Typography>
              </Box>

              <Stack spacing={0.55} sx={{ width: 1 }}>
                {CINEMA_SEAT_ROWS.map(({ row }) => (
                  <SeatRow
                    key={row}
                    row={row}
                    selectedSeatIds={selectedSeatIds}
                    onToggleSeat={onToggleSeat}
                    readOnly={readOnly}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {readOnly ? 'Reserved seat' : 'Selected seat'}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedSeats.length
                  ? selectedSeats.map((seat) => seat.pairLabel || seat.id).join(', ')
                  : readOnly
                    ? 'No seat recorded'
                    : 'None selected'}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formatCinemaSeatPrice(totalPrice)}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {readOnly ? (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit" disabled={confirming}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={onConfirm}
              disabled={!selectedSeatIds.length || confirming}
              startIcon={<Iconify icon={confirmIcon} />}
            >
              {confirmLabel}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
