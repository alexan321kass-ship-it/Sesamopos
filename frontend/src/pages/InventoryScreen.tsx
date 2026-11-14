import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  FileDownload as DownloadIcon,
  WarningAmber as WarningAmberIcon,
  Speed as SpeedIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  ShoppingCart as ShoppingCartIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  PieChart as ChartIcon,
  NotificationsActive as NotificationIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { InventoryItem, MeasurementUnit } from '../types';
import { useAuthStore } from '../store/authStore';

/* ── Category styling with icons & colors ───────────────────────── */
const CATEGORIES_META: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  Carnes:     { icon: '🥩', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  Panadería:  { icon: '🍞', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  Lácteos:    { icon: '🧀', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  Embutidos:  { icon: '🌭', bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  Verduras:   { icon: '🥬', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  Salsas:     { icon: '🫙', bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  Bebidas:    { icon: '🥤', bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' },
  Empaques:   { icon: '📦', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
};

const getCatMeta = (cat: string) => CATEGORIES_META[cat] || { icon: '📦', bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };

export default function InventoryScreen() {
  const { user } = useAuthStore();
  const isKitchen = user?.role === 'COCINA';
  const canManageInventory = ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'].includes(user?.role || '');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Active Main Tab: 0 = Despensa & Stock, 1 = Kardex & Auditoría, 2 = Centro de Compras, 3 = Valoración
  const [currentTab, setCurrentTab] = useState(0);

  // View Mode: Grid (Despensa visual) or Table (Tabla maestra)
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStockHealth, setSelectedStockHealth] = useState<'ALL' | 'CRITICAL' | 'LOW' | 'OPTIMAL'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'STOCK_ASC' | 'STOCK_DESC' | 'VALUATION_DESC'>('NAME_ASC');

  // Kardex filters
  const [movTypeFilter, setMovTypeFilter] = useState('ALL');
  const [movSearchTerm, setMovSearchTerm] = useState('');

  // Modals
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [openAdjustDialog, setOpenAdjustDialog] = useState(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<InventoryItem | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Conteo físico semanal');

  const [openWasteDialog, setOpenWasteDialog] = useState(false);
  const [wasteTargetItem, setWasteTargetItem] = useState<InventoryItem | null>(null);
  const [wasteQuantity, setWasteQuantity] = useState<number>(1);
  const [wasteReason, setWasteReason] = useState('Vencimiento / Descomposición');

  const [openAddStockDialog, setOpenAddStockDialog] = useState(false);
  const [addStockTargetItem, setAddStockTargetItem] = useState<InventoryItem | null>(null);
  const [addStockQuantity, setAddStockQuantity] = useState<number>(10);
  const [addStockReason, setAddStockReason] = useState('Recepción de pedido de proveedor');
  const [addStockCost, setAddStockCost] = useState<number>(0);

  const [openPurchaseOrderDialog, setOpenPurchaseOrderDialog] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);

  // Pending alerts from new recipe ingredients
  const [pendingRecipeAlerts, setPendingRecipeAlerts] = useState<any[]>([]);

  // Form State for Item Creation / Edit
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Carnes');
  const [formUnit, setFormUnit] = useState<MeasurementUnit>('Kg');
  const [formCurrentStock, setFormCurrentStock] = useState<number>(10);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formMaxStock, setFormMaxStock] = useState<number>(50);
  const [formUnitCost, setFormUnitCost] = useState<number>(15000);

  // Feedback Notification
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [items, movs] = await Promise.all([
        mockApi.inventory.getAll(),
        mockApi.inventory.getMovements(),
      ]);
      setInventory(items || []);
      setMovements(movs || []);

      // Load pending recipe alerts
      try {
        const stored = JSON.parse(localStorage.getItem('sesamo_inventory_pending_alerts') || '[]');
        setPendingRecipeAlerts(stored);
      } catch (e) {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissRecipeAlert = (alertId: string) => {
    const updated = pendingRecipeAlerts.filter(a => a.id !== alertId);
    setPendingRecipeAlerts(updated);
    try {
      localStorage.setItem('sesamo_inventory_pending_alerts', JSON.stringify(updated));
    } catch (e) {}
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_inventory_updated', handleUpdate);
    return () => window.removeEventListener('sesamo_inventory_updated', handleUpdate);
  }, []);

  // Filtered & sorted inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (!item) return false;
      const itemName = (item.name || '').toLowerCase();
      const itemCode = (item.code || (item as any).sku || '').toLowerCase();
      const search = (searchTerm || '').toLowerCase().trim();
      const matchSearch = !search || itemName.includes(search) || itemCode.includes(search);

      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;

      let matchHealth = true;
      const curStock = Number(item.currentStock) || 0;
      const minStock = Number(item.minStock) || 0;
      if (selectedStockHealth === 'CRITICAL') {
        matchHealth = curStock <= minStock;
      } else if (selectedStockHealth === 'LOW') {
        matchHealth = curStock > minStock && curStock <= minStock * 1.5;
      } else if (selectedStockHealth === 'OPTIMAL') {
        matchHealth = curStock > minStock * 1.5;
      }

      return matchSearch && matchCat && matchHealth;
    }).sort((a, b) => {
      if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'STOCK_ASC') return (Number(a.currentStock) || 0) - (Number(b.currentStock) || 0);
      if (sortBy === 'STOCK_DESC') return (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0);
      if (sortBy === 'VALUATION_DESC') {
        const valA = (Number(a.currentStock) || 0) * (Number(a.unitCost) || 0);
        const valB = (Number(b.currentStock) || 0) * (Number(b.unitCost) || 0);
        return valB - valA;
      }
      return 0;
    });
  }, [inventory, searchTerm, selectedCategory, selectedStockHealth, sortBy]);

  // Kardex Filtered
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (movTypeFilter !== 'ALL' && m.type !== movTypeFilter) return false;
      if (movSearchTerm) {
        const s = movSearchTerm.toLowerCase();
        return (m.itemName || '').toLowerCase().includes(s) || (m.reason || '').toLowerCase().includes(s) || (m.responsibleName || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [movements, movTypeFilter, movSearchTerm]);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(inventory.map((i) => i?.category).filter(Boolean)));
    return cats.sort();
  }, [inventory]);

  // Executive KPIs
  const kpis = useMemo(() => {
    const totalItems = inventory.length;
    const totalValuation = inventory.reduce((acc, curr) => {
      const stock = Number(curr?.currentStock) || 0;
      const cost = Number(curr?.unitCost ?? (curr as any)?.costPerUnit) || 0;
      return acc + stock * cost;
    }, 0);
    const criticalItems = inventory.filter((i) => (Number(i?.currentStock) || 0) <= (Number(i?.minStock) || 0));
    const lowStockItems = inventory.filter((i) => {
      const stock = Number(i?.currentStock) || 0;
      const min = Number(i?.minStock) || 0;
      return stock > min && stock <= min * 1.5;
    });
    const optimalItems = totalItems - criticalItems.length - lowStockItems.length;

    // Estimated reorder budget for items below min
    const estimatedReorderCost = criticalItems.reduce((acc, item) => {
      const cur = Number(item.currentStock) || 0;
      const max = Number(item.maxStock) || Math.max((Number(item.minStock) || 0) * 4, 30);
      const needed = Math.max(0, max - cur);
      const cost = Number(item.unitCost) || 0;
      return acc + (needed * cost);
    }, 0);

    const totalWasteQty = movements
      .filter(m => m.type === 'MERMA')
      .reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);

    const totalEntriesQty = movements
      .filter(m => m.type === 'ENTRADA')
      .reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);

    return {
      totalItems,
      totalValuation,
      criticalCount: criticalItems.length,
      criticalItems,
      lowStockCount: lowStockItems.length,
      optimalCount: optimalItems,
      estimatedReorderCost,
      totalWasteQty,
      totalEntriesQty,
    };
  }, [inventory, movements]);

  const getStockHealth = (item: InventoryItem) => {
    const curStock = Number(item?.currentStock) || 0;
    const minStock = Number(item?.minStock) || 0;
    if (curStock <= minStock) {
      return { status: 'CRITICAL', label: 'Crítico', bg: '#fef2f2', text: '#dc2626', barColor: '#ef4444', icon: <WarningIcon sx={{ fontSize: 14 }} /> };
    }
    if (curStock <= minStock * 1.5) {
      return { status: 'LOW', label: 'Alerta Baja', bg: '#fffbeb', text: '#d97706', barColor: '#f59e0b', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> };
    }
    return { status: 'OPTIMAL', label: 'Óptimo', bg: '#f0fdf4', text: '#16a34a', barColor: '#22c55e', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> };
  };

  const getStockPercentage = (item: InventoryItem) => {
    const cur = Number(item?.currentStock) || 0;
    const max = Number(item?.maxStock) || Math.max((Number(item?.minStock) || 0) * 4, 50);
    return Math.min(100, Math.max(0, Math.round((cur / max) * 100)));
  };

  // Quick Inline delta stock (+1, +5, -1)
  const handleQuickDeltaStock = async (item: InventoryItem, delta: number) => {
    try {
      const newStock = Math.max(0, parseFloat(((Number(item.currentStock) || 0) + delta).toFixed(2)));
      await mockApi.inventory.adjustStock(
        item.id,
        newStock,
        delta > 0 ? `Entrada rápida manual (+${delta})` : `Consumo rápido manual (${delta})`,
        'Chef Ejecutivo'
      );
      setNotification({
        open: true,
        message: `${item.name}: stock ${delta > 0 ? '+' + delta : delta} ${item.unit}. Total actual: ${newStock} ${item.unit}`,
        severity: 'success',
      });
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error ajustando stock', severity: 'error' });
    }
  };

  // Open Create Item Dialog
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    const nextCode = `INS-${String(inventory.length + 1).padStart(2, '0')}`;
    setFormCode(nextCode);
    setFormName('');
    setFormCategory('Carnes');
    setFormUnit('Kg');
    setFormCurrentStock(10);
    setFormMinStock(5);
    setFormMaxStock(50);
    setFormUnitCost(15000);
    setOpenItemDialog(true);
  };

  // Open Edit Item Dialog
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setFormCode(item.code || (item as any).sku || '');
    setFormName(item.name || '');
    setFormCategory(item.category || 'Carnes');
    setFormUnit(item.unit || 'Kg');
    setFormCurrentStock(Number(item.currentStock) || 0);
    setFormMinStock(Number(item.minStock) || 0);
    setFormMaxStock(Number(item.maxStock) || 50);
    setFormUnitCost(Number(item.unitCost ?? (item as any).costPerUnit) || 0);
    setOpenItemDialog(true);
  };

  // Save Create or Edit Item
  const handleSaveItem = async () => {
    if (!formName.trim()) {
      setNotification({ open: true, message: 'Ingresa el nombre del insumo.', severity: 'error' });
      return;
    }

    try {
      if (editingItem) {
        await mockApi.inventory.update(editingItem.id, {
          code: formCode.trim(),
          name: formName.trim(),
          category: formCategory,
          unit: formUnit,
          minStock: Number(formMinStock),
          maxStock: Number(formMaxStock),
          unitCost: Number(formUnitCost),
        });
        setNotification({ open: true, message: `Insumo "${formName}" actualizado con éxito.`, severity: 'success' });
      } else {
        await mockApi.inventory.create({
          code: formCode.trim(),
          name: formName.trim(),
          category: formCategory,
          unit: formUnit,
          currentStock: Number(formCurrentStock),
          minStock: Number(formMinStock),
          maxStock: Number(formMaxStock),
          unitCost: Number(formUnitCost),
          isActive: true,
        });
        setNotification({ open: true, message: `Nuevo insumo "${formName}" añadido al almacén.`, severity: 'success' });
      }
      setOpenItemDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al guardar insumo', severity: 'error' });
    }
  };

  // Open & Confirm Adjust
  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustTargetItem(item);
    setAdjustNewStock(item.currentStock);
    setAdjustReason('Conteo físico semanal de auditoría');
    setOpenAdjustDialog(true);
  };

  const handleConfirmAdjust = async () => {
    if (!adjustTargetItem) return;
    try {
      await mockApi.inventory.adjustStock(
        adjustTargetItem.id,
        Number(adjustNewStock),
        adjustReason,
        'Auditor de Almacén'
      );
      setNotification({
        open: true,
        message: `Stock de ${adjustTargetItem.name} cuadrado a ${adjustNewStock} ${adjustTargetItem.unit}.`,
        severity: 'success',
      });
      setOpenAdjustDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al ajustar stock', severity: 'error' });
    }
  };

  // Open & Confirm Waste
  const handleOpenWaste = (item?: InventoryItem) => {
    const target = item || inventory[0];
    setWasteTargetItem(target);
    setWasteQuantity(1);
    setWasteReason('Vencimiento / Descomposición');
    setOpenWasteDialog(true);
  };

  const handleConfirmWaste = async () => {
    if (!wasteTargetItem) return;
    try {
      await mockApi.inventory.reportWaste(
        wasteTargetItem.id,
        Number(wasteQuantity),
        wasteReason,
        'Jefe de Cocina'
      );
      setNotification({
        open: true,
        message: `Merma de ${wasteQuantity} ${wasteTargetItem.unit} registrada para ${wasteTargetItem.name}.`,
        severity: 'warning',
      });
      setOpenWasteDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al reportar merma', severity: 'error' });
    }
  };

  // Open & Confirm Add Stock (Reception)
  const handleOpenAddStock = (item?: InventoryItem) => {
    const target = item || inventory[0];
    setAddStockTargetItem(target);
    setAddStockQuantity(10);
    setAddStockReason('Recepción de pedido de proveedor');
    setAddStockCost(target ? Number(target.unitCost) || 0 : 0);
    setOpenAddStockDialog(true);
  };

  const handleConfirmAddStock = async () => {
    if (!addStockTargetItem) return;
    try {
      await mockApi.inventory.addStock(
        addStockTargetItem.id,
        Number(addStockQuantity),
        addStockReason,
        'Bodega Sésamo'
      );
      // If cost updated, update item unitCost
      if (addStockCost > 0 && addStockCost !== addStockTargetItem.unitCost) {
        await mockApi.inventory.update(addStockTargetItem.id, { unitCost: Number(addStockCost) });
      }
      setNotification({
        open: true,
        message: `Entrada de +${addStockQuantity} ${addStockTargetItem.unit} registrada para ${addStockTargetItem.name}.`,
        severity: 'success',
      });
      setOpenAddStockDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Error al registrar entrada', severity: 'error' });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Código,Nombre,Categoría,Unidad,Stock Actual,Stock Mínimo,Stock Máximo,Costo Unitario,Valorización Total,Estado Sanitario\n';
    const rows = filteredInventory.map(item => {
      const status = getStockHealth(item);
      const unitCost = Number(item.unitCost ?? (item as any).costPerUnit) || 0;
      const val = (Number(item.currentStock) || 0) * unitCost;
      return `"${item.code || ''}","${item.name}","${item.category}","${item.unit}",${item.currentStock},${item.minStock},${item.maxStock},${unitCost},${val},"${status.label}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_Sesamo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ open: true, message: 'Inventario exportado a CSV exitosamente.', severity: 'success' });
  };

  // Copy Suggested Order
  const handleCopySuggestedOrder = () => {
    const lines = kpis.criticalItems.map((item) => {
      const cur = Number(item.currentStock) || 0;
      const max = Number(item.maxStock) || Math.max((Number(item.minStock) || 0) * 4, 30);
      const toOrder = Math.max(1, max - cur);
      return `• ${item.name} (${item.code || 'INS'}): Pedir ${toOrder} ${item.unit} (Stock actual: ${cur} ${item.unit})`;
    });

    const text = `📋 ORDEN DE COMPRA SUGERIDA - RESTAURANTE SÉSAMO\nFecha: ${new Date().toLocaleDateString('es-CO')}\nPresupuesto estimado: $${kpis.estimatedReorderCost.toLocaleString()} COP\n\n${lines.join('\n')}\n\nGenerado automáticamente por Sésamo Alimentos.`;

    navigator.clipboard.writeText(text);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2500);
    setNotification({ open: true, message: 'Lista de compras copiada al portapapeles', severity: 'info' });
  };

  return (
    <Box sx={{ pb: 6, maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER SECTION                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: '#1e290b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#84cc16',
              boxShadow: '0 8px 20px rgba(30, 41, 11, 0.25)',
            }}
          >
            <InventoryIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                Almacén & Control de Despensa
              </Typography>
              <Chip
                label="EN VIVO"
                size="small"
                sx={{
                  bgcolor: '#ecfccb',
                  color: '#4d7c0f',
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  height: 22,
                  border: '1px solid #bef264',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              Gestión gastronómica de insumos, auditoría de stock, trazabilidad de mermas y kardex en tiempo real.
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {isKitchen && (
            <Button
              variant="contained"
              startIcon={<WarningAmberIcon />}
              onClick={() => handleOpenWaste()}
              sx={{
                fontWeight: 800,
                bgcolor: '#ea580c',
                '&:hover': { bgcolor: '#c2410c' },
                borderRadius: 2,
                px: 2,
              }}
            >
              Registrar Merma Cocina
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 700, borderRadius: 2 }}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadData(true)}
            sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 700, borderRadius: 2 }}
          >
            Sincronizar
          </Button>
          {canManageInventory && (
            <>
              <Button
                variant="contained"
                startIcon={<ShippingIcon />}
                onClick={() => handleOpenAddStock()}
                sx={{
                  fontWeight: 800,
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                  borderRadius: 2,
                  px: 2,
                }}
              >
                Entrada de Bodega
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateItem}
                sx={{
                  fontWeight: 800,
                  bgcolor: '#65a30d',
                  '&:hover': { bgcolor: '#4d7c0f' },
                  borderRadius: 2,
                  px: 2.5,
                  boxShadow: '0 4px 14px rgba(101, 163, 13, 0.35)',
                }}
              >
                Nuevo Insumo
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: '#84cc16' } }} />}

      {/* RECIPE INGREDIENT AUTO-REGISTRATION NOTIFICATION BANNER */}
      {pendingRecipeAlerts.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {pendingRecipeAlerts.map(alert => (
            <Alert
              key={alert.id}
              severity="warning"
              variant="outlined"
              icon={<NotificationIcon sx={{ color: '#d97706' }} />}
              sx={{
                borderRadius: 3,
                border: '2px solid #f59e0b',
                bgcolor: '#fffbeb',
                color: '#92400e',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
                '& .MuiAlert-message': { width: '100%' },
              }}
              action={
                <Button
                  size="small"
                  onClick={() => handleDismissRecipeAlert(alert.id)}
                  sx={{ color: '#92400e', fontWeight: 800, textTransform: 'none' }}
                >
                  Descartar
                </Button>
              }
            >
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#b45309' }}>
                    🔔 Notificación de Almacén: Insumos creados desde Ingeniería de Recetas ("{alert.recipeName}")
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78350f', mt: 0.3 }}>
                    Se registraron automáticamente en el inventario: <strong>{(alert.ingredients || []).join(', ')}</strong>.
                    Por favor registra su entrada de compra física y define su costo unitario real para mantener la exactitud del escandallo.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ShippingIcon />}
                  onClick={() => {
                    const firstItem = inventory.find(i => (alert.ingredients || []).includes(i.name));
                    handleOpenAddStock(firstItem);
                  }}
                  sx={{
                    bgcolor: '#d97706',
                    '&:hover': { bgcolor: '#b45309' },
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                    whiteSpace: 'nowrap',
                    px: 2,
                  }}
                >
                  Actualizar Stock / Costo
                </Button>
              </Box>
            </Alert>
          ))}
        </Stack>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE KPI RIBBON                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Card 1: Valorización */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f7fee7 100%)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#4d7c0f', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isKitchen ? 'Insumos en Recetario' : 'Capital en Bodega'}
              </Typography>
              <Avatar sx={{ bgcolor: '#ecfccb', color: '#65a30d', width: 36, height: 36 }}>
                {isKitchen ? <InventoryIcon fontSize="small" /> : <MoneyIcon fontSize="small" />}
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
              {isKitchen ? `${kpis.totalItems} Ítems` : `$${kpis.totalValuation.toLocaleString()}`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.5 }}>
              {isKitchen ? 'Ingredientes disponibles para producción culinaria' : `Costo de adquisición de ${kpis.totalItems} insumos`}
            </Typography>
          </Card>
        </Grid>

        {/* Card 2: Críticos / Reabastecimiento */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: kpis.criticalCount > 0 ? '#fecaca' : '#e2e8f0',
              bgcolor: kpis.criticalCount > 0 ? '#fef2f2' : '#ffffff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: kpis.criticalCount > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Stock Crítico
              </Typography>
              <Avatar sx={{ bgcolor: kpis.criticalCount > 0 ? '#fee2e2' : '#f1f5f9', color: kpis.criticalCount > 0 ? '#dc2626' : '#64748b', width: 36, height: 36 }}>
                <WarningIcon fontSize="small" />
              </Avatar>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: kpis.criticalCount > 0 ? '#dc2626' : '#1e290b' }}>
                {kpis.criticalCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                bajo umbral de seguridad
              </Typography>
            </Box>
            {kpis.criticalCount > 0 ? (
              <Button
                size="small"
                startIcon={<ShoppingCartIcon sx={{ fontSize: '13px !important' }} />}
                onClick={() => setOpenPurchaseOrderDialog(true)}
                sx={{
                  mt: 0.5,
                  p: 0,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#dc2626',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                Ver orden sugerida (${kpis.estimatedReorderCost.toLocaleString()}) →
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, mt: 0.5, display: 'block' }}>
                ✓ Despensa con reservas saludables
              </Typography>
            )}
          </Card>
        </Grid>

        {/* Card 3: Alerta Amarilla */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #fde68a',
              bgcolor: '#fffdfa',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Alerta de Consumo
              </Typography>
              <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706', width: 36, height: 36 }}>
                <WarningAmberIcon fontSize="small" />
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#d97706' }}>
              {kpis.lowStockCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.5 }}>
              Insumos próximos a nivel mínimo (≤150%)
            </Typography>
          </Card>
        </Grid>

        {/* Card 4: Tasa Sanitaria de Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #bbf7d0',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Salud de Despensa
              </Typography>
              <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 36, height: 36 }}>
                <CheckCircleIcon fontSize="small" />
              </Avatar>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d' }}>
                {kpis.totalItems > 0 ? Math.round((kpis.optimalCount / kpis.totalItems) * 100) : 100}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
                ({kpis.optimalCount}/{kpis.totalItems} óptimos)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.5 }}>
              Merma histórica reportada: {kpis.totalWasteQty.toFixed(1)} uds
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODULE NAVIGATION TABS                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Paper elevation={0} sx={{ borderBottom: '1px solid #e2e8f0', mb: 3, borderRadius: '14px 14px 0 0', bgcolor: '#ffffff' }}>
        <Tabs
          value={currentTab}
          onChange={(_, v) => setCurrentTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', minHeight: 54, fontSize: '0.95rem' },
            '& .Mui-selected': { color: '#65a30d !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#65a30d', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<InventoryIcon />} iconPosition="start" label={`Despensa en Vivo (${filteredInventory.length})`} />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Kardex & Auditoría (${movements.length})`} />
          {canManageInventory && (
            <Tab icon={<ShoppingCartIcon />} iconPosition="start" label={`Centro de Compras (${kpis.criticalCount})`} />
          )}
          {canManageInventory && (
            <Tab icon={<ChartIcon />} iconPosition="start" label="Matriz de Inversión por Categoría" />
          )}
        </Tabs>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 0: DESPENSA EN VIVO (GRID & TABLE MODES)                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 0 && (
        <Box>
          {/* CATEGORY PILL FILTER RIBBON */}
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5, mb: 2.5, scrollbarWidth: 'none' }}>
            <Chip
              label={`Todas las Categorías (${inventory.length})`}
              onClick={() => setSelectedCategory('ALL')}
              variant={selectedCategory === 'ALL' ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 800,
                cursor: 'pointer',
                bgcolor: selectedCategory === 'ALL' ? '#1e290b' : '#ffffff',
                color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
                borderColor: '#cbd5e1',
                height: 36,
                px: 1,
              }}
            />
            {categories.map(cat => {
              const meta = getCatMeta(cat);
              const count = inventory.filter(i => i.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <Chip
                  key={cat}
                  label={`${meta.icon} ${cat} (${count})`}
                  onClick={() => setSelectedCategory(cat)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 800,
                    cursor: 'pointer',
                    bgcolor: isSelected ? meta.bg : '#ffffff',
                    color: isSelected ? meta.text : '#475569',
                    borderColor: isSelected ? meta.border : '#cbd5e1',
                    height: 36,
                    px: 1,
                  }}
                />
              );
            })}
          </Box>

          {/* FILTER TOOLBAR & VIEW CONTROLS */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#ffffff' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              {/* Search */}
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar insumo por nombre o código SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchTerm('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>

              {/* Health Filter */}
              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado Sanitario</InputLabel>
                  <Select
                    value={selectedStockHealth}
                    label="Estado Sanitario"
                    onChange={(e) => setSelectedStockHealth(e.target.value as any)}
                  >
                    <MenuItem value="ALL">Todos los Niveles</MenuItem>
                    <MenuItem value="CRITICAL">🔴 Crítico (Bajo Mínimo)</MenuItem>
                    <MenuItem value="LOW">🟠 Alerta Baja</MenuItem>
                    <MenuItem value="OPTIMAL">🟢 Nivel Óptimo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort By */}
              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordenar Por</InputLabel>
                  <Select
                    value={sortBy}
                    label="Ordenar Por"
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <MenuItem value="NAME_ASC">Nombre (A - Z)</MenuItem>
                    <MenuItem value="STOCK_ASC">Menor Stock Primero</MenuItem>
                    <MenuItem value="STOCK_DESC">Mayor Stock Primero</MenuItem>
                    <MenuItem value="VALUATION_DESC">Mayor Capital Invertido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Actions & View Toggle */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<TrendingDownIcon />}
                  onClick={() => handleOpenWaste()}
                  sx={{ fontWeight: 700 }}
                >
                  Merma
                </Button>
                <Stack direction="row" spacing={0.5} sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
                  <Tooltip title="Vista Despensa Visual (Tarjetas)">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode('GRID')}
                      sx={{
                        bgcolor: viewMode === 'GRID' ? '#ffffff' : 'transparent',
                        color: viewMode === 'GRID' ? '#1e290b' : '#64748b',
                        boxShadow: viewMode === 'GRID' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        borderRadius: 1.5,
                      }}
                    >
                      <GridViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Vista Tabla Detallada">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode('TABLE')}
                      sx={{
                        bgcolor: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
                        color: viewMode === 'TABLE' ? '#1e290b' : '#64748b',
                        boxShadow: viewMode === 'TABLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        borderRadius: 1.5,
                      }}
                    >
                      <TableViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* VIEW 1: GRID MODE (Visual Pantry Cards) */}
          {viewMode === 'GRID' ? (
            <Grid container spacing={2.5}>
              {filteredInventory.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
                    <InventoryIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      No se encontraron insumos con estos filtros
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mt: 0.5, mb: 2 }}>
                      Intenta con otra categoría, borra el término de búsqueda o registra un nuevo insumo gastronómico.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateItem}
                      sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800 }}
                    >
                      Crear Insumo
                    </Button>
                  </Paper>
                </Grid>
              ) : (
                filteredInventory.map((item) => {
                  const health = getStockHealth(item);
                  const meta = getCatMeta(item.category || 'General');
                  const unitCost = Number(item.unitCost ?? (item as any).costPerUnit) || 0;
                  const currentStock = Number(item.currentStock) || 0;
                  const minStock = Number(item.minStock) || 0;
                  const maxStock = Number(item.maxStock) || Math.max(minStock * 4, 50);
                  const valTotal = currentStock * unitCost;
                  const percent = getStockPercentage(item);

                  return (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
                      <Card
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: health.status === 'CRITICAL' ? '#fecaca' : health.status === 'LOW' ? '#fde68a' : '#e2e8f0',
                          bgcolor: health.status === 'CRITICAL' ? '#fffdfd' : '#ffffff',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                            borderColor: '#84cc16',
                          },
                        }}
                      >
                        <Box>
                          {/* Top: SKU, Category & Health Chip */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#64748b', bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: 1 }}>
                                {item.code || (item as any).sku || 'INS-00'}
                              </Typography>
                              <Chip
                                label={`${meta.icon} ${item.category}`}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  bgcolor: meta.bg,
                                  color: meta.text,
                                  border: `1px solid ${meta.border}`,
                                }}
                              />
                            </Box>
                            <Chip
                              icon={health.icon}
                              label={health.label}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                bgcolor: health.bg,
                                color: health.text,
                                border: `1px solid ${health.barColor}30`,
                              }}
                            />
                          </Box>

                          {/* Item Title & Unit Cost */}
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.25, mb: 0.5 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Costo: <strong>${unitCost.toLocaleString()} COP</strong> / {item.unit} • Valor en bodega: <strong>${valTotal.toLocaleString()} COP</strong>
                          </Typography>

                          {/* Stock Level Bar Gauge */}
                          <Box sx={{ p: 1.8, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #f1f5f9', mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.8 }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                  Stock Disponible
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: health.text }}>
                                  {currentStock} <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: '#64748b' }}>{item.unit}</Typography>
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                  Umbrales
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                                  Mín: {minStock} • Máx: {maxStock}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Visual Progress Bar */}
                            <Box sx={{ width: '100%', bgcolor: '#e2e8f0', borderRadius: 10, height: 8, overflow: 'hidden' }}>
                              <Box
                                sx={{
                                  width: `${percent}%`,
                                  bgcolor: health.barColor,
                                  height: '100%',
                                  borderRadius: 10,
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Quick Inline Incrementers (+1, +5, -1) */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                              Ajuste rápido:
                            </Typography>
                            <Stack direction="row" spacing={0.8}>
                              <Tooltip title="Descontar 1 unidad">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleQuickDeltaStock(item, -1)}
                                  disabled={currentStock <= 0}
                                  sx={{ minWidth: 32, px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 800, borderColor: '#cbd5e1', color: '#dc2626' }}
                                >
                                  -1
                                </Button>
                              </Tooltip>
                              <Tooltip title="Añadir 1 unidad">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleQuickDeltaStock(item, +1)}
                                  sx={{ minWidth: 32, px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 800, borderColor: '#cbd5e1', color: '#16a34a' }}
                                >
                                  +1
                                </Button>
                              </Tooltip>
                              <Tooltip title="Añadir 5 unidades">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleQuickDeltaStock(item, +5)}
                                  sx={{ minWidth: 32, px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 800, borderColor: '#cbd5e1', color: '#16a34a' }}
                                >
                                  +5
                                </Button>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Box>

                        {/* Card Operational Actions Footer */}
                        <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 1 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="contained"
                            startIcon={<ShippingIcon sx={{ fontSize: '15px !important' }} />}
                            onClick={() => handleOpenAddStock(item)}
                            sx={{
                              bgcolor: '#16a34a',
                              '&:hover': { bgcolor: '#15803d' },
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                            }}
                          >
                            Entrada
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenAdjust(item)}
                            sx={{
                              borderColor: '#cbd5e1',
                              color: '#334155',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              minWidth: 70,
                            }}
                          >
                            Cuadrar
                          </Button>
                          <Tooltip title="Reportar Merma">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenWaste(item)}
                              sx={{ border: '1px solid #fee2e2', borderRadius: 1.5 }}
                            >
                              <TrendingDownIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar Ficha">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditItem(item)}
                              sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, color: '#334155' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          ) : (
            /* VIEW 2: TABLE MODE (Data Table Pro) */
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Insumo Gastronómico</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Categoría</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="right">Costo Unit.</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', minWidth: 220 }} align="center">Nivel de Stock</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Mín / Máx</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="right">Valorización Total</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Estado</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">No hay insumos que coincidan con la búsqueda.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const health = getStockHealth(item);
                      const meta = getCatMeta(item.category || 'General');
                      const unitCost = Number(item.unitCost ?? (item as any).costPerUnit) || 0;
                      const currentStock = Number(item.currentStock) || 0;
                      const minStock = Number(item.minStock) || 0;
                      const maxStock = Number(item.maxStock) || Math.max(minStock * 4, 50);
                      const valTotal = currentStock * unitCost;
                      const percent = getStockPercentage(item);

                      return (
                        <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#64748b', fontSize: '0.85rem' }}>
                              {item.code || (item as any).sku || 'INS-00'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 34,
                                  height: 34,
                                  bgcolor: meta.bg,
                                  color: meta.text,
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  border: `1px solid ${meta.border}`,
                                }}
                              >
                                {meta.icon}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                  {item.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Unidad: {item.unit}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                height: 22,
                                fontSize: '0.68rem',
                                bgcolor: meta.bg,
                                color: meta.text,
                                border: `1px solid ${meta.border}`,
                              }}
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                              ${unitCost.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              COP / {item.unit}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: health.text }}>
                                  {currentStock} {item.unit}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                                  {percent}%
                                </Typography>
                              </Box>
                              <Box sx={{ width: '100%', bgcolor: '#f1f5f9', borderRadius: 10, height: 7, overflow: 'hidden' }}>
                                <Box sx={{ width: `${percent}%`, bgcolor: health.barColor, height: '100%', borderRadius: 10 }} />
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                              {minStock} / {maxStock} {item.unit}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                              ${valTotal.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              COP
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              label={health.label}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                bgcolor: health.bg,
                                color: health.text,
                                border: `1px solid ${health.barColor}30`,
                              }}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                              <Tooltip title="Entrada (+Stock)">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenAddStock(item)}
                                  sx={{ bgcolor: '#f0fdf4', color: '#16a34a', '&:hover': { bgcolor: '#dcfce7' } }}
                                >
                                  <TrendingUpIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Ajustar Conteo Físico">
                                <IconButton size="small" onClick={() => handleOpenAdjust(item)} sx={{ color: '#334155' }}>
                                  <SpeedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reportar Merma">
                                <IconButton size="small" onClick={() => handleOpenWaste(item)} sx={{ color: '#ef4444' }}>
                                  <TrendingDownIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar Insumo">
                                <IconButton size="small" onClick={() => handleOpenEditItem(item)} sx={{ color: '#475569' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: KARDEX & AUDITORÍA EN TIEMPO REAL                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Kardex Digital & Trazabilidad de Auditoría
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Historial inmutable de entradas, consumos automáticos del POS, mermas de cocina y ajustes físicos.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label={`📥 Entradas: ${movements.filter(m => m.type === 'ENTRADA').length}`} size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800 }} />
              <Chip label={`📤 Salidas POS: ${movements.filter(m => m.type === 'SALIDA').length}`} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 800 }} />
              <Chip label={`🗑️ Mermas: ${movements.filter(m => m.type === 'MERMA').length}`} size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 800 }} />
              <Chip label={`⚖️ Ajustes: ${movements.filter(m => m.type === 'AJUSTE').length}`} size="small" sx={{ bgcolor: '#fffbeb', color: '#d97706', fontWeight: 800 }} />
            </Stack>
          </Box>

          {/* Kardex Filters */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por insumo, motivo o responsable..."
                  value={movSearchTerm}
                  onChange={(e) => setMovSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filtrar Tipo</InputLabel>
                  <Select value={movTypeFilter} label="Filtrar Tipo" onChange={(e) => setMovTypeFilter(e.target.value)}>
                    <MenuItem value="ALL">Todos los Movimientos ({movements.length})</MenuItem>
                    <MenuItem value="ENTRADA">📥 Entradas (Recepción Bodega)</MenuItem>
                    <MenuItem value="SALIDA">📤 Salidas (Consumo Recetas POS)</MenuItem>
                    <MenuItem value="MERMA">🗑️ Mermas (Pérdidas)</MenuItem>
                    <MenuItem value="AJUSTE">⚖️ Ajustes (Conteo Físico)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Fecha & Hora</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Insumo</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Tipo Operación</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Delta / Cantidad</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Motivo & Referencia</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Responsable</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <HistoryIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No hay movimientos que coincidan con los filtros.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => {
                    const typeConfig: Record<string, { bg: string; text: string; icon: string }> = {
                      ENTRADA: { bg: '#dcfce7', text: '#15803d', icon: '📥' },
                      SALIDA:  { bg: '#e0f2fe', text: '#0369a1', icon: '📤' },
                      MERMA:   { bg: '#fef2f2', text: '#dc2626', icon: '🗑️' },
                      AJUSTE:  { bg: '#fffbeb', text: '#d97706', icon: '⚖️' },
                    };
                    const tc = typeConfig[m.type] || typeConfig.AJUSTE;

                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {new Date(m.date).toLocaleDateString('es-CO')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(m.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>{m.itemName}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${tc.icon} ${m.type}`}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: tc.bg, color: tc.text, border: `1px solid ${tc.text}20` }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 900,
                              color: Number(m.quantity) > 0 ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#475569', maxWidth: 400 }}>
                            {m.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={m.responsibleName} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: CENTRO DE COMPRAS & REABASTECIMIENTO                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Centro de Reabastecimiento & Órdenes Sugeridas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cálculo automático de compras según stock actual vs nivel máximo óptimo. Evita quiebres de inventario durante el servicio.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={handleCopySuggestedOrder}
              disabled={kpis.criticalItems.length === 0}
              sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800 }}
            >
              {copiedOrder ? '¡Lista Copiada!' : 'Copiar Orden de Compra'}
            </Button>
          </Box>

          {kpis.criticalItems.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #bbf7d0', bgcolor: '#f0fdf4' }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d' }}>
                ¡Despensa 100% abastecida!
              </Typography>
              <Typography variant="body2" sx={{ color: '#166534', maxWidth: 450, mx: 'auto', mt: 0.5 }}>
                No hay insumos por debajo del umbral mínimo de seguridad. Todas las líneas gastronómicas cuentan con reservas suficientes.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {kpis.criticalItems.map((item) => {
                const cur = Number(item.currentStock) || 0;
                const min = Number(item.minStock) || 0;
                const max = Number(item.maxStock) || Math.max(min * 4, 30);
                const suggestedQty = Math.max(1, max - cur);
                const unitCost = Number(item.unitCost) || 0;
                const subtotal = suggestedQty * unitCost;
                const meta = getCatMeta(item.category || 'General');

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: '2px solid #fecaca',
                        bgcolor: '#fffbfb',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Chip
                            label={`${meta.icon} ${item.category}`}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
                          />
                          <Chip label="¡URGENTE!" size="small" color="error" sx={{ fontWeight: 900 }} />
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b', mb: 0.5 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                          SKU: {item.code || 'INS'}
                        </Typography>

                        <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #fed7aa', my: 2 }}>
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 4 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Actual</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#dc2626' }}>
                                {cur} {item.unit}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>Mínimo</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#334155' }}>
                                {min} {item.unit}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>A Pedir</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#16a34a' }}>
                                +{suggestedQty} {item.unit}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700 }}>
                          Presupuesto de reposición: <strong>${subtotal.toLocaleString()} COP</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          (${unitCost.toLocaleString()} COP / {item.unit})
                        </Typography>
                      </Box>

                      <Box sx={{ pt: 2, mt: 1 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<ShippingIcon />}
                          onClick={() => handleOpenAddStock(item)}
                          sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 800 }}
                        >
                          Recibir Mercancía Ahora
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 3: MATRIZ DE INVERSIÓN POR CATEGORÍA                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 3 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Distribución del Capital Invertido por Categoría
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Análisis económico de las materias primas para optimizar compras a granel y negociaciones con distribuidores.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {categories.map(cat => {
              const meta = getCatMeta(cat);
              const catItems = inventory.filter(i => i.category === cat);
              const catValuation = catItems.reduce((sum, i) => {
                return sum + (Number(i.currentStock) || 0) * (Number(i.unitCost ?? (i as any).costPerUnit) || 0);
              }, 0);
              const catPct = kpis.totalValuation > 0 ? Math.round((catValuation / kpis.totalValuation) * 100) : 0;
              const criticalInCat = catItems.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minStock) || 0)).length;

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      border: `1px solid ${meta.border}`,
                      bgcolor: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: meta.bg, color: meta.text, width: 44, height: 44, fontSize: '1.2rem', border: `1px solid ${meta.border}` }}>
                          {meta.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                            {cat}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {catItems.length} insumos registrados
                          </Typography>
                        </Box>
                      </Box>
                      {criticalInCat > 0 && (
                        <Chip label={`${criticalInCat} críticos`} size="small" color="error" sx={{ fontWeight: 800 }} />
                      )}
                    </Box>

                    <Box sx={{ p: 2, bgcolor: meta.bg, borderRadius: 2, border: `1px solid ${meta.border}`, mb: 2 }}>
                      <Typography variant="caption" sx={{ color: meta.text, fontWeight: 800, display: 'block' }}>
                        VALOR TOTAL EN BODEGA
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: meta.text }}>
                        ${catValuation.toLocaleString()} COP
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: meta.text, fontWeight: 700 }}>
                          Representa el {catPct}% del capital total
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', bgcolor: `${meta.text}20`, borderRadius: 10, height: 6, mt: 0.5, overflow: 'hidden' }}>
                        <Box sx={{ width: `${catPct}%`, bgcolor: meta.text, height: '100%', borderRadius: 10 }} />
                      </Box>
                    </Box>

                    {/* Top 3 items in category */}
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                      Mayores activos de la categoría:
                    </Typography>
                    <Stack spacing={0.8}>
                      {catItems
                        .sort((a, b) => {
                          const valA = (Number(a.currentStock) || 0) * (Number(a.unitCost) || 0);
                          const valB = (Number(b.currentStock) || 0) * (Number(b.unitCost) || 0);
                          return valB - valA;
                        })
                        .slice(0, 3)
                        .map(i => {
                          const val = (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0);
                          return (
                            <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                                {i.name} ({i.currentStock} {i.unit})
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: meta.text }}>
                                ${val.toLocaleString()}
                              </Typography>
                            </Box>
                          );
                        })}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT INVENTORY ITEM                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openItemDialog}
        onClose={() => setOpenItemDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#ecfccb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65a30d' }}>
              <InventoryIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                {editingItem ? `Editar Insumo: ${editingItem.name}` : 'Registrar Nuevo Insumo Gastronómico'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sésamo Alimentos • Gestión de Bodega
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenItemDialog(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Código SKU"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="INS-01"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Nombre del Insumo"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Carne Angus, Queso Parmesano, Aceite de Oliva"
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={formCategory}
                  label="Categoría"
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <MenuItem value="Carnes">🥩 Carnes & Cortes</MenuItem>
                  <MenuItem value="Panadería">🍞 Panadería & Masas</MenuItem>
                  <MenuItem value="Lácteos">🧀 Lácteos & Quesos</MenuItem>
                  <MenuItem value="Embutidos">🌭 Embutidos & Charcutería</MenuItem>
                  <MenuItem value="Verduras">🥬 Frutas & Verduras</MenuItem>
                  <MenuItem value="Salsas">🫙 Salsas & Condimentos</MenuItem>
                  <MenuItem value="Bebidas">🥤 Bebidas & Licores</MenuItem>
                  <MenuItem value="Empaques">📦 Empaques & Desechables</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Unidad de Medida</InputLabel>
                <Select
                  value={formUnit}
                  label="Unidad de Medida"
                  onChange={(e) => setFormUnit(e.target.value as MeasurementUnit)}
                >
                  <MenuItem value="Kg">Kg (Kilogramos)</MenuItem>
                  <MenuItem value="g">g (Gramos)</MenuItem>
                  <MenuItem value="Litro">Litro</MenuItem>
                  <MenuItem value="ml">ml (Mililitros)</MenuItem>
                  <MenuItem value="Unidad">Unidad (Pza)</MenuItem>
                  <MenuItem value="Paquete">Paquete</MenuItem>
                  <MenuItem value="Caja">Caja</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {!editingItem && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Inicial Disponible"
                  value={formCurrentStock}
                  onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: editingItem ? 12 : 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Costo Unitario ($ COP)"
                value={formUnitCost}
                onChange={(e) => setFormUnitCost(Number(e.target.value))}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Stock Mínimo (Alerta de Reabastecimiento)"
                value={formMinStock}
                onChange={(e) => setFormMinStock(Number(e.target.value))}
                helperText="El sistema alertará cuando el stock sea menor o igual"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Stock Máximo (Capacidad de Bodega)"
                value={formMaxStock}
                onChange={(e) => setFormMaxStock(Number(e.target.value))}
                helperText="Nivel ideal tras recibir un pedido completo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenItemDialog(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveItem}
            sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800, px: 3 }}
          >
            {editingItem ? 'Guardar Cambios' : 'Registrar Insumo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: AJUSTAR STOCK FÍSICO (AUDITORÍA)                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAdjustDialog}
        onClose={() => setOpenAdjustDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#1e290b' }}>
          <SpeedIcon sx={{ color: '#65a30d' }} /> Cuadre de Conteo Físico
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {adjustTargetItem && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
                Cuadrando stock para <strong>{adjustTargetItem.name}</strong> ({adjustTargetItem.code || 'INS'}).
              </Typography>

              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, mb: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  Stock Actual en Sistema:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                  {adjustTargetItem.currentStock} {adjustTargetItem.unit}
                </Typography>
              </Box>

              <TextField
                fullWidth
                type="number"
                label="Conteo Físico Real (Nuevo Stock)"
                value={adjustNewStock}
                onChange={(e) => setAdjustNewStock(Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Motivo de la Corrección"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej. Conteo físico semanal, descuadre corregido"
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdjustDialog(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmAdjust} sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800 }}>
            Confirmar Cuadre
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: REPORTAR MERMA                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openWasteDialog}
        onClose={() => setOpenWasteDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDownIcon /> Reportar Merma o Pérdida
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Insumo Afectado</InputLabel>
            <Select
              value={wasteTargetItem?.id || ''}
              label="Insumo Afectado"
              onChange={(e) => {
                const found = inventory.find((i) => i.id === e.target.value);
                if (found) setWasteTargetItem(found);
              }}
            >
              {inventory.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.name} (Stock: {i.currentStock} {i.unit})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="number"
            label={`Cantidad a Descontar (${wasteTargetItem?.unit || 'Unid'})`}
            value={wasteQuantity}
            onChange={(e) => setWasteQuantity(Math.max(0.1, Number(e.target.value)))}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Motivo de la Merma</InputLabel>
            <Select
              value={wasteReason}
              label="Motivo de la Merma"
              onChange={(e) => setWasteReason(e.target.value)}
            >
              <MenuItem value="Vencimiento / Descomposición">🗓️ Vencimiento / Descomposición</MenuItem>
              <MenuItem value="Error en preparación / Quemado">🔥 Error en preparación / Quemado</MenuItem>
              <MenuItem value="Contaminación o caída">⚠️ Contaminación o caída al suelo</MenuItem>
              <MenuItem value="Avería de empaque / Transporte">📦 Avería de empaque / Transporte</MenuItem>
              <MenuItem value="Faltante de inventario no aclarado">🔍 Faltante no aclarado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenWasteDialog(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmWaste} sx={{ fontWeight: 800 }}>
            Registrar Merma
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: ENTRADA DE STOCK (RECEPCIÓN MERCANCÍA)              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAddStockDialog}
        onClose={() => setOpenAddStockDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShippingIcon /> Recepción de Mercancía / Proveedor
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Insumo a Recibir</InputLabel>
            <Select
              value={addStockTargetItem?.id || ''}
              label="Insumo a Recibir"
              onChange={(e) => {
                const found = inventory.find((i) => i.id === e.target.value);
                if (found) {
                  setAddStockTargetItem(found);
                  setAddStockCost(Number(found.unitCost) || 0);
                }
              }}
            >
              {inventory.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.name} (Stock: {i.currentStock} {i.unit})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {addStockTargetItem && (
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2.5, mb: 2, border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>
                Stock Actual en Bodega:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d' }}>
                {addStockTargetItem.currentStock} {addStockTargetItem.unit}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            type="number"
            label={`Cantidad Recibida (${addStockTargetItem?.unit || 'Unid'})`}
            value={addStockQuantity}
            onChange={(e) => setAddStockQuantity(Math.max(0.1, Number(e.target.value)))}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="number"
            label="Costo Unitario Facturado ($ COP)"
            value={addStockCost}
            onChange={(e) => setAddStockCost(Number(e.target.value))}
            sx={{ mb: 2 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />

          <FormControl fullWidth>
            <InputLabel>Referencia / Motivo de Entrada</InputLabel>
            <Select
              value={addStockReason}
              label="Referencia / Motivo de Entrada"
              onChange={(e) => setAddStockReason(e.target.value)}
            >
              <MenuItem value="Recepción de pedido de proveedor">📦 Pedido de proveedor con factura</MenuItem>
              <MenuItem value="Compra directa en mercado local">🛒 Compra de urgencia en plaza / mercado</MenuItem>
              <MenuItem value="Transferencia entre bodegas">🔄 Transferencia de otra sede</MenuItem>
              <MenuItem value="Muestra cortesía de proveedor">🎁 Muestra / prueba técnica</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddStockDialog(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmAddStock} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 800 }}>
            Registrar Entrada
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: ORDEN DE COMPRA SUGERIDA                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openPurchaseOrderDialog}
        onClose={() => setOpenPurchaseOrderDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <ShoppingCartIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Orden de Compra Sugerida
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kpis.criticalItems.length} insumos con stock por debajo del mínimo
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenPurchaseOrderDialog(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
            Lista calculada automáticamente para alcanzar el nivel óptimo de bodega:
          </Typography>

          <Stack spacing={1}>
            {kpis.criticalItems.map((item) => {
              const cur = Number(item.currentStock) || 0;
              const max = Number(item.maxStock) || Math.max((Number(item.minStock) || 0) * 4, 30);
              const needed = Math.max(1, max - cur);
              const cost = Number(item.unitCost) || 0;

              return (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Stock actual: {cur} {item.unit} • Mín: {item.minStock} {item.unit}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                      Pedir {needed} {item.unit}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      ≈ ${(needed * cost).toLocaleString()} COP
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ mt: 2.5, p: 2, bgcolor: '#ecfccb', borderRadius: 2.5, border: '1px solid #bef264' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#365314' }}>
                Presupuesto Total Estimado:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#365314' }}>
                ${kpis.estimatedReorderCost.toLocaleString()} COP
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPurchaseOrderDialog(false)}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={copiedOrder ? <CheckIcon /> : <CopyIcon />}
            onClick={handleCopySuggestedOrder}
            sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800 }}
          >
            {copiedOrder ? '¡Copiado!' : 'Copiar para Enviar a Proveedor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR NOTIFICATIONS */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
