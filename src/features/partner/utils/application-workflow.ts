import type {
  ApplicationPrimaryAction,
  PartnerApplication,
} from '../types/partner.interface';

export function canApproveApplication(
  application: Pick<PartnerApplication, 'applicationStatus'>,
): boolean {
  return application.applicationStatus === 'PENDING';
}

export function canActivateApplication(
  application: Pick<PartnerApplication, 'applicationStatus' | 'canActivate'>,
): boolean {
  return application.applicationStatus === 'APPROVED' && application.canActivate;
}

export function canRejectApplication(
  application: Pick<PartnerApplication, 'applicationStatus'>,
): boolean {
  return application.applicationStatus === 'PENDING';
}

export function getApplicationPrimaryAction(
  application: Pick<PartnerApplication, 'applicationStatus' | 'canActivate'>,
): ApplicationPrimaryAction | null {
  if (canApproveApplication(application)) return 'APPROVE';
  if (canActivateApplication(application)) return 'ACTIVATE';
  return null;
}

export function isApplicationListVisible(application: PartnerApplication): boolean {
  return !(application.applicationStatus === 'APPROVED' && application.operationalStatus === 'ACTIVE');
}

export function filterApplicationsByStatus(
  applications: PartnerApplication[],
  status?: string,
): PartnerApplication[] {
  if (!status || status === 'all') return applications;
  return applications.filter((item) => item.applicationStatus === status);
}
