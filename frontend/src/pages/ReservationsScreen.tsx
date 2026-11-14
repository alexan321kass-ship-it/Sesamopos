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
  Button,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Search as SearchIcon,
  TableRestaurant as TableIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Cake as CakeIcon,
  Chat as ChatIcon,
  FileDownload as DownloadIcon,
  Chair as ChairIcon,
  Celebration as CelebrationIcon,
  AttachMoney as MoneyIcon,
  LocalOffer as TagIcon,
  ContentCopy as CopyIcon,
  Send as SendIcon,
  Stars as StarsIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Reservation, ReservationStatus, Table as RestaurantTable, Customer } from '../types';

// Status styling configuration
const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default' | 'primary'; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'warning', bg: '#fef3c7', text: '#92400e' },
  CONFIRMADA: { label: 'Confirmada', color: 'info', bg: '#e0f2fe', text: '#0369a1' },
  SENTADA: { label: 'En Mesa (Sentada)', color: 'primary', bg: '#ede9fe', text: '#6d28d9' },
  COMPLETADA: { label: 'Completada', color: 'success', bg: '#dcfce7', text: '#15803d' },
  CANCELADA: { label: 'Cancelada', color: 'error', bg: '#fee2e2', text: '#b91c1c' },
  NO_SHOW: { label: 'No Asistió (No-Show)', color: 'error', bg: '#f3f4f6', text: '#4b5563' },
};

