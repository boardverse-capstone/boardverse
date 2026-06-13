import { redirect } from 'next/navigation';
import { ROUTES } from '@/core/constants/routes';

export default function AdminSecurityPage() {
  redirect(ROUTES.ADMIN.KARMA_LOGS);
}
