import { mockUsers, mockStaffMembers, mockStaffShifts, mockCategories, mockProducts, mockTables, mockInventory, mockSuppliers, mockCashRegisters, mockCustomers, mockSettings, mockRecipes } from '../mocks/db';
import { User, StaffMember, StaffShiftRecord, ShiftAuditLog, Category, Product, Table, Order, InventoryItem, MeasurementUnit, Supplier, PurchaseOrder, PurchaseOrderStatus, CashRegister, Customer, DeliveryOrder, StoreSettings, Reservation, Recipe } from '../types';
import { playKitchenBellSound } from '../utils/audioAlerts';
import { notifyRealtimeEvent } from './eventBus';
import {
  getColombiaDateStr,
  getColombiaTimeStr,
  calculateShiftDurationHours,
  calculateMinutesBetween,
} from '../utils/timeUtils';

export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('tu-url-de-render')) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return 'https://sesamo-api.onrender.com/api';
};

const getStoredUserRole = (): string | undefined => {
  try {
    const raw = localStorage.getItem('sesamo_auth_user');
    if (raw) return JSON.parse(raw)?.role;
  } catch (e) {}
  return undefined;
};

// Staff & Shifts storage helpers (en memoria)
let memoryStaffCache: StaffMember[] | null = null;
export const getStoredStaff = (): StaffMember[] => {
  if (memoryStaffCache) return memoryStaffCache;
  memoryStaffCache = [...mockStaffMembers];
  return memoryStaffCache;
};

export const saveStoredStaff = (staff: StaffMember[]) => {
  memoryStaffCache = staff;
  notifyRealtimeEvent('sesamo_staff_updated');
};

let memoryShiftsCache: StaffShiftRecord[] | null = null;
export const getStoredShifts = (): StaffShiftRecord[] => {
  if (memoryShiftsCache) return memoryShiftsCache;
  memoryShiftsCache = [...mockStaffShifts];
  return memoryShiftsCache;
};

export const saveStoredShifts = (shifts: StaffShiftRecord[]) => {
  memoryShiftsCache = shifts;
  notifyRealtimeEvent('sesamo_shifts_updated');
};

let memoryShiftLogsCache: ShiftAuditLog[] | null = null;
export const getStoredShiftLogs = (): ShiftAuditLog[] => {
  if (memoryShiftLogsCache) return memoryShiftLogsCache;
  const today = getColombiaDateStr();
  memoryShiftLogsCache = [
    {
      id: 'log-init-1',
      timestamp: Date.now() - 3600000 * 3.5,
      date: today,
      time: '09:00',
      staffId: '1',
      staffName: 'Administrador General',
      role: 'ADMINISTRADOR',
      eventType: 'INICIO_TURNO',
      description: 'Apertura general del restaurante y verificación de puestos.',
    },
    {
      id: 'log-init-2',
      timestamp: Date.now() - 3600000 * 2.8,
      date: today,
      time: '10:00',
      staffId: '5',
      staffName: 'Andrea Silva',
      role: 'GERENTE',
      eventType: 'INICIO_TURNO',
      description: 'Inicio de turno en supervisión de servicio.',
    },
    {
      id: 'log-init-3',
      timestamp: Date.now() - 3600000 * 2.2,
      date: today,
      time: '11:00',
      staffId: '3',
      staffName: 'Laura Gómez',
      role: 'CAJERO',
      eventType: 'INICIO_TURNO',
      description: 'Fichaje e inicio de turno en Caja Central #1.',
    },
    {
      id: 'log-init-4',
      timestamp: Date.now() - 3600000 * 1.8,
      date: today,
      time: '11:30',
      staffId: '2',
      staffName: 'Carlos Ruiz',
      role: 'MESERO',
      eventType: 'INICIO_TURNO',
      description: 'Inicio de turno en atención de mesas salón comedor.',
    },
    {
      id: 'log-init-5',
      timestamp: Date.now() - 3600000 * 1.2,
      date: today,
      time: '11:45',
      staffId: '8',
      staffName: 'Sofía López',
      role: 'MESERO',
      eventType: 'PAUSA_INICIADA',
      description: 'Pausa de turno iniciada (salida a descanso/refrigerio).',
    },
  ];
  return memoryShiftLogsCache;
};

export const saveStoredShiftLogs = (logs: ShiftAuditLog[]) => {
  memoryShiftLogsCache = logs;
  notifyRealtimeEvent('sesamo_shift_logs_updated');
};

export const normalizeInventoryItem = (item: any, idx: number = 0): InventoryItem => {
  if (!item) {
    return {
      id: `inv-${idx + 1}`,
      code: `INS-${String(idx + 1).padStart(2, '0')}`,
      name: 'Insumo',
      category: 'General',
      unit: 'Kg',
      currentStock: 0,
      minStock: 5,
      maxStock: 50,
      unitCost: 0,
      isActive: true,
    };
  }
  const code = item.code || item.sku || `INS-${String(idx + 1).padStart(2, '0')}`;
  const unitCost = Number(item.unitCost ?? item.costPerUnit) || 0;
  const currentStock = Number(item.currentStock) || 0;
  const minStock = Number(item.minStock) || 5;
  const maxStock = Number(item.maxStock) || Math.max(minStock * 4, 50);
  const isActive = item.isActive !== undefined ? Boolean(item.isActive) : true;
  const unit = item.unit || 'Kg';
  const name = item.name || 'Insumo sin nombre';
  const category = item.category || 'General';
  const id = String(item.id || `inv-${idx + 1}`);

  return {
    id,
    code,
    name,
    category,
    unit: unit as MeasurementUnit,
    currentStock,
    minStock,
    maxStock,
    unitCost,
    isActive,
    supplierId: item.supplierId || item.supplier,
  };
};

let memoryInventoryCache: InventoryItem[] | null = null;
export const getStoredInventory = (): InventoryItem[] => {
  if (memoryInventoryCache) {
    return memoryInventoryCache.map((item, idx) => normalizeInventoryItem(item, idx));
  }
  memoryInventoryCache = mockInventory.map((item, idx) => normalizeInventoryItem(item, idx));
  return memoryInventoryCache;
};

export const saveStoredInventory = (items: InventoryItem[]) => {
  const normalized = (items || []).map((item, idx) => normalizeInventoryItem(item, idx));
  memoryInventoryCache = normalized;
  notifyRealtimeEvent('sesamo_inventory_updated');
};

let memorySuppliersCache: Supplier[] | null = null;
export const getStoredSuppliers = (): Supplier[] => {
  if (memorySuppliersCache) return memorySuppliersCache;
  memorySuppliersCache = [...mockSuppliers];
  return memorySuppliersCache;
};

export const saveStoredSuppliers = (suppliers: Supplier[]) => {
  memorySuppliersCache = suppliers;
  notifyRealtimeEvent('sesamo_suppliers_updated');
};

let memoryPurchasesCache: PurchaseOrder[] | null = null;
export const getStoredPurchases = (): PurchaseOrder[] => {
  if (memoryPurchasesCache) return memoryPurchasesCache;
  memoryPurchasesCache = [];
  return memoryPurchasesCache;
};

export const saveStoredPurchases = (orders: PurchaseOrder[]) => {
  memoryPurchasesCache = orders;
  notifyRealtimeEvent('sesamo_purchases_updated');
};

let memoryMovementsCache: any[] | null = null;
export const getStoredInventoryMovements = (): any[] => {
  if (memoryMovementsCache) return memoryMovementsCache;
  memoryMovementsCache = [];
  return memoryMovementsCache;
};

export const saveStoredInventoryMovements = (movs: any[]) => {
  memoryMovementsCache = movs;
  notifyRealtimeEvent('sesamo_inventory_updated');
};

let memoryRecipesCache: Recipe[] | null = null;
export const getStoredRecipes = (): Recipe[] => {
  if (memoryRecipesCache) return memoryRecipesCache;
  memoryRecipesCache = [...mockRecipes];
  return memoryRecipesCache;
};

export const saveStoredRecipes = (recipes: Recipe[]) => {
  memoryRecipesCache = recipes;
  notifyRealtimeEvent('sesamo_recipes_updated');
};

let memoryCustomersCache: Customer[] | null = null;
export const getStoredCustomers = (): Customer[] => {
  if (memoryCustomersCache) return memoryCustomersCache;
  memoryCustomersCache = [...mockCustomers];
  return memoryCustomersCache;
};

export const saveStoredCustomers = (customers: Customer[]) => {
  memoryCustomersCache = customers;
  notifyRealtimeEvent('sesamo_customers_updated');
};

let memorySettingsCache: StoreSettings | null = null;
export const getStoredSettings = (): StoreSettings => {
  if (memorySettingsCache) return memorySettingsCache;
  memorySettingsCache = { ...mockSettings };
  return memorySettingsCache;
};

export const saveStoredSettings = (settings: StoreSettings) => {
  memorySettingsCache = settings;
  notifyRealtimeEvent('sesamo_settings_updated');
};

let memoryReservationsCache: Reservation[] | null = null;
export const getStoredReservations = (): Reservation[] => {
  if (memoryReservationsCache) return memoryReservationsCache;
  memoryReservationsCache = [];
  return memoryReservationsCache;
};

export const saveStoredReservations = (reservations: Reservation[]) => {
  memoryReservationsCache = reservations;
  notifyRealtimeEvent('sesamo_reservations_updated');
};

let memoryDeliveriesCache: DeliveryOrder[] | null = null;
export const getStoredDeliveries = (): DeliveryOrder[] => {
  if (memoryDeliveriesCache) return memoryDeliveriesCache;
  memoryDeliveriesCache = [];
  return memoryDeliveriesCache;
};

export const saveStoredDeliveries = (deliveries: DeliveryOrder[]) => {
  memoryDeliveriesCache = deliveries;
  notifyRealtimeEvent('sesamo_deliveries_updated');
};

// Instant zero-delay response for ultra fast UI responsiveness
const delay = (_ms?: number) => Promise.resolve();

// Reliable fetch helper with 5000ms timeout for database queries
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export let memoryInventoryAlertsCache: any[] = [];

// State helpers for sync between Admin Catalog and Customer Public Menu (en memoria)
let memoryProductsCache: Product[] | null = null;

const getStoredProducts = (): Product[] => {
  if (memoryProductsCache) return memoryProductsCache;
  memoryProductsCache = [...mockProducts];
  return memoryProductsCache;
};

const saveStoredProducts = (products: Product[]) => {
  memoryProductsCache = products;
  notifyRealtimeEvent('sesamo_catalog_updated');
};

let memoryCategoriesCache: Category[] | null = null;
const getStoredCategories = (): Category[] => {
  if (memoryCategoriesCache) return memoryCategoriesCache;
  memoryCategoriesCache = [...mockCategories];
  return memoryCategoriesCache;
};

const saveStoredCategories = (categories: Category[]) => {
  memoryCategoriesCache = categories;
  notifyRealtimeEvent('sesamo_catalog_updated');
};

let memoryTablesCache: Table[] | null = null;

const getStoredTables = (): Table[] => {
  if (memoryTablesCache && memoryTablesCache.length > 0) return memoryTablesCache;
  memoryTablesCache = [...mockTables];
  return memoryTablesCache;
};

const saveStoredTables = (tables: Table[]) => {
  memoryTablesCache = tables;
  notifyRealtimeEvent('sesamo_tables_updated');
};

