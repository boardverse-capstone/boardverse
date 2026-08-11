import { redirect } from 'next/navigation';
import { ROUTES } from '@/core/constants/routes';

export default function StaffRootPage() {
  redirect(ROUTES.STAFF.POS);
}
