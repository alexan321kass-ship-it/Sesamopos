import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  RoomService as RoomServiceIcon,
  VolumeUp as SoundIcon,
  VolumeOff as MuteIcon,
  NotificationsActive as BellIcon,
  LocalBar as BarIcon,
  TwoWheeler as DeliveryDiningIcon,
  LocalFireDepartment as FireIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  TableRestaurant as TableIcon,
  Timer as TimerIcon,
  Search as SearchIcon,
  OutdoorGrill as GrillIcon,
  SoupKitchen as HotKitchenIcon,
  AcUnit as ColdStationIcon,
  Layers as AllStationsIcon,
  History as HistoryIcon,
  Restore as ReopenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Order } from '../types';
import { playKitchenBellSound, playOrderReadySound } from '../utils/audioAlerts';
import { subscribeRealtimeEvents } from '../services/eventBus';
import { parseDateOrTimestamp } from '../utils/timeUtils';

export type KitchenDisplayOrder = Order & {
  deliveryOriginalId?: string;
  deliveryAddress?: string;
  deliveryCustomerName?: string;
  updatedAt?: number;
};

export type CulinaryStation = 'ALL' | 'PARRILLA' | 'COCINA_CALIENTE' | 'ENSALADAS_FRIOS' | 'BARRA';

