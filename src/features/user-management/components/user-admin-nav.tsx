'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconList, IconUserCog } from '@tabler/icons-react';
import { ROUTES } from '@/core/constants/routes';
import { cn } from '@/lib/utils';

function isListSectionActive(pathname: string) {
  return (
    pathname === ROUTES.ADMIN.USERS ||
    (pathname.startsWith('/admin/users/') && pathname !== ROUTES.ADMIN.USER_ROLES)
  );
}

export function UserAdminNav() {
  const pathname = usePathname();
  const isListActive = isListSectionActive(pathname);
  const isRolesActive = pathname === ROUTES.ADMIN.USER_ROLES;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={ROUTES.ADMIN.USERS}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
          isListActive
            ? 'border-indigo-300 bg-indigo-600 text-white shadow-sm'
            : 'border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50',
        )}
      >
        <IconList className="size-4" />
        Danh sách tài khoản
      </Link>

      <Link
        href={ROUTES.ADMIN.USER_ROLES}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
          isRolesActive
            ? 'border-violet-300 bg-violet-600 text-white shadow-sm'
            : 'border-violet-100 bg-white text-violet-700 hover:bg-violet-50',
        )}
      >
        <IconUserCog className="size-4" />
        Phân quyền
      </Link>
    </div>
  );
}
