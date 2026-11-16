import { Category, Product, Table, Order, InventoryItem, Supplier, PurchaseOrder, CashRegister, StaffMember, StaffShiftRecord, Customer, DeliveryOrder, StoreSettings, Reservation, Recipe } from '../types';

export const mockStaffMembers: StaffMember[] = [
  {
    id: '1',
    name: 'Administrador General',
    email: 'admin@sesamo.com',
    password: 'password123',
    role: 'ADMINISTRADOR',
    isActive: true,
    phone: '+57 300 000 0001',
    documentId: '1000000001',
    pin: '1111',
    hireDate: '2023-01-15',
    hourlyRate: 20000,
    assignedArea: 'Dirección General',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '09:00',
    permissions: {
      canOpenCloseCash: true,
      canApplyDiscounts: true,
      canVoidItems: true,
      canAccessReports: true,
      canManageInventory: true,
      canManageStaff: true,
    },
    stats: { ordersServed: 0, salesVolume: 0, tipsAccumulated: 0, rating: 5.0 }
  },
  {
    id: '5',
    name: 'Andrea Silva (Gerente)',
    email: 'andrea@sesamo.com',
    password: 'password123',
    role: 'GERENTE',
    isActive: true,
    phone: '+57 320 111 2233',
    documentId: '1056473829',
    pin: '7890',
    hireDate: '2023-03-01',
    hourlyRate: 15000,
    assignedArea: 'Supervisión de Turno',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '10:00',
    permissions: {
      canOpenCloseCash: true,
      canApplyDiscounts: true,
      canVoidItems: true,
      canAccessReports: true,
      canManageInventory: true,
      canManageStaff: true,
    },
    stats: { ordersServed: 5, salesVolume: 185000, tipsAccumulated: 18500, rating: 4.9 }
  },
  {
    id: '3',
    name: 'Laura Gómez (Cajera)',
    email: 'laura@sesamo.com',
    password: 'password123',
    role: 'CAJERO',
    isActive: true,
    phone: '+57 315 222 3344',
    documentId: '1082736451',
    pin: '4567',
    hireDate: '2023-06-10',
    hourlyRate: 9000,
    assignedArea: 'Caja Principal #1',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '11:00',
    permissions: {
      canOpenCloseCash: true,
      canApplyDiscounts: true,
      canVoidItems: false,
      canAccessReports: true,
      canManageInventory: false,
      canManageStaff: false,
    },
    stats: { ordersServed: 0, salesVolume: 3450000, tipsAccumulated: 45000, rating: 4.9 }
  },
  {
    id: '2',
    name: 'Carlos Ruiz (Capitán de Meseros)',
    email: 'carlos@sesamo.com',
    password: 'password123',
    role: 'MESERO',
    isActive: true,
    phone: '+57 310 456 7890',
    documentId: '1020304050',
    pin: '1234',
    hireDate: '2023-04-12',
    hourlyRate: 9500,
    assignedArea: 'Salón Principal',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '11:30',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: true,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: false,
      canManageStaff: false,
    },
    stats: { ordersServed: 38, salesVolume: 1240000, tipsAccumulated: 124000, rating: 4.9 }
  },
  {
    id: '7',
    name: 'Andrés Ramírez (Mesero)',
    email: 'andres@sesamo.com',
    password: 'password123',
    role: 'MESERO',
    isActive: true,
    phone: '+57 312 888 1234',
    documentId: '1098765432',
    pin: '2345',
    hireDate: '2023-08-20',
    hourlyRate: 8500,
    assignedArea: 'Salón (Mesas 6-9)',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '12:00',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: false,
      canManageStaff: false,
    },
    stats: { ordersServed: 26, salesVolume: 820000, tipsAccumulated: 82000, rating: 4.8 }
  },
  {
    id: '8',
    name: 'Sofía López (Mesera)',
    email: 'sofia@sesamo.com',
    password: 'password123',
    role: 'MESERO',
    isActive: true,
    phone: '+57 301 999 5544',
    documentId: '1019283746',
    pin: '3456',
    hireDate: '2023-09-01',
    hourlyRate: 8500,
    assignedArea: 'Salón (Mesas 10-13)',
    shiftStatus: 'DESCANSO',
    shiftStartTime: '11:45',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: false,
      canManageStaff: false,
    },
    stats: { ordersServed: 31, salesVolume: 1050000, tipsAccumulated: 105000, rating: 5.0 }
  },
  {
    id: '4',
    name: 'Juan Chef (Jefe de Cocina)',
    email: 'cocina@sesamo.com',
    password: 'password123',
    role: 'COCINA',
    isActive: true,
    phone: '+57 317 444 8877',
    documentId: '1039485726',
    pin: '5678',
    hireDate: '2023-02-10',
    hourlyRate: 12000,
    assignedArea: 'Cocina Caliente & Parrilla',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '10:30',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: true,
      canManageStaff: false,
    },
    stats: { ordersServed: 95, salesVolume: 0, tipsAccumulated: 55000, rating: 4.9 }
  },
  {
    id: '6',
    name: 'Mateo Díaz (Inventario & Bodega)',
    email: 'mateo@sesamo.com',
    password: 'password123',
    role: 'INVENTARIO',
    isActive: true,
    phone: '+57 318 666 7788',
    documentId: '1074839201',
    pin: '8901',
    hireDate: '2023-07-15',
    hourlyRate: 8500,
    assignedArea: 'Almacén Central',
    shiftStatus: 'FUERA_DE_TURNO',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: true,
      canManageStaff: false,
    },
    stats: { ordersServed: 0, salesVolume: 0, tipsAccumulated: 0, rating: 4.7 }
  },
  {
    id: '9',
    name: 'Kevin Morales (Domicilios Express)',
    email: 'kevin@sesamo.com',
    password: 'password123',
    role: 'REPARTIDOR',
    isActive: true,
    phone: '+57 314 555 6677',
    documentId: '1065748392',
    pin: '9012',
    hireDate: '2023-10-05',
    hourlyRate: 8000,
    assignedArea: 'Rutas & Domicilios',
    shiftStatus: 'EN_TURNO',
    shiftStartTime: '12:30',
    permissions: {
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: false,
      canManageStaff: false,
    },
    stats: { ordersServed: 14, salesVolume: 420000, tipsAccumulated: 42000, rating: 4.8 }
  }
];

