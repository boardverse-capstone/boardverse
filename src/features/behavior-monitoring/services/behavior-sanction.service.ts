import { KARMA_WARNING_THRESHOLD } from '@/core/constants/behavior-monitoring';
import { isPlayerRole } from '@/core/constants/user-management';
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { ManagedUser } from '@/features/user-management/types/user.interface';
import type { LowKarmaUser } from '../types/behavior.interface';

function toLowKarmaUser(user: ManagedUser): LowKarmaUser | null {
  if (user.karmaPoints == null) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    karmaPoints: user.karmaPoints,
    role: user.role,
    isBlocked: user.isBlocked,
  };
}

async function fetchAllUsers(search?: string): Promise<ManagedUser[]> {
  const pageSize = 100;
  let page = 1;
  let allUsers: ManagedUser[] = [];
  let totalPages = 1;

  do {
    const response = await UserManagementService.getUsers({
      page,
      limit: pageSize,
      search,
    });
    allUsers = allUsers.concat(response.data);
    totalPages = response.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 10);

  return allUsers;
}

async function enrichUsersWithKarma(users: ManagedUser[]): Promise<ManagedUser[]> {
  const missingKarma = users.filter((user) => user.karmaPoints == null);
  if (missingKarma.length === 0) return users;

  const enriched = await Promise.all(
    missingKarma.map(async (user) => {
      try {
        return await UserManagementService.getUserById(user.id);
      } catch {
        return user;
      }
    }),
  );

  const enrichedById = new Map(enriched.map((user) => [user.id, user]));
  return users.map((user) => enrichedById.get(user.id) ?? user);
}

export const BehaviorSanctionService = {
  getLowKarmaUsers: async (search?: string): Promise<LowKarmaUser[]> => {
    const allUsers = await fetchAllUsers(search);
    const players = allUsers.filter((user) => isPlayerRole(user.role));
    const withKarma = await enrichUsersWithKarma(players);

    return withKarma
      .map(toLowKarmaUser)
      .filter(
        (user): user is LowKarmaUser =>
          user != null && user.karmaPoints < KARMA_WARNING_THRESHOLD,
      )
      .sort((a, b) => a.karmaPoints - b.karmaPoints);
  },
};
