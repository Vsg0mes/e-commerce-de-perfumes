export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

// Classes de badge (claro/escuro)
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  SHIPPED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  CANCELLED: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
};

/** Transições que o admin pode fazer (espelha o backend). PAID só vem do webhook do Stripe. */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value: number) => brl.format(value);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Número curto do pedido: primeiros 8 caracteres do UUID. */
export const shortOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

// Tipos compartilhados das respostas de pedidos
export interface OrderItemData {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; image: string | null; volume: string | null };
}

export interface OrderAddress {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface OrderData {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  shippingAmount: number;
  trackingCode: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderItemData[];
  address: OrderAddress;
  user?: { id: string; name: string; email: string; phone: string | null };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const formatAddress = (a: OrderAddress) =>
  `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''} · ${a.neighborhood} · ${a.city}/${a.state} · CEP ${a.zipCode}`;
