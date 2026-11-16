import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Grid,
  Card,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
  Stack,
  Rating,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  PendingActions as PendingIcon,
  Storefront as StoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CancelOutlined as CancelIcon,
  Check as CheckIcon,
  AutoAwesome as AutoAwesomeIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { PurchaseOrder, Supplier, InventoryItem, PurchaseOrderStatus } from '../types';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

export default function PurchasesScreen() {
  const { user } = useAuthStore();
  if (user && !['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [tabIndex, setTabIndex] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [openOrderModal, setOpenOrderModal] = useState(false);
  const [openSupplierModal, setOpenSupplierModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<PurchaseOrder | null>(null);

  // New Purchase Order Form State
  const [newOrderSupplierId, setNewOrderSupplierId] = useState('');
  const [orderItemsList, setOrderItemsList] = useState<{ itemId: string; quantity: number; unitCost: number }[]>([
    { itemId: '', quantity: 10, unitCost: 15000 },
  ]);

  // Supplier Form State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierNit, setSupplierNit] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // Notification State
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [poData, supData, invData] = await Promise.all([
        mockApi.purchases.getAll(),
        mockApi.suppliers.getAll(),
        mockApi.inventory.getAll(),
      ]);
      setPurchases(poData || []);
      setSuppliers(supData || []);
      setInventoryItems(invData || []);
      if (!newOrderSupplierId && supData && supData.length > 0) {
        setNewOrderSupplierId(supData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_purchases_updated', handleUpdate);
    window.addEventListener('sesamo_suppliers_updated', handleUpdate);
    window.addEventListener('sesamo_inventory_updated', handleUpdate);

    // Check if suggested PO items were dispatched from InventoryScreen
    try {
      const suggestedStr = sessionStorage.getItem('sesamo_suggested_po_items');
      if (suggestedStr) {
        const items = JSON.parse(suggestedStr);
        if (Array.isArray(items) && items.length > 0) {
          setOrderItemsList(items);
          setOpenOrderModal(true);
          sessionStorage.removeItem('sesamo_suggested_po_items');
        }
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sesamo_purchases_updated', handleUpdate);
      window.removeEventListener('sesamo_suppliers_updated', handleUpdate);
      window.removeEventListener('sesamo_inventory_updated', handleUpdate);
    };
  }, []);

  // Critical Low-Stock items from inventory
  const criticalItems = useMemo(() => {
    return inventoryItems.filter((i) => i.currentStock <= i.minStock);
  }, [inventoryItems]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((po) => {
      const supplierName = suppliers.find((s) => s.id === po.supplierId)?.name || '';
      const matchSearch =
        po.id.includes(searchTerm) ||
        `po-${po.id}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = selectedStatusFilter === 'ALL' || po.status === selectedStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchases, suppliers, searchTerm, selectedStatusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPurchased = purchases.reduce((acc, curr) => (curr.status === 'RECIBIDA' ? acc + curr.total : acc), 0);
    const pendingOrders = purchases.filter((p) => p.status === 'ENVIADA' || p.status === 'BORRADOR').length;
    const completedOrders = purchases.filter((p) => p.status === 'RECIBIDA').length;
    const activeSuppliers = suppliers.filter((s) => s.isActive).length;

    return { totalPurchased, pendingOrders, completedOrders, activeSuppliers };
  }, [purchases, suppliers]);

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'BORRADOR':
        return 'default';
      case 'ENVIADA':
        return 'info';
      case 'PARCIAL':
        return 'warning';
      case 'RECIBIDA':
        return 'success';
      case 'CANCELADA':
        return 'error';
      default:
        return 'default';
    }
  };

  // Open Create Order Modal
  const handleOpenCreateOrder = () => {
    setNewOrderSupplierId(suppliers[0]?.id || '');
    const firstItem = inventoryItems[0];
    setOrderItemsList([
      {
        itemId: firstItem?.id || '',
        quantity: 10,
        unitCost: firstItem?.unitCost || 15000,
      },
    ]);
    setOpenOrderModal(true);
  };

  // Autocomplete with low-stock items or smart inventory replenishment
  const handleAutocompleteCriticalItems = () => {
    let itemsToRestock = criticalItems;
    if (itemsToRestock.length === 0) {
      // If none strictly below minStock, find items below 60% of maxStock
      itemsToRestock = inventoryItems.filter((i) => i.currentStock < (i.maxStock || 50) * 0.6);
    }
    if (itemsToRestock.length === 0) {
      itemsToRestock = inventoryItems.slice(0, 4);
    }

    if (itemsToRestock.length === 0) {
      setNotification({
        open: true,
        message: 'No hay insumos registrados en inventario para sugerir compras.',
        severity: 'info',
      });
      return;
    }

    const suggested = itemsToRestock.map((item) => {
      const deficit = Math.max(5, (item.maxStock || 20) - item.currentStock);
      return {
        itemId: item.id,
        quantity: deficit,
        unitCost: item.unitCost || 10000,
      };
    });

    setOrderItemsList(suggested);
    if (!newOrderSupplierId && suppliers.length > 0) {
      setNewOrderSupplierId(suppliers[0].id);
    }
    setOpenOrderModal(true);
    setNotification({
      open: true,
      message: `Sugeridor Inteligente: Se calcularon ${suggested.length} insumos para reposición según stock máximo y consumo.`,
      severity: 'success',
    });
  };

  const handleAddItemToOrder = () => {
    const nextItem = inventoryItems[orderItemsList.length % inventoryItems.length] || inventoryItems[0];
    setOrderItemsList((prev) => [
      ...prev,
      {
        itemId: nextItem?.id || '',
        quantity: 5,
        unitCost: nextItem?.unitCost || 12000,
      },
    ]);
  };

  const handleRemoveItemFromOrder = (index: number) => {
    if (orderItemsList.length > 1) {
      setOrderItemsList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    setOrderItemsList((prev) => {
      const updated = [...prev];
      if (field === 'itemId') {
        const selected = inventoryItems.find((i) => i.id === value);
        updated[index] = {
          ...updated[index],
          itemId: value,
          unitCost: selected?.unitCost || updated[index].unitCost,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const calculateOrderTotal = () => {
    return orderItemsList.reduce((acc, curr) => acc + curr.quantity * curr.unitCost, 0);
  };

  const handleSavePurchaseOrder = async (status: PurchaseOrderStatus = 'ENVIADA') => {
    if (!newOrderSupplierId) {
      setNotification({ open: true, message: 'Selecciona un proveedor para la orden.', severity: 'error' });
      return;
    }
    const validItems = orderItemsList.filter((item) => item.itemId && item.quantity > 0);
    if (validItems.length === 0) {
      setNotification({ open: true, message: 'Agrega al menos un insumo a la orden de compra.', severity: 'error' });
      return;
    }

    try {
      const total = calculateOrderTotal();
      const newPO = await mockApi.purchases.create({
        supplierId: newOrderSupplierId,
        date: Date.now(),
        items: validItems,
        total,
        status,
      });
      setNotification({
        open: true,
        message: `Orden de Compra PO-${newPO.id.padStart(4, '0')} creada exitosamente por $${total.toLocaleString()} COP.`,
        severity: 'success',
      });
      setOpenOrderModal(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al crear orden', severity: 'error' });
    }
  };

  // Receive Order (Inyecta stock directo a bodega y actualiza costos)
  const handleReceiveOrder = async (order: PurchaseOrder) => {
    if (
      window.confirm(
        `¿Confirmas la recepción física de la Orden PO-${order.id.padStart(4, '0')}? Los insumos ingresarán automáticamente al stock de inventario con sus costos actualizados.`
      )
    ) {
      try {
        await mockApi.purchases.receiveOrder(order.id);
        setNotification({
          open: true,
          message: `¡Mercancía ingresada con éxito! Stock actualizado para ${order.items.length} insumos en el almacén.`,
          severity: 'success',
        });
        loadData();
      } catch (e: any) {
        setNotification({ open: true, message: e.message || 'Error al recibir orden', severity: 'error' });
      }
    }
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    if (window.confirm(`¿Deseas cancelar la orden PO-${order.id.padStart(4, '0')}?`)) {
      try {
        await mockApi.purchases.updateStatus(order.id, 'CANCELADA');
        setNotification({ open: true, message: `Orden PO-${order.id.padStart(4, '0')} cancelada.`, severity: 'info' });
        loadData();
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  // Supplier Actions
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierNit('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setOpenSupplierModal(true);
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierNit(supplier.nit);
    setSupplierPhone(supplier.phone);
    setSupplierEmail(supplier.email);
    setSupplierAddress(supplier.address);
    setOpenSupplierModal(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierName.trim()) {
      setNotification({ open: true, message: 'Ingresa la razón social o nombre del proveedor.', severity: 'error' });
      return;
    }

    try {
      if (editingSupplier) {
        await mockApi.suppliers.update(editingSupplier.id, {
          name: supplierName.trim(),
          nit: supplierNit.trim(),
          phone: supplierPhone.trim(),
          email: supplierEmail.trim(),
          address: supplierAddress.trim(),
        });
        setNotification({ open: true, message: `Proveedor "${supplierName}" actualizado.`, severity: 'success' });
      } else {
        await mockApi.suppliers.create({
          name: supplierName.trim(),
          nit: supplierNit.trim() || '900.000.000-1',
          phone: supplierPhone.trim(),
          email: supplierEmail.trim(),
          address: supplierAddress.trim(),
          isActive: true,
        });
        setNotification({ open: true, message: `Proveedor "${supplierName}" registrado en el directorio.`, severity: 'success' });
      }
      setOpenSupplierModal(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al guardar proveedor', severity: 'error' });
    }
  };

  const handleToggleSupplierActive = async (supplier: Supplier) => {
    try {
      await mockApi.suppliers.update(supplier.id, { isActive: !supplier.isActive });
      setNotification({
        open: true,
        message: `${supplier.name} marcado como ${!supplier.isActive ? 'Activo' : 'Inactivo'}.`,
        severity: 'info',
      });
      loadData();
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Bar with Sésamo Style */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: '-0.5px' }}>
            Compras y Cadena de Suministro
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
            Gestión de pedidos a proveedores con inyección directa al Kardex de inventario y control de costos.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color={criticalItems.length > 0 ? "error" : "primary"}
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAutocompleteCriticalItems}
            sx={{
              fontWeight: 800,
              borderRadius: '12px',
              borderColor: criticalItems.length > 0 ? '#fca5a5' : '#cbd5e1',
              bgcolor: criticalItems.length > 0 ? '#fef2f2' : '#f8fafc',
              color: criticalItems.length > 0 ? '#b91c1c' : '#1e290b',
              '&:hover': { bgcolor: criticalItems.length > 0 ? '#fee2e2' : '#f1f5f9' },
            }}
          >
            Sugeridor de Compras {criticalItems.length > 0 ? `(${criticalItems.length} alertas)` : ''}
          </Button>

          {tabIndex === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateOrder}
              sx={{
                fontWeight: 800,
                bgcolor: '#1e290b',
                color: '#ffffff',
                borderRadius: '12px',
                px: 2.5,
                boxShadow: '0 4px 14px rgba(30, 41, 11, 0.25)',
                '&:hover': { bgcolor: '#0f172a' },
              }}
            >
              Nueva Orden de Compra
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateSupplier}
              sx={{
                fontWeight: 800,
                bgcolor: '#1e290b',
                color: '#ffffff',
                borderRadius: '12px',
                px: 2.5,
                boxShadow: '0 4px 14px rgba(30, 41, 11, 0.25)',
                '&:hover': { bgcolor: '#0f172a' },
              }}
            >
              Nuevo Proveedor
            </Button>
          )}
        </Stack>
      </Box>

      {/* 2. Critical Stock Reorder Banner if any */}
      {criticalItems.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            bgcolor: '#fff7ed',
            border: '1.5px solid #fdba74',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#ffedd5', color: '#ea580c', width: 42, height: 42 }}>
              <WarningIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9a3412' }}>
                Atención: {criticalItems.length} insumos de cocina están bajo el stock mínimo
              </Typography>
              <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 600 }}>
                {criticalItems.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).slice(0, 3).join(' • ')}
                {criticalItems.length > 3 ? ` y ${criticalItems.length - 3} más...` : ''}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAutocompleteCriticalItems}
            sx={{
              bgcolor: '#ea580c',
              color: '#ffffff',
              fontWeight: 800,
              borderRadius: '10px',
              px: 2,
              '&:hover': { bgcolor: '#c2410c' },
            }}
          >
            Generar PO Automática
          </Button>
        </Paper>
      )}

      {/* 3. KPI Highlights Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Compras Recibidas (Mes)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', my: 0.5 }}>
                  ${kpis.totalPurchased.toLocaleString()} COP
                </Typography>
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
                  ✓ {kpis.completedOrders} órdenes liquidadas en stock
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#ecfccb', color: '#65a30d', width: 44, height: 44 }}>
                <MoneyIcon />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Órdenes en Camino
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7' }}>
                    {kpis.pendingOrders}
                  </Typography>
                  {kpis.pendingOrders > 0 && (
                    <Chip size="small" label="Por Recibir" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Pendientes de arribo al muelle</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 44, height: 44 }}>
                <PendingIcon />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Proveedores Activos
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a', my: 0.5 }}>
                  {kpis.activeSuppliers}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Homologados y calificados</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 44, height: 44 }}>
                <StoreIcon />
              </Avatar>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Historial de Órdenes
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#ea580c', my: 0.5 }}>
                  {purchases.length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Registros auditables</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#ffedd5', color: '#ea580c', width: 44, height: 44 }}>
                <ShippingIcon />
              </Avatar>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 4. Tabs Navigation */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              minHeight: 52,
              fontSize: '0.9rem',
              color: '#64748b',
              '&.Mui-selected': { color: '#1e290b' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#84cc16', height: 3 },
          }}
        >
          <Tab icon={<ReceiptIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Órdenes de Compra PO (${purchases.length})`} />
          <Tab icon={<StoreIcon sx={{ fontSize: 20 }} />} iconPosition="start" label={`Directorio de Proveedores (${suppliers.length})`} />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: '#f0fdf4', '& .MuiLinearProgress-bar': { bgcolor: '#84cc16' } }} />}

      {/* TAB 0: PURCHASE ORDERS */}
      {tabIndex === 0 && (
        <Box>
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por ID de orden (PO-0001) o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado de la Orden</InputLabel>
                  <Select
                    value={selectedStatusFilter}
                    label="Estado de la Orden"
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">Todas las Órdenes</MenuItem>
                    <MenuItem value="BORRADOR">Borrador</MenuItem>
                    <MenuItem value="ENVIADA">Enviada / En Camino</MenuItem>
                    <MenuItem value="RECIBIDA">Recibida (En Stock)</MenuItem>
                    <MenuItem value="CANCELADA">Cancelada</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 4 }} sx={{ textAlign: 'right' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadData(true)}
                  sx={{ fontWeight: 800, borderRadius: '10px', textTransform: 'none' }}
                >
                  Refrescar
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflowX: 'auto', maxWidth: '100%' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>ID Orden</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Proveedor</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Ítems</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Monto Total</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Estado</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Acciones Operativas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.map((order) => {
                  const supplier = suppliers.find((s) => s.id === order.supplierId);
                  const supplierName = supplier?.name || 'Proveedor General';

                  return (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#1e290b' }}>
                        PO-{order.id.padStart(4, '0')}
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 800, color: '#1e290b' }}>{supplierName}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          NIT: {supplier?.nit || 'N/A'} • {supplier?.phone || 'Sin teléfono'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center" sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                        {new Date(order.date).toLocaleDateString('es-CO')}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${order.items.length} insumos`}
                          sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }}
                        />
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, color: '#1e290b', fontSize: '0.95rem' }}>
                        ${order.total.toLocaleString()} COP
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={order.status === 'RECIBIDA' ? 'Recibida en Stock' : order.status === 'ENVIADA' ? 'Enviada / En Camino' : order.status}
                          color={getStatusColor(order.status) as any}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'inline-flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => {
                              setSelectedOrderForDetail(order);
                              setOpenDetailModal(true);
                            }}
                            sx={{ fontSize: '0.75rem', py: 0.3, borderRadius: '8px', fontWeight: 700 }}
                          >
                            Detalle
                          </Button>

                          {order.status === 'ENVIADA' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => handleReceiveOrder(order)}
                              sx={{ fontSize: '0.75rem', py: 0.3, fontWeight: 800, borderRadius: '8px' }}
                            >
                              Recibir Stock
                            </Button>
                          )}

                          {order.status === 'ENVIADA' && (
                            <Tooltip title="Cancelar Orden">
                              <IconButton size="small" color="error" onClick={() => handleCancelOrder(order)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {tabIndex === 1 && (
        <Box>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflowX: 'auto', maxWidth: '100%' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Razón Social / Proveedor</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>NIT / Documento</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Contacto / WhatsApp</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Email de Pedidos</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Plazo Comercial</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Estado</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover sx={{ opacity: supplier.isActive ? 1 : 0.6 }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900, width: 38, height: 38 }}>
                          {supplier.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: '#1e290b' }}>{supplier.name}</Typography>
                          <Rating size="small" value={5} readOnly sx={{ fontSize: 13 }} />
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>{supplier.nit}</TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{supplier.phone}</Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon sx={{ fontSize: 16, color: '#0284c7' }} />
                        <Typography variant="body2">{supplier.email}</Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip label="Crédito 15 días" size="small" sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534', fontSize: '0.72rem' }} />
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={supplier.isActive ? 'Activo' : 'Inactivo'}
                        color={supplier.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEditSupplier(supplier)}
                          sx={{ borderRadius: '8px', fontWeight: 700 }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color={supplier.isActive ? 'error' : 'success'}
                          onClick={() => handleToggleSupplierActive(supplier)}
                          sx={{ fontWeight: 700 }}
                        >
                          {supplier.isActive ? 'Inactivar' : 'Activar'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* MODAL: NUEVA ORDEN DE COMPRA */}
      <Dialog
        open={openOrderModal}
        onClose={() => setOpenOrderModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b', pb: 1 }}>
          Generar Nueva Orden de Compra (PO)
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Proveedor Asignado</InputLabel>
              <Select
                value={newOrderSupplierId}
                label="Proveedor Asignado"
                onChange={(e) => setNewOrderSupplierId(e.target.value)}
              >
                {suppliers.filter((s) => s.isActive).map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} (NIT: {s.nit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Insumos Solicitados para Abastecimiento:
            </Typography>
            <Button
              size="small"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleAutocompleteCriticalItems}
              sx={{ fontWeight: 800, color: '#ea580c' }}
            >
              Cargar Insumos Bajos
            </Button>
          </Box>

          {orderItemsList.map((itemRow, index) => (
            <Paper key={index} sx={{ p: 1.5, mb: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Insumo del Inventario</InputLabel>
                    <Select
                      value={itemRow.itemId}
                      label="Insumo del Inventario"
                      onChange={(e) => handleItemFieldChange(index, 'itemId', e.target.value)}
                    >
                      {inventoryItems.map((inv) => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.name} ({inv.unit}) — Stock act: {inv.currentStock}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Cantidad Solicitada"
                    value={itemRow.quantity}
                    onChange={(e) => handleItemFieldChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Costo Unit. (COP)"
                    value={itemRow.unitCost}
                    onChange={(e) => handleItemFieldChange(index, 'unitCost', Number(e.target.value))}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 1 }} sx={{ textAlign: 'center' }}>
                  {orderItemsList.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => handleRemoveItemFromOrder(index)}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            </Paper>
          ))}

          <Button startIcon={<AddIcon />} onClick={handleAddItemToOrder} sx={{ fontWeight: 800, mt: 1 }}>
            Agregar Otro Insumo
          </Button>

          <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2.5, mt: 2, textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>
              TOTAL ESTIMADO DE LA ORDEN DE COMPRA:
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d' }}>
              ${calculateOrderTotal().toLocaleString()} COP
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenOrderModal(false)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="outlined" onClick={() => handleSavePurchaseOrder('BORRADOR')} sx={{ fontWeight: 800, borderRadius: '10px' }}>
            Guardar como Borrador
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSavePurchaseOrder('ENVIADA')}
            sx={{ bgcolor: '#1e290b', color: '#ffffff', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#0f172a' } }}
          >
            Emitir y Enviar Orden
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: VER DETALLE DE ORDEN */}
      <Dialog
        open={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b' }}>
          Detalle de Orden: PO-{selectedOrderForDetail?.id.padStart(4, '0')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrderForDetail && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>PROVEEDOR:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                    {suppliers.find((s) => s.id === selectedOrderForDetail.supplierId)?.name}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>ESTADO:</Typography>
                  <Box>
                    <Chip
                      size="small"
                      label={selectedOrderForDetail.status}
                      color={getStatusColor(selectedOrderForDetail.status) as any}
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Insumo</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Cantidad</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Costo Unit.</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderForDetail.items.map((item, idx) => {
                      const invItem = inventoryItems.find((i) => i.id === item.itemId);
                      return (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 700 }}>{invItem?.name || `Insumo #${item.itemId}`}</TableCell>
                          <TableCell align="center">{item.quantity} {invItem?.unit}</TableCell>
                          <TableCell align="right">${item.unitCost.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            ${(item.quantity * item.unitCost).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Fecha de Emisión: {new Date(selectedOrderForDetail.date).toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803d' }}>
                  Total: ${selectedOrderForDetail.total.toLocaleString()} COP
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {selectedOrderForDetail?.status === 'ENVIADA' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setOpenDetailModal(false);
                handleReceiveOrder(selectedOrderForDetail);
              }}
              sx={{ fontWeight: 800, borderRadius: '10px' }}
            >
              Recibir Mercancía (Ingresar al Stock)
            </Button>
          )}
          <Button onClick={() => setOpenDetailModal(false)} sx={{ fontWeight: 700 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CREAR / EDITAR PROVEEDOR */}
      <Dialog
        open={openSupplierModal}
        onClose={() => setOpenSupplierModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b' }}>
          {editingSupplier ? `Editar Proveedor: ${editingSupplier.name}` : 'Registrar Nuevo Proveedor'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Razón Social / Nombre de la Empresa"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ej. Distribuidora Carnes Premium S.A.S"
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="NIT / Identificación Fiscal"
                value={supplierNit}
                onChange={(e) => setSupplierNit(e.target.value)}
                placeholder="900.123.456-7"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Teléfono / Celular de Contacto"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="3001234567"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Correo Electrónico para Pedidos"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                placeholder="ventas@proveedor.com"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Dirección Física / Despacho"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                placeholder="Calle 10 # 20-30"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenSupplierModal(false)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveSupplier}
            sx={{ bgcolor: '#1e290b', color: '#ffffff', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#0f172a' } }}
          >
            {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR NOTIFICATIONS */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
