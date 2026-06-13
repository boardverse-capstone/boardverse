import { KARMA_WARNING_THRESHOLD } from '@/core/constants/behavior-monitoring';
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { ManagedUser } from '@/features/user-management/types/user.interface';
import type { LowKarmaUser } from '../types/behavior.interface';

function toLowKarmaUser(user: ManagedUser): LowKarmaUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    karmaPoints: user.karmaPoints ?? 100,
    role: user.role,
    isBlocked: user.isBlocked,
  };
}

export const BehaviorSanctionService = {
  getLowKarmaUsers: async (search?: string): Promise<LowKarmaUser[]> => {
    const pageSize = 100;
    let page = 1;
    let allUsers: ManagedUser[] = [];
    let totalPages = 1;

    do {
      const response = await UserManagementService.getUsers({
        page,
        limit: pageSize,
        search,
        role: 'User',
      });
      allUsers = allUsers.concat(response.data);
      totalPages = response.meta.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 10);

    return allUsers
      .map(toLowKarmaUser)
      .filter((user) => user.karmaPoints < KARMA_WARNING_THRESHOLD)
      .sort((a, b) => a.karmaPoints - b.karmaPoints);
  },
};
