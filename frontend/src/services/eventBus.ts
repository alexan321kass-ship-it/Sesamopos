// Real-time Event Bus for Cross-Tab & Cross-Window Synchronization (POS, KDS, Tables, Catalog)

const CHANNEL_NAME = 'sesamo_realtime_channel';

let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        window.dispatchEvent(new CustomEvent(event.data.type, { detail: event.data.payload }));
      }
    };
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

// Global window storage listener for cross-tab localStorage changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'sesamo_orders') {
      window.dispatchEvent(new CustomEvent('sesamo_order_created'));
      window.dispatchEvent(new CustomEvent('sesamo_order_updated'));
      window.dispatchEvent(new CustomEvent('sesamo_orders_updated'));
    } else if (e.key === 'sesamo_tables') {
      window.dispatchEvent(new CustomEvent('sesamo_tables_updated'));
    } else if (e.key === 'sesamo_products' || e.key === 'sesamo_categories') {
      window.dispatchEvent(new CustomEvent('sesamo_catalog_updated'));
    } else if (e.key === 'sesamo_inventory') {
      window.dispatchEvent(new CustomEvent('sesamo_inventory_updated'));
    } else if (e.key === 'sesamo_suppliers') {
      window.dispatchEvent(new CustomEvent('sesamo_suppliers_updated'));
    } else if (e.key === 'sesamo_purchases') {
      window.dispatchEvent(new CustomEvent('sesamo_purchases_updated'));
    } else if (e.key === 'sesamo_recipes') {
      window.dispatchEvent(new CustomEvent('sesamo_recipes_updated'));
    } else if (e.key === 'sesamo_customers') {
      window.dispatchEvent(new CustomEvent('sesamo_customers_updated'));
    } else if (e.key === 'sesamo_reservations') {
      window.dispatchEvent(new CustomEvent('sesamo_reservations_updated'));
    } else if (e.key === 'sesamo_deliveries') {
      window.dispatchEvent(new CustomEvent('sesamo_deliveries_updated'));
    } else if (e.key === 'sesamo_staff') {
      window.dispatchEvent(new CustomEvent('sesamo_staff_updated'));
    } else if (e.key === 'sesamo_staff_shifts') {
      window.dispatchEvent(new CustomEvent('sesamo_shifts_updated'));
    } else if (e.key === 'sesamo_cash_register' || e.key === 'sesamo_cash_movements') {
      window.dispatchEvent(new CustomEvent('sesamo_cash_updated'));
    } else if (e.key === 'sesamo_settings') {
      window.dispatchEvent(new CustomEvent('sesamo_settings_updated'));
    }
  });
}

export type RealtimeEventType = 
  | 'sesamo_order_created'
  | 'sesamo_order_updated'
  | 'sesamo_tables_updated'
  | 'sesamo_catalog_updated'
  | 'sesamo_orders_updated'
  | 'sesamo_cash_updated'
  | 'sesamo_inventory_updated'
  | 'sesamo_suppliers_updated'
  | 'sesamo_purchases_updated'
  | 'sesamo_recipes_updated'
  | 'sesamo_customers_updated'
  | 'sesamo_reservations_updated'
  | 'sesamo_deliveries_updated'
  | 'sesamo_staff_updated'
  | 'sesamo_shifts_updated'
  | 'sesamo_shift_logs_updated'
  | 'sesamo_settings_updated'
  | 'sesamo_waiter_called';

export const notifyRealtimeEvent = (type: RealtimeEventType, payload?: any) => {
  // 1. Dispatch local window event
  window.dispatchEvent(new CustomEvent(type, { detail: payload }));

  // 2. Broadcast across all open browser windows/tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (e) {}
  }
};

export const subscribeRealtimeEvents = (onEvent: (type: RealtimeEventType, payload?: any) => void) => {
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      onEvent(event.data.type as RealtimeEventType, event.data.payload);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handler);
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'sesamo_orders') {
      onEvent('sesamo_order_created');
      onEvent('sesamo_order_updated');
      onEvent('sesamo_orders_updated');
    } else if (e.key === 'sesamo_tables') {
      onEvent('sesamo_tables_updated');
    } else if (e.key === 'sesamo_products' || e.key === 'sesamo_categories') {
      onEvent('sesamo_catalog_updated');
    } else if (e.key === 'sesamo_inventory') {
      onEvent('sesamo_inventory_updated');
    } else if (e.key === 'sesamo_suppliers') {
      onEvent('sesamo_suppliers_updated');
    } else if (e.key === 'sesamo_purchases') {
      onEvent('sesamo_purchases_updated');
    } else if (e.key === 'sesamo_recipes') {
      onEvent('sesamo_recipes_updated');
    } else if (e.key === 'sesamo_customers') {
      onEvent('sesamo_customers_updated');
    } else if (e.key === 'sesamo_reservations') {
      onEvent('sesamo_reservations_updated');
    } else if (e.key === 'sesamo_deliveries') {
      onEvent('sesamo_deliveries_updated');
    } else if (e.key === 'sesamo_staff') {
      onEvent('sesamo_staff_updated');
    } else if (e.key === 'sesamo_staff_shifts') {
      onEvent('sesamo_shifts_updated');
    } else if (e.key === 'sesamo_cash_register' || e.key === 'sesamo_cash_movements') {
      onEvent('sesamo_cash_updated');
    }
  };

  window.addEventListener('storage', storageHandler);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handler);
    }
    window.removeEventListener('storage', storageHandler);
  };
};