let memoryOrdersCache: Order[] | null = null;

const deduplicateOrders = (rawList: Order[]): Order[] => {
  const seen = new Map<string, Order>();
  const result: Order[] = [];
  for (const ord of rawList) {
    if (ord.status !== 'PAGADO' && ord.status !== 'CANCELADO') {
      const itemsKey = (ord.items || []).map((i: any) => `${i.productId || i.productName}:${i.quantity}`).sort().join(',');
      const dedupeKey = `${ord.tableId || 'notable'}_${ord.total}_${itemsKey}`;
      const existing = seen.get(dedupeKey);
      if (existing && Math.abs((Number(ord.createdAt) || 0) - (Number(existing.createdAt) || 0)) < 180000) {
        // Accidental duplicate created within 3 minutes on the same table with identical items! Skip it.
        continue;
      }
      seen.set(dedupeKey, ord);
    }
    result.push(ord);
  }
  return result;
};

const getStoredOrders = (): Order[] => {
  if (memoryOrdersCache) return deduplicateOrders(memoryOrdersCache);
  memoryOrdersCache = [];
  return memoryOrdersCache;
};

const saveStoredOrders = (orders: Order[]) => {
  memoryOrdersCache = orders;
  notifyRealtimeEvent('sesamo_order_created');
  notifyRealtimeEvent('sesamo_order_updated');
};

