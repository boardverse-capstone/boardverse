export interface MasterGameComponent {
  componentId: string;
  name: string;
  type: string;
  defaultQuantity: number;
}

export interface CreateMasterGameComponentRequest {
  name: string;
  type: string;
  defaultQuantity: number;
}

export interface UpdateMasterGameComponentRequest extends CreateMasterGameComponentRequest {}

export interface RawMasterGameComponent {
  componentId?: string;
  ComponentId?: string;
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  type?: string;
  Type?: string;
  defaultQuantity?: number;
  DefaultQuantity?: number;
  quantityInBox?: number;
  QuantityInBox?: number;
}
