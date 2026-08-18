'use client';

import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useSystemConfigLookup } from '../hooks/useSystemConfigLookup';

const QUICK_KEYS = [
  'demo_loosen_lobby_constraints',
  'bypass_time_window_validations',
  'elo_k_factor',
  'platform_commission_rate',
] as const;

function formatParsedValue(value: boolean | number | string | null) {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function SystemConfigLookupPanel() {
  const [key, setKey] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const lookup = useSystemConfigLookup();

  const runLookup = (nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed) {
      setFormError('Vui lòng nhập config key.');
      return;
    }
    setFormError(null);
    setKey(trimmed);
    lookup.mutate(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runLookup(key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tra cứu config theo key</CardTitle>
        <CardDescription>
          Chỉ đọc giá trị runtime từ GET /api/v1/system-configs/{'{key}'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="system-config-key">Config key</Label>
            <Input
              id="system-config-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Ví dụ: demo_loosen_lobby_constraints"
              className="font-mono text-xs"
            />
          </div>
          <Button type="submit" disabled={lookup.isPending}>
            {lookup.isPending ? (
              <Spinner className="mr-2" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Tra cứu
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {QUICK_KEYS.map((quickKey) => (
            <Button
              key={quickKey}
              type="button"
              size="sm"
              variant="outline"
              disabled={lookup.isPending}
              onClick={() => runLookup(quickKey)}
              className="h-7 font-mono text-[10px]"
            >
              {quickKey}
            </Button>
          ))}
        </div>

        {formError && <p className="text-sm text-rose-600">{formError}</p>}

        {lookup.data && (
          <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Config key</p>
              <p className="break-all font-mono text-xs font-semibold">
                {lookup.data.configKey}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kiểu dữ liệu</p>
              <Badge variant="outline">{lookup.data.inferredType}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Giá trị raw</p>
              <p className="break-all font-mono">{lookup.data.configValue}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Giá trị parsed</p>
              <p className="break-all font-mono font-semibold">
                {formatParsedValue(lookup.data.parsedValue)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Mô tả</p>
              <p>{lookup.data.description || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Cập nhật lúc</p>
              <p>
                {lookup.data.updatedAt
                  ? new Date(lookup.data.updatedAt).toLocaleString('vi-VN')
                  : '—'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
