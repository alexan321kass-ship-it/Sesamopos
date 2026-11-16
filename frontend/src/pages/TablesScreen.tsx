import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Drawer,
  Button,
  Paper,
  Stack,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  CheckCircle as CheckIcon,
  Bookmark as ReserveIcon,
  Block as BlockIcon,
  AddShoppingCart as AddPosIcon,
  AttachMoney as CashIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  DinnerDining as DiningIcon,
  Search as SearchIcon,
  TableRestaurant as TableIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  SwapHoriz as SwapHorizIcon,
  Liquor as BarIcon,
  NotificationsActive as AlertBellIcon,
  AccessTime as TimeIcon,
  ReceiptLong as ReceiptIcon,
  Place as PlaceIcon,
  RoomService as RoomServiceIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Table, TableStatus, Order } from '../types';
import { usePosStore } from '../store/posStore';
import { useAuthStore } from '../store/authStore';
import { subscribeRealtimeEvents } from '../services/eventBus';
import BillingModal from '../components/BillingModal';
import { parseDateOrTimestamp } from '../utils/timeUtils';

const AVAILABLE_WAITERS = [
  { id: '2', name: 'Carlos Ruiz', color: '#0284c7' },
  { id: '7', name: 'Andrés Ramírez', color: '#ea580c' },
  { id: '8', name: 'Sofía López', color: '#9333ea' }
];

