import { create } from 'zustand';
import { Order, OrderItem, OrderItemModifier, Product } from '../types';

export interface PosDeliveryInfo {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryZone?: string;
  deliveryFee: number;
  paymentMethod: 'EFECTIVO' | 'DATAFONO' | 'TRANSFERENCIA';
  cashAmountPaidWith?: number;
  deliveryNotes?: string;
}

interface PosState {
  currentTableId: string | null;
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  editingOrderStatus: string | null;
  items: OrderItem[];
  deliveryInfo: PosDeliveryInfo | null;
  setTable: (tableId: string | null) => void;
  setDeliveryInfo: (info: PosDeliveryInfo | null) => void;
  loadExistingOrder: (order: Order) => void;
  addItem: (product: Product, quantity: number, modifiers: OrderItemModifier[], notes?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;
  getTotals: () => { subtotal: number; tax: number; deliveryFee: number; total: number };
}

export const usePosStore = create<PosState>((set, get) => ({
  currentTableId: null,
  editingOrderId: null,
  editingOrderNumber: null,
  editingOrderStatus: null,
  items: [],
  deliveryInfo: null,
  setTable: (tableId) => set({
    currentTableId: tableId,
    editingOrderId: null,
    editingOrderNumber: null,
    editingOrderStatus: null,
    deliveryInfo: tableId === 'DOMICILIO' ? (get().deliveryInfo || {
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      deliveryCity: 'Medellín',
      deliveryZone: 'Salón / Centro',
      deliveryFee: 5000,
      paymentMethod: 'EFECTIVO',
      cashAmountPaidWith: 50000,
      deliveryNotes: ''
    }) : null
  }),
  setDeliveryInfo: (info) => set({ deliveryInfo: info }),
  loadExistingOrder: (order) => {
    const isOrderAlreadyServed = order.status === 'ENTREGADO' || order.status === 'LISTO';
    const existingItems = (order.items || []).map(item => ({
      ...item,
      modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
      // Si el pedido ya estaba servido o el ítem ya estaba marcado como entregado, preservamos su entrega
      isDelivered: item.isDelivered !== undefined ? item.isDelivered : isOrderAlreadyServed
    }));

    set({
      editingOrderId: order.id,
      editingOrderNumber: order.orderNumber,
      editingOrderStatus: order.status,
      currentTableId: order.tableId || null,
      items: existingItems,
    });
  },
  addItem: (product, quantity, modifiers, notes) => {
    const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0);
    const unitPrice = product.price + modifiersTotal;
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      modifiers,
      notes,
      isDelivered: false, // Las adiciones nuevas entran pendientes de preparar
    };
    set((state) => ({ items: [...state.items, newItem] }));
  },
  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },
  updateQuantity: (itemId, quantity) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.id === itemId) {
          return { ...i, quantity, totalPrice: i.unitPrice * quantity };
        }
        return i;
      }),
    }));
  },
  clearOrder: () => set({ items: [], currentTableId: null, editingOrderId: null, editingOrderNumber: null, editingOrderStatus: null, deliveryInfo: null }),
  getTotals: () => {
    const { items, currentTableId, deliveryInfo } = get();
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = currentTableId === 'DOMICILIO' ? (deliveryInfo?.deliveryFee ?? 5000) : 0;
    const tax = 0; // simplified for now
    const total = subtotal + deliveryFee + tax;
    return { subtotal, tax, deliveryFee, total };
  },
}));
