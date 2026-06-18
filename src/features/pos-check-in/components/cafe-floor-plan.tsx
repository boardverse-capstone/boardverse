'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TABLE_STATUS_COLORS } from '@/core/constants/pos-check-in';
import { SessionTimer } from './session-timer';
import type { CafeTable } from '../types/pos-check-in.interface';

interface CafeFloorPlanProps {
  tables: CafeTable[];
  selectedTableId?: string;
  onSelectTable: (table: CafeTable) => void;
}

export function CafeFloorPlan({ tables, selectedTableId, onSelectTable }: CafeFloorPlanProps) {
  const zones = [...new Set(tables.map((t) => t.zone))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(TABLE_STATUS_COLORS).map(([status, style]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-3 w-3 rounded-sm border',
                status === 'Occupied' && 'bg-red-600 border-red-700',
                status === 'Reserved' && 'bg-amber-100 border-amber-300',
                status === 'Available' && 'bg-emerald-100 border-emerald-200',
              )}
            />
            <span>{style.label}</span>
          </div>
        ))}
      </div>

      {zones.map((zone) => {
        const zoneTables = tables.filter((t) => t.zone === zone);
        return (
          <div key={zone}>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">{zone}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:gap-3">
              {zoneTables.map((table) => {
                const colors = TABLE_STATUS_COLORS[table.status];
                const isSelected = selectedTableId === table.id;
                const isOccupied = table.status === 'Occupied';

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onSelectTable(table)}
                    className={cn(
                      'relative flex min-h-[88px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all',
                      colors.bg,
                      isSelected && 'ring-2 ring-primary ring-offset-2',
                      table.status === 'Available' && 'cursor-default opacity-80',
                    )}
                    disabled={table.status === 'Available'}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isOccupied ? 'text-white' : 'text-foreground',
                      )}
                    >
                      {table.label}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 text-[10px]',
                        isOccupied ? 'text-red-100' : 'text-muted-foreground',
                      )}
                    >
                      {table.seats} chỗ
                    </span>

                    <Badge className={cn('mt-2 text-[10px]', colors.badge)}>{colors.label}</Badge>

                    {isOccupied && table.startedAt && (
                      <div className="mt-2 flex flex-col items-center gap-0.5">
                        <SessionTimer
                          startedAt={table.startedAt}
                          className="font-mono text-lg font-bold text-white tabular-nums"
                        />
                        {table.gameName && (
                          <span className="max-w-full truncate text-[10px] text-red-100">
                            {table.gameName}
                          </span>
                        )}
                      </div>
                    )}

                    {table.status === 'Reserved' && (
                      <span className="mt-1 text-[10px] text-amber-700">Chờ check-in</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