export const mockStaffShifts: StaffShiftRecord[] = [
  {
    id: 'sh-1',
    staffId: '1',
    staffName: 'Administrador General',
    role: 'ADMINISTRADOR',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    status: 'ACTIVO',
    hoursWorked: 5.5,
    notes: 'Apertura general del restaurante'
  },
  {
    id: 'sh-2',
    staffId: '5',
    staffName: 'Andrea Silva',
    role: 'GERENTE',
    date: new Date().toISOString().split('T')[0],
    checkIn: '10:00',
    status: 'ACTIVO',
    hoursWorked: 4.5,
    notes: 'Supervisión de calidad y caja'
  },
  {
    id: 'sh-3',
    staffId: '3',
    staffName: 'Laura Gómez',
    role: 'CAJERO',
    date: new Date().toISOString().split('T')[0],
    checkIn: '11:00',
    status: 'ACTIVO',
    hoursWorked: 3.5,
    notes: 'Apertura de Caja #1'
  },
  {
    id: 'sh-4',
    staffId: '2',
    staffName: 'Carlos Ruiz',
    role: 'MESERO',
    date: new Date().toISOString().split('T')[0],
    checkIn: '11:30',
    status: 'ACTIVO',
    hoursWorked: 3.0,
    notes: 'Asignado a mesas 1 a 6'
  },
  {
    id: 'sh-5',
    staffId: '7',
    staffName: 'Andrés Ramírez',
    role: 'MESERO',
    date: new Date().toISOString().split('T')[0],
    checkIn: '12:00',
    status: 'ACTIVO',
    hoursWorked: 2.5,
    notes: 'Servicio en salón comedor'
  },
  {
    id: 'sh-6',
    staffId: '8',
    staffName: 'Sofía López',
    role: 'MESERO',
    date: new Date().toISOString().split('T')[0],
    checkIn: '11:45',
    status: 'DESCANSO',
    hoursWorked: 2.75,
    notes: 'Pausa de refrigerio'
  },
  {
    id: 'sh-7',
    staffId: '4',
    staffName: 'Juan Chef',
    role: 'COCINA',
    date: new Date().toISOString().split('T')[0],
    checkIn: '10:30',
    status: 'ACTIVO',
    hoursWorked: 4.0,
    notes: 'Parrilla y línea caliente'
  },
  {
    id: 'sh-8',
    staffId: '9',
    staffName: 'Kevin Morales',
    role: 'REPARTIDOR',
    date: new Date().toISOString().split('T')[0],
    checkIn: '12:30',
    status: 'ACTIVO',
    hoursWorked: 2.0,
    notes: 'Zona Norte y Centro'
  }
];

export const mockUsers = mockStaffMembers;

export const mockCategories: Category[] = [
  { id: '1', name: 'Hamburguesas', description: 'Hamburguesas artesanales 100% carne de res', isActive: true },
  { id: '2', name: 'Pizzas', description: 'Pizzas horneadas en horno de piedra de leña', isActive: true },
  { id: '3', name: 'Acompañamientos', description: 'Papas, aros de cebolla y entradas deliciosas', isActive: true },
  { id: '4', name: 'Bebidas', description: 'Gaseosas, jugos naturales y cervezas frías', isActive: true },
  { id: '5', name: 'Postres', description: 'Postres artesanales de la casa', isActive: true },
];

export interface ProductWithMedia extends Product {}

