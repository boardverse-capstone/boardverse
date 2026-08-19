import { redirect } from 'next/navigation';
import { ROUTES } from '@/core/constants/routes';

/** Hộp game đã gom vào Kho game → tab Hộp vật lý */
export default function StaffPosBoxesPage() {
  redirect(ROUTES.STAFF.INVENTORY_BOXES);
}
