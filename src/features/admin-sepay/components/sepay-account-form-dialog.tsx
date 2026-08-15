'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type {
  CreateSePayAccountRequest,
  SePayAccount,
  SePayAccountType,
  SePayEnvironment,
  UpdateSePayAccountRequest,
} from '../types/sepay-account.interface';

export type SePayAccountFormValues = CreateSePayAccountRequest;

interface SePayAccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: SePayAccount | null;
  onSubmit: (values: SePayAccountFormValues | UpdateSePayAccountRequest) => void;
  isPending: boolean;
}

const EMPTY_FORM: SePayAccountFormValues = {
  accountType: 'Cafe',
  cafeId: '',
  environment: 'Production',
  bankCode: '',
  accountNumber: '',
  accountHolder: '',
  merchantId: '',
  apiKey: '',
  secretKey: '',
  webhookToken: '',
  apiBaseUrl: '',
  returnUrl: '',
};

export function SePayAccountFormDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
  isPending,
}: SePayAccountFormDialogProps) {
  const [form, setForm] = useState<SePayAccountFormValues>(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (account) {
      setForm({
        accountType: (account.accountType as SePayAccountType) || 'Cafe',
        cafeId: account.cafeId ?? '',
        environment: (account.environment as SePayEnvironment) || 'Production',
        bankCode: account.bankCode ?? '',
        accountNumber: '',
        accountHolder: account.accountHolder ?? '',
        merchantId: account.merchantId ?? '',
        apiKey: '',
        secretKey: '',
        webhookToken: '',
        apiBaseUrl: account.apiBaseUrl ?? '',
        returnUrl: account.returnUrl ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [open, account]);

  const updateField = <K extends keyof SePayAccountFormValues>(
    key: K,
    value: SePayAccountFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const bankCode = form.bankCode.trim();
    const accountHolder = form.accountHolder.trim();
    const accountNumber = form.accountNumber.trim();
    const cafeId = form.cafeId?.trim() || '';

    if (!bankCode || !accountHolder) {
      setError('Vui lòng nhập bankCode và accountHolder.');
      return;
    }

    if (!account && !accountNumber) {
      setError('Vui lòng nhập số tài khoản.');
      return;
    }

    if (form.accountType === 'Cafe' && !cafeId) {
      setError('accountType Cafe yêu cầu cafeId.');
      return;
    }

    const optional = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    };

    if (account) {
      const payload: UpdateSePayAccountRequest = {
        environment: form.environment,
        bankCode,
        accountHolder,
        cafeId: form.accountType === 'Cafe' ? cafeId : null,
        accountNumber: optional(accountNumber),
        merchantId: optional(form.merchantId),
        apiKey: optional(form.apiKey),
        secretKey: optional(form.secretKey),
        webhookToken: optional(form.webhookToken),
        apiBaseUrl: optional(form.apiBaseUrl),
        returnUrl: optional(form.returnUrl),
      };
      setError('');
      onSubmit(payload);
      return;
    }

    const payload: CreateSePayAccountRequest = {
      accountType: form.accountType,
      cafeId: form.accountType === 'Cafe' ? cafeId : null,
      environment: form.environment,
      bankCode,
      accountNumber,
      accountHolder,
      merchantId: optional(form.merchantId),
      apiKey: optional(form.apiKey),
      secretKey: optional(form.secretKey),
      webhookToken: optional(form.webhookToken),
      apiBaseUrl: optional(form.apiBaseUrl),
      returnUrl: optional(form.returnUrl),
    };

    setError('');
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? 'Cập nhật SePay account' : 'Tạo SePay account'}</DialogTitle>
          <DialogDescription>
            Quản lý tài khoản SePay Master/Cafe (không dùng payment-master deprecated).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {!account && (
            <div className="grid gap-2">
              <Label>Loại tài khoản</Label>
              <Select
                value={form.accountType}
                onValueChange={(value) => updateField('accountType', value as SePayAccountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Cafe">Cafe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(form.accountType === 'Cafe' || account?.accountType === 'Cafe') && (
            <div className="grid gap-2">
              <Label htmlFor="sepay-cafe-id">Cafe ID</Label>
              <Input
                id="sepay-cafe-id"
                value={form.cafeId ?? ''}
                onChange={(e) => updateField('cafeId', e.target.value)}
                placeholder="UUID cafe"
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Môi trường</Label>
            <Select
              value={form.environment}
              onValueChange={(value) => updateField('environment', value as SePayEnvironment)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Test">Test</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-bank-code">Mã ngân hàng</Label>
            <Input
              id="sepay-bank-code"
              value={form.bankCode}
              onChange={(e) => updateField('bankCode', e.target.value)}
              placeholder="VCB, MBBank, BIDV..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-account-number">
              Số tài khoản {account ? '(để trống nếu giữ nguyên)' : ''}
            </Label>
            <Input
              id="sepay-account-number"
              value={form.accountNumber}
              onChange={(e) => updateField('accountNumber', e.target.value)}
              placeholder={account?.maskedAccountNumber || 'Số TK ngân hàng'}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-account-holder">Chủ tài khoản</Label>
            <Input
              id="sepay-account-holder"
              value={form.accountHolder}
              onChange={(e) => updateField('accountHolder', e.target.value)}
              placeholder="NGUYEN VAN A"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-merchant-id">Merchant ID (tuỳ chọn)</Label>
            <Input
              id="sepay-merchant-id"
              value={form.merchantId ?? ''}
              onChange={(e) => updateField('merchantId', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-api-key">API Key (tuỳ chọn)</Label>
            <Input
              id="sepay-api-key"
              value={form.apiKey ?? ''}
              onChange={(e) => updateField('apiKey', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-secret-key">Secret Key (tuỳ chọn)</Label>
            <Input
              id="sepay-secret-key"
              type="password"
              value={form.secretKey ?? ''}
              onChange={(e) => updateField('secretKey', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-webhook-token">Webhook Token (tuỳ chọn)</Label>
            <Input
              id="sepay-webhook-token"
              value={form.webhookToken ?? ''}
              onChange={(e) => updateField('webhookToken', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-api-base-url">API Base URL (tuỳ chọn)</Label>
            <Input
              id="sepay-api-base-url"
              value={form.apiBaseUrl ?? ''}
              onChange={(e) => updateField('apiBaseUrl', e.target.value)}
              placeholder="https://pgapi.sepay.vn"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sepay-return-url">Return URL (tuỳ chọn)</Label>
            <Input
              id="sepay-return-url"
              value={form.returnUrl ?? ''}
              onChange={(e) => updateField('returnUrl', e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang lưu...
              </>
            ) : account ? (
              'Cập nhật'
            ) : (
              'Tạo mới'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
