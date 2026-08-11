import type { MasterGameComponent, RawMasterGameComponent } from '../types/master-game.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return 0;
}

export function mapApiMasterGameComponent(raw: RawMasterGameComponent): MasterGameComponent {
  return {
    componentId: pickString(raw.componentId, raw.ComponentId, raw.id, raw.Id),
    name: pickString(raw.name, raw.Name),
    type: pickString(raw.type, raw.Type),
    defaultQuantity: pickNumber(
      raw.defaultQuantity,
      raw.DefaultQuantity,
      raw.quantityInBox,
      raw.QuantityInBox,
    ),
  };
}

export function normalizeMasterGameComponentList(
  raw:
    | RawMasterGameComponent[]
    | { data?: RawMasterGameComponent[]; items?: RawMasterGameComponent[] }
    | null
    | undefined,
): MasterGameComponent[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.data ?? raw.items ?? [];
  return items.map(mapApiMasterGameComponent);
}
