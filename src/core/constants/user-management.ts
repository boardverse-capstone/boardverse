export const MANAGED_ROLE_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'User', label: 'Player' },
  { value: 'Manager', label: 'Cafe Manager' },
  { value: 'Staff', label: 'Staff' },
] as const;

export const MANAGED_ROLE_LABELS: Record<string, string> = {
  User: 'Player',
  Player: 'Player',
  Manager: 'Cafe Manager',
  'Cafe Manager': 'Cafe Manager',
  Staff: 'Staff',
  Admin: 'Admin',
};

export const ASSIGNABLE_ROLES = [
  { value: 'User', label: 'Player' },
  { value: 'Manager', label: 'Cafe Manager' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Admin', label: 'Admin' },
] as const;

export const MANAGED_ROLE_COLORS: Record<string, string> = {
  User: 'bg-sky-100 text-sky-800 border-sky-200',
  Player: 'bg-sky-100 text-sky-800 border-sky-200',
  Manager: 'bg-violet-100 text-violet-800 border-violet-200',
  Staff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Admin: 'bg-amber-100 text-amber-800 border-amber-200',
};