export default function KitchenScreen() {
  const [orders, setOrders] = useState<KitchenDisplayOrder[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SALON' | 'DOMICILIOS'>('ALL');
  const [selectedStation, setSelectedStation] = useState<CulinaryStation>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMobileColumn, setActiveMobileColumn] = useState<'ALL' | 'NEW' | 'PREP' | 'READY'>('ALL');
  const [now, setNow] = useState<number>(Date.now());
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const [deliveredHistory, setDeliveredHistory] = useState<KitchenDisplayOrder[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Live timer tick every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadOrders(true);

    const handleDataUpdated = () => {
      loadOrders(false);
    };

    const unsubscribe = subscribeRealtimeEvents((type) => {
      if (
        type === 'sesamo_order_created' ||
        type === 'sesamo_order_updated' ||
        type === 'sesamo_orders_updated' ||
        type === 'sesamo_deliveries_updated'
      ) {
        loadOrders(false);
      }
    });

    window.addEventListener('sesamo_order_created', handleDataUpdated);
    window.addEventListener('sesamo_order_updated', handleDataUpdated);
    window.addEventListener('sesamo_orders_updated', handleDataUpdated);
    window.addEventListener('sesamo_deliveries_updated', handleDataUpdated);

    const interval = setInterval(() => loadOrders(false), 2500);

    return () => {
      window.removeEventListener('sesamo_order_created', handleDataUpdated);
      window.removeEventListener('sesamo_order_updated', handleDataUpdated);
      window.removeEventListener('sesamo_orders_updated', handleDataUpdated);
      window.removeEventListener('sesamo_deliveries_updated', handleDataUpdated);
      unsubscribe();
      clearInterval(interval);
    };
  }, [soundEnabled]);

  const loadOrders = async (isInitialLoad = false) => {
    try {
      const [allOrders, allDeliveries] = await Promise.all([
        mockApi.orders.getAll(),
        mockApi.deliveries.getAll(),
      ]);

      // 1. Active table orders (En autoservicio los pedidos pagados y en cocina entran a preparar)
      const salonKitchenOrders: KitchenDisplayOrder[] = (allOrders || [])
        .filter((o) =>
          ['CREADO', 'CONFIRMADO', 'EN_COCINA', 'EN_PREPARACION', 'LISTO', 'PAGADO'].includes(o.status)
        )
        .map((o) => ({
          ...o,
          createdAt: parseDateOrTimestamp(o.createdAt),
          items: Array.isArray(o.items) ? o.items : [],
        }));

      // 2. Active delivery orders
      const activeDeliveries: KitchenDisplayOrder[] = (allDeliveries || [])
        .filter((d) =>
          ['PENDIENTE', 'EN_PREPARACION', 'LISTO'].includes((d.deliveryStatus as any) || d.status || '')
        )
        .map((d) => ({
          id: `deliv-${d.id}`,
          orderNumber: d.orderNumber || `DOM-${d.id}`,
          tableId: 'DOMICILIO',
          tableName: d.customer?.name ? ` ${d.customer.name}` : ' Domicilio Express',
          waiterId: d.deliveryRiderId || undefined,
          waiterName: d.deliveryRiderName || ((d as any).riderName ? (d as any).riderName : 'Por asignar repartidor'),
          items: Array.isArray(d.items) ? d.items : [],
          subtotal: d.subtotal || 0,
          discount: d.discount || 0,
          tax: d.tax || 0,
          total: d.total || 0,
          status: (
            (d.deliveryStatus === 'PENDIENTE' || d.status === 'CREADO') ? 'CREADO' :
            (d.deliveryStatus === 'EN_PREPARACION' || d.status === 'EN_PREPARACION') ? 'EN_PREPARACION' :
            ((d.deliveryStatus as any) === 'LISTO' || d.status === 'LISTO') ? 'LISTO' : 'EN_PREPARACION'
          ) as any,
          type: 'DOMICILIO' as any,
          createdAt: parseDateOrTimestamp(d.createdAt),
          customerName: d.customer?.name || 'Cliente Domicilio',
          deliveryOriginalId: d.id,
          deliveryAddress: d.deliveryAddress || d.customer?.address || '',
          deliveryCustomerName: d.customer?.name || 'Cliente Domicilio',
        }));

      const combinedOrders = [...salonKitchenOrders, ...activeDeliveries].sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
      );

      // 3. Historial de comandas despachadas / entregadas
      const deliveredSalonOrders: KitchenDisplayOrder[] = (allOrders || [])
        .filter((o) => ['ENTREGADO', 'COMPLETADO'].includes(o.status))
        .map((o) => ({
          ...o,
          createdAt: parseDateOrTimestamp(o.createdAt),
          items: Array.isArray(o.items) ? o.items : [],
        }));

      const deliveredDeliveryOrders: KitchenDisplayOrder[] = (allDeliveries || [])
        .filter((d) => ['ENTREGADO', 'EN_CAMINO'].includes((d.deliveryStatus as any) || d.status || ''))
        .map((d) => ({
          id: `deliv-${d.id}`,
          orderNumber: d.orderNumber || `DOM-${d.id}`,
          tableId: 'DOMICILIO',
          tableName: d.customer?.name ? `🛵 ${d.customer.name}` : '🛵 Domicilio Express',
          waiterId: d.deliveryRiderId || undefined,
          waiterName: d.deliveryRiderName || 'Repartidor',
          items: Array.isArray(d.items) ? d.items : [],
          subtotal: d.subtotal || 0,
          discount: d.discount || 0,
          tax: d.tax || 0,
          total: d.total || 0,
          status: 'ENTREGADO' as any,
          type: 'DOMICILIO' as any,
          createdAt: parseDateOrTimestamp(d.createdAt),
          customerName: d.customer?.name || 'Cliente Domicilio',
          deliveryOriginalId: d.id,
          deliveryAddress: d.deliveryAddress || d.customer?.address || '',
          deliveryCustomerName: d.customer?.name || 'Cliente Domicilio',
        }));

      const historyList = [...deliveredSalonOrders, ...deliveredDeliveryOrders].sort(
        (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
      );
      setDeliveredHistory(historyList.slice(0, 50));

      // Detect incoming new orders and sound chime
      if (!isInitialLoad && knownOrderIdsRef.current.size > 0 && soundEnabled) {
        const hasNewIncoming = combinedOrders.some(
          (o) =>
            !knownOrderIdsRef.current.has(o.id) &&
            ['CREADO', 'CONFIRMADO', 'EN_COCINA', 'EN_PREPARACION', 'PAGADO'].includes(o.status)
        );
        if (hasNewIncoming) {
          playKitchenBellSound();
        }
      }

      const currentIds = new Set(combinedOrders.map((o) => o.id));
      knownOrderIdsRef.current = currentIds;

      setOrders(combinedOrders);
    } catch (err) {
      console.error('Error al cargar pedidos de cocina:', err);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    if (orderId.startsWith('deliv-')) {
      const originalId = orderId.replace('deliv-', '');
      const deliveryStatusMap: Record<string, any> = {
        EN_PREPARACION: 'EN_PREPARACION',
        LISTO: 'LISTO',
        ENTREGADO: 'EN_CAMINO',
      };
      const targetStatus = deliveryStatusMap[newStatus] || 'EN_PREPARACION';
      await mockApi.deliveries.update(originalId, {
        deliveryStatus: targetStatus,
        status: targetStatus,
      });
    } else {
      await mockApi.orders.updateStatus(orderId, newStatus);
    }

    if (newStatus === 'LISTO' && soundEnabled) {
      playOrderReadySound();
    }
    loadOrders(false);
  };

  const handleReopenOrder = async (order: KitchenDisplayOrder) => {
    try {
      if (order.id.startsWith('deliv-')) {
        const rawDeliveryId = (order as any).deliveryOriginalId || order.id.replace('deliv-', '');
        await mockApi.deliveries.update(rawDeliveryId, {
          deliveryStatus: 'EN_PREPARACION',
          status: 'EN_PREPARACION',
        });
      } else {
        await mockApi.orders.updateStatus(order.id, 'EN_PREPARACION');
      }
      playKitchenBellSound();
      await loadOrders(false);
    } catch (err) {
      console.error('Error reabriendo comanda:', err);
    }
  };

  const toggleItemChecked = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine item culinary station
  const getItemStation = (productName: string): CulinaryStation => {
    const name = productName.toLowerCase();
    if (
      name.includes('cerveza') ||
      name.includes('jugo') ||
      name.includes('limonada') ||
      name.includes('gaseosa') ||
      name.includes('agua') ||
      name.includes('vino') ||
      name.includes('cocktail') ||
      name.includes('mojito') ||
      name.includes('café') ||
      name.includes('soda') ||
      name.includes('bebida')
    ) {
      return 'BARRA';
    }
    if (
      name.includes('hamburguesa') ||
      name.includes('carne') ||
      name.includes('corte') ||
      name.includes('costilla') ||
      name.includes('bife') ||
      name.includes('parrilla') ||
      name.includes('pizza') ||
      name.includes('chorizo')
    ) {
      return 'PARRILLA';
    }
    if (
      name.includes('ensalada') ||
      name.includes('ceviche') ||
      name.includes('tartar') ||
      name.includes('postre') ||
      name.includes('brownie') ||
      name.includes('helado') ||
      name.includes('frío')
    ) {
      return 'ENSALADAS_FRIOS';
    }
    return 'COCINA_CALIENTE';
  };

  // Consolidated Batch Production (Cooks Fire Board)
  const batchProductionSummary = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; station: CulinaryStation }> = {};

    orders.forEach((o) => {
      if (['CREADO', 'CONFIRMADO', 'EN_COCINA', 'EN_PREPARACION', 'PAGADO'].includes(o.status)) {
        (o.items || []).forEach((it) => {
          if (!it.isDelivered) {
            const st = getItemStation(it.productName);
            if (selectedStation === 'ALL' || selectedStation === st) {
              if (!counts[it.productName]) {
                counts[it.productName] = { name: it.productName, quantity: 0, station: st };
              }
              counts[it.productName].quantity += it.quantity || 1;
            }
          }
        });
      }
    });

    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [orders, selectedStation]);

  // Filter orders by channel, station and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Channel filter
      if (filterMode === 'SALON' && o.type === 'DOMICILIO') return false;
      if (filterMode === 'DOMICILIOS' && o.type !== 'DOMICILIO') return false;

      // Search query filter (Order number, table, customer)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = (o.orderNumber || '').toLowerCase().includes(q);
        const matchesTable = String(o.tableId || '').toLowerCase().includes(q);
        const matchesCustomer = (o.customerName || '').toLowerCase().includes(q);
        const matchesDish = (o.items || []).some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesOrder && !matchesTable && !matchesCustomer && !matchesDish) return false;
      }

      // Station filter: show order if it contains at least one item of the selected station
      if (selectedStation !== 'ALL') {
        const hasStationItem = (o.items || []).some(
          (it) => getItemStation(it.productName) === selectedStation
        );
        if (!hasStationItem) return false;
      }

      return true;
    });
  }, [orders, filterMode, selectedStation, searchQuery]);

  // Urgency time semaphore
  const getUrgency = (createdAt: number | string, isFinished: boolean) => {
    const ts = parseDateOrTimestamp(createdAt);
    const mins = Math.max(0, Math.floor((now - ts) / 60000));
    const secs = Math.floor(((now - ts) % 60000) / 1000);
    const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (isFinished) {
      return {
        mins,
        formattedTime,
        level: 'finished',
        badgeColor: '#15803d',
        badgeBg: '#dcfce7',
        borderColor: '#86efac',
        cardBg: '#ffffff',
        headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        label: `Listo (${mins}m)`,
        isPulsing: false,
      };
    }
    if (mins < 10) {
      return {
        mins,
        formattedTime,
        level: 'optimal',
        badgeColor: '#15803d',
        badgeBg: '#dcfce7',
        borderColor: '#22c55e',
        cardBg: '#ffffff',
        headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
        label: `🟢 ${mins}m • Óptimo`,
        isPulsing: false,
      };
    } else if (mins <= 18) {
      return {
        mins,
        formattedTime,
        level: 'warning',
        badgeColor: '#b45309',
        badgeBg: '#fef3c7',
        borderColor: '#f59e0b',
        cardBg: '#fffdf5',
        headerBg: 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)',
        label: `🟡 ${mins}m • Atención`,
        isPulsing: false,
      };
    } else {
      return {
        mins,
        formattedTime,
        level: 'critical',
        badgeColor: '#b91c1c',
        badgeBg: '#fee2e2',
        borderColor: '#ef4444',
        cardBg: '#fff5f5',
        headerBg: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
        label: `🔴 ${mins}m • ¡URGENTE!`,
        isPulsing: true,
      };
    }
  };

  // KPI counters
  const totalActive = orders.length;
  const newOrdersCount = orders.filter((o) => ['CREADO', 'CONFIRMADO', 'EN_COCINA', 'PAGADO'].includes(o.status)).length;
  const inPrepCount = orders.filter((o) => o.status === 'EN_PREPARACION').length;
  const readyCount = orders.filter((o) => o.status === 'LISTO').length;
  const deliveryCount = orders.filter((o) => o.type === 'DOMICILIO').length;
  const salonCount = orders.filter((o) => o.type !== 'DOMICILIO').length;

  const renderColumn = (
    title: string,
    validStatuses: string[],
    actionText: string,
    nextStatus: Order['status'] | null,
    columnTheme: { headerColor: string; badgeBg: string; borderColor: string; icon: React.ReactNode }
  ) => {
    const columnOrders = filteredOrders.filter((o) => validStatuses.includes(o.status));

    return (
      <Box
        sx={{
          bgcolor: '#ffffff',
          p: 2,
          borderRadius: 3.5,
          height: '100%',
          minHeight: 560,
          border: `1.5px solid ${columnTheme.borderColor}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Column Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            pb: 1.5,
            borderBottom: `2px solid ${columnTheme.borderColor}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {columnTheme.icon}
            <Typography variant="h6" sx={{ fontWeight: 900, color: columnTheme.headerColor, letterSpacing: -0.3, fontSize: '1.05rem' }}>
              {title}
            </Typography>
          </Box>
          <Chip
            label={`${columnOrders.length} ${columnOrders.length === 1 ? 'comanda' : 'comandas'}`}
            size="small"
            sx={{ fontWeight: 900, bgcolor: columnTheme.badgeBg, color: columnTheme.headerColor, fontSize: '0.75rem', height: 24 }}
          />
        </Box>

        {/* Tickets Stream */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto', pr: 0.5 }}>
          {columnOrders.map((order) => {
            const isFinished = title.includes('LISTOS');
            const urgency = getUrgency(order.createdAt, isFinished);
            const isDelivery = order.type === 'DOMICILIO';
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const hasServedItems = orderItems.some((it) => Boolean(it.isDelivered));
            const hasPendingItems = orderItems.some((it) => !it.isDelivered);
            const isAdditionOrder = hasServedItems && hasPendingItems;

            return (
              <Card
                key={order.id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: isFinished ? '1.5px solid #86efac' : `2px solid ${urgency.borderColor}`,
                  bgcolor: urgency.cardBg,
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: urgency.isPulsing
                    ? '0 0 20px rgba(239, 68, 68, 0.35)'
                    : '0 4px 14px rgba(0,0,0,0.04)',
                  ...(urgency.isPulsing ? { animation: 'pulseCritical 2s infinite' } : {}),
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  },
                }}
              >
                {/* Header with Table/Delivery and Elapsed Time */}
                <Box
                  sx={{
                    p: 1.8,
                    background: urgency.headerBg,
                    borderBottom: `1px solid ${urgency.borderColor}50`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1 }}>
                        #{order.orderNumber}
                      </Typography>
                      {isAdditionOrder && (
                        <Chip
                          label="⚡ ADICIÓN"
                          size="small"
                          sx={{
                            bgcolor: '#fff7ed',
                            color: '#c2410c',
                            fontWeight: 900,
                            fontSize: '0.68rem',
                            height: 22,
                            border: '1.5px solid #fb923c',
                          }}
                        />
                      )}
                      {isDelivery && (
                        <Chip
                          icon={<DeliveryDiningIcon sx={{ fontSize: '14px !important', color: '#7c3aed !important' }} />}
                          label="Domicilio"
                          size="small"
                          sx={{ bgcolor: '#faf5ff', color: '#7c3aed', fontWeight: 900, fontSize: '0.7rem', height: 22, border: '1px solid #ddd6fe' }}
                        />
                      )}
                      {(order.paidAt || order.status === 'PAGADO' || (order as any).isPaid) ? (
                        <Chip
                          label="✅ PAGADO"
                          size="small"
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 900,
                            fontSize: '0.68rem',
                            height: 22,
                            border: '1.5px solid #86efac',
                          }}
                        />
                      ) : (
                        <Chip
                          label="⚠️ PENDIENTE PAGO"
                          size="small"
                          sx={{
                            bgcolor: '#fef2f2',
                            color: '#b91c1c',
                            fontWeight: 900,
                            fontSize: '0.68rem',
                            height: 22,
                            border: '1.5px solid #fca5a5',
                          }}
                        />
                      )}
                    </Box>

                    {/* Table Pill */}
                    <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {isDelivery ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#7c3aed', color: '#fff', px: 1, py: 0.3, borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem' }}>
                          <DeliveryDiningIcon sx={{ fontSize: 16 }} />
                          <span>DOMICILIO EXPRESS</span>
                        </Box>
                      ) : String(order.tableId || '').toLowerCase() === 'barra' || order.type === 'BARRA' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f59e0b', color: '#1e290b', px: 1, py: 0.3, borderRadius: '8px', fontWeight: 900, fontSize: '0.78rem' }}>
                          <BarIcon sx={{ fontSize: 16 }} />
                          <span>BARRA (Consumo Mostrador)</span>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#1e290b', color: '#ffffff', px: 1.2, py: 0.4, borderRadius: '10px', fontWeight: 900, fontSize: '0.82rem' }}>
                          <TableIcon sx={{ fontSize: 17, color: '#84cc16' }} />
                          <span>MESA {order.tableId || 'S/N'}</span>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Urgency Badge */}
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      icon={<TimerIcon sx={{ color: `${urgency.badgeColor} !important`, fontSize: '14px !important' }} />}
                      label={urgency.label}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        bgcolor: urgency.badgeBg,
                        color: urgency.badgeColor,
                        border: `1.5px solid ${urgency.borderColor}`,
                        fontSize: '0.72rem',
                        height: 24,
                      }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 700, mt: 0.4 }}>
                      Llegó: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>

                {/* Ticket Details */}
                <CardContent sx={{ p: 2, pt: 1.5, pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', fontWeight: 900, bgcolor: isDelivery ? '#7c3aed' : '#65a30d' }}>
                        {(order.waiterName || 'C').charAt(0)}
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>
                        {isDelivery ? `Repartidor: ${order.waiterName || 'Por asignar'}` : `Mesero: ${order.waiterName || 'Carlos Ruiz'}`}
                      </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: isAdditionOrder ? '#ea580c' : '#94a3b8', fontWeight: 800 }}>
                      {isAdditionOrder
                        ? `${orderItems.filter((it) => !it.isDelivered).reduce((s, it) => s + (it.quantity || 1), 0)} por preparar (${orderItems.filter((it) => it.isDelivered).reduce((s, it) => s + (it.quantity || 1), 0)} servidos)`
                        : `${orderItems.reduce((s, it) => s + (it.quantity || 1), 0)} platos en total`}
                    </Typography>
                  </Box>

                  {/* Customer info for deliveries */}
                  {isDelivery && (order.customerName || order.deliveryAddress) && (
                    <Box sx={{ mb: 1.5, p: 1.2, bgcolor: '#faf5ff', borderRadius: '12px', border: '1px dashed #ddd6fe' }}>
                      <Typography variant="caption" sx={{ color: '#6d28d9', fontWeight: 800, display: 'block' }}>
                        👤 Cliente: {order.customerName || 'Cliente Domicilio'}
                      </Typography>
                      {order.deliveryAddress && (
                        <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600, display: 'block', mt: 0.2 }}>
                          📍 Dirección: {order.deliveryAddress}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 1, borderColor: '#f1f5f9' }} />

                  {/* Dish List with Interactive Strike-through */}
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.8 }}>
                    {isAdditionOrder ? 'Estado de platos (Nuevos vs Servidos):' : 'Toca cada plato para tacharlo al emplatar:'}
                  </Typography>

                  <List dense disablePadding>
                    {orderItems.map((item, idx) => {
                      const isDelivered = Boolean(item.isDelivered);
                      const isChecked = Boolean(checkedItems[`${order.id}-${idx}`]) || isDelivered;
                      const itemStation = getItemStation(item.productName);

                      return (
                        <ListItem
                          key={idx}
                          disablePadding
                          onClick={() => {
                            if (!isDelivered) {
                              toggleItemChecked(order.id, idx);
                            }
                          }}
                          sx={{
                            p: 1.2,
                            mb: 1.2,
                            borderRadius: '12px',
                            cursor: isDelivered ? 'default' : 'pointer',
                            bgcolor: isDelivered ? '#f8fafc' : isChecked ? '#f1f5f9' : isAdditionOrder ? '#fffbeb' : '#ffffff',
                            border: `1.5px solid ${isDelivered ? '#e2e8f0' : isChecked ? '#cbd5e1' : isAdditionOrder ? '#fde68a' : '#e2e8f0'}`,
                            opacity: isDelivered ? 0.65 : isChecked ? 0.55 : 1,
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: isDelivered ? '#f8fafc' : isChecked ? '#e2e8f0' : '#f8fafc' },
                          }}
                        >
                          {/* Checkbox */}
                          <Box sx={{ mr: 1.2, color: isDelivered ? '#16a34a' : isChecked ? '#16a34a' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                            {isChecked ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : <UncheckedIcon sx={{ fontSize: 22 }} />}
                          </Box>

                          {/* Quantity Badge */}
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '10px',
                              bgcolor: isDelivered ? '#e2e8f0' : isChecked ? '#cbd5e1' : isAdditionOrder ? '#fed7aa' : '#ecfccb',
                              color: isDelivered ? '#64748b' : isChecked ? '#64748b' : '#1e290b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '1rem',
                              mr: 1.4,
                              flexShrink: 0,
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}
                          >
                            {item.quantity}
                          </Box>

                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 900,
                                      color: isDelivered ? '#64748b' : isChecked ? '#64748b' : '#0f172a',
                                      textDecoration: isChecked || isDelivered ? 'line-through' : 'none',
                                      fontSize: '1rem',
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {item.productName}
                                  </Typography>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
                                    {/* Culinary Station Chip */}
                                    <Chip
                                      label={itemStation === 'PARRILLA' ? '🥩 Parrilla' : itemStation === 'BARRA' ? '🍹 Bar' : itemStation === 'ENSALADAS_FRIOS' ? '🥗 Frío' : '🍳 Cocina'}
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        bgcolor: '#f1f5f9',
                                        color: '#334155',
                                        border: '1px solid #e2e8f0'
                                      }}
                                    />
                                    {isDelivered ? (
                                      <Chip
                                        label="✓ Servido"
                                        size="small"
                                        sx={{
                                          height: 22,
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          bgcolor: '#dcfce7',
                                          color: '#15803d',
                                        }}
                                      />
                                    ) : isAdditionOrder ? (
                                      <Chip
                                        label="🔥 NUEVO"
                                        size="small"
                                        sx={{
                                          height: 22,
                                          fontSize: '0.72rem',
                                          fontWeight: 900,
                                          bgcolor: '#ea580c',
                                          color: '#ffffff',
                                        }}
                                      />
                                    ) : null}
                                  </Box>
                                </Box>
                              </Box>
                            }
                            secondary={
                              <>
                                {/* Modifiers */}
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: '#0284c7',
                                      fontWeight: 800,
                                      fontSize: '0.85rem',
                                      mt: 0.6,
                                      display: 'block'
                                    }}
                                  >
                                    + {item.modifiers.map((m) => m.name).join(', ')}
                                  </Typography>
                                )}
                                {/* Special Kitchen Notes / Allergies */}
                                {item.notes && (
                                  <Box sx={{ mt: 0.8, p: 0.8, px: 1.2, bgcolor: '#fef2f2', borderRadius: '8px', border: '1.5px solid #fca5a5', display: 'block' }}>
                                    <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                      <span>⚠️</span> <span>NOTA: {item.notes}</span>
                                    </Typography>
                                  </Box>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>

                {/* Big Touch Action Button */}
                <CardActions sx={{ p: 2, pt: 0.5 }}>
                  {nextStatus && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={() => handleUpdateStatus(order.id, nextStatus)}
                      sx={{
                        borderRadius: '14px',
                        fontWeight: 900,
                        py: 1.4,
                        fontSize: '0.95rem',
                        bgcolor:
                          order.status === 'LISTO'
                            ? '#059669'
                            : order.status === 'EN_PREPARACION'
                            ? '#16a34a'
                            : '#1e290b',
                        boxShadow:
                          order.status === 'LISTO'
                            ? '0 4px 14px rgba(5, 150, 105, 0.35)'
                            : order.status === 'EN_PREPARACION'
                            ? '0 4px 14px rgba(22, 163, 74, 0.35)'
                            : '0 4px 14px rgba(30, 41, 11, 0.35)',
                        '&:hover': {
                          bgcolor:
                            order.status === 'LISTO'
                              ? '#047857'
                              : order.status === 'EN_PREPARACION'
                              ? '#15803d'
                              : '#0f172a',
                        },
                      }}
                    >
                      {order.type === 'DOMICILIO' && order.status === 'LISTO'
                        ? 'Empacado • Listo para Salir'
                        : actionText}
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}

          {columnOrders.length === 0 && (
            <Box sx={{ py: 10, textAlign: 'center', color: '#94a3b8' }}>
              <RoomServiceIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#64748b' }}>
                Sin comandas en esta estación
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Los nuevos pedidos aparecerán aquí automáticamente
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ pb: 6 }}>
      <style>{`
        @keyframes pulseCritical {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ p: 1, bgcolor: '#ecfccb', borderRadius: '14px', color: '#65a30d', display: 'flex' }}>
              <FireIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                Sistema de Cocina & KDS Sésamo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Control táctil de comandas en tiempo real con enrutamiento a estaciones culinarias.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Audio Controls & Bell */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.8, bgcolor: '#ffffff', p: 1, borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', mr: 0.5 }}>Tiempos:</Typography>
            <Chip size="small" label="<10m Óptimo" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 800, fontSize: '0.7rem' }} />
            <Chip size="small" label="10-18m Atención" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.7rem' }} />
            <Chip size="small" label=">18m Demorado" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.7rem' }} />
          </Box>

          <Tooltip title={soundEnabled ? 'Silenciar alarmas sonoras' : 'Activar alarmas sonoras'}>
            <Button
              variant={soundEnabled ? 'contained' : 'outlined'}
              startIcon={soundEnabled ? <SoundIcon /> : <MuteIcon />}
              onClick={() => setSoundEnabled((prev) => !prev)}
              sx={{
                bgcolor: soundEnabled ? '#16a34a' : 'transparent',
                color: soundEnabled ? '#ffffff' : '#64748b',
                borderColor: '#cbd5e1',
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': { bgcolor: soundEnabled ? '#15803d' : '#f1f5f9' },
              }}
            >
              {soundEnabled ? 'Sonido ON' : 'Silenciado'}
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryModalOpen(true)}
            sx={{
              borderColor: '#cbd5e1',
              color: '#334155',
              bgcolor: '#ffffff',
              borderRadius: '12px',
              fontWeight: 800,
              textTransform: 'none',
              px: 2,
              py: 0.9,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
            }}
          >
            Historial Despachadas ({deliveredHistory.length})
          </Button>

          <Button
            variant="contained"
            startIcon={<BellIcon />}
            onClick={() => playKitchenBellSound()}
            sx={{
              bgcolor: '#1e290b',
              color: '#ffffff',
              borderRadius: '12px',
              fontWeight: 800,
              px: 2,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(30, 41, 11, 0.25)',
              '&:hover': { bgcolor: '#0f172a' },
            }}
          >
            Timbre Chef 🔔
          </Button>
        </Stack>
      </Box>

      {/* KPI Counters Strip */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total Activas', count: totalActive, color: '#1e290b', bg: '#ffffff' },
          { label: 'Por Iniciar', count: newOrdersCount, color: '#0284c7', bg: '#f0f9ff' },
          { label: 'En Fuego / Preparación', count: inPrepCount, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Listas en Pasaplatos', count: readyCount, color: '#16a34a', bg: '#f0fdf4' },
        ].map((kpi, idx) => (
          <Grid size={{ xs: 6, sm: 3 }} key={idx}>
            <Paper
              elevation={0}
              sx={{
                p: 1.6,
                borderRadius: 3,
                bgcolor: kpi.bg,
                border: `1.5px solid ${kpi.color}30`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {kpi.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1.1, mt: 0.3 }}>
                {kpi.count}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* BATCH PRODUCTION SUMMARY (PANELES CONSOLIDADOS EN FUEGO) */}
      {batchProductionSummary.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 3,
            bgcolor: '#1e290b',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(30, 41, 11, 0.15)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FireIcon sx={{ color: '#84cc16' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase', color: '#ecfccb' }}>
                Tablero Consolidado en Fuego (Producción Acumulada):
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#a3e635', fontWeight: 700 }}>
              {batchProductionSummary.reduce((sum, item) => sum + item.quantity, 0)} unidades solicitadas en cola
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            {batchProductionSummary.slice(0, 10).map((batch, idx) => (
              <Chip
                key={idx}
                label={`${batch.quantity}x ${batch.name}`}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(132, 204, 22, 0.4)',
                  '& .MuiChip-label': { px: 1.5 },
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Culinary Stations & Channel Filter Bar */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 3, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* Station Filters */}
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: { xs: 1, md: 0 } }}>
            {[
              { id: 'ALL', label: 'Todas las Estaciones', icon: <AllStationsIcon fontSize="small" /> },
              { id: 'PARRILLA', label: 'Parrilla & Horno', icon: <GrillIcon fontSize="small" /> },
              { id: 'COCINA_CALIENTE', label: 'Cocina Caliente', icon: <HotKitchenIcon fontSize="small" /> },
              { id: 'ENSALADAS_FRIOS', label: 'Ensaladas & Fríos', icon: <ColdStationIcon fontSize="small" /> },
              { id: 'BARRA', label: 'Barra & Bebidas', icon: <BarIcon fontSize="small" /> },
            ].map((st) => {
              const isSelected = selectedStation === st.id;
              return (
                <Chip
                  key={st.id}
                  icon={st.icon}
                  label={st.label}
                  onClick={() => setSelectedStation(st.id as CulinaryStation)}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    py: 2,
                    px: 1.2,
                    bgcolor: isSelected ? '#1e290b' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: `1.5px solid ${isSelected ? '#1e290b' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: isSelected ? '#0f172a' : '#edf2f7' },
                  }}
                />
              );
            })}
          </Box>

          {/* Quick Search & Channel Filter */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 0.5, bgcolor: '#f1f5f9', p: 0.4, borderRadius: '12px' }}>
              <Button
                size="small"
                onClick={() => setFilterMode('ALL')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  bgcolor: filterMode === 'ALL' ? '#ffffff' : 'transparent',
                  color: filterMode === 'ALL' ? '#1e290b' : '#64748b',
                  boxShadow: filterMode === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Todos ({orders.length})
              </Button>
              <Button
                size="small"
                onClick={() => setFilterMode('SALON')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  bgcolor: filterMode === 'SALON' ? '#ffffff' : 'transparent',
                  color: filterMode === 'SALON' ? '#1e290b' : '#64748b',
                  boxShadow: filterMode === 'SALON' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Salón ({salonCount})
              </Button>
              <Button
                size="small"
                onClick={() => setFilterMode('DOMICILIOS')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  bgcolor: filterMode === 'DOMICILIOS' ? '#ffffff' : 'transparent',
                  color: filterMode === 'DOMICILIOS' ? '#1e290b' : '#64748b',
                  boxShadow: filterMode === 'DOMICILIOS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Domicilios ({deliveryCount})
              </Button>
            </Box>

            <TextField
              size="small"
              placeholder="Buscar mesa, comanda o plato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />
          </Stack>
        </Box>
      </Paper>

      {/* Mobile Column Switcher (Optimizado para Celulares y Tablets en Cocina) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, mb: 2, overflowX: 'auto', pb: 0.5 }}>
        <Chip
          label={`Todos (${filteredOrders.length})`}
          onClick={() => setActiveMobileColumn('ALL')}
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            borderRadius: '12px',
            bgcolor: activeMobileColumn === 'ALL' ? '#1e290b' : '#f8fafc',
            color: activeMobileColumn === 'ALL' ? '#ffffff' : '#475569',
            border: `1px solid ${activeMobileColumn === 'ALL' ? '#1e290b' : '#e2e8f0'}`
          }}
        />
        <Chip
          label={`🛎️ Entrantes (${newOrdersCount})`}
          onClick={() => setActiveMobileColumn('NEW')}
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            borderRadius: '12px',
            bgcolor: activeMobileColumn === 'NEW' ? '#0284c7' : '#f8fafc',
            color: activeMobileColumn === 'NEW' ? '#ffffff' : '#475569',
            border: `1px solid ${activeMobileColumn === 'NEW' ? '#0284c7' : '#e2e8f0'}`
          }}
        />
        <Chip
          label={`🔥 En Fuego (${inPrepCount})`}
          onClick={() => setActiveMobileColumn('PREP')}
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            borderRadius: '12px',
            bgcolor: activeMobileColumn === 'PREP' ? '#ea580c' : '#f8fafc',
            color: activeMobileColumn === 'PREP' ? '#ffffff' : '#475569',
            border: `1px solid ${activeMobileColumn === 'PREP' ? '#ea580c' : '#e2e8f0'}`
          }}
        />
        <Chip
          label={`✅ Listos (${readyCount})`}
          onClick={() => setActiveMobileColumn('READY')}
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            borderRadius: '12px',
            bgcolor: activeMobileColumn === 'READY' ? '#16a34a' : '#f8fafc',
            color: activeMobileColumn === 'READY' ? '#ffffff' : '#475569',
            border: `1px solid ${activeMobileColumn === 'READY' ? '#16a34a' : '#e2e8f0'}`
          }}
        />
      </Box>

      {/* 3-Column Kanban Board */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: activeMobileColumn === 'ALL' || activeMobileColumn === 'NEW' ? 'block' : 'none', md: 'block' } }}>
          {renderColumn(
            'NUEVOS ENTRANTES',
            ['CREADO', 'CONFIRMADO', 'EN_COCINA', 'PAGADO'],
            '🔥 Iniciar Preparación',
            'EN_PREPARACION',
            {
              headerColor: '#0284c7',
              badgeBg: '#e0f2fe',
              borderColor: '#bae6fd',
              icon: <RoomServiceIcon sx={{ color: '#0284c7' }} />,
            }
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: activeMobileColumn === 'ALL' || activeMobileColumn === 'PREP' ? 'block' : 'none', md: 'block' } }}>
          {renderColumn(
            'EN FUEGO / PREPARACIÓN',
            ['EN_PREPARACION'],
            '✅ Marcar ¡Listo para Servir!',
            'LISTO',
            {
              headerColor: '#ea580c',
              badgeBg: '#ffedd5',
              borderColor: '#fed7aa',
              icon: <FireIcon sx={{ color: '#ea580c' }} />,
            }
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: activeMobileColumn === 'ALL' || activeMobileColumn === 'READY' ? 'block' : 'none', md: 'block' } }}>
          {renderColumn(
            'LISTOS EN PASAPLATOS',
            ['LISTO'],
            '🍽️ Entregado / Servido',
            'ENTREGADO',
            {
              headerColor: '#16a34a',
              badgeBg: '#dcfce7',
              borderColor: '#bbf7d0',
              icon: <CheckCircleIcon sx={{ color: '#16a34a' }} />,
            }
          )}
        </Grid>
      </Grid>

      {/* DIALOG: HISTORIAL DE COMANDAS DESPACHADAS */}
      <Dialog
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: '12px', color: '#1e290b', display: 'flex' }}>
              <HistoryIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                Historial de Comandas Despachadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Últimos pedidos entregados al salón o despachados a domicilio
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setHistoryModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por comanda, mesa, cliente o producto..."
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: '#f8fafc', mb: 2 }
              }
            }}
          />

          {deliveredHistory.filter((o) => {
            const q = historySearchQuery.toLowerCase().trim();
            if (!q) return true;
            return (
              (o.orderNumber || '').toLowerCase().includes(q) ||
              (o.tableName || '').toLowerCase().includes(q) ||
              (o.waiterName || '').toLowerCase().includes(q) ||
              (o.customerName || '').toLowerCase().includes(q) ||
              (o.items || []).some((it) => it.productName.toLowerCase().includes(q))
            );
          }).length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                No hay comandas despachadas recientemente que coincidan con la búsqueda.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 0.5 }}>
              {deliveredHistory
                .filter((o) => {
                  const q = historySearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    (o.orderNumber || '').toLowerCase().includes(q) ||
                    (o.tableName || '').toLowerCase().includes(q) ||
                    (o.waiterName || '').toLowerCase().includes(q) ||
                    (o.customerName || '').toLowerCase().includes(q) ||
                    (o.items || []).some((it) => it.productName.toLowerCase().includes(q))
                  );
                })
                .map((ord) => (
                  <Paper
                    key={ord.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid #e2e8f0',
                      borderRadius: 3,
                      bgcolor: '#ffffff',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          #{ord.orderNumber}
                        </Typography>
                        <Chip
                          label={ord.tableName || (ord.type === 'DOMICILIO' ? 'Domicilio' : 'Mesa Salón')}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: ord.type === 'DOMICILIO' ? '#ffedd5' : '#e0f2fe',
                            color: ord.type === 'DOMICILIO' ? '#c2410c' : '#0369a1',
                            fontSize: '0.72rem'
                          }}
                        />
                        <Chip
                          label="DESPACHADO"
                          size="small"
                          sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.68rem' }}
                        />
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<ReopenIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleReopenOrder(ord)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          borderColor: '#fde047',
                          color: '#ca8a04',
                          bgcolor: '#fefce8',
                          '&:hover': { bgcolor: '#fef9c3', borderColor: '#eab308' }
                        }}
                      >
                        Reabrir a Cocina
                      </Button>
                    </Box>

                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                      Atendido por: <strong>{ord.waiterName || 'Mesero'}</strong> • Hora: {new Date(ord.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>

                    <Divider sx={{ my: 1, borderColor: '#f1f5f9' }} />

                    <List dense disablePadding>
                      {ord.items.map((it, idx) => (
                        <ListItem key={idx} disableGutters sx={{ py: 0.3 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                                <span style={{ color: '#65a30d', fontWeight: 900 }}>{it.quantity}x</span> {it.productName}
                              </Typography>
                            }
                            secondary={
                              <>
                                {it.modifiers && it.modifiers.length > 0 && (
                                  <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600, display: 'block' }}>
                                    + {it.modifiers.map((m) => m.name).join(', ')}
                                  </Typography>
                                )}
                                {it.notes && (
                                  <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>
                                    ⚠️ {it.notes}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setHistoryModalOpen(false)}
            variant="contained"
            sx={{
              bgcolor: '#1e290b',
              color: '#ffffff',
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#2e3d14' }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
