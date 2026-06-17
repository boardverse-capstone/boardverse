export const CREATE_USER_ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Cafe Manager' },
  { value: 'cafestaff', label: 'Cafe Staff' },
] as const;

export const MANAGED_ROLE_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'User', label: 'Player' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Cafe Manager' },
  { value: 'cafestaff', label: 'Cafe Staff' },
] as const;

export const MANAGED_ROLE_LABELS: Record<string, string> = {
  User: 'Player',
  Player: 'Player',
  Manager: 'Cafe Manager',
  'Cafe Manager': 'Cafe Manager',
  CafeStaff: 'Cafe Staff',
  cafestaff: 'Cafe Staff',
  Staff: 'Cafe Staff',
  Admin: 'Admin',
};

export const GAMER_TIER_COLORS: Record<string, string> = {
  Bronze: 'bg-amber-100 text-amber-800 border-amber-200',
  Silver: 'bg-slate-100 text-slate-800 border-slate-200',
  Gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Platinum: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Diamond: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const MANAGED_ROLE_COLORS: Record<string, string> = {
  User: 'bg-sky-100 text-sky-800 border-sky-200',
  Player: 'bg-sky-100 text-sky-800 border-sky-200',
  Manager: 'bg-violet-100 text-violet-800 border-violet-200',
  CafeStaff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cafestaff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Staff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Admin: 'bg-amber-100 text-amber-800 border-amber-200',
};
