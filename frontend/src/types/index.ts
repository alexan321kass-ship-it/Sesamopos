// Auth & Users
export type Role = 'ADMINISTRADOR' | 'GERENTE' | 'CAJERO' | 'MESERO' | 'COCINA' | 'INVENTARIO' | 'REPARTIDOR';

export interface StaffPermissions {
  canOpenCloseCash: boolean;
  canApplyDiscounts: boolean;
  canVoidItems: boolean;
  canAccessReports: boolean;
  canManageInventory: boolean;
  canManageStaff: boolean;
}

export interface ShiftBreakItem {
  id: string;
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes?: number;
}

export interface ShiftAuditLog {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  staffId: string;
  staffName: string;
  role: Role;
  eventType: 'INICIO_TURNO' | 'PAUSA_INICIADA' | 'PAUSA_FINALIZADA' | 'FIN_TURNO' | 'TURNO_MANUAL';
  description: string;
  durationMinutes?: number;
}

export interface StaffShiftRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: Role;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm
  checkOut?: string; // HH:mm
  status: 'ACTIVO' | 'COMPLETADO' | 'DESCANSO';
  hoursWorked: number;
  effectiveHoursWorked?: number;
  breaks?: ShiftBreakItem[];
  totalBreakMinutes?: number;
  notes?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  password?: string;
  phone?: string;
  documentId?: string; // Cédula / DNI
  pin?: string; // PIN táctil de 4 dígitos
  avatarUrl?: string;
  hireDate?: string;
  hourlyRate?: number; // COP por hora
  shiftStatus?: 'EN_TURNO' | 'DESCANSO' | 'FUERA_DE_TURNO';
  shiftStartTime?: string;
  assignedArea?: string; // ej. Salón Comedor, Cocina, Caja Central
  permissions: StaffPermissions;
  stats?: {
    ordersServed: number;
    salesVolume: number;
    tipsAccumulated: number;
    rating: number;
  };
}

export interface User extends Partial<StaffMember> {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

// Menu & Products
export interface Category {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  inventoryItemId?: string;
  quantity?: number;
  unit?: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  cost: number;
  imageUrl?: string;
  videoUrl?: string;
  tags?: string[];
  rating?: number;
  calories?: string;
  isAvailable: boolean;
  isActive: boolean;
  modifiers?: ModifierGroup[];
}

// Tables
export type TableStatus = 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'PEDIDO_LISTO' | 'FUERA_DE_SERVICIO' | 'CUENTA_PEDIDA';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  location?: string;
  currentWaiterId?: string;
  currentWaiterName?: string;
  currentOrderId?: string;
  timeOccupied?: number; // timestamp
}

// Orders
export type OrderStatus = 'PENDIENTE' | 'CREADO' | 'CONFIRMADO' | 'EN_COCINA' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'PAGADO' | 'EN_CAMINO' | 'CANCELADO';
export type OrderType = 'MESA' | 'PARA_LLEVAR' | 'DOMICILIO' | 'BARRA';

export interface OrderItemModifier {
  modifierGroupId: string;
  modifierOptionId: string;
  name: string;
  price: number;
  inventoryItemId?: string;
  quantity?: number;
  unit?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: OrderItemModifier[];
  notes?: string;
  isDelivered?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: number;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  tableId?: string;
  tableName?: string;
  waiterId?: string;
  waiterName?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  tip?: number;
  total: number;
  status: OrderStatus;
  type: OrderType;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO' | 'DATAFONO';
  registerId?: string;
  paidAt?: number;
  paidBy?: string;
  invoiceNumber?: string;
  cashReceived?: number;
  changeGiven?: number;
  mixedPayments?: { method: string; amount: number }[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  createdAt: number;
  customerName: string;
  customerDocument: string;
  customerEmail?: string;
  tableNumber?: string | number;
  waiterName?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  cashReceived?: number;
  changeGiven?: number;
  mixedPayments?: { method: string; amount: number }[];
  resolutionInfo?: string;
}

// PHASE 2 - INVENTORY
export type MeasurementUnit = 'Unidad' | 'Kg' | 'g' | 'Litro' | 'ml' | 'Caja' | 'Paquete';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: MeasurementUnit;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  supplierId?: string;
  isActive: boolean;
}

