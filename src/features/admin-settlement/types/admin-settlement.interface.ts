export interface OverrideSettlementRequest {
  reason: string;
}

export interface OverrideSettlementResult {
  id: string;
  status: string;
  overrideBy: string;
  overrideAt: string;
  previousStatus: string;
  settlementAmount: number;
  cafeId: string;
  cafeName: string;
  bookingId: string;
}
