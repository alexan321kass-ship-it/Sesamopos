import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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
  CardContent,
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
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Alert,
  Menu,
  Divider,
  LinearProgress,
  Badge,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  Security as SecurityIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  CheckCircle as CheckCircleIcon,
  PauseCircle as PauseCircleIcon,
  ExitToApp as ExitToAppIcon,
  Login as LoginIcon,
  Star as StarIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  MoreVert as MoreVertIcon,
  Shield as ShieldIcon,
  PointOfSale as PosIcon,
  Kitchen as KitchenIcon,
  Restaurant as RestaurantIcon,
  LocalShipping as DeliveryIcon,
  Receipt as ReceiptIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
  Casino as CasinoIcon,
  SupervisedUserCircle as TeamIcon,
  FiberManualRecord as DotIcon,
  Timer as TimerIcon,
  PlayArrow as PlayArrowIcon,
  History as HistoryIcon,
  FreeBreakfast as BreakIcon,
  StopCircle as StopCircleIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { StaffMember, Role, StaffShiftRecord, ShiftAuditLog, StaffPermissions, DeliveryOrder } from '../types';

export default function StaffScreen() {
  const { user } = useAuthStore();
  const isCashier = user?.role === 'CAJERO';

  if (user && !['ADMINISTRADOR', 'GERENTE', 'CAJERO'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftsList, setShiftsList] = useState<StaffShiftRecord[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftAuditLog[]>([]);
  const [subTabTurnos, setSubTabTurnos] = useState<'trazabilidad' | 'monitor' | 'historial'>('trazabilidad');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logEventTypeFilter, setLogEventTypeFilter] = useState<string>('ALL');
  const [logRoleFilter, setLogRoleFilter] = useState<string>('ALL');
  const [selectedShiftForTraceability, setSelectedShiftForTraceability] = useState<StaffShiftRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [currentTab, setCurrentTab] = useState(isCashier ? 2 : 0);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  // Employee Dialog
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<StaffMember | null>(null);

  // Employee Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDocId, setFormDocId] = useState('');
  const [formRole, setFormRole] = useState<Role>('MESERO');
  const [formArea, setFormArea] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formHourlyRate, setFormHourlyRate] = useState<number>(9000);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>({
    canOpenCloseCash: false,
    canApplyDiscounts: false,
    canVoidItems: false,
    canAccessReports: false,
    canManageInventory: false,
    canManageStaff: false,
  });

  // Action Menu State for each card/row
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStaffForMenu, setSelectedStaffForMenu] = useState<StaffMember | null>(null);

  // Clock-in Keypad Dialog
  const [openClockDialog, setOpenClockDialog] = useState(false);
  const [clockSelectedStaffId, setClockSelectedStaffId] = useState<string>('');
  const [clockPinInput, setClockPinInput] = useState<string>('');
  const [clockPinError, setClockPinError] = useState<string>('');

  // Manual Shift Dialog
  const [openManualShiftDialog, setOpenManualShiftDialog] = useState(false);
  const [shiftStaffId, setShiftStaffId] = useState('');
  const [shiftCheckIn, setShiftCheckIn] = useState('09:00');
  const [shiftCheckOut, setShiftCheckOut] = useState('17:00');
  const [shiftNotes, setShiftNotes] = useState('');

  // Tip Pool Calculation state
  const [tipDistributionMode, setTipDistributionMode] = useState<'EQUITY' | 'ROLE_WEIGHTED' | 'SALA_ONLY' | 'SALA_COCINA' | 'HOURS'>('ROLE_WEIGHTED');
  const [customTotalTips, setCustomTotalTips] = useState<number>(485000);

  // Feedback Notification
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // URL Query Params & Centralized Payments Administration
  const [searchParams] = useSearchParams();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);

  // Rider Settlement State
  const [selectedRiderForSettlement, setSelectedRiderForSettlement] = useState<{
    id: string;
    name: string;
    phone: string;
    orders: DeliveryOrder[];
    cashTotal: number;
    deliveryFeeTotal: number;
    totalOrders: number;
  } | null>(null);
  const [settlementReceipt, setSettlementReceipt] = useState<any | null>(null);

  // Payroll Settlement State
  const [selectedStaffForPayroll, setSelectedStaffForPayroll] = useState<{
    member: StaffMember;
    hoursWorked: number;
    hourlyRate: number;
    baseSalary: number;
    bonus: number;
    deductions: number;
    totalPay: number;
    shifts: StaffShiftRecord[];
  } | null>(null);
  const [payrollReceipt, setPayrollReceipt] = useState<any | null>(null);

  // Load Data
  const loadData = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [staffData, shiftsData, delData, logsData] = await Promise.all([
        mockApi.staff.getAll(),
        mockApi.staff.getShifts(),
        mockApi.deliveries.getAll(),
        mockApi.staff.getShiftLogs(),
      ]);
      setStaffList(staffData || []);
      setShiftsList(shiftsData || []);
      setDeliveries(delData || []);
      setShiftLogs(logsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Sync tab with URL search parameter
  useEffect(() => {
    if (isCashier) {
      setCurrentTab(2);
      return;
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'repartidores' || tabParam === 'settlement' || tabParam === 'domicilios') {
      setCurrentTab(2);
    } else if (tabParam === 'nomina' || tabParam === 'payroll') {
      setCurrentTab(3);
    } else if (tabParam === 'propinas' || tabParam === 'tips') {
      setCurrentTab(4);
    } else if (tabParam === 'turnos' || tabParam === 'trazabilidad' || tabParam === 'asistencia') {
      setCurrentTab(1);
    }
  }, [searchParams, isCashier]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('sesamo_staff_updated', handleUpdate);
    window.addEventListener('sesamo_shifts_updated', handleUpdate);
    window.addEventListener('sesamo_shift_logs_updated', handleUpdate);
    window.addEventListener('sesamo_deliveries_updated', handleUpdate);
    window.addEventListener('sesamo_cash_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_staff_updated', handleUpdate);
      window.removeEventListener('sesamo_shifts_updated', handleUpdate);
      window.removeEventListener('sesamo_shift_logs_updated', handleUpdate);
      window.removeEventListener('sesamo_deliveries_updated', handleUpdate);
      window.removeEventListener('sesamo_cash_updated', handleUpdate);
    };
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.documentId && s.documentId.includes(searchTerm)) ||
        (s.assignedArea && s.assignedArea.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = selectedRole === 'ALL' || s.role === selectedRole;

      let matchStatus = true;
      if (selectedStatus === 'ACTIVE') matchStatus = s.isActive;
      if (selectedStatus === 'INACTIVE') matchStatus = !s.isActive;
      if (selectedStatus === 'ON_SHIFT') matchStatus = s.shiftStatus === 'EN_TURNO';
      if (selectedStatus === 'BREAK') matchStatus = s.shiftStatus === 'DESCANSO';
      if (selectedStatus === 'OFF_SHIFT') matchStatus = s.shiftStatus === 'FUERA_DE_TURNO';

      return matchSearch && matchRole && matchStatus;
    });
  }, [staffList, searchTerm, selectedRole, selectedStatus]);

  // Statistics KPI
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.isActive).length;
    const onShift = staffList.filter((s) => s.shiftStatus === 'EN_TURNO').length;
    const onBreak = staffList.filter((s) => s.shiftStatus === 'DESCANSO').length;
    const totalTipsCollected = staffList.reduce((acc, curr) => acc + (curr.stats?.tipsAccumulated || 0), 0);
    const totalOrdersServed = staffList.reduce((acc, curr) => acc + (curr.stats?.ordersServed || 0), 0);
    const avgRating =
      staffList.length > 0
        ? (staffList.reduce((acc, curr) => acc + (curr.stats?.rating || 5), 0) / staffList.length).toFixed(1)
        : '5.0';

    return { total, active, onShift, onBreak, totalTipsCollected, totalOrdersServed, avgRating };
  }, [staffList]);

  // Filtros y Métricas de Trazabilidad de Turnos y Pausas
  const filteredLogs = useMemo(() => {
    return shiftLogs.filter((log) => {
      const matchSearch =
        log.staffName.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(logSearchTerm.toLowerCase());
      const matchRole = logRoleFilter === 'ALL' || log.role === logRoleFilter;
      let matchType = true;
      if (logEventTypeFilter === 'PAUSAS') {
        matchType = log.eventType === 'PAUSA_INICIADA' || log.eventType === 'PAUSA_FINALIZADA';
      } else if (logEventTypeFilter === 'INICIOS') {
        matchType = log.eventType === 'INICIO_TURNO' || log.eventType === 'TURNO_MANUAL';
      } else if (logEventTypeFilter === 'FINALIZACIONES') {
        matchType = log.eventType === 'FIN_TURNO';
      } else if (logEventTypeFilter !== 'ALL') {
        matchType = log.eventType === logEventTypeFilter;
      }
      return matchSearch && matchRole && matchType;
    });
  }, [shiftLogs, logSearchTerm, logRoleFilter, logEventTypeFilter]);

  const totalBreaksCount = useMemo(() => {
    return shiftLogs.filter((l) => l.eventType === 'PAUSA_INICIADA').length;
  }, [shiftLogs]);

  const totalBreakMinutesToday = useMemo(() => {
    return shiftsList.reduce((acc, s) => acc + (s.totalBreakMinutes || 0), 0);
  }, [shiftsList]);

  const staffOnBreakCount = useMemo(() => {
    return staffList.filter((s) => s.shiftStatus === 'DESCANSO').length;
  }, [staffList]);

  // Rider Settlement Calculations (Recaudos en efectivo y fletes)
  const riderSettlementData = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        phone: string;
        orders: DeliveryOrder[];
        cashTotal: number;
        deliveryFeeTotal: number;
        totalOrders: number;
        settledOrdersCount: number;
        pendingOrdersCount: number;
      }
    > = {};

    deliveries.forEach((d) => {
      const riderId = d.deliveryRiderId || '9';
      const riderName = d.deliveryRiderName || (riderId === '9' ? 'Kevin Morales' : 'Repartidor');
      const riderPhone = d.deliveryRiderPhone || '3145556677';

      if (!map[riderId]) {
        map[riderId] = {
          id: riderId,
          name: riderName,
          phone: riderPhone,
          orders: [],
          cashTotal: 0,
          deliveryFeeTotal: 0,
          totalOrders: 0,
          settledOrdersCount: 0,
          pendingOrdersCount: 0,
        };
      }

      map[riderId].orders.push(d);
      map[riderId].totalOrders++;

      if (d.isSettled) {
        map[riderId].settledOrdersCount++;
      } else {
        map[riderId].pendingOrdersCount++;
        if (d.paymentMethod === 'EFECTIVO' && (d.deliveryStatus === 'EN_CAMINO' || d.deliveryStatus === 'ENTREGADO')) {
          map[riderId].cashTotal += d.total || 0;
        }
        if (d.deliveryStatus === 'ENTREGADO') {
          map[riderId].deliveryFeeTotal += d.deliveryFee || 5000;
        }
      }
    });

    return Object.values(map);
  }, [deliveries]);

  const totalCashOnStreet = useMemo(() => {
    return riderSettlementData.reduce((sum, r) => sum + r.cashTotal, 0);
  }, [riderSettlementData]);

  const totalDeliveryFeesPending = useMemo(() => {
    return riderSettlementData.reduce((sum, r) => sum + r.deliveryFeeTotal, 0);
  }, [riderSettlementData]);

  // Payroll Calculations from Shifts and Hourly Rates
  const payrollData = useMemo(() => {
    return staffList.map((member) => {
      const memberShifts = shiftsList.filter(
        (sh) => String(sh.staffId) === String(member.id) && sh.status === 'COMPLETADO'
      );
      const totalHours = memberShifts.reduce((sum, sh) => sum + (sh.hoursWorked || 0), 0);
      const hourlyRate = member.hourlyRate || 9000;
      const baseSalary = Math.round(totalHours * hourlyRate);
      const bonus = 0;
      const deductions = 0;
      const netSalary = baseSalary + bonus - deductions;

      return {
        member,
        totalHours: Math.round(totalHours * 10) / 10,
        hourlyRate,
        baseSalary,
        bonus,
        deductions,
        netSalary,
        shifts: memberShifts,
      };
    });
  }, [staffList, shiftsList]);

  // Default permissions when role changes in create mode
  const handleRoleChangeInForm = (newRole: Role) => {
    setFormRole(newRole);
    if (!editingEmployee) {
      if (newRole === 'ADMINISTRADOR' || newRole === 'GERENTE') {
        setFormPermissions({
          canOpenCloseCash: true,
          canApplyDiscounts: true,
          canVoidItems: true,
          canAccessReports: true,
          canManageInventory: true,
          canManageStaff: true,
        });
        setFormArea(newRole === 'ADMINISTRADOR' ? 'Dirección General' : 'Supervisión de Turno');
        setFormHourlyRate(newRole === 'ADMINISTRADOR' ? 20000 : 15000);
      } else if (newRole === 'CAJERO') {
        setFormPermissions({
          canOpenCloseCash: true,
          canApplyDiscounts: true,
          canVoidItems: false,
          canAccessReports: true,
          canManageInventory: false,
          canManageStaff: false,
        });
        setFormArea('Caja Principal');
        setFormHourlyRate(9000);
      } else if (newRole === 'MESERO') {
        setFormPermissions({
          canOpenCloseCash: false,
          canApplyDiscounts: false,
          canVoidItems: false,
          canAccessReports: false,
          canManageInventory: false,
          canManageStaff: false,
        });
        setFormArea('Salón Comedor');
        setFormHourlyRate(8500);
      } else if (newRole === 'COCINA') {
        setFormPermissions({
          canOpenCloseCash: false,
          canApplyDiscounts: false,
          canVoidItems: false,
          canAccessReports: false,
          canManageInventory: true,
          canManageStaff: false,
        });
        setFormArea('Cocina & Parrilla');
        setFormHourlyRate(11000);
      } else if (newRole === 'INVENTARIO') {
        setFormPermissions({
          canOpenCloseCash: false,
          canApplyDiscounts: false,
          canVoidItems: false,
          canAccessReports: false,
          canManageInventory: true,
          canManageStaff: false,
        });
        setFormArea('Almacén Central');
        setFormHourlyRate(8500);
      } else if (newRole === 'REPARTIDOR') {
        setFormPermissions({
          canOpenCloseCash: false,
          canApplyDiscounts: false,
          canVoidItems: false,
          canAccessReports: false,
          canManageInventory: false,
          canManageStaff: false,
        });
        setFormArea('Rutas y Domicilios');
        setFormHourlyRate(8000);
      }
    }
  };

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDocId('');
    setFormRole('MESERO');
    setFormArea('Salón Comedor');
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(randomPin);
    setFormPassword('password123');
    setFormHourlyRate(8500);
    setFormIsActive(true);
    setFormPermissions({
      canOpenCloseCash: false,
      canApplyDiscounts: false,
      canVoidItems: false,
      canAccessReports: false,
      canManageInventory: false,
      canManageStaff: false,
    });
    setOpenEmployeeDialog(true);
  };

  const handleOpenEditEmployee = (emp: StaffMember) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormPhone(emp.phone || '');
    setFormDocId(emp.documentId || '');
    setFormRole(emp.role);
    setFormArea(emp.assignedArea || '');
    setFormPin(emp.pin || '1234');
    setFormPassword(emp.password || 'password123');
    setFormHourlyRate(emp.hourlyRate || 8500);
    setFormIsActive(emp.isActive);
    setFormPermissions(
      emp.permissions || {
        canOpenCloseCash: false,
        canApplyDiscounts: false,
        canVoidItems: false,
        canAccessReports: false,
        canManageInventory: false,
        canManageStaff: false,
      }
    );
    setOpenEmployeeDialog(true);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(randomPin);
    setNotification({
      open: true,
      message: `Nuevo PIN generado: ${randomPin}`,
      severity: 'info',
    });
  };

  const handleSaveEmployee = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setNotification({
        open: true,
        message: 'Por favor ingresa nombre y correo electrónico válidos.',
        severity: 'error',
      });
      return;
    }

    try {
      if (editingEmployee) {
        await mockApi.staff.update(editingEmployee.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          documentId: formDocId.trim(),
          role: formRole,
          assignedArea: formArea.trim(),
          pin: formPin.trim(),
          password: formPassword.trim() || 'password123',
          hourlyRate: Number(formHourlyRate),
          isActive: formIsActive,
          permissions: formPermissions,
        });
        setNotification({
          open: true,
          message: `Colaborador "${formName}" actualizado correctamente.`,
          severity: 'success',
        });
      } else {
        await mockApi.staff.create({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          documentId: formDocId.trim(),
          role: formRole,
          assignedArea: formArea.trim(),
          pin: formPin.trim() || '1234',
          password: formPassword.trim() || 'password123',
          hourlyRate: Number(formHourlyRate),
          isActive: formIsActive,
          hireDate: new Date().toISOString().split('T')[0],
          shiftStatus: 'FUERA_DE_TURNO',
          permissions: formPermissions,
          stats: {
            ordersServed: 0,
            salesVolume: 0,
            tipsAccumulated: 0,
            rating: 5.0,
          },
        });
        setNotification({
          open: true,
          message: `Nuevo colaborador "${formName}" registrado exitosamente.`,
          severity: 'success',
        });
      }
      setOpenEmployeeDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({
        open: true,
        message: e.message || 'Error al guardar los datos del colaborador',
        severity: 'error',
      });
    }
  };

  const handleDeleteEmployee = async (emp: StaffMember) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${emp.name}?`)) {
      try {
        await mockApi.staff.delete(emp.id);
        setNotification({
          open: true,
          message: `Colaborador ${emp.name} retirado del equipo.`,
          severity: 'info',
        });
        loadData();
      } catch (e: any) {
        setNotification({
          open: true,
          message: e.message || 'Error al eliminar colaborador',
          severity: 'error',
        });
      }
    }
  };

  const handleToggleActive = async (emp: StaffMember) => {
    try {
      await mockApi.staff.update(emp.id, { isActive: !emp.isActive });
      setNotification({
        open: true,
        message: `${emp.name} ahora está ${!emp.isActive ? 'Activo' : 'Inactivo'}.`,
        severity: 'info',
      });
      loadData();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Handler for settling rider cash and paying delivery fees
  const handleExecuteRiderSettlement = async (riderId: string, payFees: boolean = true) => {
    const rider = riderSettlementData.find((r) => r.id === riderId);
    if (!rider) return;

    try {
      if (rider.cashTotal > 0) {
        await mockApi.cash.addMovement(
          'INGRESO',
          rider.cashTotal,
          `Liquidación Efectivo Domicilios: ${rider.name} (${rider.orders.length} pedidos)`
        );
      }

      if (payFees && rider.deliveryFeeTotal > 0) {
        await mockApi.cash.addMovement(
          'GASTO',
          rider.deliveryFeeTotal,
          `Pago de Fletes/Carreras: ${rider.name} (${rider.orders.length} entregas)`
        );
      }

      for (const ord of rider.orders) {
        await mockApi.deliveries.update(ord.id, { isSettled: true, settledAt: Date.now() });
      }

      setSettlementReceipt({
        riderName: rider.name,
        date: Date.now(),
        ordersCount: rider.orders.length,
        cashCollected: rider.cashTotal,
        feesPaid: payFees ? rider.deliveryFeeTotal : 0,
        netCashToRegister: rider.cashTotal - (payFees ? rider.deliveryFeeTotal : 0),
        orders: rider.orders,
      });

      setNotification({
        open: true,
        message: `¡Liquidación completada! Recaudo de $${rider.cashTotal.toLocaleString()} COP procesado exitosamente en caja para ${rider.name}.`,
        severity: 'success',
      });

      setSelectedRiderForSettlement(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      setNotification({
        open: true,
        message: err.message || 'Error al procesar liquidación del repartidor.',
        severity: 'error',
      });
    }
  };

  // Handler for paying payroll
  const handleExecutePayrollPayment = async (staffId: string) => {
    const payItem = payrollData.find((p) => String(p.member.id) === String(staffId));
    if (!payItem) return;

    try {
      if (payItem.netSalary > 0) {
        await mockApi.cash.addMovement(
          'GASTO',
          payItem.netSalary,
          `Pago de Nómina / Salario: ${payItem.member.name} (${payItem.totalHours} horas trabajadas)`
        );
      }

      setPayrollReceipt({
        employeeName: payItem.member.name,
        role: payItem.member.role,
        documentId: payItem.member.documentId || 'C.C.',
        date: Date.now(),
        hoursWorked: payItem.totalHours,
        hourlyRate: payItem.hourlyRate,
        baseSalary: payItem.baseSalary,
        bonus: payItem.bonus,
        deductions: payItem.deductions,
        totalNet: payItem.netSalary,
      });

      setNotification({
        open: true,
        message: `¡Pago de nómina registrado! $${payItem.netSalary.toLocaleString()} COP desembolsados para ${payItem.member.name}.`,
        severity: 'success',
      });

      setSelectedStaffForPayroll(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      setNotification({
        open: true,
        message: err.message || 'Error al registrar pago de nómina.',
        severity: 'error',
      });
    }
  };

  // Quick Clock Actions from card or row
  const handleQuickClockIn = async (emp: StaffMember) => {
    try {
      await mockApi.staff.clockIn(emp.id);
      setNotification({
        open: true,
        message: `Entrada registrada para ${emp.name}. ¡Bienvenido a turno!`,
        severity: 'success',
      });
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleQuickClockOut = async (emp: StaffMember) => {
    try {
      await mockApi.staff.clockOut(emp.id);
      setNotification({
        open: true,
        message: `Salida de turno registrada para ${emp.name}.`,
        severity: 'info',
      });
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleQuickToggleBreak = async (emp: StaffMember) => {
    try {
      await mockApi.staff.setBreak(emp.id);
      const isNowBreak = emp.shiftStatus !== 'DESCANSO';
      setNotification({
        open: true,
        message: `${emp.name} ha ${isNowBreak ? 'iniciado descanso' : 'retomado turno activo'}.`,
        severity: 'info',
      });
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message, severity: 'error' });
    }
  };

  // Clock Keypad Submissions
  const handleKeypadPress = (digit: string) => {
    if (clockPinInput.length < 4) {
      setClockPinInput((prev) => prev + digit);
      setClockPinError('');
    }
  };

  const handleKeypadBackspace = () => {
    setClockPinInput((prev) => prev.slice(0, -1));
    setClockPinError('');
  };

  const handleKeypadClear = () => {
    setClockPinInput('');
    setClockPinError('');
  };

  const handleProcessKeypadAction = async (action: 'CLOCK_IN' | 'BREAK' | 'CLOCK_OUT') => {
    if (!clockSelectedStaffId) {
      setClockPinError('Por favor selecciona un colaborador.');
      return;
    }
    const staff = staffList.find((s) => s.id === clockSelectedStaffId);
    if (!staff) return;

    if (staff.pin && clockPinInput !== staff.pin) {
      setClockPinError('PIN incorrecto. Verifica los 4 dígitos.');
      return;
    }

    try {
      if (action === 'CLOCK_IN') {
        await mockApi.staff.clockIn(staff.id);
        setNotification({
          open: true,
          message: `Entrada confirmada para ${staff.name}.`,
          severity: 'success',
        });
      } else if (action === 'BREAK') {
        await mockApi.staff.setBreak(staff.id);
        setNotification({
          open: true,
          message: `Estado de pausa actualizado para ${staff.name}.`,
          severity: 'info',
        });
      } else if (action === 'CLOCK_OUT') {
        await mockApi.staff.clockOut(staff.id);
        setNotification({
          open: true,
          message: `Fin de jornada registrado para ${staff.name}.`,
          severity: 'success',
        });
      }
      setOpenClockDialog(false);
      setClockPinInput('');
      setClockSelectedStaffId('');
      setClockPinError('');
      loadData();
    } catch (e: any) {
      setClockPinError(e.message || 'Error al procesar fichaje.');
    }
  };

  // Manual Shift Logging
  const handleSaveManualShift = async () => {
    if (!shiftStaffId) {
      setNotification({ open: true, message: 'Selecciona un colaborador.', severity: 'error' });
      return;
    }
    const staff = staffList.find((s) => s.id === shiftStaffId);
    if (!staff) return;

    const [inH, inM] = shiftCheckIn.split(':').map(Number);
    const [outH, outM] = shiftCheckOut.split(':').map(Number);
    const totalMinutes = Math.max(30, outH * 60 + outM - (inH * 60 + inM));
    const hours = parseFloat((totalMinutes / 60).toFixed(2));

    try {
      await mockApi.staff.addShiftRecord({
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role,
        date: new Date().toISOString().split('T')[0],
        checkIn: shiftCheckIn,
        checkOut: shiftCheckOut,
        status: 'COMPLETADO',
        hoursWorked: hours,
        notes: shiftNotes || 'Registro manual por administración',
      });
      setNotification({
        open: true,
        message: `Turno de ${hours}h guardado para ${staff.name}.`,
        severity: 'success',
      });
      setOpenManualShiftDialog(false);
      loadData();
    } catch (e: any) {
      setNotification({ open: true, message: e.message, severity: 'error' });
    }
  };

  // Helper colors and labels
  const getRoleConfig = (role: Role) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return {
          label: 'Administrador',
          color: '#e11d48',
          bgLight: '#ffe4e6',
          icon: <ShieldIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
        };
      case 'GERENTE':
        return {
          label: 'Gerente',
          color: '#d97706',
          bgLight: '#fef3c7',
          icon: <BadgeIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        };
      case 'CAJERO':
        return {
          label: 'Cajero',
          color: '#059669',
          bgLight: '#d1fae5',
          icon: <PosIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        };
      case 'MESERO':
        return {
          label: 'Mesero',
          color: '#0284c7',
          bgLight: '#e0f2fe',
          icon: <RestaurantIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        };
      case 'COCINA':
        return {
          label: 'Cocina & Chef',
          color: '#ea580c',
          bgLight: '#ffedd5',
          icon: <KitchenIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
        };
      case 'INVENTARIO':
        return {
          label: 'Inventario',
          color: '#7c3aed',
          bgLight: '#f3e8ff',
          icon: <ReceiptIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        };
      case 'REPARTIDOR':
        return {
          label: 'Domiciliario',
          color: '#0891b2',
          bgLight: '#cffafe',
          icon: <DeliveryIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
        };
      default:
        return {
          label: role,
          color: '#64748b',
          bgLight: '#f1f5f9',
          icon: <PersonIcon sx={{ fontSize: 16 }} />,
          gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        };
    }
  };

  const getShiftBadge = (status?: 'EN_TURNO' | 'DESCANSO' | 'FUERA_DE_TURNO') => {
    switch (status) {
      case 'EN_TURNO':
        return {
          label: 'En Turno',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#bbf7d0',
          dot: '#16a34a',
        };
      case 'DESCANSO':
        return {
          label: 'En Pausa',
          color: '#ea580c',
          bg: '#ffedd5',
          border: '#fed7aa',
          dot: '#ea580c',
        };
      default:
        return {
          label: 'Fuera de Turno',
          color: '#64748b',
          bg: '#f1f5f9',
          border: '#e2e8f0',
          dot: '#94a3b8',
        };
    }
  };

  // Tip pool calculation breakdown
  const staffEligibleForTips = useMemo(() => {
    return staffList.filter((s) => s.isActive && (s.role === 'MESERO' || s.role === 'COCINA' || s.role === 'CAJERO'));
  }, [staffList]);

  const tipDistributionResults = useMemo(() => {
    if (staffEligibleForTips.length === 0) return [];

    if (tipDistributionMode === 'EQUITY') {
      const share = Math.round(customTotalTips / staffEligibleForTips.length);
      return staffEligibleForTips.map((s) => ({
        staff: s,
        amount: share,
        percentage: ((1 / staffEligibleForTips.length) * 100).toFixed(1),
        criterion: 'Reparto 100% igualitario',
      }));
    }

    if (tipDistributionMode === 'SALA_ONLY') {
      const meseros = staffEligibleForTips.filter((s) => s.role === 'MESERO');
      const share = meseros.length > 0 ? Math.round(customTotalTips / meseros.length) : 0;
      return staffEligibleForTips.map((s) => {
        if (s.role === 'MESERO') {
          return {
            staff: s,
            amount: share,
            percentage: meseros.length > 0 ? ((1 / meseros.length) * 100).toFixed(1) : '0',
            criterion: '100% Exclusivo Sala (Meseros)',
          };
        }
        return {
          staff: s,
          amount: 0,
          percentage: '0.0',
          criterion: 'No participa (100% Sala)',
        };
      });
    }

    if (tipDistributionMode === 'SALA_COCINA') {
      const meseros = staffEligibleForTips.filter((s) => s.role === 'MESERO');
      const cocina = staffEligibleForTips.filter((s) => s.role === 'COCINA');
      const meserosPool = customTotalTips * 0.7;
      const cocinaPool = customTotalTips * 0.3;

      return staffEligibleForTips.map((s) => {
        if (s.role === 'MESERO' && meseros.length > 0) {
          return {
            staff: s,
            amount: Math.round(meserosPool / meseros.length),
            percentage: (70 / meseros.length).toFixed(1),
            criterion: '70% Pool Servicio Sala',
          };
        }
        if (s.role === 'COCINA' && cocina.length > 0) {
          return {
            staff: s,
            amount: Math.round(cocinaPool / cocina.length),
            percentage: (30 / cocina.length).toFixed(1),
            criterion: '30% Pool Cocina',
          };
        }
        return {
          staff: s,
          amount: 0,
          percentage: '0.0',
          criterion: 'No participa (Modalidad Sala + Cocina)',
        };
      });
    }

    if (tipDistributionMode === 'ROLE_WEIGHTED') {
      const meseros = staffEligibleForTips.filter((s) => s.role === 'MESERO');
      const cocina = staffEligibleForTips.filter((s) => s.role === 'COCINA');
      const cajeros = staffEligibleForTips.filter((s) => s.role === 'CAJERO');

      const meserosPool = customTotalTips * 0.6;
      const cocinaPool = customTotalTips * 0.25;
      const cajerosPool = customTotalTips * 0.15;

      return staffEligibleForTips.map((s) => {
        let amount = 0;
        let percentage = '0';
        let criterion = '';
        if (s.role === 'MESERO' && meseros.length > 0) {
          amount = Math.round(meserosPool / meseros.length);
          percentage = (60 / meseros.length).toFixed(1);
          criterion = '60% Pool Servicio';
        } else if (s.role === 'COCINA' && cocina.length > 0) {
          amount = Math.round(cocinaPool / cocina.length);
          percentage = (25 / cocina.length).toFixed(1);
          criterion = '25% Pool Cocina';
        } else if (s.role === 'CAJERO' && cajeros.length > 0) {
          amount = Math.round(cajerosPool / cajeros.length);
          percentage = (15 / cajeros.length).toFixed(1);
          criterion = '15% Pool Caja';
        }
        return { staff: s, amount, percentage, criterion };
      });
    }

    const totalOrders = staffEligibleForTips.reduce((acc, s) => acc + (s.stats?.ordersServed || 1), 0);
    return staffEligibleForTips.map((s) => {
      const orders = s.stats?.ordersServed || 1;
      const prop = orders / totalOrders;
      const amount = Math.round(customTotalTips * prop);
      return {
        staff: s,
        amount,
        percentage: (prop * 100).toFixed(1),
        criterion: `${orders} pedidos completados`,
      };
    });
  }, [staffEligibleForTips, tipDistributionMode, customTotalTips]);

  const roleFilterChips = [
    { key: 'ALL', label: 'Todos' },
    { key: 'MESERO', label: 'Meseros' },
    { key: 'COCINA', label: 'Cocina' },
    { key: 'CAJERO', label: 'Cajeros' },
    { key: 'ADMINISTRADOR', label: 'Administración' },
    { key: 'GERENTE', label: 'Gerentes' },
    { key: 'INVENTARIO', label: 'Inventario' },
    { key: 'REPARTIDOR', label: 'Repartidores' },
  ];

  return (
    <Box sx={{ pb: 8, maxWidth: '100%', mx: 'auto' }}>
      {/* HEADER SECTION */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2.5,
          mb: 3.5,
          p: { xs: 2.5, md: 3 },
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.5,
                py: 0.4,
                bgcolor: '#ecfdf5',
                color: '#059669',
                borderRadius: '20px',
                border: '1px solid #a7f3d0',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <TeamIcon sx={{ fontSize: 15 }} />
              Gestión de Personal & Equipos
            </Box>

            {stats.onShift > 0 && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 1.5,
                  py: 0.4,
                  bgcolor: '#dcfce7',
                  color: '#15803d',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  animation: 'pulse 2s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                  },
                }}
              >
                <DotIcon sx={{ fontSize: 10, color: '#16a34a' }} />
                {stats.onShift} en turno ahora
              </Box>
            )}
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
            {isCashier ? 'Liquidación de Repartidores & Recaudos' : 'Personal y Equipo de Turno'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.4, fontSize: '0.92rem' }}>
            {isCashier
              ? 'Recepción de pagos en efectivo de domicilios, cuadre de caja y liquidación de fletes a repartidores.'
              : 'Control de colaboradores en servicio activo, fichaje por PIN táctil, liquidación de propinas y matriz de permisos.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {isCashier ? (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => { void loadData(true); }}
              sx={{
                borderRadius: '14px',
                py: 1.1,
                px: 2.2,
                fontWeight: 800,
                textTransform: 'none',
                borderColor: '#cbd5e1',
                color: '#334155',
                bgcolor: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                '&:hover': {
                  borderColor: '#16a34a',
                  color: '#16a34a',
                  bgcolor: '#f0fdf4',
                },
              }}
            >
              Actualizar Envíos
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<AccessTimeIcon />}
                onClick={() => {
                  setClockPinInput('');
                  setClockPinError('');
                  setClockSelectedStaffId('');
                  setOpenClockDialog(true);
                }}
                sx={{
                  borderRadius: '14px',
                  py: 1.1,
                  px: 2.2,
                  fontWeight: 800,
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  bgcolor: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  '&:hover': {
                    borderColor: '#16a34a',
                    color: '#16a34a',
                    bgcolor: '#f0fdf4',
                  },
                }}
              >
                Fichar Asistencia (PIN)
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateEmployee}
                sx={{
                  borderRadius: '14px',
                  py: 1.1,
                  px: 2.6,
                  fontWeight: 800,
                  textTransform: 'none',
                  bgcolor: '#16a34a',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  boxShadow: '0 8px 18px rgba(22, 163, 74, 0.28)',
                  '&:hover': {
                    bgcolor: '#15803d',
                    boxShadow: '0 10px 24px rgba(22, 163, 74, 0.38)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Nuevo Colaborador
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* KPI HIGHLIGHTS RIBBON */}
      {isCashier ? (
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          {/* KPI 1: Efectivo en Calle */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #fed7aa',
                boxShadow: '0 4px 16px rgba(194, 65, 12, 0.06)',
                background: 'linear-gradient(145deg, #ffffff 0%, #fff7ed 100%)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                    Recaudos en Calle
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ea580c', mt: 0.5, letterSpacing: '-0.02em', fontSize: '1.5rem' }}>
                    ${totalCashOnStreet.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600, display: 'block', mt: 0.8, fontSize: '0.75rem' }}>
                    Efectivo cobrado en ruta
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ffedd5', color: '#ea580c', width: 48, height: 48, borderRadius: '16px' }}>
                  <AttachMoneyIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 2: Repartidores con Saldo */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                    Repartidores en Calle
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em', fontSize: '1.8rem' }}>
                    {riderSettlementData.filter((r) => r.cashTotal > 0 || r.pendingOrdersCount > 0).length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.8, fontSize: '0.75rem' }}>
                    {riderSettlementData.length} registrados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f1f5f9', color: '#0f172a', width: 48, height: 48, borderRadius: '16px' }}>
                  <DeliveryIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 3: Fletes Pendientes de Pago */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #fef08a',
                boxShadow: '0 4px 16px rgba(202, 138, 4, 0.06)',
                background: 'linear-gradient(145deg, #ffffff 0%, #fefce8 100%)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                    Fletes a Liquidar
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ca8a04', mt: 0.5, letterSpacing: '-0.02em', fontSize: '1.5rem' }}>
                    ${totalDeliveryFeesPending.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#a16207', fontWeight: 600, display: 'block', mt: 0.8, fontSize: '0.75rem' }}>
                    Pago carreras
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef9c3', color: '#ca8a04', width: 48, height: 48, borderRadius: '16px' }}>
                  <ReceiptIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 4: Balance Neto para Caja */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #bbf7d0',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.08)',
                background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Balance Neto para Caja
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5, letterSpacing: '-0.02em' }}>
                    ${Math.max(0, totalCashOnStreet - totalDeliveryFeesPending).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, display: 'block', mt: 0.8 }}>
                    Ingreso neto al cajón de caja
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 48, height: 48, borderRadius: '16px' }}>
                  <PosIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3.5 }}>
          {/* KPI 1: Total Colaboradores */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(0,0,0,0.05)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Plantilla Total
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                    {stats.total}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8 }}>
                    <Chip
                      size="small"
                      label={`${stats.active} activos`}
                      sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, height: 22, fontSize: '0.72rem' }}
                    />
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                      · {stats.total - stats.active} inactivos
                    </Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: '#ecfdf5',
                    color: '#16a34a',
                    width: 48,
                    height: 48,
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)',
                  }}
                >
                  <TeamIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 2: En Turno Activo (En Vivo) */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #bbf7d0',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.08)',
                background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(22, 163, 74, 0.14)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      En Turno Activo
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#15803d', mt: 0.5, letterSpacing: '-0.03em' }}>
                    {stats.onShift}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8 }}>
                    <Chip
                      size="small"
                      label={`${stats.onBreak} en pausa`}
                      sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800, height: 22, fontSize: '0.72rem' }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      · {stats.total - (stats.onShift + stats.onBreak)} libres
                    </Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: '#dcfce7',
                    color: '#15803d',
                    width: 48,
                    height: 48,
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 3: Propinas Hoy */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #fef08a',
                boxShadow: '0 4px 16px rgba(202, 138, 4, 0.06)',
                background: 'linear-gradient(145deg, #ffffff 0%, #fefce8 100%)',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(202, 138, 4, 0.12)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pozo Propinas Hoy
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ca8a04', mt: 0.8, letterSpacing: '-0.02em' }}>
                    ${stats.totalTipsCollected.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.8 }}>
                    <Typography variant="caption" sx={{ color: '#713f12', fontWeight: 700 }}>
                      {staffEligibleForTips.length} elegibles
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#a16207' }}>
                      · ~${staffEligibleForTips.length ? Math.round(stats.totalTipsCollected / staffEligibleForTips.length).toLocaleString() : 0} c/u
                    </Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: '#fef9c3',
                    color: '#ca8a04',
                    width: 48,
                    height: 48,
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(202, 138, 4, 0.18)',
                  }}
                >
                  <AttachMoneyIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>

          {/* KPI 4: Desempeño & Calidad */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #bae6fd',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.06)',
                background: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%)',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(2, 132, 199, 0.12)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Índice de Servicio
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: '#0284c7', letterSpacing: '-0.03em' }}>
                      {stats.avgRating}
                    </Typography>
                    <StarIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.8 }}>
                    {stats.totalOrdersServed} pedidos despachados
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: '#e0f2fe',
                    color: '#0284c7',
                    width: 48,
                    height: 48,
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
                  }}
                >
                  <RestaurantIcon sx={{ fontSize: 26 }} />
                </Avatar>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* SEGMENTED NAVIGATION TABS */}
      <Paper
        sx={{
          mb: 3.5,
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          bgcolor: '#ffffff',
          p: 0.8,
        }}
      >
        <Tabs
          value={isCashier ? 0 : currentTab}
          onChange={(_, val) => {
            if (!isCashier) setCurrentTab(val);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.92rem',
              minHeight: 46,
              borderRadius: '14px',
              px: 2.8,
              py: 1,
              mx: 0.4,
              color: '#64748b',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                color: '#ffffff',
                bgcolor: '#16a34a',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              },
              '&:hover:not(.Mui-selected)': {
                bgcolor: '#f1f5f9',
                color: '#0f172a',
              },
            },
          }}
        >
          {isCashier ? (
            <Tab
              icon={<DeliveryIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={`Liquidación Repartidores & Recaudos en Calle ${totalCashOnStreet > 0 ? `($${(totalCashOnStreet / 1000).toFixed(0)}k)` : ''}`}
            />
          ) : (
            [
              <Tab
                key="tab-0"
                icon={<PersonIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label={`Directorio (${staffList.length})`}
              />,
              <Tab
                key="tab-1"
                icon={<AccessTimeIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label={`Asistencia & Turnos ${stats.onShift > 0 ? `(${stats.onShift})` : ''}`}
              />,
              <Tab
                key="tab-2"
                icon={<DeliveryIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label={`Liquidación Repartidores ${totalCashOnStreet > 0 ? `($${(totalCashOnStreet / 1000).toFixed(0)}k)` : ''}`}
              />,
              <Tab
                key="tab-3"
                icon={<AttachMoneyIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Nómina & Horas"
              />,
              <Tab
                key="tab-4"
                icon={<CalculateIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Bolsa de Propinas"
              />,
              <Tab
                key="tab-5"
                icon={<SecurityIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Matriz de Privilegios"
              />,
            ]
          )}
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2, height: 4 }} />}

      {/* ======================================================== */}
      {/* TAB 0: DIRECTORIO DE PERSONAL & COLABORADORES */}
      {/* ======================================================== */}
      {!isCashier && currentTab === 0 && (
        <Box>
          {/* Filters and View Controls Toolbar */}
          <Paper
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              bgcolor: '#ffffff',
            }}
          >
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              {/* Search Bar */}
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar colaborador por nombre, email, teléfono, cédula o área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontSize: '0.9rem' },
                    },
                  }}
                />
              </Grid>

              {/* Status Select */}
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado de Turno</InputLabel>
                  <Select
                    value={selectedStatus}
                    label="Estado de Turno"
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                  >
                    <MenuItem value="ALL">Todos los Estados</MenuItem>
                    <MenuItem value="ON_SHIFT">🟢 En Turno Activo</MenuItem>
                    <MenuItem value="BREAK">🟠 En Descanso</MenuItem>
                    <MenuItem value="OFF_SHIFT">⚪ Fuera de Turno</MenuItem>
                    <MenuItem value="ACTIVE">Solo Activos</MenuItem>
                    <MenuItem value="INACTIVE">Solo Inactivos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* View Mode & Refresh */}
              <Grid
                size={{ xs: 6, sm: 8, md: 4 }}
                sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}
              >
                <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: 0.5, borderRadius: '12px' }}>
                  <Tooltip title="Vista Cuadrícula de Tarjetas">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode('cards')}
                      sx={{
                        borderRadius: '10px',
                        bgcolor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                        color: viewMode === 'cards' ? '#16a34a' : '#64748b',
                        boxShadow: viewMode === 'cards' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        px: 1.2,
                      }}
                    >
                      <GridViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Vista Tabla Detallada">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode('table')}
                      sx={{
                        borderRadius: '10px',
                        bgcolor: viewMode === 'table' ? '#ffffff' : 'transparent',
                        color: viewMode === 'table' ? '#16a34a' : '#64748b',
                        boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        px: 1.2,
                      }}
                    >
                      <ViewListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadData(true)}
                  sx={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    color: '#475569',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.8,
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                  }}
                >
                  Refrescar
                </Button>
              </Grid>

              {/* Role Fast Filter Chips */}
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    overflowX: 'auto',
                    pt: 1,
                    pb: 0.5,
                    '::-webkit-scrollbar': { height: 4 },
                    '::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', mr: 1, whiteSpace: 'nowrap' }}>
                    CARGO:
                  </Typography>
                  {roleFilterChips.map((chip) => {
                    const isSelected = selectedRole === chip.key;
                    return (
                      <Chip
                        key={chip.key}
                        label={chip.label}
                        onClick={() => setSelectedRole(chip.key)}
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          bgcolor: isSelected ? '#16a34a' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#475569',
                          border: isSelected ? '1px solid #16a34a' : '1px solid #e2e8f0',
                          '&:hover': {
                            bgcolor: isSelected ? '#15803d' : '#e2e8f0',
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Cards View */}
          {viewMode === 'cards' ? (
            <Grid container spacing={2.5}>
              {filteredStaff.map((emp) => {
                const roleConfig = getRoleConfig(emp.role);
                const shiftBadge = getShiftBadge(emp.shiftStatus);
                const isPinVisible = showPins[emp.id];

                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={emp.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '22px',
                        border: '1px solid',
                        borderColor: emp.shiftStatus === 'EN_TURNO' ? '#86efac' : '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: emp.shiftStatus === 'EN_TURNO'
                          ? '0 10px 26px rgba(22, 163, 74, 0.08)'
                          : '0 4px 16px rgba(0,0,0,0.02)',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 14px 30px rgba(0,0,0,0.06)',
                          borderColor: emp.shiftStatus === 'EN_TURNO' ? '#22c55e' : '#cbd5e1',
                        },
                        opacity: emp.isActive ? 1 : 0.65,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Top Accent Ribbon for Active Shift */}
                      {emp.shiftStatus === 'EN_TURNO' && (
                        <Box
                          sx={{
                            height: 4,
                            width: '100%',
                            background: 'linear-gradient(90deg, #16a34a 0%, #4ade80 100%)',
                          }}
                        />
                      )}

                      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                        {/* Header of Employee Card */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                              badgeContent={
                                <Box
                                  sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    bgcolor: shiftBadge.dot,
                                    border: '2.5px solid #ffffff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  }}
                                />
                              }
                            >
                              <Avatar
                                sx={{
                                  width: 54,
                                  height: 54,
                                  background: roleConfig.gradient,
                                  color: '#ffffff',
                                  fontWeight: 900,
                                  fontSize: '1.3rem',
                                  borderRadius: '16px',
                                  boxShadow: `0 6px 14px ${roleConfig.color}40`,
                                }}
                              >
                                {emp.name.charAt(0)}
                              </Avatar>
                            </Badge>

                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2, color: '#0f172a' }}>
                                {emp.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.3 }}>
                                {emp.assignedArea || 'Área General'}
                              </Typography>
                            </Box>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setMenuAnchorEl(e.currentTarget);
                              setSelectedStaffForMenu(emp);
                            }}
                            sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' } }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* Badges Ribbon */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={roleConfig.icon}
                            label={roleConfig.label}
                            sx={{
                              bgcolor: roleConfig.bgLight,
                              color: roleConfig.color,
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              borderRadius: '8px',
                              height: 24,
                            }}
                          />

                          <Chip
                            size="small"
                            label={shiftBadge.label}
                            sx={{
                              bgcolor: shiftBadge.bg,
                              color: shiftBadge.color,
                              border: `1px solid ${shiftBadge.border}`,
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              borderRadius: '8px',
                              height: 24,
                            }}
                          />

                          {!emp.isActive && (
                            <Chip
                              size="small"
                              label="Inactivo"
                              sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, borderRadius: '8px', height: 24 }}
                            />
                          )}
                        </Box>

                        {/* Contact & Identification Card */}
                        <Box
                          sx={{
                            bgcolor: '#f8fafc',
                            p: 1.8,
                            borderRadius: '16px',
                            border: '1px solid #f1f5f9',
                            mb: 2,
                            fontSize: '0.82rem',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: '#475569' }}>
                            <EmailIcon sx={{ fontSize: 16, mr: 1, color: '#94a3b8' }} />
                            <Typography variant="caption" noWrap sx={{ fontWeight: 600, color: '#334155' }}>
                              {emp.email}
                            </Typography>
                          </Box>

                          {emp.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: '#475569' }}>
                              <PhoneIcon sx={{ fontSize: 16, mr: 1, color: '#94a3b8' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                                {emp.phone}
                              </Typography>
                            </Box>
                          )}

                          {emp.documentId && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.2, color: '#475569' }}>
                              <BadgeIcon sx={{ fontSize: 16, mr: 1, color: '#94a3b8' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                                Cédula: <strong style={{ color: '#0f172a' }}>{emp.documentId}</strong>
                              </Typography>
                            </Box>
                          )}

                          {/* TPV PIN & Rate Row */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              pt: 1,
                              borderTop: '1px dashed #e2e8f0',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LockIcon sx={{ fontSize: 15, mr: 0.6, color: '#94a3b8' }} />
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                PIN TPV:
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 900,
                                  ml: 0.8,
                                  letterSpacing: 2,
                                  color: '#0f172a',
                                  bgcolor: '#ffffff',
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {isPinVisible ? emp.pin || '1234' : '••••'}
                              </Typography>
                              <IconButton
                                size="small"
                                sx={{ p: 0.3, ml: 0.5, color: '#64748b' }}
                                onClick={() =>
                                  setShowPins((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))
                                }
                              >
                                {isPinVisible ? (
                                  <VisibilityOffIcon sx={{ fontSize: 14 }} />
                                ) : (
                                  <VisibilityIcon sx={{ fontSize: 14 }} />
                                )}
                              </IconButton>
                            </Box>

                            {emp.hourlyRate && (
                              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800 }}>
                                ${emp.hourlyRate.toLocaleString()} /hr
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Performance Mini-Dashboard */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            textAlign: 'center',
                            py: 1.2,
                            px: 1,
                            borderRadius: '14px',
                            bgcolor: '#ffffff',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.7rem' }}>
                              PEDIDOS
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 900, color: '#0f172a' }}>
                              {emp.stats?.ordersServed ?? 0}
                            </Typography>
                          </Box>

                          <Divider orientation="vertical" flexItem sx={{ borderColor: '#f1f5f9' }} />

                          <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.7rem' }}>
                              PROPINAS
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 900, color: '#ca8a04' }}>
                              ${((emp.stats?.tipsAccumulated ?? 0) / 1000).toFixed(0)}k
                            </Typography>
                          </Box>

                          <Divider orientation="vertical" flexItem sx={{ borderColor: '#f1f5f9' }} />

                          <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.7rem' }}>
                              RATING
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#0f172a' }}>
                                {emp.stats?.rating ?? '5.0'}
                              </Typography>
                              <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>

                      <Divider sx={{ borderColor: '#f1f5f9' }} />

                      {/* Card Action Footer */}
                      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa' }}>
                        {emp.shiftStatus === 'EN_TURNO' ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<PauseCircleIcon />}
                              onClick={() => handleQuickToggleBreak(emp)}
                              sx={{
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                textTransform: 'none',
                                py: 0.6,
                              }}
                            >
                              Pausa
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<ExitToAppIcon />}
                              onClick={() => handleQuickClockOut(emp)}
                              sx={{
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                textTransform: 'none',
                                py: 0.6,
                                bgcolor: '#ef4444',
                                '&:hover': { bgcolor: '#dc2626' },
                              }}
                            >
                              Salida
                            </Button>
                          </Box>
                        ) : emp.shiftStatus === 'DESCANSO' ? (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleQuickToggleBreak(emp)}
                            sx={{
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              textTransform: 'none',
                              py: 0.6,
                              bgcolor: '#16a34a',
                              '&:hover': { bgcolor: '#15803d' },
                            }}
                          >
                            Reanudar Turno
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<LoginIcon />}
                            onClick={() => handleQuickClockIn(emp)}
                            sx={{
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              textTransform: 'none',
                              py: 0.6,
                              bgcolor: '#16a34a',
                              '&:hover': { bgcolor: '#15803d' },
                            }}
                          >
                            Iniciar Turno
                          </Button>
                        )}

                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEditEmployee(emp)}
                          sx={{
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: '#64748b',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                          }}
                        >
                          Editar
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            /* Directory Table View */
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }}>Colaborador</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }}>Contacto</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="center">Cargo</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="center">Estado Turno</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="center">Área Asignada</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="center">PIN TPV</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="right">Tarifa / Hr</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }} align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStaff.map((emp) => {
                    const roleConfig = getRoleConfig(emp.role);
                    const shiftBadge = getShiftBadge(emp.shiftStatus);
                    const isPinVisible = showPins[emp.id];

                    return (
                      <TableRow key={emp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                background: roleConfig.gradient,
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '1rem',
                                borderRadius: '12px',
                              }}
                            >
                              {emp.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                {emp.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {emp.documentId ? `CC: ${emp.documentId}` : emp.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {emp.email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {emp.phone || 'Sin teléfono'}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            size="small"
                            icon={roleConfig.icon}
                            label={roleConfig.label}
                            sx={{
                              bgcolor: roleConfig.bgLight,
                              color: roleConfig.color,
                              fontWeight: 800,
                              borderRadius: '8px',
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={shiftBadge.label}
                            sx={{
                              bgcolor: shiftBadge.bg,
                              color: shiftBadge.color,
                              border: `1px solid ${shiftBadge.border}`,
                              fontWeight: 800,
                              borderRadius: '8px',
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                            {emp.assignedArea || 'General'}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '8px' }}>
                            <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1 }}>
                              {isPinVisible ? emp.pin || '1234' : '••••'}
                            </Typography>
                            <IconButton
                              size="small"
                              sx={{ p: 0.2 }}
                              onClick={() => setShowPins((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                            >
                              {isPinVisible ? <VisibilityOffIcon sx={{ fontSize: 13 }} /> : <VisibilityIcon sx={{ fontSize: 13 }} />}
                            </IconButton>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803d' }}>
                            ${emp.hourlyRate?.toLocaleString() || '9.000'}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Tooltip title="Editar Colaborador">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditEmployee(emp)}
                                sx={{ color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Opciones avanzadas">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setMenuAnchorEl(e.currentTarget);
                                  setSelectedStaffForMenu(emp);
                                }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 1: ASISTENCIA, CONTROL DE TURNOS & TRAZABILIDAD DE PAUSAS */}
      {/* ======================================================== */}
      {!isCashier && currentTab === 1 && (
        <Box>
          {/* Header Action Banner */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: '22px',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  Control de Asistencia, Turnos & Trazabilidad
                </Typography>
                <Chip
                  icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                  label="Bitácora en Tiempo Real"
                  size="small"
                  sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, borderRadius: '8px' }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Audita en vivo el fichaje, inicios de turno, cada pausa y descanso con su duración exacta, y los cierres de jornada de todo el equipo.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  setShiftStaffId(staffList[0]?.id || '');
                  setOpenManualShiftDialog(true);
                }}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  bgcolor: '#ffffff',
                }}
              >
                Registrar Turno Manual
              </Button>

              <Button
                variant="contained"
                startIcon={<AccessTimeIcon />}
                onClick={() => setOpenClockDialog(true)}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 800,
                  textTransform: 'none',
                  bgcolor: '#16a34a',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                }}
              >
                Fichar por Teclado Táctil
              </Button>
            </Box>
          </Paper>

          {/* KPI Summary Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card sx={{ p: 2, borderRadius: '18px', border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Laborando Ahora
                  </Typography>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d' }}>
                  {stats.onShift}
                </Typography>
                <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                  Colaboradores activos en servicio
                </Typography>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card sx={{ p: 2, borderRadius: '18px', border: '1px solid #fed7aa', bgcolor: '#fff7ed' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    En Pausa / Descanso
                  </Typography>
                  <BreakIcon sx={{ color: '#ea580c', fontSize: 20 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#c2410c' }}>
                  {staffOnBreakCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                  Personal tomando refrigerio ahora
                </Typography>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card sx={{ p: 2, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Pausas Hoy
                  </Typography>
                  <HistoryIcon sx={{ color: '#64748b', fontSize: 20 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  {totalBreaksCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Descansos registrados en la jornada
                </Typography>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card sx={{ p: 2, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Minutos en Pausas
                  </Typography>
                  <TimerIcon sx={{ color: '#64748b', fontSize: 20 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  {totalBreakMinutesToday} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>min</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Tiempo total acumulado en descansos
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Sub-Tab Navigation Bar */}
          <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', p: 0.8, bgcolor: '#f1f5f9', borderRadius: '16px', width: 'fit-content' }}>
            <Button
              variant={subTabTurnos === 'trazabilidad' ? 'contained' : 'text'}
              onClick={() => setSubTabTurnos('trazabilidad')}
              startIcon={<HistoryIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.2,
                py: 0.8,
                bgcolor: subTabTurnos === 'trazabilidad' ? '#16a34a' : 'transparent',
                color: subTabTurnos === 'trazabilidad' ? '#ffffff' : '#64748b',
                boxShadow: subTabTurnos === 'trazabilidad' ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
                '&:hover': { bgcolor: subTabTurnos === 'trazabilidad' ? '#15803d' : '#e2e8f0' }
              }}
            >
              📜 Bitácora de Trazabilidad & Pausas ({filteredLogs.length})
            </Button>
            <Button
              variant={subTabTurnos === 'monitor' ? 'contained' : 'text'}
              onClick={() => setSubTabTurnos('monitor')}
              startIcon={<TeamIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.2,
                py: 0.8,
                bgcolor: subTabTurnos === 'monitor' ? '#16a34a' : 'transparent',
                color: subTabTurnos === 'monitor' ? '#ffffff' : '#64748b',
                boxShadow: subTabTurnos === 'monitor' ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
                '&:hover': { bgcolor: subTabTurnos === 'monitor' ? '#15803d' : '#e2e8f0' }
              }}
            >
              🟢 Colaboradores en Turno ({staffList.filter((s) => s.shiftStatus === 'EN_TURNO' || s.shiftStatus === 'DESCANSO').length})
            </Button>
            <Button
              variant={subTabTurnos === 'historial' ? 'contained' : 'text'}
              onClick={() => setSubTabTurnos('historial')}
              startIcon={<AccessTimeIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.2,
                py: 0.8,
                bgcolor: subTabTurnos === 'historial' ? '#16a34a' : 'transparent',
                color: subTabTurnos === 'historial' ? '#ffffff' : '#64748b',
                boxShadow: subTabTurnos === 'historial' ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
                '&:hover': { bgcolor: subTabTurnos === 'historial' ? '#15803d' : '#e2e8f0' }
              }}
            >
              📋 Historial de Jornadas ({shiftsList.length})
            </Button>
          </Box>

          {/* APARTADO 1: BITÁCORA DE TRAZABILIDAD Y AUDITORÍA DE PAUSAS */}
          {subTabTurnos === 'trazabilidad' && (
            <Box>
              {/* Toolbar de filtros para la bitácora */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <TextField
                  size="small"
                  placeholder="Buscar colaborador o evento..."
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '12px' }
                    }
                  }}
                  sx={{ minWidth: 260, flexGrow: 1 }}
                />

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filtrar por Evento</InputLabel>
                  <Select
                    value={logEventTypeFilter}
                    label="Filtrar por Evento"
                    onChange={(e) => setLogEventTypeFilter(e.target.value)}
                    sx={{ borderRadius: '12px' }}
                  >
                    <MenuItem value="ALL">Todos los Eventos</MenuItem>
                    <MenuItem value="PAUSAS">☕ Pausas y Descansos</MenuItem>
                    <MenuItem value="INICIOS">🟢 Inicios de Turno</MenuItem>
                    <MenuItem value="FINALIZACIONES">🏁 Cierres de Turno</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Cargo / Rol</InputLabel>
                  <Select
                    value={logRoleFilter}
                    label="Cargo / Rol"
                    onChange={(e) => setLogRoleFilter(e.target.value)}
                    sx={{ borderRadius: '12px' }}
                  >
                    <MenuItem value="ALL">Todos los Cargos</MenuItem>
                    <MenuItem value="COCINA">Cocina</MenuItem>
                    <MenuItem value="MESERO">Mesero</MenuItem>
                    <MenuItem value="CAJERO">Cajero</MenuItem>
                    <MenuItem value="REPARTIDOR">Repartidor</MenuItem>
                    <MenuItem value="INVENTARIO">Inventario</MenuItem>
                    <MenuItem value="GERENTE">Gerencia</MenuItem>
                    <MenuItem value="ADMINISTRADOR">Administrador</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadData(true)}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    height: 40,
                  }}
                >
                  Actualizar
                </Button>
              </Paper>

              {/* Tabla de Bitácora de Trazabilidad */}
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  overflowX: 'auto',
                  maxWidth: '100%',
                }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Hora & Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Tipo de Acción</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Duración Descanso</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Detalle de Auditoría</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5 }}>
                          <HistoryIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                          <Typography variant="body1" sx={{ fontWeight: 800, color: '#64748b' }}>
                            No hay registros de trazabilidad con los filtros seleccionados
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Los fichajes, pausas y salidas se registrarán automáticamente aquí en tiempo real.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const isPauseStart = log.eventType === 'PAUSA_INICIADA';
                        const isPauseEnd = log.eventType === 'PAUSA_FINALIZADA';
                        const isShiftStart = log.eventType === 'INICIO_TURNO' || log.eventType === 'TURNO_MANUAL';
                        const isShiftEnd = log.eventType === 'FIN_TURNO';

                        return (
                          <TableRow key={log.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {log.time}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {log.date}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                <Avatar
                                  sx={{
                                    bgcolor: getRoleConfig(log.role).color,
                                    width: 34,
                                    height: 34,
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                  }}
                                >
                                  {log.staffName.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                    {log.staffName}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={log.role}
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      bgcolor: getRoleConfig(log.role).bgLight,
                                      color: getRoleConfig(log.role).color,
                                    }}
                                  />
                                </Box>
                              </Box>
                            </TableCell>

                            <TableCell align="center">
                              {isPauseStart && (
                                <Chip
                                  icon={<BreakIcon sx={{ fontSize: 15 }} />}
                                  label="PAUSA INICIADA"
                                  size="small"
                                  sx={{
                                    bgcolor: '#ffedd5',
                                    color: '#c2410c',
                                    fontWeight: 900,
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    border: '1px solid #fed7aa',
                                  }}
                                />
                              )}
                              {isPauseEnd && (
                                <Chip
                                  icon={<PlayArrowIcon sx={{ fontSize: 15 }} />}
                                  label="PAUSA FINALIZADA"
                                  size="small"
                                  sx={{
                                    bgcolor: '#fefce8',
                                    color: '#854d0e',
                                    fontWeight: 900,
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    border: '1px solid #fef08a',
                                  }}
                                />
                              )}
                              {isShiftStart && (
                                <Chip
                                  icon={<LoginIcon sx={{ fontSize: 15 }} />}
                                  label="INICIO DE TURNO"
                                  size="small"
                                  sx={{
                                    bgcolor: '#dcfce7',
                                    color: '#15803d',
                                    fontWeight: 900,
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    border: '1px solid #bbf7d0',
                                  }}
                                />
                              )}
                              {isShiftEnd && (
                                <Chip
                                  icon={<StopCircleIcon sx={{ fontSize: 15 }} />}
                                  label="FIN DE TURNO"
                                  size="small"
                                  sx={{
                                    bgcolor: '#fee2e2',
                                    color: '#b91c1c',
                                    fontWeight: 900,
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    border: '1px solid #fca5a5',
                                  }}
                                />
                              )}
                            </TableCell>

                            <TableCell align="center">
                              {log.durationMinutes ? (
                                <Chip
                                  label={`⏱️ ${log.durationMinutes} min`}
                                  size="small"
                                  sx={{
                                    bgcolor: '#fff7ed',
                                    color: '#ea580c',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    border: '1px solid #fed7aa',
                                  }}
                                />
                              ) : isPauseStart ? (
                                <Chip
                                  label="⏳ En curso..."
                                  size="small"
                                  sx={{
                                    bgcolor: '#fefce8',
                                    color: '#a16207',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                  —
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell sx={{ color: '#334155', fontWeight: 600, fontSize: '0.86rem' }}>
                              {log.description}
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

          {/* APARTADO 2: COLABORADORES EN TURNO (MONITOR EN VIVO) */}
          {subTabTurnos === 'monitor' && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#16a34a' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Colaboradores Laborando en Sala & Cocina Ahora ({staffList.filter((s) => s.shiftStatus === 'EN_TURNO' || s.shiftStatus === 'DESCANSO').length})
                </Typography>
              </Box>

              {staffList.filter((s) => s.shiftStatus === 'EN_TURNO' || s.shiftStatus === 'DESCANSO').length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '18px', border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
                  <TimerIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569' }}>
                    No hay personal fichado en turno actualmente
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                    Utiliza el botón de Fichar Asistencia o haz clic en "Iniciar Turno" en el perfil de cualquier colaborador.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {staffList
                    .filter((s) => s.shiftStatus === 'EN_TURNO' || s.shiftStatus === 'DESCANSO')
                    .map((s) => {
                      const roleConfig = getRoleConfig(s.role);
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
                          <Card
                            sx={{
                              p: 2.2,
                              borderRadius: '18px',
                              border: '1px solid',
                              borderColor: s.shiftStatus === 'EN_TURNO' ? '#bbf7d0' : '#fed7aa',
                              bgcolor: '#ffffff',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar
                                  sx={{
                                    background: roleConfig.gradient,
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                  }}
                                >
                                  {s.name.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                    {s.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    {s.assignedArea} · {s.role}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ textAlign: 'right' }}>
                                <Chip
                                  size="small"
                                  label={s.shiftStatus === 'EN_TURNO' ? 'Laborando' : 'En Pausa'}
                                  sx={{
                                    bgcolor: s.shiftStatus === 'EN_TURNO' ? '#dcfce7' : '#ffedd5',
                                    color: s.shiftStatus === 'EN_TURNO' ? '#15803d' : '#c2410c',
                                    fontWeight: 800,
                                    height: 24,
                                    borderRadius: '8px',
                                  }}
                                />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#94a3b8', fontWeight: 600 }}>
                                  Ingreso: {s.shiftStartTime || '11:00'}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                              <Button
                                size="small"
                                fullWidth
                                variant="outlined"
                                color={s.shiftStatus === 'EN_TURNO' ? 'warning' : 'success'}
                                onClick={() => handleQuickToggleBreak(s)}
                                sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                              >
                                {s.shiftStatus === 'EN_TURNO' ? 'Pausar Turno' : 'Reanudar'}
                              </Button>
                              <Button
                                size="small"
                                fullWidth
                                variant="contained"
                                color="error"
                                onClick={() => handleQuickClockOut(s)}
                                sx={{
                                  borderRadius: '10px',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  bgcolor: '#ef4444',
                                  '&:hover': { bgcolor: '#dc2626' },
                                }}
                              >
                                Marcar Salida
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

          {/* APARTADO 3: HISTORIAL DE JORNADAS REGISTRADAS */}
          {subTabTurnos === 'historial' && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
                Historial de Jornadas Registradas (Hoy)
              </Typography>

              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  overflowX: 'auto',
                  maxWidth: '100%',
                }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Cargo</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Hora Ingreso</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Pausas / Descansos</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Hora Salida</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Horas Trabajadas</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Estado</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Trazabilidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shiftsList.map((shift) => {
                      const breakCount = shift.breaks ? shift.breaks.length : (shift.status === 'DESCANSO' ? 1 : 0);
                      const totalBreakMins = shift.totalBreakMinutes || (shift.status === 'DESCANSO' ? 15 : 0);

                      return (
                        <TableRow key={shift.id} hover>
                          <TableCell sx={{ fontWeight: 800, color: '#0f172a' }}>{shift.staffName}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={shift.role}
                              sx={{
                                bgcolor: getRoleConfig(shift.role).bgLight,
                                color: getRoleConfig(shift.role).color,
                                fontWeight: 800,
                                borderRadius: '8px',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ color: '#64748b', fontWeight: 600 }}>{shift.date}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: '#16a34a' }}>
                            {shift.checkIn}
                          </TableCell>
                          <TableCell align="center">
                            {breakCount > 0 ? (
                              <Chip
                                icon={<BreakIcon sx={{ fontSize: 14 }} />}
                                label={`${breakCount} pausa${breakCount > 1 ? 's' : ''} (${totalBreakMins} min)`}
                                size="small"
                                sx={{
                                  bgcolor: '#fff7ed',
                                  color: '#ea580c',
                                  fontWeight: 800,
                                  border: '1px solid #fed7aa',
                                  borderRadius: '8px',
                                }}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                Sin pausas
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: shift.checkOut ? '#ef4444' : '#94a3b8' }}>
                            {shift.checkOut || 'En curso...'}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: '#0f172a' }}>
                            {shift.hoursWorked ? `${shift.hoursWorked} hrs` : 'Contabilizando...'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={shift.status}
                              sx={{
                                bgcolor: shift.status === 'ACTIVO' ? '#dcfce7' : shift.status === 'DESCANSO' ? '#ffedd5' : '#f1f5f9',
                                color: shift.status === 'ACTIVO' ? '#15803d' : shift.status === 'DESCANSO' ? '#c2410c' : '#475569',
                                fontWeight: 800,
                                borderRadius: '8px',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
                              onClick={() => setSelectedShiftForTraceability(shift)}
                              sx={{
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                textTransform: 'none',
                                color: '#16a34a',
                                borderColor: '#bbf7d0',
                                bgcolor: '#f0fdf4',
                                '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' }
                              }}
                            >
                              Ver Bitácora
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LIQUIDACIÓN DE REPARTIDORES & DOMICILIOS */}
      {/* ======================================================== */}
      {(isCashier || currentTab === 2) && (
        <Box>
          {/* Header Action Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3.5,
              background: 'linear-gradient(135deg, #1e290b 0%, #2a3d0f 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              border: '1px solid rgba(132, 204, 22, 0.2)',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(132, 204, 22, 0.2)', color: '#bef264', borderRadius: '12px' }}>
                  <DeliveryIcon />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                  Liquidación de Repartidores & Recaudos en Calle
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                Control administrativo del dinero en efectivo cobrado por los motorizados, pago de fletes por carrera e ingreso auditado a caja.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => { void loadData(); }}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '12px',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#84cc16', bgcolor: 'rgba(132, 204, 22, 0.1)' },
                }}
              >
                Actualizar
              </Button>
            </Stack>
          </Paper>

          {/* 4 KPIs Ribbon for Rider Cash Settlement */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Efectivo en Calle (Por Liquidar)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#c2410c', my: 0.5 }}>
                      ${totalCashOnStreet.toLocaleString()} COP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Cobros recaudados en mano
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#ffedd5', color: '#ea580c', width: 44, height: 44 }}>
                    <AttachMoneyIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Fletes Devengados Repartidores
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d', my: 0.5 }}>
                      ${totalDeliveryFeesPending.toLocaleString()} COP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
                      Pago por carrera ($5.000 c/u)
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 44, height: 44 }}>
                    <DeliveryIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Balance Neto para Caja
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284c7', my: 0.5 }}>
                      ${Math.max(0, totalCashOnStreet - totalDeliveryFeesPending).toLocaleString()} COP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      (Recaudos menos fletes pagados)
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 44, height: 44 }}>
                    <ReceiptIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Motorizados en Brigada
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', my: 0.5 }}>
                      {riderSettlementData.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Con rutas asignadas hoy
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#ecfccb', color: '#65a30d', width: 44, height: 44 }}>
                    <TeamIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Table of Riders Settlement */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Motorizado / Repartidor</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Teléfono</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Entregas</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Recaudo Efectivo (Ingresa a Caja)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Fletes Ganados (Pagar al Rider)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Saldo Neto Caja</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Estado</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Acciones Administrativas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {riderSettlementData.map((rider) => {
                  const netBalance = rider.cashTotal - rider.deliveryFeeTotal;
                  const isSettled = rider.pendingOrdersCount === 0;

                  return (
                    <TableRow key={rider.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900, width: 38, height: 38 }}>
                            {rider.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: '#1e290b' }}>{rider.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              ID Repartidor: #{rider.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ color: '#475569', fontWeight: 600 }}>{rider.phone}</TableCell>

                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${rider.totalOrders} pedidos (${rider.pendingOrdersCount} por liquidar)`}
                          sx={{
                            fontWeight: 800,
                            bgcolor: rider.pendingOrdersCount > 0 ? '#ffedd5' : '#f1f5f9',
                            color: rider.pendingOrdersCount > 0 ? '#c2410c' : '#64748b',
                          }}
                        />
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, color: '#c2410c', fontSize: '0.95rem' }}>
                        ${rider.cashTotal.toLocaleString()} COP
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, color: '#15803d', fontSize: '0.95rem' }}>
                        ${rider.deliveryFeeTotal.toLocaleString()} COP
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, color: netBalance >= 0 ? '#0284c7' : '#b91c1c', fontSize: '1rem' }}>
                        ${netBalance.toLocaleString()} COP
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={isSettled ? 'Al Día (Liquidado)' : 'Pendiente Liquidar'}
                          size="small"
                          color={isSettled ? 'success' : 'warning'}
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AttachMoneyIcon />}
                          disabled={rider.pendingOrdersCount === 0 && rider.cashTotal === 0}
                          onClick={() => setSelectedRiderForSettlement(rider)}
                          sx={{
                            bgcolor: '#1e290b',
                            color: '#ffffff',
                            fontWeight: 800,
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#0f172a' },
                          }}
                        >
                          Liquidar Turno ➔
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LIQUIDACIÓN DE NÓMINA & HORAS LABORADAS */}
      {/* ======================================================== */}
      {!isCashier && currentTab === 3 && (
        <Box>
          {/* Header Action Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3.5,
              background: 'linear-gradient(135deg, #1e290b 0%, #2a3d0f 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              border: '1px solid rgba(132, 204, 22, 0.2)',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Avatar sx={{ bgcolor: 'rgba(132, 204, 22, 0.2)', color: '#bef264', borderRadius: '12px' }}>
                  <AttachMoneyIcon />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                  Liquidación de Nómina & Horas Laboradas
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                Cálculo de salarios y pago a colaboradores según marcaciones de turnos biométricos, tarifas horarias pactadas y registro de gastos en caja.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => { void loadData(); }}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '12px',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#84cc16', bgcolor: 'rgba(132, 204, 22, 0.1)' },
                }}
              >
                Actualizar Nómina
              </Button>
            </Stack>
          </Paper>

          {/* 3 KPIs Ribbon for Payroll */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Horas Laboradas Totales (Equipo)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', my: 0.5 }}>
                      {payrollData.reduce((sum, p) => sum + p.totalHours, 0).toFixed(1)} hrs
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Registros de asistencia completados
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#ecfccb', color: '#65a30d', width: 44, height: 44 }}>
                    <AccessTimeIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Total Devengado en Salarios
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', my: 0.5 }}>
                      ${payrollData.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()} COP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
                      Monto neto de nómina devengada
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 44, height: 44 }}>
                    <AttachMoneyIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Colaboradores en Nómina
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', my: 0.5 }}>
                      {staffList.filter((s) => s.isActive).length} activos
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      De {staffList.length} registrados
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 44, height: 44 }}>
                    <TeamIcon />
                  </Avatar>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Table of Payroll by Employee */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Colaborador</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Cargo / Rol</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Tarifa x Hora</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Horas Turno</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Salario Base</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Total Neto a Pagar</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Acciones de Pago</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payrollData.map((item) => (
                  <TableRow key={item.member.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900, width: 38, height: 38 }}>
                          {item.member.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: '#1e290b' }}>{item.member.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {item.member.email} • {item.member.phone || 'Sin tel'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={item.member.role}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          bgcolor:
                            item.member.role === 'ADMINISTRADOR'
                              ? '#eff6ff'
                              : item.member.role === 'CAJERO'
                              ? '#ecfccb'
                              : item.member.role === 'COCINA'
                              ? '#ffedd5'
                              : '#f1f5f9',
                          color:
                            item.member.role === 'ADMINISTRADOR'
                              ? '#1d4ed8'
                              : item.member.role === 'CAJERO'
                              ? '#3f6212'
                              : item.member.role === 'COCINA'
                              ? '#c2410c'
                              : '#475569',
                        }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>
                      ${item.hourlyRate.toLocaleString()} /h
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: 13 }} />}
                        label={`${item.totalHours} hrs`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>
                      ${item.baseSalary.toLocaleString()} COP
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 900, color: '#15803d', fontSize: '1.05rem' }}>
                      ${item.netSalary.toLocaleString()} COP
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AttachMoneyIcon />}
                        disabled={item.netSalary === 0}
                        onClick={() =>
                          setSelectedStaffForPayroll({
                            member: item.member,
                            hoursWorked: item.totalHours,
                            hourlyRate: item.hourlyRate,
                            baseSalary: item.baseSalary,
                            bonus: 0,
                            deductions: 0,
                            totalPay: item.netSalary,
                            shifts: item.shifts,
                          })
                        }
                        sx={{
                          bgcolor: '#1e290b',
                          color: '#ffffff',
                          fontWeight: 800,
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#0f172a' },
                        }}
                      >
                        Pagar Nómina ➔
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 4: LIQUIDACIÓN DE PROPINAS (TIP POOL) */}
      {/* ======================================================== */}
      {!isCashier && currentTab === 4 && (
        <Box>
          <Grid container spacing={3}>
            {/* Left Calculator Controls */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper
                sx={{
                  p: 3.5,
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  bgcolor: '#ffffff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#fef9c3', color: '#ca8a04', borderRadius: '12px' }}>
                    <AttachMoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                      Calculadora de Propinas
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Configura el monto recaudado y la modalidad de reparto
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2.5 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
                  Monto Total del Pozo (COP)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={customTotalTips}
                  onChange={(e) => setCustomTotalTips(Math.max(0, Number(e.target.value)))}
                  sx={{ mb: 1.5 }}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><strong style={{ color: '#ca8a04' }}>$</strong></InputAdornment>,
                      sx: { borderRadius: '14px', fontWeight: 900, fontSize: '1.2rem', color: '#ca8a04' },
                    },
                  }}
                />

                {/* Preset Fast Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  {[100000, 250000, 500000, 1000000].map((preset) => (
                    <Chip
                      key={preset}
                      label={`$${(preset / 1000).toFixed(0)}k`}
                      onClick={() => setCustomTotalTips(preset)}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        borderRadius: '8px',
                        bgcolor: customTotalTips === preset ? '#fef08a' : '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: customTotalTips === preset ? '#854d0e' : '#475569',
                      }}
                    />
                  ))}
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
                  Modalidad de Distribución
                </Typography>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Select
                    value={tipDistributionMode}
                    onChange={(e) => setTipDistributionMode(e.target.value as any)}
                    sx={{ borderRadius: '14px', fontWeight: 700 }}
                  >
                    <MenuItem value="ROLE_WEIGHTED">🎯 Ponderado Completo (60% Sala, 25% Cocina, 15% Caja)</MenuItem>
                    <MenuItem value="SALA_COCINA">🍽️ Sala + Cocina (70% Sala, 30% Cocina)</MenuItem>
                    <MenuItem value="SALA_ONLY">🍷 Exclusivo Sala (100% Meseros)</MenuItem>
                    <MenuItem value="EQUITY">⚖️ Reparto Equitativo (100% en partes iguales)</MenuItem>
                    <MenuItem value="HOURS">📈 Proporcional por Volumen de Pedidos</MenuItem>
                  </Select>
                </FormControl>

                {/* Summary Card */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: '#f8fafc',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    mb: 3,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    RESUMEN DE LIQUIDACIÓN
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>Colaboradores Elegibles:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {staffEligibleForTips.length} personas
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>Promedio Estimado:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                      ${staffEligibleForTips.length ? Math.round(customTotalTips / staffEligibleForTips.length).toLocaleString() : 0} COP
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ReceiptIcon />}
                  onClick={() => {
                    setNotification({
                      open: true,
                      message: `¡Liquidación de propinas procesada! Se generó el comprobante por $${customTotalTips.toLocaleString()} COP.`,
                      severity: 'success',
                    });
                  }}
                  sx={{
                    borderRadius: '14px',
                    py: 1.4,
                    bgcolor: '#ca8a04',
                    background: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    boxShadow: '0 8px 18px rgba(202, 138, 4, 0.25)',
                    '&:hover': {
                      bgcolor: '#a16207',
                    },
                  }}
                >
                  Confirmar Liquidación y Pago
                </Button>
              </Paper>
            </Grid>

            {/* Right Breakdown Table */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper
                sx={{
                  p: 3.5,
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  bgcolor: '#ffffff',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  Desglose Individual de Liquidación
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2.5 }}>
                  Monto asignado y porcentaje correspondiente a cada colaborador elegible según la regla seleccionada.
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Colaborador</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Cargo</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">Criterio</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="center">% Asignado</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }} align="right">Monto a Recibir</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tipDistributionResults.map(({ staff, amount, percentage, criterion }) => (
                        <TableRow key={staff.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  background: getRoleConfig(staff.role).gradient,
                                  color: '#ffffff',
                                  fontSize: '0.9rem',
                                  fontWeight: 800,
                                  borderRadius: '10px',
                                }}
                              >
                                {staff.name.charAt(0)}
                              </Avatar>
                              <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{staff.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={staff.role}
                              sx={{
                                bgcolor: getRoleConfig(staff.role).bgLight,
                                color: getRoleConfig(staff.role).color,
                                fontWeight: 800,
                                borderRadius: '6px',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                              {criterion}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={`${percentage}%`}
                              sx={{ fontWeight: 900, bgcolor: '#f1f5f9', color: '#0f172a' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ fontWeight: 900, color: '#ca8a04', fontSize: '1.05rem' }}>
                              ${amount.toLocaleString()} COP
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MATRIZ DE ROLES Y PRIVILEGIOS */}
      {/* ======================================================== */}
      {!isCashier && currentTab === 5 && (
        <Box>
          <Paper
            sx={{
              p: 3.5,
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              bgcolor: '#ffffff',
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                Matriz de Privilegios y Políticas de Seguridad
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
                Configuración de privilegios para terminales de venta (TPV), cocina, salón y caja registradora.
              </Typography>
            </Box>

            <TableContainer sx={{ borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', minWidth: 260 }}>Acción / Módulo Protegido</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#e11d48' }} align="center">Administrador</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#d97706' }} align="center">Gerente</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#059669' }} align="center">Cajero</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0284c7' }} align="center">Mesero</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#ea580c' }} align="center">Cocina</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#7c3aed' }} align="center">Inventario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Category 1: Caja y Ventas */}
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell colSpan={7} sx={{ py: 1, px: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                        VENTAS & FACTURACIÓN (TPV)
                      </Typography>
                    </TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Apertura y Cierre de Caja (Arqueo)
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Aplicar Descuentos Especiales y Cortesías
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Anular Platos o Pedidos en Preparación
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                  </TableRow>

                  {/* Category 2: Operaciones y Control */}
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell colSpan={7} sx={{ py: 1, px: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                        GESTIÓN OPERATIVA, STOCK Y REPORTES
                      </Typography>
                    </TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Consultar Reportes Financieros y Métricas de Turno
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Modificar Stock, Proveedores y Recetas
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                  </TableRow>

                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                      Gestión de Personal, Altas y Cambio de PINs
                    </TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CheckIcon sx={{ color: '#16a34a' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                    <TableCell align="center"><CloseIcon sx={{ color: '#cbd5e1' }} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {/* ======================================================== */}
      <Dialog
        open={openEmployeeDialog}
        onClose={() => setOpenEmployeeDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1,
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid #f1f5f9', pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#ecfdf5', color: '#16a34a', borderRadius: '12px' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              {editingEmployee ? `Editar Perfil: ${editingEmployee.name}` : 'Registrar Nuevo Colaborador'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Define roles, datos de contacto, PIN táctil y permisos de acceso
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Grid container spacing={2.5}>
            {/* Personal Data Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DATOS PERSONALES & CONTACTO
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Mateo Gómez"
                required
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Correo Electrónico (Login Web)"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ejemplo@sesamo.com"
                required
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Teléfono / Celular"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Cédula de Ciudadanía / Documento"
                value={formDocId}
                onChange={(e) => setFormDocId(e.target.value)}
                placeholder="1020304050"
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            {/* Role & Area Section */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CARGO, ÁREA & TARIFA
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Cargo / Rol Operativo</InputLabel>
                <Select
                  value={formRole}
                  label="Cargo / Rol Operativo"
                  onChange={(e) => handleRoleChangeInForm(e.target.value as Role)}
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="ADMINISTRADOR">👑 Administrador General</MenuItem>
                  <MenuItem value="GERENTE">⭐ Gerente de Turno</MenuItem>
                  <MenuItem value="CAJERO">💵 Cajero / Facturación</MenuItem>
                  <MenuItem value="MESERO">🍽️ Mesero de Sala / Barra</MenuItem>
                  <MenuItem value="COCINA">🍳 Cocinero / Chef</MenuItem>
                  <MenuItem value="INVENTARIO">📦 Inventario & Bodega</MenuItem>
                  <MenuItem value="REPARTIDOR">🛵 Domiciliario Express</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Área Asignada"
                value={formArea}
                onChange={(e) => setFormArea(e.target.value)}
                placeholder="Ej. Salón Comedor, Cocina, Caja"
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            {/* Security & Access Section */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ACCESO TPV & SEGURIDAD
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="PIN Táctil (4 Dígitos)"
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.slice(0, 4))}
                placeholder="1234"
                helperText="Para desbloquear el TPV rápidamente"
                slotProps={{
                  input: {
                    sx: { borderRadius: '12px', fontWeight: 900, letterSpacing: 2 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Generar PIN aleatorio">
                          <IconButton size="small" onClick={handleGenerateRandomPin}>
                            <CasinoIcon fontSize="small" sx={{ color: '#16a34a' }} />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Contraseña Web"
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="password123"
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Tarifa por Hora (COP)"
                type="number"
                value={formHourlyRate}
                onChange={(e) => setFormHourlyRate(Number(e.target.value))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { borderRadius: '12px', fontWeight: 700 },
                  },
                }}
              />
            </Grid>

            {/* Custom Permissions Section */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PERMISOS ESPECÍFICOS DEL COLABORADOR
              </Typography>
              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canOpenCloseCash}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canOpenCloseCash: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Apertura / Cierre de Caja</Typography>}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canApplyDiscounts}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canApplyDiscounts: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Aplicar Descuentos / Cortesías</Typography>}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canVoidItems}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canVoidItems: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Anular Platos en Comanda</Typography>}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canAccessReports}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canAccessReports: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Acceso a Reportes Financieros</Typography>}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canManageInventory}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canManageInventory: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Gestión de Stock y Recetas</Typography>}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formPermissions.canManageStaff}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({ ...prev, canManageStaff: e.target.checked }))
                          }
                          color="success"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Administrar Personal y PINs</Typography>}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* Active Account Switch */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                        Colaborador Activo en el Sistema
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#15803d' }}>
                        Habilitado para ingresar con contraseña web y fichar en el terminal táctil TPV.
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button
            onClick={() => setOpenEmployeeDialog(false)}
            sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none', color: '#64748b' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEmployee}
            sx={{
              borderRadius: '12px',
              px: 3,
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: '#16a34a',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
            }}
          >
            {editingEmployee ? 'Guardar Cambios' : 'Registrar Colaborador'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* TOUCHSCREEN KEYPAD DIALOG (TPV TERMINAL STYLE) */}
      {/* ======================================================== */}
      <Dialog
        open={openClockDialog}
        onClose={() => setOpenClockDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '26px',
              p: 1.5,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
            },
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 900, pb: 0.5 }}>
          Terminal de Asistencia TPV
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2.5 }}>
            Selecciona tu nombre e ingresa tu PIN de 4 dígitos para registrar entrada, pausa o salida.
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Selecciona tu Nombre</InputLabel>
            <Select
              value={clockSelectedStaffId}
              label="Selecciona tu Nombre"
              onChange={(e) => {
                setClockSelectedStaffId(e.target.value);
                setClockPinError('');
              }}
              sx={{ borderRadius: '14px', fontWeight: 700, textAlign: 'left' }}
            >
              {staffList
                .filter((s) => s.isActive)
                .map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.role}) — {s.shiftStatus === 'EN_TURNO' ? '🟢 En Turno' : s.shiftStatus === 'DESCANSO' ? '🟠 En Pausa' : '⚪ Fuera'}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* PIN Input Display */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1.5,
              my: 2,
            }}
          >
            {[0, 1, 2, 3].map((idx) => (
              <Box
                key={idx}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  border: '2px solid',
                  borderColor: clockPinInput.length > idx ? '#16a34a' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  bgcolor: clockPinInput.length > idx ? '#f0fdf4' : '#ffffff',
                  color: '#16a34a',
                  transition: 'all 0.15s ease',
                  boxShadow: clockPinInput.length > idx ? '0 4px 10px rgba(22, 163, 74, 0.2)' : 'none',
                }}
              >
                {clockPinInput.length > idx ? '●' : ''}
              </Box>
            ))}
          </Box>

          {clockPinError && (
            <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 800, display: 'block', mb: 1.5 }}>
              {clockPinError}
            </Typography>
          )}

          {/* Keypad Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.2, maxWidth: 280, mx: 'auto', mb: 2.5 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <Button
                key={num}
                variant="outlined"
                onClick={() => handleKeypadPress(num)}
                sx={{
                  height: 54,
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  borderRadius: '14px',
                  borderColor: '#e2e8f0',
                  color: '#1e293b',
                  bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
                }}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outlined"
              color="error"
              onClick={handleKeypadClear}
              sx={{ height: 54, fontWeight: 900, borderRadius: '14px', fontSize: '1.1rem' }}
            >
              C
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleKeypadPress('0')}
              sx={{
                height: 54,
                fontSize: '1.35rem',
                fontWeight: 800,
                borderRadius: '14px',
                borderColor: '#e2e8f0',
                color: '#1e293b',
                bgcolor: '#f8fafc',
                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
              }}
            >
              0
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleKeypadBackspace}
              sx={{ height: 54, fontWeight: 900, borderRadius: '14px', fontSize: '1.2rem' }}
            >
              ⌫
            </Button>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<LoginIcon />}
              onClick={() => handleProcessKeypadAction('CLOCK_IN')}
              sx={{
                fontWeight: 800,
                py: 1.2,
                borderRadius: '12px',
                textTransform: 'none',
                bgcolor: '#16a34a',
                '&:hover': { bgcolor: '#15803d' },
              }}
            >
              Entrada
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              startIcon={<PauseCircleIcon />}
              onClick={() => handleProcessKeypadAction('BREAK')}
              sx={{ fontWeight: 800, py: 1.2, borderRadius: '12px', textTransform: 'none' }}
            >
              Pausa
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<ExitToAppIcon />}
              onClick={() => handleProcessKeypadAction('CLOCK_OUT')}
              sx={{
                fontWeight: 800,
                py: 1.2,
                borderRadius: '12px',
                textTransform: 'none',
                bgcolor: '#ef4444',
                '&:hover': { bgcolor: '#dc2626' },
              }}
            >
              Salida
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MANUAL SHIFT LOGGING DIALOG */}
      {/* ======================================================== */}
      <Dialog
        open={openManualShiftDialog}
        onClose={() => setOpenManualShiftDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '22px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Registrar Turno Manual</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Colaborador</InputLabel>
            <Select
              value={shiftStaffId}
              label="Colaborador"
              onChange={(e) => setShiftStaffId(e.target.value)}
              sx={{ borderRadius: '12px' }}
            >
              {staffList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Hora de Ingreso"
            type="time"
            value={shiftCheckIn}
            onChange={(e) => setShiftCheckIn(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: '12px' } },
            }}
          />

          <TextField
            fullWidth
            label="Hora de Salida"
            type="time"
            value={shiftCheckOut}
            onChange={(e) => setShiftCheckOut(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
              inputLabel: { shrink: true },
              input: { sx: { borderRadius: '12px' } },
            }}
          />

          <TextField
            fullWidth
            label="Observaciones"
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
            placeholder="Ej. Olvidó marcar entrada en el TPV"
            multiline
            rows={2}
            slotProps={{ input: { sx: { borderRadius: '12px' } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenManualShiftDialog(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, color: '#64748b' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveManualShift}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: '#16a34a',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            }}
          >
            Guardar Turno
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* CONTEXT ACTION MENU */}
      {/* ======================================================== */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              p: 0.5,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedStaffForMenu) handleOpenEditEmployee(selectedStaffForMenu);
            setMenuAnchorEl(null);
          }}
          sx={{ borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem' }}
        >
          <EditIcon sx={{ fontSize: 18, mr: 1.5, color: '#64748b' }} />
          Editar Información
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedStaffForMenu) handleToggleActive(selectedStaffForMenu);
            setMenuAnchorEl(null);
          }}
          sx={{ borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem' }}
        >
          <CheckCircleIcon sx={{ fontSize: 18, mr: 1.5, color: '#64748b' }} />
          {selectedStaffForMenu?.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta'}
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            if (selectedStaffForMenu) handleDeleteEmployee(selectedStaffForMenu);
            setMenuAnchorEl(null);
          }}
          sx={{ borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', color: '#ef4444' }}
        >
          <DeleteIcon sx={{ fontSize: 18, mr: 1.5 }} />
          Eliminar Colaborador
        </MenuItem>
      </Menu>

      {/* ======================================================== */}
      {/* MODAL: LIQUIDACIÓN DE REPARTIDOR EN CAJA */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(selectedRiderForSettlement)}
        onClose={() => setSelectedRiderForSettlement(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeliveryIcon sx={{ color: '#ea580c' }} />
          Liquidación de Turno: {selectedRiderForSettlement?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedRiderForSettlement && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 2.5, border: '1.5px solid #fed7aa' }}>
                <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 800, textTransform: 'uppercase' }}>
                  Recaudo en Efectivo en Calle (Ingreso a Caja):
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#9a3412', my: 0.5 }}>
                  ${selectedRiderForSettlement.cashTotal.toLocaleString()} COP
                </Typography>
                <Typography variant="body2" sx={{ color: '#c2410c', fontWeight: 600 }}>
                  Fletes ganados por el motorizado: ${selectedRiderForSettlement.deliveryFeeTotal.toLocaleString()} COP ({selectedRiderForSettlement.orders.length} pedidos)
                </Typography>
                <Divider sx={{ my: 1, borderColor: '#fdba74' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#9a3412' }}>
                    Balance Neto a favor de Caja:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#15803d' }}>
                    ${Math.max(0, selectedRiderForSettlement.cashTotal - selectedRiderForSettlement.deliveryFeeTotal).toLocaleString()} COP
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Detalle de comandas de este turno:
              </Typography>

              <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {selectedRiderForSettlement.orders.map((ord, idx) => (
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
          <Button onClick={() => setSelectedRiderForSettlement(null)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AttachMoneyIcon />}
            onClick={() => selectedRiderForSettlement && handleExecuteRiderSettlement(selectedRiderForSettlement.id, true)}
            sx={{ fontWeight: 900, borderRadius: '10px', px: 2.5, bgcolor: '#16a34a' }}
          >
            Liquidar Turno & Descargar a Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: TIRILLA TÉRMICA DE LIQUIDACIÓN DE REPARTIDOR */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(settlementReceipt)}
        onClose={() => setSettlementReceipt(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Comprobante de Liquidación (80mm)</DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#ffffff', color: '#000000', fontFamily: 'monospace' }}>
          {settlementReceipt && (
            <Box>
              <Typography align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: 1 }}>
                SÉSAMO ALIMENTOS
              </Typography>
              <Typography align="center" variant="caption" sx={{ display: 'block', mb: 2 }}>
                LIQUIDACIÓN DE REPARTIDOR / CUADRE
              </Typography>
              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Typography variant="body2"><strong>REPARTIDOR:</strong> {settlementReceipt.riderName}</Typography>
              <Typography variant="body2"><strong>FECHA:</strong> {new Date(settlementReceipt.date).toLocaleString('es-CO')}</Typography>
              <Typography variant="body2"><strong>PEDIDOS ENTREGADOS:</strong> {settlementReceipt.ordersCount}</Typography>

              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>(+) Recaudo Efectivo:</span>
                <span>${settlementReceipt.cashCollected.toLocaleString()} COP</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>(-) Pago de Fletes:</span>
                <span>${settlementReceipt.feesPaid.toLocaleString()} COP</span>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem' }}>
                <span>INGRESO NETO EN CAJA:</span>
                <span>${settlementReceipt.netCashToRegister.toLocaleString()} COP</span>
              </Box>
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 2 }}>
                Firma Cajero: _________________________
              </Typography>
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>
                Firma Repartidor: _________________________
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSettlementReceipt(null)} sx={{ fontWeight: 700 }}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={() => window.print()}
            sx={{ fontWeight: 900, bgcolor: '#1e290b', color: '#ffffff' }}
          >
            Imprimir Comprobante
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: PAGO DE NÓMINA POR HORAS */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(selectedStaffForPayroll)}
        onClose={() => setSelectedStaffForPayroll(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon sx={{ color: '#16a34a' }} />
          Pagar Nómina: {selectedStaffForPayroll?.member.name}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedStaffForPayroll && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2.5, border: '1.5px solid #86efac' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Neto a Desembolsar:
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#166534', my: 0.5 }}>
                  ${selectedStaffForPayroll.totalPay.toLocaleString()} COP
                </Typography>
                <Typography variant="body2" sx={{ color: '#15803d' }}>
                  {selectedStaffForPayroll.hoursWorked} horas laboradas a ${selectedStaffForPayroll.hourlyRate.toLocaleString()} /h.
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Registro de turnos computados:
              </Typography>

              <Stack spacing={1} sx={{ maxHeight: 180, overflowY: 'auto' }}>
                {selectedStaffForPayroll.shifts.map((sh, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Fecha: {sh.date} ({sh.checkIn} - {sh.checkOut || 'Activo'})
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#15803d' }}>
                      {sh.hoursWorked} hrs
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSelectedStaffForPayroll(null)} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AttachMoneyIcon />}
            onClick={() => selectedStaffForPayroll && handleExecutePayrollPayment(String(selectedStaffForPayroll.member.id))}
            sx={{ fontWeight: 900, borderRadius: '10px', px: 2.5, bgcolor: '#16a34a' }}
          >
            Registrar Egreso en Caja y Emitir Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: COMPROBANTE DE PAGO DE NÓMINA (VOLANTE) */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(payrollReceipt)}
        onClose={() => setPayrollReceipt(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Volante de Pago de Nómina</DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#ffffff', color: '#000000', fontFamily: 'monospace' }}>
          {payrollReceipt && (
            <Box>
              <Typography align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: 1 }}>
                SÉSAMO ALIMENTOS
              </Typography>
              <Typography align="center" variant="caption" sx={{ display: 'block', mb: 2 }}>
                VOLANTE DE PAGO DE SALARIOS
              </Typography>
              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Typography variant="body2"><strong>COLABORADOR:</strong> {payrollReceipt.employeeName}</Typography>
              <Typography variant="body2"><strong>CARGO:</strong> {payrollReceipt.role}</Typography>
              <Typography variant="body2"><strong>FECHA DE PAGO:</strong> {new Date(payrollReceipt.date).toLocaleString('es-CO')}</Typography>

              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Horas Trabajadas:</span>
                <span>{payrollReceipt.hoursWorked} hrs</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Tarifa por Hora:</span>
                <span>${payrollReceipt.hourlyRate.toLocaleString()} COP</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Salario Base:</span>
                <span>${payrollReceipt.baseSalary.toLocaleString()} COP</span>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#000' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem' }}>
                <span>TOTAL NETO PAGADO:</span>
                <span>${payrollReceipt.totalNet.toLocaleString()} COP</span>
              </Box>
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 3 }}>
                Firma Colaborador: _________________________
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPayrollReceipt(null)} sx={{ fontWeight: 700 }}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={() => window.print()}
            sx={{ fontWeight: 900, bgcolor: '#1e290b', color: '#ffffff' }}
          >
            Imprimir Volante
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* DIÁLOGO DETALLE DE TRAZABILIDAD Y PAUSAS DEL TURNO */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(selectedShiftForTraceability)}
        onClose={() => setSelectedShiftForTraceability(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '22px', p: 1 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <HistoryIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>
                Trazabilidad del Turno
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Auditoría detallada de fichaje y descansos
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setSelectedShiftForTraceability(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {selectedShiftForTraceability && (
            <Box>
              {/* Resumen del colaborador */}
              <Box sx={{ p: 2, mb: 2.5, bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a' }}>
                    {selectedShiftForTraceability.staffName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                    <Chip
                      size="small"
                      label={selectedShiftForTraceability.role}
                      sx={{
                        bgcolor: getRoleConfig(selectedShiftForTraceability.role).bgLight,
                        color: getRoleConfig(selectedShiftForTraceability.role).color,
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Fecha: {selectedShiftForTraceability.date}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  size="small"
                  label={selectedShiftForTraceability.status}
                  sx={{
                    bgcolor: selectedShiftForTraceability.status === 'ACTIVO' ? '#dcfce7' : selectedShiftForTraceability.status === 'DESCANSO' ? '#ffedd5' : '#f1f5f9',
                    color: selectedShiftForTraceability.status === 'ACTIVO' ? '#15803d' : selectedShiftForTraceability.status === 'DESCANSO' ? '#c2410c' : '#475569',
                    fontWeight: 900,
                  }}
                />
              </Box>

              {/* Métricas clave del turno */}
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>Entrada</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#16a34a' }}>{selectedShiftForTraceability.checkIn}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>Salida</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: selectedShiftForTraceability.checkOut ? '#dc2626' : '#94a3b8' }}>
                      {selectedShiftForTraceability.checkOut || 'En curso'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px', bgcolor: '#fff7ed', borderColor: '#fed7aa' }}>
                    <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 700, display: 'block' }}>Descansos</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#ea580c' }}>
                      {selectedShiftForTraceability.totalBreakMinutes || (selectedShiftForTraceability.status === 'DESCANSO' ? 15 : 0)} min
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>Horas Total</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#0f172a' }}>
                      {selectedShiftForTraceability.hoursWorked ? `${selectedShiftForTraceability.hoursWorked} h` : '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Desglose de Pausas y Descansos */}
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#0f172a', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BreakIcon sx={{ color: '#ea580c', fontSize: 18 }} />
                Registro de Pausas Tomadas
              </Typography>

              {(!selectedShiftForTraceability.breaks || selectedShiftForTraceability.breaks.length === 0) && selectedShiftForTraceability.status !== 'DESCANSO' ? (
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '12px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Este colaborador no registró pausas durante esta jornada.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={1} sx={{ mb: 2.5 }}>
                  {selectedShiftForTraceability.breaks && selectedShiftForTraceability.breaks.map((brk, idx) => (
                    <Paper key={brk.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#fffbf5', borderColor: '#fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontWeight: 800, fontSize: '0.75rem' }}>
                          #{idx + 1}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            Pausa / Refrigerio
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Inicio: <strong>{brk.startTime}</strong> {brk.endTime ? `— Fin: ${brk.endTime}` : '(En curso)'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={brk.durationMinutes ? `${brk.durationMinutes} min` : 'En curso...'}
                        size="small"
                        sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800, borderRadius: '8px' }}
                      />
                    </Paper>
                  ))}
                  {selectedShiftForTraceability.status === 'DESCANSO' && (!selectedShiftForTraceability.breaks || selectedShiftForTraceability.breaks.length === 0) && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#fffbf5', borderColor: '#fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontWeight: 800 }}>
                          #1
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>Pausa Actual</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>El colaborador se encuentra actualmente en refrigerio</Typography>
                        </Box>
                      </Box>
                      <Chip label="En Pausa Activa" size="small" sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800 }} />
                    </Paper>
                  )}
                </Stack>
              )}

              {/* Bitácora / Notas de Auditoría */}
              {selectedShiftForTraceability.notes && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Bitácora de Observaciones Registradas:
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.86rem', lineHeight: 1.6 }}>
                      {selectedShiftForTraceability.notes}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setSelectedShiftForTraceability(null)}
            sx={{ fontWeight: 800, borderRadius: '10px', bgcolor: '#16a34a', textTransform: 'none', px: 3, '&:hover': { bgcolor: '#15803d' } }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* SNACKBAR NOTIFICATIONS */}
      {/* ======================================================== */}
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
          sx={{ width: '100%', fontWeight: 700, borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
