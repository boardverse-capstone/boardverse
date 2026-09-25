// src/features/lobby-merge/index.ts
/**
 * Public API của feature `lobby-merge`.
 *
 * Service + hooks + UI components đều gọi API thật (BE `LobbyMergeController`).
 * KHÔNG mock, KHÔNG hardcode.
 *
 * Docs tham chiếu: `APIs/lobby-merge.md`.
 */

export { LobbyMergeService, LOBBY_MERGE_QUERY_KEYS } from './services/lobby-merge.service';
export type {
  LobbyMergeRequestDto,
  LobbyMergeRequestStatus,
  LobbyMergeAuditLogDto,
  LobbyMergeAuditAction,
  CreateMergeRequestPayload,
  ApproveMergeRequestPayload,
  RejectMergeRequestPayload,
  ApproveMergeRequestResult,
  RejectMergeRequestResult,
  CancelMergeRequestResult,
  DemoBypassOptions,
} from './types/lobby-merge.interface';
export { LOBBY_MERGE_STATUS_LABELS } from './types/lobby-merge.interface';

export {
  usePendingMergeRequests,
  useMergeRequestDetail,
  useLobbyMergeRequests,
  useLobbyMergeHistory,
} from './hooks/useMergeRequests';

export {
  useCreateMergeRequest,
  useApproveMergeRequest,
  useRejectMergeRequest,
  useCancelMergeRequest,
  useBulkCreateMergeRequests,
} from './hooks/useMergeRequestMutations';

export {
  useLobbyMergeRealtime,
  subscribeLobbyMergedInto,
  subscribeMemberJoinedFromMerge,
} from './hooks/useLobbyMergeRealtime';

export { LobbyMergePanel } from './components/lobby-merge-panel';
export { LobbyMergeCreateDialog } from './components/lobby-merge-create-dialog';
export { LobbyMergeReviewDialog } from './components/lobby-merge-review-dialog';
export type {
  LobbyOption,
  LobbyMergeMember,
  LobbyMergeCreateDialogProps,
} from './components/lobby-merge-create-dialog';
export type { LobbyMergeReviewDialogProps } from './components/lobby-merge-review-dialog';
export type { LobbyMergePanelProps } from './components/lobby-merge-panel';