export type InventoryMovementType = 'ENTRADA' | 'SALIDA' | 'MERMA' | 'AJUSTE';

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  responsibleId: string;
  date: number;
}

// PHASE 2 - PURCHASES
export interface Supplier {
  id: string;
  name: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

export type PurchaseOrderStatus = 'BORRADOR' | 'ENVIADA' | 'PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export interface PurchaseOrderItem {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: number;
  items: PurchaseOrderItem[];
  total: number;
  status: PurchaseOrderStatus;
}

// PHASE 2 - CASH REGISTER
export type CashMovementType = 'VENTA' | 'INGRESO_MANUAL' | 'RETIRO' | 'GASTO' | 'AJUSTE';

export interface CashMovement {
  id: string;
  registerId: string;
  type: CashMovementType;
  amount: number;
  reason?: string;
  date: number;
}

export interface CashRegister {
  id: string;
  name: string;
  openedBy: string;
  openedAt: number;
  closedAt?: number;
  initialAmount: number;
  currentAmount: number;
  isOpen: boolean;
}

// PHASE 3 - DELIVERY & CUSTOMERS
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  documentId?: string; // Cédula o NIT para Facturación Electrónica DIAN
  documentType?: 'CC' | 'NIT' | 'CE' | 'PASAPORTE';
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent?: number; // Total acumulado en compras ($ COP)
  averageTicket?: number; // Ticket promedio
  tier?: 'DIAMANTE' | 'ORO' | 'PLATA' | 'BRONCE';
  preferences?: string; // Preferencias culinarias o de mesa en salón
  allergies?: string[]; // Alergias alimentarias
  notes?: string; // Notas de servicio del restaurante
  lastVisit?: number; // timestamp
  city?: string;
  zone?: string;
  createdAt?: number;
  isActive?: boolean;
}

export type DeliveryStatus = 'PENDIENTE' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export interface DeliveryOrder extends Order {
  customer: Customer;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryZone?: string;
  deliveryStatus: DeliveryStatus;
  deliveryRiderId?: string;
  deliveryRiderName?: string;
  deliveryRiderPhone?: string;
  estimatedDeliveryTime?: number; // timestamp
  dispatchedAt?: number;
  deliveredAt?: number;
  deliveryFee?: number;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO' | 'DATAFONO';
  cashAmountPaidWith?: number;
  deliveryNotes?: string;
  isSettled?: boolean;
  settledAt?: number;
}

// PHASE 3 - SETTINGS
export interface StoreSettings {
  storeName: string;
  nit: string;
  currency: string;
  taxType: 'IMPOCONSUMO_8' | 'IVA_19' | 'EXENTO';
  taxRate: number;
  defaultTipPercentage: number;
  address: string;
  phone: string;
  ticketFooter: string;
  autoPrintReceipt: boolean;
  logoUrl?: string;
  name?: string;
}

// PHASE 4 - ADVANCED
export type ReservationStatus = 'PENDIENTE' | 'CONFIRMADA' | 'SENTADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW';

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  date: number; // timestamp
  timeSlot?: string; // e.g. "19:30"
  guestCount: number;
  tableId?: string;
  tableName?: string;
  status: ReservationStatus;
  occasion?: 'CUMPLEAÑOS' | 'ANIVERSARIO' | 'REUNION_NEGOCIOS' | 'CENA_FAMILIAR' | 'OTRO';
  specialRequests?: string;
  notes?: string;
  durationMinutes?: number;
  depositAmount?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  quantity: number;
  unit?: string;
  notes?: string;
  name?: string;
  customIngredientName?: string;
}

export interface Recipe {
  id?: string;
  productId: string;
  productName?: string;
  category?: string;
  ingredients: RecipeIngredient[];
  preparationTimeMinutes?: number;
  portions?: number;
  wasteMarginPercentage?: number; // e.g. 5%
  packagingCost?: number; // Packaging / disposables cost
  preparationInstructions?: string;
  allergens?: string[];
  chefNotes?: string;
  difficulty?: 'FÁCIL' | 'MEDIA' | 'ALTA';
  station?: 'PARRILLA' | 'HORNO' | 'COCINA' | 'BAR' | 'ENSALADAS';
  updatedAt?: number;
}


