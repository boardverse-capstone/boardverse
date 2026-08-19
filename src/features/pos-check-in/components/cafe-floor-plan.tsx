'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TABLE_STATUS_COLORS } from '@/core/constants/pos-check-in';
import { SessionTimer } from './session-timer';
import type { CafeTable, FloorPlanStatusFilter } from '../types/pos-check-in.interface';

interface CafeFloorPlanProps {
  tables: CafeTable[];
  selectedTableId?: string;
  onSelectTable: (table: CafeTable) => void;
  statusFilter?: FloorPlanStatusFilter;
  onStatusFilterChange?: (value: FloorPlanStatusFilter) => void;
  includeInactive?: boolean;
  onIncludeInactiveChange?: (value: boolean) => void;
}

function compareTables(a: CafeTable, b: CafeTable): number {
  const orderA = a.sortOrder;
  const orderB = b.sortOrder;
  if (orderA != null && orderB != null && orderA !== orderB) {
    return orderA - orderB;
  }
  return a.label.localeCompare(b.label, 'vi', { numeric: true, sensitivity: 'base' });
}

const STATUS_FILTER_OPTIONS: { value: FloorPlanStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Available', label: 'Trống' },
  { value: 'Reserved', label: 'Đã đặt' },
  { value: 'Occupied', label: 'Đang sử dụng' },
];

export function CafeFloorPlan({
  tables,
  selectedTableId,
  onSelectTable,
  statusFilter = 'all',
  onStatusFilterChange,
  includeInactive = false,
  onIncludeInactiveChange,
}: CafeFloorPlanProps) {
  const zones = [...new Set(tables.map((t) => t.zone))];
  const showFilters = Boolean(onStatusFilterChange);

  return (
    <div className="space-y-4 md:space-y-5">
      {showFilters && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => {
              if (!value || !onStatusFilterChange) return;
              onStatusFilterChange(value as FloorPlanStatusFilter);
            }}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-1 rounded-lg border bg-muted/40 p-1 sm:w-auto"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className={cn(
                  'rounded-md border-0 px-3 text-xs font-medium text-muted-foreground shadow-none sm:text-sm',
                  'hover:bg-background/80 hover:text-foreground',
                  'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm',
                  'data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background',
                )}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs md:text-sm">
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

      {tables.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
          Không có bàn 
        </div>
      ) : (
        zones.map((zone) => {
          const zoneTables = tables.filter((t) => t.zone === zone).sort(compareTables);
          return (
            <div key={zone}>
              <p className="mb-2 text-sm font-semibold text-muted-foreground md:text-base">{zone}</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
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
                        'relative flex min-h-[96px] touch-manipulation flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all active:scale-[0.98] md:min-h-[112px] md:p-4',
                        colors.bg,
                        isSelected && 'ring-2 ring-offset-2 ring-foreground/40',
                        table.status === 'Available' &&
                          'cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all',
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-bold md:text-base',
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
                            className="font-mono text-lg font-bold text-white tabular-nums md:text-xl"
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
        })
      )}
    </div>
  );
}