export const mockProducts: Product[] = [
  // Hamburguesas
  {
    id: '1',
    sku: 'HAM-01',
    name: 'Hamburguesa Clásica',
    description: 'Carne 150g artesanal, queso cheddar fundido, lechuga fresca, tomate jugoso y salsa especial de la casa',
    categoryId: '1',
    price: 22000,
    cost: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-delicious-burger-42898-large.mp4',
    tags: ['⭐ Más Vendido', '🔥 Recomendado'],
    rating: 4.9,
    calories: '650 kcal',
    isAvailable: true,
    isActive: true,
    modifiers: [
      {
        id: 'm1',
        name: 'Extras',
        isRequired: false,
        minSelections: 0,
        maxSelections: 3,
        options: [
          { id: 'o1', name: 'Queso Extra', price: 3500, inventoryItemId: '3', quantity: 0.05, unit: 'Paquete' },
          { id: 'o2', name: 'Tocineta Crocante', price: 4500, inventoryItemId: '11', quantity: 0.04, unit: 'Kg' },
          { id: 'o3', name: 'Huevo Frito', price: 2500, inventoryItemId: '10', quantity: 1, unit: 'Unidad' }
        ]
      }
    ]
  },
  {
    id: '2',
    sku: 'HAM-02',
    name: 'Hamburguesa BBQ Smoked',
    description: 'Carne 180g ahumada a la parrilla, queso ahumado, tocineta crujiente, aros de cebolla y salsa BBQ artesanal',
    categoryId: '1',
    price: 27000,
    cost: 10500,
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-hamburger-42897-large.mp4',
    tags: ['🔥 BBQ Especial', '🥓 Tocineta Premium'],
    rating: 4.8,
    calories: '820 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '3',
    sku: 'HAM-03',
    name: 'Hamburguesa Doble Trufa',
    description: 'Doble carne 150g de res Angus, doble queso gouda, cebolla caramelizada lentamente y mayonesa de trufa negra',
    categoryId: '1',
    price: 34000,
    cost: 13500,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-preparing-a-hamburger-with-fresh-ingredients-42900-large.mp4',
    tags: ['👑 Gourmet', '🖤 Trufa Negra'],
    rating: 5.0,
    calories: '980 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '4',
    sku: 'HAM-04',
    name: 'Hamburguesa Veggie Portobello',
    description: 'Hongo Portobello gigante a la parrilla, queso de cabra fundido, rúgula fresca y tomates deshidratados',
    categoryId: '1',
    price: 26000,
    cost: 9500,
    imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80',
    tags: ['🌱 Vegetariana', '🍄 Portobello'],
    rating: 4.7,
    calories: '510 kcal',
    isAvailable: true,
    isActive: true,
  },

  // Pizzas
  {
    id: '5',
    sku: 'PIZ-01',
    name: 'Pizza Pepperoni Suprema',
    description: 'Salsa napolitana de la casa, abundante queso mozzarella hilado y generosas rodajas de pepperoni tostado',
    categoryId: '2',
    price: 38000,
    cost: 14000,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-pizza-in-a-restaurant-kitchen-42899-large.mp4',
    tags: ['🍕 Favorita', '🔥 Horno de Leña'],
    rating: 4.9,
    calories: '1100 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '6',
    sku: 'PIZ-02',
    name: 'Pizza Margarita Italiana',
    description: 'Salsa de tomates Italianos frescos, mozzarella fior di latte, hojas de albahaca fresca y aceite de oliva virgen extra',
    categoryId: '2',
    price: 32000,
    cost: 11000,
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-taking-a-slice-of-pizza-42902-large.mp4',
    tags: ['🇮🇹 Tradicional', '🌿 Albahaca Fresca'],
    rating: 4.8,
    calories: '890 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '7',
    sku: 'PIZ-03',
    name: 'Pizza Cuatro Quesos',
    description: 'Mezcla perfecta de Mozzarella, Gorgonzola cremoso, Parmesano reggiano madurado y Gouda ahumado',
    categoryId: '2',
    price: 42000,
    cost: 16000,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    tags: ['🧀 4 Quesos', '🤤 Cremosa'],
    rating: 4.9,
    calories: '1250 kcal',
    isAvailable: true,
    isActive: true,
  },

  // Acompañamientos
  {
    id: '8',
    sku: 'ACO-01',
    name: 'Papas Rústicas a la Francesa',
    description: 'Papas de corte grueso sazonadas con romero fresco, ajo crujiente y sal marina en escamas',
    categoryId: '3',
    price: 10000,
    cost: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80',
    tags: ['🍟 Crocantes', '🌿 Romero & Ajo'],
    rating: 4.7,
    calories: '380 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '9',
    sku: 'ACO-02',
    name: 'Aros de Cebolla Crocantes',
    description: 'Cebolla dulce en aros empanizados dorados en su punto, acompañados de salsa alioli de ajo asado',
    categoryId: '3',
    price: 12000,
    cost: 3800,
    imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80',
    tags: ['🧅 Alioli Casero'],
    rating: 4.6,
    calories: '420 kcal',
    isAvailable: true,
    isActive: true,
  },

  // Bebidas
  {
    id: '10',
    sku: 'BEB-01',
    name: 'Coca-Cola Zero 400ml',
    description: 'Refrescante gaseosa helada en botella de vidrio servida con vaso con hielo y rodaja de limón',
    categoryId: '4',
    price: 6000,
    cost: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    tags: ['🥤 Helada'],
    rating: 4.5,
    calories: '0 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '11',
    sku: 'BEB-02',
    name: 'Jugo Natural Mango & Maracuyá',
    description: 'Jugo 100% frutal preparado al instante en agua o leche de almendras 500ml',
    categoryId: '4',
    price: 8500,
    cost: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
    tags: ['🥭 100% Natural', '🍊 Fruta Fresca'],
    rating: 4.9,
    calories: '140 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '12',
    sku: 'BEB-03',
    name: 'Cerveza Artesanal IPA 330ml',
    description: 'Cerveza de la casa estilo India Pale Ale con intensas notas de lúpulo cítrico y herbal',
    categoryId: '4',
    price: 14000,
    cost: 5500,
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-cold-beer-into-a-glass-42901-large.mp4',
    tags: ['🍺 Artesanal', '⚡ Lúpulo Cítrico'],
    rating: 4.9,
    calories: '210 kcal',
    isAvailable: true,
    isActive: true,
  },

  // Postres
  {
    id: '13',
    sku: 'POS-01',
    name: 'Brownie Fudge de Chocolate con Helado',
    description: 'Brownie tibio recién horneado de chocolate semiamargo 70%, servido con una bola de helado artesanal de vainilla',
    categoryId: '5',
    price: 15000,
    cost: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    tags: ['🍫 Chocolate 70%', '🍦 Helado Artesanal'],
    rating: 5.0,
    calories: '540 kcal',
    isAvailable: true,
    isActive: true,
  },
  {
    id: '14',
    sku: 'POS-02',
    name: 'Cheesecake de Frutos Rojos',
    description: 'Tarta de queso crema suave estilo New York con cubierta casera de moras silvestres y arándanos',
    categoryId: '5',
    price: 16000,
    cost: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
    tags: ['🍓 Frutos Rojos', '🍰 Suave & Cremoso'],
    rating: 4.9,
    calories: '480 kcal',
    isAvailable: true,
    isActive: true,
  }
];

