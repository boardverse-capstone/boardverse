import { redirect } from 'next/navigation';
import { ROUTES } from '@/core/constants/routes';

/** Root page – redirect ngay về trang login */
export default function HomePage() {
  redirect(ROUTES.AUTH.LOGIN);
}
