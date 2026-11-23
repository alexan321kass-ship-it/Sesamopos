import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  Chip,
  Button,
  Stack,
  LinearProgress,
  Divider,
  Tab,
  Tabs,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  TableRestaurant as TableIcon,
  LocalShipping as DeliveryIcon,
  Kitchen as KitchenIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  PointOfSale as PosIcon,
  ShoppingBag as CartIcon,
  Restaurant as RestaurantIcon,
  PieChart as PieIcon,
  Inventory2 as InventoryIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { mockApi } from '../services/mockApi';
import { subscribeRealtimeEvents } from '../services/eventBus';
import {
  Order,
  Table,
  InventoryItem,
  DeliveryOrder,
  Reservation,
  StaffMember,
  Product,
  Recipe,
  CashRegister,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { parseDateOrTimestamp, getColombiaHour } from '../utils/timeUtils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (user && !['ADMINISTRADOR', 'GERENTE'].includes(user.role)) {
    if (user.role === 'COCINA') return <Navigate to="/kitchen" replace />;
    if (user.role === 'MESERO') return <Navigate to="/tables" replace />;
    if (user.role === 'CAJERO') return <Navigate to="/cash-register" replace />;
    if (user.role === 'REPARTIDOR') return <Navigate to="/delivery" replace />;
    if (user.role === 'INVENTARIO') return <Navigate to="/inventory" replace />;
  }

  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab for active operations command center
  const [operationsTab, setOperationsTab] = useState<number>(0);

  const loadData = async () => {
    try {
      const [ordList, tblList, invList, delList, resList, stfList, prdList, recList, cashData] = await Promise.all([
        mockApi.orders.getAll(),
        mockApi.tables.getAll(),
        mockApi.inventory.getAll(),
        mockApi.deliveries.getAll(),
        mockApi.reservations.getAll(),
        mockApi.staff.getAll(),
        mockApi.products.getAll(),
        mockApi.recipes.getAll(),
        mockApi.cash.getCurrentRegister().catch(() => undefined),
      ]);

      setOrders(ordList || []);
      setTables(tblList || []);
      setInventory(invList || []);
      setDeliveries(delList || []);
      setReservations(resList || []);
      setStaff(stfList || []);
      setProducts(prdList || []);
      setRecipes(recList || []);
      setCashRegister(cashData || null);
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeRealtimeEvents((type) => {
      if (
        type === 'sesamo_tables_updated' ||
        type === 'sesamo_order_created' ||
        type === 'sesamo_order_updated' ||
        type === 'sesamo_orders_updated' ||
        type === 'sesamo_cash_updated' ||
        type === 'sesamo_inventory_updated' ||
        type === 'sesamo_deliveries_updated' ||
        type === 'sesamo_reservations_updated' ||
        type === 'sesamo_staff_updated'
      ) {
        loadData();
      }
    });

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_tables_updated', handleUpdate);
    window.addEventListener('sesamo_order_created', handleUpdate);
    window.addEventListener('sesamo_order_updated', handleUpdate);
    window.addEventListener('sesamo_orders_updated', handleUpdate);
    window.addEventListener('sesamo_cash_updated', handleUpdate);
    window.addEventListener('sesamo_inventory_updated', handleUpdate);
    window.addEventListener('sesamo_deliveries_updated', handleUpdate);
    window.addEventListener('sesamo_reservations_updated', handleUpdate);
    window.addEventListener('sesamo_staff_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const interval = setInterval(() => loadData(), 3000);

    return () => {
      unsubscribe();
      window.removeEventListener('sesamo_tables_updated', handleUpdate);
      window.removeEventListener('sesamo_order_created', handleUpdate);
      window.removeEventListener('sesamo_order_updated', handleUpdate);
      window.removeEventListener('sesamo_orders_updated', handleUpdate);
      window.removeEventListener('sesamo_cash_updated', handleUpdate);
      window.removeEventListener('sesamo_inventory_updated', handleUpdate);
      window.removeEventListener('sesamo_deliveries_updated', handleUpdate);
      window.removeEventListener('sesamo_reservations_updated', handleUpdate);
      window.removeEventListener('sesamo_staff_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Find active order for a table (En autoservicio, PAGADO sigue activo mientras están en mesa)
  const getActiveOrderForTable = (table: Table): Order | undefined => {
    return orders.find(
      (o) =>
        (o.id === table.currentOrderId ||
          o.orderNumber === table.currentOrderId ||
          o.tableId === table.id ||
          o.tableId === table.number.toString()) &&
        o.status !== 'CANCELADO'
    );
  };

  // Coherent floor plan status config
  const getStatusConfig = (table: Table, activeOrder?: Order) => {
    if (table.status === 'DISPONIBLE' && !activeOrder) {
      return {
        label: 'Disponible',
        bgColor: '#f0fdf4',
        borderColor: '#86efac',
        textColor: '#15803d',
        dotColor: '#22c55e',
      };
    }

    if (table.status === 'PEDIDO_LISTO' || activeOrder?.status === 'LISTO') {
      return {
        label: '¡Listo!',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
        textColor: '#1d4ed8',
        dotColor: '#3b82f6',
      };
    }

    if (activeOrder?.status === 'ENTREGADO') {
      return {
        label: 'Comiendo',
        bgColor: '#faf5ff',
        borderColor: '#d8b4fe',
        textColor: '#7e22ce',
        dotColor: '#a855f7',
      };
    }

    if (table.status === 'OCUPADA' || activeOrder) {
      return {
        label: 'En Cocina',
        bgColor: '#fff7ed',
        borderColor: '#fdba74',
        textColor: '#c2410c',
        dotColor: '#f97316',
      };
    }

    if (table.status === 'RESERVADA') {
      return {
        label: 'Reservada',
        bgColor: '#fefce8',
        borderColor: '#fde047',
        textColor: '#a16207',
        dotColor: '#eab308',
      };
    }

    return {
      label: 'Fuera de Servicio',
      bgColor: '#f8fafc',
      borderColor: '#cbd5e1',
      textColor: '#475569',
      dotColor: '#94a3b8',
    };
  };

  // Table status distribution
  const tableMetrics = useMemo(() => {
    let available = 0;
    let inKitchen = 0;
    let ready = 0;
    let served = 0;
    let reserved = 0;
    let occupiedTotal = 0;

    tables.forEach((table) => {
      const activeOrder = getActiveOrderForTable(table);
      const config = getStatusConfig(table, activeOrder);
      if (config.label === 'Disponible') {
        available++;
      } else if (config.label === '¡Listo!') {
        ready++;
        occupiedTotal++;
      } else if (config.label === 'Comiendo') {
        served++;
        occupiedTotal++;
      } else if (config.label === 'En Cocina') {
        inKitchen++;
        occupiedTotal++;
      } else if (config.label === 'Reservada') {
        reserved++;
      }
    });

    const occupancyRate = tables.length > 0 ? Math.round((occupiedTotal / tables.length) * 100) : 0;

    return {
      available,
      inKitchen,
      ready,
      served,
      reserved,
      occupiedTotal,
      occupancyRate,
    };
  }, [tables, orders]);

  // Dynamic greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // Aggregated Executive KPIs & Food Cost (Sincronizado directamente con la Caja y Turno Activo)
  const kpis = useMemo(() => {
    const isShiftActive = Boolean(cashRegister && cashRegister.isOpen);
    const shiftStart = cashRegister?.openedAt || 0;

    // Solo órdenes efectivamente PAGADAS durante el turno activo (o del día de hoy si la caja está cerrada)
    const paidSalonOrders = orders.filter((o) => {
      if (o.status !== 'PAGADO') return false;
      if (isShiftActive) {
        return (
          o.registerId === cashRegister?.id ||
          (o.paidAt && o.paidAt >= shiftStart) ||
          (!o.paidAt && o.createdAt >= shiftStart)
        );
      }
      const orderDate = new Date(o.paidAt || o.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    });

    const completedDeliveries = deliveries.filter((d) => {
      if (d.status === 'CANCELADO' || d.deliveryStatus === 'CANCELADO') return false;
      const isDeliveredOrPaid = d.deliveryStatus === 'ENTREGADO' || d.status === 'ENTREGADO' || d.status === 'PAGADO';
      if (!isDeliveredOrPaid) return false;
      if (isShiftActive) {
        return (
          (d.deliveredAt && d.deliveredAt >= shiftStart) ||
          (!d.deliveredAt && d.createdAt >= shiftStart)
        );
      }
      const delivDate = new Date(d.deliveredAt || d.createdAt);
      const today = new Date();
      return delivDate.toDateString() === today.toDateString();
    });

    const tableSales = paidSalonOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const deliverySales = completedDeliveries.reduce((sum, d) => sum + (d.total || 0), 0);
    const totalSales = tableSales + deliverySales;
    const totalOrdersCount = paidSalonOrders.length + completedDeliveries.length;
    const avgTicket = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
    const avgSalonTicket = paidSalonOrders.length > 0 ? Math.round(tableSales / paidSalonOrders.length) : 0;
    const avgDeliveryTicket = completedDeliveries.length > 0 ? Math.round(deliverySales / completedDeliveries.length) : 0;

    // Cuentas y mesas en consumo pendientes de cobrar
    const pendingOrders = orders.filter((o) => o.status !== 'PAGADO' && o.status !== 'CANCELADO');
    const pendingVolume = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Fondo inicial de caja y efectivo físico esperado en gaveta
    const initialFloat = isShiftActive ? (cashRegister?.initialAmount || 0) : 0;
    const cashSalonSales = paidSalonOrders.reduce((sum, o) => {
      if (!o.paymentMethod || o.paymentMethod === 'EFECTIVO') return sum + (o.total || 0);
      if (o.paymentMethod === 'MIXTO' && o.mixedPayments) {
        return sum + (o.mixedPayments.find((m) => m.method.toLowerCase().includes('efectivo'))?.amount || 0);
      }
      return sum;
    }, 0);
    const cashDeliverySales = completedDeliveries.reduce((sum, d) => {
      if (!d.paymentMethod || d.paymentMethod === 'EFECTIVO') return sum + (d.total || 0);
      return sum;
    }, 0);
    const totalCashSales = cashSalonSales + cashDeliverySales;
    const expectedCashInDrawer = initialFloat + totalCashSales;

    // Daily Sales Goal (e.g. $3,500,000 COP)
    const dailyGoal = 3500000;
    const goalPercentage = Math.min(100, Math.round((totalSales / dailyGoal) * 100));

    // Calculate theoretical food cost using recipes escandallo
    let totalTheoreticalCost = 0;
    const recipeMap = new Map<string, number>();

    recipes.forEach((rec) => {
      let cost = 0;
      if (rec.ingredients && Array.isArray(rec.ingredients)) {
        rec.ingredients.forEach((ing) => {
          const invItem = inventory.find((i) => i.id === ing.inventoryItemId);
          const unitCost = invItem?.unitCost || 0;
          cost += (ing.quantity || 0) * unitCost;
        });
      }
      recipeMap.set(rec.productId, cost);
    });

    // Sum theoretical cost from order items
    paidSalonOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const itemCost = recipeMap.get(item.productId) || (item.unitPrice ? item.unitPrice * 0.32 : 5000);
        totalTheoreticalCost += itemCost * (item.quantity || 1);
      });
    });

    completedDeliveries.forEach((d) => {
      (d.items || []).forEach((item) => {
        const itemCost = recipeMap.get(item.productId) || (item.unitPrice ? item.unitPrice * 0.32 : 5000);
        totalTheoreticalCost += itemCost * (item.quantity || 1);
      });
    });

    const foodCostPercentage = totalSales > 0 ? Math.round((totalTheoreticalCost / totalSales) * 1000) / 10 : 31.5;
    const grossMargin = totalSales - totalTheoreticalCost;
    const grossMarginPercentage = totalSales > 0 ? Math.round((grossMargin / totalSales) * 100) : 68.5;

    // Critical stock items
    const criticalStock = inventory.filter((i) => i.currentStock <= i.minStock);

    // Today's pending reservations
    const pendingReservations = reservations.filter((r) => r.status === 'PENDIENTE');

    // Total staff on duty
    const staffOnDuty = staff.filter((s) => s.shiftStatus === 'EN_TURNO').length;

    // Delayed kitchen orders (> 18 min)
    const delayedOrders = orders.filter((o) => {
      if (o.status !== 'EN_PREPARACION') return false;
      const wait = (Date.now() - (o.createdAt || Date.now())) / 60000;
      return wait > 18;
    });

    return {
      totalSales,
      tableSales,
      deliverySales,
      dailyGoal,
      goalPercentage,
      totalTheoreticalCost,
      foodCostPercentage,
      grossMargin,
      grossMarginPercentage,
      totalOrdersCount,
      tableOrdersCount: paidSalonOrders.length,
      deliveryOrdersCount: completedDeliveries.length,
      avgTicket,
      avgSalonTicket,
      avgDeliveryTicket,
      pendingVolume,
      pendingOrdersCount: pendingOrders.length,
      initialFloat,
      totalCashSales,
      expectedCashInDrawer,
      occupiedTables: tableMetrics.occupiedTotal,
      reservedTables: tableMetrics.reserved,
      availableTables: tableMetrics.available,
      occupancyRate: tableMetrics.occupancyRate,
      criticalStockCount: criticalStock.length,
      pendingReservationsCount: pendingReservations.length,
      staffOnDuty,
      criticalStockList: criticalStock,
      delayedOrdersCount: delayedOrders.length,
    };
  }, [orders, deliveries, tables, inventory, reservations, staff, tableMetrics, recipes, cashRegister]);

  // Hourly sales distribution dynamically computed according to actual sales hours & shift timing
  const hourlySalesData = useMemo(() => {
    const formatHourLabel = (h: number): string => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12} ${period}`;
    };

    const isShiftActive = Boolean(cashRegister && cashRegister.isOpen);
    const shiftStart = cashRegister?.openedAt || 0;
    const currentHour = getColombiaHour();

    const salesByHour: Record<number, { total: number; pedidos: number; salon: number; domicilios: number }> = {};
    for (let h = 0; h < 24; h++) {
      salesByHour[h] = { total: 0, pedidos: 0, salon: 0, domicilios: 0 };
    }

    const recordedHours: number[] = [currentHour];
    if (isShiftActive && shiftStart > 0) {
      recordedHours.push(getColombiaHour(shiftStart));
    }

    // Filtrar ventas de salón cobradas
    orders.forEach((o) => {
      if (o.status !== 'PAGADO') return;
      const ts = parseDateOrTimestamp(o.paidAt || o.createdAt);
      if (isShiftActive && shiftStart > 0 && ts < shiftStart) return;
      const h = getColombiaHour(ts);
      recordedHours.push(h);
      const amt = Number(o.total) || 0;
      salesByHour[h].total += amt;
      salesByHour[h].salon += amt;
      salesByHour[h].pedidos += 1;
    });

    // Filtrar domicilios entregados o cobrados
    deliveries.forEach((d) => {
      const isDeliveredOrPaid = d.deliveryStatus === 'ENTREGADO' || d.status === 'ENTREGADO' || d.status === 'PAGADO';
      if (!isDeliveredOrPaid) return;
      const ts = parseDateOrTimestamp(d.deliveredAt || d.dispatchedAt || d.createdAt);
      if (isShiftActive && shiftStart > 0 && ts < shiftStart) return;
      const h = getColombiaHour(ts);
      recordedHours.push(h);
      const amt = Number(d.total) || 0;
      salesByHour[h].total += amt;
      salesByHour[h].domicilios += amt;
      salesByHour[h].pedidos += 1;
    });

    // Rango dinámico de horas: desde la hora más temprana con actividad hasta la más tardía
    let minHour = Math.min(...recordedHours);
    let maxHour = Math.max(...recordedHours);

    // Aseguramos una ventana mínima de al menos 4 franjas para que la curva tenga buen aspecto visual
    if (maxHour - minHour < 3) {
      minHour = Math.max(0, minHour - 1);
      maxHour = Math.min(23, maxHour + 2);
      if (maxHour - minHour < 3 && minHour > 0) {
        minHour = Math.max(0, minHour - 1);
      }
    }

    const result = [];
    for (let h = minHour; h <= maxHour; h++) {
      result.push({
        hora: formatHourLabel(h),
        hour: h,
        total: salesByHour[h].total,
        pedidos: salesByHour[h].pedidos,
        salon: salesByHour[h].salon,
        domicilios: salesByHour[h].domicilios,
      });
    }

    return result;
  }, [orders, deliveries, cashRegister]);

  // Top selling products with profit margin
  const topProductsData = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};

    orders.forEach((o) => {
      (o.items || []).forEach((i) => {
        if (!counts[i.productName]) {
          counts[i.productName] = { name: i.productName, quantity: 0, revenue: 0, cost: 0 };
        }
        counts[i.productName].quantity += i.quantity;
        counts[i.productName].revenue += i.totalPrice;
      });
    });

    deliveries.forEach((d) => {
      (d.items || []).forEach((i) => {
        if (!counts[i.productName]) {
          counts[i.productName] = { name: i.productName, quantity: 0, revenue: 0, cost: 0 };
        }
        counts[i.productName].quantity += i.quantity;
        counts[i.productName].revenue += i.totalPrice;
      });
    });

    const list = Object.values(counts);
    if (list.length === 0) {
      return (products.slice(0, 5) || []).map((p, idx) => ({
        name: p.name,
        fullName: p.name,
        cantidad: [9, 6, 6, 5, 2][idx] || 4,
        ingresos: p.price * ([9, 6, 6, 5, 2][idx] || 4),
        margen: '68%',
      }));
    }

    return list
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        fullName: item.name,
        cantidad: item.quantity,
        ingresos: item.revenue,
        margen: '65-72%',
      }));
  }, [orders, deliveries, products]);

  // Active kitchen orders
  const kitchenOrders = useMemo(() => {
    const list: {
      id: string;
      number: string;
      type: string;
      origin: string;
      itemsCount: number;
      status: string;
      waitMin: number;
      firstItems: string;
    }[] = [];

    orders.forEach((o) => {
      if (['CREADO', 'CONFIRMADO', 'EN_COCINA', 'EN_PREPARACION', 'LISTO', 'PAGADO'].includes(o.status)) {
        const wait = Math.round((Date.now() - (o.createdAt || Date.now())) / 60000);
        const itemNames = (o.items || []).map((it) => `${it.quantity}x ${it.productName}`).slice(0, 2).join(', ');
        list.push({
          id: o.id,
          number: o.orderNumber || o.id,
          type: 'Mesa',
          origin: `Mesa ${o.tableId || 1} (Salón)`,
          itemsCount: (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
          status: o.status === 'LISTO' ? 'Listo en Pasaplatos' : 'En Fuego',
          waitMin: Math.max(1, wait),
          firstItems: itemNames,
        });
      }
    });

    deliveries.forEach((d) => {
      if (['PENDIENTE', 'EN_PREPARACION'].includes(d.deliveryStatus || '')) {
        const wait = Math.round((Date.now() - (d.createdAt || Date.now())) / 60000);
        const itemNames = (d.items || []).map((it) => `${it.quantity}x ${it.productName}`).slice(0, 2).join(', ');
        list.push({
          id: d.id,
          number: d.orderNumber,
          type: 'Domicilio',
          origin: d.deliveryAddress || 'Domicilio Express',
          itemsCount: (d.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
          status: 'En Cocina / Empaque',
          waitMin: Math.max(1, wait),
          firstItems: itemNames,
        });
      }
    });

    return list.sort((a, b) => b.waitMin - a.waitMin);
  }, [orders, deliveries]);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#1e290b' }}>
          Cargando Centro de Control Principal Sésamo...
        </Typography>
        <LinearProgress sx={{ borderRadius: 2, height: 8, bgcolor: '#f0fdf4', '& .MuiLinearProgress-bar': { bgcolor: '#84cc16' } }} />
      </Box>
    );
  }

  const isShiftOpen = Boolean(cashRegister?.isOpen);

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. EXECUTIVE WELCOME & REAL-TIME COMMAND BANNER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #1e290b 0%, #2a3d0f 60%, #152206 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px -5px rgba(30, 41, 11, 0.25)',
          border: '1px solid rgba(132, 204, 22, 0.2)',
        }}
      >
        {/* Subtle decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(132, 204, 22, 0.18) 0%, rgba(132, 204, 22, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.8 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                  fontSize: { xs: '1.6rem', md: '2.1rem' },
                }}
              >
                {greeting}, Equipo Sésamo 👋
              </Typography>

              {/* Live Cash Shift Status Chip */}
              <Chip
                icon={<PosIcon sx={{ fontSize: '15px !important', color: isShiftOpen ? '#84cc16 !important' : '#ef4444 !important' }} />}
                label={isShiftOpen ? `Turno Activo: ${cashRegister?.name || '01'}` : 'Caja Cerrada'}
                size="small"
                onClick={() => navigate('/cash')}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  bgcolor: isShiftOpen ? 'rgba(132, 204, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: isShiftOpen ? '#bef264' : '#fca5a5',
                  border: `1px solid ${isShiftOpen ? 'rgba(132, 204, 22, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  '&:hover': { bgcolor: isShiftOpen ? 'rgba(132, 204, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)' },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                flexWrap: 'wrap',
                color: '#cbd5e1',
                fontSize: '0.88rem',
                fontWeight: 500,
              }}
            >
              <Typography component="span" sx={{ fontWeight: 700, color: '#84cc16', fontSize: 'inherit' }}>
                Centro de Mando Gastronómico 360°
              </Typography>
              <Box component="span" sx={{ color: '#64748b' }}>•</Box>
              <Typography component="span" sx={{ textTransform: 'capitalize', fontSize: 'inherit' }}>
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
              <Box component="span" sx={{ color: '#64748b' }}>•</Box>
              <Typography component="span" sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: 'inherit' }}>
                {tables?.length ?? 0} Mesas en Salón • {kpis.staffOnDuty} Colaboradores en Turno
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 2. EXECUTIVE 6-KPI RIBBON */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Total Sales with Goal Progress */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)', borderColor: '#84cc16' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem' }}>
                  {isShiftOpen ? 'Ventas del Turno' : 'Ventas de Hoy'}
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#ecfccb', color: '#65a30d' }}>
                  <MoneyIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1, fontSize: '1.45rem' }}>
                ${kpis.totalSales.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                {isShiftOpen
                  ? `Base: $${kpis.initialFloat.toLocaleString()} • Gaveta: $${kpis.expectedCashInDrawer.toLocaleString()}`
                  : `Meta diaria: $${(kpis.dailyGoal / 1000000).toFixed(1)}M COP`}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#65a30d', fontSize: '0.78rem' }}>
                  {kpis.goalPercentage}% cumplido {kpis.pendingVolume > 0 ? `(+$${kpis.pendingVolume.toLocaleString()} en mesas)` : ''}
                </Typography>
                <TrendingUpIcon sx={{ fontSize: 16, color: '#65a30d' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={kpis.goalPercentage}
                sx={{
                  height: 7,
                  borderRadius: 3,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { bgcolor: '#84cc16', borderRadius: 3 },
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Theoretical Food Cost % */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem' }}>
                  Food Cost %
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#fef3c7', color: '#b45309' }}>
                  <PieIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: kpis.foodCostPercentage > 35 ? '#b91c1c' : '#15803d', lineHeight: 1.1, fontSize: '1.45rem' }}>
                {kpis.foodCostPercentage}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                Costo insumos: ${Math.round(kpis.totalTheoreticalCost).toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Chip
                label={kpis.foodCostPercentage <= 33 ? '🟢 Rango Saludable (<35%)' : '🟡 Vigilar Mermas'}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  bgcolor: kpis.foodCostPercentage <= 33 ? '#dcfce7' : '#fef3c7',
                  color: kpis.foodCostPercentage <= 33 ? '#166534' : '#92400e',
                  width: '100%',
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Gross Operating Margin */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem' }}>
                  Margen Bruto
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#f0fdf4', color: '#16a34a' }}>
                  <TrendingUpIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d', lineHeight: 1.1, fontSize: '1.45rem' }}>
                ${Math.round(kpis.grossMargin).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                {kpis.grossMarginPercentage}% sobre ventas
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Chip
                label="Excelente Rentabilidad"
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  bgcolor: '#ecfccb',
                  color: '#3f6212',
                  width: '100%',
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Average Ticket Salon vs Delivery */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem' }}>
                  Ticket Promedio
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0f2fe', color: '#0284c7' }}>
                  <ReceiptIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284c7', lineHeight: 1.1, fontSize: '1.45rem' }}>
                ${kpis.avgTicket.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                {kpis.totalOrdersCount} comandas hoy
              </Typography>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', p: 0.8, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                🍽️ ${kpis.avgSalonTicket.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
                🛵 ${kpis.avgDeliveryTicket.toLocaleString()}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Salon Occupancy Rate */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem' }}>
                  Ocupación Salón
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#faf5ff', color: '#9333ea' }}>
                  <TableIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#9333ea', lineHeight: 1.1, fontSize: '1.45rem' }}>
                {kpis.occupancyRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                {kpis.occupiedTables} de {tables.length} mesas ocupadas
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={kpis.occupancyRate}
                sx={{
                  height: 7,
                  borderRadius: 3,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { bgcolor: '#9333ea', borderRadius: 3 },
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Operational Attention Alerts */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Card
            elevation={0}
            onClick={() => {
              if (kpis.criticalStockCount > 0) setOperationsTab(3);
              else if (kpis.delayedOrdersCount > 0) setOperationsTab(1);
            }}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1.5px solid ${kpis.criticalStockCount > 0 || kpis.delayedOrdersCount > 0 ? '#fca5a5' : '#e2e8f0'}`,
              bgcolor: kpis.criticalStockCount > 0 || kpis.delayedOrdersCount > 0 ? '#fef2f2' : '#ffffff',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Radar Alertas
                </Typography>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#fee2e2', color: '#dc2626' }}>
                  <WarningIcon sx={{ fontSize: 18 }} />
                </Avatar>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>
                {kpis.criticalStockCount + kpis.delayedOrdersCount + kpis.pendingReservationsCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', mt: 0.4 }}>
                {kpis.criticalStockCount} stock bajo • {kpis.delayedOrdersCount} demorados
              </Typography>
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <Chip
                label={kpis.criticalStockCount > 0 ? 'Resolver Abastecimiento' : 'Operación Fluida'}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: kpis.criticalStockCount > 0 ? '#ef4444' : '#dcfce7',
                  color: '#ffffff',
                  width: '100%',
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 3. CHARTS ROW: HOURLY SALES AREA & TOP 5 BEST-SELLING DISHES */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Hourly Sales Area Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  Curva de Ventas por Franja Horaria
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Distribución de ingresos generados en Salón vs Domicilios en tiempo real
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  icon={<RestaurantIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                  label={`Salón: $${kpis.tableSales.toLocaleString()}`}
                  size="small"
                  sx={{ fontWeight: 800, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                />
                <Chip
                  icon={<DeliveryIcon sx={{ fontSize: '13px !important', color: '#7c3aed !important' }} />}
                  label={`Domicilios: $${kpis.deliverySales.toLocaleString()}`}
                  size="small"
                  sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}
                />
              </Stack>
            </Box>

            <Box sx={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlySalesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradientSalon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <RechartsTooltip
                    formatter={(value: any, name: any, item: any) => [
                      `$${Number(value).toLocaleString()} COP (${item.payload.pedidos} órdenes)`,
                      name === 'total' ? 'Total Franja' : name === 'salon' ? 'Salón' : 'Domicilios',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="total"
                    stroke="#65a30d"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#gradientTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top 5 Best Selling Dishes */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                    Top Platos Estrella
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mayor volumen vendido en la jornada
                  </Typography>
                </Box>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/recipes')} sx={{ fontWeight: 700 }}>
                  Recetas
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
                {topProductsData.map((item, idx) => {
                  const maxQty = topProductsData[0]?.cantidad || 1;
                  const pct = Math.min(100, Math.round((item.cantidad / maxQty) * 100));
                  const rankColors = [
                    { bg: '#fef9c3', text: '#854d0e', border: '#fde047', medal: '🥇' },
                    { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', medal: '🥈' },
                    { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', medal: '🥉' },
                    { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', medal: '4' },
                    { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', medal: '5' },
                  ];
                  const rank = rankColors[idx] || rankColors[3];

                  return (
                    <Box key={idx} sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, pr: 1 }}>
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '6px',
                              bgcolor: rank.bg,
                              color: rank.text,
                              border: `1px solid ${rank.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: idx < 3 ? '0.78rem' : '0.7rem',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {rank.medal}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              color: '#1e290b',
                              fontSize: '0.83rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.fullName || item.name}
                          >
                            {item.fullName || item.name}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexShrink: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 900,
                              color: '#166534',
                              bgcolor: '#f0fdf4',
                              px: 0.9,
                              py: 0.2,
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              fontSize: '0.75rem',
                            }}
                          >
                            {item.cantidad} {item.cantidad === 1 ? 'ud' : 'uds'}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', fontSize: '0.75rem', minWidth: 62, textAlign: 'right' }}>
                            ${item.ingresos.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Progress Bar with smooth branded gradient */}
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6.5,
                          borderRadius: 4,
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: idx === 0
                              ? 'linear-gradient(90deg, #84cc16 0%, #4d7c0f 100%)'
                              : idx === 1
                              ? 'linear-gradient(90deg, #a3e635 0%, #65a30d 100%)'
                              : '#bef264',
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ pt: 1, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                💡 Margen de contribución promedio:
              </Typography>
              <Chip label="~68% Bruto" size="small" sx={{ fontWeight: 800, bgcolor: '#ecfccb', color: '#3f6212', height: 22 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 4. OPERATIONAL COMMAND HUB (TABS: SALÓN, COCINA KDS, DOMICILIOS, INVENTARIO) */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3.5, bgcolor: '#ffffff', overflow: 'hidden' }}>
        {/* Navigation Tabs Bar */}
        <Box sx={{ px: 2.5, pt: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                Centro de Operaciones en Vivo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supervisión táctica sincronizada con cada estación del restaurante
              </Typography>
            </Box>

            <Tabs
              value={operationsTab}
              onChange={(_, v) => setOperationsTab(v)}
              indicatorColor="primary"
              textColor="primary"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.88rem',
                  minHeight: 46,
                  color: '#64748b',
                  '&.Mui-selected': { color: '#1e290b' },
                },
                '& .MuiTabs-indicator': {
                  bgcolor: '#84cc16',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab icon={<TableIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Salón (${tableMetrics.occupiedTotal}/${tables.length})`} />
              <Tab icon={<KitchenIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Cocina KDS (${kitchenOrders.length})`} />
              <Tab icon={<DeliveryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Domicilios (${deliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO').length})`} />
              <Tab icon={<InventoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Almacén & Alertas (${kpis.criticalStockCount})`} />
            </Tabs>
          </Box>
        </Box>

        {/* TAB 0: SALÓN & MESAS */}
        {operationsTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={`🟢 Libres: ${tableMetrics.available}`} sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800 }} />
                <Chip size="small" label={`🟠 En Cocina: ${tableMetrics.inKitchen}`} sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800 }} />
                <Chip size="small" label={`🔵 Listas: ${tableMetrics.ready}`} sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 800 }} />
                <Chip size="small" label={`🟣 Comiendo: ${tableMetrics.served}`} sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 800 }} />
                <Chip size="small" label={`🟡 Reservadas: ${tableMetrics.reserved}`} sx={{ bgcolor: '#fef9c3', color: '#854d0e', fontWeight: 800 }} />
              </Stack>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TableIcon />}
                onClick={() => navigate('/tables')}
                sx={{ borderRadius: '10px', fontWeight: 800, textTransform: 'none' }}
              >
                Abrir Plano Interactivo
              </Button>
            </Box>

            <Grid container spacing={1.5}>
              {tables.map((table) => {
                const activeOrder = getActiveOrderForTable(table);
                const config = getStatusConfig(table, activeOrder);

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={table.id}>
                    <Paper
                      variant="outlined"
                      onClick={() => navigate('/tables')}
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderRadius: 2.5,
                        bgcolor: config.bgColor,
                        borderColor: config.borderColor,
                        borderWidth: '1.5px',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                        },
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: config.textColor }}>
                        Mesa {table.number}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: config.textColor,
                          fontWeight: activeOrder ? 800 : 500,
                          mt: 0.2,
                        }}
                      >
                        {activeOrder ? `$${(activeOrder.total || 0).toLocaleString()} COP` : `${table.capacity} personas`}
                      </Typography>
                      <Chip
                        label={config.label}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          mt: 0.8,
                          bgcolor: 'rgba(255,255,255,0.85)',
                          color: config.textColor,
                        }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* TAB 1: COCINA KDS EN VIVO */}
        {operationsTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569' }}>
                Comandas en proceso en la línea de cocina y pasaplatos:
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/kitchen')} sx={{ fontWeight: 800 }}>
                Ir al KDS Completo
              </Button>
            </Box>

            {kitchenOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <CheckCircleIcon sx={{ fontSize: 44, color: '#16a34a', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  ¡Cocina al día! No hay pedidos pendientes en cola.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Los nuevos pedidos del salón o domicilios se sincronizarán aquí al instante.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {kitchenOrders.slice(0, 6).map((ko, idx) => (
                  <Grid size={{ xs: 12, md: 4 }} key={idx}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        borderColor: ko.waitMin > 18 ? '#fca5a5' : ko.waitMin > 10 ? '#fde047' : '#bbf7d0',
                        bgcolor: ko.waitMin > 18 ? '#fff5f5' : '#ffffff',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                            #{ko.number}
                          </Typography>
                          <Chip
                            label={ko.type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              bgcolor: ko.type === 'Mesa' ? '#ecfccb' : '#faf5ff',
                              color: ko.type === 'Mesa' ? '#3f6212' : '#7c3aed',
                            }}
                          />
                        </Box>
                        <Chip
                          icon={<TimeIcon sx={{ fontSize: 13 }} />}
                          label={`${ko.waitMin} min`}
                          size="small"
                          color={ko.waitMin > 18 ? 'error' : ko.waitMin > 10 ? 'warning' : 'success'}
                          sx={{ height: 22, fontSize: '0.68rem', fontWeight: 900 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                        {ko.origin}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                        {ko.firstItems || `${ko.itemsCount} platos solicitados`}
                      </Typography>
                      <Divider sx={{ my: 0.8 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: ko.status.includes('Listo') ? '#16a34a' : '#ea580c' }}>
                          ● {ko.status}
                        </Typography>
                        <Button size="small" onClick={() => navigate('/kitchen')} sx={{ fontSize: '0.72rem', py: 0.2 }}>
                          Atender
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* TAB 2: DOMICILIOS EN RUTA */}
        {operationsTab === 2 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569' }}>
                Monitoreo de entregas y repartidores en ruta:
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/delivery')} sx={{ fontWeight: 800 }}>
                Modulo Domicilios
              </Button>
            </Box>

            {deliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO').length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <DeliveryIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  No hay repartidores en ruta en este momento.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Los pedidos despachados aparecerán aquí con su repartidor asignado.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {deliveries
                  .filter((d) => d.deliveryStatus === 'EN_CAMINO')
                  .slice(0, 6)
                  .map((d) => (
                    <Grid size={{ xs: 12, md: 4 }} key={d.id}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#faf5ff', borderColor: '#ddd6fe' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#6d28d9' }}>
                            #{d.orderNumber}
                          </Typography>
                          <Chip label="En Ruta 🛵" size="small" sx={{ bgcolor: '#7c3aed', color: '#ffffff', fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e290b' }}>
                          {d.customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 1 }}>
                          📍 {d.deliveryAddress}
                        </Typography>
                        <Divider sx={{ my: 0.8 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#475569' }}>
                            Rider: <strong>{d.deliveryRiderName || 'Kevin Morales'}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#15803d' }}>
                            ${d.total.toLocaleString()} COP
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
              </Grid>
            )}
          </Box>
        )}

        {/* TAB 3: ALMACÉN, INVENTARIO & COMPRAS */}
        {operationsTab === 3 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569' }}>
                Insumos bajo nivel mínimo que requieren reorden urgente:
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" startIcon={<CartIcon />} onClick={() => navigate('/purchases')} sx={{ bgcolor: '#1e290b', fontWeight: 800 }}>
                  Ir a Compras
                </Button>
                <Button variant="outlined" size="small" onClick={() => navigate('/inventory')} sx={{ fontWeight: 800 }}>
                  Ver Inventario
                </Button>
              </Stack>
            </Box>

            {kpis.criticalStockList.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <CheckCircleIcon sx={{ fontSize: 44, color: '#16a34a', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  Inventario en niveles óptimos.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Todos los insumos superan el stock mínimo configurado.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {kpis.criticalStockList.slice(0, 6).map((item) => {
                  const deficit = Math.max(0, item.maxStock - item.currentStock);
                  const estimatedBudget = deficit * (item.unitCost || 0);

                  return (
                    <Grid size={{ xs: 12, md: 4 }} key={item.id}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fef2f2', borderColor: '#fca5a5' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                            {item.name}
                          </Typography>
                          <Chip label="Bajo Stock" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Stock actual: <strong style={{ color: '#b91c1c' }}>{item.currentStock} {item.unit}</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mínimo: {item.minStock} {item.unit}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 0.8 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Sugerido pedir: <strong>+{deficit} {item.unit}</strong>
                          </Typography>
                          <Tooltip title="Crear orden de compra para este insumo">
                            <Button size="small" onClick={() => navigate('/purchases')} sx={{ fontSize: '0.72rem', py: 0.2 }}>
                              Comprar (${(estimatedBudget / 1000).toFixed(0)}k)
                            </Button>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