const OCCASIONS = [
  { value: 'CUMPLEAÑOS', label: 'Cumpleaños 🎂', emoji: '🎂', perk: 'Postre de la casa con vela cortesía del Chef' },
  { value: 'ANIVERSARIO', label: 'Aniversario 🥂', emoji: '🥂', perk: 'Copas de espumoso de bienvenida y ubicación íntima' },
  { value: 'REUNION_NEGOCIOS', label: 'Reunión de Negocios 💼', emoji: '💼', perk: 'Zona silenciosa, conectores eléctricos y factura electrónica' },
  { value: 'CENA_FAMILIAR', label: 'Cena Familiar 👨‍👩‍👧‍👦', emoji: '👨‍👩‍👧‍👦', perk: 'Sillas infantiles disponibles y menú para compartir' },
  { value: 'OTRO', label: 'Ocasión Regular / Almuerzo-Cena', emoji: '🍽️', perk: 'Servicio estándar de excelencia Sésamo' },
];

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<'HOY' | 'MANANA' | 'PROXIMOS' | 'TODAS'>('HOY');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'TABLE'>('TIMELINE');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Partial<Reservation> | null>(null);
  const [deleteConfirmReservation, setDeleteConfirmReservation] = useState<Reservation | null>(null);
  const [whatsAppModalReservation, setWhatsAppModalReservation] = useState<Reservation | null>(null);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');

  // Quick Seat selection modal
  const [seatTableSelectModal, setSeatTableSelectModal] = useState<{ open: boolean; reservation: Reservation | null }>({
    open: false,
    reservation: null,
  });

  // Snackbar feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resList, tblList, custList] = await Promise.all([
        mockApi.reservations.getAll(),
        mockApi.tables.getAll(),
        mockApi.customers.getAll(),
      ]);
      setReservations(resList);
      setTables(tblList);
      setCustomers(custList);
    } catch (err) {
      console.error('Error cargando reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_reservations_updated', handleUpdate);
    window.addEventListener('sesamo_tables_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_reservations_updated', handleUpdate);
      window.removeEventListener('sesamo_tables_updated', handleUpdate);
    };
  }, []);

  // Helper date matchers
  const isToday = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const isTomorrow = (timestamp: number) => {
    const d = new Date(timestamp);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();
  };

  // KPIs
  const kpis = useMemo(() => {
    const todayReservations = reservations.filter(r => isToday(r.date) && r.status !== 'CANCELADA');
    const todayGuests = todayReservations.reduce((sum, r) => sum + r.guestCount, 0);
    const pendingCount = reservations.filter(r => r.status === 'PENDIENTE').length;
    const confirmedCount = reservations.filter(r => r.status === 'CONFIRMADA').length;
    const seatedCount = reservations.filter(r => r.status === 'SENTADA').length;
    const totalDeposits = reservations.reduce((sum, r) => sum + (r.depositAmount || 0), 0);

    const occupiedTables = tables.filter(t => t.status === 'OCUPADA').length;
    const reservedTables = tables.filter(t => t.status === 'RESERVADA').length;
    const salonOccupancyPct = tables.length > 0 ? Math.round(((occupiedTables + reservedTables) / tables.length) * 100) : 0;

    return {
      todayCount: todayReservations.length,
      todayGuests,
      pendingCount,
      confirmedCount,
      seatedCount,
      totalDeposits,
      occupiedTables,
      reservedTables,
      salonOccupancyPct,
    };
  }, [reservations, tables]);

  // Filtered and sorted reservations for tab 0
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      // Search
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        r.customerName.toLowerCase().includes(query) ||
        r.customerPhone.includes(query) ||
        (r.tableName && r.tableName.toLowerCase().includes(query)) ||
        (r.specialRequests && r.specialRequests.toLowerCase().includes(query)) ||
        (r.notes && r.notes.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Day Filter
      if (selectedDayFilter === 'HOY' && !isToday(r.date)) return false;
      if (selectedDayFilter === 'MANANA' && !isTomorrow(r.date)) return false;
      if (selectedDayFilter === 'PROXIMOS' && r.date < Date.now() - 3600000 * 24) return false;

      // Status Filter
      if (selectedStatus !== 'TODOS' && r.status !== selectedStatus) return false;

      return true;
    }).sort((a, b) => a.date - b.date);
  }, [reservations, searchQuery, selectedDayFilter, selectedStatus]);

  // Celebrations filtered (Birthdays, Anniversaries, Business)
  const celebrationReservations = useMemo(() => {
    return reservations.filter(r => r.occasion && r.occasion !== 'OTRO' && r.status !== 'CANCELADA')
      .sort((a, b) => a.date - b.date);
  }, [reservations]);

  // Deposit reservations list
  const depositReservations = useMemo(() => {
    return reservations.filter(r => r.depositAmount && r.depositAmount > 0)
      .sort((a, b) => b.date - a.date);
  }, [reservations]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const now = new Date();
    const defaultTime = `${String(now.getHours() + 1).padStart(2, '0')}:00`;

    setEditingReservation({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      date: Date.now() + 3600000 * 2,
      timeSlot: defaultTime,
      guestCount: 2,
      tableId: tables[0]?.id || '1',
      tableName: `Mesa ${tables[0]?.number || 1} (Salón)`,
      status: 'CONFIRMADA',
      occasion: 'OTRO',
      specialRequests: '',
      notes: '',
      durationMinutes: 120,
      depositAmount: 0,
    });
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (reservation: Reservation) => {
    setEditingReservation(JSON.parse(JSON.stringify(reservation)));
    setIsEditModalOpen(true);
  };

  // Save Reservation
  const handleSaveReservation = async () => {
    if (!editingReservation || !editingReservation.customerName?.trim()) {
      setSnackbar({ open: true, message: 'El nombre del cliente es obligatorio.', severity: 'error' });
      return;
    }
    if (!editingReservation.customerPhone?.trim()) {
      setSnackbar({ open: true, message: 'El teléfono de contacto es obligatorio.', severity: 'error' });
      return;
    }

    try {
      const assignedTable = tables.find(t => t.id === editingReservation.tableId);
      const dataToSave = {
        ...editingReservation,
        tableName: assignedTable ? `Mesa ${assignedTable.number} (Salón)` : 'Sin Asignar',
        guestCount: Number(editingReservation.guestCount) || 2,
        depositAmount: Number(editingReservation.depositAmount) || 0,
      };

      if (editingReservation.id) {
        await mockApi.reservations.update(editingReservation.id, dataToSave);
        setSnackbar({ open: true, message: `Reserva de ${dataToSave.customerName} actualizada con éxito.`, severity: 'success' });
      } else {
        await mockApi.reservations.create(dataToSave as Omit<Reservation, 'id'>);
        setSnackbar({ open: true, message: `Nueva reserva para ${dataToSave.customerName} agendada exitosamente.`, severity: 'success' });
      }

      setIsEditModalOpen(false);
      setEditingReservation(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al guardar la reserva.', severity: 'error' });
    }
  };

  // Fast Seat Comensales in Salon
  const handleSeatGuests = async (reservation: Reservation, overrideTableId?: string) => {
    try {
      if (overrideTableId && overrideTableId !== reservation.tableId) {
        const assignedTable = tables.find(t => t.id === overrideTableId);
        await mockApi.reservations.update(reservation.id, {
          tableId: overrideTableId,
          tableName: assignedTable ? `Mesa ${assignedTable.number} (Salón)` : reservation.tableName,
          status: 'SENTADA'
        });
      } else {
        await mockApi.reservations.seatReservation(reservation.id);
      }

      setSnackbar({
        open: true,
        message: `¡Comensales sentados! ${reservation.tableName || 'La mesa'} ahora está OCUPADA en el salón.`,
        severity: 'success'
      });
      setSeatTableSelectModal({ open: false, reservation: null });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al sentar comensales en el salón.', severity: 'error' });
    }
  };

  // Change reservation status
  const handleChangeStatus = async (id: string, newStatus: ReservationStatus) => {
    try {
      await mockApi.reservations.update(id, { status: newStatus });
      setSnackbar({ open: true, message: `Estado actualizado a ${STATUS_CONFIG[newStatus].label}.`, severity: 'info' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al actualizar el estado de la reserva.', severity: 'error' });
    }
  };

  // Delete Reservation
  const handleDeleteReservation = async (reservation: Reservation) => {
    try {
      await mockApi.reservations.delete(reservation.id);
      setDeleteConfirmReservation(null);
      setSnackbar({ open: true, message: 'Reserva eliminada y mesa liberada en el salón.', severity: 'info' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar la reserva.', severity: 'error' });
    }
  };

  // Prepare & Open WhatsApp Dialog
  const handleOpenWhatsAppModal = (reservation: Reservation) => {
    const dateStr = new Date(reservation.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = reservation.timeSlot || new Date(reservation.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const occasionInfo = reservation.occasion && reservation.occasion !== 'OTRO'
      ? `\n🎉 *Motivo de celebración:* ${OCCASIONS.find(o => o.value === reservation.occasion)?.label}`
      : '';
    const depositInfo = reservation.depositAmount && reservation.depositAmount > 0
      ? `\n💵 *Anticipo acreditado:* $${reservation.depositAmount.toLocaleString()} COP`
      : '';

    const text = `¡Hola ${reservation.customerName}! 🌿🍽️\n\nTe confirmamos con mucho gusto tu reserva en *Restaurante Sésamo*:\n\n📅 *Fecha:* ${dateStr}\n⏰ *Hora:* ${timeStr}\n👥 *Comensales:* ${reservation.guestCount} personas\n🪑 *Mesa asignada:* ${reservation.tableName || 'Salón Principal'}${occasionInfo}${depositInfo}\n\n📍 *Ubicación:* Calle 10 # 35-12, El Poblado, Medellín\n⚠️ *Nota:* Disponemos de 15 minutos de tolerancia para tu llegada.\n\n¡El equipo culinario de Sésamo te espera con los brazos abiertos!`;

    setWhatsAppModalReservation(reservation);
    setCustomWhatsAppMsg(text);
  };

  // Send WhatsApp message
  const handleSendWhatsAppNow = () => {
    if (!whatsAppModalReservation) return;
    const cleanPhone = whatsAppModalReservation.customerPhone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(customWhatsAppMsg)}`, '_blank');
    setWhatsAppModalReservation(null);
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWhatsAppMsg = () => {
    navigator.clipboard.writeText(customWhatsAppMsg);
    setSnackbar({ open: true, message: 'Mensaje copiado al portapapeles', severity: 'info' });
  };

  // Autofill from existing customer CRM
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (cust && editingReservation) {
      setEditingReservation({
        ...editingReservation,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerEmail: cust.email || '',
        notes: cust.notes || cust.preferences ? `Cliente frecuente (${cust.tier || 'Regular'}). Preferencia: ${cust.preferences || ''}` : '',
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,Fecha,Hora,Cliente,Telefono,Email,Personas,Mesa,Estado,Ocasion,Anticipo,Notas\n';
    const rows = filteredReservations
      .map(r => `"${r.id}","${new Date(r.date).toLocaleDateString('es-CO')}","${r.timeSlot || ''}","${r.customerName}","${r.customerPhone}","${r.customerEmail || ''}",${r.guestCount},"${r.tableName || ''}","${r.status}","${r.occasion || ''}",${r.depositAmount || 0},"${(r.notes || '').replace(/"/g, '""')}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reservas_Sesamo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSnackbar({ open: true, message: 'Agenda de reservas exportada a CSV exitosamente.', severity: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#1e290b' }}>
          Sincronizando Agenda de Reservas Sésamo...
        </Typography>
        <LinearProgress color="primary" sx={{ height: 6, borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#ecfccb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#65a30d',
              }}
            >
              <EventIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e290b', letterSpacing: -0.5 }}>
                Agenda de Reservas & Salón
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Control de mesas, recepción de comensales, ocasiones especiales y confirmaciones WhatsApp automáticas.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ borderColor: '#cbd5e1', color: '#334155' }}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ borderColor: '#cbd5e1', color: '#334155' }}
          >
            Sincronizar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            sx={{ fontWeight: 'bold', px: 2.5, bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' } }}
          >
            Nueva Reserva
          </Button>
        </Stack>
      </Box>

      {/* KPI RIBBON */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Reservas Hoy
              </Typography>
              <EventIcon sx={{ fontSize: 20, color: '#65a30d' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e290b' }}>
              {kpis.todayCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Agendadas para el día de hoy
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Comensales (Pax)
              </Typography>
              <PeopleIcon sx={{ fontSize: 20, color: '#0284c7' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284c7' }}>
              {kpis.todayGuests}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Personas esperadas en salón
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Por Confirmar
              </Typography>
              <Chip
                label={kpis.pendingCount > 0 ? `${kpis.pendingCount} req.` : 'Al día'}
                size="small"
                color={kpis.pendingCount > 0 ? 'warning' : 'success'}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: kpis.pendingCount > 0 ? '#d97706' : '#1e290b' }}>
              {kpis.pendingCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Esperando WhatsApp / llamada
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Salón Ocupado
              </Typography>
              <ChairIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#7c3aed' }}>
                {kpis.salonOccupancyPct}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                ({kpis.occupiedTables + kpis.reservedTables}/{tables.length} mesas)
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {kpis.seatedCount} reservas sentadas
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Anticipos / Garantías
              </Typography>
              <MoneyIcon sx={{ fontSize: 20, color: '#16a34a' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a' }}>
              ${kpis.totalDeposits.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {depositReservations.length} depósitos registrados
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* MODULE NAVIGATION TABS */}
      <Paper elevation={0} sx={{ borderBottom: '1px solid #e2e8f0', mb: 3, borderRadius: '12px 12px 0 0', bgcolor: '#ffffff' }}>
        <Tabs
          value={currentTab}
          onChange={(_, v) => setCurrentTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 52, fontSize: '0.95rem' },
            '& .Mui-selected': { color: '#65a30d !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#65a30d', height: 3 },
          }}
        >
          <Tab icon={<EventIcon />} iconPosition="start" label={`Cronograma & Reservas (${filteredReservations.length})`} />
          <Tab icon={<TableIcon />} iconPosition="start" label={`Mapa de Salón & Mesas (${tables.length})`} />
          <Tab icon={<CelebrationIcon />} iconPosition="start" label={`Celebraciones & Ocasiones (${celebrationReservations.length})`} />
          <Tab icon={<MoneyIcon />} iconPosition="start" label={`Anticipos & Garantías (${depositReservations.length})`} />
        </Tabs>
      </Paper>

      {/* ======================================================== */}
      {/* TAB 0: CRONOGRAMA & RESERVAS ACTIVAS                     */}
      {/* ======================================================== */}
      {currentTab === 0 && (
        <Box>
          {/* FILTER & TIMELINE TOOLBAR */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 3.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por cliente, teléfono, mesa o petición..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Día / Período"
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value as any)}
                >
                  <MenuItem value="HOY">📅 Hoy ({reservations.filter(r => isToday(r.date)).length})</MenuItem>
                  <MenuItem value="MANANA">Mañana ({reservations.filter(r => isTomorrow(r.date)).length})</MenuItem>
                  <MenuItem value="PROXIMOS">Próximos Días</MenuItem>
                  <MenuItem value="TODAS">Historial Completo ({reservations.length})</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Estado de Reserva"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="TODOS">Todos los Estados</MenuItem>
                  <MenuItem value="CONFIRMADA">Confirmadas</MenuItem>
                  <MenuItem value="PENDIENTE">Pendientes por confirmar</MenuItem>
                  <MenuItem value="SENTADA">Sentadas (En Salón)</MenuItem>
                  <MenuItem value="COMPLETADA">Completadas</MenuItem>
                  <MenuItem value="CANCELADA">Canceladas</MenuItem>
                  <MenuItem value="NO_SHOW">No Asistió (No-Show)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3.5 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={viewMode === 'TIMELINE' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setViewMode('TIMELINE')}
                    sx={{
                      fontWeight: 700,
                      bgcolor: viewMode === 'TIMELINE' ? '#1e290b' : 'transparent',
                      color: viewMode === 'TIMELINE' ? '#ffffff' : '#334155',
                      borderColor: '#cbd5e1',
                      '&:hover': { bgcolor: viewMode === 'TIMELINE' ? '#2e3d14' : '#f8fafc' }
                    }}
                  >
                    Tarjetas (Timeline)
                  </Button>
                  <Button
                    variant={viewMode === 'TABLE' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setViewMode('TABLE')}
                    sx={{
                      fontWeight: 700,
                      bgcolor: viewMode === 'TABLE' ? '#1e290b' : 'transparent',
                      color: viewMode === 'TABLE' ? '#ffffff' : '#334155',
                      borderColor: '#cbd5e1',
                      '&:hover': { bgcolor: viewMode === 'TABLE' ? '#2e3d14' : '#f8fafc' }
                    }}
                  >
                    Tabla Detallada
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* VIEW: TIMELINE / CHRONOGRAM CARDS */}
          {viewMode === 'TIMELINE' ? (
            <Grid container spacing={2.5}>
              {filteredReservations.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
                    <EventIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      No se encontraron reservas con los filtros actuales
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5, mb: 2 }}>
                      Intenta cambiar la fecha o el estado seleccionado, o programa una nueva reserva con el botón superior.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateModal}
                      sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 700 }}
                    >
                      Crear Reserva
                    </Button>
                  </Paper>
                </Grid>
              ) : (
                filteredReservations.map(res => {
                  const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.PENDIENTE;
                  const dateObj = new Date(res.date);
                  const isTodayRes = isToday(res.date);
                  const occasionMeta = OCCASIONS.find(o => o.value === res.occasion);

                  return (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={res.id}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: res.status === 'SENTADA' ? '#c4b5fd' : res.status === 'CONFIRMADA' ? '#bae6fd' : '#e2e8f0',
                          borderRadius: 3,
                          p: 2.5,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          bgcolor: res.status === 'SENTADA' ? '#fbfbfe' : '#ffffff',
                          boxShadow: res.status === 'SENTADA' ? '0 4px 20px rgba(124, 58, 237, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          }
                        }}
                      >
                        <Box>
                          {/* Top Time and Status Badge */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  px: 1.2,
                                  py: 0.4,
                                  bgcolor: '#f1f5f9',
                                  borderRadius: 1.5,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <TimeIcon sx={{ fontSize: 16, color: '#0f172a' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                  {res.timeSlot || dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                              {isTodayRes && (
                                <Chip label="HOY" size="small" sx={{ bgcolor: '#ecfccb', color: '#4d7c0f', height: 22, fontSize: '0.65rem', fontWeight: 800 }} />
                              )}
                            </Box>
                            <Chip
                              label={statusCfg.label}
                              size="small"
                              sx={{
                                bgcolor: statusCfg.bg,
                                color: statusCfg.text,
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                border: '1px solid',
                                borderColor: `${statusCfg.text}20`,
                              }}
                            />
                          </Box>

                          {/* Customer Name & Party Details */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.8 }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b', lineHeight: 1.2 }}>
                                {res.customerName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dateObj.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </Typography>
                            </Box>
                            {res.customerId && (
                              <Chip
                                icon={<StarsIcon sx={{ fontSize: '13px !important', color: '#b45309 !important' }} />}
                                label="CRM VIP"
                                size="small"
                                sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, height: 20, fontSize: '0.62rem' }}
                              />
                            )}
                          </Box>

                          {/* Party Size & Table Allocation */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <PeopleIcon sx={{ fontSize: 16, color: '#64748b' }} />
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                                {res.guestCount} pax
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <TableIcon sx={{ fontSize: 16, color: '#65a30d' }} />
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#4d7c0f' }}>
                                {res.tableName || 'Mesa por asignar'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Contact & WhatsApp Confirmation pill */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, mb: 1.5, border: '1px solid #e2e8f0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <PhoneIcon sx={{ fontSize: 15, color: '#64748b' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                {res.customerPhone}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ChatIcon sx={{ fontSize: 14 }} />}
                              onClick={() => handleOpenWhatsAppModal(res)}
                              sx={{
                                py: 0.3,
                                px: 1.2,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#16a34a',
                                borderColor: '#bbf7d0',
                                bgcolor: '#f0fdf4',
                                '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' }
                              }}
                            >
                              WhatsApp
                            </Button>
                          </Box>

                          {/* Occasion Banner */}
                          {occasionMeta && res.occasion !== 'OTRO' && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                bgcolor: '#fffbeb',
                                border: '1px solid #fef3c7',
                                borderRadius: 1.5,
                                mb: 1.2,
                              }}
                            >
                              <CakeIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#b45309', display: 'block' }}>
                                  {occasionMeta.label}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#92400e', lineHeight: 1 }}>
                                  {occasionMeta.perk}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Special Requests */}
                          {res.specialRequests && (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6, mb: 1 }}>
                              <TagIcon sx={{ fontSize: 14, color: '#64748b', mt: 0.3 }} />
                              <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic' }}>
                                "{res.specialRequests}"
                              </Typography>
                            </Box>
                          )}

                          {/* Deposit Badge */}
                          {res.depositAmount && res.depositAmount > 0 ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#f0fdf4', px: 1, py: 0.3, borderRadius: 1, border: '1px solid #bbf7d0', mb: 1.5 }}>
                              <MoneyIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803d' }}>
                                Anticipo: ${res.depositAmount.toLocaleString()} COP
                              </Typography>
                            </Box>
                          ) : null}
                        </Box>

                        {/* Operational Action Buttons */}
                        <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                          {res.status === 'CONFIRMADA' && (
                            <Button
                              fullWidth
                              variant="contained"
                              startIcon={<ChairIcon />}
                              onClick={() => setSeatTableSelectModal({ open: true, reservation: res })}
                              sx={{
                                mb: 1,
                                fontWeight: 800,
                                bgcolor: '#65a30d',
                                '&:hover': { bgcolor: '#4d7c0f' },
                                py: 0.9,
                              }}
                            >
                              Sentar en Mesa (Salón)
                            </Button>
                          )}

                          {res.status === 'PENDIENTE' && (
                            <Button
                              fullWidth
                              variant="contained"
                              color="info"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleChangeStatus(res.id, 'CONFIRMADA')}
                              sx={{ mb: 1, fontWeight: 800, py: 0.9 }}
                            >
                              Marcar Confirmada
                            </Button>
                          )}

                          {res.status === 'SENTADA' && (
                            <Button
                              fullWidth
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleChangeStatus(res.id, 'COMPLETADA')}
                              sx={{ mb: 1, fontWeight: 800, py: 0.9 }}
                            >
                              Finalizar Servicio (Liberar Mesa)
                            </Button>
                          )}

                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                              onClick={() => handleOpenEditModal(res)}
                              sx={{ flex: 1, borderColor: '#cbd5e1', color: '#334155', fontWeight: 600 }}
                            >
                              Editar
                            </Button>
                            {res.status !== 'CANCELADA' && res.status !== 'COMPLETADA' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleChangeStatus(res.id, 'CANCELADA')}
                                sx={{ fontWeight: 600 }}
                              >
                                Cancelar
                              </Button>
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteConfirmReservation(res)}
                              sx={{ border: '1px solid #fee2e2' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          ) : (
            /* VIEW: DETAILED DATA TABLE */
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Hora & Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Contacto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>Pax</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>Mesa Salón</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Ocasión & Petición</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Anticipo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>Estado</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron reservas con los filtros aplicados.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map(res => {
                      const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.PENDIENTE;
                      const occasionMeta = OCCASIONS.find(o => o.value === res.occasion);

                      return (
                        <TableRow key={res.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                              {res.timeSlot || new Date(res.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(res.date).toLocaleDateString('es-CO')}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: '#ecfccb', color: '#65a30d', fontSize: '0.75rem', fontWeight: 800 }}>
                                {res.customerName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                  {res.customerName}
                                </Typography>
                                {res.customerEmail && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {res.customerEmail}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                {res.customerPhone}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenWhatsAppModal(res)}
                                sx={{ color: '#16a34a', p: 0.5, bgcolor: '#f0fdf4' }}
                              >
                                <ChatIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Chip label={`${res.guestCount} pax`} size="small" sx={{ fontWeight: 800, bgcolor: '#f1f5f9' }} />
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              icon={<TableIcon sx={{ fontSize: '14px !important' }} />}
                              label={res.tableName || 'Sin mesa'}
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 700, borderColor: '#bae6fd', color: '#0369a1', bgcolor: '#f0f9ff' }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                              {occasionMeta?.label || 'Regular'}
                            </Typography>
                            {res.specialRequests && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block', fontStyle: 'italic' }}>
                                "{res.specialRequests}"
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: res.depositAmount ? '#16a34a' : 'text.secondary' }}>
                              {res.depositAmount ? `$${res.depositAmount.toLocaleString()}` : '$0'}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              label={statusCfg.label}
                              size="small"
                              sx={{
                                bgcolor: statusCfg.bg,
                                color: statusCfg.text,
                                fontWeight: 800,
                                fontSize: '0.72rem',
                              }}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                              {res.status === 'CONFIRMADA' && (
                                <Tooltip title="Sentar en Mesa (Salón)">
                                  <IconButton
                                    size="small"
                                    onClick={() => setSeatTableSelectModal({ open: true, reservation: res })}
                                    sx={{ bgcolor: '#ecfccb', color: '#4d7c0f', '&:hover': { bgcolor: '#d9f99d' } }}
                                  >
                                    <ChairIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Editar Reserva">
                                <IconButton size="small" onClick={() => handleOpenEditModal(res)} sx={{ color: '#334155' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Mensaje WhatsApp">
                                <IconButton size="small" sx={{ color: '#16a34a' }} onClick={() => handleOpenWhatsAppModal(res)}>
                                  <ChatIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => setDeleteConfirmReservation(res)}>
                                  <DeleteIcon fontSize="small" />
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

      {/* ======================================================== */}
      {/* TAB 1: MAPA DE SALÓN & OCUPACIÓN EN TIEMPO REAL          */}
      {/* ======================================================== */}
      {currentTab === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Disponibilidad y Ocupación del Salón Sésamo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cruce en tiempo real entre las mesas físicas y las reservas agendadas para hoy.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Chip label="🟢 Disponible" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }} />
              <Chip label="🟣 Ocupada" size="small" sx={{ bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 700 }} />
              <Chip label="🔵 Reservada" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
            </Stack>
          </Box>

          <Grid container spacing={2.5}>
            {tables.map(tbl => {
              const tableReservationsToday = reservations.filter(r =>
                r.tableId === tbl.id && isToday(r.date) && r.status !== 'CANCELADA'
              ).sort((a, b) => a.date - b.date);

              const currentActiveRes = tableReservationsToday.find(r => r.status === 'SENTADA');
              const nextUpcomingRes = tableReservationsToday.find(r => r.status === 'CONFIRMADA' || r.status === 'PENDIENTE');

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tbl.id}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '2px solid',
                      borderColor:
                        tbl.status === 'OCUPADA' ? '#c4b5fd' :
                        tbl.status === 'RESERVADA' ? '#bae6fd' :
                        '#bbf7d0',
                      bgcolor:
                        tbl.status === 'OCUPADA' ? '#faf5ff' :
                        tbl.status === 'RESERVADA' ? '#f0f9ff' :
                        '#ffffff',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          Mesa {tbl.number}
                        </Typography>
                        <Chip
                          label={tbl.status}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor:
                              tbl.status === 'OCUPADA' ? '#ede9fe' :
                              tbl.status === 'RESERVADA' ? '#e0f2fe' :
                              '#dcfce7',
                            color:
                              tbl.status === 'OCUPADA' ? '#6d28d9' :
                              tbl.status === 'RESERVADA' ? '#0369a1' :
                              '#15803d',
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                          Capacidad: <strong>{tbl.capacity} comensales</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>•</Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {tbl.location || 'Salón Principal'}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Current / Next Status info */}
                      {currentActiveRes ? (
                        <Box sx={{ p: 1.5, bgcolor: '#f3e8ff', borderRadius: 2, mb: 1.5, border: '1px solid #e9d5ff' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#6b21a8', display: 'block', textTransform: 'uppercase' }}>
                            Comensales Sentados
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#581c87' }}>
                            {currentActiveRes.customerName} ({currentActiveRes.guestCount} pax)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7e22ce' }}>
                            Hora: {currentActiveRes.timeSlot || 'En mesa'}
                          </Typography>
                        </Box>
                      ) : nextUpcomingRes ? (
                        <Box sx={{ p: 1.5, bgcolor: '#e0f2fe', borderRadius: 2, mb: 1.5, border: '1px solid #bae6fd' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369a1', display: 'block', textTransform: 'uppercase' }}>
                            Próxima Reserva Hoy ({nextUpcomingRes.timeSlot || 'Hoy'})
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0c4a6e' }}>
                            {nextUpcomingRes.customerName} ({nextUpcomingRes.guestCount} pax)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7' }}>
                            Estado: {nextUpcomingRes.status}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, mb: 1.5, border: '1px solid #dcfce7' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a', display: 'block' }}>
                            Sin reservas pendientes hoy
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>
                            Mesa libre para asignar a comensales sin reserva previa (Walk-in)
                          </Typography>
                        </Box>
                      )}

                      {/* Day Agenda Timeline for this table */}
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.8 }}>
                        Cronograma Hoy ({tableReservationsToday.length} agendadas):
                      </Typography>
                      {tableReservationsToday.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                          Disponible toda la jornada.
                        </Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {tableReservationsToday.map(tr => (
                            <Box key={tr.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', py: 0.3, px: 0.8, bgcolor: '#f8fafc', borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {tr.timeSlot || '19:00'} - {tr.customerName}
                              </Typography>
                              <Chip
                                label={tr.status}
                                size="small"
                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    {/* Quick Button to allocate reservation */}
                    <Box sx={{ pt: 2, mt: 1, borderTop: '1px solid #f1f5f9' }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          handleOpenCreateModal();
                          setEditingReservation(prev => ({
                            ...prev,
                            tableId: tbl.id,
                            tableName: `Mesa ${tbl.number} (Salón)`,
                            guestCount: Math.min(prev?.guestCount || 2, tbl.capacity),
                          }));
                        }}
                        sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 700 }}
                      >
                        Agendar en Mesa {tbl.number}
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CELEBRACIONES & OCASIONES ESPECIALES             */}
      {/* ======================================================== */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Gestión de Ocasiones Especiales & Hospitalidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Alertas y protocolos de cocina y salón para cumpleaños, aniversarios, cenas corporativas y eventos familiares.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {celebrationReservations.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
                  <CelebrationIcon sx={{ fontSize: 56, color: '#f59e0b', mb: 1.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    No hay celebraciones especiales agendadas actualmente
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mt: 0.5 }}>
                    Cuando registres una reserva indicando Cumpleaños, Aniversario o Reunión de Negocios, aparecerá aquí con los protocolos de cortesía del chef.
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              celebrationReservations.map(res => {
                const occasionMeta = OCCASIONS.find(o => o.value === res.occasion);

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={res.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid #fef3c7',
                        bgcolor: '#fffdfa',
                        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.06)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: '#fef3c7', color: '#b45309', width: 44, height: 44 }}>
                            {occasionMeta?.emoji || '🎉'}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                              {res.customerName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>
                              {occasionMeta?.label}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          label={STATUS_CONFIG[res.status]?.label || res.status}
                          size="small"
                          sx={{
                            bgcolor: STATUS_CONFIG[res.status]?.bg,
                            color: STATUS_CONFIG[res.status]?.text,
                            fontWeight: 800,
                          }}
                        />
                      </Box>

                      <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #fed7aa', mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <StarsIcon fontSize="inherit" /> PROTOCOLO DE HOSPITALIDAD SUGERIDO:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#7c2d12', fontWeight: 600 }}>
                          {occasionMeta?.perk}
                        </Typography>
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Fecha & Hora:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {new Date(res.date).toLocaleDateString('es-CO')} - {res.timeSlot || '19:30'}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Mesa & Comensales:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {res.tableName || 'Salón'} ({res.guestCount} personas)
                          </Typography>
                        </Grid>
                      </Grid>

                      {res.specialRequests && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Petición especial del cliente:</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#334155' }}>
                            "{res.specialRequests}"
                          </Typography>
                        </Box>
                      )}

                      <Stack direction="row" spacing={1.5}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ChatIcon />}
                          onClick={() => handleOpenWhatsAppModal(res)}
                          sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
                        >
                          Felicitar & Confirmar (WhatsApp)
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEditModal(res)}
                          sx={{ borderColor: '#cbd5e1', color: '#334155' }}
                        >
                          Modificar
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })
            )}
          </Grid>
        </Box>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ANTICIPOS & GARANTÍAS DE RESERVA                 */}
      {/* ======================================================== */}
      {currentTab === 3 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Control de Anticipos & Fondos de Garantía
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registro y arqueo de los depósitos recibidos para reservas grupales o fechas de alta demanda gastronómica.
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha Reserva</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Teléfono</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Mesa</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Pax</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Monto Anticipo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Estado Reserva</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {depositReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay reservas con anticipo registrado en el sistema.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  depositReservations.map(res => (
                    <TableRow key={res.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {new Date(res.date).toLocaleDateString('es-CO')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {res.timeSlot || '19:00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {res.customerName}
                        </Typography>
                      </TableCell>
                      <TableCell>{res.customerPhone}</TableCell>
                      <TableCell align="center">
                        <Chip label={res.tableName || 'Salón'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${res.guestCount} pax`} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                          ${(res.depositAmount || 0).toLocaleString()} COP
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={STATUS_CONFIG[res.status]?.label || res.status}
                          size="small"
                          sx={{
                            bgcolor: STATUS_CONFIG[res.status]?.bg,
                            color: STATUS_CONFIG[res.status]?.text,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver / Editar Anticipo">
                          <IconButton size="small" onClick={() => handleOpenEditModal(res)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT RESERVATION MODAL                         */}
      {/* ======================================================== */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#ecfccb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65a30d' }}>
              <EventIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                {editingReservation?.id ? 'Modificar Reserva' : 'Registrar Nueva Reserva de Mesa'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sésamo Alimentos • Gestión de Hospitalidad
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setIsEditModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {editingReservation && (
            <Stack spacing={3}>
              {/* 1. Cliente & CRM */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#65a30d', mb: 1.5 }}>
                  1. Datos del Cliente & Contacto
                </Typography>
                <Grid container spacing={2}>
                  {customers.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Autocompletar con Cliente Frecuente (Directorio CRM)"
                        value={editingReservation.customerId || ''}
                        onChange={(e) => handleSelectCustomer(e.target.value)}
                        helperText="Selecciona un cliente del directorio para rellenar nombre, celular y preferencias"
                      >
                        <MenuItem value="">-- Ingreso Manual / Nuevo Cliente --</MenuItem>
                        {customers.map(c => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name} ({c.phone}) • {c.tier || 'Regular'} • {c.loyaltyPoints} pts
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Nombre Completo del Cliente"
                      value={editingReservation.customerName || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, customerName: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Teléfono Móvil (WhatsApp)"
                      placeholder="Ej: 3001234567"
                      value={editingReservation.customerPhone || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, customerPhone: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Correo Electrónico (Opcional)"
                      value={editingReservation.customerEmail || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, customerEmail: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Ocasión Especial / Celebración"
                      value={editingReservation.occasion || 'OTRO'}
                      onChange={(e) => setEditingReservation({ ...editingReservation, occasion: e.target.value as any })}
                    >
                      {OCCASIONS.map(o => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* 2. Horario, Pax & Mesa */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#65a30d', mb: 1.5 }}>
                  2. Fecha, Horario & Asignación de Mesa en Salón
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Fecha de la Reserva"
                      value={new Date(editingReservation.date || Date.now()).toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const parsed = new Date(e.target.value);
                        setEditingReservation({ ...editingReservation, date: parsed.getTime() });
                      }}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Franja Horaria"
                      value={editingReservation.timeSlot || '19:30'}
                      onChange={(e) => setEditingReservation({ ...editingReservation, timeSlot: e.target.value })}
                    >
                      {TIME_SLOTS.map(t => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Número de Comensales (Pax)"
                      value={editingReservation.guestCount ?? 2}
                      onChange={(e) => setEditingReservation({ ...editingReservation, guestCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Mesa en Salón Comedor"
                      value={editingReservation.tableId || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, tableId: e.target.value })}
                      helperText="Selecciona la mesa física para bloquearla en el salón"
                    >
                      {tables.map(t => (
                        <MenuItem key={t.id} value={t.id}>
                          Mesa {t.number} ({t.capacity} puestos) — Estado actual: {t.status}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Estado Inicial de la Reserva"
                      value={editingReservation.status || 'CONFIRMADA'}
                      onChange={(e) => setEditingReservation({ ...editingReservation, status: e.target.value as any })}
                    >
                      <MenuItem value="CONFIRMADA">CONFIRMADA (Bloquea la mesa de inmediato)</MenuItem>
                      <MenuItem value="PENDIENTE">PENDIENTE (A la espera de confirmación del cliente)</MenuItem>
                      <MenuItem value="SENTADA">SENTADA (Comensales ya sentados en salón)</MenuItem>
                      <MenuItem value="COMPLETADA">COMPLETADA (Servicio finalizado)</MenuItem>
                      <MenuItem value="CANCELADA">CANCELADA</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* 3. Peticiones & Anticipo */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#65a30d', mb: 1.5 }}>
                  3. Peticiones Especiales, Anticipo & Notas Internas
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      label="Peticiones Especiales del Cliente"
                      placeholder="Ej: Silla de bebé, decoración, alérgico a frutos secos, ubicación ventana..."
                      value={editingReservation.specialRequests || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, specialRequests: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Anticipo / Garantía ($ COP)"
                      placeholder="0"
                      value={editingReservation.depositAmount ?? 0}
                      onChange={(e) => setEditingReservation({ ...editingReservation, depositAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                      helperText="Valor de garantía para grupos o reservas especiales"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Notas Internas de Servicio (Host / Capitán de Salón)"
                      placeholder="Ej: Cliente frecuente de la empresa Sura, preparar mesa amplia."
                      value={editingReservation.notes || ''}
                      onChange={(e) => setEditingReservation({ ...editingReservation, notes: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsEditModalOpen(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveReservation}
            sx={{ fontWeight: 800, px: 3, bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' } }}
          >
            Guardar Reserva
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* WHATSAPP CONFIRMATION PREVIEW DIALOG                     */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(whatsAppModalReservation)}
        onClose={() => setWhatsAppModalReservation(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <ChatIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Confirmación por WhatsApp
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mensaje personalizado listo para enviar a {whatsAppModalReservation?.customerName}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
            Destinatario: {whatsAppModalReservation?.customerPhone}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={customWhatsAppMsg}
            onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                bgcolor: '#f8fafc',
              }
            }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            startIcon={<CopyIcon />}
            onClick={handleCopyWhatsAppMsg}
            sx={{ color: '#475569', fontWeight: 600 }}
          >
            Copiar Texto
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setWhatsAppModalReservation(null)}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendWhatsAppNow}
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 800 }}
          >
            Abrir WhatsApp
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* FAST SEAT MODAL (CHOOSE OR CONFIRM TABLE)                */}
      {/* ======================================================== */}
      <Dialog
        open={seatTableSelectModal.open}
        onClose={() => setSeatTableSelectModal({ open: false, reservation: null })}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e290b' }}>
          Sentar Comensales en Salón
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirmar el asiento de <strong>{seatTableSelectModal.reservation?.customerName}</strong> ({seatTableSelectModal.reservation?.guestCount} personas).
            La mesa seleccionada pasará de inmediato a estado <strong>OCUPADA</strong> en el salón.
          </Typography>

          <TextField
            select
            fullWidth
            size="small"
            label="Mesa de Destino"
            value={seatTableSelectModal.reservation?.tableId || tables[0]?.id || ''}
            onChange={(e) => {
              const selectedTblId = e.target.value;
              const foundTbl = tables.find(t => t.id === selectedTblId);
              if (seatTableSelectModal.reservation) {
                setSeatTableSelectModal({
                  ...seatTableSelectModal,
                  reservation: {
                    ...seatTableSelectModal.reservation,
                    tableId: selectedTblId,
                    tableName: foundTbl ? `Mesa ${foundTbl.number} (Salón)` : 'Salón',
                  }
                });
              }
            }}
          >
            {tables.map(t => (
              <MenuItem key={t.id} value={t.id}>
                Mesa {t.number} ({t.capacity} pax) — {t.status}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSeatTableSelectModal({ open: false, reservation: null })}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<ChairIcon />}
            onClick={() => seatTableSelectModal.reservation && handleSeatGuests(seatTableSelectModal.reservation, seatTableSelectModal.reservation.tableId)}
            sx={{ bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' }, fontWeight: 800 }}
          >
            Confirmar Asiento
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* DELETE CONFIRM DIALOG                                   */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(deleteConfirmReservation)}
        onClose={() => setDeleteConfirmReservation(null)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" /> ¿Eliminar Reserva?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            ¿Estás seguro de que deseas eliminar la reserva de <strong>{deleteConfirmReservation?.customerName}</strong>?
            La mesa asignada ({deleteConfirmReservation?.tableName || 'Salón'}) será liberada en tiempo real.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmReservation(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmReservation && handleDeleteReservation(deleteConfirmReservation)}
            sx={{ fontWeight: 700 }}
          >
            Eliminar Reserva
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR FEEDBACK */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
