import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Stack,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Store as StoreIcon,
  LocalAtm as TaxIcon,
  Print as PrintIcon,
  Storage as StorageIcon,
  Dns as DnsIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  LockClock as LockClockIcon,
  Shield as SecurityIcon
} from '@mui/icons-material';
import { mockApi, getApiUrl, setApiUrl } from '../services/mockApi';
import { StoreSettings } from '../types';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const isAdminOrManager = ['ADMINISTRADOR', 'GERENTE'].includes(user?.role || '');

  if (user && !isAdminOrManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const [formData, setFormData] = useState<StoreSettings>({
    storeName: '',
    nit: '',
    currency: 'COP',
    taxType: 'EXENTO',
    taxRate: 0,
    defaultTipPercentage: 10,
    address: '',
    phone: '',
    ticketFooter: '',
    autoPrintReceipt: false,
    logoUrl: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [dbHealth, setDbHealth] = useState<{
    connected: boolean;
    engine: string;
    latencyMs: number;
    lastCheck: Date | null;
  }>({
    connected: true,
    engine: 'PostgreSQL 18 (Prisma)',
    latencyMs: 35,
    lastCheck: null,
  });
  const [apiUrlInput, setApiUrlInput] = useState<string>(() => getApiUrl());
  const [apiUrlSaved, setApiUrlSaved] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    loadSettings();
    checkDatabaseHealth();
  }, []);

  const checkDatabaseHealth = async () => {
    try {
      setIsPinging(true);
      const t0 = performance.now();
      const stats = await mockApi.dashboard.getStats();
      const latency = Math.round(performance.now() - t0);
      if (stats && stats.connected) {
        setDbHealth({
          connected: true,
          engine: stats.engine || 'Neon PostgreSQL (Prisma)',
          latencyMs: latency,
          lastCheck: new Date(),
        });
      } else {
        setDbHealth({
          connected: false,
          engine: 'Modo Local / Desconectado',
          latencyMs: latency,
          lastCheck: new Date(),
        });
      }
    } catch (e) {
      setDbHealth({
        connected: false,
        engine: 'Modo Local / Desconectado',
        latencyMs: 0,
        lastCheck: new Date(),
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveApiUrl = () => {
    setApiUrl(apiUrlInput);
    setApiUrlSaved(true);
    setTimeout(() => setApiUrlSaved(false), 3000);
    checkDatabaseHealth();
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.settings.get();
      setFormData(data);
    } catch (e: any) {
      console.error('Error cargando configuración:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'taxType') {
        if (value === 'IMPOCONSUMO_8') updated.taxRate = 8;
        else if (value === 'IVA_19') updated.taxRate = 19;
        else updated.taxRate = 0;
      }
      return updated;
    });
  };

  const handleSwitchChange = (name: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [name]: e.target.checked }));
  };

  const handleSave = async () => {
    if (!isAdminOrManager) {
      setSaveError('Acceso denegado: solo Administradores y Gerentes pueden modificar la configuración.');
      return;
    }
    try {
      setSaveError(null);
      await mockApi.settings.update(formData);
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || 'Error al guardar la configuración.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Cargando configuración del sistema...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
              Configuración del Sistema & Restaurante
            </Typography>
            <Chip
              label={isAdminOrManager ? 'Modo Administración' : 'Solo Lectura'}
              size="small"
              color={isAdminOrManager ? 'success' : 'default'}
              sx={{ fontWeight: 800 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Configuración fiscal, datos de empresa, propinas, impuestos y preferencias de impresión térmica.
          </Typography>
        </Box>

        {isAdminOrManager && (
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{
              bgcolor: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              borderRadius: '12px',
              px: 3,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              '&:hover': { bgcolor: '#15803d' }
            }}
          >
            Guardar Cambios
          </Button>
        )}
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '14px' }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Card 1: Datos del Establecimiento */}
        <Paper sx={{ p: 3.5, borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: '12px', color: '#16a34a' }}>
              <StoreIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Datos de la Empresa / Establecimiento
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Información visible en facturas, tickets de comanda y menú digital para clientes.
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Nombre Comercial del Restaurante"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                slotProps={{ input: { sx: { borderRadius: '12px', fontWeight: 700 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="NIT o Documento Fiscal"
                name="nit"
                value={formData.nit}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                placeholder="Ej: 901.458.732-1"
                slotProps={{ input: { sx: { borderRadius: '12px', fontWeight: 700 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                fullWidth
                label="Dirección Principal"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="Teléfono de Contacto"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Card 2: Régimen Fiscal, Impuestos & Propinas */}
        <Paper sx={{ p: 3.5, borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}>
              <TaxIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Régimen Fiscal, Impuestos & Propinas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ajustes tributarios aplicados en el POS al momento del cobro y liquidación.
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Régimen de Impuesto"
                name="taxType"
                value={formData.taxType}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                slotProps={{ input: { sx: { borderRadius: '12px', fontWeight: 700 } } }}
              >
                <MenuItem value="EXENTO">Exento / Sin Impuesto (0%)</MenuItem>
                <MenuItem value="IMPOCONSUMO_8">Impuesto al Consumo (8%) - Gastronomía Colombia</MenuItem>
                <MenuItem value="IVA_19">IVA General (19%)</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Tasa Aplicada de Impuesto"
                name="taxRate"
                type="number"
                value={formData.taxRate}
                disabled
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    sx: { borderRadius: '12px', fontWeight: 800, bgcolor: '#f8fafc' }
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Propina Voluntaria Sugerida"
                name="defaultTipPercentage"
                type="number"
                value={formData.defaultTipPercentage}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                helperText="Porcentaje estándar sugerido en pre-cuenta (por ley voluntario)"
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    sx: { borderRadius: '12px', fontWeight: 800 }
                  }
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Card 3: Formato de Factura & Tickets Térmicos */}
        <Paper sx={{ p: 3.5, borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
              <PrintIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Impresión Térmica & Mensajes de Ticket
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configuración del formato de tirilla para comandas de cocina y pre-cuentas de comensales.
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Mensaje al Pie del Ticket"
                name="ticketFooter"
                value={formData.ticketFooter}
                onChange={handleChange}
                disabled={!isAdminOrManager}
                placeholder="Ej: ¡Gracias por su visita! Propina voluntaria. Régimen Simple de Tributación."
                slotProps={{ input: { sx: { borderRadius: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.autoPrintReceipt}
                      onChange={handleSwitchChange('autoPrintReceipt')}
                      disabled={!isAdminOrManager}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                        Impresión automática al cobrar
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lanza la ventana de impresión térmica inmediatamente después de liquidar una orden en POS.
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Card 4: Infraestructura & Base de Datos en Vivo */}
        <Paper sx={{ p: 3.5, borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: '12px', color: '#16a34a' }}>
                <StorageIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                  Infraestructura & Motor de Base de Datos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Telemetría de conexión y estado del motor relacional en tiempo real.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ animation: isPinging ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />}
              onClick={checkDatabaseHealth}
              disabled={isPinging}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              {isPinging ? 'Comprobando...' : 'Probar Conexión'}
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2, bgcolor: dbHealth.connected ? '#f0fdf4' : '#fefce8', borderRadius: '14px', border: '1px solid', borderColor: dbHealth.connected ? '#bbf7d0' : '#fef08a' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: dbHealth.connected ? '#15803d' : '#854d0e', textTransform: 'uppercase' }}>
                  Estado del Servidor
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <DotIcon sx={{ fontSize: 14, color: dbHealth.connected ? '#16a34a' : '#ca8a04' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: dbHealth.connected ? '#15803d' : '#854d0e' }}>
                    {dbHealth.connected ? 'En Vivo (Online)' : 'Modo Contingencia'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {dbHealth.connected ? 'Backend NestJS :3001 activo' : 'Trabajando sin servidor'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Motor de Base de Datos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <DnsIcon sx={{ fontSize: 18, color: '#0284c7' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                    {dbHealth.engine}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  PostgreSQL Puerto 5433 (TCP)
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Latencia de Consulta
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <SpeedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#16a34a' }}>
                    {dbHealth.latencyMs} ms
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {dbHealth.latencyMs < 100 ? 'Velocidad ultra rápida' : 'Velocidad normal'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Capa de Persistencia
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#9333ea' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e290b' }}>
                    Prisma ORM Client
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Transacciones ACID verificadas
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Configuración de Endpoint Backend Cloud */}
          <Box sx={{ mt: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                🌐 URL del Backend en la Nube (Render / Vercel)
              </Typography>
              {apiUrlSaved && (
                <Chip label="¡URL guardada con éxito!" size="small" color="success" sx={{ fontWeight: 700 }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Ingresa aquí la URL de tu backend desplegado en Render (por ejemplo: <code>https://tu-servicio.onrender.com/api</code>). Si cambias la URL o estás en un dispositivo nuevo, puedes guardarla aquí directamente para sincronizar con la base de datos en Neon.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                size="small"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="https://tu-servicio-render.onrender.com/api"
                sx={{ flex: 1, minWidth: 260, bgcolor: '#ffffff' }}
                slotProps={{ input: { sx: { borderRadius: '10px' } } }}
              />
              <Button
                variant="contained"
                onClick={handleSaveApiUrl}
                disabled={isPinging}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 800,
                  bgcolor: 'primary.main',
                  px: 3,
                }}
              >
                {isPinging ? 'Comprobando...' : 'Guardar & Conectar'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Card 5: Seguridad y Control de Sesión */}
        <Paper sx={{ p: 3.5, borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: '12px', color: '#2563eb' }}>
              <SecurityIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
                Seguridad de Acceso & Cierre por Inactividad
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Protocolo automático de protección para terminales de caja, salón y cocina.
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockClockIcon sx={{ color: '#d97706', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      Cierre Automático por Inactividad
                    </Typography>
                  </Box>
                  <Chip label="20 Minutos" size="small" color="primary" sx={{ fontWeight: 800, height: 24 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  Si el terminal no registra interacción humana (movimiento de cursor, toques en pantalla táctil o pulsaciones de teclado) durante más de 20 minutos consecutivos, el sistema cerrará la sesión de forma inmediata y segura.
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#15803d' }}>
                    Alerta Visual Previa
                  </Typography>
                  <Chip label="60s de Gracia" size="small" color="success" sx={{ fontWeight: 800, height: 24 }} />
                </Box>
                <Typography variant="body2" color="#166534" sx={{ fontSize: '0.85rem' }}>
                  Se despliega un diálogo emergente con temporizador regresivo de 60 segundos antes de cerrar la sesión, permitiendo a los operadores reanudar su turno con un simple toque o tecla.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Stack>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={4000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 700 }}>
          ¡Configuración guardada exitosamente!
        </Alert>
      </Snackbar>
    </Box>
  );
}