// Engine de Descargue Automático por Receta Técnica, Extras y Venta Directa
export const deductInventoryByRecipeAndExtras = (
  items: any[],
  orderNumber: string,
  origin: string = 'Salón'
): { deductedCount: number; summary: string[] } => {
  const inventory = [...getStoredInventory()];
  const recipes = getStoredRecipes();
  const movs = [...getStoredInventoryMovements()];
  const summary: string[] = [];
  const itemsToSync: { id: string; currentStock: number }[] = [];
  let deductedCount = 0;

  // Mapeo canónico de extras y modificadores
  const EXTRA_MAPPINGS: Record<string, { inventoryItemId: string; quantity: number; unit: string; fallbackName: string }> = {
    'o1': { inventoryItemId: '3', quantity: 0.05, unit: 'Paquete', fallbackName: 'Queso Cheddar Tajado' },
    'o2': { inventoryItemId: '11', quantity: 0.04, unit: 'Kg', fallbackName: 'Tocineta Ahumada en Tiras' },
    'o3': { inventoryItemId: '10', quantity: 1, unit: 'Unidad', fallbackName: 'Huevos Tipo AA de Campo' },
  };

  (items || []).forEach(item => {
    const itemQty = Number(item.quantity) || 1;
    let baseDeducted = false;

    // 1. Descargue de ingredientes de la receta base
    const recipe = recipes.find(r => 
      r.productId === item.productId || 
      (r.productName && item.productName && r.productName.toLowerCase().trim() === item.productName.toLowerCase().trim())
    );

    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ing => {
        const invIndex = inventory.findIndex(inv => 
          String(inv.id) === String(ing.inventoryItemId) || 
          String(inv.id) === `inv-${ing.inventoryItemId}`
        );
        if (invIndex !== -1) {
          const invItem = inventory[invIndex];
          const deductAmount = parseFloat(((Number(ing.quantity) || 0) * itemQty).toFixed(3));
          if (deductAmount > 0) {
            invItem.currentStock = Math.max(0, parseFloat((invItem.currentStock - deductAmount).toFixed(3)));
            deductedCount++;
            baseDeducted = true;
            summary.push(`-${deductAmount} ${invItem.unit || ''} de ${invItem.name} (${itemQty}x ${item.productName})`);
            itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });

            movs.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'SALIDA',
              quantity: -deductAmount,
              reason: `Receta: ${itemQty}x ${item.productName} (Orden #${orderNumber} [${origin}])`,
              responsibleName: 'Cocina Automática POS',
              date: Date.now()
            });
          }
        }
      });
    }

    // 1.1 Si el producto NO tiene receta con ingredientes, descargar directamente del inventario (ej. Coca-Cola, Cerveza, etc.)
    if (!baseDeducted) {
      const pNameLower = (item.productName || '').toLowerCase().trim();
      const directIndex = inventory.findIndex(inv =>
        String(inv.id) === String(item.productId) ||
        (inv.code && item.sku && inv.code.toLowerCase() === item.sku.toLowerCase()) ||
        inv.name.toLowerCase().trim() === pNameLower ||
        pNameLower.includes(inv.name.toLowerCase().trim()) ||
        inv.name.toLowerCase().trim().includes(pNameLower)
      );

      if (directIndex !== -1) {
        const invItem = inventory[directIndex];
        invItem.currentStock = Math.max(0, parseFloat((invItem.currentStock - itemQty).toFixed(3)));
        deductedCount++;
        summary.push(`-${itemQty} ${invItem.unit || 'Unidad'} de ${invItem.name} (${itemQty}x ${item.productName})`);
        itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });

        movs.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: invItem.id,
          itemName: invItem.name,
          type: 'SALIDA',
          quantity: -itemQty,
          reason: `Venta Directa POS: ${itemQty}x ${item.productName} (Orden #${orderNumber} [${origin}])`,
          responsibleName: 'Cocina Automática POS',
          date: Date.now()
        });
      }
    }

    // 2. Descargue de Extras / Modificadores (Huevos, Tocineta, Quesos, etc.)
    if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      item.modifiers.forEach((mod: any) => {
        let targetInvId = mod.inventoryItemId;
        let deductQtyPerUnit = Number(mod.quantity) || 0;

        if (!targetInvId && EXTRA_MAPPINGS[mod.modifierOptionId]) {
          targetInvId = EXTRA_MAPPINGS[mod.modifierOptionId].inventoryItemId;
          deductQtyPerUnit = EXTRA_MAPPINGS[mod.modifierOptionId].quantity;
        } else if (!targetInvId) {
          const modNameLower = (mod.name || '').toLowerCase();
          if (modNameLower.includes('huevo')) {
            targetInvId = '10'; // Huevos Tipo AA
            deductQtyPerUnit = 1;
          } else if (modNameLower.includes('tocineta') || modNameLower.includes('bacon')) {
            targetInvId = '11'; // Tocineta Ahumada
            deductQtyPerUnit = 0.04;
          } else if (modNameLower.includes('queso') || modNameLower.includes('cheddar')) {
            targetInvId = '3'; // Queso Cheddar
            deductQtyPerUnit = 0.05;
          }
        }

        if (targetInvId && deductQtyPerUnit > 0) {
          const invIndex = inventory.findIndex(inv => String(inv.id) === String(targetInvId) || String(inv.id) === `inv-${targetInvId}`);
          if (invIndex !== -1) {
            const invItem = inventory[invIndex];
            const totalDeduct = parseFloat((deductQtyPerUnit * itemQty).toFixed(3));
            invItem.currentStock = Math.max(0, parseFloat((invItem.currentStock - totalDeduct).toFixed(3)));
            deductedCount++;
            summary.push(`-${totalDeduct} ${invItem.unit || ''} de ${invItem.name} (Extra: ${mod.name} en ${item.productName})`);
            itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });

            movs.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'SALIDA',
              quantity: -totalDeduct,
              reason: `Extra: ${mod.name} en ${itemQty}x ${item.productName} (Orden #${orderNumber})`,
              responsibleName: 'Cocina Automática POS',
              date: Date.now()
            });
          }
        }
      });
    }
  });

  if (deductedCount > 0) {
    saveStoredInventory(inventory);
    saveStoredInventoryMovements(movs);

    // Sync all deducted items to backend API in real time
    itemsToSync.forEach(it => {
      fetchWithTimeout(`${getApiUrl()}/inventory/${it.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: it.currentStock })
      }).catch(err => {
        console.warn(`[Sync Inventory] Error al sincronizar insumo ${it.id} al servidor:`, err);
      });
    });
  }

  return { deductedCount, summary };
};

// Verificación estricta de disponibilidad de stock antes de crear o actualizar pedidos
export const checkStockAvailability = (
  items: any[]
): { valid: boolean; errors: { productName: string; requested: number; available: number; missingIngredient?: string }[] } => {
  const inventory = getStoredInventory();
  const recipes = getStoredRecipes();
  const errors: { productName: string; requested: number; available: number; missingIngredient?: string }[] = [];

  // Agrupar items por producto
  const productQuantities: Record<string, { quantity: number; productName: string }> = {};
  (items || []).forEach(item => {
    const pId = item.productId || item.id;
    if (!pId) return;
    if (!productQuantities[pId]) {
      productQuantities[pId] = { quantity: 0, productName: item.productName || item.name || 'Producto' };
    }
    productQuantities[pId].quantity += Number(item.quantity) || 1;
  });

  // Validar cada producto respecto a su receta o stock directo
  Object.entries(productQuantities).forEach(([productId, data]) => {
    const { quantity, productName } = data;
    const recipe = recipes.find(r => 
      r.productId === productId || 
      (r.productName && r.productName.toLowerCase().trim() === productName.toLowerCase().trim())
    );

    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
      let maxPortions = Infinity;
      let limitingIngredient = '';

      for (const ing of recipe.ingredients) {
        const invItem = inventory.find(inv => inv.id === ing.inventoryItemId || inv.id === `inv-${ing.inventoryItemId}`);
        if (!invItem) continue;
        const requiredPerPortion = Number(ing.quantity) || 0;
        if (requiredPerPortion > 0) {
          const possible = Math.floor((invItem.currentStock || 0) / requiredPerPortion);
          if (possible < maxPortions) {
            maxPortions = possible;
            limitingIngredient = `${invItem.name} (Quedan: ${invItem.currentStock} ${invItem.unit})`;
          }
        }
      }

      const available = maxPortions === Infinity ? 999 : Math.max(0, maxPortions);
      if (quantity > available) {
        errors.push({
          productName,
          requested: quantity,
          available,
          missingIngredient: limitingIngredient || 'Insumo de receta agotado',
        });
      }
    } else {
      // Insumo directo en inventario (Bebidas, empaquetados)
      const pNameLower = productName.toLowerCase().trim();
      const directItem = inventory.find(inv =>
        inv.id === productId ||
        inv.name.toLowerCase().trim() === pNameLower ||
        pNameLower.includes(inv.name.toLowerCase().trim()) ||
        inv.name.toLowerCase().trim().includes(pNameLower)
      );

      if (directItem) {
        const available = Math.max(0, Math.floor(directItem.currentStock || 0));
        if (quantity > available) {
          errors.push({
            productName,
            requested: quantity,
            available,
            missingIngredient: `Stock en bodega: ${directItem.currentStock} ${directItem.unit}`,
          });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
};

export const revertInventoryByRecipeAndExtras = (
  items: any[],
  orderNumber: string
): { revertedCount: number } => {
  const inventory = [...getStoredInventory()];
  const recipes = getStoredRecipes();
  const movs = [...getStoredInventoryMovements()];
  const itemsToSync: { id: string; currentStock: number }[] = [];
  let revertedCount = 0;

  const EXTRA_MAPPINGS: Record<string, { inventoryItemId: string; quantity: number }> = {
    'o1': { inventoryItemId: '3', quantity: 0.05 },
    'o2': { inventoryItemId: '11', quantity: 0.04 },
    'o3': { inventoryItemId: '10', quantity: 1 },
  };

  (items || []).forEach(item => {
    const itemQty = Number(item.quantity) || 1;
    let baseReverted = false;

    const recipe = recipes.find(r => 
      r.productId === item.productId || 
      (r.productName && item.productName && r.productName.toLowerCase().trim() === item.productName.toLowerCase().trim())
    );

    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ing => {
        const invIndex = inventory.findIndex(inv => 
          String(inv.id) === String(ing.inventoryItemId) || 
          String(inv.id) === `inv-${ing.inventoryItemId}`
        );
        if (invIndex !== -1) {
          const invItem = inventory[invIndex];
          const restoreAmount = parseFloat(((Number(ing.quantity) || 0) * itemQty).toFixed(3));
          if (restoreAmount > 0) {
            invItem.currentStock = parseFloat((invItem.currentStock + restoreAmount).toFixed(3));
            revertedCount++;
            baseReverted = true;
            itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });
            movs.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'ENTRADA',
              quantity: restoreAmount,
              reason: `Reversión por anulación: Orden #${orderNumber}`,
              responsibleName: 'Sistema POS',
              date: Date.now()
            });
          }
        }
      });
    }

    if (!baseReverted) {
      const pNameLower = (item.productName || '').toLowerCase().trim();
      const directIndex = inventory.findIndex(inv =>
        String(inv.id) === String(item.productId) ||
        (inv.code && item.sku && inv.code.toLowerCase() === item.sku.toLowerCase()) ||
        inv.name.toLowerCase().trim() === pNameLower ||
        pNameLower.includes(inv.name.toLowerCase().trim()) ||
        inv.name.toLowerCase().trim().includes(pNameLower)
      );

      if (directIndex !== -1) {
        const invItem = inventory[directIndex];
        invItem.currentStock = parseFloat((invItem.currentStock + itemQty).toFixed(3));
        revertedCount++;
        itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });
        movs.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemId: invItem.id,
          itemName: invItem.name,
          type: 'ENTRADA',
          quantity: itemQty,
          reason: `Reversión por anulación: Orden #${orderNumber}`,
          responsibleName: 'Sistema POS',
          date: Date.now()
        });
      }
    }

    if (item.modifiers && Array.isArray(item.modifiers)) {
      item.modifiers.forEach((mod: any) => {
        let targetInvId = mod.inventoryItemId;
        let restoreQtyPerUnit = Number(mod.quantity) || 0;
        if (!targetInvId && EXTRA_MAPPINGS[mod.modifierOptionId]) {
          targetInvId = EXTRA_MAPPINGS[mod.modifierOptionId].inventoryItemId;
          restoreQtyPerUnit = EXTRA_MAPPINGS[mod.modifierOptionId].quantity;
        } else if (!targetInvId) {
          const modNameLower = (mod.name || '').toLowerCase();
          if (modNameLower.includes('huevo')) { targetInvId = '10'; restoreQtyPerUnit = 1; }
          else if (modNameLower.includes('tocineta')) { targetInvId = '11'; restoreQtyPerUnit = 0.04; }
          else if (modNameLower.includes('queso')) { targetInvId = '3'; restoreQtyPerUnit = 0.05; }
        }

        if (targetInvId && restoreQtyPerUnit > 0) {
          const invIndex = inventory.findIndex(inv => String(inv.id) === String(targetInvId) || String(inv.id) === `inv-${targetInvId}`);
          if (invIndex !== -1) {
            const invItem = inventory[invIndex];
            const totalRestore = parseFloat((restoreQtyPerUnit * itemQty).toFixed(3));
            invItem.currentStock = parseFloat((invItem.currentStock + totalRestore).toFixed(3));
            revertedCount++;
            itemsToSync.push({ id: invItem.id, currentStock: invItem.currentStock });
            movs.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'ENTRADA',
              quantity: totalRestore,
              reason: `Reversión de Extra ${mod.name}: Orden #${orderNumber}`,
              responsibleName: 'Sistema POS',
              date: Date.now()
            });
          }
        }
      });
    }
  });

  if (revertedCount > 0) {
    saveStoredInventory(inventory);
    saveStoredInventoryMovements(movs);

    // Sync all reverted items to backend API in real time
    itemsToSync.forEach(it => {
      fetchWithTimeout(`${getApiUrl()}/inventory/${it.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: it.currentStock })
      }).catch(err => {
        console.warn(`[Sync Inventory] Error al sincronizar reversión de insumo ${it.id} al servidor:`, err);
      });
    });
  }

  return { revertedCount };
};

let memoryActiveCashRegister: CashRegister | null | undefined = undefined;
let memoryCashRegistersHistory: any[] | null = null;
let memoryCashMovements: any[] | null = null;

export const mockApi = {
  auth: {
    login: async (email: string, password?: string, pin?: string): Promise<User> => {
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanPin = String(pin || '').trim();
      const isAdminEmail =
        cleanEmail === 'admin@sesamo.com' ||
        cleanEmail.includes('admin') ||
        cleanEmail.includes('gerente');

      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: password || '', pin: cleanPin })
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Código privado o credenciales incorrectas');
        }
        
        const data = await response.json();
        const loggedUser = data.user;

        const isLoggedUserAdmin =
          loggedUser.role === 'ADMINISTRADOR' ||
          (loggedUser.role as any) === 'ADMIN' ||
          (loggedUser.role as any) === 'GERENTE' ||
          isAdminEmail;

        // Iniciar turno en memoria frontend si no es admin
        if (!isLoggedUserAdmin) {
          try {
            await mockApi.staff.clockIn(loggedUser.id);
          } catch (e) {}
        }

        return loggedUser;
      } catch (err: any) {
        if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('timeout') && !err.message.includes('abort')) {
          throw err;
        }

        const allStaff = getStoredStaff();
        const user = allStaff.find(u => u.email.toLowerCase().trim() === cleanEmail) ||
                     mockUsers.find(u => u.email.toLowerCase().trim() === cleanEmail);
        if (!user) {
          throw new Error('Usuario o correo no encontrado');
        }

        const expectedPassword = user.password || 'password123';
        if (!password || password !== expectedPassword) {
          throw new Error('Contraseña incorrecta. Verifica tus credenciales.');
        }

        if (!user.isActive) {
          throw new Error('El usuario se encuentra inactivo.');
        }

        const isUserAdmin =
          user.role === 'ADMINISTRADOR' ||
          (user.role as any) === 'ADMIN' ||
          (user.role as any) === 'GERENTE' ||
          isAdminEmail;

        if (!isUserAdmin) {
          if (!cleanPin) {
            throw new Error('Debes ingresar tu código privado (PIN de 4 dígitos) para indicar que inicias tu turno.');
          }
          const expectedPin = String(user.pin || '1234').trim();
          if (cleanPin !== expectedPin) {
            throw new Error('Código privado incorrecto. Debes ingresar tu PIN de 4 dígitos para iniciar tu turno.');
          }

          // Marcar turno iniciado (clockIn)
          try {
            await mockApi.staff.clockIn(user.id);
          } catch (e) {}
        }

        const { password: _, ...cleanUser } = user;
        if (!isUserAdmin) {
          cleanUser.shiftStatus = 'EN_TURNO';
        }
        return cleanUser;
      }
    },
    logout: async (): Promise<void> => {
      await delay(0);
    },
  },
  categories: {
    getAll: async (): Promise<Category[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/categories`);
        if (response.ok) return await response.json();
      } catch (e) {}
      return getStoredCategories();
    },
    create: async (category: Omit<Category, 'id'>): Promise<Category> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para agregar categorías.');
      }
      let created: Category | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/categories`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify(category),
        });
        if (response.ok) created = await response.json();
      } catch (e) {}

      const newCat: Category = created || { ...category, id: Date.now().toString() };
      const categories = getStoredCategories();
      const updated = [...categories.filter(c => c.id !== newCat.id), newCat];
      saveStoredCategories(updated);
      return newCat;
    },
    update: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para editar categorías.');
      }
      let updatedCat: Category | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/categories/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify(categoryData),
        });
        if (response.ok) updatedCat = await response.json();
      } catch (e) {}

      const categories = getStoredCategories();
      const index = categories.findIndex(c => c.id === id);
      if (index === -1 && !updatedCat) throw new Error('Categoría no encontrada');
      const finalCat = updatedCat || { ...categories[index], ...categoryData };
      if (index !== -1) {
        categories[index] = finalCat;
      } else {
        categories.push(finalCat);
      }
      saveStoredCategories(categories);
      return finalCat;
    },
    delete: async (id: string): Promise<void> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para eliminar categorías.');
      }
      try {
        await fetchWithTimeout(`${getApiUrl()}/categories/${id}`, { 
          method: 'DELETE',
          headers: {
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          }
        });
      } catch (e) {}
      const categories = getStoredCategories();
      const updated = categories.filter(c => c.id !== id);
      saveStoredCategories(updated);
    }
  },
  products: {
    getAll: async (): Promise<Product[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/products`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            memoryProductsCache = data;
            return data;
          }
        }
      } catch (e) {}
      return getStoredProducts();
    },
    getByCategory: async (categoryId: string): Promise<Product[]> => {
      const all = await mockApi.products.getAll();
      return all.filter((p: Product) => p.categoryId === categoryId);
    },
    create: async (productData: Omit<Product, 'id'>): Promise<Product> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para agregar productos.');
      }
      let created: Product | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/products`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify(productData),
        });
        if (response.ok) created = await response.json();
      } catch (e) {}

      const newProd: Product = created || {
        ...productData,
        id: Date.now().toString(),
        isAvailable: productData.isAvailable ?? true,
        isActive: productData.isActive ?? true
      };
      const products = getStoredProducts();
      const updated = [newProd, ...products.filter(p => p.id !== newProd.id)];
      saveStoredProducts(updated);
      return newProd;
    },
    update: async (id: string, productData: Partial<Product>): Promise<Product> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para editar productos.');
      }
      let updatedProd: Product | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/products/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify(productData),
        });
        if (response.ok) updatedProd = await response.json();
      } catch (e) {}

      const products = getStoredProducts();
      const index = products.findIndex(p => p.id === id);
      if (index === -1 && !updatedProd) throw new Error('Producto no encontrado');
      const updated = updatedProd || { ...products[index], ...productData };
      if (index !== -1) {
        products[index] = updated;
      } else {
        products.unshift(updated);
      }
      saveStoredProducts(products);
      return updated;
    },
    toggleAvailable: async (id: string): Promise<Product> => {
      const storedRole = getStoredUserRole();
      if (storedRole === 'MESERO' || storedRole === 'CAJERO') {
        throw new Error('No tienes permisos para modificar la disponibilidad de productos.');
      }
      const products = getStoredProducts();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Producto no encontrado');
      const newAvail = !products[index].isAvailable;
      try {
        await fetchWithTimeout(`${getApiUrl()}/products/${id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify({ isAvailable: newAvail }),
        });
      } catch (e) {}
      products[index].isAvailable = newAvail;
      saveStoredProducts(products);
      return products[index];
    },
    delete: async (id: string): Promise<void> => {
      const storedRole = getStoredUserRole();
      if (!['ADMINISTRADOR', 'GERENTE'].includes(storedRole || '')) {
        throw new Error('Solo el Administrador o Gerente tiene permisos para eliminar productos.');
      }
      try {
        await fetchWithTimeout(`${getApiUrl()}/products/${id}`, { 
          method: 'DELETE',
          headers: {
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          }
        });
      } catch (e) {}
      const products = getStoredProducts();
      const updated = products.filter(p => p.id !== id);
      saveStoredProducts(updated);
    }
  },
  tables: {
    getAll: async (): Promise<Table[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/tables`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const formatted: Table[] = data.map((t: any) => ({
              ...t,
              id: String(t.id),
              number: Number(t.number),
              capacity: Number(t.capacity) || 4,
              location: t.location || 'Salón Principal',
              status: t.status === 'LIBRE' ? 'DISPONIBLE' : t.status === 'LISTA' ? 'PEDIDO_LISTO' : t.status,
              currentOrderId: t.currentOrderId ? String(t.currentOrderId) : undefined,
              currentWaiterId: t.currentWaiterId ? String(t.currentWaiterId) : undefined,
              currentWaiterName: t.currentWaiterName || undefined,
              timeOccupied: t.timeOccupied ? Number(t.timeOccupied) : undefined
            }));
            formatted.sort((a, b) => a.number - b.number);
            memoryTablesCache = formatted;
            return formatted;
          }
        }
      } catch (e) {}
      return getStoredTables();
    },
    create: async (tableData: { number: number; capacity: number; location?: string; currentWaiterId?: string; currentWaiterName?: string }): Promise<Table> => {
      let storedRole: string | undefined;
      try {
        const raw = localStorage.getItem('sesamo_auth_user');
        if (raw) storedRole = JSON.parse(raw)?.role;
      } catch (e) {}

      if (storedRole && storedRole !== 'ADMINISTRADOR') {
        throw new Error('Solo el administrador tiene permiso para agregar mesas.');
      }

      const num = Number(tableData.number);
      const cap = Number(tableData.capacity) || 4;
      const loc = tableData.location || 'Salón Principal';
      const id = String(Date.now());

      let newTable: Table = {
        id,
        number: num,
        capacity: cap,
        location: loc,
        status: 'DISPONIBLE',
        currentWaiterId: tableData.currentWaiterId || undefined,
        currentWaiterName: tableData.currentWaiterName || undefined
      };

      try {
        const resp = await fetchWithTimeout(`${getApiUrl()}/tables`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify({
            number: num,
            capacity: cap,
            location: loc,
            currentWaiterId: tableData.currentWaiterId || null,
            currentWaiterName: tableData.currentWaiterName || null
          })
        });
        if (resp.ok) {
          const backendTable = await resp.json();
          if (backendTable && backendTable.id) {
            newTable = {
              ...newTable,
              ...backendTable,
              id: String(backendTable.id),
              number: Number(backendTable.number),
              capacity: Number(backendTable.capacity) || cap,
              status: backendTable.status === 'LIBRE' ? 'DISPONIBLE' : (backendTable.status || 'DISPONIBLE')
            };
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.message || `Error ${resp.status} al registrar mesa en el servidor.`);
        }
      } catch (e: any) {
        if (e.message && (e.message.includes('Ya existe') || e.message.includes('número'))) {
          throw e;
        }
        console.warn('Backend sync POST failed, saving locally:', e.message);
      }

      const tables = getStoredTables();
      const filtered = tables.filter(t => t.id !== newTable.id && Number(t.number) !== Number(newTable.number));
      filtered.push(newTable);
      filtered.sort((a, b) => a.number - b.number);
      saveStoredTables(filtered);
      return newTable;
    },
    update: async (id: string, updates: Partial<Table>): Promise<Table> => {
      let storedRole: string | undefined;
      try {
        const raw = localStorage.getItem('sesamo_auth_user');
        if (raw) storedRole = JSON.parse(raw)?.role;
      } catch (e) {}

      if (storedRole === 'MESERO') {
        throw new Error('El mesero no tiene permisos para modificar mesas.');
      }

      const tables = getStoredTables();
      const target = tables.find(t => t.id === id || String(t.number) === String(id));
      const targetId = target ? target.id : id;

      const index = tables.findIndex(t => t.id === targetId || String(t.number) === String(targetId));
      if (index === -1) throw new Error('Mesa no encontrada');

      const updated: Table = {
        ...tables[index],
        ...updates,
        number: updates.number !== undefined ? Number(updates.number) : tables[index].number,
        capacity: updates.capacity !== undefined ? Number(updates.capacity) : tables[index].capacity,
        location: updates.location !== undefined ? updates.location : tables[index].location
      };
      tables[index] = updated;
      tables.sort((a, b) => a.number - b.number);
      saveStoredTables(tables);

      try {
        await fetchWithTimeout(`${getApiUrl()}/tables/${targetId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify(updates)
        });
      } catch (e) {}

      return updated;
    },
    delete: async (id: string): Promise<boolean> => {
      let storedRole: string | undefined;
      try {
        const raw = localStorage.getItem('sesamo_auth_user');
        if (raw) storedRole = JSON.parse(raw)?.role;
      } catch (e) {}

      if (storedRole && storedRole !== 'ADMINISTRADOR') {
        throw new Error('Solo el administrador tiene permiso para eliminar mesas.');
      }

      const tables = getStoredTables();
      const target = tables.find(t => t.id === id || String(t.number) === String(id));
      const targetId = target ? target.id : id;
      const targetNum = target ? target.number : Number(id);

      try {
        await fetchWithTimeout(`${getApiUrl()}/tables/${targetId}`, {
          method: 'DELETE',
          headers: {
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          }
        });
      } catch (e) {
        console.warn('Backend sync DELETE failed:', e);
      }

      const filtered = tables.filter(t => t.id !== targetId && Number(t.number) !== Number(targetNum));
      saveStoredTables(filtered);
      return true;
    },
    updateStatus: async (id: string, status: Table['status']): Promise<Table> => {
      let storedRole: string | undefined;
      try {
        const raw = localStorage.getItem('sesamo_auth_user');
        if (raw) storedRole = JSON.parse(raw)?.role;
      } catch (e) {}

      const tables = getStoredTables();
      const index = tables.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Mesa no encontrada');
      tables[index].status = status;
      if (status === 'DISPONIBLE') {
        tables[index].currentOrderId = undefined;
        tables[index].timeOccupied = undefined;
      } else if (status === 'OCUPADA' && !tables[index].timeOccupied) {
        tables[index].timeOccupied = Date.now();
      }
      saveStoredTables(tables);

      try {
        await fetchWithTimeout(`${getApiUrl()}/tables/${id}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify({ status })
        });
      } catch (e) {}

      return tables[index];
    },
    occupy: async (id: string, orderNumber: string): Promise<Table> => {
      const tables = getStoredTables();
      const index = tables.findIndex(t => t.id === id);
      if (index !== -1) {
        tables[index].status = 'OCUPADA';
        tables[index].currentOrderId = orderNumber;
        tables[index].timeOccupied = Date.now();
        saveStoredTables(tables);
        return tables[index];
      }
      throw new Error('Mesa no encontrada');
    },
    assignWaiter: async (id: string, waiterId?: string, waiterName?: string): Promise<Table> => {
      let storedRole: string | undefined;
      try {
        const raw = localStorage.getItem('sesamo_auth_user');
        if (raw) storedRole = JSON.parse(raw)?.role;
      } catch (e) {}

      // Solo Administrador y Gerente pueden asignar o reasignar meseros a las mesas
      if (storedRole && !['ADMINISTRADOR', 'GERENTE'].includes(storedRole)) {
        throw new Error('Solo el administrador o gerente tiene permisos para asignar o reasignar mesas.');
      }

      const tables = getStoredTables();
      const index = tables.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Mesa no encontrada');
      tables[index].currentWaiterId = waiterId;
      tables[index].currentWaiterName = waiterName;
      saveStoredTables(tables);

      try {
        await fetchWithTimeout(`${getApiUrl()}/tables/${id}/assign`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {})
          },
          body: JSON.stringify({ waiterId, waiterName })
        });
      } catch (e) {}

      return tables[index];
    },
    transfer: async (fromId: string, toId: string): Promise<boolean> => {
      const tables = getStoredTables();
      const fromIdx = tables.findIndex(t => t.id === fromId || String(t.number) === String(fromId));
      if (fromIdx === -1) throw new Error('Mesa origen no encontrada');
      const fromTable = tables[fromIdx];
      const orderNumber = fromTable.currentOrderId;
      const occupiedTime = fromTable.timeOccupied || Date.now();

      // Free source table
      fromTable.status = 'DISPONIBLE';
      fromTable.currentOrderId = undefined;
      fromTable.timeOccupied = undefined;
      tables[fromIdx] = fromTable;

      if (toId === 'BARRA' || toId === 'Barra') {
        const orders = getStoredOrders();
        const ordIdx = orders.findIndex(o => o.orderNumber === orderNumber || o.tableId === String(fromTable.number));
        if (ordIdx !== -1) {
          orders[ordIdx].tableId = 'Barra';
          orders[ordIdx].type = 'BARRA';
          saveStoredOrders(orders);
        }
      } else {
        const toIdx = tables.findIndex(t => t.id === toId || String(t.number) === String(toId));
        if (toIdx === -1) throw new Error('Mesa destino no encontrada');
        const toTable = tables[toIdx];

        toTable.status = 'OCUPADA';
        toTable.currentOrderId = orderNumber;
        toTable.timeOccupied = occupiedTime;
        toTable.currentWaiterId = toTable.currentWaiterId || fromTable.currentWaiterId;
        toTable.currentWaiterName = toTable.currentWaiterName || fromTable.currentWaiterName;
        tables[toIdx] = toTable;

        const orders = getStoredOrders();
        const ordIdx = orders.findIndex(o => o.orderNumber === orderNumber || o.tableId === String(fromTable.number));
        if (ordIdx !== -1) {
          orders[ordIdx].tableId = String(toTable.number);
          orders[ordIdx].type = 'MESA';
          saveStoredOrders(orders);
        }
      }

      saveStoredTables(tables);
      notifyRealtimeEvent('sesamo_tables_updated');
      notifyRealtimeEvent('sesamo_order_updated');
      return true;
    }
  },
  orders: {
    getAll: async (): Promise<Order[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/orders`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const clean = deduplicateOrders(data);
            memoryOrdersCache = clean;
            return clean;
          }
        }
      } catch (e) {}
      return getStoredOrders();
    },
    create: async (order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
      // Validar disponibilidad de stock antes de crear pedido
      const stockCheck = checkStockAvailability(order.items || []);
      if (!stockCheck.valid) {
        const details = stockCheck.errors
          .map(e => `• ${e.productName}: pides ${e.requested}, disponible ${e.available} (${e.missingIngredient || 'Stock'})`)
          .join('\n');
        throw new Error(`Stock insuficiente en inventario:\n${details}`);
      }

      const orders = getStoredOrders();
      const newOrder: Order = {
        ...order,
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      
      const updated = [newOrder, ...orders];
      saveStoredOrders(updated);

      // Descargue automático de inventario por receta técnica y extras seleccionados
      try {
        deductInventoryByRecipeAndExtras(order.items || [], newOrder.orderNumber, 'Salón');
      } catch (err) {
        console.warn('Error en descargue automático de inventario:', err);
      }

      try {
        await fetchWithTimeout(`${getApiUrl()}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder)
        });
      } catch (e) {}

      // Si la orden viene de una mesa, marcarla automáticamente como OCUPADA
      if (order.tableId) {
        const tables = getStoredTables();
        const tIndex = tables.findIndex(t => t.id === order.tableId || t.number.toString() === order.tableId);
        if (tIndex !== -1) {
          tables[tIndex].status = 'OCUPADA';
          tables[tIndex].currentOrderId = newOrder.orderNumber;
          tables[tIndex].timeOccupied = Date.now();
          if (order.waiterName) tables[tIndex].currentWaiterName = order.waiterName;
          if (order.waiterId) tables[tIndex].currentWaiterId = order.waiterId;
          saveStoredTables(tables);
        }
      }

      window.dispatchEvent(new CustomEvent('sesamo_order_created', { detail: newOrder }));
      playKitchenBellSound();

      return newOrder;
    },
    updateStatus: async (id: string, status: Order['status']): Promise<Order> => {
      const orders = getStoredOrders();
      const index = orders.findIndex(o => o.id === id);
      let updatedOrder: Order | null = index !== -1 ? orders[index] : null;

      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (response.ok) {
          const res = await response.json();
          if (res && res.id) updatedOrder = res;
        }
      } catch (e) {}

      if (index !== -1) {
        orders[index].status = status;
        if (status === 'ENTREGADO') {
          orders[index].items = (orders[index].items || []).map(it => ({
            ...it,
            isDelivered: true
          }));
        }
        saveStoredOrders(orders);
        updatedOrder = orders[index];
      }

      if (updatedOrder) {
        // Auto-sync table status when order status changes across panels!
        if (updatedOrder.tableId) {
          const tables = getStoredTables();
          const tIndex = tables.findIndex(t => t.id === updatedOrder.tableId || t.number.toString() === updatedOrder.tableId);
          if (tIndex !== -1) {
            if (status === 'LISTO') {
              tables[tIndex].status = 'PEDIDO_LISTO';
            } else if (status === 'PAGADO' || status === 'ENTREGADO' || status === 'EN_COCINA' || status === 'EN_PREPARACION' || status === 'CREADO') {
              tables[tIndex].status = 'OCUPADA';
            }
            saveStoredTables(tables);
          }
        }

        // Reversión de insumos en caso de cancelación de pedido
        if (status === 'CANCELADO' && updatedOrder.items) {
          try {
            revertInventoryByRecipeAndExtras(updatedOrder.items, updatedOrder.orderNumber);
          } catch (e) {}
        }

        window.dispatchEvent(new CustomEvent('sesamo_order_updated', { detail: updatedOrder }));
      }

      return updatedOrder!;
    },
    updateOrder: async (id: string, updatedData: Partial<Order>): Promise<Order> => {
      const orders = getStoredOrders();
      const index = orders.findIndex(o => o.id === id || o.orderNumber === id);
      if (index === -1) throw new Error('Pedido no encontrado');

      // Descontar inventario para adiciones nuevas o incrementos de cantidad (validando stock disponible)
      if (updatedData.items && Array.isArray(updatedData.items)) {
        const oldItems = orders[index].items || [];
        const newlyDeductedItems: any[] = [];

        for (const newItem of updatedData.items) {
          const oldItem = oldItems.find((o: any) => o.id === newItem.id || (o.productId && o.productId === newItem.productId));
          const oldQty = oldItem ? (Number(oldItem.quantity) || 0) : 0;
          const newQty = Number(newItem.quantity) || 0;
          if (newQty > oldQty) {
            newlyDeductedItems.push({
              ...newItem,
              quantity: newQty - oldQty
            });
          }
        }

        if (newlyDeductedItems.length > 0) {
          const stockCheck = checkStockAvailability(newlyDeductedItems);
          if (!stockCheck.valid) {
            const details = stockCheck.errors
              .map(e => `• ${e.productName}: pides ${e.requested}, disponible ${e.available} (${e.missingIngredient || 'Stock'})`)
              .join('\n');
            throw new Error(`Stock insuficiente en inventario para adición:\n${details}`);
          }
          try {
            deductInventoryByRecipeAndExtras(newlyDeductedItems, orders[index].orderNumber || id);
          } catch (e) {}
        }
      }

      const updated = { ...orders[index], ...updatedData };
      orders[index] = updated;
      saveStoredOrders(orders);

      if (updated.tableId && updatedData.status) {
        const tables = getStoredTables();
        const tIndex = tables.findIndex(t => t.id === updated.tableId || t.number.toString() === updated.tableId);
        if (tIndex !== -1) {
          if (updatedData.status === 'LISTO') {
            tables[tIndex].status = 'PEDIDO_LISTO';
          } else if (updatedData.status === 'PAGADO') {
            tables[tIndex].status = 'DISPONIBLE';
            tables[tIndex].currentOrderId = undefined;
            tables[tIndex].timeOccupied = undefined;
          } else if (updatedData.status === 'ENTREGADO' || updatedData.status === 'EN_COCINA' || updatedData.status === 'EN_PREPARACION' || updatedData.status === 'CREADO') {
            tables[tIndex].status = 'OCUPADA';
          }
          saveStoredTables(tables);
        }
      }

      if (updatedData.status === 'EN_PREPARACION' || updatedData.status === 'EN_COCINA' || updatedData.status === 'CREADO') {
        playKitchenBellSound();
      }

      try {
        await fetchWithTimeout(`${getApiUrl()}/orders/${orders[index].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
      } catch (e) {}

      notifyRealtimeEvent('sesamo_order_updated', updated);
      return updated;
    }
  },
  inventory: {
    getAll: async (): Promise<InventoryItem[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/inventory`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map((item: any, idx: number) => normalizeInventoryItem(item, idx));
            
            // Reconciliación bidireccional inteligente:
            // Si en localStorage/memoria local el stock fue descargado por una orden reciente y el servidor aún tiene el stock anterior (mayor),
            // conservamos el stock descargado y actualizamos al servidor en segundo plano.
            const localItems = getStoredInventory();
            const merged = normalized.map(srvItem => {
              const locItem = localItems.find(l => 
                String(l.id) === String(srvItem.id) || 
                (l.code && srvItem.code && l.code.toLowerCase() === srvItem.code.toLowerCase()) ||
                (l.name && srvItem.name && l.name.toLowerCase().trim() === srvItem.name.toLowerCase().trim())
              );
              if (locItem && typeof locItem.currentStock === 'number' && locItem.currentStock < srvItem.currentStock) {
                srvItem.currentStock = locItem.currentStock;
                fetchWithTimeout(`${getApiUrl()}/inventory/${srvItem.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentStock: locItem.currentStock })
                }).catch(() => {});
              }
              return srvItem;
            });

            memoryInventoryCache = merged;
            return merged;
          }
        }
      } catch (e) {}
      return getStoredInventory();
    },
    getById: async (id: string): Promise<InventoryItem | undefined> => {
      await delay(0);
      return getStoredInventory().find(i => i.id === id);
    },
    create: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
      let created: any = null;
      try {
        const res = await fetchWithTimeout(`${getApiUrl()}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) created = await res.json();
      } catch (e) {}

      const items = getStoredInventory();
      const newItem: InventoryItem = created ? normalizeInventoryItem(created) : {
        ...item,
        id: 'inv-' + Date.now(),
      };
      saveStoredInventory([newItem, ...items]);
      return newItem;
    },
    update: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (e) {}

      const items = getStoredInventory();
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) throw new Error('Insumo no encontrado');
      const updated = { ...items[idx], ...updates };
      items[idx] = updated;
      saveStoredInventory([...items]);
      return updated;
    },
    adjustStock: async (id: string, newStock: number, reason: string, responsibleName = 'Encargado'): Promise<InventoryItem> => {
      const items = getStoredInventory();
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Insumo no encontrado');
      const diff = newStock - item.currentStock;
      item.currentStock = newStock;
      saveStoredInventory([...items]);

      try {
        await fetchWithTimeout(`${getApiUrl()}/inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStock: newStock }),
        });
      } catch (e) {}

      const movs = getStoredInventoryMovements();
      const newMov = {
        id: 'mov-' + Date.now(),
        itemId: item.id,
        itemName: item.name,
        type: 'AJUSTE',
        quantity: diff,
        reason: reason || 'Ajuste manual de conteo físico',
        responsibleName,
        date: Date.now(),
      };
      saveStoredInventoryMovements([newMov, ...movs]);
      return item;
    },
    reportWaste: async (id: string, quantity: number, reason: string, responsibleName = 'Cocina'): Promise<InventoryItem> => {
      const items = getStoredInventory();
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Insumo no encontrado');
      item.currentStock = Math.max(0, item.currentStock - quantity);
      saveStoredInventory([...items]);

      try {
        await fetchWithTimeout(`${getApiUrl()}/inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStock: item.currentStock }),
        });
      } catch (e) {}

      const movs = getStoredInventoryMovements();
      const newMov = {
        id: 'mov-' + Date.now(),
        itemId: item.id,
        itemName: item.name,
        type: 'MERMA',
        quantity: -Math.abs(quantity),
        reason: reason || 'Merma reportada en cocina',
        responsibleName,
        date: Date.now(),
      };
      saveStoredInventoryMovements([newMov, ...movs]);
      return item;
    },
    addStock: async (id: string, quantity: number, reason: string, responsibleName = 'Bodega'): Promise<InventoryItem> => {
      const items = getStoredInventory();
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Insumo no encontrado');
      item.currentStock += quantity;
      saveStoredInventory([...items]);

      try {
        await fetchWithTimeout(`${getApiUrl()}/inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStock: item.currentStock }),
        });
      } catch (e) {}

      const movs = getStoredInventoryMovements();
      const newMov = {
        id: 'mov-' + Date.now(),
        itemId: item.id,
        itemName: item.name,
        type: 'ENTRADA',
        quantity: Math.abs(quantity),
        reason: reason || 'Entrada manual de insumos',
        responsibleName,
        date: Date.now(),
      };
      saveStoredInventoryMovements([newMov, ...movs]);
      return item;
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/inventory/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {}
      const items = getStoredInventory().filter(i => i.id !== id);
      saveStoredInventory(items);
      return true;
    },
    getMovements: async (): Promise<any[]> => {
      await delay(0);
      return getStoredInventoryMovements();
    },
    checkStockAvailability: (items: any[]) => {
      return checkStockAvailability(items);
    }
  },
  suppliers: {
    getAll: async (): Promise<Supplier[]> => {
      await delay(0);
      return getStoredSuppliers();
    },
    create: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
      await delay(0);
      const list = getStoredSuppliers();
      const newSupp: Supplier = {
        ...supplier,
        id: 'sup-' + Date.now(),
      };
      saveStoredSuppliers([newSupp, ...list]);
      return newSupp;
    },
    update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
      await delay(0);
      const list = getStoredSuppliers();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Proveedor no encontrado');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoredSuppliers([...list]);
      return updated;
    },
    delete: async (id: string): Promise<void> => {
      await delay(0);
      const list = getStoredSuppliers().filter(s => s.id !== id);
      saveStoredSuppliers(list);
    }
  },
  purchases: {
    getAll: async (): Promise<PurchaseOrder[]> => {
      await delay(0);
      return getStoredPurchases();
    },
    create: async (order: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> => {
      await delay(0);
      const list = getStoredPurchases();
      const newPO: PurchaseOrder = {
        ...order,
        id: (list.length + 1).toString(),
      };
      saveStoredPurchases([newPO, ...list]);
      return newPO;
    },
    updateStatus: async (id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> => {
      await delay(0);
      const list = getStoredPurchases();
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Orden no encontrada');
      list[idx].status = status;
      saveStoredPurchases([...list]);
      return list[idx];
    },
    receiveOrder: async (id: string): Promise<PurchaseOrder> => {
      await delay(0);
      const list = getStoredPurchases();
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Orden no encontrada');
      const po = list[idx];
      po.status = 'RECIBIDA';
      saveStoredPurchases([...list]);

      const invItems = getStoredInventory();
      const movs = getStoredInventoryMovements();
      const now = Date.now();

      po.items.forEach(poItem => {
        const target = invItems.find(i => i.id === poItem.itemId);
        if (target) {
          target.currentStock += poItem.quantity;
          target.unitCost = poItem.unitCost || target.unitCost;
          movs.unshift({
            id: 'mov-' + now + '-' + poItem.itemId,
            itemId: target.id,
            itemName: target.name,
            type: 'ENTRADA',
            quantity: poItem.quantity,
            reason: `Recepción Orden PO-${po.id.padStart(4, '0')}`,
            responsibleName: 'Almacén / Compras',
            date: now,
          });
        }
      });
      saveStoredInventory([...invItems]);
      saveStoredInventoryMovements([...movs]);
      return po;
    }
  },
  cash: {
    getCurrentRegister: async (): Promise<CashRegister | undefined> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/cash/current`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.isOpen) return data;
          if (data === null) return undefined;
        }
      } catch (e) {}

      if (memoryActiveCashRegister !== undefined) {
        return memoryActiveCashRegister && memoryActiveCashRegister.isOpen ? memoryActiveCashRegister : undefined;
      }
      return undefined;
    },
    openRegister: async (initialAmount: number, openedBy: string): Promise<CashRegister> => {
      let newReg: CashRegister | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/cash/open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialAmount, openedBy })
        });
        if (response.ok) {
          newReg = await response.json();
        }
      } catch (e) {}

      if (!newReg) {
        newReg = {
          id: Date.now().toString(),
          name: 'Caja Principal (POS)',
          openedBy,
          openedAt: Date.now(),
          initialAmount,
          currentAmount: initialAmount,
          isOpen: true
        };
      }
      memoryActiveCashRegister = newReg;
      notifyRealtimeEvent('sesamo_cash_updated', newReg);
      notifyRealtimeEvent('sesamo_order_updated');
      return newReg;
    },
    closeRegister: async (countedCash: number, notes?: string, reportSnapshot?: any): Promise<void> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/cash/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countedCash, notes })
        });
      } catch (e) {}

      // Guardar en historial de turnos cerrados (Reportes Z)
      try {
        const historyList = memoryCashRegistersHistory || [];
        const activeReg = memoryActiveCashRegister || mockCashRegisters[0];

        const historyRecord = {
          id: `closure-${Date.now()}`,
          registerId: activeReg?.id || 'reg-1',
          name: activeReg?.name || 'Caja Principal (POS)',
          openedBy: activeReg?.openedBy || 'Cajero',
          openedAt: activeReg?.openedAt || (Date.now() - 3600000 * 8),
          closedAt: Date.now(),
          closedBy: activeReg?.openedBy || 'Cajero',
          initialAmount: activeReg?.initialAmount || 200000,
          countedCash,
          notes: notes || '',
          snapshot: reportSnapshot || null,
        };

        historyList.unshift(historyRecord);
        memoryCashRegistersHistory = historyList;
      } catch (e) {}

      memoryActiveCashRegister = null;
      mockCashRegisters[0].isOpen = false;
      notifyRealtimeEvent('sesamo_cash_updated', { isOpen: false });
      notifyRealtimeEvent('sesamo_order_updated');
    },
    addMovement: async (type: 'INGRESO' | 'GASTO', amount: number, reason: string): Promise<any> => {
      let newMov: any = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/cash/movements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount, reason })
        });
        if (response.ok) {
          newMov = await response.json();
        }
      } catch (e) {}

      if (!newMov) {
        newMov = {
          id: Date.now().toString(),
          type,
          amount: type === 'GASTO' ? -Math.abs(amount) : Math.abs(amount),
          reason,
          date: Date.now()
        };
      }
      const movs = memoryCashMovements || [];
      const updated = [newMov, ...movs];
      memoryCashMovements = updated;
      notifyRealtimeEvent('sesamo_cash_updated', newMov);
      notifyRealtimeEvent('sesamo_order_updated');
      return newMov;
    },
    getMovements: async (): Promise<any[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/cash/movements`);
        if (response.ok) return await response.json();
      } catch (e) {}

      return memoryCashMovements || [];
    },
    getHistory: async (): Promise<any[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/cash/history`);
        if (response.ok) return await response.json();
      } catch (e) {}

      if (memoryCashRegistersHistory && memoryCashRegistersHistory.length > 0) {
        return memoryCashRegistersHistory;
      }

      return [];
    }
  },
  deliveries: {
    getAll: async (): Promise<DeliveryOrder[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/deliveries`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            memoryDeliveriesCache = data;
            return data;
          }
        }
      } catch (e) {}
      return getStoredDeliveries();
    },
    getById: async (id: string): Promise<DeliveryOrder | null> => {
      await delay(0);
      return getStoredDeliveries().find(d => d.id === id) || null;
    },
    create: async (data: Omit<DeliveryOrder, 'id' | 'type' | 'createdAt'> & { type?: any; createdAt?: number }): Promise<DeliveryOrder> => {
      // Validar disponibilidad de stock antes de crear domicilio
      const stockCheck = checkStockAvailability(data.items || []);
      if (!stockCheck.valid) {
        const details = stockCheck.errors
          .map(e => `• ${e.productName}: pides ${e.requested}, disponible ${e.available} (${e.missingIngredient || 'Stock'})`)
          .join('\n');
        throw new Error(`Stock insuficiente en inventario para domicilio:\n${details}`);
      }

      const newDelivery: DeliveryOrder = {
        ...data,
        id: `${Date.now()}`,
        orderNumber: data.orderNumber || `DOM-${Date.now().toString().slice(-4)}`,
        createdAt: data.createdAt || Date.now(),
        type: 'DOMICILIO',
        status: data.status || 'EN_PREPARACION',
        deliveryStatus: data.deliveryStatus || 'PENDIENTE',
        estimatedDeliveryTime: data.estimatedDeliveryTime || (Date.now() + 2400000), // +40 min
      };

      let created: any = null;
      try {
        const res = await fetchWithTimeout(`${getApiUrl()}/deliveries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDelivery),
        });
        if (res.ok) created = await res.json();
      } catch (e) {}

      const finalDelivery = created || newDelivery;
      const list = getStoredDeliveries();
      list.unshift(finalDelivery);
      saveStoredDeliveries(list);

      // Descargue automático de inventario por receta y extras en domicilios
      try {
        deductInventoryByRecipeAndExtras(data.items || [], finalDelivery.orderNumber, 'Domicilio');
      } catch (err) {
        console.warn('Error en descargue automático de inventario en domicilio:', err);
      }

      // Sonido de campana para cocina y notificación en tiempo real
      playKitchenBellSound();
      window.dispatchEvent(new CustomEvent('sesamo_order_created', { detail: finalDelivery }));

      return finalDelivery;
    },
    update: async (id: string, data: Partial<DeliveryOrder>): Promise<DeliveryOrder> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/deliveries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (e) {}

      const list = getStoredDeliveries();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Domicilio no encontrado');
      list[idx] = { ...list[idx], ...data };
      saveStoredDeliveries(list);
      return list[idx];
    },
    dispatchOrder: async (id: string, riderId: string, riderName: string, riderPhone?: string): Promise<DeliveryOrder> => {
      const patchData = {
        deliveryStatus: 'EN_CAMINO' as const,
        status: 'EN_CAMINO' as const,
        deliveryRiderId: riderId,
        deliveryRiderName: riderName,
        deliveryRiderPhone: riderPhone,
        dispatchedAt: Date.now(),
        estimatedDeliveryTime: Date.now() + 1800000 // +30 min
      };
      try {
        await fetchWithTimeout(`${getApiUrl()}/deliveries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        });
      } catch (e) {}

      const list = getStoredDeliveries();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Domicilio no encontrado');
      list[idx] = {
        ...list[idx],
        ...patchData
      };
      saveStoredDeliveries(list);
      return list[idx];
    },
    markDelivered: async (id: string): Promise<DeliveryOrder> => {
      const patchData = {
        deliveryStatus: 'ENTREGADO' as const,
        status: 'ENTREGADO' as const,
        deliveredAt: Date.now()
      };
      try {
        await fetchWithTimeout(`${getApiUrl()}/deliveries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        });
      } catch (e) {}

      const list = getStoredDeliveries();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Domicilio no encontrado');
      list[idx] = {
        ...list[idx],
        ...patchData
      };
      saveStoredDeliveries(list);
      return list[idx];
    },
    cancelOrder: async (id: string, reason?: string): Promise<DeliveryOrder> => {
      const patchData = {
        deliveryStatus: 'CANCELADO' as const,
        status: 'CANCELADO' as const,
        deliveryNotes: reason ? `[Cancelado: ${reason}]` : 'Cancelado'
      };
      try {
        await fetchWithTimeout(`${getApiUrl()}/deliveries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        });
      } catch (e) {}

      const list = getStoredDeliveries();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Domicilio no encontrado');
      list[idx] = {
        ...list[idx],
        deliveryStatus: 'CANCELADO',
        status: 'CANCELADO',
        deliveryNotes: reason ? `${list[idx].deliveryNotes || ''} [Cancelado: ${reason}]` : list[idx].deliveryNotes
      };
      saveStoredDeliveries(list);

      // Reversión de insumos en inventario por anulación de domicilio
      try {
        revertInventoryByRecipeAndExtras(list[idx].items || [], list[idx].orderNumber);
      } catch (e) {}

      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/deliveries/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {}
      const list = getStoredDeliveries();
      const filtered = list.filter(d => d.id !== id);
      saveStoredDeliveries(filtered);
      return true;
    }
  },
  customers: {
    getAll: async (): Promise<Customer[]> => {
      await delay(0);
      return getStoredCustomers();
    },
    getById: async (id: string): Promise<Customer | null> => {
      await delay(0);
      return getStoredCustomers().find(c => c.id === id) || null;
    },
    getByDocumentOrPhone: async (query: string): Promise<Customer | null> => {
      await delay(0);
      const clean = query.trim().toLowerCase();
      return getStoredCustomers().find(c =>
        (c.documentId && c.documentId.toLowerCase() === clean) ||
        (c.phone && c.phone.includes(clean))
      ) || null;
    },
    create: async (data: Omit<Customer, 'id'>): Promise<Customer> => {
      await delay(0);
      const list = getStoredCustomers();
      const newCustomer: Customer = {
        ...data,
        id: `cust-${Date.now()}`,
        loyaltyPoints: data.loyaltyPoints ?? 0,
        totalOrders: data.totalOrders ?? 0,
        totalSpent: data.totalSpent ?? 0,
        averageTicket: data.averageTicket ?? 0,
        tier: data.tier || 'BRONCE',
        createdAt: Date.now(),
        lastVisit: Date.now(),
        isActive: true,
      };
      list.unshift(newCustomer);
      saveStoredCustomers(list);
      return newCustomer;
    },
    update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
      await delay(0);
      const list = getStoredCustomers();
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Cliente no encontrado');
      list[idx] = { ...list[idx], ...data };
      saveStoredCustomers(list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      await delay(0);
      const list = getStoredCustomers();
      const filtered = list.filter(c => c.id !== id);
      saveStoredCustomers(filtered);
      return true;
    },
    adjustPoints: async (id: string, pointsDelta: number): Promise<Customer> => {
      await delay(0);
      const list = getStoredCustomers();
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Cliente no encontrado');
      const current = list[idx].loyaltyPoints || 0;
      list[idx].loyaltyPoints = Math.max(0, current + pointsDelta);
      saveStoredCustomers(list);
      return list[idx];
    }
  },
  settings: {
    get: async (): Promise<StoreSettings> => {
      return getStoredSettings();
    },
    update: async (updates: Partial<StoreSettings>): Promise<StoreSettings> => {
      const current = getStoredSettings();
      const updated: StoreSettings = { ...current, ...updates };
      saveStoredSettings(updated);
      return updated;
    }
  },
  reservations: {
    getAll: async (): Promise<Reservation[]> => {
      let backendData: Reservation[] | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/reservations`);
        if (response.ok) {
          const raw = await response.json();
          if (Array.isArray(raw)) {
            backendData = raw.map((r: any) => ({
              ...r,
              id: String(r.id),
              customerName: r.customerName || 'Cliente',
              customerPhone: r.customerPhone || r.phone || '',
              guestCount: Number(r.guestCount || r.pax) || 2,
              timeSlot: r.timeSlot || r.time || '19:00',
              date: r.date && !isNaN(Number(r.date)) ? Number(r.date) : (r.date ? new Date(r.date).getTime() : (r.createdAt || Date.now())),
              tableId: r.tableId ? String(r.tableId) : undefined,
              tableName: r.tableName || (r.tableId ? `Mesa ${r.tableId} (Salón)` : 'Sin Asignar'),
              status: r.status || 'PENDIENTE',
              occasion: r.occasion || 'OTRO',
              depositAmount: Number(r.depositAmount) || 0,
              specialRequests: r.specialRequests || '',
              notes: r.notes || '',
            }));
          }
        }
      } catch (e) {}

      const localList = getStoredReservations();

      if (backendData && backendData.length > 0) {
        // Combinar datos del servidor con los almacenados localmente para nunca perder reservas recién creadas
        const merged = [...backendData];
        for (const loc of localList) {
          if (!merged.some(b => b.id === loc.id)) {
            merged.push(loc);
          }
        }
        memoryReservationsCache = merged;
        return merged;
      }

      return localList;
    },
    getById: async (id: string): Promise<Reservation | null> => {
      await delay(0);
      return getStoredReservations().find(r => r.id === id) || null;
    },
    create: async (data: Omit<Reservation, 'id'>): Promise<Reservation> => {
      const newReservation: Reservation = {
        ...data,
        id: `res-${Date.now()}`,
        status: data.status || 'CONFIRMADA',
        guestCount: Number(data.guestCount) || 2,
        depositAmount: Number(data.depositAmount) || 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Guardar de inmediato en almacenamiento local para persistencia instantánea
      const list = getStoredReservations();
      const existingIdx = list.findIndex(r => r.id === newReservation.id);
      if (existingIdx >= 0) {
        list[existingIdx] = newReservation;
      } else {
        list.unshift(newReservation);
      }
      saveStoredReservations(list);

      // 2. Sincronizar mesa en Salón si fue asignada
      if (newReservation.tableId && newReservation.status === 'CONFIRMADA') {
        try {
          await mockApi.tables.updateStatus(newReservation.tableId, 'RESERVADA');
        } catch (e) {
          const tables = getStoredTables();
          const tIdx = tables.findIndex(t => t.id === newReservation.tableId);
          if (tIdx >= 0) {
            tables[tIdx].status = 'RESERVADA';
            saveStoredTables(tables);
          }
        }
      }

      // 3. Persistir en backend
      try {
        const res = await fetchWithTimeout(`${getApiUrl()}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReservation),
        });
        if (res.ok) {
          const serverRes = await res.json();
          if (serverRes && serverRes.id) {
            const normalized: Reservation = {
              ...newReservation,
              ...serverRes,
              id: String(serverRes.id || newReservation.id),
              customerPhone: serverRes.customerPhone || serverRes.phone || newReservation.customerPhone,
              guestCount: Number(serverRes.guestCount || serverRes.pax) || newReservation.guestCount,
              timeSlot: serverRes.timeSlot || serverRes.time || newReservation.timeSlot,
            };
            const currentList = getStoredReservations();
            const idx = currentList.findIndex(r => r.id === newReservation.id);
            if (idx >= 0) {
              currentList[idx] = normalized;
              saveStoredReservations(currentList);
            }
            return normalized;
          }
        }
      } catch (e) {}

      return newReservation;
    },
    update: async (id: string, data: Partial<Reservation>): Promise<Reservation> => {
      const list = getStoredReservations();
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Reserva no encontrada');
      const oldRes = list[idx];
      const updatedRes: Reservation = { ...oldRes, ...data, updatedAt: Date.now() };
      list[idx] = updatedRes;
      saveStoredReservations(list);

      // Sincronizar estado de mesa en Salón
      if (updatedRes.tableId) {
        try {
          if (updatedRes.status === 'SENTADA') {
            await mockApi.tables.updateStatus(updatedRes.tableId, 'OCUPADA');
          } else if (updatedRes.status === 'CONFIRMADA') {
            await mockApi.tables.updateStatus(updatedRes.tableId, 'RESERVADA');
          } else if (['COMPLETADA', 'CANCELADA', 'NO_SHOW'].includes(updatedRes.status)) {
            await mockApi.tables.updateStatus(updatedRes.tableId, 'DISPONIBLE');
          }
        } catch (e) {
          const tables = getStoredTables();
          const tIdx = tables.findIndex(t => t.id === updatedRes.tableId);
          if (tIdx >= 0) {
            if (updatedRes.status === 'SENTADA') tables[tIdx].status = 'OCUPADA';
            else if (updatedRes.status === 'CONFIRMADA') tables[tIdx].status = 'RESERVADA';
            else if (['COMPLETADA', 'CANCELADA', 'NO_SHOW'].includes(updatedRes.status)) tables[tIdx].status = 'DISPONIBLE';
            saveStoredTables(tables);
          }
        }
      }

      try {
        await fetchWithTimeout(`${getApiUrl()}/reservations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (e) {}

      return updatedRes;
    },
    delete: async (id: string): Promise<boolean> => {
      const list = getStoredReservations();
      const res = list.find(r => r.id === id);
      if (res && res.tableId) {
        try {
          await mockApi.tables.updateStatus(res.tableId, 'DISPONIBLE');
        } catch (e) {
          const tables = getStoredTables();
          const tIdx = tables.findIndex(t => t.id === res.tableId);
          if (tIdx >= 0 && tables[tIdx].status === 'RESERVADA') {
            tables[tIdx].status = 'DISPONIBLE';
            saveStoredTables(tables);
          }
        }
      }
      const filtered = list.filter(r => r.id !== id);
      saveStoredReservations(filtered);

      try {
        await fetchWithTimeout(`${getApiUrl()}/reservations/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {}

      return true;
    },
    seatReservation: async (id: string): Promise<Reservation> => {
      await delay(0);
      return mockApi.reservations.update(id, { status: 'SENTADA' });
    }
  },
  recipes: {
    getAll: async (): Promise<Recipe[]> => {
      await delay(0);
      return getStoredRecipes();
    },
    getByProductId: async (productId: string): Promise<Recipe | null> => {
      await delay(0);
      return getStoredRecipes().find(r => r.productId === productId) || null;
    },
    save: async (recipe: Recipe): Promise<Recipe> => {
      await delay(0);

      // Sincronizar y crear automáticamente ingredientes que no estén en inventario
      const inventoryList = getStoredInventory();
      let inventoryUpdated = false;
      const newlyCreatedIngredients: string[] = [];

      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          let item = inventoryList.find(i => i.id === ing.inventoryItemId);
          if (!item) {
            const rawName = ing.customIngredientName || ing.name || (ing.inventoryItemId.startsWith('NEW:') ? ing.inventoryItemId.replace('NEW:', '') : ing.inventoryItemId);
            const cleanName = (rawName || '').trim();

            if (cleanName && cleanName !== '__NEW_INGREDIENT__') {
              // Buscar si existe por coincidencia de nombre exacto o insensible a mayúsculas
              item = inventoryList.find(i => (i.name || '').toLowerCase() === cleanName.toLowerCase());

              if (item) {
                ing.inventoryItemId = item.id;
                if (!ing.unit) ing.unit = item.unit;
              } else {
                // Crear automáticamente el nuevo insumo en inventario
                const newId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                const nextCode = `INS-${String(inventoryList.length + 1).padStart(2, '0')}`;
                const newInvItem: InventoryItem = {
                  id: newId,
                  code: nextCode,
                  name: cleanName,
                  category: 'General',
                  unit: (ing.unit as MeasurementUnit) || 'Kg',
                  currentStock: 0,
                  minStock: 5,
                  maxStock: 50,
                  unitCost: 0,
                  isActive: true,
                };

                inventoryList.unshift(newInvItem);
                ing.inventoryItemId = newId;
                inventoryUpdated = true;
                newlyCreatedIngredients.push(cleanName);

                // Registrar en el Kardex de inventario como creación pendiente
                const movs = getStoredInventoryMovements();
                movs.unshift({
                  id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  itemId: newId,
                  itemName: cleanName,
                  type: 'AJUSTE',
                  quantity: 0,
                  reason: `Nuevo insumo creado automáticamente desde Receta "${recipe.productName || 'Receta'}" (Pendiente actualizar stock y costo)`,
                  responsibleName: 'Chef / Ingeniería de Recetas',
                  date: Date.now(),
                });
                saveStoredInventoryMovements(movs);
              }
            }
          }
        }
      }

      if (inventoryUpdated) {
        saveStoredInventory(inventoryList);
        notifyRealtimeEvent('sesamo_inventory_updated');

        // Registrar alerta pendiente para el banner de Almacén / Inventario
        memoryInventoryAlertsCache.unshift({
          id: `alert-${Date.now()}`,
          date: Date.now(),
          recipeName: recipe.productName || 'Nueva Receta',
          ingredients: newlyCreatedIngredients,
        });
      }

      const list = getStoredRecipes();
      const existingIdx = list.findIndex(r => r.productId === recipe.productId || (recipe.id && r.id === recipe.id));
      let updatedRecipe: Recipe;
      if (existingIdx >= 0) {
        updatedRecipe = {
          ...list[existingIdx],
          ...recipe,
          updatedAt: Date.now()
        };
        list[existingIdx] = updatedRecipe;
      } else {
        updatedRecipe = {
          ...recipe,
          id: recipe.id || `rec-${Date.now()}`,
          updatedAt: Date.now()
        };
        list.push(updatedRecipe);
      }
      saveStoredRecipes(list);
      return updatedRecipe;
    },
    delete: async (productId: string): Promise<boolean> => {
      await delay(0);
      const list = getStoredRecipes();
      const filtered = list.filter(r => r.productId !== productId && r.id !== productId);
      saveStoredRecipes(filtered);
      return true;
    }
  },
  staff: {
    getAll: async (): Promise<StaffMember[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff`);
        if (response.ok) {
          const dbStaff = await response.json();
          if (Array.isArray(dbStaff)) {
            // Sincronizar automáticamente colaboradores de localStorage que aún no estén en la base de datos PostgreSQL
            const localStaff = getStoredStaff();
            for (const localMember of localStaff) {
              const alreadyInDb = dbStaff.some(
                s => String(s.id) === String(localMember.id) ||
                     (s.email && localMember.email && s.email.toLowerCase().trim() === localMember.email.toLowerCase().trim())
              );
              if (!alreadyInDb && localMember.name && localMember.email) {
                try {
                  const syncRes = await fetchWithTimeout(`${getApiUrl()}/staff`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(localMember),
                  });
                  if (syncRes.ok) {
                    const savedInDb = await syncRes.json();
                    dbStaff.unshift(savedInDb);
                  }
                } catch (e) {
                  console.warn('Error sincronizando colaborador local con PostgreSQL:', e);
                }
              }
            }
            saveStoredStaff(dbStaff);
            return dbStaff;
          }
        }
      } catch (err) {
        console.warn('Error conectando a /api/staff, usando almacenamiento local:', err);
      }
      return getStoredStaff();
    },
    getById: async (id: string): Promise<StaffMember | null> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/${id}`);
        if (response.ok) return await response.json();
      } catch (e) {}
      return getStoredStaff().find(s => String(s.id) === String(id)) || null;
    },
    create: async (data: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
      const staff = getStoredStaff();
      let createdMember: StaffMember | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          createdMember = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('Backend respondió error al crear colaborador:', errData);
        }
      } catch (e) {
        console.warn('Backend offline o error al crear en base de datos PostgreSQL:', e);
      }

      const newMember: StaffMember = createdMember || {
        ...data,
        id: 'staff-' + Date.now(),
      };

      saveStoredStaff([newMember, ...staff.filter(s => String(s.id) !== String(newMember.id))]);
      return newMember;
    },
    update: async (id: string, updates: Partial<StaffMember>): Promise<StaffMember> => {
      const staff = getStoredStaff();
      let updatedMember: StaffMember | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (response.ok) {
          updatedMember = await response.json();
        }
      } catch (e) {}

      const index = staff.findIndex(s => String(s.id) === String(id));
      if (index === -1 && !updatedMember) throw new Error('Colaborador no encontrado');
      const updated = updatedMember || { ...staff[index], ...updates };
      if (index !== -1) {
        staff[index] = updated;
      } else {
        staff.unshift(updated);
      }
      saveStoredStaff([...staff]);
      return updated;
    },
    delete: async (id: string): Promise<void> => {
      try {
        await fetchWithTimeout(`${getApiUrl()}/staff/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {}
      const staff = getStoredStaff().filter(s => String(s.id) !== String(id));
      saveStoredStaff(staff);
    },
    clockIn: async (id: string): Promise<StaffMember> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/${id}/clock-in`, {
          method: 'POST',
        });
        if (response.ok) {
          const updated = await response.json();
          const staff = getStoredStaff().map(s => (String(s.id) === String(id) ? updated : s));
          saveStoredStaff(staff);
          return updated;
        }
      } catch (e) {}

      const staff = getStoredStaff();
      const member = staff.find(s => String(s.id) === String(id));
      if (!member) throw new Error('Colaborador no encontrado');
      const timeStr = getColombiaTimeStr();
      const dateStr = getColombiaDateStr();
      
      member.shiftStatus = 'EN_TURNO';
      member.shiftStartTime = timeStr;
      saveStoredStaff([...staff]);

      const shifts = getStoredShifts();
      const newShift: StaffShiftRecord = {
        id: 'sh-' + Date.now(),
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        date: dateStr,
        checkIn: timeStr,
        status: 'ACTIVO',
        hoursWorked: 0,
        effectiveHoursWorked: 0,
        breaks: [],
        totalBreakMinutes: 0,
        notes: `Turno iniciado a las ${timeStr}`
      };
      saveStoredShifts([newShift, ...shifts]);

      const logs = getStoredShiftLogs();
      const newLog: ShiftAuditLog = {
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        date: dateStr,
        time: timeStr,
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        eventType: 'INICIO_TURNO',
        description: `Inicio de turno registrado a las ${timeStr}`,
      };
      saveStoredShiftLogs([newLog, ...logs]);

      return member;
    },
    clockOut: async (id: string): Promise<StaffMember> => {
      const storedRole = getStoredUserRole();
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/${id}/clock-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {}),
            'x-user-id': String(id),
          }
        });
        if (response.ok) {
          const updated = await response.json();
          const staff = getStoredStaff().map(s => (String(s.id) === String(id) ? updated : s));
          saveStoredStaff(staff);
          return updated;
        }
      } catch (e) {}

      const staff = getStoredStaff();
      const member = staff.find(s => String(s.id) === String(id));
      if (!member) throw new Error('Colaborador no encontrado');
      const timeStr = getColombiaTimeStr();
      const dateStr = getColombiaDateStr();
      
      const shifts = getStoredShifts();
      const activeShift = shifts.find(sh => String(sh.staffId) === String(id) && (sh.status === 'ACTIVO' || sh.status === 'DESCANSO'));
      let hoursWorked = 0;
      let totalBreak = 0;

      if (activeShift) {
        if (activeShift.breaks && activeShift.breaks.length > 0) {
          const openBreak = activeShift.breaks.find(b => !b.endTime);
          if (openBreak) {
            openBreak.endTime = timeStr;
            const brkMins = calculateMinutesBetween(openBreak.startTime, timeStr);
            openBreak.durationMinutes = Math.max(1, brkMins);
            activeShift.totalBreakMinutes = (activeShift.totalBreakMinutes || 0) + openBreak.durationMinutes;
          }
        }

        activeShift.checkOut = timeStr;
        activeShift.status = 'COMPLETADO';
        totalBreak = activeShift.totalBreakMinutes || 0;
        const { totalHours, effectiveHours } = calculateShiftDurationHours(
          activeShift.checkIn || '08:00',
          timeStr,
          totalBreak
        );
        hoursWorked = totalHours;
        activeShift.hoursWorked = hoursWorked;
        activeShift.effectiveHoursWorked = effectiveHours;
        activeShift.notes = (activeShift.notes ? `${activeShift.notes} · ` : '') + `[Turno finalizado a las ${timeStr}]`;
        saveStoredShifts([...shifts]);
      }

      member.shiftStatus = 'FUERA_DE_TURNO';
      member.shiftStartTime = undefined;
      saveStoredStaff([...staff]);

      const logs = getStoredShiftLogs();
      const newLog: ShiftAuditLog = {
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        date: dateStr,
        time: timeStr,
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        eventType: 'FIN_TURNO',
        description: `Finalizó su turno a las ${timeStr} (${hoursWorked} hrs brutas, ${totalBreak} min en descanso)`,
      };
      saveStoredShiftLogs([newLog, ...logs]);

      return member;
    },
    setBreak: async (id: string): Promise<StaffMember> => {
      const storedRole = getStoredUserRole();
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/${id}/break`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedRole ? { 'x-user-role': storedRole } : {}),
            'x-user-id': String(id),
          }
        });
        if (response.ok) {
          const updated = await response.json();
          const staff = getStoredStaff().map(s => (String(s.id) === String(id) ? updated : s));
          saveStoredStaff(staff);
          return updated;
        }
      } catch (e) {}

      const staff = getStoredStaff();
      const member = staff.find(s => String(s.id) === String(id));
      if (!member) throw new Error('Colaborador no encontrado');
      const timeStr = getColombiaTimeStr();
      const dateStr = getColombiaDateStr();

      const goingOnBreak = member.shiftStatus !== 'DESCANSO';
      member.shiftStatus = goingOnBreak ? 'DESCANSO' : 'EN_TURNO';
      saveStoredStaff([...staff]);

      const shifts = getStoredShifts();
      const activeShift = shifts.find(sh => String(sh.staffId) === String(id) && (sh.status === 'ACTIVO' || sh.status === 'DESCANSO'));
      let breakDuration = 0;

      if (activeShift) {
        if (!activeShift.breaks) activeShift.breaks = [];
        activeShift.status = goingOnBreak ? 'DESCANSO' : 'ACTIVO';
        
        if (goingOnBreak) {
          activeShift.breaks.push({
            id: 'brk-' + Date.now(),
            startTime: timeStr,
          });
          activeShift.notes = (activeShift.notes ? `${activeShift.notes} · ` : '') + `[Pausa iniciada a las ${timeStr}]`;
        } else {
          const openBreak = [...activeShift.breaks].reverse().find(b => !b.endTime);
          if (openBreak) {
            openBreak.endTime = timeStr;
            breakDuration = calculateMinutesBetween(openBreak.startTime, timeStr);
            breakDuration = Math.max(1, breakDuration);
            openBreak.durationMinutes = breakDuration;
            activeShift.totalBreakMinutes = (activeShift.totalBreakMinutes || 0) + breakDuration;
          }
          activeShift.notes = (activeShift.notes ? `${activeShift.notes} · ` : '') + `[Pausa finalizada a las ${timeStr} (${breakDuration} min)]`;
        }
        saveStoredShifts([...shifts]);
      }

      const logs = getStoredShiftLogs();
      const newLog: ShiftAuditLog = {
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        date: dateStr,
        time: timeStr,
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        eventType: goingOnBreak ? 'PAUSA_INICIADA' : 'PAUSA_FINALIZADA',
        description: goingOnBreak
          ? `Pausó su turno de trabajo (salida a descanso/refrigerio) a las ${timeStr}`
          : `Reanudó su turno tras pausa a las ${timeStr} (descanso de ${breakDuration} min)`,
        durationMinutes: goingOnBreak ? undefined : breakDuration,
      };
      saveStoredShiftLogs([newLog, ...logs]);

      return member;
    },
    getShiftLogs: async (): Promise<ShiftAuditLog[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/shifts/logs`);
        if (response.ok) {
          const logs = await response.json();
          if (Array.isArray(logs) && logs.length > 0) {
            saveStoredShiftLogs(logs);
            return logs;
          }
        }
      } catch (e) {}
      return getStoredShiftLogs();
    },
    getShifts: async (): Promise<StaffShiftRecord[]> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/shifts`);
        if (response.ok) {
          const shifts = await response.json();
          if (Array.isArray(shifts) && shifts.length > 0) {
            saveStoredShifts(shifts);
            return shifts;
          }
        }
      } catch (e) {}
      return getStoredShifts();
    },
    addShiftRecord: async (record: Omit<StaffShiftRecord, 'id'>): Promise<StaffShiftRecord> => {
      let created: StaffShiftRecord | null = null;
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/staff/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (response.ok) {
          created = await response.json();
        }
      } catch (e) {}

      const shifts = getStoredShifts();
      const newRecord: StaffShiftRecord = created || {
        ...record,
        id: 'sh-' + Date.now()
      };
      saveStoredShifts([newRecord, ...shifts]);
      return newRecord;
    }
  },
  dashboard: {
    getStats: async (): Promise<any> => {
      try {
        const response = await fetchWithTimeout(`${getApiUrl()}/dashboard/stats`, {}, 25000);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        console.warn('Dashboard backend API unavailable, falling back to local dataset', e);
      }
      return null;
    }
  }
};
