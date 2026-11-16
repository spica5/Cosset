export type CinemaSeatTier = 'regular' | 'vip' | 'sweetbox';

export type CinemaSeat = {
  id: string;
  row: string;
  number: number;
  tier: CinemaSeatTier;
  /** Sweetbox pair label, e.g. L1,L2 */
  pairLabel?: string;
  block: 'left' | 'center' | 'right';
};

export type CinemaSeatTierMeta = {
  id: CinemaSeatTier;
  label: string;
  price: number;
  color: string;
  selectedColor: string;
};

export const CINEMA_SEAT_TIERS: CinemaSeatTierMeta[] = [
  {
    id: 'regular',
    label: 'Regular',
    price: 105000,
    color: '#4CAF50',
    selectedColor: '#2E7D32',
  },
  {
    id: 'vip',
    label: 'VIP',
    price: 110500,
    color: '#F5C242',
    selectedColor: '#C9A227',
  },
  {
    id: 'sweetbox',
    label: 'Sweetbox',
    price: 262000,
    color: '#E91E8C',
    selectedColor: '#AD1457',
  },
];

const REGULAR_ROWS = ['A', 'B', 'C'];
const VIP_ROWS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

type BlockSpec = {
  block: 'left' | 'center' | 'right';
  start: number;
  end: number;
};

const REGULAR_BLOCKS: Record<string, BlockSpec[]> = {
  A: [
    { block: 'left', start: 1, end: 3 },
    { block: 'center', start: 4, end: 19 },
    { block: 'right', start: 20, end: 23 },
  ],
  B: [
    { block: 'left', start: 1, end: 3 },
    { block: 'center', start: 4, end: 19 },
    { block: 'right', start: 20, end: 24 },
  ],
  C: [
    { block: 'left', start: 1, end: 3 },
    { block: 'center', start: 4, end: 19 },
    { block: 'right', start: 20, end: 24 },
  ],
};

const VIP_BLOCKS: BlockSpec[] = [
  { block: 'left', start: 1, end: 4 },
  { block: 'center', start: 5, end: 20 },
  { block: 'right', start: 21, end: 24 },
];

const SWEETBOX_PAIRS: Array<{ block: 'left' | 'center' | 'right'; pairs: [number, number][] }> = [
  {
    block: 'left',
    pairs: [
      [1, 2],
      [3, 4],
    ],
  },
  {
    block: 'center',
    pairs: [
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
      [13, 14],
      [15, 16],
      [17, 18],
      [19, 20],
    ],
  },
  {
    block: 'right',
    pairs: [
      [21, 22],
      [23, 24],
    ],
  },
];

function buildRangeSeats(
  row: string,
  tier: CinemaSeatTier,
  blocks: BlockSpec[],
): CinemaSeat[] {
  return blocks.flatMap(({ block, start, end }) => {
    const seats: CinemaSeat[] = [];
    for (let number = start; number <= end; number += 1) {
      seats.push({
        id: `${row}${number}`,
        row,
        number,
        tier,
        block,
      });
    }
    return seats;
  });
}

export function buildCinemaSeatMap(): CinemaSeat[] {
  const seats: CinemaSeat[] = [];

  REGULAR_ROWS.forEach((row) => {
    seats.push(...buildRangeSeats(row, 'regular', REGULAR_BLOCKS[row]));
  });

  VIP_ROWS.forEach((row) => {
    seats.push(...buildRangeSeats(row, 'vip', VIP_BLOCKS));
  });

  SWEETBOX_PAIRS.forEach(({ block, pairs }) => {
    pairs.forEach(([a, b]) => {
      seats.push({
        id: `L${a}-L${b}`,
        row: 'L',
        number: a,
        tier: 'sweetbox',
        pairLabel: `L${a},L${b}`,
        block,
      });
    });
  });

  return seats;
}

export const CINEMA_SEAT_MAP = buildCinemaSeatMap();

export const CINEMA_SEAT_ROWS = [
  ...REGULAR_ROWS.map((row) => ({ row, tier: 'regular' as const })),
  ...VIP_ROWS.map((row) => ({ row, tier: 'vip' as const })),
  { row: 'L', tier: 'sweetbox' as const },
];

export function getCinemaSeatTierMeta(tier: CinemaSeatTier) {
  return CINEMA_SEAT_TIERS.find((item) => item.id === tier) || CINEMA_SEAT_TIERS[0];
}

export function formatCinemaSeatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price);
}

export function getSeatsByRow(seats: CinemaSeat[], row: string) {
  return seats.filter((seat) => seat.row === row);
}

export function getSeatsByRowAndBlock(
  seats: CinemaSeat[],
  row: string,
  block: CinemaSeat['block'],
) {
  return seats
    .filter((seat) => seat.row === row && seat.block === block)
    .sort((a, b) => a.number - b.number);
}

export function formatCinemaSeatLabels(seatIds: string[] | null | undefined) {
  if (!seatIds?.length) {
    return '';
  }

  const labels = seatIds.map((seatId) => {
    const seat = CINEMA_SEAT_MAP.find((item) => item.id === seatId);
    return seat?.pairLabel || seatId;
  });

  return Array.from(new Set(labels)).join(', ');
}
