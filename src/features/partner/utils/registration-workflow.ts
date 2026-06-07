import {
  ADMIN_ACTIONABLE_STATUSES,
  TERMINAL_REGISTRATION_STATUSES,
} from '@/core/constants/partner-registration';
import type {
  Registration,
  RegistrationAction,
  RegistrationStatus,
  StatusHistoryEntry,
} from '../types/partner.interface';

const ACTION_TRANSITIONS: Record<
  Exclude<RegistrationAction, 'REJECT'>,
  { from: RegistrationStatus[]; to: RegistrationStatus }
> = {
  PASS_OPS_ASSESSMENT: { from: ['PENDING_REVIEW'], to: 'PENDING_NEGOTIATION' },
  REQUEST_ADDITIONAL_INFO: { from: ['PENDING_REVIEW'], to: 'PENDING_INFO' },
  FLAG_FOR_VERIFICATION: { from: ['PENDING_REVIEW'], to: 'NEEDS_OPS_VERIFICATION' },
  CONFIRM_VERIFICATION: { from: ['NEEDS_OPS_VERIFICATION'], to: 'PENDING_NEGOTIATION' },
  RECORD_CONTRACT_SIGNED: { from: ['PENDING_NEGOTIATION'], to: 'CONTRACT_SIGNED' },
  CANCEL_NEGOTIATION: { from: ['PENDING_NEGOTIATION'], to: 'CANCELLED' },
  ACTIVATE_PARTNER: { from: ['DATA_BLANK'], to: 'ACTIVE' },
};

const REJECTABLE_STATUSES: RegistrationStatus[] = [
  'PENDING_REVIEW',
  'NEEDS_OPS_VERIFICATION',
  'PENDING_INFO',
  'PENDING_NEGOTIATION',
];

export function isTerminalStatus(status: RegistrationStatus): boolean {
  return TERMINAL_REGISTRATION_STATUSES.includes(status);
}

export function isAdminActionable(status: RegistrationStatus): boolean {
  return ADMIN_ACTIONABLE_STATUSES.includes(status);
}

/** Đơn đã kích hoạt rời danh sách kiểm duyệt; các trạng thái khác (kể cả REJECTED) vẫn hiển thị */
export function isAdminListVisible(status: RegistrationStatus): boolean {
  return status !== 'ACTIVE';
}

export function canPerformAction(
  status: RegistrationStatus,
  action: RegistrationAction,
): boolean {
  if (isTerminalStatus(status)) return false;

  if (action === 'REJECT') {
    return REJECTABLE_STATUSES.includes(status);
  }

  const rule = ACTION_TRANSITIONS[action];
  return rule.from.includes(status);
}

export function getPrimaryAction(status: RegistrationStatus): RegistrationAction | null {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'PASS_OPS_ASSESSMENT';
    case 'NEEDS_OPS_VERIFICATION':
      return 'CONFIRM_VERIFICATION';
    case 'PENDING_NEGOTIATION':
      return 'RECORD_CONTRACT_SIGNED';
    case 'DATA_BLANK':
      return 'ACTIVATE_PARTNER';
    default:
      return null;
  }
}

export function getAvailableActions(status: RegistrationStatus): RegistrationAction[] {
  const actions: RegistrationAction[] = [];

  (Object.keys(ACTION_TRANSITIONS) as Array<Exclude<RegistrationAction, 'REJECT'>>).forEach(
    (action) => {
      if (canPerformAction(status, action)) {
        actions.push(action);
      }
    },
  );

  if (canPerformAction(status, 'REJECT')) {
    actions.push('REJECT');
  }

  return actions;
}

export function resolveNextStatus(
  currentStatus: RegistrationStatus,
  action: RegistrationAction,
): RegistrationStatus {
  if (action === 'REJECT') return 'REJECTED';
  return ACTION_TRANSITIONS[action].to;
}

/** Sau ký HĐ: tự động tạo tài khoản Manager và chuyển DATA_BLANK */
export function resolvePostTransitionStatus(
  status: RegistrationStatus,
): RegistrationStatus {
  if (status === 'CONTRACT_SIGNED') return 'DATA_BLANK';
  return status;
}

export function appendStatusHistory(
  registration: Registration,
  status: RegistrationStatus,
  note?: string,
  changedBy = 'Admin',
): StatusHistoryEntry[] {
  return [
    ...registration.statusHistory,
    {
      status,
      changedAt: new Date().toISOString(),
      changedBy,
      note,
    },
  ];
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