export const mockTables: Table[] = [
  { id: '1', number: 1, capacity: 2, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz' },
  { id: '2', number: 2, capacity: 4, location: 'Salón', status: 'OCUPADA', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz', currentOrderId: '1024', timeOccupied: Date.now() - 2400000 },
  { id: '3', number: 3, capacity: 4, location: 'Salón', status: 'PEDIDO_LISTO', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz', currentOrderId: '1025', timeOccupied: Date.now() - 1800000 },
  { id: '4', number: 4, capacity: 6, location: 'Salón', status: 'RESERVADA', currentWaiterId: '2', currentWaiterName: 'Carlos Ruiz' },
  { id: '5', number: 5, capacity: 2, location: 'Salón', status: 'OCUPADA', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez', currentOrderId: '1026', timeOccupied: Date.now() - 900000 },
  { id: '6', number: 6, capacity: 8, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez' },
  { id: '7', number: 7, capacity: 4, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez' },
  { id: '8', number: 8, capacity: 4, location: 'Salón', status: 'OCUPADA', currentWaiterId: '7', currentWaiterName: 'Andrés Ramírez', currentOrderId: '1028', timeOccupied: Date.now() - 1200000 },
  { id: '9', number: 9, capacity: 2, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
  { id: '10', number: 10, capacity: 6, location: 'Salón', status: 'RESERVADA', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
  { id: '11', number: 11, capacity: 8, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
  { id: '12', number: 12, capacity: 10, location: 'Salón', status: 'OCUPADA', currentWaiterId: '8', currentWaiterName: 'Sofía López', currentOrderId: '1029', timeOccupied: Date.now() - 3000000 },
  { id: '13', number: 13, capacity: 4, location: 'Salón', status: 'DISPONIBLE', currentWaiterId: '8', currentWaiterName: 'Sofía López' },
];

export const mockOrders: Order[] = [
  {
    id: '1024',
    orderNumber: '1024',
    createdAt: Date.now() - 2400000,
    tableId: '2',
    waiterId: '2',
    waiterName: 'Carlos Ruiz',
    status: 'EN_PREPARACION',
    type: 'MESA',
    items: [
      {
        id: 'i1',
        productId: '2',
        productName: 'Hamburguesa BBQ Smoked',
        quantity: 2,
        unitPrice: 27000,
        totalPrice: 54000,
        modifiers: []
      },
      {
        id: 'i2',
        productId: '8',
        productName: 'Papas Rústicas a la Francesa',
        quantity: 2,
        unitPrice: 10000,
        totalPrice: 20000,
        modifiers: []
      },
      {
        id: 'i3',
        productId: '10',
        productName: 'Coca-Cola Zero 400ml',
        quantity: 2,
        unitPrice: 6000,
        totalPrice: 12000,
        modifiers: []
      }
    ],
    subtotal: 86000,
    discount: 0,
    tax: 0,
    total: 86000
  },
  {
    id: '1025',
    orderNumber: '1025',
    createdAt: Date.now() - 1800000,
    tableId: '3',
    waiterId: '2',
    waiterName: 'Carlos Ruiz',
    status: 'LISTO',
    type: 'MESA',
    items: [
      {
        id: 'i4',
        productId: '5',
        productName: 'Pizza Pepperoni Suprema',
        quantity: 1,
        unitPrice: 38000,
        totalPrice: 38000,
        modifiers: []
      },
      {
        id: 'i5',
        productId: '12',
        productName: 'Cerveza Artesanal IPA 330ml',
        quantity: 2,
        unitPrice: 14000,
        totalPrice: 28000,
        modifiers: []
      }
    ],
    subtotal: 66000,
    discount: 0,
    tax: 0,
    total: 66000
  },
  {
    id: '1026',
    orderNumber: '1026',
    createdAt: Date.now() - 900000,
    tableId: '5',
    waiterId: '7',
    waiterName: 'Andrés Ramírez',
    status: 'EN_COCINA',
    type: 'MESA',
    items: [
      {
        id: 'i6',
        productId: '3',
        productName: 'Hamburguesa Doble Trufa',
        quantity: 1,
        unitPrice: 34000,
        totalPrice: 34000,
        modifiers: []
      },
      {
        id: 'i7',
        productId: '11',
        productName: 'Jugo Natural de Mango y Maracuyá',
        quantity: 1,
        unitPrice: 8500,
        totalPrice: 8500,
        modifiers: []
      }
    ],
    subtotal: 42500,
    discount: 0,
    tax: 0,
    total: 42500
  },
  {
    id: '1027',
    orderNumber: '1027',
    createdAt: Date.now() - 3600000,
    status: 'PAGADO',
    type: 'PARA_LLEVAR',
    paymentMethod: 'TARJETA',
    items: [
      {
        id: 'i8',
        productId: '1',
        productName: 'Hamburguesa Clásica',
        quantity: 1,
        unitPrice: 22000,
        totalPrice: 22000,
        modifiers: [{ modifierGroupId: 'm1', modifierOptionId: 'o2', name: 'Tocineta Crocante', price: 4500 }]
      },
      {
        id: 'i9',
        productId: '13',
        productName: 'Brownie de Chocolate con Helado',
        quantity: 1,
        unitPrice: 15000,
        totalPrice: 15000,
        modifiers: []
      }
    ],
    subtotal: 41500,
    discount: 0,
    tax: 0,
    total: 41500
  }
];

// INVENTARIO
export const mockInventory: InventoryItem[] = [
  { id: '1', code: 'INS-01', name: 'Carne de Res Molida (Angus)', category: 'Carnes', unit: 'Kg', currentStock: 32.5, minStock: 15, maxStock: 60, unitCost: 28000, isActive: true },
  { id: '2', code: 'INS-02', name: 'Pan Hamburguesa Brioche', category: 'Panadería', unit: 'Unidad', currentStock: 140, minStock: 50, maxStock: 250, unitCost: 1200, isActive: true },
  { id: '3', code: 'INS-03', name: 'Queso Cheddar Tajado', category: 'Lácteos', unit: 'Paquete', currentStock: 6, minStock: 10, maxStock: 30, unitCost: 15000, isActive: true }, // Stock bajo
  { id: '4', code: 'INS-04', name: 'Queso Mozzarella de Búfala', category: 'Lácteos', unit: 'Kg', currentStock: 12.0, minStock: 8, maxStock: 30, unitCost: 32000, isActive: true },
  { id: '5', code: 'INS-05', name: 'Masa de Pizza Precocida', category: 'Panadería', unit: 'Unidad', currentStock: 45, minStock: 20, maxStock: 100, unitCost: 3500, isActive: true },
  { id: '6', code: 'INS-06', name: 'Pepperoni Italiano Tajado', category: 'Embutidos', unit: 'Kg', currentStock: 4.2, minStock: 5, maxStock: 20, unitCost: 45000, isActive: true }, // Stock bajo
  { id: '7', code: 'INS-07', name: 'Papas Criollas para Freír', category: 'Verduras', unit: 'Kg', currentStock: 50.0, minStock: 20, maxStock: 100, unitCost: 4000, isActive: true },
  { id: '8', code: 'INS-08', name: 'Salsa BBQ Ahumada', category: 'Salsas', unit: 'Litro', currentStock: 8.5, minStock: 4, maxStock: 20, unitCost: 12000, isActive: true },
  { id: '9', code: 'INS-09', name: 'Coca-Cola Zero 400ml', category: 'Bebidas', unit: 'Unidad', currentStock: 18, minStock: 48, maxStock: 200, unitCost: 2200, isActive: true }, // Stock crítico
  { id: '10', code: 'INS-10', name: 'Huevos Tipo AA de Campo', category: 'Huevos & Granja', unit: 'Unidad', currentStock: 80, minStock: 30, maxStock: 180, unitCost: 750, isActive: true },
  { id: '11', code: 'INS-11', name: 'Tocineta Ahumada en Tiras', category: 'Carnes', unit: 'Kg', currentStock: 9.5, minStock: 4, maxStock: 25, unitCost: 32000, isActive: true },
  { id: '12', code: 'INS-12', name: 'Jugo Natural Mango & Maracuyá', category: 'Bebidas', unit: 'Unidad', currentStock: 35, minStock: 10, maxStock: 60, unitCost: 2800, isActive: true },
  { id: '13', code: 'INS-13', name: 'Cerveza Artesanal IPA 330ml', category: 'Bebidas', unit: 'Unidad', currentStock: 24, minStock: 12, maxStock: 72, unitCost: 4500, isActive: true },
  { id: '14', code: 'INS-14', name: 'Brownie Fudge de Chocolate con Helado', category: 'Postres', unit: 'Unidad', currentStock: 15, minStock: 5, maxStock: 40, unitCost: 3500, isActive: true },
  { id: '15', code: 'INS-15', name: 'Cheesecake de Frutos Rojos', category: 'Postres', unit: 'Unidad', currentStock: 12, minStock: 4, maxStock: 30, unitCost: 4000, isActive: true },
  { id: '16', code: 'INS-16', name: 'Aros de Cebolla para Freír', category: 'Verduras', unit: 'Kg', currentStock: 15.0, minStock: 5, maxStock: 30, unitCost: 8000, isActive: true },
];

export const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Distribuidora Carnes Premium S.A.S', nit: '900.123.456-7', phone: '3001234567', email: 'ventas@carnespremium.com', address: 'Calle 10 # 20-30, Medellín', isActive: true },
  { id: '2', name: 'Panadería Artesanal El Buen Trigo', nit: '901.987.654-3', phone: '3109876543', email: 'pedidos@elbuentrigo.com', address: 'Cra 15 # 45-60, Envigado', isActive: true },
  { id: '3', name: 'Lácteos & Quesos del Valle', nit: '890.334.120-1', phone: '3187766554', email: 'contacto@lacteosvalle.com', address: 'Calle 50 # 12-88, Itagüí', isActive: true },
  { id: '4', name: 'Distribuidora Central de Bebidas', nit: '900.555.777-9', phone: '3014433221', email: 'ventas@centralbebidas.com', address: 'Av. Las Vegas # 10-10', isActive: true }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1', supplierId: '1', date: Date.now() - 86400000 * 3, status: 'RECIBIDA', total: 910000, items: [
      { itemId: '1', quantity: 25, unitCost: 28000 },
      { itemId: '6', quantity: 4, unitCost: 45000 }
    ]
  },
  {
    id: '2', supplierId: '2', date: Date.now() - 86400000, status: 'RECIBIDA', total: 168000, items: [
      { itemId: '2', quantity: 140, unitCost: 1200 }
    ]
  },
  {
    id: '3', supplierId: '4', date: Date.now(), status: 'ENVIADA', total: 264000, items: [
      { itemId: '9', quantity: 120, unitCost: 2200 }
    ]
  }
];

export const mockCashRegisters: CashRegister[] = [
  { id: '1', name: 'Caja Principal (POS)', openedBy: '3', openedAt: Date.now() - 28800000, initialAmount: 200000, currentAmount: 1125000, isOpen: true }
];

export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Andrés López',
    documentId: '1020456789',
    documentType: 'CC',
    phone: '3201234567',
    address: 'Calle 45 # 10-20, Apto 501',
    city: 'Medellín',
    email: 'andres.lopez@gmail.com',
    loyaltyPoints: 240,
    totalOrders: 8,
    totalSpent: 420000,
    averageTicket: 52500,
    tier: 'ORO',
    preferences: 'Hamburguesa Doble Trufa con extra tocineta crocante',
    allergies: [],
    notes: 'Cliente habitual de los viernes por la noche. Prefiere mesa cerca al ventanal del salón.',
    lastVisit: Date.now() - 86400000 * 2,
    createdAt: Date.now() - 86400000 * 90,
    isActive: true
  },
  {
    id: '2',
    name: 'María Camila Gómez',
    documentId: '1035678901',
    documentType: 'CC',
    phone: '3159876543',
    address: 'Cra 12 # 80-15, Poblado',
    city: 'Medellín',
    email: 'm.gomez@hotmail.com',
    loyaltyPoints: 510,
    totalOrders: 15,
    totalSpent: 890000,
    averageTicket: 59333,
    tier: 'DIAMANTE',
    preferences: 'Pizza Margarita con aceite de oliva extra y vino tinto',
    allergies: ['Frutos Secos'],
    notes: 'Socia de club gastronómico. Siempre solicita factura electrónica a su NIT de empresa.',
    lastVisit: Date.now() - 86400000,
    createdAt: Date.now() - 86400000 * 180,
    isActive: true
  },
  {
    id: '3',
    name: 'Felipe Mendoza',
    documentId: '71234567',
    documentType: 'CC',
    phone: '3004445566',
    address: 'Calle 33 # 75-12, Laureles',
    city: 'Medellín',
    email: 'felipe.mendoza@yahoo.com',
    loyaltyPoints: 80,
    totalOrders: 3,
    totalSpent: 165000,
    averageTicket: 55000,
    tier: 'BRONCE',
    preferences: 'Hamburguesa BBQ Smoked y Papas Rústicas',
    allergies: [],
    notes: 'Pide principalmente a domicilio para ver partidos de fútbol.',
    lastVisit: Date.now() - 86400000 * 7,
    createdAt: Date.now() - 86400000 * 30,
    isActive: true
  },
  {
    id: '4',
    name: 'Valentina Ospina',
    documentId: '1152438902',
    documentType: 'CC',
    phone: '3128889900',
    address: 'Transversal 39 # 1-50',
    city: 'Envigado',
    email: 'valen.ospina@gmail.com',
    loyaltyPoints: 320,
    totalOrders: 10,
    totalSpent: 560000,
    averageTicket: 56000,
    tier: 'PLATA',
    preferences: 'Pizza Cuatro Quesos y postres artesanales',
    allergies: ['Mariscos'],
    notes: 'Celebra cumpleaños familiares en el salón principal.',
    lastVisit: Date.now() - 86400000 * 4,
    createdAt: Date.now() - 86400000 * 120,
    isActive: true
  },
  {
    id: '5',
    name: 'Inversiones & Consultorías S.A.S',
    documentId: '901234567-1',
    documentType: 'NIT',
    phone: '3015556677',
    address: 'Av. El Poblado # 5A-110, Of. 802',
    city: 'Medellín',
    email: 'facturacion@inversionescorp.co',
    loyaltyPoints: 680,
    totalOrders: 12,
    totalSpent: 1450000,
    averageTicket: 120833,
    tier: 'DIAMANTE',
    preferences: 'Almuerzos ejecutivos corporativos y combos grupales',
    allergies: [],
    notes: 'Cuenta corporativa. Requiere factura electrónica detallada con orden de compra.',
    lastVisit: Date.now() - 86400000 * 3,
    createdAt: Date.now() - 86400000 * 200,
    isActive: true
  }
];

export const mockDeliveries: DeliveryOrder[] = [
  {
    id: '2050',
    orderNumber: 'DOM-2050',
    createdAt: Date.now() - 1200000,
    status: 'EN_CAMINO',
    type: 'DOMICILIO',
    items: [
      { id: 'i10', productId: '1', productName: 'Hamburguesa Clásica', quantity: 2, unitPrice: 22000, totalPrice: 44000, modifiers: [] },
      { id: 'i11', productId: '8', productName: 'Papas Rústicas a la Francesa', quantity: 1, unitPrice: 10000, totalPrice: 10000, modifiers: [] }
    ],
    subtotal: 54000,
    discount: 0,
    tax: 0,
    total: 59000, // Includes 5000 fee
    deliveryFee: 5000,
    customer: mockCustomers[0],
    deliveryAddress: 'Calle 45 # 10-20, Apto 501',
    deliveryCity: 'Medellín',
    deliveryZone: 'Laureles',
    deliveryStatus: 'EN_CAMINO',
    deliveryRiderId: '9',
    deliveryRiderName: 'Kevin Morales',
    deliveryRiderPhone: '+57 314 555 6677',
    paymentMethod: 'EFECTIVO',
    cashAmountPaidWith: 70000, // Cambio: $11.000
    deliveryNotes: 'Portería Torre 2, citófono 501. Llevar cambio de $70.000.',
    dispatchedAt: Date.now() - 600000,
    estimatedDeliveryTime: Date.now() + 600000
  },
  {
    id: '2051',
    orderNumber: 'DOM-2051',
    createdAt: Date.now() - 600000,
    status: 'PENDIENTE',
    type: 'DOMICILIO',
    items: [
      { id: 'i12', productId: '5', productName: 'Pizza Pepperoni Suprema', quantity: 1, unitPrice: 38000, totalPrice: 38000, modifiers: [] },
      { id: 'i13', productId: '9', productName: 'Coca-Cola Zero 400ml', quantity: 2, unitPrice: 6000, totalPrice: 12000, modifiers: [] }
    ],
    subtotal: 50000,
    discount: 0,
    tax: 0,
    total: 56000,
    deliveryFee: 6000,
    customer: mockCustomers[1],
    deliveryAddress: 'Cra 12 # 80-15, Poblado',
    deliveryCity: 'Medellín',
    deliveryZone: 'El Poblado',
    deliveryStatus: 'PENDIENTE',
    deliveryRiderId: undefined,
    paymentMethod: 'DATAFONO',
    deliveryNotes: 'Casa esquinera con portón negro. Llevar datáfono inalámbrico.',
    estimatedDeliveryTime: Date.now() + 2400000
  },
  {
    id: '2052',
    orderNumber: 'DOM-2052',
    createdAt: Date.now() - 900000,
    status: 'EN_PREPARACION',
    type: 'DOMICILIO',
    items: [
      { id: 'i14', productId: '2', productName: 'Hamburguesa BBQ Smoked', quantity: 2, unitPrice: 27000, totalPrice: 54000, modifiers: [] },
      { id: 'i15', productId: '8', productName: 'Papas Rústicas a la Francesa', quantity: 2, unitPrice: 10000, totalPrice: 20000, modifiers: [] }
    ],
    subtotal: 74000,
    discount: 0,
    tax: 0,
    total: 79000,
    deliveryFee: 5000,
    customer: mockCustomers[2],
    deliveryAddress: 'Calle 33 # 75-12, Laureles',
    deliveryCity: 'Medellín',
    deliveryZone: 'Laureles',
    deliveryStatus: 'EN_PREPARACION',
    deliveryRiderId: '9',
    deliveryRiderName: 'Kevin Morales',
    deliveryRiderPhone: '+57 314 555 6677',
    paymentMethod: 'TRANSFERENCIA',
    deliveryNotes: 'Transferencia por Nequi confirmada antes de despachar.',
    estimatedDeliveryTime: Date.now() + 1800000
  },
  {
    id: '2053',
    orderNumber: 'DOM-2053',
    createdAt: Date.now() - 7200000,
    status: 'ENTREGADO',
    type: 'DOMICILIO',
    items: [
      { id: 'i16', productId: '7', productName: 'Pizza Cuatro Quesos', quantity: 1, unitPrice: 42000, totalPrice: 42000, modifiers: [] }
    ],
    subtotal: 42000,
    discount: 0,
    tax: 0,
    total: 47000,
    deliveryFee: 5000,
    customer: mockCustomers[3],
    deliveryAddress: 'Transversal 39 # 1-50, Envigado',
    deliveryCity: 'Envigado',
    deliveryZone: 'Envigado',
    deliveryStatus: 'ENTREGADO',
    deliveryRiderId: '9',
    deliveryRiderName: 'Kevin Morales',
    paymentMethod: 'TRANSFERENCIA',
    deliveryNotes: 'Entregado en recepción sin novedades.',
    dispatchedAt: Date.now() - 5400000,
    deliveredAt: Date.now() - 3600000
  }
];

export const mockSettings: StoreSettings = {
  storeName: 'Sésamo Alimentos & Bebidas',
  nit: '901.458.732-1',
  currency: 'COP',
  taxType: 'EXENTO',
  taxRate: 0,
  defaultTipPercentage: 10,
  address: 'Calle 10 # 40-20, El Poblado, Medellín',
  phone: '+57 (604) 444 8899',
  ticketFooter: '¡Gracias por disfrutar en Sésamo! Vuelve pronto.',
  autoPrintReceipt: false,
  logoUrl: ''
};

// RESERVAS Y RECETAS
export const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    customerName: 'Carlos Ruiz',
    customerPhone: '3001112233',
    customerEmail: 'carlos.ruiz@gmail.com',
    customerId: '1',
    date: Date.now() + 7200000, // Hoy en 2 horas
    timeSlot: '19:30',
    guestCount: 4,
    tableId: '4',
    tableName: 'Mesa 4 (Salón)',
    status: 'CONFIRMADA',
    occasion: 'CUMPLEAÑOS',
    specialRequests: 'Traen pastel propio. Solicitar velas.',
    notes: 'Cliente puntual. Decoración sencilla reservada.',
    durationMinutes: 120,
    depositAmount: 50000,
    createdAt: Date.now() - 86400000
  },
  {
    id: 'res-2',
    customerName: 'Laura Vega',
    customerPhone: '3109998877',
    customerEmail: 'laura.vega@outlook.com',
    date: Date.now() + 14400000, // Hoy en 4 horas
    timeSlot: '21:00',
    guestCount: 2,
    tableId: '1',
    tableName: 'Mesa 1 (Salón)',
    status: 'PENDIENTE',
    occasion: 'ANIVERSARIO',
    specialRequests: 'Mesa tranquila junto al ventanal del salón.',
    notes: 'Pendiente confirmar por WhatsApp el anticipo.',
    durationMinutes: 90,
    depositAmount: 0,
    createdAt: Date.now() - 43200000
  },
  {
    id: 'res-3',
    customerName: 'Empresa TechMed S.A.S',
    customerPhone: '3015556677',
    customerEmail: 'eventos@techmed.co',
    customerId: '5',
    date: Date.now() + 86400000, // Mañana
    timeSlot: '13:00',
    guestCount: 8,
    tableId: '6',
    tableName: 'Mesa 6 (Salón)',
    status: 'CONFIRMADA',
    occasion: 'REUNION_NEGOCIOS',
    specialRequests: 'Almuerzo ejecutivo. Factura electrónica requerida con NIT.',
    notes: 'Abonaron $100.000 de anticipo.',
    durationMinutes: 150,
    depositAmount: 100000,
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'res-4',
    customerName: 'Valentina Ospina',
    customerPhone: '3128889900',
    customerEmail: 'valen.ospina@gmail.com',
    customerId: '4',
    date: Date.now() + 86400000 * 2, // En 2 días
    timeSlot: '20:00',
    guestCount: 6,
    tableId: '10',
    tableName: 'Mesa 10 (Salón)',
    status: 'CONFIRMADA',
    occasion: 'CENA_FAMILIAR',
    specialRequests: 'Una silla para bebé / infante requerida.',
    notes: 'Familia frecuente del restaurante.',
    durationMinutes: 120,
    depositAmount: 60000,
    createdAt: Date.now() - 86400000
  },
  {
    id: 'res-5',
    customerName: 'Daniel Arango',
    customerPhone: '3008887766',
    customerEmail: 'daniel.arango@gmail.com',
    date: Date.now() - 3600000 * 4, // Hoy hace unas horas
    timeSlot: '14:00',
    guestCount: 4,
    tableId: '2',
    tableName: 'Mesa 2 (Salón)',
    status: 'COMPLETADA',
    occasion: 'OTRO',
    specialRequests: 'Consumo de almuerzo ejecutado.',
    notes: 'Servicio finalizado con éxito.',
    durationMinutes: 90,
    depositAmount: 0,
    createdAt: Date.now() - 86400000 * 3
  }
];

export const mockRecipes: Recipe[] = [
  { 
    id: 'rec-1',
    productId: '1', // Hamburguesa Clásica
    productName: 'Hamburguesa Clásica',
    category: 'Hamburguesas',
    ingredients: [
      { inventoryItemId: '1', quantity: 0.15, unit: 'Kg', notes: 'Carne Angus 80/20 molida fresca' }, // 150g carne ($4.200)
      { inventoryItemId: '2', quantity: 1, unit: 'Unidad', notes: 'Pan brioche artesanal sellado' }, // 1 pan ($1.200)
      { inventoryItemId: '3', quantity: 0.1, unit: 'Paquete', notes: '2 lonchas de cheddar fundido' } // ~$1.500
    ],
    preparationTimeMinutes: 12,
    portions: 1,
    wasteMarginPercentage: 5,
    packagingCost: 600,
    allergens: ['Gluten', 'Lácteos'],
    station: 'PARRILLA',
    difficulty: 'FÁCIL',
    chefNotes: 'Temperatura de plancha recomendada: 200°C. Sellar 3 min por cada lado para término 3/4 jugoso.',
    preparationInstructions: '1. Colocar el medallón de carne Angus sobre la plancha bien caliente y presionar ligeramente.\n2. Salpimentar al momento. Voltear a los 3 minutos.\n3. Colocar queso cheddar encima para fundir con campana de vapor.\n4. Tostar pan brioche con un toque de mantequilla.\n5. Montar con lechuga, tomate fresco y salsa tártara de la casa.',
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    id: 'rec-2',
    productId: '2', // Hamburguesa BBQ Smoked
    productName: 'Hamburguesa BBQ Smoked',
    category: 'Hamburguesas',
    ingredients: [
      { inventoryItemId: '1', quantity: 0.18, unit: 'Kg', notes: 'Carne Angus gruesa 180g' }, // 180g carne ($5.040)
      { inventoryItemId: '2', quantity: 1, unit: 'Unidad', notes: 'Pan brioche con ajonjolí' }, // 1 pan ($1.200)
      { inventoryItemId: '3', quantity: 0.1, unit: 'Paquete', notes: 'Cheddar americano' }, // ~$1.500
      { inventoryItemId: '8', quantity: 0.05, unit: 'Litro', notes: 'Salsa BBQ ahumada artesanal' } // 50ml ($600)
    ],
    preparationTimeMinutes: 15,
    portions: 1,
    wasteMarginPercentage: 6,
    packagingCost: 700,
    allergens: ['Gluten', 'Lácteos'],
    station: 'PARRILLA',
    difficulty: 'MEDIA',
    chefNotes: 'Ahumado con madera de manzano. Caramelizar la salsa BBQ al final de la cocción.',
    preparationInstructions: '1. Asar carne a la parrilla sobre carbón y chips de leña a fuego medio-alto.\n2. Barnizar con salsa BBQ durante el último minuto para caramelizar.\n3. Montar queso cheddar fundido y tocineta ahumada crujiente.\n4. Servir sobre pan brioche caliente.',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-3',
    productId: '5', // Pizza Pepperoni Suprema
    productName: 'Pizza Pepperoni Suprema',
    category: 'Pizzas',
    ingredients: [
      { inventoryItemId: '5', quantity: 1, unit: 'Unidad', notes: 'Masa precocida masa madre 30cm' }, // $3.500
      { inventoryItemId: '4', quantity: 0.20, unit: 'Kg', notes: 'Mozzarella de búfala rallada' }, // 200g ($6.400)
      { inventoryItemId: '6', quantity: 0.10, unit: 'Kg', notes: 'Pepperoni italiano madurado' } // 100g ($4.500)
    ],
    preparationTimeMinutes: 10,
    portions: 1,
    wasteMarginPercentage: 4,
    packagingCost: 1400,
    allergens: ['Gluten', 'Lácteos'],
    station: 'HORNO',
    difficulty: 'MEDIA',
    chefNotes: 'Piso de horno a 350°C. Girar la pizza a los 3 minutos para dorar uniforme.',
    preparationInstructions: '1. Extender 80ml de salsa napolitana casera sobre la masa madre dejando 1cm de borde.\n2. Distribuir 200g de mozzarella de búfala de manera homogénea.\n3. Colocar 100g de rodajas de pepperoni en círculos concéntricos.\n4. Introducir al horno de piedra a 350°C durante 6-7 minutos hasta que los bordes estén dorados y crocantes.',
    updatedAt: Date.now() - 86400000 * 3
  },
  {
    id: 'rec-4',
    productId: '6', // Pizza Margarita Italiana
    productName: 'Pizza Margarita Italiana',
    category: 'Pizzas',
    ingredients: [
      { inventoryItemId: '5', quantity: 1, unit: 'Unidad', notes: 'Masa precocida 30cm' }, // $3.500
      { inventoryItemId: '4', quantity: 0.22, unit: 'Kg', notes: 'Mozzarella fior di latte' } // 220g ($7.040)
    ],
    preparationTimeMinutes: 8,
    portions: 1,
    wasteMarginPercentage: 3,
    packagingCost: 1400,
    allergens: ['Gluten', 'Lácteos'],
    station: 'HORNO',
    difficulty: 'FÁCIL',
    chefNotes: 'Añadir la albahaca fresca inmediatamente al salir del horno para preservar aceites aromáticos.',
    preparationInstructions: '1. Base de masa con salsa de tomates San Marzano triturados y toque de sal.\n2. Cubrir con mozzarella fior di latte cortada en dados.\n3. Hornear a 350°C durante 6 minutos.\n4. Al salir, rociar aceite de oliva virgen extra y coronar con hojas frescas de albahaca.',
    updatedAt: Date.now() - 86400000 * 4
  },
  {
    id: 'rec-5',
    productId: '8', // Papas Rústicas a la Francesa
    productName: 'Papas Rústicas a la Francesa',
    category: 'Acompañamientos',
    ingredients: [
      { inventoryItemId: '7', quantity: 0.35, unit: 'Kg', notes: 'Papa criolla seleccionada corte grueso' } // 350g ($1.400)
    ],
    preparationTimeMinutes: 7,
    portions: 1,
    wasteMarginPercentage: 8,
    packagingCost: 400,
    allergens: [],
    station: 'COCINA',
    difficulty: 'FÁCIL',
    chefNotes: 'Doble fritura: primera a 140°C para cocer interior, segunda a 180°C para piel ultra crocante.',
    preparationInstructions: '1. Blanquear las papas rústicas en agua con sal marina.\n2. Fritura inicial a 140°C por 3 minutos.\n3. Fritura final a 180°C por 2 minutos hasta color dorado intenso.\n4. Espolvorear sal marina, ajo tostado picado y hojas de romero fresco.',
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    id: 'rec-6',
    productId: '3', // Hamburguesa Doble Trufa
    productName: 'Hamburguesa Doble Trufa',
    category: 'Hamburguesas',
    ingredients: [
      { inventoryItemId: '1', quantity: 0.30, unit: 'Kg', notes: 'Doble medallón Angus' },
      { inventoryItemId: '2', quantity: 1, unit: 'Unidad', notes: 'Pan brioche' },
      { inventoryItemId: '3', quantity: 0.1, unit: 'Paquete', notes: 'Cheddar fundido' },
    ],
    preparationTimeMinutes: 14,
    portions: 1,
    wasteMarginPercentage: 5,
    packagingCost: 700,
    allergens: ['Gluten', 'Lácteos'],
    station: 'PARRILLA',
    difficulty: 'MEDIA',
    chefNotes: 'Sellar ambos medallones a término 3/4 jugoso.',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-7',
    productId: '4', // Hamburguesa Veggie Portobello
    productName: 'Hamburguesa Veggie Portobello',
    category: 'Hamburguesas',
    ingredients: [
      { inventoryItemId: '2', quantity: 1, unit: 'Unidad', notes: 'Pan brioche artesanal' },
      { inventoryItemId: '3', quantity: 0.1, unit: 'Paquete', notes: 'Queso cheddar' },
    ],
    preparationTimeMinutes: 10,
    portions: 1,
    wasteMarginPercentage: 4,
    packagingCost: 600,
    allergens: ['Gluten', 'Lácteos'],
    station: 'PARRILLA',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-8',
    productId: '7', // Pizza Cuatro Quesos
    productName: 'Pizza Cuatro Quesos',
    category: 'Pizzas',
    ingredients: [
      { inventoryItemId: '5', quantity: 1, unit: 'Unidad', notes: 'Masa precocida 30cm' },
      { inventoryItemId: '4', quantity: 0.20, unit: 'Kg', notes: 'Mozzarella de búfala' },
      { inventoryItemId: '3', quantity: 0.10, unit: 'Paquete', notes: 'Queso cheddar' },
    ],
    preparationTimeMinutes: 9,
    portions: 1,
    wasteMarginPercentage: 4,
    packagingCost: 1400,
    allergens: ['Gluten', 'Lácteos'],
    station: 'HORNO',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-9',
    productId: '9', // Aros de Cebolla Crocantes
    productName: 'Aros de Cebolla Crocantes',
    category: 'Acompañamientos',
    ingredients: [
      { inventoryItemId: '16', quantity: 0.25, unit: 'Kg', notes: 'Aros de cebolla para freír' }
    ],
    preparationTimeMinutes: 6,
    portions: 1,
    wasteMarginPercentage: 5,
    packagingCost: 400,
    allergens: ['Gluten'],
    station: 'COCINA',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-10',
    productId: '10', // Coca-Cola Zero 400ml
    productName: 'Coca-Cola Zero 400ml',
    category: 'Bebidas',
    ingredients: [
      { inventoryItemId: '9', quantity: 1, unit: 'Unidad', notes: 'Botella Coca-Cola Zero 400ml' }
    ],
    preparationTimeMinutes: 1,
    portions: 1,
    wasteMarginPercentage: 0,
    packagingCost: 0,
    allergens: [],
    station: 'BAR',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-11',
    productId: '11', // Jugo Natural Mango & Maracuyá
    productName: 'Jugo Natural Mango & Maracuyá',
    category: 'Bebidas',
    ingredients: [
      { inventoryItemId: '12', quantity: 1, unit: 'Unidad', notes: 'Porción pulpa / botella preparada' }
    ],
    preparationTimeMinutes: 3,
    portions: 1,
    wasteMarginPercentage: 0,
    packagingCost: 200,
    allergens: [],
    station: 'BAR',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-12',
    productId: '12', // Cerveza Artesanal IPA 330ml
    productName: 'Cerveza Artesanal IPA 330ml',
    category: 'Bebidas',
    ingredients: [
      { inventoryItemId: '13', quantity: 1, unit: 'Unidad', notes: 'Botella fría 330ml' }
    ],
    preparationTimeMinutes: 1,
    portions: 1,
    wasteMarginPercentage: 0,
    packagingCost: 0,
    allergens: ['Gluten'],
    station: 'BAR',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-13',
    productId: '13', // Brownie Fudge de Chocolate con Helado
    productName: 'Brownie Fudge de Chocolate con Helado',
    category: 'Postres',
    ingredients: [
      { inventoryItemId: '14', quantity: 1, unit: 'Unidad', notes: 'Porción brownie con helado' }
    ],
    preparationTimeMinutes: 4,
    portions: 1,
    wasteMarginPercentage: 2,
    packagingCost: 400,
    allergens: ['Gluten', 'Lácteos', 'Huevo'],
    station: 'COCINA',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'rec-14',
    productId: '14', // Cheesecake de Frutos Rojos
    productName: 'Cheesecake de Frutos Rojos',
    category: 'Postres',
    ingredients: [
      { inventoryItemId: '15', quantity: 1, unit: 'Unidad', notes: 'Porción cheesecake' }
    ],
    preparationTimeMinutes: 2,
    portions: 1,
    wasteMarginPercentage: 2,
    packagingCost: 400,
    allergens: ['Gluten', 'Lácteos'],
    station: 'COCINA',
    difficulty: 'FÁCIL',
    updatedAt: Date.now() - 86400000
  }
];
