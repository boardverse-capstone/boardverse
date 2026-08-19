export type TableStatus = "Available" | "Occupied" | "Reserved" | "Cleaning";

export interface PosTable {
  id: string;
  name: string;
  sortOrder: number;
  status: TableStatus;
}

export interface ActiveSession {
  id: string;
  tableId: string;
  tableName: string;
  gameName: string;
  barcode: string;
  startTime: string;
  totalMembers?: number;
}
