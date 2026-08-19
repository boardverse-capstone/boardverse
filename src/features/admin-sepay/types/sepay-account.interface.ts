export type SePayAccountType = 'Master' | 'Cafe';
export type SePayEnvironment = 'Test' | 'Production';

export interface SePayAccount {
  id: string;
  accountType: SePayAccountType | string;
  cafeId: string | null;
  cafeName?: string | null;
  environment: SePayEnvironment | string;
  bankCode: string;
  accountNumber?: string | null;
  maskedAccountNumber?: string | null;
  accountHolder: string;
  merchantId?: string | null;
  apiBaseUrl?: string | null;
  returnUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SePayAccountListParams {
  accountType?: SePayAccountType | 'all';
  cafeId?: string;
  isActive?: boolean | 'all';
}

export interface CreateSePayAccountRequest {
  accountType: SePayAccountType;
  cafeId?: string | null;
  environment?: SePayEnvironment;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  merchantId?: string;
  apiKey?: string;
  secretKey?: string;
  webhookToken?: string;
  apiBaseUrl?: string;
  returnUrl?: string;
}

export type UpdateSePayAccountRequest = Partial<CreateSePayAccountRequest> & {
  isActive?: boolean;
};

export interface UpdateSePayEnvironmentRequest {
  environment: SePayEnvironment;
}
