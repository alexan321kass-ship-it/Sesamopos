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
  Divider,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  TwoWheeler as MotorbikeIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  Print as PrintIcon,
  CreditCard as CardIcon,
  AttachMoney as CashIcon,
  Timer as TimerIcon,
  Send as SendIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
  AccountBalanceWallet as SettlementIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  Fastfood as FoodIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { DeliveryOrder, DeliveryStatus, Product, Customer, StaffMember } from '../types';
import { useAuthStore } from '../store/authStore';
import { parseDateOrTimestamp } from '../utils/timeUtils';

// Status color and styling configuration
const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'primary'; bg: string; text: string; border: string }
> = {
  PENDIENTE: { label: 'Por Iniciar', color: 'warning', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  EN_PREPARACION: { label: 'En Cocina', color: 'info', bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  EN_CAMINO: { label: 'En Ruta (Con Rider)', color: 'primary', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  ENTREGADO: { label: 'Entregado con Éxito', color: 'success', bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  CANCELADO: { label: 'Cancelado', color: 'error', bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
};

export default function DeliveryScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isRider = user?.role === 'REPARTIDOR';
  const canManageDeliveries = ['ADMINISTRADOR', 'GERENTE', 'CAJERO'].includes(user?.role || '');

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // View modes: 'kanban' | 'list'
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Partial<DeliveryOrder> | null>(null);

  const [dispatchModalOrder, setDispatchModalOrder] = useState<DeliveryOrder | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  const [printModalOrder, setPrintModalOrder] = useState<DeliveryOrder | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<DeliveryOrder | null>(null);
  const [settlementModalRider, setSettlementModalRider] = useState<{ id: string; name: string; phone: string; cashTotal: number; ordersCount: number; orders: DeliveryOrder[] } | null>(null);

  // Items builder in Create Modal
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);

  // Snackbar feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [delList, prodList, custList, staffList] = await Promise.all([
        mockApi.deliveries.getAll(),
        mockApi.products.getAll(),
        mockApi.customers.getAll(),
        mockApi.staff.getAll(),
      ]);
      setDeliveries(delList || []);
      setProducts(prodList || []);
      setCustomers(custList || []);
      setStaff(staffList || []);
    } catch (err) {
      console.error('Error cargando domicilios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_deliveries_updated', handleUpdate);
    window.addEventListener('sesamo_order_created', handleUpdate);
    window.addEventListener('sesamo_cash_updated', handleUpdate);

    // Heartbeat de sincronización periódica en vivo para tablets y terminales
    const interval = setInterval(() => loadData(), 3000);

    return () => {
      window.removeEventListener('sesamo_deliveries_updated', handleUpdate);
      window.removeEventListener('sesamo_order_created', handleUpdate);
      window.removeEventListener('sesamo_cash_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Filter delivery riders from staff
  const availableRiders = useMemo(() => {
    return staff.filter(
      (s) =>
        s.role === 'REPARTIDOR' ||
        s.name.toLowerCase().includes('morales') ||
        s.name.toLowerCase().includes('domicilio') ||
        s.name.toLowerCase().includes('repartidor')
    );
  }, [staff]);

  // KPIs
  const kpis = useMemo(() => {
    const activeOrders = deliveries.filter(
      (d) => d.deliveryStatus === 'PENDIENTE' || d.deliveryStatus === 'EN_PREPARACION' || d.deliveryStatus === 'EN_CAMINO'
    );
    const inRouteOrders = deliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO');
    const deliveredToday = deliveries.filter((d) => d.deliveryStatus === 'ENTREGADO');
    const totalSales = deliveredToday.reduce((sum, d) => sum + (d.total || 0), 0);
    const avgTicket = deliveredToday.length > 0 ? Math.round(totalSales / deliveredToday.length) : 0;

    // Cash collected on streets pending settlement
    const pendingCashInStreet = inRouteOrders
      .filter((d) => d.paymentMethod === 'EFECTIVO' && !d.isSettled)
      .reduce((sum, d) => sum + (d.total || 0), 0);

    return {
      activeCount: activeOrders.length,
      inRouteCount: inRouteOrders.length,
      deliveredTodayCount: deliveredToday.length,
      totalSales,
      avgTicket,
      pendingCashInStreet,
    };
  }, [deliveries]);

  // KPIs específicos para el perfil Repartidor
  const riderKpis = useMemo(() => {
    const riderFirstName = user?.name ? user.name.split(' ')[0].toLowerCase() : '';
    const myOrders = deliveries.filter(d => 
      d.deliveryRiderId === user?.id ||
      (d.deliveryRiderName && riderFirstName && d.deliveryRiderName.toLowerCase().includes(riderFirstName))
    );

    const activeCount = myOrders.filter(d => ['PENDIENTE', 'EN_PREPARACION', 'EN_CAMINO'].includes(d.deliveryStatus)).length;
    const inRouteCount = myOrders.filter(d => d.deliveryStatus === 'EN_CAMINO').length;
    const deliveredCount = myOrders.filter(d => d.deliveryStatus === 'ENTREGADO').length;

    const cashCollected = myOrders
      .filter(d => d.deliveryStatus === 'ENTREGADO' && d.paymentMethod === 'EFECTIVO' && !d.isSettled)
      .reduce((sum, d) => sum + (d.total || 0), 0);

    const feesEarned = myOrders
      .filter(d => d.deliveryStatus === 'ENTREGADO')
      .reduce((sum, d) => sum + (d.deliveryFee || 5000), 0);

    return {
      activeCount,
      inRouteCount,
      deliveredCount,
      cashCollected,
      feesEarned,
      totalCount: myOrders.length,
    };
  }, [deliveries, user]);

  // Cash settlement summary per rider
  const riderSettlementList = useMemo(() => {
    const map: Record<string, { id: string; name: string; phone: string; cashTotal: number; ordersCount: number; orders: DeliveryOrder[] }> = {};

    deliveries.forEach((d) => {
      if ((d.deliveryStatus === 'EN_CAMINO' || d.deliveryStatus === 'ENTREGADO') && !d.isSettled) {
        const riderId = d.deliveryRiderId || '9';
        const riderName = d.deliveryRiderName || 'Kevin Morales';
        const riderPhone = d.deliveryRiderPhone || '3145556677';

        if (!map[riderId]) {
          map[riderId] = {
            id: riderId,
            name: riderName,
            phone: riderPhone,
            cashTotal: 0,
            ordersCount: 0,
            orders: [],
          };
        }

        map[riderId].ordersCount++;
        map[riderId].orders.push(d);
        if (d.paymentMethod === 'EFECTIVO') {
          map[riderId].cashTotal += d.total || 0;
        }
      }
    });

    return Object.values(map);
  }, [deliveries]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries
      .filter((d) => {
        // Restricción de seguridad: los repartidores solo visualizan los domicilios que les han sido asignados
        if (isRider) {
          const riderName = user?.name ? user.name.split(' ')[0].toLowerCase() : '';
          const isMyDelivery =
            d.deliveryRiderId === user?.id ||
            (d.deliveryRiderName && riderName && d.deliveryRiderName.toLowerCase().includes(riderName));
          if (!isMyDelivery) return false;
        }

        const q = searchQuery.toLowerCase();
        const matchesSearch =
          d.orderNumber.toLowerCase().includes(q) ||
          d.customer.name.toLowerCase().includes(q) ||
          d.customer.phone.includes(q) ||
          d.deliveryAddress.toLowerCase().includes(q) ||
          (d.deliveryRiderName && d.deliveryRiderName.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Tab filter
        if (activeTab === 'ACTIVOS') {
          if (d.deliveryStatus === 'ENTREGADO' || d.deliveryStatus === 'CANCELADO') return false;
        } else {
          if (d.deliveryStatus !== 'ENTREGADO' && d.deliveryStatus !== 'CANCELADO') return false;
        }

        // Dropdown status filter
        if (statusFilter !== 'TODOS' && d.deliveryStatus !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => (parseDateOrTimestamp(b.createdAt) || 0) - (parseDateOrTimestamp(a.createdAt) || 0));
  }, [deliveries, searchQuery, activeTab, statusFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const firstProd = products[0];
    setSelectedItems([{ productId: firstProd ? firstProd.id : '1', quantity: 1 }]);
    setEditingDelivery({
      orderNumber: `DOM-${Date.now().toString().slice(-4)}`,
      customer: {
        id: customers[0]?.id || '1',
        name: customers[0]?.name || 'Cliente Domicilio',
        phone: customers[0]?.phone || '3001234567',
        address: customers[0]?.address || 'Calle 10 # 20-30',
        loyaltyPoints: 0,
        totalOrders: 1,
      },
      deliveryAddress: customers[0]?.address || 'Calle 10 # 20-30',
      deliveryCity: customers[0]?.city || 'Medellín',
      deliveryZone: 'Laureles',
      deliveryFee: 5000,
      paymentMethod: 'EFECTIVO',
      cashAmountPaidWith: 50000,
      deliveryStatus: 'PENDIENTE',
      status: 'EN_PREPARACION',
      deliveryNotes: '',
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (order: DeliveryOrder) => {
    setEditingDelivery(JSON.parse(JSON.stringify(order)));
    setSelectedItems(
      (order.items || []).map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    setIsCreateModalOpen(true);
  };

  // Save Delivery Order
  const handleSaveDelivery = async () => {
    if (!editingDelivery || !editingDelivery.customer?.name?.trim()) {
      setSnackbar({ open: true, message: 'El nombre del cliente es obligatorio.', severity: 'error' });
      return;
    }
    if (!editingDelivery.customer?.phone?.trim()) {
      setSnackbar({ open: true, message: 'El teléfono es obligatorio.', severity: 'error' });
      return;
    }
    if (!editingDelivery.deliveryAddress?.trim()) {
      setSnackbar({ open: true, message: 'La dirección de entrega es obligatoria.', severity: 'error' });
      return;
    }
    if (selectedItems.length === 0) {
      setSnackbar({ open: true, message: 'Selecciona al menos un producto para el pedido.', severity: 'error' });
      return;
    }

    try {
      let subtotal = 0;
      const orderItems = selectedItems.map((sel, idx) => {
        const prod = products.find((p) => p.id === sel.productId);
        const unitPrice = prod?.price || 20000;
        const totalPrice = unitPrice * sel.quantity;
        subtotal += totalPrice;
        return {
          id: `item-${idx + 1}`,
          productId: sel.productId,
          productName: prod?.name || 'Producto',
          quantity: sel.quantity,
          unitPrice,
          totalPrice,
          modifiers: [],
        };
      });

      const deliveryFee = Number(editingDelivery.deliveryFee) || 5000;
      const total = subtotal + deliveryFee;

      const fullOrder: DeliveryOrder = {
        id: editingDelivery.id || `${Date.now()}`,
        orderNumber: editingDelivery.orderNumber || `DOM-${Date.now().toString().slice(-4)}`,
        createdAt: editingDelivery.createdAt || Date.now(),
        type: 'DOMICILIO',
        status: editingDelivery.status || 'EN_PREPARACION',
        deliveryStatus: editingDelivery.deliveryStatus || 'PENDIENTE',
        customer: editingDelivery.customer as Customer,
        deliveryAddress: editingDelivery.deliveryAddress,
        deliveryCity: editingDelivery.deliveryCity || 'Medellín',
        deliveryZone: editingDelivery.deliveryZone || 'Salón / Centro',
        deliveryFee,
        subtotal,
        discount: 0,
        tax: 0,
        total,
        items: orderItems,
        paymentMethod: editingDelivery.paymentMethod || 'EFECTIVO',
        cashAmountPaidWith: editingDelivery.cashAmountPaidWith,
        deliveryNotes: editingDelivery.deliveryNotes,
        estimatedDeliveryTime: editingDelivery.estimatedDeliveryTime || (Date.now() + 2400000),
      };

      if (editingDelivery.id) {
        await mockApi.deliveries.update(editingDelivery.id, fullOrder);
        setSnackbar({ open: true, message: `Domicilio #${fullOrder.orderNumber} actualizado.`, severity: 'success' });
      } else {
        await mockApi.deliveries.create(fullOrder);
        setSnackbar({ open: true, message: `Domicilio #${fullOrder.orderNumber} creado exitosamente.`, severity: 'success' });
      }

      setIsCreateModalOpen(false);
      setEditingDelivery(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al registrar el domicilio.', severity: 'error' });
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = (order: DeliveryOrder) => {
    setDispatchModalOrder(order);
    const defaultRider = availableRiders[0];
    setSelectedRiderId(order.deliveryRiderId || (defaultRider ? defaultRider.id : '9'));
  };

  // Confirm Dispatch Order
  const handleConfirmDispatch = async () => {
    if (!dispatchModalOrder) return;
    const rider = staff.find((s) => s.id === selectedRiderId) || availableRiders[0];
    const riderName = rider ? rider.name : 'Kevin Morales';
    const riderPhone = rider ? rider.phone : '+57 314 555 6677';

    try {
      await mockApi.deliveries.dispatchOrder(dispatchModalOrder.id, selectedRiderId, riderName, riderPhone);
      setSnackbar({
        open: true,
        message: `¡Orden #${dispatchModalOrder.orderNumber} despachada con ${riderName}!`,
        severity: 'success',
      });
      setDispatchModalOrder(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al despachar el pedido.', severity: 'error' });
    }
  };

  // Mark Delivered
  const handleMarkDelivered = async (order: DeliveryOrder) => {
    try {
      await mockApi.deliveries.markDelivered(order.id);
      setSnackbar({
        open: true,
        message: `¡Orden #${order.orderNumber} marcada como ENTREGADA!`,
        severity: 'success',
      });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al marcar como entregado.', severity: 'error' });
    }
  };

  // Cancel Delivery
  const handleCancelDelivery = async (order: DeliveryOrder) => {
    if (window.confirm(`¿Confirmas cancelar la orden #${order.orderNumber}?`)) {
      try {
        await mockApi.deliveries.cancelOrder(order.id, 'Cancelado por el usuario');
        setSnackbar({ open: true, message: `Orden #${order.orderNumber} cancelada.`, severity: 'info' });
        loadData();
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Error al cancelar la orden.', severity: 'error' });
      }
    }
  };

  // Delete Delivery
  const handleDeleteDelivery = async (order: DeliveryOrder) => {
    try {
      await mockApi.deliveries.delete(order.id);
      setDeleteConfirmOrder(null);
      setSnackbar({ open: true, message: 'Domicilio eliminado del sistema.', severity: 'info' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar el pedido.', severity: 'error' });
    }
  };

  // Execute Rider Cash Settlement into active Cash Register
  const handleSettleRiderCash = async () => {
    if (!settlementModalRider) return;
    try {
      if (settlementModalRider.cashTotal > 0) {
        await mockApi.cash.addMovement(
          'INGRESO',
          settlementModalRider.cashTotal,
          `Liquidación Domicilios: ${settlementModalRider.name} (${settlementModalRider.ordersCount} entregas)`
        );
      }

      // Mark orders as settled
      for (const ord of settlementModalRider.orders) {
        await mockApi.deliveries.update(ord.id, { isSettled: true, settledAt: Date.now() });
      }

      setSnackbar({
        open: true,
        message: `¡Liquidación completada! $${settlementModalRider.cashTotal.toLocaleString()} COP ingresados exitosamente a la caja registradora.`,
        severity: 'success',
      });
      setSettlementModalRider(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al liquidar el efectivo en caja.', severity: 'error' });
    }
  };

  // WhatsApp Customer notification
  const handleWhatsAppCustomer = (order: DeliveryOrder) => {
    const cleanPhone = order.customer.phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const statusText =
      order.deliveryStatus === 'EN_CAMINO'
        ? '🛵 *¡Tu pedido ya está en camino!*'
        : order.deliveryStatus === 'EN_PREPARACION'
        ? '🍳 *Tu pedido está en cocina en preparación caliente.*'
        : '📋 *Tu pedido ha sido recibido y confirmado.*';

    const message = `Hola ${order.customer.name}! 👋 Gracias por elegir *Restaurante Sésamo*.\n\n${statusText}\n\n📦 *Orden:* #${order.orderNumber}\n📍 *Dirección de Entrega:* ${order.deliveryAddress}\n💵 *Total:* $${order.total.toLocaleString()} COP [${order.paymentMethod}]\n🛵 *Repartidor Asignado:* ${order.deliveryRiderName || 'Brigada Sésamo'}\n\nCualquier indicación adicional para el repartidor puedes responder a este chat. ¡Buen provecho! 🌱`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Rider dispatch message
  const handleWhatsAppRider = (order: DeliveryOrder) => {
    const phone = order.deliveryRiderPhone || '+573145556677';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const changeText =
      order.paymentMethod === 'EFECTIVO' && order.cashAmountPaidWith
        ? `\n💵 *Paga con:* $${order.cashAmountPaidWith.toLocaleString()} COP\n🪙 *Llevar vueltas exactas de:* $${(order.cashAmountPaidWith - order.total).toLocaleString()} COP`
        : '';

    const itemsSummary = (order.items || []).map((it) => `• ${it.quantity}x ${it.productName}`).join('\n');

    const message = `🛵 *NUEVA RUTA DE ENTREGA - SÉSAMO*\n\n📦 *Orden:* #${order.orderNumber}\n👤 *Cliente:* ${order.customer.name} (Tel: ${order.customer.phone})\n📍 *Dirección:* ${order.deliveryAddress} - ${order.deliveryCity || 'Medellín'}\n📝 *Notas portería/timbre:* ${order.deliveryNotes || 'Sin notas especiales'}\n\n🍴 *Platos a Entregar:*\n${itemsSummary}\n\n💰 *Total a Cobrar:* $${order.total.toLocaleString()} COP [${order.paymentMethod}]${changeText}\n\n🗺️ *Ubicación Maps:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress + ', ' + (order.deliveryCity || 'Medellín'))}`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Navigation Links
  const handleOpenGoogleMaps = (order: DeliveryOrder) => {
    const query = encodeURIComponent(`${order.deliveryAddress}, ${order.deliveryCity || 'Medellín'}, Colombia`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleOpenWaze = (order: DeliveryOrder) => {
    const query = encodeURIComponent(`${order.deliveryAddress}, ${order.deliveryCity || 'Medellín'}`);
    window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank');
  };

  // Print Dispatch Ticket
  const handlePrintTicket = (order: DeliveryOrder) => {
    setPrintModalOrder(order);
  };

  // Add/Remove Item rows in form
  const handleAddItemRow = () => {
    const firstProd = products[0];
    setSelectedItems([...selectedItems, { productId: firstProd ? firstProd.id : '1', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemRow = (index: number, field: 'productId' | 'quantity', value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#1e290b' }}>
          Cargando Centro de Despacho & Domicilios Sésamo...
        </Typography>
        <LinearProgress sx={{ borderRadius: 2, height: 8, bgcolor: '#f0fdf4', '& .MuiLinearProgress-bar': { bgcolor: '#84cc16' } }} />
      </Box>
    );
  }

  // Render Single Delivery Card
  const renderDeliveryCard = (delivery: DeliveryOrder) => {
    const statusCfg = STATUS_CONFIG[delivery.deliveryStatus] || STATUS_CONFIG.PENDIENTE;
    const timeDiffMin = Math.round((Date.now() - parseDateOrTimestamp(delivery.createdAt)) / 60000);
    const changeRequired =
      delivery.paymentMethod === 'EFECTIVO' && delivery.cashAmountPaidWith
        ? Math.max(0, delivery.cashAmountPaidWith - delivery.total)
        : 0;

    return (
      <Card
        key={delivery.id}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1.5px solid',
          borderColor: delivery.deliveryStatus === 'EN_CAMINO' ? '#84cc16' : '#e2e8f0',
          p: 2.2,
          bgcolor: delivery.deliveryStatus === 'EN_CAMINO' ? '#fbfdfa' : '#ffffff',
          boxShadow: delivery.deliveryStatus === 'EN_CAMINO' ? '0 4px 16px rgba(132, 204, 22, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box>
          {/* Top Bar: Order Number, Elapsed Time, Status Chip */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1 }}>
                #{delivery.orderNumber}
              </Typography>
              <Chip
                icon={<TimerIcon sx={{ fontSize: 13 }} />}
                label={`${timeDiffMin} min`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: timeDiffMin > 35 ? '#fee2e2' : timeDiffMin > 20 ? '#fef3c7' : '#ecfccb',
                  color: timeDiffMin > 35 ? '#b91c1c' : timeDiffMin > 20 ? '#b45309' : '#3f6212',
                }}
              />
            </Box>

            <Chip
              label={statusCfg.label}
              size="small"
              sx={{
                bgcolor: statusCfg.bg,
                color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
                fontWeight: 800,
                fontSize: '0.7rem',
                height: 24,
              }}
            />
          </Box>

          {/* Customer & Destination Block */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              mb: 1.8,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', fontWeight: 900, bgcolor: '#1e290b', color: '#84cc16' }}>
                  {delivery.customer.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1 }}>
                    {delivery.customer.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {delivery.customer.phone}
                  </Typography>
                </Box>
              </Box>

              <Button
                size="small"
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => handleWhatsAppCustomer(delivery)}
                sx={{
                  py: 0.3,
                  px: 1,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: '#25D366',
                  color: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#1ea952' },
                }}
              >
                WhatsApp
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8, mt: 0.5 }}>
              <LocationIcon sx={{ fontSize: 18, color: '#ea580c', mt: 0.2, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>
                  {delivery.deliveryAddress}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {delivery.deliveryCity || 'Medellín'} • Zona: <strong>{delivery.deliveryZone || 'Salón / Centro'}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Direct Navigation Buttons (Maps & Waze) */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={() => handleOpenGoogleMaps(delivery)}
                sx={{
                  py: 0.2,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                }}
              >
                Google Maps
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<NavigationIcon />}
                onClick={() => handleOpenWaze(delivery)}
                sx={{
                  py: 0.2,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  borderColor: '#cbd5e1',
                  color: '#0284c7',
                }}
              >
                Waze
              </Button>
            </Box>

            {delivery.deliveryNotes && (
              <Box sx={{ mt: 1, p: 0.8, bgcolor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, display: 'block' }}>
                  📝 Nota: {delivery.deliveryNotes}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Dish items summary */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
              Contenido del Pedido ({delivery.items?.length || 0} platos):
            </Typography>
            <Stack spacing={0.4}>
              {(delivery.items || []).map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e290b', fontSize: '0.85rem' }}>
                    <span style={{ color: '#65a30d', fontWeight: 900 }}>{item.quantity}x</span> {item.productName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                    ${item.totalPrice.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ my: 1.2, borderColor: '#f1f5f9' }} />

          {/* Payment & Financials */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Método de Pago:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                {delivery.paymentMethod === 'EFECTIVO' ? (
                  <Chip icon={<CashIcon sx={{ fontSize: '14px !important' }} />} label="Efectivo" size="small" color="success" sx={{ fontWeight: 800, height: 22, fontSize: '0.68rem' }} />
                ) : delivery.paymentMethod === 'DATAFONO' ? (
                  <Chip icon={<CardIcon sx={{ fontSize: '14px !important' }} />} label="Datáfono" size="small" color="primary" sx={{ fontWeight: 800, height: 22, fontSize: '0.68rem' }} />
                ) : (
                  <Chip label="Nequi / Transf." size="small" color="info" sx={{ fontWeight: 800, height: 22, fontSize: '0.68rem' }} />
                )}
              </Box>
              {delivery.paymentMethod === 'EFECTIVO' && changeRequired > 0 && (
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, display: 'block', mt: 0.5 }}>
                  🪙 Vueltas: ${changeRequired.toLocaleString()}
                </Typography>
              )}
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Total con Envío:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1 }}>
                ${delivery.total.toLocaleString()} COP
              </Typography>
              <Typography variant="caption" sx={{ color: '#65a30d', fontWeight: 700 }}>
                Envío: ${Number(delivery.deliveryFee || 5000).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {/* Assigned Rider Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, mb: 1.8, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: delivery.deliveryRiderName ? '#1e290b' : '#cbd5e1', color: '#ffffff' }}>
                <MotorbikeIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1 }}>
                  Motorizado:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  {delivery.deliveryRiderName || 'Sin asignar'}
                </Typography>
              </Box>
            </Box>

            {delivery.deliveryRiderName && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ChatIcon />}
                onClick={() => handleWhatsAppRider(delivery)}
                sx={{
                  py: 0.2,
                  px: 1,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  color: '#1e290b',
                  borderColor: '#cbd5e1',
                }}
              >
                Ruta Rider
              </Button>
            )}
          </Box>
        </Box>

        {/* Operational Touch Action Button */}
        <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
          {(delivery.deliveryStatus === 'PENDIENTE' || delivery.deliveryStatus === 'EN_PREPARACION') && canManageDeliveries && (
            <Button
              fullWidth
              variant="contained"
              startIcon={<MotorbikeIcon />}
              onClick={() => handleOpenDispatchModal(delivery)}
              sx={{
                mb: 1,
                bgcolor: '#1e290b',
                color: '#ffffff',
                fontWeight: 900,
                borderRadius: '12px',
                py: 1.2,
                boxShadow: '0 4px 14px rgba(30, 41, 11, 0.25)',
                '&:hover': { bgcolor: '#0f172a' },
              }}
            >
              Despachar Pedido (Asignar Ruta)
            </Button>
          )}

          {delivery.deliveryStatus === 'EN_CAMINO' && (
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleMarkDelivered(delivery)}
              sx={{
                mb: 1,
                fontWeight: 900,
                borderRadius: '12px',
                py: 1.2,
                bgcolor: '#16a34a',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                '&:hover': { bgcolor: '#15803d' },
              }}
            >
              Marcar como Entregado
            </Button>
          )}

          {/* Secondary Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canManageDeliveries && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleOpenEditModal(delivery)}
                sx={{ flex: 1, fontWeight: 700, borderRadius: '8px' }}
              >
                Editar
              </Button>
            )}
            <Tooltip title="Imprimir Tirilla de Salida (80mm)">
              <IconButton
                size="small"
                onClick={() => handlePrintTicket(delivery)}
                sx={{ border: '1px solid #cbd5e1', borderRadius: '8px', flex: isRider ? 1 : undefined }}
              >
                <PrintIcon fontSize="small" />
                {isRider && <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700 }}>Tirilla Comprobante</Typography>}
              </IconButton>
            </Tooltip>
            {canManageDeliveries && delivery.deliveryStatus !== 'CANCELADO' && delivery.deliveryStatus !== 'ENTREGADO' && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleCancelDelivery(delivery)}
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              >
                Cancelar
              </Button>
            )}
            {canManageDeliveries && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteConfirmOrder(delivery)}
                sx={{ border: '1px solid #fee2e2', borderRadius: '8px' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Card>
    );
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Bar with Sésamo Style */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: '#ecfccb', borderRadius: '14px', color: '#65a30d', display: 'flex' }}>
              <MotorbikeIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                Centro de Despacho & Domicilios Express
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Control logístico de rutas, asignación de motorizados, tracking WhatsApp y liquidación en caja.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {isRider && (
            <Chip
              icon={<MotorbikeIcon sx={{ color: '#3f6212 !important' }} />}
              label={`Ruta Activa de: ${user?.name}`}
              sx={{ bgcolor: '#ecfccb', color: '#3f6212', fontWeight: 800, fontSize: '0.85rem', height: 38 }}
            />
          )}

          {canManageDeliveries && riderSettlementList.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<SettlementIcon />}
              onClick={() => navigate('/staff?tab=repartidores')}
              sx={{
                fontWeight: 800,
                borderRadius: '12px',
                borderColor: '#84cc16',
                color: '#1e290b',
                bgcolor: '#f7fee7',
                '&:hover': { bgcolor: '#ecfccb', borderColor: '#65a30d' },
              }}
            >
              Liquidar Repartidores en Personal ({riderSettlementList.length}) ➔
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ fontWeight: 800, borderRadius: '12px', textTransform: 'none' }}
          >
            Actualizar
          </Button>

          {canManageDeliveries && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{
                fontWeight: 900,
                bgcolor: '#1e290b',
                color: '#ffffff',
                borderRadius: '12px',
                px: 2.5,
                boxShadow: '0 4px 14px rgba(30, 41, 11, 0.25)',
                '&:hover': { bgcolor: '#0f172a' },
              }}
            >
              Nuevo Domicilio
            </Button>
          )}
        </Stack>
      </Box>

      {/* 2. Top Executive KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {isRider ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Mis Asignaciones
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#ecfccb', color: '#65a30d' }}>
                    <MotorbikeIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1 }}>
                  {riderKpis.totalCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Mis pedidos en la jornada
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Mis Rutas en Curso
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#eff6ff', color: '#1d4ed8' }}>
                    <SendIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1d4ed8', lineHeight: 1.1 }}>
                  {riderKpis.inRouteCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Por entregar al cliente
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Mis Entregas Exitosas
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#f0fdf4', color: '#16a34a' }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
                  {riderKpis.deliveredCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Completadas con éxito
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1.5px solid #fed7aa', borderRadius: 3, bgcolor: '#fff7ed' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#c2410c', textTransform: 'uppercase' }}>
                    Recaudo en Efectivo
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#ffedd5', color: '#ea580c' }}>
                    <CashIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#c2410c', lineHeight: 1.1 }}>
                  ${riderKpis.cashCollected.toLocaleString()} COP
                </Typography>
                <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                  A entregar a caja en liquidación
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1.5px solid #bbf7d0', borderRadius: 3, bgcolor: '#f0fdf4' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                    Mis Fletes Ganados
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#dcfce7', color: '#16a34a' }}>
                    <TrendingUpIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
                  ${riderKpis.feesEarned.toLocaleString()} COP
                </Typography>
                <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                  Comisiones por carrera
                </Typography>
              </Paper>
            </Grid>
          </>
        ) : (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Domicilios Activos
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#ecfccb', color: '#65a30d' }}>
                    <MotorbikeIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1 }}>
                  {kpis.activeCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  En preparación y en ruta
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    En Ruta Ahora
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#eff6ff', color: '#1d4ed8' }}>
                    <SendIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1d4ed8', lineHeight: 1.1 }}>
                  {kpis.inRouteCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Motorizados en trayecto
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Entregados Hoy
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#f0fdf4', color: '#16a34a' }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
                  {kpis.deliveredTodayCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Entregas finalizadas
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Facturación Domicilios
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#ecfccb', color: '#3f6212' }}>
                    <TrendingUpIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.1 }}>
                  ${kpis.totalSales.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Ticket promedio: ${kpis.avgTicket.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper
                elevation={0}
                onClick={() => {
                  if (canManageDeliveries) {
                    navigate('/staff?tab=repartidores');
                  }
                }}
                sx={{
                  p: 2,
                  border: `1.5px solid ${kpis.pendingCashInStreet > 0 ? '#fdba74' : '#e2e8f0'}`,
                  borderRadius: 3,
                  bgcolor: kpis.pendingCashInStreet > 0 ? '#fff7ed' : '#ffffff',
                  cursor: canManageDeliveries ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  '&:hover': canManageDeliveries ? { borderColor: '#ea580c', transform: 'translateY(-2px)' } : {},
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Efectivo en Calle
                  </Typography>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#ffedd5', color: '#ea580c' }}>
                    <CashIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#c2410c', lineHeight: 1.1 }}>
                  ${kpis.pendingCashInStreet.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                  Por liquidar en caja ➔
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>

      {/* 3. Controls & View Toggle Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por orden, cliente, teléfono, dirección..."
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
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filtrar por Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="TODOS">Todos los Estados</MenuItem>
              <MenuItem value="PENDIENTE">Por Iniciar</MenuItem>
              <MenuItem value="EN_PREPARACION">En Cocina</MenuItem>
              <MenuItem value="EN_CAMINO">En Ruta</MenuItem>
              <MenuItem value="ENTREGADO">Entregados</MenuItem>
              <MenuItem value="CANCELADO">Cancelados</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 6, sm: 8, md: 5 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: 0.4, borderRadius: '12px' }}>
              <Button
                size="small"
                startIcon={<KanbanIcon />}
                onClick={() => setViewMode('kanban')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  bgcolor: viewMode === 'kanban' ? '#ffffff' : 'transparent',
                  color: viewMode === 'kanban' ? '#1e290b' : '#64748b',
                  boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Kanban
              </Button>
              <Button
                size="small"
                startIcon={<ListIcon />}
                onClick={() => setViewMode('list')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  bgcolor: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#1e290b' : '#64748b',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Lista
              </Button>
            </Box>

            {/* Tab Filter */}
            <Stack direction="row" spacing={1}>
              <Button
                variant={activeTab === 'ACTIVOS' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('ACTIVOS')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: '10px',
                  bgcolor: activeTab === 'ACTIVOS' ? '#1e290b' : 'transparent',
                  color: activeTab === 'ACTIVOS' ? '#ffffff' : '#64748b',
                }}
              >
                Activos ({deliveries.filter((d) => d.deliveryStatus !== 'ENTREGADO' && d.deliveryStatus !== 'CANCELADO').length})
              </Button>
              <Button
                variant={activeTab === 'HISTORIAL' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('HISTORIAL')}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: '10px',
                  bgcolor: activeTab === 'HISTORIAL' ? '#1e290b' : 'transparent',
                  color: activeTab === 'HISTORIAL' ? '#ffffff' : '#64748b',
                }}
              >
                Historial Finalizado
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. DISPATCH VIEW: KANBAN PIPELINE VS GRID/LIST */}
      {viewMode === 'kanban' && activeTab === 'ACTIVOS' ? (
        <Grid container spacing={2.5}>
          {/* Column 1: PENDIENTES & EN COCINA */}
          <Grid size={{ xs: 12, md: 6, lg: 6 }}>
            <Box sx={{ p: 2, borderRadius: 3.5, bgcolor: '#ffffff', border: '1.5px solid #fed7aa', minHeight: 600 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '2px solid #ffedd5' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FoodIcon sx={{ color: '#ea580c' }} />
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#c2410c' }}>
                    1. En Cocina / Por Despachar
                  </Typography>
                </Box>
                <Chip
                  label={`${filteredDeliveries.filter((d) => d.deliveryStatus === 'PENDIENTE' || d.deliveryStatus === 'EN_PREPARACION').length} pedidos`}
                  size="small"
                  sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 900 }}
                />
              </Box>

              <Stack spacing={2}>
                {filteredDeliveries
                  .filter((d) => d.deliveryStatus === 'PENDIENTE' || d.deliveryStatus === 'EN_PREPARACION')
                  .map((d) => renderDeliveryCard(d))}
                {filteredDeliveries.filter((d) => d.deliveryStatus === 'PENDIENTE' || d.deliveryStatus === 'EN_PREPARACION').length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                    <FoodIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>No hay pedidos en preparación</Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Column 2: EN RUTA CON MOTORIZADO */}
          <Grid size={{ xs: 12, md: 6, lg: 6 }}>
            <Box sx={{ p: 2, borderRadius: 3.5, bgcolor: '#ffffff', border: '1.5px solid #86efac', minHeight: 600 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '2px solid #dcfce7' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MotorbikeIcon sx={{ color: '#16a34a' }} />
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803d' }}>
                    2. En Ruta con Motorizado (En Calle)
                  </Typography>
                </Box>
                <Chip
                  label={`${filteredDeliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO').length} en camino`}
                  size="small"
                  sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 900 }}
                />
              </Box>

              <Stack spacing={2}>
                {filteredDeliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO').map((d) => renderDeliveryCard(d))}
                {filteredDeliveries.filter((d) => d.deliveryStatus === 'EN_CAMINO').length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                    <MotorbikeIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>No hay repartidores en ruta en este momento</Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      ) : (
        /* Regular Cards Grid for History or List View */
        <Grid container spacing={2.5}>
          {filteredDeliveries.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <MotorbikeIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  {activeTab === 'ACTIVOS' ? 'No hay pedidos activos en este momento' : 'No hay historial de entregas'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeTab === 'ACTIVOS'
                    ? 'Haz clic en "Nuevo Domicilio" para despachar una orden para entrega.'
                    : 'Las entregas finalizadas o canceladas aparecerán aquí.'}
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredDeliveries.map((delivery) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={delivery.id}>
                {renderDeliveryCard(delivery)}
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* MODAL: CREATE / EDIT DELIVERY */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MotorbikeIcon sx={{ color: '#1e290b' }} />
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
              {editingDelivery?.id ? 'Editar Pedido de Domicilio' : 'Registrar Nuevo Pedido a Domicilio'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsCreateModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {editingDelivery && (
            <Stack spacing={2.5}>
              {/* 1. Customer & Address */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#1e290b', mb: 1.2 }}>
                  1. Cliente y Dirección de Despacho
                </Typography>
                <Grid container spacing={2}>
                  {customers.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Autocompletar con Cliente Frecuente"
                        value={editingDelivery.customer?.id || ''}
                        onChange={(e) => {
                          const cust = customers.find((c) => c.id === e.target.value);
                          if (cust) {
                            setEditingDelivery({
                              ...editingDelivery,
                              customer: cust,
                              deliveryAddress: cust.address,
                              deliveryCity: cust.city || 'Medellín',
                            });
                          }
                        }}
                      >
                        <MenuItem value="">-- Ingreso Manual / Nuevo Cliente --</MenuItem>
                        {customers.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name} ({c.phone}) - {c.address}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Nombre del Cliente"
                      value={editingDelivery.customer?.name || ''}
                      onChange={(e) =>
                        setEditingDelivery({
                          ...editingDelivery,
                          customer: { ...(editingDelivery.customer as Customer), name: e.target.value },
                        })
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Teléfono / WhatsApp"
                      value={editingDelivery.customer?.phone || ''}
                      onChange={(e) =>
                        setEditingDelivery({
                          ...editingDelivery,
                          customer: { ...(editingDelivery.customer as Customer), phone: e.target.value },
                        })
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      required
                      label="Dirección Completa de Entrega"
                      placeholder="Calle 10 # 20-30, Apto 501"
                      value={editingDelivery.deliveryAddress || ''}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryAddress: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Ciudad"
                      value={editingDelivery.deliveryCity || 'Medellín'}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryCity: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Barrio / Zona"
                      value={editingDelivery.deliveryZone || 'Laureles'}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryZone: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Instrucciones para el Domiciliario (Portería, timbre, etc.)"
                      placeholder="Ej: Dejar en portería, citófono 501, portón blanco..."
                      value={editingDelivery.deliveryNotes || ''}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryNotes: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* 2. Order Items */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#1e290b' }}>
                    2. Productos del Menú Solicitados
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddItemRow} sx={{ fontWeight: 800 }}>
                    Añadir Otro Plato
                  </Button>
                </Box>

                <Stack spacing={1.5}>
                  {selectedItems.map((sel, idx) => {
                    const prod = products.find((p) => p.id === sel.productId);
                    return (
                      <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Plato del Menú"
                          value={sel.productId}
                          onChange={(e) => handleUpdateItemRow(idx, 'productId', e.target.value)}
                        >
                          {products.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name} (${p.price.toLocaleString()} COP)
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          size="small"
                          type="number"
                          label="Cant."
                          value={sel.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          sx={{ width: 100 }}
                        />

                        <Typography variant="body2" sx={{ width: 120, textAlign: 'right', fontWeight: 800, color: '#1e290b' }}>
                          ${((prod?.price || 20000) * sel.quantity).toLocaleString()}
                        </Typography>

                        <IconButton size="small" color="error" onClick={() => handleRemoveItemRow(idx)} disabled={selectedItems.length <= 1}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* 3. Payment & Delivery Fee */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#1e290b', mb: 1.2 }}>
                  3. Tarifa de Domicilio y Método de Cobro
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Costo de Envío ($ COP)"
                      value={editingDelivery.deliveryFee ?? 5000}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryFee: Number(e.target.value) })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Forma de Pago"
                      value={editingDelivery.paymentMethod || 'EFECTIVO'}
                      onChange={(e) => setEditingDelivery({ ...editingDelivery, paymentMethod: e.target.value as any })}
                    >
                      <MenuItem value="EFECTIVO">Efectivo contra entrega</MenuItem>
                      <MenuItem value="DATAFONO">Datáfono inalámbrico</MenuItem>
                      <MenuItem value="TRANSFERENCIA">Transferencia (Nequi / Daviplata)</MenuItem>
                    </TextField>
                  </Grid>

                  {editingDelivery.paymentMethod === 'EFECTIVO' && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Paga con Billete de ($)"
                        placeholder="50000"
                        value={editingDelivery.cashAmountPaidWith ?? ''}
                        onChange={(e) => setEditingDelivery({ ...editingDelivery, cashAmountPaidWith: Number(e.target.value) })}
                        helperText="Para calcular las vueltas exactas"
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsCreateModalOpen(false)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveDelivery}
            sx={{ bgcolor: '#1e290b', color: '#ffffff', fontWeight: 900, borderRadius: '10px', px: 3, '&:hover': { bgcolor: '#0f172a' } }}
          >
            Guardar Domicilio
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: DISPATCH ORDER */}
      <Dialog
        open={Boolean(dispatchModalOrder)}
        onClose={() => setDispatchModalOrder(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MotorbikeIcon sx={{ color: '#1e290b' }} />
          Despachar Pedido #{dispatchModalOrder?.orderNumber}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {dispatchModalOrder && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                  Destino: {dispatchModalOrder.deliveryAddress}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cliente: {dispatchModalOrder.customer.name} ({dispatchModalOrder.customer.phone})
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803d', mt: 0.5 }}>
                  Total a Cobrar: ${dispatchModalOrder.total.toLocaleString()} COP [{dispatchModalOrder.paymentMethod}]
                </Typography>
              </Box>

              <TextField
                select
                fullWidth
                label="Seleccionar Repartidor de la Brigada"
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                helperText="Personal disponible para realizar la entrega"
              >
                {availableRiders.length > 0 ? (
                  availableRiders.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name} - Tel: {r.phone}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="9">Kevin Morales (Domicilios Express)</MenuItem>
                )}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDispatchModalOrder(null)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleConfirmDispatch}
            sx={{ bgcolor: '#1e290b', color: '#ffffff', fontWeight: 900, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0f172a' } }}
          >
            Confirmar Despacho & Salida
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: RIDER CASH SETTLEMENT (LIQUIDACIÓN EN CAJA) */}
      <Dialog
        open={Boolean(settlementModalRider)}
        onClose={() => setSettlementModalRider(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettlementIcon sx={{ color: '#ea580c' }} />
          Liquidación de Efectivo en Caja: {settlementModalRider?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {settlementModalRider && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 2.5, border: '1px solid #fed7aa' }}>
                <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total en Efectivo Recaudado por el Motorizado:
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#9a3412', my: 0.5 }}>
                  ${settlementModalRider.cashTotal.toLocaleString()} COP
                </Typography>
                <Typography variant="body2" sx={{ color: '#c2410c' }}>
                  Correspondiente a {settlementModalRider.ordersCount} entregas realizadas.
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Detalle de entregas por liquidar:
              </Typography>

              <Stack spacing={1}>
                {settlementModalRider.orders.map((ord, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        #{ord.orderNumber} - {ord.customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ord.paymentMethod} • Envío: ${(ord.deliveryFee || 5000).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: ord.paymentMethod === 'EFECTIVO' ? '#15803d' : '#64748b' }}>
                      ${ord.total.toLocaleString()} COP
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSettlementModalRider(null)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CashIcon />}
            onClick={handleSettleRiderCash}
            sx={{ fontWeight: 900, borderRadius: '10px', px: 2.5, bgcolor: '#16a34a' }}
          >
            Ingresar Dinero a la Caja Registradora
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: PRINT THERMAL TICKET (80MM) */}
      <Dialog
        open={Boolean(printModalOrder)}
        onClose={() => setPrintModalOrder(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Tirilla Térmica de Salida (80mm)</DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#ffffff', color: '#000000', fontFamily: 'monospace' }}>
          {printModalOrder && (
            <Box>
              <Typography align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: 1 }}>
                SÉSAMO ALIMENTOS
              </Typography>
              <Typography align="center" variant="caption" sx={{ display: 'block', mb: 2 }}>
                TIRILLA DE DESPACHO A DOMICILIO
              </Typography>
              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Typography variant="body2"><strong>ORDEN:</strong> #{printModalOrder.orderNumber}</Typography>
              <Typography variant="body2"><strong>FECHA:</strong> {new Date(parseDateOrTimestamp(printModalOrder.createdAt)).toLocaleString('es-CO')}</Typography>
              <Typography variant="body2"><strong>CLIENTE:</strong> {printModalOrder.customer.name}</Typography>
              <Typography variant="body2"><strong>TELÉFONO:</strong> {printModalOrder.customer.phone}</Typography>
              <Typography variant="body2"><strong>DIRECCIÓN:</strong> {printModalOrder.deliveryAddress}</Typography>
              {printModalOrder.deliveryNotes && (
                <Typography variant="body2"><strong>NOTAS:</strong> {printModalOrder.deliveryNotes}</Typography>
              )}
              <Typography variant="body2"><strong>REPARTIDOR:</strong> {printModalOrder.deliveryRiderName || 'Por asignar'}</Typography>

              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Typography variant="caption" sx={{ fontWeight: 900 }}>DETALLE PRODUCTOS:</Typography>
              {(printModalOrder.items || []).map((i, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{i.quantity}x {i.productName}</span>
                  <span>${i.totalPrice.toLocaleString()}</span>
                </Box>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', mt: 0.5 }}>
                <span>Tarifa Envío:</span>
                <span>${(printModalOrder.deliveryFee || 5000).toLocaleString()}</span>
              </Box>

              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem' }}>
                <span>TOTAL A COBRAR:</span>
                <span>${printModalOrder.total.toLocaleString()} COP</span>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                MÉTODO: {printModalOrder.paymentMethod}
              </Typography>
              {printModalOrder.paymentMethod === 'EFECTIVO' && printModalOrder.cashAmountPaidWith && (
                <Typography variant="caption" sx={{ display: 'block' }}>
                  PAGA CON: ${printModalOrder.cashAmountPaidWith.toLocaleString()} (VUELTAS: ${(printModalOrder.cashAmountPaidWith - printModalOrder.total).toLocaleString()})
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrintModalOrder(null)} sx={{ fontWeight: 700 }}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ fontWeight: 900, bgcolor: '#1e290b', color: '#ffffff' }}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={Boolean(deleteConfirmOrder)}
        onClose={() => setDeleteConfirmOrder(null)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Eliminar Domicilio?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Estás seguro de que deseas eliminar la orden #{deleteConfirmOrder?.orderNumber}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOrder(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmOrder && handleDeleteDelivery(deleteConfirmOrder)}
            sx={{ fontWeight: 900 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR FEEDBACK */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ fontWeight: 700, borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
