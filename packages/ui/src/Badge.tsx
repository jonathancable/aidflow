import React from 'react';

type BadgeColor = 'gray' | 'blue' | 'teal' | 'amber' | 'red';

interface BadgeProps {
  label:    string;
  color?:   BadgeColor;
  size?:    'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label, color = 'gray', size = 'md'
}) => (
  <span className={`badge badge-${color} badge-${size}`}>
    {label}
  </span>
);

// Helper: maps AidFlow status strings to badge colors
// Import BatchStatus etc. from @aidflow/shared in the consuming component,
// then use this map to derive the badge color.
export const batchStatusColor: Record<string, BadgeColor> = {
  draft:               'gray',
  submitted:           'blue',
  approved:            'teal',
  released:            'teal',
  in_delivery:         'amber',
  completed:           'teal',
  partially_completed: 'amber',
  cancelled:           'red',
};

export const allocationStatusColor: Record<string, BadgeColor> = {
  draft:            'gray',
  pending_approval: 'amber',
  approved:         'teal',
  released:         'teal',
  rejected:         'red',
  reversed:         'red',
};