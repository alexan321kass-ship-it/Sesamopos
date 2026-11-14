import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Alert,
  Snackbar,
  InputAdornment,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  PointOfSale as PosIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  AddCircle as AddIcon,
  RemoveCircle as RemoveIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  TwoWheeler as DeliveryDiningIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  CreditCard as CardIcon,
  AccountBalanceWallet as WalletIcon,
  ReceiptLong as ReceiptIcon,
  Calculate as CalculateIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { useAuthStore } from '../store/authStore';
import { CashRegister, Order, DeliveryOrder } from '../types';

export default function CashRegisterScreen() {
  const { user } = useAuthStore();

  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [manualMovements, setManualMovements] = useState<any[]>([]);
  const [closuresHistory, setClosuresHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Active Tab: 0 = Turno Activo & Arqueo, 1 = Métodos de Pago, 2 = Historial de Reportes Z
  const [currentTab, setCurrentTab] = useState(0);

  // Filter for movements log
  const [movementFilterType, setMovementFilterType] = useState('ALL');
  const [movementSearch, setMovementSearch] = useState('');

  // Dialog states
  const [openRegisterDialogOpen, setOpenRegisterDialogOpen] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState<number>(200000);
  const [cashierNameInput, setCashierNameInput] = useState<string>(user?.name || 'Laura Gómez (Cajera)');

  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<'INGRESO' | 'GASTO'>('GASTO');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');
  const [movementCategory, setMovementCategory] = useState<string>('Compra de Hielo / Urgencia');

  const [closeRegisterDialogOpen, setCloseRegisterDialogOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isRegisterClosedReport, setIsRegisterClosedReport] = useState(false);

  // Historical Ticket Z Modal
  const [selectedHistoricalZ, setSelectedHistoricalZ] = useState<any | null>(null);

  // Denominations calculator for physical cash audit
  const [showDenomCalc, setShowDenomCalc] = useState(true);
  const [denomCounts, setDenomCounts] = useState<{ [denom: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
  });

  // Snackbar feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleDenomChange = (denom: number, count: number) => {
    const updated = { ...denomCounts, [denom]: Math.max(0, count) };
    setDenomCounts(updated);
    const sum = Object.entries(updated).reduce((acc, [d, c]) => acc + (Number(d) * Number(c)), 0);
    setCountedCash(sum);
  };

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [reg, allOrders, movs, allDeliveries, history] = await Promise.all([
        mockApi.cash.getCurrentRegister(),
        mockApi.orders.getAll(),
        mockApi.cash.getMovements(),
        mockApi.deliveries.getAll(),
        mockApi.cash.getHistory(),
      ]);
      setCurrentRegister(reg || null);
      setOrders(allOrders || []);
      setManualMovements(movs || []);
      setDeliveries(allDeliveries || []);
      setClosuresHistory(history || []);
    } catch (e) {
      console.error('Error cargando caja:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('sesamo_order_updated', () => loadData());
    window.addEventListener('sesamo_cash_updated', () => loadData());
    window.addEventListener('sesamo_deliveries_updated', () => loadData());
    return () => {
      window.removeEventListener('sesamo_order_updated', () => loadData());
      window.removeEventListener('sesamo_cash_updated', () => loadData());
      window.removeEventListener('sesamo_deliveries_updated', () => loadData());
    };
  }, []);

  // Quick Open Register
  const handleOpenRegisterSubmit = async () => {
    try {
      const newReg = await mockApi.cash.openRegister(
        initialAmountInput,
        cashierNameInput || user?.name || 'Cajero Sésamo'
      );
      setCurrentRegister(newReg);
      setOpenRegisterDialogOpen(false);
      setSnackbar({ open: true, message: `Turno abierto con éxito. Base inicial: $${initialAmountInput.toLocaleString()} COP`, severity: 'success' });
      loadData();
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Error abriendo caja', severity: 'error' });
    }
  };

  // Add Manual Movement
  const handleAddMovementSubmit = async () => {
    if (!movementAmount || movementAmount <= 0) {
      setSnackbar({ open: true, message: 'Ingresa un monto válido.', severity: 'error' });
      return;
    }
    const finalReason = movementReason.trim() ? `${movementCategory} - ${movementReason.trim()}` : movementCategory;
    try {
      await mockApi.cash.addMovement(movementType, movementAmount, finalReason);
      setMovementDialogOpen(false);
      setMovementAmount(0);
      setMovementReason('');
      setSnackbar({
        open: true,
        message: `${movementType === 'INGRESO' ? 'Ingreso' : 'Gasto'} de $${movementAmount.toLocaleString()} COP registrado.`,
        severity: 'success'
      });
      loadData();
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Error registrando movimiento', severity: 'error' });
    }
  };

  // Finalize Register Closure
  const handleFinalizeClose = async () => {
    try {
      const snapshot = {
        totalTurnoSales,
        cashSales,
        cardDigitalSales,
        salonCashSales,
        salonCardDigitalSales,
        deliveryCashSales,
        deliveryCardDigitalSales,
        totalTips,
        manualIngresos,
        manualGastos,
        expectedCashInBox,
        difference,
        paidOrdersCount: paidOrders.length,
        completedDeliveriesCount: completedDeliveries.length,
      };

      await mockApi.cash.closeRegister(countedCash, closeNotes, snapshot);
      setCloseRegisterDialogOpen(false);
      setIsRegisterClosedReport(false);
      setCurrentRegister(null);
      setSnackbar({ open: true, message: 'Turno de caja cerrado y Reporte Z archivado exitosamente.', severity: 'success' });
      loadData();
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Error cerrando caja', severity: 'error' });
    }
  };

  // Active shift calculations
  const shiftStart = currentRegister?.openedAt || 0;
  const paidOrders = useMemo(() => {
    return orders.filter(o =>
      o.status === 'PAGADO' && (
        o.registerId === currentRegister?.id ||
        (o.paidAt && o.paidAt >= shiftStart) ||
        (o.createdAt && o.createdAt >= shiftStart)
      )
    );
  }, [orders, currentRegister, shiftStart]);

  const shiftDeliveries = useMemo(() => {
    return deliveries.filter(d =>
      d.status !== 'CANCELADO' &&
      d.deliveryStatus !== 'CANCELADO' && (
        (d.deliveredAt && d.deliveredAt >= shiftStart) ||
        (d.createdAt && d.createdAt >= shiftStart)
      )
    );
  }, [deliveries, shiftStart]);

  const completedDeliveries = useMemo(() => {
    return shiftDeliveries.filter(d =>
      d.deliveryStatus === 'ENTREGADO' || d.status === 'ENTREGADO' || d.status === 'PAGADO'
    );
  }, [shiftDeliveries]);

  const pendingDeliveries = useMemo(() => {
    return shiftDeliveries.filter(d =>
      !completedDeliveries.some(cd => cd.id === d.id)
    );
  }, [shiftDeliveries, completedDeliveries]);

  // Breakdown by channel and payment method
  const salonCashSales = useMemo(() => {
    return paidOrders.reduce((sum, o) => {
      if (!o.paymentMethod || o.paymentMethod === 'EFECTIVO') return sum + (o.total || 0);
      if (o.paymentMethod === 'MIXTO' && o.mixedPayments) {
        const cashPart = o.mixedPayments.find(m => m.method.toLowerCase().includes('efectivo'))?.amount || 0;
        return sum + cashPart;
      }
      return sum;
    }, 0);
  }, [paidOrders]);

  const salonCardDigitalSales = useMemo(() => {
    return paidOrders.reduce((sum, o) => {
      if (o.paymentMethod === 'TARJETA' || o.paymentMethod === 'TRANSFERENCIA') return sum + (o.total || 0);
      if (o.paymentMethod === 'MIXTO' && o.mixedPayments) {
        const digitalPart = o.mixedPayments.find(m => !m.method.toLowerCase().includes('efectivo'))?.amount || 0;
        return sum + digitalPart;
      }
      return sum;
    }, 0);
  }, [paidOrders]);

  const deliveryCashSales = useMemo(() => {
    return completedDeliveries.reduce((sum, d) => {
      if (!d.paymentMethod || d.paymentMethod === 'EFECTIVO') return sum + (d.total || 0);
      return sum;
    }, 0);
  }, [completedDeliveries]);

  const deliveryCardDigitalSales = useMemo(() => {
    return completedDeliveries.reduce((sum, d) => {
      if (d.paymentMethod === 'TARJETA' || d.paymentMethod === 'TRANSFERENCIA' || d.paymentMethod === 'DATAFONO') {
        return sum + (d.total || 0);
      }
      return sum;
    }, 0);
  }, [completedDeliveries]);

  // Totals for shift
  const cashSales = salonCashSales + deliveryCashSales;
  const cardDigitalSales = salonCardDigitalSales + deliveryCardDigitalSales;
  const totalTurnoSales = cashSales + cardDigitalSales;

  const totalTips = paidOrders.reduce((sum, o) => sum + (o.tip || 0), 0);

  const manualIngresos = manualMovements
    .filter(m => m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0);

  const manualGastos = manualMovements
    .filter(m => m.amount < 0)
    .reduce((sum, m) => sum + Math.abs(m.amount), 0);

  const initialFloat = currentRegister?.initialAmount || 0;
  const expectedCashInBox = initialFloat + cashSales + manualIngresos - manualGastos;
  const difference = countedCash - expectedCashInBox;

  // Combine sales, deliveries, and manual movements for audit table
  const allHistoryMovements = useMemo(() => {
    const list = [
      ...manualMovements.map(m => ({
        id: m.id,
        date: m.date,
        type: m.type === 'INGRESO' ? 'INGRESO MANUAL' : 'GASTO / CAJA MENOR',
        category: 'MANUAL',
        reason: m.reason,
        amount: m.amount,
        paymentMethod: 'EFECTIVO'
      })),
      ...paidOrders.map(o => ({
        id: o.id,
        date: o.paidAt || o.createdAt,
        type: 'VENTA SALÓN',
        category: 'SALON',
        reason: `Mesa ${o.tableId || 'Barra'} • Orden #${o.orderNumber}`,
        amount: o.total,
        paymentMethod: o.paymentMethod || 'EFECTIVO'
      })),
      ...completedDeliveries.map(d => ({
        id: d.id,
        date: d.deliveredAt || d.createdAt,
        type: 'VENTA DOMICILIO',
        category: 'DOMICILIO',
        reason: `Domicilio #${d.orderNumber} • ${d.customer?.name || 'Cliente'} (${d.deliveryAddress || 'Domicilio'})`,
        amount: d.total,
        paymentMethod: d.paymentMethod || 'EFECTIVO'
      }))
    ];

    return list.filter(item => {
      if (movementFilterType !== 'ALL' && item.type !== movementFilterType) return false;
      if (movementSearch) {
        const s = movementSearch.toLowerCase();
        return (item.reason || '').toLowerCase().includes(s) || (item.paymentMethod || '').toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => b.date - a.date);
  }, [manualMovements, paidOrders, completedDeliveries, movementFilterType, movementSearch]);

  // Duration shift string
  const shiftDurationString = useMemo(() => {
    if (!currentRegister?.openedAt) return '';
    const diffMs = Date.now() - currentRegister.openedAt;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m de servicio`;
  }, [currentRegister]);

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
              bgcolor: currentRegister ? '#1e290b' : '#fef2f2',
              color: currentRegister ? '#84cc16' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: currentRegister ? '0 8px 20px rgba(30, 41, 11, 0.25)' : 'none',
              border: currentRegister ? 'none' : '2px solid #fecaca',
            }}
          >
            {currentRegister ? <LockOpenIcon sx={{ fontSize: 28 }} /> : <LockIcon sx={{ fontSize: 28 }} />}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                Caja & Arqueo de Turno
              </Typography>
              <Chip
                label={currentRegister ? '🟢 TURNO ACTIVO' : '🔴 CAJA CERRADA'}
                size="small"
                sx={{
                  bgcolor: currentRegister ? '#ecfccb' : '#fee2e2',
                  color: currentRegister ? '#4d7c0f' : '#b91c1c',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  height: 24,
                  border: `1px solid ${currentRegister ? '#bef264' : '#fca5a5'}`,
                }}
              />
              {currentRegister && (
                <Chip
                  label={shiftDurationString}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', height: 24 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Cajero responsable: <strong>{currentRegister?.openedBy || user?.name || 'Laura Gómez'}</strong> • Sésamo POS Punto de Venta
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadData(true)}
            sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 700, borderRadius: 2 }}
          >
            Actualizar
          </Button>

          {currentRegister ? (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RemoveIcon />}
                onClick={() => {
                  setMovementType('GASTO');
                  setMovementDialogOpen(true);
                }}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Gasto Menor
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  setMovementType('INGRESO');
                  setMovementDialogOpen(true);
                }}
                sx={{ fontWeight: 800, borderColor: '#65a30d', color: '#4d7c0f', borderRadius: 2 }}
              >
                Ingreso Extra
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<LockIcon />}
                onClick={() => {
                  setCountedCash(0);
                  setShowDenomCalc(true);
                  setCloseRegisterDialogOpen(true);
                }}
                sx={{
                  fontWeight: 900,
                  borderRadius: 2,
                  px: 2.5,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                }}
              >
                Arqueo Z & Cerrar Turno
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<LockOpenIcon />}
              onClick={() => setOpenRegisterDialogOpen(true)}
              sx={{
                bgcolor: '#65a30d',
                '&:hover': { bgcolor: '#4d7c0f' },
                color: '#ffffff',
                fontWeight: 900,
                borderRadius: 2,
                px: 3,
                boxShadow: '0 4px 14px rgba(101, 163, 13, 0.35)',
              }}
            >
              Abrir Caja e Iniciar Turno
            </Button>
          )}
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: '#84cc16' } }} />}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BANNER IF REGISTER IS CLOSED                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {!currentRegister && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 4,
            border: '2px dashed #cbd5e1',
            bgcolor: '#ffffff',
            mb: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <PosIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', mb: 1 }}>
            No hay ningún turno de caja abierto actualmente
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
            Para registrar cobros en el POS, liquidar domicilios y llevar el control del dinero físico, debes iniciar turno e ingresar la base inicial de efectivo.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<LockOpenIcon />}
            onClick={() => setOpenRegisterDialogOpen(true)}
            sx={{
              bgcolor: '#65a30d',
              '&:hover': { bgcolor: '#4d7c0f' },
              color: '#ffffff',
              borderRadius: 2.5,
              fontWeight: 900,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(101, 163, 13, 0.35)',
            }}
          >
            Iniciar Turno de Caja con Base
          </Button>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE KPI STRIP (WHEN ACTIVE)                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentRegister && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* KPI 1: Base Inicial */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Base Inicial
                  </Typography>
                  <WalletIcon sx={{ fontSize: 18, color: '#0284c7' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284c7' }}>
                  ${initialFloat.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Fondo de sencillo</Typography>
              </Paper>
            </Grid>

            {/* KPI 2: Ventas Totales */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Ventas del Turno
                  </Typography>
                  <MoneyIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#16a34a' }}>
                  ${totalTurnoSales.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">{paidOrders.length} salón • {completedDeliveries.length} dom.</Typography>
              </Paper>
            </Grid>

            {/* KPI 3: Efectivo Físico Esperado */}
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '2px solid #ea580c',
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#c2410c', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    💼 Efectivo en Gaveta
                  </Typography>
                  <CalculateIcon sx={{ fontSize: 18, color: '#ea580c' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#c2410c' }}>
                  ${expectedCashInBox.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 700 }}>Efectivo físico a entregar</Typography>
              </Paper>
            </Grid>

            {/* KPI 4: Tarjetas & Digital */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Tarjeta / Nequi
                  </Typography>
                  <CardIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#7c3aed' }}>
                  ${cardDigitalSales.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Comprobantes bancarios</Typography>
              </Paper>
            </Grid>

            {/* KPI 5: Propinas */}
            <Grid size={{ xs: 6, sm: 4, md: 1.75 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Propinas
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#65a30d' }}>10%</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                  ${totalTips.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Fondo meseros</Typography>
              </Paper>
            </Grid>

            {/* KPI 6: Gastos Menores */}
            <Grid size={{ xs: 12, sm: 4, md: 1.75 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Gastos Menores
                  </Typography>
                  <RemoveIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#dc2626' }}>
                  -${manualGastos.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">{manualMovements.filter(m => m.amount < 0).length} salidas</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Pending Deliveries Alert Strip */}
          {pendingDeliveries.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#0284c7', width: 38, height: 38 }}>
                  <DeliveryDiningIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369a1' }}>
                    {pendingDeliveries.length} Domicilio{pendingDeliveries.length > 1 ? 's' : ''} en Ruta ({pendingDeliveries.map(d => `#${d.orderNumber}`).join(', ')})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total en despacho: <strong>${pendingDeliveries.reduce((sum, d) => sum + (d.total || 0), 0).toLocaleString()} COP</strong>. El dinero en efectivo se sumará automáticamente a la caja cuando los repartidores regresen y se marquen como Entregados.
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="Pendiente de Liquidar"
                size="small"
                sx={{ bgcolor: '#0284c7', color: '#ffffff', fontWeight: 800 }}
              />
            </Paper>
          )}
        </>
      )}

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
            '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', minHeight: 52, fontSize: '0.95rem' },
            '& .Mui-selected': { color: '#65a30d !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#65a30d', height: 3 },
          }}
        >
          <Tab icon={<ReceiptIcon />} iconPosition="start" label={`Movimientos del Turno (${allHistoryMovements.length})`} />
          <Tab icon={<CardIcon />} iconPosition="start" label="Auditoría por Métodos de Pago" />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Historial de Reportes Z (${closuresHistory.length})`} />
        </Tabs>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 0: MOVIMIENTOS DEL TURNO EN VIVO                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 0 && (
        <Box>
          {/* Filter Toolbar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar movimiento por orden, concepto o método..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
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

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                  <Chip
                    label="Todos"
                    clickable
                    onClick={() => setMovementFilterType('ALL')}
                    variant={movementFilterType === 'ALL' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 800, bgcolor: movementFilterType === 'ALL' ? '#1e290b' : undefined, color: movementFilterType === 'ALL' ? '#fff' : undefined }}
                  />
                  <Chip
                    label="Ventas Salón"
                    clickable
                    onClick={() => setMovementFilterType('VENTA SALÓN')}
                    variant={movementFilterType === 'VENTA SALÓN' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 800 }}
                  />
                  <Chip
                    label="Domicilios"
                    clickable
                    onClick={() => setMovementFilterType('VENTA DOMICILIO')}
                    variant={movementFilterType === 'VENTA DOMICILIO' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 800 }}
                  />
                  <Chip
                    label="Gastos"
                    clickable
                    onClick={() => setMovementFilterType('GASTO / CAJA MENOR')}
                    variant={movementFilterType === 'GASTO / CAJA MENOR' ? 'filled' : 'outlined'}
                    color="error"
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Transactions Table */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflowX: 'auto', maxWidth: '100%' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Hora</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Tipo de Operación</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Concepto / Detalle</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Método de Pago</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allHistoryMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay movimientos registrados en este turno que coincidan con los filtros.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  allHistoryMovements.map((mov) => {
                    const isPositive = mov.amount > 0;
                    return (
                      <TableRow key={mov.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                          {new Date(mov.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={mov.category === 'DOMICILIO' ? <DeliveryDiningIcon sx={{ fontSize: '1rem !important' }} /> : undefined}
                            label={mov.type}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              bgcolor:
                                mov.category === 'DOMICILIO' ? '#e0f2fe' :
                                mov.type.includes('GASTO') ? '#fee2e2' :
                                mov.type.includes('INGRESO') ? '#fef3c7' :
                                '#dcfce7',
                              color:
                                mov.category === 'DOMICILIO' ? '#0369a1' :
                                mov.type.includes('GASTO') ? '#b91c1c' :
                                mov.type.includes('INGRESO') ? '#92400e' :
                                '#15803d',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {mov.reason}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mov.paymentMethod}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, borderColor: '#cbd5e1', color: '#475569' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 900,
                              color: isPositive ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {isPositive ? '+' : ''}${mov.amount.toLocaleString()} COP
                          </Typography>
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
      {/* TAB 1: AUDITORÍA POR MÉTODOS DE PAGO                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Desglose y Conciliación por Formas de Pago
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verifica los comprobantes físicos (vouchers de datáfono, transferencias Nequi/Bancolombia) contra el dinero en caja.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Efectivo */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #bbf7d0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}>
                    <MoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      Efectivo Físico
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Moneda de curso legal en gaveta
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Base Inicial de Cambio:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>${initialFloat.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Ventas en Efectivo (Salón):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>+${salonCashSales.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Ventas en Efectivo (Domicilios):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>+${deliveryCashSales.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Ingresos Manuales de Sencillo:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>+${manualIngresos.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Gastos / Compras de Caja Menor:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#dc2626' }}>-${manualGastos.toLocaleString()}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Efectivo Total a Entregar:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#ea580c' }}>${expectedCashInBox.toLocaleString()} COP</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Tarjetas & Digital */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #ddd6fe', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#ede9fe', color: '#7c3aed' }}>
                    <CardIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      Pagos Electrónicos & Vouchers
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Datáfono, Tarjetas Débito/Crédito y Transferencias QR
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Datáfono / Tarjetas en Salón:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#7c3aed' }}>${salonCardDigitalSales.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Pagos Digitales en Domicilios:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#7c3aed' }}>${deliveryCardDigitalSales.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Transacciones Electrónicas:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {paidOrders.filter(o => o.paymentMethod !== 'EFECTIVO').length + completedDeliveries.filter(d => d.paymentMethod !== 'EFECTIVO').length} operaciones
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Total Vouchers a Cuadrar:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#7c3aed' }}>${cardDigitalSales.toLocaleString()} COP</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: HISTORIAL DE REPORTES Z (CIERRES ANTERIORES)        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Historial de Cierres de Turno & Reportes Fiscales Z
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta, auditoría y reimpresión de las tirillas de cierre de caja de jornadas anteriores.
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflowX: 'auto', maxWidth: '100%' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Fecha & Hora Cierre</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Cajero</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="right">Base Inicial</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="right">Ventas Totales</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="right">Efectivo Contado</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Diferencia (Cuadre)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {closuresHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay cierres históricos registrados aún.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  closuresHistory.map((h) => {
                    const diff = h.snapshot ? h.snapshot.difference : 0;
                    return (
                      <TableRow key={h.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {new Date(h.closedAt).toLocaleDateString('es-CO')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(h.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{h.openedBy || h.closedBy}</TableCell>
                        <TableCell align="right">${(h.initialAmount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>
                          ${(h.snapshot?.totalTurnoSales || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          ${(h.countedCash || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={diff === 0 ? 'Exacto ($0)' : diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`}
                            size="small"
                            color={diff === 0 ? 'success' : diff > 0 ? 'info' : 'error'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver Tirilla Z de Cierre">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedHistoricalZ(h)}
                              sx={{ color: '#0284c7' }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
      {/* DIALOG 1: APERTURA DE TURNO DE CAJA                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openRegisterDialogOpen}
        onClose={() => setOpenRegisterDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockOpenIcon sx={{ color: '#65a30d' }} /> Apertura de Turno de Caja
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresa la base inicial en efectivo entregada para cambio y el cajero responsable de la gaveta.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Cajero Responsable"
            value={cashierNameInput}
            onChange={(e) => setCashierNameInput(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="number"
            label="Base Inicial de Efectivo ($ COP)"
            value={initialAmountInput}
            onChange={(e) => setInitialAmountInput(Math.max(0, Number(e.target.value)))}
            sx={{ mb: 2 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />

          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
            Montos comunes de sencillo:
          </Typography>
          <Stack direction="row" spacing={1}>
            {[100000, 200000, 300000, 500000].map(amt => (
              <Chip
                key={amt}
                label={`$${amt.toLocaleString()}`}
                clickable
                onClick={() => setInitialAmountInput(amt)}
                sx={{
                  bgcolor: initialAmountInput === amt ? '#65a30d' : undefined,
                  color: initialAmountInput === amt ? '#fff' : undefined,
                  fontWeight: 800,
                }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRegisterDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleOpenRegisterSubmit}
            sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800, borderRadius: 2 }}
          >
            Abrir Caja e Iniciar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOG 2: INGRESO MANUAL / GASTO DE CAJA MENOR              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={movementDialogOpen}
        onClose={() => setMovementDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: movementType === 'INGRESO' ? '#16a34a' : '#dc2626' }}>
          {movementType === 'INGRESO' ? 'Registrar Ingreso Extra de Sencillo' : 'Registrar Salida / Gasto de Caja Menor'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            size="small"
            label="Categoría del Movimiento"
            value={movementCategory}
            onChange={(e) => setMovementCategory(e.target.value)}
            sx={{ mb: 2 }}
          >
            {movementType === 'GASTO' ? (
              [
                '🧊 Compra de Hielo / Urgencia',
                '🛒 Verduras / Frutas de mercado',
                '🧹 Aseo y Desinfección',
                '🛵 Pago de Combustible / Repartidor',
                '📦 Empaques de domicilio urgente',
                '🔧 Reparación técnica menor',
                '❓ Otro Gasto Menor',
              ].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)
            ) : (
              [
                '💵 Recarga de Fondo de Sencillo',
                '↩️ Reingreso de dinero no usado',
                '🎁 Ingreso extraordinario',
              ].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)
            )}
          </TextField>

          <TextField
            fullWidth
            type="number"
            label="Monto ($ COP)"
            value={movementAmount || ''}
            onChange={(e) => setMovementAmount(Number(e.target.value))}
            sx={{ mb: 2 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />

          <TextField
            fullWidth
            label="Detalle / Número de Factura o Proveedor"
            placeholder="Ej. Factura tienda D1 #4829, bolsa de hielo 5kg"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMovementDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={movementType === 'INGRESO' ? 'success' : 'error'}
            onClick={handleAddMovementSubmit}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Guardar Movimiento
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOG 3: ARQUEO CIEGO & CIERRE DE TURNO (REPORTE Z)        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={closeRegisterDialogOpen}
        onClose={() => setCloseRegisterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon sx={{ color: '#ea580c' }} />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {isRegisterClosedReport ? 'Tirilla Fiscal de Reporte Z' : 'Arqueo Físico & Cierre de Turno'}
            </Typography>
          </Box>
          <IconButton onClick={() => setCloseRegisterDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {isRegisterClosedReport ? (
            /* Printable Report Z (Thermal Ticket Simulation) */
            <Box sx={{ textAlign: 'center' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  maxWidth: 380,
                  mx: 'auto',
                  bgcolor: '#ffffff',
                  border: '2px dashed #334155',
                  borderRadius: 2,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                    RESTAURANTE SÉSAMO
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    NIT: 901.482.391-4 • RÉGIMEN COMÚN
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    Calle 10 # 35-12, El Poblado, Medellín
                  </Typography>
                  <Divider sx={{ my: 1, borderColor: '#000' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                    REPORTE Z - CIERRE DE CAJA
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    Cajero: {currentRegister?.openedBy || user?.name}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    Apertura: {new Date(shiftStart).toLocaleString('es-CO')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    Cierre: {new Date().toLocaleString('es-CO')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1, borderColor: '#000' }} />

                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Base Inicial:</span>
                    <span>${initialFloat.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Ventas Salón Efectivo:</span>
                    <span>${salonCashSales.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Domicilios Efectivo:</span>
                    <span>${deliveryCashSales.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Ingresos Manuales:</span>
                    <span>+${manualIngresos.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(-) Gastos Caja Menor:</span>
                    <span>-${manualGastos.toLocaleString()}</span>
                  </Box>

                  <Divider sx={{ my: 0.5, borderColor: '#94a3b8' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                    <span>(=) EFECTIVO TEÓRICO:</span>
                    <span>${expectedCashInBox.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                    <span>(=) EFECTIVO FÍSICO CONTADO:</span>
                    <span>${countedCash.toLocaleString()}</span>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: difference === 0 ? '#15803d' : '#b91c1c' }}>
                    <span>DIFERENCIA (CUADRE):</span>
                    <span>{difference >= 0 ? '+' : ''}${difference.toLocaleString()} COP</span>
                  </Box>

                  <Divider sx={{ my: 0.5, borderColor: '#94a3b8' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ventas Datáfono/Nequi:</span>
                    <span>${cardDigitalSales.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                    <span>TOTAL VENTAS DEL TURNO:</span>
                    <span>${totalTurnoSales.toLocaleString()}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Propinas:</span>
                    <span>${totalTips.toLocaleString()}</span>
                  </Box>
                </Stack>

                <Divider sx={{ my: 1.5, borderColor: '#000' }} />

                <Box sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                  Firma Cajero: ______________________<br />
                  Firma Auditor: _____________________<br />
                  ¡Turno verificado y archivado!
                </Box>
              </Paper>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Imprimir Tirilla Térmica
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleFinalizeClose}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Confirmar y Finalizar Cierre
                </Button>
              </Box>
            </Box>
          ) : (
            /* Arqueo Form */
            <Box>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, mb: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 0.5 }}>
                  MODO ARQUEO FÍSICO CIEGO
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  Digita la cantidad de billetes y monedas que hay físicamente en la gaveta. El sistema calculará el total y contrastará con las ventas del turno.
                </Typography>
              </Paper>

              {/* Denominations Calculator */}
              {showDenomCalc && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#ffffff', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e290b', display: 'block', mb: 1.5 }}>
                    💵 CONTEO DE BILLETES Y MONEDAS COLOMBIANAS:
                  </Typography>
                  <Grid container spacing={1.5}>
                    {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200].map((denom) => (
                      <Grid size={{ xs: 6, sm: 4 }} key={denom}>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          label={`$${denom.toLocaleString()}`}
                          placeholder="0"
                          value={denomCounts[denom] || ''}
                          onChange={(e) => handleDenomChange(denom, Number(e.target.value))}
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#ecfccb', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#365314' }}>
                      Total Dinero Contado:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#365314' }}>
                      ${countedCash.toLocaleString()} COP
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Semáforo de Cuadre */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: difference === 0 ? '#ecfccb' : difference > 0 ? '#e0f2fe' : '#fee2e2',
                  border: `1.5px solid ${difference === 0 ? '#84cc16' : difference > 0 ? '#38bdf8' : '#f87171'}`,
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: difference === 0 ? '#3f6212' : difference > 0 ? '#0369a1' : '#991b1b', textTransform: 'uppercase' }}>
                    Resultado del Cuadre:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: difference === 0 ? '#3f6212' : difference > 0 ? '#0369a1' : '#991b1b' }}>
                    {difference === 0 ? '✅ CUADRE EXACTO' : difference > 0 ? `🟢 Sobrante de +$${difference.toLocaleString()}` : `🔴 Faltante de -$${Math.abs(difference).toLocaleString()}`}
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Observaciones / Justificación de Cierre"
                placeholder="Ej. Cuadre perfecto verificado con cajera entrante."
                multiline
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>

        {!isRegisterClosedReport && (
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCloseRegisterDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => setIsRegisterClosedReport(true)}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Generar Tirilla Z & Proceder
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOG 4: HISTORICAL TICKET Z INSPECTION                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={Boolean(selectedHistoricalZ)}
        onClose={() => setSelectedHistoricalZ(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Tirilla Z Histórica
          </Typography>
          <IconButton onClick={() => setSelectedHistoricalZ(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedHistoricalZ && (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                border: '1px dashed #334155',
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>RESTAURANTE SÉSAMO</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>NIT: 901.482.391-4</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  Cajero: {selectedHistoricalZ.openedBy || selectedHistoricalZ.closedBy}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  Fecha Cierre: {new Date(selectedHistoricalZ.closedAt).toLocaleString('es-CO')}
                </Typography>
              </Box>

              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Stack spacing={0.4}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Inicial:</span>
                  <span>${(selectedHistoricalZ.initialAmount || 0).toLocaleString()}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ventas Totales:</span>
                  <span>${(selectedHistoricalZ.snapshot?.totalTurnoSales || 0).toLocaleString()}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Efectivo Contado:</span>
                  <span>${(selectedHistoricalZ.countedCash || 0).toLocaleString()}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                  <span>Diferencia:</span>
                  <span>${(selectedHistoricalZ.snapshot?.difference || 0).toLocaleString()}</span>
                </Box>
              </Stack>

              {selectedHistoricalZ.notes && (
                <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f1f5f9', borderRadius: 1 }}>
                  <span>Nota: {selectedHistoricalZ.notes}</span>
                </Box>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedHistoricalZ(null)}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ bgcolor: '#0284c7', color: '#fff', borderRadius: 2, fontWeight: 800 }}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR NOTIFICATIONS */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
