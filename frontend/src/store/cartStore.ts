import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  maxStock: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  revalidateCart: () => Promise<string[]>;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const toCents = (v: number) => Math.round(v * 100);

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxStock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.min(Math.max(1, quantity), i.maxStock) } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const totalCents = get().items.reduce(
          (sum, item) => sum + toCents(item.price) * item.quantity,
          0
        );
        return totalCents / 100;
      },
      revalidateCart: async () => {
        const currentItems = get().items;
        if (currentItems.length === 0) return [];

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
        const notices: string[] = [];
        const updatedItems: CartItem[] = [];

        await Promise.all(
          currentItems.map(async (item) => {
            try {
              const res = await axios.get(`${apiBase}/products/${item.productId}`);
              const prod = res.data?.data;
              if (!prod || !prod.isActive) {
                notices.push(`"${item.name}" não está mais disponível e foi removido da sacola.`);
                return;
              }
              if (prod.stock <= 0) {
                notices.push(`"${prod.name}" esgotou e foi removido da sacola.`);
                return;
              }

              const currentPrice = Number(prod.promotionalPrice ?? prod.price);
              let nextQty = item.quantity;

              if (item.quantity > prod.stock) {
                nextQty = prod.stock;
                notices.push(
                  `A quantidade de "${prod.name}" foi ajustada para ${prod.stock} (estoque disponível).`
                );
              }
              if (toCents(currentPrice) !== toCents(item.price)) {
                notices.push(
                  `O preço de "${prod.name}" foi atualizado de ${formatBRL(item.price)} para ${formatBRL(currentPrice)}.`
                );
              }

              updatedItems.push({
                ...item,
                name: prod.name,
                price: currentPrice,
                image: prod.image || item.image,
                quantity: nextQty,
                maxStock: prod.stock,
              });
            } catch (err) {
              if (axios.isAxiosError(err) && err.response?.status === 404) {
                notices.push(`"${item.name}" não está mais disponível e foi removido da sacola.`);
              } else {
                // Em caso de falha de rede pontual, mantém o item atual
                updatedItems.push(item);
              }
            }
          })
        );

        set({ items: updatedItems });
        return notices;
      },
    }),
    {
      name: 'memorare-cart',
    }
  )
);
