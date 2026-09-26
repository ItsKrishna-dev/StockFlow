export const MOCK_KPIS = {
  receipt: {
    title: 'Receipt',
    icon: 'move_to_inbox',
    stripeColor: 'var(--stockflow-primary)',
    actionText: '4 to receive',
    lateCount: 1,
    operationsCount: 6,
    progressDone: 1,
    progressTotal: 6,
    subReference: 'WH/IN Receipts',
    segments: [
      { color: '#ba1a1a', width: '17%' }, // Late
      { color: '#006398', width: '50%' }, // Ready
      { color: '#e4e2e2', width: '33%' }, // Pending
    ],
  },
  delivery: {
    title: 'Delivery',
    icon: 'local_shipping',
    stripeColor: '#006398',
    actionText: '4 to Deliver',
    lateCount: 1,
    waitingCount: 2,
    operationsCount: 6,
    progressDone: 0,
    progressTotal: 6,
    subReference: 'WH/OUT Deliveries',
    segments: [
      { color: '#ba1a1a', width: '17%' }, // Late
      { color: '#5bb8fe', width: '33%' }, // Waiting
      { color: '#006398', width: '33%' }, // Ready
      { color: '#e4e2e2', width: '17%' }, // Backlog
    ],
  },
};

export const MOCK_TRANSFERS = [
  {
    reference: 'WH/IN/00042',
    type: 'Receipt',
    partner: 'Deco Addict',
    date: 'Yesterday (Late)',
    status: 'Late',
    statusVariant: 'error',
  },
  {
    reference: 'WH/OUT/00109',
    type: 'Delivery',
    partner: 'Azure Interior',
    date: 'Yesterday (Late)',
    status: 'Late',
    statusVariant: 'error',
  },
  {
    reference: 'WH/OUT/00110',
    type: 'Delivery',
    partner: 'Ready Mat SA',
    date: 'Today 16:30',
    status: 'Waiting',
    statusVariant: 'secondary',
  },
  {
    reference: 'WH/IN/00043',
    type: 'Receipt',
    partner: 'Wood Corner',
    date: 'Tomorrow 10:00',
    status: 'Ready',
    statusVariant: 'neutral',
  },
];
