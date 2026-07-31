import type { PartnerApplication, Registration } from '../types/partner.interface';

export function toPartnerApplication(registration: Registration): PartnerApplication {
  return {
    id: registration.id,
    cafeName: registration.basicInfo.cafeName,
    address: registration.basicInfo.address,
    phone: registration.basicInfo.phoneNumber,
    status: registration.status,
    createdAt: registration.createdAt,
    hasAlerts: registration.alerts.length > 0,
  };
}
