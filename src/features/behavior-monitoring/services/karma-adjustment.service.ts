import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { AdjustKarmaRequest } from '../types/behavior.interface';

export const KarmaAdjustmentService = {
  adjustKarma: async (payload: AdjustKarmaRequest) => {
    const newKarma = Math.max(0, payload.currentKarma + payload.delta);

    return UserManagementService.updateUser(payload.userId, {
      karmaPoints: newKarma,
    });
  },
};
