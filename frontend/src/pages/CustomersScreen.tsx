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
  Avatar,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  WorkspacePremium as PremiumIcon,
  FileDownload as DownloadIcon,
  Visibility as VisibilityIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  DoneAll as DoneAllIcon,
  SkipNext as SkipNextIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Customer, Order } from '../types';


const ALLERGEN_OPTIONS = [
  'Gluten',
  'Lácteos',
  'Huevo',
  'Frutos Secos',
  'Mariscos',
  'Soja',
  'Sésamo',
  'Mostaza'
];

const BROADCAST_PRESETS = [
  {
    id: 'promo',
    label: '🎁 Promo Especial',
    text: '¡Hola {nombre}! 🌿 En Restaurante Sésamo tenemos una promoción especial para ti: 2x1 en postres artesanales o bebidas de la casa con tu plato fuerte. ¡Te esperamos hoy!',
  },
  {
    id: 'menu',
    label: '✨ Novedades de Carta',
    text: '¡Hola {nombre}! ✨ Ven a descubrir los nuevos platillos de nuestra carta en Restaurante Sésamo. Ingredientes frescos, recetas únicas y el mejor ambiente. ¡Haz tu reserva respondiendo a este mensaje!',
  },
  {
    id: 'miss_you',
    label: '💚 Te Extrañamos',
    text: '¡Hola {nombre}! En Restaurante Sésamo te extrañamos mucho. Queremos verte de nuevo, así que en tu próxima visita la bebida de la casa corre por nuestra cuenta. ¡Te esperamos!',
  },
  {
    id: 'daily',
    label: '🍽️ Almuerzo / Menú del Día',
    text: '¡Hola {nombre}! 🍽️ Ya está listo el menú de hoy en Sésamo: fresco, saludable y preparado al momento. ¿Te apartamos mesa o prefieres que te lo llevemos a domicilio?',
  },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs (0: Directorio General, 1: Segmentación RFM, 2: Facturación DIAN)
  const [mainTab, setMainTab] = useState(0);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'FREQUENT' | 'DIAN'>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('TOTAL_SPENT');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);

  // WhatsApp Broadcast Campaign State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastAudience, setBroadcastAudience] = useState<'ALL' | 'FREQUENT' | 'AT_RISK'>('ALL');
  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    '¡Hola {nombre}! 🌿 En Restaurante Sésamo tenemos una promoción especial para ti: 2x1 en postres artesanales o bebidas de la casa con tu plato fuerte. ¡Te esperamos hoy!'
  );
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, boolean>>({});
  const [activeDispatchIndex, setActiveDispatchIndex] = useState<number>(0);

  // Feedback Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [custList, ordList] = await Promise.all([
        mockApi.customers.getAll(),
        mockApi.orders.getAll(),
      ]);
      setCustomers(custList || []);
      setOrders(ordList || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const handleUpdate = () => loadData(false);
    window.addEventListener('sesamo_customers_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_customers_updated', handleUpdate);
    };
  }, []);

  // Aggregated KPIs
  const kpis = useMemo(() => {
    const totalCount = customers.length;
    let totalSpentAccum = 0;
    let frequentCount = 0;
    let totalOrdersAccum = 0;

    customers.forEach(c => {
      totalSpentAccum += c.totalSpent || 0;
      totalOrdersAccum += c.totalOrders || 0;
      if ((c.totalOrders || 0) >= 2) {
        frequentCount++;
      }
    });

    const avgTicket = totalOrdersAccum > 0 ? Math.round(totalSpentAccum / totalOrdersAccum) : 0;

    return {
      totalCount,
      totalSpentAccum,
      frequentCount,
      avgTicket,
    };
  }, [customers]);

  // Segmentación RFM (Recencia, Frecuencia, Valor)
  const rfmSegments = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 86400000 * 30;

    const vipCustomers = customers.filter(c => (c.totalSpent || 0) >= 300000 || (c.totalOrders || 0) >= 6);
    const frequentCustomers = customers.filter(c => (c.totalOrders || 0) >= 3);
    const newCustomers = customers.filter(c => !c.createdAt || c.createdAt >= (now - 86400000 * 45));
    const inactiveAtRisk = customers.filter(c => c.lastVisit && c.lastVisit < thirtyDaysAgo);

    return {
      vip: vipCustomers,
      frequent: frequentCustomers,
      newcomers: newCustomers,
      atRisk: inactiveAtRisk
    };
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const query = searchTerm.toLowerCase().trim();
        const matchesQuery =
          !query ||
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.documentId && c.documentId.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.city && c.city.toLowerCase().includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        if (customerFilter === 'FREQUENT' && (c.totalOrders || 0) < 2) {
          return false;
        }
        if (customerFilter === 'DIAN' && !c.documentId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'TOTAL_SPENT') {
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        }
        if (selectedSort === 'ORDERS') {
          return (b.totalOrders || 0) - (a.totalOrders || 0);
        }
        if (selectedSort === 'NAME') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [customers, searchTerm, customerFilter, selectedSort]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer({
      name: '',
      documentId: '',
      documentType: 'CC',
      phone: '',
      email: '',
      address: '',
      city: 'Medellín',
      zone: 'Laureles',
      totalOrders: 0,
      totalSpent: 0,
      averageTicket: 0,
      tier: 'BRONCE',
      preferences: '',
      allergies: [],
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(JSON.parse(JSON.stringify(customer)));
    setIsEditModalOpen(true);
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async () => {
    if (!editingCustomer || !editingCustomer.name?.trim()) {
      setSnackbar({ open: true, message: 'El nombre del cliente es obligatorio.', severity: 'error' });
      return;
    }
    if (!editingCustomer.phone?.trim()) {
      setSnackbar({ open: true, message: 'El número de teléfono es obligatorio.', severity: 'error' });
      return;
    }

    try {
      if (editingCustomer.id) {
        await mockApi.customers.update(editingCustomer.id, editingCustomer);
        setSnackbar({ open: true, message: `Cliente ${editingCustomer.name} actualizado.`, severity: 'success' });
      } else {
        await mockApi.customers.create(editingCustomer as Omit<Customer, 'id'>);
        setSnackbar({ open: true, message: `Nuevo cliente ${editingCustomer.name} registrado con éxito.`, severity: 'success' });
      }
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al guardar el cliente.', severity: 'error' });
    }
  };

  // Open Profile Modal
  const handleOpenProfileModal = (customer: Customer) => {
    setProfileCustomer(customer);
    setIsProfileModalOpen(true);
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      await mockApi.customers.delete(customer.id);
      setDeleteConfirmCustomer(null);
      if (profileCustomer && profileCustomer.id === customer.id) {
        setIsProfileModalOpen(false);
      }
      setSnackbar({ open: true, message: 'Cliente eliminado del directorio.', severity: 'info' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar el cliente.', severity: 'error' });
    }
  };

  // Toggle Allergen in editing form
  const toggleAllergen = (allergen: string) => {
    if (!editingCustomer) return;
    const current = editingCustomer.allergies || [];
    if (current.includes(allergen)) {
      setEditingCustomer({ ...editingCustomer, allergies: current.filter(a => a !== allergen) });
    } else {
      setEditingCustomer({ ...editingCustomer, allergies: [...current, allergen] });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'ID,Nombre,TipoDoc,Documento,Telefono,Email,Ciudad,Direccion,Zona,TotalPedidos,TotalGastado\n';
    const rows = filteredCustomers
      .map(c => `"${c.id}","${c.name}","${c.documentType || 'CC'}","${c.documentId || ''}","${c.phone}","${c.email || ''}","${c.city || ''}","${c.address || ''}","${c.zone || ''}",${c.totalOrders || 0},${c.totalSpent || 0}`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Directorio_Clientes_Sesamo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSnackbar({ open: true, message: 'Directorio de clientes exportado a CSV exitosamente.', severity: 'success' });
  };

  // Open WhatsApp Link con plantilla personalizada
  const openWhatsApp = (phone: string, customerName: string, customMessage?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const defaultMsg = `¡Hola ${customerName}! Te saludamos del Restaurante Sésamo Alimentos. ¿En qué podemos deleitarte hoy?`;
    const text = encodeURIComponent(customMessage || defaultMsg);
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // Clientes con teléfono válido para la campaña de difusión
  const broadcastRecipients = useMemo(() => {
    let list = customers.filter(c => c.phone && c.phone.replace(/[^0-9]/g, '').length >= 7);
    if (broadcastAudience === 'FREQUENT') {
      list = list.filter(c => (c.totalOrders || 0) >= 2);
    } else if (broadcastAudience === 'AT_RISK') {
      list = rfmSegments.atRisk.filter(c => c.phone && c.phone.replace(/[^0-9]/g, '').length >= 7);
    }
    return list;
  }, [customers, broadcastAudience, rfmSegments]);

  const sentCount = useMemo(() => {
    return broadcastRecipients.filter(c => sentCustomerIds[c.id]).length;
  }, [broadcastRecipients, sentCustomerIds]);

  const formatBroadcastText = (template: string, customer: Customer) => {
    const firstName = customer.name?.trim().split(' ')[0] || customer.name || 'comensal';
    return template
      .replace(/{nombre}/gi, firstName)
      .replace(/{nombre_completo}/gi, customer.name || '')
      .replace(/{restaurante}/gi, 'Restaurante Sésamo');
  };

  const handleSendToCustomer = (customer: Customer) => {
    const text = formatBroadcastText(broadcastMessage, customer);
    openWhatsApp(customer.phone, customer.name, text);
    setSentCustomerIds(prev => ({ ...prev, [customer.id]: true }));
  };

  const handleSendCurrentAndNext = () => {
    if (broadcastRecipients.length === 0) return;
    const current = broadcastRecipients[activeDispatchIndex];
    if (current) {
      handleSendToCustomer(current);
      if (activeDispatchIndex + 1 < broadcastRecipients.length) {
        setActiveDispatchIndex(prev => prev + 1);
      }
    }
  };

  const handleSkipNext = () => {
    if (activeDispatchIndex + 1 < broadcastRecipients.length) {
      setActiveDispatchIndex(prev => prev + 1);
    }
  };

  const handleSendAllBatch = () => {
    if (broadcastRecipients.length === 0) return;
    broadcastRecipients.forEach((c, idx) => {
      setTimeout(() => {
        const text = formatBroadcastText(broadcastMessage, c);
        openWhatsApp(c.phone, c.name, text);
        setSentCustomerIds(prev => ({ ...prev, [c.id]: true }));
      }, idx * 600);
    });
    setSnackbar({
      open: true,
      message: `Abriendo WhatsApp para ${broadcastRecipients.length} comensales. Si alguna pestaña no abre, habilita las ventanas emergentes en tu navegador.`,
      severity: 'info',
    });
  };

  // Órdenes asociadas a un cliente en el modal 360
  const customerRecentOrders = useMemo(() => {
    if (!profileCustomer) return [];
    return orders.filter(o =>
      o.customerId === profileCustomer.id ||
      o.customerName === profileCustomer.name ||
      (o as any).customer?.id === profileCustomer.id ||
      (o as any).customer?.name === profileCustomer.name
    );
  }, [profileCustomer, orders]);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Cargando Directorio de Clientes & CRM...</Typography>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. HEADER PRINCIPAL & ACCIONES */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', lg: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: '#1e290b',
                color: '#84cc16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(30, 41, 11, 0.2)',
                flexShrink: 0,
              }}
            >
              <PeopleIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                  Directorio de Clientes & CRM
                </Typography>
                <Chip
                  label="Directorio • Facturación DIAN • WhatsApp Directo"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    bgcolor: 'rgba(132, 204, 22, 0.15)',
                    color: '#4d7c0f',
                    borderRadius: 2,
                    border: '1px solid #bef264',
                    height: 24,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Base de datos unificada de comensales, historial de consumo LTV, alérgenos y datos fiscales para facturación electrónica DIAN.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
            onClick={handleExportCSV}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              color: '#475569',
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              px: 1.8,
              py: 0.9,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
            }}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={() => loadData(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              color: '#475569',
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              px: 1.8,
              py: 0.9,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
            }}
          >
            Sincronizar
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<WhatsAppIcon sx={{ fontSize: 18 }} />}
            onClick={() => {
              setActiveDispatchIndex(0);
              setIsBroadcastModalOpen(true);
            }}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              textTransform: 'none',
              bgcolor: '#16a34a',
              color: '#ffffff',
              px: 2,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              '&:hover': { bgcolor: '#15803d', boxShadow: '0 6px 18px rgba(22, 163, 74, 0.45)' },
            }}
          >
            Enviar WhatsApp Masivo
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
            onClick={handleOpenCreateModal}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              textTransform: 'none',
              bgcolor: '#65a30d',
              color: '#ffffff',
              px: 2.2,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(101, 163, 13, 0.35)',
              '&:hover': { bgcolor: '#4d7c0f', boxShadow: '0 6px 18px rgba(101, 163, 13, 0.45)' },
            }}
          >
            Nuevo Cliente
          </Button>
        </Box>
      </Box>

      {/* 2. TOP KPI CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* KPI 1: Clientes Totales */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#f1f5f9', color: '#1e290b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Clientes Totales
                  </Typography>
                </Box>
                <Chip label="DIRECTORIO" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5, letterSpacing: -0.5 }}>
                {kpis.totalCount}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Registrados en el sistema Sésamo
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Clientes Frecuentes */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#fcd34d', transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(217, 119, 6, 0.08)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PremiumIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Clientes Frecuentes
                  </Typography>
                </Box>
                <Chip label="RECURRENTES" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 900, bgcolor: '#fef3c7', color: '#92400e' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#d97706', mb: 0.5, letterSpacing: -0.5 }}>
                {kpis.frequentCount}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Comensales con 2 o más pedidos
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 3: Venta Clientes (LTV) */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#86efac', transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(22, 163, 74, 0.08)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Venta Clientes (LTV)
                  </Typography>
                </Box>
                <Chip label="HISTÓRICO" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', mb: 0.5, letterSpacing: -0.5 }}>
                ${kpis.totalSpentAccum.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Consumo acumulado por comensales
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 4: Ticket Promedio */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#7dd3fc', transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(2, 132, 199, 0.08)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Ticket Promedio
                  </Typography>
                </Box>
                <Chip label="POR VISITA" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0284c7' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7', mb: 0.5, letterSpacing: -0.5 }}>
                ${kpis.avgTicket.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Gasto promedio en cada visita u orden
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. PESTAÑAS PRINCIPALES DEL CRM */}
      <Box sx={{ borderBottom: 1, borderColor: '#e2e8f0', mb: 3 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.95rem',
              textTransform: 'none',
              minWidth: 160,
              color: '#64748b',
              '&.Mui-selected': { color: '#1e290b' }
            },
            '& .MuiTabs-indicator': { bgcolor: '#84cc16', height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab label={`👥 Directorio General (${customers.length})`} />
          <Tab label="📊 Segmentación RFM & Retención" />
          <Tab label="🧾 Facturación Electrónica DIAN" />
        </Tabs>
      </Box>

      {/* TAB 0: DIRECTORIO GENERAL DE CLIENTES */}
      {mainTab === 0 && (
        <>
          {/* BARRA DE HERRAMIENTAS Y FILTROS */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: '18px', bgcolor: '#ffffff' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 4.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre, teléfono, cédula/NIT, email, barrio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontWeight: 600 }
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filtrar por"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value as any)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="ALL">Todos los Clientes</MenuItem>
                  <MenuItem value="FREQUENT">👥 Clientes Frecuentes (2+)</MenuItem>
                  <MenuItem value="DIAN">🧾 Con Facturación DIAN</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Ordenar por"
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="TOTAL_SPENT">Mayor Consumo Histórico (LTV)</MenuItem>
                  <MenuItem value="ORDERS">Más Pedidos Realizados</MenuItem>
                  <MenuItem value="NAME">Nombre (A - Z)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.5 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Paper elevation={0} sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '12px', p: 0.3, bgcolor: '#f8fafc' }}>
                  <Tooltip title="Vista Tarjetas de Cliente">
                    <Button
                      size="small"
                      onClick={() => setViewMode('CARDS')}
                      sx={{
                        minWidth: 42,
                        borderRadius: '9px',
                        bgcolor: viewMode === 'CARDS' ? '#1e290b' : 'transparent',
                        color: viewMode === 'CARDS' ? '#ffffff' : '#64748b'
                      }}
                    >
                      <GridViewIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Vista Tabla Completa">
                    <Button
                      size="small"
                      onClick={() => setViewMode('TABLE')}
                      sx={{
                        minWidth: 42,
                        borderRadius: '9px',
                        bgcolor: viewMode === 'TABLE' ? '#1e290b' : 'transparent',
                        color: viewMode === 'TABLE' ? '#ffffff' : '#64748b'
                      }}
                    >
                      <TableViewIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          {/* VISTA 1: TARJETAS DE CLIENTE (CARDS) */}
          {viewMode === 'CARDS' ? (
            <Grid container spacing={2.5}>
              {filteredCustomers.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '20px', border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
                    <PeopleIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155' }}>
                      No se encontraron clientes registrados
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mx: 'auto', mt: 0.5 }}>
                      Intenta con otro término de búsqueda o registra un nuevo cliente en el directorio.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                filteredCustomers.map(customer => {
                  return (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={customer.id}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '20px',
                          border: '1px solid #e2e8f0',
                          bgcolor: '#ffffff',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 10px 24px rgba(0,0,0,0.07)',
                            borderColor: '#cbd5e1'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, flex: 1 }}>
                          {/* Cabecera del Cliente */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  bgcolor: '#1e290b',
                                  color: '#84cc16',
                                  fontWeight: 900,
                                  width: 46,
                                  height: 46,
                                  fontSize: '1.1rem',
                                  boxShadow: '0 4px 10px rgba(30, 41, 11, 0.25)',
                                }}
                              >
                                {customer.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
                                  {customer.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                  {customer.documentType || 'CC'} {customer.documentId || 'Sin documento'}
                                </Typography>
                              </Box>
                            </Box>

                            <Chip
                              label={`${customer.totalOrders || 0} pedidos`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            />
                          </Box>

                          {/* Contacto & Ubicación */}
                          <Stack spacing={0.6} sx={{ mb: 2, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon sx={{ fontSize: 15, color: '#64748b' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                                {customer.phone}
                              </Typography>
                            </Box>
                            {customer.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmailIcon sx={{ fontSize: 15, color: '#64748b' }} />
                                <Typography variant="caption" sx={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                  {customer.email}
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <HomeIcon sx={{ fontSize: 15, color: '#64748b' }} />
                              <Typography variant="caption" sx={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {customer.address || 'Sin dirección registrada'} {customer.zone ? `(${customer.zone})` : ''}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Resumen Financiero */}
                          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', fontSize: '0.65rem' }}>
                                Consumo LTV:
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                                ${(customer.totalSpent || 0).toLocaleString()}
                              </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', fontSize: '0.65rem' }}>
                                Pedidos:
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                                {customer.totalOrders || 0} visitas
                              </Typography>
                            </Box>
                          </Box>

                          {/* Preferencias o Alérgenos */}
                          {customer.allergies && customer.allergies.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                              {customer.allergies.map(a => (
                                <Chip key={a} label={`⚠️ ${a}`} size="small" sx={{ fontSize: '0.62rem', height: 20, bgcolor: '#fef2f2', color: '#991b1b', fontWeight: 800 }} />
                              ))}
                            </Box>
                          )}
                          {customer.preferences && (
                            <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', fontSize: '0.72rem' }}>
                              &quot;{customer.preferences}&quot;
                            </Typography>
                          )}
                        </CardContent>

                        {/* Barra de Acciones Directas */}
                        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between', borderTop: '1px solid #f8fafc' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<WhatsAppIcon sx={{ fontSize: 15, color: '#16a34a' }} />}
                            onClick={() => openWhatsApp(customer.phone, customer.name)}
                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', borderColor: '#bbf7d0', color: '#15803d', bgcolor: '#f0fdf4' }}
                          >
                            WhatsApp
                          </Button>

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Ficha 360° del Cliente">
                              <IconButton size="small" onClick={() => handleOpenProfileModal(customer)} sx={{ color: '#475569' }}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar Datos">
                              <IconButton size="small" onClick={() => handleOpenEditModal(customer)} color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar Cliente">
                              <IconButton size="small" onClick={() => setDeleteConfirmCustomer(customer)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          ) : (
            /* VISTA 2: TABLA DETALLADA */
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '18px', overflowX: 'auto', maxWidth: '100%' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Documento Fiscal</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Contacto</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Ubicación</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Pedidos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Consumo LTV</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers.map(customer => {
                    return (
                      <TableRow key={customer.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900, width: 38, height: 38, fontSize: '0.9rem' }}>
                              {customer.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                                {customer.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {customer.totalOrders || 0} visitas registradas
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                            {customer.documentType || 'CC'} {customer.documentId || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                            {customer.phone}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {customer.email || 'Sin correo'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem' }}>
                            {customer.address || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {customer.city || 'Medellín'} {customer.zone ? `• ${customer.zone}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${customer.totalOrders || 0} pedidos`}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569', borderRadius: '8px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                            ${(customer.totalSpent || 0).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Ticket: ${(customer.averageTicket || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title="Chat WhatsApp">
                              <IconButton size="small" onClick={() => openWhatsApp(customer.phone, customer.name)} sx={{ color: '#16a34a' }}>
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ficha 360°">
                              <IconButton size="small" onClick={() => handleOpenProfileModal(customer)} sx={{ color: '#475569' }}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(customer)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => setDeleteConfirmCustomer(customer)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* TAB 1: SEGMENTACIÓN RFM & RETENCIÓN */}
      {mainTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Segmentación Inteligente & Retención de Comensales
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Agrupa a los clientes según su recencia de visita, frecuencia de pedido y valor económico para campañas directas por WhatsApp.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {/* Clientes VIP Embajadores */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', display: 'flex', alignItems: 'center', gap: 1 }}>
                    👑 Clientes VIP & Embajadores ({rfmSegments.vip.length})
                  </Typography>
                  <Chip label="Mayor Gasto y Fidelidad" size="small" sx={{ fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 2 }}>
                  Comensales que generan el mayor flujo de caja del restaurante. Merecen atención de mesa prioritaria y trato del chef.
                </Typography>

                <Stack spacing={1}>
                  {rfmSegments.vip.slice(0, 4).map(c => (
                    <Box key={c.id} sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>{c.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{c.phone} • {c.totalOrders || 0} visitas</Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                        onClick={() => openWhatsApp(c.phone, c.name, `¡Hola ${c.name}! Como cliente VIP de Sésamo, queríamos saludarte y recordarte que tenemos tu mesa favorita lista para este fin de semana.`)}
                        sx={{ borderRadius: '8px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'none', color: '#15803d', bgcolor: '#f0fdf4' }}
                      >
                        Saludar
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Clientes en Riesgo de Fuga */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #fca5a5', bgcolor: '#fff5f5' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚠️ Clientes en Riesgo (&gt;30 días sin visita) ({rfmSegments.atRisk.length})
                  </Typography>
                  <Chip label="Campaña de Reactivación" size="small" sx={{ fontWeight: 800, bgcolor: '#fee2e2', color: '#991b1b' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 2 }}>
                  Clientes que eran habituales pero llevan más de un mes sin ordenar o visitar el local.
                </Typography>

                <Stack spacing={1}>
                  {rfmSegments.atRisk.slice(0, 4).map(c => (
                    <Box key={c.id} sx={{ p: 1.2, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>{c.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                          Consumo acumulado: ${(c.totalSpent || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                        onClick={() => openWhatsApp(c.phone, c.name, `¡Hola ${c.name}! Te extrañamos en el Restaurante Sésamo. ¡Queremos invitarte a probar nuestras novedades esta semana y te regalamos la bebida de la casa!`)}
                        sx={{ borderRadius: '8px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'none', bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                      >
                        Reactivar WhatsApp
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 2: FACTURACIÓN ELECTRÓNICA DIAN */}
      {mainTab === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Gestión Fiscal & Facturación Electrónica DIAN
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verifica que tus clientes corporativos y personas naturales tengan la información completa (NIT, Cédula, Razón Social, Correo de Facturación) para expedir factura electrónica instantánea desde caja o POS.
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '18px', overflowX: 'auto', maxWidth: '100%' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Razón Social / Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Tipo Doc.</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Número Identificación</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Correo Envío Factura DIAN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Ciudad / Domicilio Fiscal</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Estado Fiscal</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map(c => {
                  const isComplete = Boolean(c.documentId && c.email && c.address);
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#1e290b' }}>
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <Chip label={c.documentType || 'CC'} size="small" sx={{ fontWeight: 800 }} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                        {c.documentId || <span style={{ color: '#ef4444' }}>Pendiente</span>}
                      </TableCell>
                      <TableCell sx={{ color: '#475569' }}>
                        {c.email || <span style={{ color: '#ef4444' }}>Sin correo electrónico</span>}
                      </TableCell>
                      <TableCell sx={{ color: '#475569' }}>
                        {c.address ? `${c.address}, ${c.city || 'Medellín'}` : 'Sin dirección'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={isComplete ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <WarningIcon sx={{ fontSize: 13 }} />}
                          label={isComplete ? 'Habilitado DIAN' : 'Incompleto'}
                          size="small"
                          color={isComplete ? 'success' : 'warning'}
                          sx={{ fontWeight: 800, borderRadius: '8px' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleOpenEditModal(c)}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
                        >
                          Actualizar Datos
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

      {/* DIÁLOGO: CREAR / EDITAR CLIENTE */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#1e290b', color: '#84cc16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonAddIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                {editingCustomer?.id ? `Editar Cliente: ${editingCustomer.name}` : 'Registrar Nuevo Cliente'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Información de contacto, facturación electrónica y fidelización
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setIsEditModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {editingCustomer && (
            <Stack spacing={2.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                1. Información Personal & Fiscal (DIAN):
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    label="Nombre Completo / Razón Social"
                    value={editingCustomer.name || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Tipo de Documento"
                    value={editingCustomer.documentType || 'CC'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, documentType: e.target.value as any })}
                  >
                    <MenuItem value="CC">Cédula de Ciudadanía (CC)</MenuItem>
                    <MenuItem value="NIT">NIT (Empresa / Persona Jurídica)</MenuItem>
                    <MenuItem value="CE">Cédula de Extranjería (CE)</MenuItem>
                    <MenuItem value="PASAPORTE">Pasaporte</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Número de Identificación"
                    placeholder="Ej. 1020456789"
                    value={editingCustomer.documentId || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, documentId: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    label="Teléfono / WhatsApp"
                    placeholder="Ej. 300 123 4567"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="Correo Electrónico (Facturación & Novedades)"
                    placeholder="cliente@ejemplo.com"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dirección Completa de Domicilio"
                    placeholder="Calle 45 # 10-20, Apto 501"
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ciudad"
                    value={editingCustomer.city || 'Medellín'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Zona / Barrio"
                    placeholder="Ej. Laureles, Poblado"
                    value={editingCustomer.zone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, zone: e.target.value })}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', pt: 1 }}>
                2. Experiencia de Servicio en Salón & Alérgenos:
              </Typography>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 0.8 }}>
                  Alérgenos o Restricciones Médicas (Toca para seleccionar):
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {ALLERGEN_OPTIONS.map(allergen => {
                    const isSelected = (editingCustomer.allergies || []).includes(allergen);
                    return (
                      <Chip
                        key={allergen}
                        label={allergen}
                        clickable
                        onClick={() => toggleAllergen(allergen)}
                        color={isSelected ? 'error' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 800, borderRadius: '8px' }}
                      />
                    );
                  })}
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Platos o Bebidas Preferidas"
                    placeholder="Ej. Hamburguesa Trufada, Cerveza IPA, Término Medio..."
                    value={editingCustomer.preferences || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, preferences: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Notas para el Personal de Servicio"
                    placeholder="Ej. Prefiere mesa tranquila junto al ventanal, celebra aniversarios..."
                    value={editingCustomer.notes || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setIsEditModalOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCustomer}
            sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#1e290b', px: 3, '&:hover': { bgcolor: '#2d3e11' } }}
          >
            Guardar Cliente
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: FICHA 360° DEL CLIENTE */}
      <Dialog
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
            Perfil 360° del Comensal
          </Typography>
          <IconButton size="small" onClick={() => setIsProfileModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {profileCustomer && (
            <Stack spacing={2.5}>
              {/* Header Perfil */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900, fontSize: '1.4rem' }}>
                      {profileCustomer.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                        {profileCustomer.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
                        {profileCustomer.documentType || 'CC'} {profileCustomer.documentId || 'Sin identificación fiscal'}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label={`${profileCustomer.totalOrders || 0} Visitas`}
                    sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569', py: 1.5, px: 1, borderRadius: '12px' }}
                  />
                </Box>
              </Paper>

                {/* Métricas del Comensal */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Consumo Total LTV:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#16a34a' }}>
                        ${(profileCustomer.totalSpent || 0).toLocaleString()}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Total Visitas/Pedidos:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                        {profileCustomer.totalOrders || 0}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Ticket Promedio:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>
                        ${(profileCustomer.averageTicket || 0).toLocaleString()}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Preferencias y Alérgenos */}
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e290b', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Preferencias de Servicio & Mesa:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155', mb: 1 }}>
                    {profileCustomer.preferences || 'Sin preferencias registradas todavía.'}
                  </Typography>
                  {profileCustomer.notes && (
                    <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>
                      Nota especial: {profileCustomer.notes}
                    </Typography>
                  )}
                </Box>

                {/* Historial de Órdenes */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 1 }}>
                    Historial de Pedidos Recientes:
                  </Typography>
                  {customerRecentOrders.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '12px' }}>
                      <Typography variant="caption" color="text.secondary">
                        No hay pedidos recientes registrados en memoria para este cliente.
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack spacing={1}>
                      {customerRecentOrders.map(o => (
                        <Box key={o.id} sx={{ p: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              Orden #{o.orderNumber} ({o.type})
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {(o.items || []).map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                            ${(o.total || 0).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setIsProfileModalOpen(false)} sx={{ fontWeight: 700 }}>
            Cerrar Ficha
          </Button>
          {profileCustomer && (
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={() => openWhatsApp(profileCustomer.phone, profileCustomer.name)}
              sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            >
              Contactar por WhatsApp
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: CAMPAÑA DE MENSAJES MASIVOS WHATSAPP */}
      <Dialog
        open={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}>
                <WhatsAppIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#14532d', lineHeight: 1.2 }}>
                  Enviar Mensaje Masivo por WhatsApp
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>
                  Personaliza tu mensaje y contacta a tus clientes en un clic con plantillas dinámicas
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setIsBroadcastModalOpen(false)} size="small" sx={{ color: '#166534' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
          <Stack spacing={2.5}>
            {/* 1. SELECCIÓN DE AUDIENCIA */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                1. Selecciona a quién enviar el mensaje:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  clickable
                  onClick={() => { setBroadcastAudience('ALL'); setActiveDispatchIndex(0); }}
                  label={`👥 Todos los Clientes (${customers.filter(c => c.phone).length})`}
                  color={broadcastAudience === 'ALL' ? 'success' : 'default'}
                  variant={broadcastAudience === 'ALL' ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 800, borderRadius: '10px' }}
                />
                <Chip
                  clickable
                  onClick={() => { setBroadcastAudience('FREQUENT'); setActiveDispatchIndex(0); }}
                  label={`⭐ Clientes Frecuentes (${customers.filter(c => c.phone && (c.totalOrders || 0) >= 2).length})`}
                  color={broadcastAudience === 'FREQUENT' ? 'success' : 'default'}
                  variant={broadcastAudience === 'FREQUENT' ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 800, borderRadius: '10px' }}
                />
                <Chip
                  clickable
                  onClick={() => { setBroadcastAudience('AT_RISK'); setActiveDispatchIndex(0); }}
                  label={`⚠️ Clientes en Riesgo / Inactivos (${rfmSegments.atRisk.filter(c => c.phone).length})`}
                  color={broadcastAudience === 'AT_RISK' ? 'success' : 'default'}
                  variant={broadcastAudience === 'AT_RISK' ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 800, borderRadius: '10px' }}
                />
              </Box>
            </Box>

            {/* 2. PLANTILLAS RÁPIDAS */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                2. Plantillas rápidas (haz clic para cargar):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {BROADCAST_PRESETS.map(preset => (
                  <Button
                    key={preset.id}
                    size="small"
                    variant="outlined"
                    onClick={() => setBroadcastMessage(preset.text)}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      borderColor: '#cbd5e1',
                      color: '#334155',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* 3. EDITOR DEL MENSAJE */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  3. Redacta o modifica el mensaje:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Variables dinámicas:
                  </Typography>
                  <Chip
                    size="small"
                    label="{nombre}"
                    onClick={() => setBroadcastMessage(prev => prev + ' {nombre}')}
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}
                  />
                  <Chip
                    size="small"
                    label="{restaurante}"
                    onClick={() => setBroadcastMessage(prev => prev + ' {restaurante}')}
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e', cursor: 'pointer' }}
                  />
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Escribe el mensaje que recibirán tus clientes..."
                sx={{
                  bgcolor: '#ffffff',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                  },
                }}
              />
            </Box>

            {/* 4. VISTA PREVIA ESTILO WHATSAPP */}
            <Box sx={{ p: 2, bgcolor: '#efeae2', borderRadius: '16px', border: '1px solid #e2dcd2' }}>
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#54656f', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                Vista previa del cliente (WhatsApp en vivo):
              </Typography>
              <Box sx={{ maxWidth: '85%', bgcolor: '#dcf8c6', p: 1.5, borderRadius: '12px 12px 2px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', ml: 'auto', position: 'relative' }}>
                <Typography variant="body2" sx={{ color: '#111b21', whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>
                  {formatBroadcastText(broadcastMessage, broadcastRecipients[activeDispatchIndex] || { id: '0', name: 'Carlos Gómez', phone: '3001234567' } as any)}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#667781' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <DoneAllIcon sx={{ fontSize: 14, color: '#53bdeb' }} />
                </Box>
              </Box>
            </Box>

            {/* 5. PANEL DE CONTROL DE ENVÍO */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                    Progreso de Envío: {sentCount} de {broadcastRecipients.length} enviados
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {broadcastRecipients.length === 0
                      ? 'No hay clientes con teléfono en este grupo.'
                      : `Comensal actual: ${broadcastRecipients[activeDispatchIndex]?.name || 'Finalizado'}`}
                  </Typography>
                </Box>
                <Chip
                  label={`${Math.round((sentCount / (broadcastRecipients.length || 1)) * 100)}% Completado`}
                  size="small"
                  sx={{ fontWeight: 900, bgcolor: sentCount === broadcastRecipients.length && broadcastRecipients.length > 0 ? '#dcfce7' : '#e0f2fe', color: sentCount === broadcastRecipients.length && broadcastRecipients.length > 0 ? '#15803d' : '#0369a1' }}
                />
              </Box>

              <LinearProgress
                variant="determinate"
                value={Math.round((sentCount / (broadcastRecipients.length || 1)) * 100)}
                sx={{ height: 8, borderRadius: 4, mb: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
              />

              {broadcastRecipients.length > 0 && activeDispatchIndex < broadcastRecipients.length ? (
                <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: '14px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1e290b', color: '#84cc16', fontWeight: 900 }}>
                      {broadcastRecipients[activeDispatchIndex].name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                        {broadcastRecipients[activeDispatchIndex].name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                        📱 {broadcastRecipients[activeDispatchIndex].phone} • {broadcastRecipients[activeDispatchIndex].totalOrders || 0} visitas
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<SkipNextIcon />}
                      onClick={handleSkipNext}
                      sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                    >
                      Saltar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<WhatsAppIcon />}
                      onClick={handleSendCurrentAndNext}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 900,
                        bgcolor: '#16a34a',
                        px: 2.5,
                        '&:hover': { bgcolor: '#15803d' },
                      }}
                    >
                      Enviar a {broadcastRecipients[activeDispatchIndex].name.split(' ')[0]} 🚀
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                  ¡Has completado la lista de destinatarios o no hay más clientes pendientes!
                </Alert>
              )}
            </Paper>

            {/* 6. LISTA DETALLADA DE DESTINATARIOS */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                Destinatarios individuales ({broadcastRecipients.length}):
              </Typography>
              <Paper elevation={0} sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', p: 1, bgcolor: '#f8fafc' }}>
                <Stack spacing={0.8}>
                  {broadcastRecipients.map((c, idx) => {
                    const isSent = Boolean(sentCustomerIds[c.id]);
                    return (
                      <Box
                        key={c.id}
                        sx={{
                          p: 1.2,
                          bgcolor: idx === activeDispatchIndex ? '#f0fdf4' : '#ffffff',
                          border: '1px solid',
                          borderColor: idx === activeDispatchIndex ? '#86efac' : '#e2e8f0',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            ({c.phone})
                          </Typography>
                          {isSent && (
                            <Chip label="Enviado ✅" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }} />
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant={isSent ? 'outlined' : 'contained'}
                          color={isSent ? 'inherit' : 'success'}
                          startIcon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            setActiveDispatchIndex(idx);
                            handleSendToCustomer(c);
                          }}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', py: 0.4 }}
                        >
                          {isSent ? 'Reenviar' : 'Enviar'}
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setIsBroadcastModalOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cerrar
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={handleSendAllBatch}
              disabled={broadcastRecipients.length === 0}
              sx={{ borderRadius: '12px', fontWeight: 800, textTransform: 'none' }}
            >
              Abrir Todos en Pestañas
            </Button>
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={handleSendCurrentAndNext}
              disabled={broadcastRecipients.length === 0 || activeDispatchIndex >= broadcastRecipients.length}
              sx={{ borderRadius: '12px', fontWeight: 900, textTransform: 'none', bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            >
              Enviar Siguiente 🚀
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAR ELIMINACIÓN */}
      <Dialog
        open={Boolean(deleteConfirmCustomer)}
        onClose={() => setDeleteConfirmCustomer(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#dc2626' }}>
          ¿Eliminar Cliente?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Confirmas que deseas eliminar a <strong>{deleteConfirmCustomer?.name}</strong>? Se borrará su información de contacto e historial del directorio.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmCustomer(null)} sx={{ fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmCustomer && handleDeleteCustomer(deleteConfirmCustomer)}
            sx={{ borderRadius: '10px', fontWeight: 900 }}
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
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