export default function TablesScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedWaiterFilter, setSelectedWaiterFilter] = useState<string>(user?.role === 'MESERO' ? 'MY_TABLES' : 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected table for the right-side Drawer
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Billing modal
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

  // Table Create / Edit Modal State
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableModalMode, setTableModalMode] = useState<'create' | 'edit'>('create');
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState({
    number: 1,
    capacity: 4,
    location: 'Salón Principal',
    currentWaiterId: '',
    currentWaiterName: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Table Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceTable, setTransferSourceTable] = useState<Table | null>(null);
  const [destinationTableId, setDestinationTableId] = useState<string>('');

  const navigate = useNavigate();
  const posStore = usePosStore();

  const loadData = async () => {
    try {
      const [tablesData, ordersData] = await Promise.all([
        mockApi.tables.getAll(),
        mockApi.orders.getAll()
      ]);
      setTables(tablesData || []);
      setOrders(ordersData || []);

      // If drawer is open, keep selectedTable fresh
      if (selectedTable) {
        const fresh = tablesData?.find(t => t.id === selectedTable.id);
        if (fresh) setSelectedTable(fresh);
      }
    } catch (e) {
      console.error('Error al cargar datos del restaurante:', e);
    }
  };

  useEffect(() => {
    // Clear any past alert storage
    try {
      localStorage.removeItem('sesamo_table_alerts');
    } catch (e) {}

    loadData();
    if (user?.role === 'MESERO') {
      setSelectedWaiterFilter('MY_TABLES');
    }

    const unsubscribe = subscribeRealtimeEvents((type) => {
      if (type === 'sesamo_tables_updated' || type === 'sesamo_order_created' || type === 'sesamo_order_updated' || type === 'sesamo_cash_updated') {
        loadData();
      }
    });

    window.addEventListener('sesamo_tables_updated', loadData);
    window.addEventListener('sesamo_order_created', loadData);
    window.addEventListener('sesamo_order_updated', loadData);
    window.addEventListener('sesamo_cash_updated', loadData);
    window.addEventListener('storage', loadData);

    const interval = setInterval(() => loadData(), 2500);

    return () => {
      window.removeEventListener('sesamo_tables_updated', loadData);
      window.removeEventListener('sesamo_order_created', loadData);
      window.removeEventListener('sesamo_order_updated', loadData);
      window.removeEventListener('sesamo_cash_updated', loadData);
      window.removeEventListener('storage', loadData);
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  // Find active order for a table (ENTREGADO is active; only PAGADO and CANCELADO are finished)
  const getActiveOrderForTable = (table: Table): Order | undefined => {
    return orders.find(o =>
      (o.id === table.currentOrderId ||
       o.orderNumber === table.currentOrderId ||
       o.tableId === table.id ||
       o.tableId === table.number.toString()) &&
      !['CANCELADO', 'PAGADO'].includes(o.status)
    );
  };

  const getStatusConfig = (table: Table, activeOrder?: Order) => {
    if (table.status === 'CUENTA_PEDIDA') {
      return {
        label: '🧾 Cuenta en Caja',
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        headerBg: 'linear-gradient(180deg, #fef3c7 0%, #ffffff 100%)',
        badgeBg: '#fde68a',
        badgeColor: '#92400e',
        dotColor: '#d97706',
        isReady: false,
        icon: <ReceiptIcon sx={{ fontSize: 16 }} />
      };
    }

    if (table.status === 'DISPONIBLE' && !activeOrder) {
      return {
        label: 'Libre',
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        headerBg: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
        badgeBg: '#dcfce7',
        badgeColor: '#166534',
        dotColor: '#22c55e',
        isReady: false,
        icon: <CheckIcon sx={{ fontSize: 15 }} />
      };
    }

    if (table.status === 'PEDIDO_LISTO' || activeOrder?.status === 'LISTO') {
      return {
        label: '¡Listo para Servir!',
        color: '#0369a1',
        bgColor: '#f0f9ff',
        borderColor: '#38bdf8',
        headerBg: 'linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%)',
        badgeBg: '#bae6fd',
        badgeColor: '#0369a1',
        dotColor: '#0284c7',
        isReady: true,
        icon: <AlertBellIcon sx={{ fontSize: 16, animation: 'bellShake 1.5s infinite' }} />
      };
    }

    if (activeOrder?.status === 'ENTREGADO') {
      return {
        label: 'Comiendo',
        color: '#7c3aed',
        bgColor: '#faf5ff',
        borderColor: '#ddd6fe',
        headerBg: 'linear-gradient(180deg, #f3e8ff 0%, #ffffff 100%)',
        badgeBg: '#ede9fe',
        badgeColor: '#6d28d9',
        dotColor: '#8b5cf6',
        isReady: false,
        icon: <DiningIcon sx={{ fontSize: 15 }} />
      };
    }

    if (table.status === 'OCUPADA' || activeOrder) {
      return {
        label: 'En Cocina',
        color: '#c2410c',
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
        headerBg: 'linear-gradient(180deg, #ffedd5 0%, #ffffff 100%)',
        badgeBg: '#ffedd5',
        badgeColor: '#c2410c',
        dotColor: '#f97316',
        isReady: false,
        icon: <RestaurantIcon sx={{ fontSize: 15 }} />
      };
    }

    if (table.status === 'RESERVADA') {
      return {
        label: 'Reservada',
        color: '#a16207',
        bgColor: '#fefce8',
        borderColor: '#fef08a',
        headerBg: 'linear-gradient(180deg, #fef9c3 0%, #ffffff 100%)',
        badgeBg: '#fef9c3',
        badgeColor: '#a16207',
        dotColor: '#eab308',
        isReady: false,
        icon: <ReserveIcon sx={{ fontSize: 15 }} />
      };
    }

    return {
      label: 'Fuera de Servicio',
      color: '#475569',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0',
      headerBg: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      dotColor: '#94a3b8',
      isReady: false,
      icon: <BlockIcon sx={{ fontSize: 15 }} />
    };
  };

  const getOccupiedTimeDetails = (time?: number | string) => {
    if (!time) return null;
    const ts = parseDateOrTimestamp(time);
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    let color = '#15803d'; // Verde < 20m
    let bg = '#dcfce7';
    let borderColor = '#86efac';
    let tooltip = `Ocupada hace ${mins} min (Tiempo normal)`;

    if (mins >= 45) {
      color = '#b91c1c'; // Rojo >= 45m
      bg = '#fee2e2';
      borderColor = '#fca5a5';
      tooltip = `Mesa con demora alta: ${mins} min de servicio`;
    } else if (mins >= 20) {
      color = '#b45309'; // Ámbar 20 - 44m
      bg = '#fef3c7';
      borderColor = '#fcd34d';
      tooltip = `Servicio en curso: ${mins} min transcurridos`;
    }

    return { mins, label: `${mins}m`, color, bg, borderColor, tooltip };
  };

  // Zones list
  const availableZones = ['ALL', ...Array.from(new Set(tables.map(t => t.location || 'Salón Principal')))];

  // Filter Logic
  const filteredTables = tables.filter(table => {
    const activeOrder = getActiveOrderForTable(table);

    // Search query by table number or waiter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const tableNum = table.number !== undefined && table.number !== null ? String(table.number) : '';
      const numMatch = tableNum ? (tableNum.includes(q) || `mesa ${tableNum}`.includes(q)) : false;
      const waiterMatch = table.currentWaiterName?.toLowerCase().includes(q);
      if (!numMatch && !waiterMatch) return false;
    }

    // Zone filter
    if (selectedZone !== 'ALL' && (table.location || 'Salón Principal') !== selectedZone) {
      return false;
    }

    // Status filter
    if (selectedStatus === 'DISPONIBLE' && (table.status !== 'DISPONIBLE' || Boolean(activeOrder))) return false;
    if (selectedStatus === 'OCUPADA' && (table.status !== 'OCUPADA' && !activeOrder)) return false;
    if (selectedStatus === 'LISTO' && (table.status !== 'PEDIDO_LISTO' && activeOrder?.status !== 'LISTO')) return false;
    if (selectedStatus === 'ENTREGADO' && activeOrder?.status !== 'ENTREGADO') return false;

    // Waiter filter
    if (selectedWaiterFilter === 'MY_TABLES') {
      const loggedInFirstName = user?.name ? user.name.split(' ')[0].toLowerCase() : '';
      const matchesWaiter = Boolean(
        table.currentWaiterId === user?.id ||
        (table.currentWaiterName && loggedInFirstName && table.currentWaiterName.toLowerCase().includes(loggedInFirstName))
      );
      if (!matchesWaiter) return false;
    } else if (selectedWaiterFilter !== 'ALL') {
      if (table.currentWaiterId !== selectedWaiterFilter && table.currentWaiterName !== selectedWaiterFilter) return false;
    }

    return true;
  });

  // KPIs
  const loggedInFirstName = user?.name ? user.name.split(' ')[0].toLowerCase() : '';
  const myTables = tables.filter(t => 
    t.currentWaiterId === user?.id || 
    (t.currentWaiterName && loggedInFirstName && t.currentWaiterName.toLowerCase().includes(loggedInFirstName))
  );

  const displayPool = selectedWaiterFilter === 'MY_TABLES' ? myTables : tables;
  const availableCount = displayPool.filter(t => t.status === 'DISPONIBLE' && !getActiveOrderForTable(t)).length;
  const occupiedCount = displayPool.filter(t => t.status === 'OCUPADA' || Boolean(getActiveOrderForTable(t))).length;
  const readyCount = displayPool.filter(t => t.status === 'PEDIDO_LISTO' || getActiveOrderForTable(t)?.status === 'LISTO').length;
  const servedCount = displayPool.filter(t => getActiveOrderForTable(t)?.status === 'ENTREGADO').length;

  // Actions
  const handleOpenOrder = async (table: Table) => {
    posStore.setTable(table.id);
    const activeOrder = getActiveOrderForTable(table);
    if (activeOrder) {
      posStore.loadExistingOrder(activeOrder);
    }
    setSelectedTable(null);
    navigate('/pos');
  };

  const handleOpenBillingForTable = async (table: Table) => {
    const activeOrder = getActiveOrderForTable(table);
    if (activeOrder) {
      setBillingOrder(activeOrder);
      setBillingModalOpen(true);
      setSelectedTable(null);
    } else {
      alert('Esta mesa no tiene un pedido activo para cobrar.');
    }
  };

  const handleRequestBillToCashier = async (table: Table) => {
    try {
      await mockApi.tables.updateStatus(table.id, 'CUENTA_PEDIDA');
      setActionNotice({
        type: 'success',
        message: `¡Cuenta de Mesa ${table.number} enviada a Caja! El cajero ya la tiene en su lista para cobrar.`
      });
      setSelectedTable(null);
      loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Error solicitando cuenta a caja'
      });
    }
  };

  const handleUpdateStatus = async (tableId: string, newStatus: TableStatus) => {
    try {
      await mockApi.tables.updateStatus(tableId, newStatus);
      setActionNotice({
        type: 'success',
        message: `Estado de la mesa actualizado a ${newStatus}.`
      });
      loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Error al actualizar el estado de la mesa.'
      });
    }
  };

  const handleAssignWaiter = async (tableId: string, waiterId: string, waiterName: string) => {
    if (!['ADMINISTRADOR', 'GERENTE'].includes(user?.role || '')) {
      setActionNotice({
        type: 'error',
        message: 'Acceso denegado: solo el Administrador o Gerente tiene permiso para asignar meseros a las mesas.'
      });
      return;
    }
    await mockApi.tables.assignWaiter(tableId, waiterId, waiterName);
    loadData();
  };

  const handleOpenTransferModal = (table: Table) => {
    setTransferSourceTable(table);
    setDestinationTableId('');
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!transferSourceTable || !destinationTableId) return;
    setIsSubmitting(true);
    try {
      await mockApi.tables.transfer(transferSourceTable.id, destinationTableId);
      setActionNotice({
        type: 'success',
        message: destinationTableId === 'BARRA'
          ? `Comanda movida exitosamente a Venta Directa en Barra.`
          : `Comanda transferida exitosamente a Mesa ${destinationTableId}.`
      });
      setTransferModalOpen(false);
      setSelectedTable(null);
      await loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Error al transferir la comanda de mesa.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeElapsed = (time?: number | string) => {
    if (!time) return '';
    const ts = parseDateOrTimestamp(time);
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    return `${mins}m`;
  };

  const handleQuickServe = async (table: Table, activeOrder: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await mockApi.orders.updateStatus(activeOrder.id, 'ENTREGADO');
      loadData();
      setActionNotice({
        type: 'success',
        message: `¡Mesa ${table.number} servida con éxito! Comanda #${activeOrder.orderNumber}`
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Error al marcar como servida.'
      });
    }
  };

  const handleQuickPay = (table: Table, activeOrder: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setBillingOrder(activeOrder);
    setSelectedTable(table);
    setBillingModalOpen(true);
  };

  const canProcessPayment = ['ADMINISTRADOR', 'GERENTE', 'CAJERO'].includes(user?.role || '');

  // Add / Edit Table Handlers
  const handleOpenAddTable = () => {
    if (!isAdmin) {
      setActionNotice({
        type: 'error',
        message: 'Acceso denegado: solo el Administrador tiene permiso para agregar mesas.'
      });
      return;
    }
    const maxNum = tables.reduce((max, t) => Math.max(max, Number(t.number) || 0), 0);
    setTableForm({
      number: maxNum + 1,
      capacity: 4,
      location: 'Salón Principal',
      currentWaiterId: '',
      currentWaiterName: ''
    });
    setEditingTableId(null);
    setTableModalMode('create');
    setFormError(null);
    setTableModalOpen(true);
  };

  const handleOpenEditTable = (table: Table, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      setActionNotice({
        type: 'error',
        message: 'Acceso denegado: el mesero no puede editar ni hacer cambios en las mesas.'
      });
      return;
    }
    setTableForm({
      number: table.number,
      capacity: table.capacity || 4,
      location: table.location || 'Salón Principal',
      currentWaiterId: table.currentWaiterId || '',
      currentWaiterName: table.currentWaiterName || ''
    });
    setEditingTableId(table.id);
    setTableModalMode('edit');
    setFormError(null);
    setTableModalOpen(true);
  };

  const handleSaveTable = async () => {
    const num = Number(tableForm.number);
    const cap = Number(tableForm.capacity);

    if (!num || num <= 0) {
      setFormError('El número de mesa debe ser un número entero positivo.');
      return;
    }
    if (!cap || cap <= 0) {
      setFormError('La capacidad de personas debe ser al menos 1.');
      return;
    }

    const duplicate = tables.find(t =>
      Number(t.number) === num &&
      (tableModalMode === 'create' || t.id !== editingTableId)
    );
    if (duplicate) {
      setFormError(`Ya existe la Mesa ${num} en el restaurante.`);
      return;
    }

    if (!isAdmin) {
      setFormError('Acceso denegado: solo el Administrador tiene permiso para agregar o editar mesas.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const waiterObj = AVAILABLE_WAITERS.find(w => w.id === tableForm.currentWaiterId);
      const waiterName = waiterObj ? waiterObj.name : tableForm.currentWaiterName || '';

      if (tableModalMode === 'create') {
        const created = await mockApi.tables.create({
          number: num,
          capacity: cap,
          location: tableForm.location || 'Salón Principal',
          currentWaiterId: tableForm.currentWaiterId || undefined,
          currentWaiterName: waiterName || undefined
        });
        setTables(prev => {
          const list = [...prev.filter(t => t.id !== created.id && Number(t.number) !== Number(created.number)), created];
          return list.sort((a, b) => a.number - b.number);
        });
        if (selectedWaiterFilter !== 'ALL' && tableForm.currentWaiterId !== selectedWaiterFilter) {
          setSelectedWaiterFilter('ALL');
        }
        if (selectedStatus !== 'ALL') {
          setSelectedStatus('ALL');
        }
        setActionNotice({
          type: 'success',
          message: `Mesa ${created.number} creada con capacidad para ${created.capacity} personas.`
        });
      } else if (editingTableId) {
        const updatedTable = await mockApi.tables.update(editingTableId, {
          number: num,
          capacity: cap,
          location: tableForm.location || 'Salón Principal',
          currentWaiterId: tableForm.currentWaiterId || undefined,
          currentWaiterName: waiterName || undefined
        });
        setTables(prev => {
          const list = prev.map(t => (t.id === editingTableId || String(t.number) === String(editingTableId)) ? { ...t, ...updatedTable } : t);
          return list.sort((a, b) => a.number - b.number);
        });
        if (selectedTable && (selectedTable.id === editingTableId || String(selectedTable.number) === String(editingTableId))) {
          setSelectedTable(prev => prev ? { ...prev, ...updatedTable } : null);
        }
        setActionNotice({
          type: 'success',
          message: `Mesa ${num} actualizada correctamente.`
        });
      }

      setTableModalOpen(false);
      window.dispatchEvent(new CustomEvent('sesamo_tables_updated'));
      await loadData();
    } catch (err: any) {
      console.error('Error al guardar mesa:', err);
      setFormError(err?.message || 'Error al guardar la mesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteTable = (table: Table, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isAdmin) {
      setActionNotice({
        type: 'error',
        message: 'Acceso denegado: solo el Administrador tiene permiso para eliminar mesas.'
      });
      return;
    }

    const activeOrder = getActiveOrderForTable(table);
    if (activeOrder || table.status === 'OCUPADA') {
      setActionNotice({
        type: 'error',
        message: `No se puede eliminar la Mesa ${table.number} porque tiene comensales o una comanda activa.`
      });
      return;
    }

    setTableToDelete(table);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    if (!isAdmin) {
      setActionNotice({
        type: 'error',
        message: 'Acceso denegado: solo el Administrador tiene permiso para eliminar mesas.'
      });
      return;
    }
    const target = tableToDelete;
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      await mockApi.tables.delete(target.id);
      setTables(prev => prev.filter(t => t.id !== target.id && Number(t.number) !== Number(target.number)));
      setDeleteConfirmOpen(false);
      setTableModalOpen(false);
      if (selectedTable && (selectedTable.id === target.id || Number(selectedTable.number) === Number(target.number))) {
        setSelectedTable(null);
      }
      const numDeleted = target.number;
      setTableToDelete(null);
      setActionNotice({
        type: 'success',
        message: `Mesa ${numDeleted} eliminada exitosamente.`
      });
      window.dispatchEvent(new CustomEvent('sesamo_tables_updated'));
      await loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Error al eliminar la mesa.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active drawer order
  const drawerActiveOrder = selectedTable ? getActiveOrderForTable(selectedTable) : undefined;
  const drawerConfig = selectedTable ? getStatusConfig(selectedTable, drawerActiveOrder) : null;

  return (
    <Box
      sx={{
        pb: 6,
        '@keyframes pulseGlow': {
          '0%': { boxShadow: '0 0 0 0 rgba(2, 132, 199, 0.7)' },
          '70%': { boxShadow: '0 0 0 12px rgba(2, 132, 199, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(2, 132, 199, 0)' }
        },
        '@keyframes bellShake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%, 60%': { transform: 'rotate(14deg)' },
          '40%, 80%': { transform: 'rotate(-14deg)' }
        }
      }}
    >
      {/* Action Notification Alert */}
      {actionNotice && (
        <Alert
          severity={actionNotice.type}
          onClose={() => setActionNotice(null)}
          sx={{ mb: 2, borderRadius: '14px', fontWeight: 700 }}
        >
          {actionNotice.message}
        </Alert>
      )}

      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
            {user?.role === 'MESERO' ? `Mis Mesas (${user?.name?.split(' ')[0]})` : 'Plano de Mesas & Salón'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {selectedWaiterFilter === 'MY_TABLES'
              ? `${myTables.length} mesas asignadas a tu turno.`
              : `${tables.length} mesas en total • Control operativo en tiempo real.`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Actualizar mesas y comandas">
            <IconButton onClick={loadData} sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddTable}
              sx={{
                bgcolor: '#16a34a',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: 800,
                px: 2,
                py: 0.8,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                '&:hover': { bgcolor: '#15803d' }
              }}
            >
              + Agregar Mesa
            </Button>
          )}

          {canProcessPayment && (
            <Button
              variant="outlined"
              startIcon={<CashIcon />}
              onClick={() => navigate('/cash')}
              sx={{
                borderColor: '#0284c7',
                color: '#0284c7',
                borderRadius: '12px',
                fontWeight: 800,
                px: 2,
                py: 0.8,
                '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.06)' }
              }}
            >
              Caja
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<AddPosIcon />}
            onClick={() => navigate('/pos')}
            sx={{
              bgcolor: '#65a30d',
              color: '#ffffff',
              borderRadius: '12px',
              fontWeight: 900,
              px: 2.5,
              py: 0.8,
              boxShadow: '0 4px 12px rgba(101, 163, 13, 0.25)',
              '&:hover': { bgcolor: '#4d7c0f' }
            }}
          >
            Punto de Venta (POS)
          </Button>
        </Stack>
      </Box>

      {/* KPI Status Strip (Distribución Proporcional 5 Estados) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 1.5,
          mb: 2.5
        }}
      >
        {[
          { key: 'ALL', label: 'Todas las Mesas', count: displayPool.length, color: '#1e290b', bg: '#ffffff' },
          { key: 'DISPONIBLE', label: 'Mesas Libres', count: availableCount, color: '#16a34a', bg: '#f0fdf4' },
          { key: 'OCUPADA', label: 'En Cocina', count: occupiedCount, color: '#ea580c', bg: '#fff7ed' },
          { key: 'LISTO', label: '¡Listas Servir!', count: readyCount, color: '#0284c7', bg: '#f0f9ff' },
          { key: 'ENTREGADO', label: 'Comiendo', count: servedCount, color: '#7c3aed', bg: '#faf5ff' }
        ].map(kpi => {
          const isActive = selectedStatus === kpi.key;
          return (
            <Paper
              key={kpi.key}
              elevation={0}
              onClick={() => setSelectedStatus(kpi.key)}
              sx={{
                p: { xs: 1.4, sm: 1.8 },
                borderRadius: '16px',
                bgcolor: isActive ? kpi.color : '#ffffff',
                color: isActive ? '#ffffff' : kpi.color,
                border: `1.5px solid ${isActive ? kpi.color : 'rgba(0,0,0,0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 6px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 800, textTransform: 'uppercase', opacity: isActive ? 0.95 : 0.8, letterSpacing: 0.5, fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                {kpi.label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, fontSize: { xs: '1.2rem', sm: '1.45rem' } }}>
                {kpi.count}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Filter and Zone Selector Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '18px', bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Zone / Sector selector tabs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 1.5, mb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <PlaceIcon sx={{ fontSize: 16, color: '#65a30d' }} />
            Ambiente:
          </Typography>
          {availableZones.map(zone => {
            const isZoneActive = selectedZone === zone;
            const count = zone === 'ALL'
              ? tables.length
              : tables.filter(t => (t.location || 'Salón Principal') === zone).length;
            return (
              <Chip
                key={zone}
                label={zone === 'ALL' ? `Todos (${count})` : `${zone} (${count})`}
                onClick={() => setSelectedZone(zone)}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  bgcolor: isZoneActive ? '#1e290b' : '#f8fafc',
                  color: isZoneActive ? '#ffffff' : '#475569',
                  border: `1px solid ${isZoneActive ? '#1e290b' : '#e2e8f0'}`,
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: isZoneActive ? '#0f172a' : '#edf2f7' }
                }}
              />
            );
          })}
        </Box>

        {/* Search & Waiter selector */}
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: user?.role === 'ADMINISTRADOR' ? 6 : 12 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar por número de mesa o mesero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px', bgcolor: '#f8fafc' }
                }
              }}
            />
          </Grid>

          {user?.role === 'ADMINISTRADOR' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="waiter-filter-label">Filtrar por Mesero Asignado</InputLabel>
                <Select
                  labelId="waiter-filter-label"
                  value={selectedWaiterFilter}
                  label="Filtrar por Mesero Asignado"
                  onChange={(e) => setSelectedWaiterFilter(e.target.value)}
                  sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                >
                  <MenuItem value="ALL">Todos los Meseros</MenuItem>
                  {AVAILABLE_WAITERS.map(w => (
                    <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* MODERN TACTILE TABLE GRID */}
      <Grid container spacing={2}>
        {filteredTables.map(table => {
          const activeOrder = getActiveOrderForTable(table);
          const config = getStatusConfig(table, activeOrder);
          const timeDetails = getOccupiedTimeDetails(activeOrder?.createdAt || table.timeOccupied);
          const waiterName = table.currentWaiterName || 'Sin asignar';
          const isSelected = selectedTable?.id === table.id;
          const totalItems = activeOrder?.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={table.id}>
              <Paper
                elevation={0}
                onClick={() => setSelectedTable(table)}
                sx={{
                  position: 'relative',
                  borderRadius: '20px',
                  bgcolor: '#ffffff',
                  border: isSelected
                    ? '2.5px solid #0284c7'
                    : config.isReady
                    ? '2px solid #0284c7'
                    : '1px solid #e2e8f0',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected
                    ? '0 12px 28px rgba(2, 132, 199, 0.18)'
                    : config.isReady
                    ? '0 10px 24px rgba(2, 132, 199, 0.22)'
                    : '0 2px 6px rgba(0,0,0,0.03)',
                  ...(config.isReady ? { animation: 'pulseGlow 2s infinite' } : {}),
                  '&:hover': {
                    borderColor: config.dotColor,
                    transform: 'translateY(-3px)',
                    boxShadow: '0 14px 28px rgba(0,0,0,0.08)'
                  }
                }}
              >
                {/* Header Strip with State-based Tint */}
                <Box
                  sx={{
                    p: 1.8,
                    background: config.headerBg,
                    borderBottom: `1px solid ${config.borderColor}80`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  {/* Table Badge and Basic Details */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '14px',
                        bgcolor: config.badgeBg,
                        color: config.badgeColor,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        border: `1.5px solid ${config.borderColor}`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase', opacity: 0.9 }}>
                        Mesa
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1, fontSize: '1.15rem' }}>
                        {String(table.number).padStart(2, '0')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2, fontSize: '1rem' }}>
                        {table.location || 'Salón Principal'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                        <Tooltip title={isAdmin ? "Capacidad comensales (Click para editar)" : "Capacidad comensales"}>
                          <Chip
                            icon={<PeopleIcon sx={{ fontSize: '14px !important', color: '#475569 !important' }} />}
                            label={`${table.capacity} personas`}
                            size="small"
                            onClick={isAdmin ? (e) => handleOpenEditTable(table, e) : undefined}
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              bgcolor: 'rgba(255,255,255,0.95)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              color: '#334155',
                              cursor: isAdmin ? 'pointer' : 'default'
                            }}
                          />
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>

                  {/* Status Chip & Admin actions */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
                    <Chip
                      icon={config.icon}
                      label={config.label}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        height: 26,
                        px: 0.5,
                        bgcolor: config.badgeBg,
                        color: config.badgeColor,
                        border: `1.5px solid ${config.borderColor}`
                      }}
                    />

                    {isAdmin && (
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        <Tooltip title="Editar mesa">
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenEditTable(table, e)}
                            sx={{ width: 24, height: 24, color: '#64748b', '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.1)' } }}
                          >
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        {!activeOrder && table.status !== 'OCUPADA' && (
                          <Tooltip title="Eliminar mesa">
                            <IconButton
                              size="small"
                              onClick={(e) => requestDeleteTable(table, e)}
                              sx={{ width: 24, height: 24, color: '#64748b', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Card Main Body */}
                <Box sx={{ p: 2 }}>
                  {activeOrder ? (
                    <>
                      {/* Order info + Timer */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <ReceiptIcon sx={{ fontSize: 18, color: '#0284c7' }} />
                          <Typography variant="body1" sx={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                            #{activeOrder.orderNumber}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.82rem' }}>
                            ({totalItems} {totalItems === 1 ? 'ítem' : 'ítems'})
                          </Typography>
                        </Box>

                        {timeDetails && (
                          <Tooltip title={timeDetails.tooltip}>
                            <Chip
                              icon={<TimeIcon sx={{ fontSize: '14px !important', color: `${timeDetails.color} !important` }} />}
                              label={timeDetails.label}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                bgcolor: timeDetails.bg,
                                color: timeDetails.color,
                                border: `1px solid ${timeDetails.borderColor}`
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>

                      {/* Total Price Banner */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          p: 1.4,
                          bgcolor: '#f8fafc',
                          borderRadius: '14px',
                          border: '1px solid #e2e8f0',
                          mb: 1.6
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                          Total Cuenta:
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1, fontSize: '1.25rem' }}>
                          ${(activeOrder.total || 0).toLocaleString()}
                        </Typography>
                      </Box>

                      {/* Waiter in charge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: '#ea580c', fontWeight: 900 }}>
                            {waiterName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155', fontSize: '0.85rem' }}>
                            Mesero: {waiterName.split(' ')[0]}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#0284c7', fontSize: '0.82rem', fontWeight: 800 }}>
                          Ver detalles ➔
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    /* Free table illustration and message */
                    <Box
                      sx={{
                        py: 2.2,
                        px: 1.8,
                        textAlign: 'center',
                        bgcolor: '#f0fdf4',
                        borderRadius: '14px',
                        border: '1px dashed #86efac',
                        mb: 1.8
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#166534', fontSize: '1rem' }}>
                        Mesa Libre & Lista
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#15803d', display: 'block', mt: 0.4, fontSize: '0.82rem', fontWeight: 600 }}>
                        Sector: {table.location || 'Salón'} · Capacidad: {table.capacity}p
                      </Typography>
                    </Box>
                  )}

                  {/* BOTTOM QUICK ACTIONS (ACCIONES TÁCTILES DIRECTAS) */}
                  <Box sx={{ pt: 0.5 }}>
                    {!activeOrder ? (
                      /* Action for Free Table: Direct Open POS */
                      <Button
                        fullWidth
                        variant="contained"
                        size="medium"
                        startIcon={<AddPosIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOrder(table);
                        }}
                        sx={{
                          bgcolor: '#16a34a',
                          color: '#ffffff',
                          borderRadius: '12px',
                          fontWeight: 900,
                          py: 1,
                          fontSize: '0.85rem',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                          '&:hover': { bgcolor: '#15803d' }
                        }}
                      >
                        + Abrir Mesa (POS)
                      </Button>
                    ) : (config.isReady || activeOrder.status === 'LISTO') ? (
                      /* Action for Ready Order: Direct Serve or Pay */
                      <Stack spacing={0.8}>
                        <Button
                          fullWidth
                          variant="contained"
                          size="medium"
                          startIcon={<RoomServiceIcon />}
                          onClick={(e) => handleQuickServe(table, activeOrder, e)}
                          sx={{
                            bgcolor: '#0284c7',
                            color: '#ffffff',
                            borderRadius: '12px',
                            fontWeight: 900,
                            py: 1,
                            fontSize: '0.85rem',
                            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                            '&:hover': { bgcolor: '#0369a1' }
                          }}
                        >
                          🍽️ Servir a la Mesa
                        </Button>

                        {canProcessPayment && (
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<CashIcon />}
                            onClick={(e) => handleQuickPay(table, activeOrder, e)}
                            sx={{
                              borderRadius: '10px',
                              fontWeight: 800,
                              py: 0.5,
                              fontSize: '0.78rem',
                              borderColor: '#cbd5e1',
                              color: '#0284c7',
                              '&:hover': { bgcolor: '#f0f9ff' }
                            }}
                          >
                            Cobrar (${activeOrder.total.toLocaleString()})
                          </Button>
                        )}
                      </Stack>
                    ) : (
                      /* Action for Occupied / Eating Table: Fast Cobrar + Fast Adicionar */
                      <Stack direction="row" spacing={1}>
                        {canProcessPayment && (
                          <Button
                            fullWidth
                            variant="contained"
                            size="medium"
                            startIcon={<CashIcon />}
                            onClick={(e) => handleQuickPay(table, activeOrder, e)}
                            sx={{
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              borderRadius: '12px',
                              fontWeight: 800,
                              py: 0.9,
                              fontSize: '0.82rem',
                              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                              '&:hover': { bgcolor: '#0369a1' }
                            }}
                          >
                            Cobrar
                          </Button>
                        )}
                        <Button
                          fullWidth
                          variant="outlined"
                          size="medium"
                          startIcon={<AddPosIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOrder(table);
                          }}
                          sx={{
                            borderRadius: '12px',
                            fontWeight: 800,
                            py: 0.9,
                            fontSize: '0.82rem',
                            borderColor: '#65a30d',
                            color: '#65a30d',
                            '&:hover': { bgcolor: 'rgba(101, 163, 13, 0.08)' }
                          }}
                        >
                          + Adicionar
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {filteredTables.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: '18px', border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
              <TableIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#64748b' }}>
                No se encontraron mesas con los filtros seleccionados
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setSelectedStatus('ALL'); setSelectedZone('ALL'); setSearchQuery(''); }}
                sx={{ mt: 1.5, borderRadius: '10px', fontWeight: 700 }}
              >
                Limpiar Todos los Filtros
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* LATERAL RIGHT DRAWER (PANEL LATERAL LIMPIO AL TOCAR LA MESA) */}
      <Drawer
        anchor="right"
        open={Boolean(selectedTable)}
        onClose={() => setSelectedTable(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              p: { xs: 2, sm: 3 },
              boxShadow: '-4px 0 24px rgba(0,0,0,0.1)'
            }
          }
        }}
      >
        {selectedTable && drawerConfig && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                    Mesa {String(selectedTable.number).padStart(2, '0')}
                  </Typography>
                  <Chip
                    icon={drawerConfig.icon}
                    label={drawerConfig.label}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: drawerConfig.bgColor,
                      color: drawerConfig.color,
                      border: `1px solid ${drawerConfig.color}40`
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {selectedTable.location || 'Salón Principal'} • {selectedTable.capacity} comensales
                  </Typography>
                  {isAdmin && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                      onClick={(e) => handleOpenEditTable(selectedTable, e)}
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        py: 0.2,
                        px: 1,
                        minHeight: 0,
                        borderRadius: '8px',
                        textTransform: 'none',
                        borderColor: '#cbd5e1'
                      }}
                    >
                      Editar Capacidad
                    </Button>
                  )}
                </Box>
              </Box>

              <IconButton onClick={() => setSelectedTable(null)} sx={{ color: '#64748b' }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Waiter Info & Admin Assignment */}
            <Box sx={{ mb: 2.5, p: 1.8, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#ea580c', width: 28, height: 28, fontSize: '0.8rem', fontWeight: 900 }}>
                    {(selectedTable.currentWaiterName || 'Carlos Ruiz').charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                      Mesero a cargo:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      {selectedTable.currentWaiterName || 'Sin asignar'}
                    </Typography>
                  </Box>
                </Box>

                {['ADMINISTRADOR', 'GERENTE'].includes(user?.role || '') && (
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={selectedTable.currentWaiterId || '2'}
                      onChange={(e) => {
                        const waiter = AVAILABLE_WAITERS.find(w => w.id === e.target.value);
                        if (waiter) handleAssignWaiter(selectedTable.id, waiter.id, waiter.name);
                      }}
                      sx={{ borderRadius: '10px', fontSize: '0.8rem', bgcolor: '#fff' }}
                    >
                      {AVAILABLE_WAITERS.map(w => (
                        <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8rem' }}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Box>

            {/* Active Order Breakdown */}
            {drawerActiveOrder ? (
              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                    Comanda #{drawerActiveOrder.orderNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    ⏱️ Hace {getTimeElapsed(drawerActiveOrder.createdAt || selectedTable.timeOccupied)}
                  </Typography>
                </Box>

                {/* Items List */}
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', mb: 2 }}>
                  <List dense disablePadding>
                    {(drawerActiveOrder.items || []).map((item, idx) => (
                      <ListItem key={idx} disableGutters sx={{ py: 0.6, borderBottom: idx < (drawerActiveOrder.items?.length || 0) - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e290b' }}>
                              {item.quantity}x {item.productName}
                            </Typography>
                          }
                          secondary={
                            item.modifiers && item.modifiers.length > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                {item.modifiers.map(m => m.name).join(', ')}
                              </Typography>
                            ) : null
                          }
                        />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                          ${item.totalPrice.toLocaleString()}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 1.2 }} />

                  {/* Financial Total */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      ${(drawerActiveOrder.subtotal || drawerActiveOrder.total).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                      TOTAL A PAGAR:
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284c7' }}>
                      ${drawerActiveOrder.total.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ) : (
              /* When Table is Available */
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', py: 4 }}>
                <TableIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5 }}>
                  Mesa Disponible
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                  Esta mesa se encuentra libre para asignar a comensales y abrir comanda.
                </Typography>
              </Box>
            )}

            {/* Bottom Drawer Actions */}
            <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
              {drawerActiveOrder ? (
                <Stack spacing={1.5}>
                  {/* BOTÓN SERVIR COMIDA: Permite al mesero llevar los platos y pasar la mesa a Servido/Comiendo */}
                  {drawerActiveOrder.status === 'LISTO' && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<DiningIcon />}
                      onClick={async () => {
                        await mockApi.orders.updateStatus(drawerActiveOrder.id, 'ENTREGADO');
                        loadData();
                        setActionNotice({
                          type: 'success',
                          message: `¡Comanda #${drawerActiveOrder.orderNumber} servida a la mesa con éxito!`
                        });
                      }}
                      sx={{
                        bgcolor: '#16a34a',
                        color: '#ffffff',
                        borderRadius: '14px',
                        fontWeight: 900,
                        py: 1.5,
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                        '&:hover': { bgcolor: '#15803d' }
                      }}
                    >
                      🍽️ Servir Pedido a la Mesa (Entregado)
                    </Button>
                  )}

                  {/* DIRECT COBRAR BUTTON: Immediate payment for Cashier / Admin */}
                  {canProcessPayment && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<CashIcon />}
                      onClick={() => handleOpenBillingForTable(selectedTable)}
                      sx={{
                        bgcolor: '#0284c7',
                        color: '#ffffff',
                        borderRadius: '14px',
                        fontWeight: 900,
                        py: 1.5,
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                        '&:hover': { bgcolor: '#0369a1' }
                      }}
                    >
                      💵 Cobrar Cuenta (${drawerActiveOrder.total.toLocaleString()})
                    </Button>
                  )}

                  {/* REQUEST BILL BUTTON FOR WAITERS: Delegate payment to Caja */}
                  {!canProcessPayment && (
                    selectedTable.status === 'CUENTA_PEDIDA' ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: '#fffbeb',
                          border: '2px solid #fde68a',
                          borderRadius: '14px',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          🧾 Cuenta enviada a Caja
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600 }}>
                          El cliente puede pasar a cancelar a la caja principal o esperar su factura.
                        </Typography>
                      </Paper>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<ReceiptIcon />}
                        onClick={() => handleRequestBillToCashier(selectedTable)}
                        sx={{
                          bgcolor: '#ea580c',
                          color: '#ffffff',
                          borderRadius: '14px',
                          fontWeight: 900,
                          py: 1.5,
                          fontSize: '1rem',
                          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                          '&:hover': { bgcolor: '#c2410c' }
                        }}
                      >
                        🧾 Pedir Cuenta / Enviar a Caja (${drawerActiveOrder.total.toLocaleString()})
                      </Button>
                    )
                  )}

                  {/* EDIT ORDER BUTTON */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenOrder(selectedTable)}
                    sx={{
                      borderColor: '#65a30d',
                      color: '#65a30d',
                      borderRadius: '14px',
                      fontWeight: 800,
                      py: 1.2,
                      '&:hover': { bgcolor: 'rgba(101, 163, 13, 0.08)' }
                    }}
                  >
                    Adicionar Productos / Editar en POS
                  </Button>

                  {/* TRANSFER TABLE BUTTON */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => handleOpenTransferModal(selectedTable)}
                    sx={{
                      borderColor: '#0284c7',
                      color: '#0284c7',
                      borderRadius: '14px',
                      fontWeight: 800,
                      py: 1.2,
                      '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' }
                    }}
                  >
                    Transferir / Mover a Otra Mesa
                  </Button>

                  {/* Free Table Manual Override (Solo administradores y gerentes) */}
                  {['ADMINISTRADOR', 'GERENTE'].includes(user?.role || '') && (
                    <Button
                      fullWidth
                      size="small"
                      color="inherit"
                      onClick={() => handleUpdateStatus(selectedTable.id, 'DISPONIBLE')}
                      sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      Liberar mesa manualmente sin cobro
                    </Button>
                  )}
                </Stack>
              ) : (
                /* Available or Reserved Table Action */
                <Stack spacing={1.5}>
                  {selectedTable.status === 'RESERVADA' && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: '#fefce8',
                        border: '1.5px solid #fef08a',
                        borderRadius: '14px',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <ReserveIcon sx={{ color: '#a16207', fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#a16207' }}>
                          Mesa con Reserva Confirmada
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#854d0e', display: 'block', mb: 1.5 }}>
                        Esta mesa está reservada en la agenda del salón.
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          startIcon={<AddPosIcon />}
                          onClick={() => handleOpenOrder(selectedTable)}
                          sx={{
                            bgcolor: '#ca8a04',
                            color: '#ffffff',
                            fontWeight: 800,
                            borderRadius: '10px',
                            py: 0.8,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#a16207' }
                          }}
                        >
                          Sentar y Abrir POS
                        </Button>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          onClick={() => handleUpdateStatus(selectedTable.id, 'DISPONIBLE')}
                          sx={{
                            borderColor: '#eab308',
                            color: '#a16207',
                            fontWeight: 800,
                            borderRadius: '10px',
                            py: 0.8,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#fef9c3', borderColor: '#ca8a04' }
                          }}
                        >
                          Liberar Mesa
                        </Button>
                      </Stack>
                    </Paper>
                  )}

                  {selectedTable.status !== 'RESERVADA' && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<AddPosIcon />}
                      onClick={() => handleOpenOrder(selectedTable)}
                      sx={{
                        bgcolor: '#65a30d',
                        color: '#ffffff',
                        borderRadius: '14px',
                        fontWeight: 900,
                        py: 1.5,
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(101, 163, 13, 0.3)',
                        '&:hover': { bgcolor: '#4d7c0f' }
                      }}
                    >
                      Abrir Mesa y Tomar Pedido en POS
                    </Button>
                  )}

                  {selectedTable.status === 'DISPONIBLE' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ReserveIcon />}
                      onClick={() => handleUpdateStatus(selectedTable.id, 'RESERVADA')}
                      sx={{
                        borderRadius: '14px',
                        fontWeight: 800,
                        py: 1.2,
                        borderColor: '#fde047',
                        color: '#a16207',
                        bgcolor: '#fefce8',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#fef9c3', borderColor: '#eab308' }
                      }}
                    >
                      Marcar como Reservada
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => requestDeleteTable(selectedTable)}
                      sx={{
                        borderRadius: '12px',
                        fontWeight: 800,
                        py: 1,
                        textTransform: 'none',
                        borderColor: '#fca5a5',
                        color: '#dc2626',
                        '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' }
                      }}
                    >
                      Eliminar Mesa {selectedTable.number}
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Invoicing Billing Modal */}
      {billingModalOpen && (
        <BillingModal
          open={billingModalOpen}
          onClose={() => {
            setBillingModalOpen(false);
            setSelectedTable(null);
            loadData();
          }}
          order={billingOrder}
          table={selectedTable}
          onPaymentSuccess={() => {
            // Keep billingModalOpen = true so user can view and print the invoice
            loadData();
          }}
        />
      )}

      {/* DIALOG: AGREGAR / EDITAR MESA Y CAPACIDAD DE PERSONAS */}
      <Dialog
        open={tableModalOpen}
        onClose={() => !isSubmitting && setTableModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1.5,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: '12px', color: '#16a34a', display: 'flex' }}>
                <TableIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, color: '#1e290b' }}>
                  {tableModalMode === 'create' ? 'Agregar Nueva Mesa' : `Editar Mesa ${tableForm.number}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tableModalMode === 'create' ? 'Configura la mesa y sus comensales' : 'Modifica la capacidad de personas'}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setTableModalOpen(false)} disabled={isSubmitting} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Table Number */}
            <TextField
              label="Número de Mesa"
              type="number"
              fullWidth
              size="small"
              value={tableForm.number || ''}
              onChange={(e) => setTableForm(prev => ({ ...prev, number: parseInt(e.target.value) || 0 }))}
              helperText="Identificador único en el plano de mesas"
              slotProps={{
                input: {
                  sx: { borderRadius: '12px', fontWeight: 800 }
                }
              }}
            />

            {/* Capacity (Personas / Comensales) Stepper & Presets */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                  Capacidad de Personas (Sillas)
                </Typography>
                <PeopleIcon sx={{ fontSize: 16, color: '#15803d' }} />
              </Box>

              {/* Stepper with big font */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 1.5 }}>
                <IconButton
                  onClick={() => setTableForm(prev => ({ ...prev, capacity: Math.max(1, prev.capacity - 1) }))}
                  sx={{ bgcolor: '#fff', border: '1px solid #cbd5e1', '&:hover': { bgcolor: '#f1f5f9' }, width: 40, height: 40 }}
                >
                  <RemoveIcon />
                </IconButton>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
                    {tableForm.capacity}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                    {tableForm.capacity === 1 ? 'persona' : 'personas / comensales'}
                  </Typography>
                </Box>

                <IconButton
                  onClick={() => setTableForm(prev => ({ ...prev, capacity: prev.capacity + 1 }))}
                  sx={{ bgcolor: '#fff', border: '1px solid #cbd5e1', '&:hover': { bgcolor: '#f1f5f9' }, width: 40, height: 40 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {/* Quick Presets */}
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[2, 4, 6, 8, 10, 12].map(num => (
                  <Chip
                    key={num}
                    label={`${num}p`}
                    onClick={() => setTableForm(prev => ({ ...prev, capacity: num }))}
                    variant={tableForm.capacity === num ? 'filled' : 'outlined'}
                    color={tableForm.capacity === num ? 'primary' : 'default'}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      bgcolor: tableForm.capacity === num ? '#15803d' : '#fff',
                      borderColor: '#cbd5e1'
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Location */}
            <FormControl fullWidth size="small">
              <InputLabel id="table-location-label">Ubicación / Sector</InputLabel>
              <Select
                labelId="table-location-label"
                value={tableForm.location}
                label="Ubicación / Sector"
                onChange={(e) => setTableForm(prev => ({ ...prev, location: e.target.value }))}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="Salón Principal">Salón Principal</MenuItem>
                <MenuItem value="Terraza">Terraza al Aire Libre</MenuItem>
                <MenuItem value="Balcón">Balcón</MenuItem>
                <MenuItem value="Barra">Barra / Mostrador</MenuItem>
                <MenuItem value="Zona VIP">Zona VIP</MenuItem>
                <MenuItem value="Jardín">Jardín Exterior</MenuItem>
              </Select>
            </FormControl>

            {/* Waiter assignment */}
            <FormControl fullWidth size="small">
              <InputLabel id="table-waiter-label">Mesero Asignado</InputLabel>
              <Select
                labelId="table-waiter-label"
                value={tableForm.currentWaiterId}
                label="Mesero Asignado"
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = AVAILABLE_WAITERS.find(w => w.id === selectedId);
                  setTableForm(prev => ({
                    ...prev,
                    currentWaiterId: selectedId,
                    currentWaiterName: found ? found.name : ''
                  }));
                }}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value=""><em>Sin asignar (Automático)</em></MenuItem>
                {AVAILABLE_WAITERS.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
          {isAdmin && tableModalMode === 'edit' ? (
            <Button
              color="error"
              variant="text"
              startIcon={<DeleteIcon />}
              onClick={() => {
                const table = tables.find(t => t.id === editingTableId || String(t.number) === String(editingTableId));
                if (table) requestDeleteTable(table);
              }}
              disabled={isSubmitting}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Eliminar Mesa
            </Button>
          ) : <Box />}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setTableModalOpen(false)}
              disabled={isSubmitting}
              sx={{ borderRadius: '12px', fontWeight: 700 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTable}
              disabled={isSubmitting}
              sx={{
                bgcolor: '#15803d',
                color: '#fff',
                borderRadius: '12px',
                fontWeight: 900,
                px: 2.5,
                '&:hover': { bgcolor: '#166534' }
              }}
            >
              {isSubmitting ? 'Guardando...' : (tableModalMode === 'create' ? 'Crear Mesa' : 'Guardar Cambios')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Table Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !isSubmitting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '20px', p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" /> ¿Eliminar Mesa {tableToDelete?.number}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
            ¿Estás seguro de que deseas eliminar permanentemente la <strong>Mesa {tableToDelete?.number}</strong> ({tableToDelete?.capacity} personas)?
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
            Esta acción la removerá del salón, del mapa de control y del sistema POS.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isSubmitting}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteTable}
            disabled={isSubmitting}
            sx={{ borderRadius: '12px', fontWeight: 900, px: 2 }}
          >
            {isSubmitting ? 'Eliminando...' : 'Sí, Eliminar Mesa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Table Dialog */}
      <Dialog
        open={transferModalOpen}
        onClose={() => !isSubmitting && setTransferModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon /> Transferir Comanda de Mesa
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Mesa actual: <strong>Mesa {transferSourceTable?.number}</strong>
            {transferSourceTable && (
              <span> (Orden #{getActiveOrderForTable(transferSourceTable)?.orderNumber})</span>
            )}
          </Typography>

          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', mb: 1, display: 'block' }}>
            SELECCIONA LA MESA DESTINO:
          </Typography>

          <Stack spacing={1}>
            <Button
              variant={destinationTableId === 'BARRA' ? 'contained' : 'outlined'}
              startIcon={<BarIcon />}
              onClick={() => setDestinationTableId('BARRA')}
              sx={{
                justifyContent: 'flex-start',
                borderRadius: '12px',
                fontWeight: 800,
                bgcolor: destinationTableId === 'BARRA' ? '#ea580c' : undefined,
                borderColor: '#ea580c',
                color: destinationTableId === 'BARRA' ? '#fff' : '#ea580c'
              }}
            >
              Mover a Barra (Consumo en Mostrador)
            </Button>

            {tables
              .filter(t => t.id !== transferSourceTable?.id && t.status === 'DISPONIBLE')
              .map(t => (
                <Button
                  key={t.id}
                  variant={destinationTableId === String(t.number) ? 'contained' : 'outlined'}
                  startIcon={<TableIcon />}
                  onClick={() => setDestinationTableId(String(t.number))}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: '12px',
                    fontWeight: 800,
                    bgcolor: destinationTableId === String(t.number) ? '#0284c7' : undefined,
                    borderColor: '#cbd5e1'
                  }}
                >
                  Mesa {String(t.number).padStart(2, '0')} ({t.capacity} personas) - {t.location}
                </Button>
              ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setTransferModalOpen(false)}
            disabled={isSubmitting}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleExecuteTransfer}
            disabled={!destinationTableId || isSubmitting}
            sx={{
              borderRadius: '12px',
              fontWeight: 900,
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' }
            }}
          >
            {isSubmitting ? 'Transfiriendo...' : 'Confirmar Transferencia'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
