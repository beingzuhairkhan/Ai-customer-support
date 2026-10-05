export interface Order {
  orderId: string;
  customerName: string;
  product: string;
  value: number;
  status: string;
  tracking?: string;
  expected?: string;
  ordered?: string;
  notes?: string;
  cancellation?: string;
  delivered?: string;
}
