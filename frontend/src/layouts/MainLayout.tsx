import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Collapse,
  Chip,
  Button,
  Badge,
  Popover,
  Tooltip,
  Paper,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  MenuBook as MenuBookIcon,
  BarChart as BarChartIcon,
  ExpandLess,
  ExpandMore,
  Logout,
  Settings as SettingsIcon,
  LocalShipping as DeliveryIcon,
  ShoppingCart as PurchasesIcon,
  GetApp as InstallIcon,
  Notifications as NotificationsIcon,
  WarningAmber as WarningAmberIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ShoppingCartCheckout as OrderMoreIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { mockApi } from '../services/mockApi';
import { InventoryItem } from '../types';

const drawerWidth = 260;

const fullMenuItems = [
  { text: '1. Dashboard Principal', icon: <DashboardIcon />, path: '/dashboard' },
  { text: '2. Caja y Apertura de Turno', icon: <ReceiptIcon />, path: '/cash-register' },
  { 
    text: '3. Operación y Servicio', 
    icon: <RestaurantIcon />,
    children: [
      { text: 'Plano de Mesas', path: '/tables' },
      { text: 'Punto de Venta (POS)', path: '/pos' },
      { text: 'Pantalla de Cocina (KDS)', path: '/kitchen' },
      { text: 'Gestion de Domicilios', path: '/delivery' },
    ]
  },
  { 
    text: '4. Menú y Clientes', 
    icon: <MenuBookIcon />,
    children: [
      { text: 'Catálogo de Menú', path: '/catalog' },
      { text: 'Ingeniería de Recetas', path: '/recipes' },
      { text: 'Directorio de Clientes', path: '/customers' },
      { text: 'Agenda de Reservas', path: '/reservations' },
    ]
  },
  { 
    text: '5. Stock y Abastecimiento', 
    icon: <InventoryIcon />,
    children: [
      { text: 'Control de Inventario', path: '/inventory' },
      { text: 'Compras y Proveedores', path: '/purchases' },
    ]
  },
  { text: '6. Reportes y Analítica', icon: <BarChartIcon />, path: '/reports' },
  { text: '7. Personal de Equipo', icon: <PeopleIcon />, path: '/staff' },
  { text: '8. Configuración del Sistema', icon: <SettingsIcon />, path: '/settings' },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '3. Operación y Servicio': true,
    '4. Menú y Clientes': true,
    '5. Stock y Abastecimiento': true,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Load and listen to live inventory changes
  useEffect(() => {
    let isMounted = true;
    const fetchInventory = async () => {
      try {
        const data = await mockApi.inventory.getAll();
        if (isMounted) {
          setInventory(data || []);
        }
      } catch (err) {
        console.warn('Error loading inventory alerts:', err);
      }
    };

    fetchInventory();

    const handleInvChange = () => fetchInventory();
    window.addEventListener('sesamo_inventory_updated', handleInvChange);
    window.addEventListener('sesamo_orders_updated', handleInvChange);
    window.addEventListener('sesamo_purchases_updated', handleInvChange);

    return () => {
      isMounted = false;
      window.removeEventListener('sesamo_inventory_updated', handleInvChange);
      window.removeEventListener('sesamo_orders_updated', handleInvChange);
      window.removeEventListener('sesamo_purchases_updated', handleInvChange);
    };
  }, []);

  // Compute critical and warning items
  const criticalItems = useMemo(() => {
    return inventory.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minStock) || 0));
  }, [inventory]);

  const warningItems = useMemo(() => {
    return inventory.filter(i => {
      const cur = Number(i.currentStock) || 0;
      const min = Number(i.minStock) || 0;
      return cur > min && cur <= min * 1.5;
    });
  }, [inventory]);

  useEffect(() => {
    // Check if app is already running in standalone desktop mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsAppInstalled(true);
      }
    } else {
      alert('Para instalar Sésamo POS como app en tu computadora:\n\n1. En Google Chrome, mira arriba a la derecha en la barra de direcciones.\n2. Haz clic en el ícono de pantalla con una flecha hacia abajo (Instalar Sésamo POS).\n3. O abre el menú de Chrome (los 3 puntos ⋮) > "Guardar y compartir" > "Instalar Sésamo POS".');
    }
  };

  // Redirect role-restricted users if accessing unauthorized route
  useEffect(() => {
    if (user?.role === 'COCINA') {
      const allowedPaths = ['/kitchen', '/recipes', '/inventory', '/catalog'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/kitchen', { replace: true });
      }
    } else if (user?.role === 'MESERO') {
      const allowedPaths = ['/tables', '/pos', '/catalog'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/tables', { replace: true });
      }
    } else if (user?.role === 'CAJERO') {
      const allowedPaths = ['/cash-register', '/tables', '/pos', '/catalog', '/delivery', '/customers', '/staff'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/cash-register', { replace: true });
      }
    } else if (user?.role === 'REPARTIDOR') {
      const allowedPaths = ['/delivery'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/delivery', { replace: true });
      }
    } else if (user?.role === 'INVENTARIO') {
      const allowedPaths = ['/inventory', '/purchases', '/recipes', '/catalog'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/inventory', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  const getMenuItemsForRole = () => {
    if (user?.role === 'COCINA') {
      return [
        { text: 'Pantalla de Cocina (KDS)', icon: <RestaurantIcon />, path: '/kitchen' },
        { text: 'Ingeniería de Recetas', icon: <MenuBookIcon />, path: '/recipes' },
        { text: 'Control de Inventario', icon: <InventoryIcon />, path: '/inventory' },
        { text: 'Catálogo de Menú', icon: <MenuBookIcon />, path: '/catalog' },
      ];
    }
    if (user?.role === 'MESERO') {
      return [
        { text: 'Plano y Panel de Meseros', icon: <RestaurantIcon />, path: '/tables' },
        { text: 'Punto de Venta (POS)', icon: <ReceiptIcon />, path: '/pos' },
        { text: 'Catálogo de Menú', icon: <MenuBookIcon />, path: '/catalog' },
      ];
    }
    if (user?.role === 'CAJERO') {
      return [
        { text: '1. Caja & Apertura de Turno', icon: <ReceiptIcon />, path: '/cash-register' },
        { text: '2. Plano de Mesas & Cobro', icon: <RestaurantIcon />, path: '/tables' },
        { text: '3. Punto de Venta (POS)', icon: <ReceiptIcon />, path: '/pos' },
        { text: '4. Catálogo de Menú', icon: <MenuBookIcon />, path: '/catalog' },
        { text: '5. Gestión de Domicilios', icon: <RestaurantIcon />, path: '/delivery' },
        { text: '6. Directorio de Clientes', icon: <PeopleIcon />, path: '/customers' },
        { text: '7. Liquidar Repartidores', icon: <DeliveryIcon />, path: '/staff?tab=repartidores' },
      ];
    }
    if (user?.role === 'REPARTIDOR') {
      return [
        { text: 'Rutas & Domicilios Asignados', icon: <DeliveryIcon />, path: '/delivery' },
      ];
    }
    if (user?.role === 'INVENTARIO') {
      return [
        { text: '1. Control de Inventario & Kardex', icon: <InventoryIcon />, path: '/inventory' },
        { text: '2. Compras & Proveedores', icon: <PurchasesIcon />, path: '/purchases' },
        { text: '3. Ingeniería de Recetas', icon: <MenuBookIcon />, path: '/recipes' },
        { text: '4. Catálogo de Menú', icon: <MenuBookIcon />, path: '/catalog' },
      ];
    }
    return fullMenuItems;
  };

  const activeMenuItems = getMenuItemsForRole();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleGroupClick = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const drawer = (
    <div>
      <Toolbar sx={{ gap: 1.5, py: 1 }}>
        <Box component="img" src="/logo.png" alt="Sésamo Alimentos" sx={{ height: 60, width: 'auto' }} />
        <Box>
          <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.1 }}>
            Sésamo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
            {user?.role === 'COCINA'
              ? 'Módulo de Cocina 👨‍🍳'
              : user?.role === 'MESERO'
              ? 'Servicio & Comandas 🍽️'
              : user?.role === 'CAJERO'
              ? 'Caja & Facturación 💵'
              : user?.role === 'REPARTIDOR'
              ? 'Rutas & Domicilios 🛵'
              : user?.role === 'INVENTARIO'
              ? 'Almacén & Kardex 📦'
              : 'Alimentos & POS'}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {activeMenuItems.map((item) => (
          <div key={item.text}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleGroupClick(item.text)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    {openGroups[item.text] ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openGroups[item.text]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.text}
                        sx={{ pl: 4 }}
                        selected={location.pathname === child.path}
                        onClick={() => {
                          navigate(child.path);
                          setMobileOpen(false);
                        }}
                      >
                        <ListItemText primary={child.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton 
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )}
          </div>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
            {/* Desktop Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <Link underline="hover" color="inherit" href="/">
                Sesamo
              </Link>
              <Typography color="text.primary">
                {location.pathname.replace(/^\//, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Panel'}
              </Typography>
            </Breadcrumbs>

            {/* Mobile Page Title */}
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                display: { xs: 'block', sm: 'none' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 180
              }}
            >
              {location.pathname.replace(/^\//, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Sésamo'}
            </Typography>

            {user?.role === 'COCINA' && (
              <Chip
                label="👨‍🍳 Cocina"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', fontWeight: 800, border: '1px solid #ea580c' }}
              />
            )}
            {user?.role === 'MESERO' && (
              <Chip
                label="🛎️ Mesero"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(101, 163, 13, 0.12)', color: '#65a30d', fontWeight: 800, border: '1px solid #65a30d' }}
              />
            )}
            {user?.role === 'CAJERO' && (
              <Chip
                label="💵 Caja"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', fontWeight: 800, border: '1px solid #0284c7' }}
              />
            )}
            {user?.role === 'REPARTIDOR' && (
              <Chip
                label="🛵 Repartidor"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(217, 119, 6, 0.12)', color: '#d97706', fontWeight: 800, border: '1px solid #d97706' }}
              />
            )}
            {user?.role === 'INVENTARIO' && (
              <Chip
                label="📦 Almacén"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', fontWeight: 800, border: '1px solid #7c3aed' }}
              />
            )}
            {user?.role === 'GERENTE' && (
              <Chip
                label="💼 Gerencia"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', fontWeight: 800, border: '1px solid #4f46e5' }}
              />
            )}
            {user?.role === 'ADMINISTRADOR' && (
              <Chip
                label="👑 Admin 360°"
                size="small"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'rgba(30, 41, 11, 0.12)', color: '#1e290b', fontWeight: 800, border: '1px solid #1e290b' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isAppInstalled && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<InstallIcon sx={{ fontSize: 17 }} />}
                onClick={handleInstallClick}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  color: '#4d7c0f',
                  borderColor: '#bef264',
                  bgcolor: 'rgba(132, 204, 22, 0.1)',
                  px: 1.5,
                  py: 0.6,
                  display: { xs: 'none', md: 'inline-flex' },
                  '&:hover': {
                    bgcolor: 'rgba(132, 204, 22, 0.2)',
                    borderColor: '#84cc16',
                  }
                }}
              >
                Instalar App en PC
              </Button>
            )}

            {/* Campanita de Notificaciones de Inventario y Alertas */}
            <Tooltip title={criticalItems.length > 0 ? `${criticalItems.length} insumos en nivel crítico` : 'Alertas de inventario'}>
              <IconButton
                size="medium"
                aria-label="alertas de inventario"
                onClick={(e) => setNotifAnchorEl(e.currentTarget)}
                sx={{
                  color: criticalItems.length > 0 ? '#dc2626' : '#64748b',
                  bgcolor: criticalItems.length > 0 ? '#fee2e2' : 'transparent',
                  border: criticalItems.length > 0 ? '1px solid #fca5a5' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: criticalItems.length > 0 ? '#fecaca' : 'rgba(0,0,0,0.05)',
                  },
                  transition: 'all 0.2s',
                  width: 38,
                  height: 38,
                }}
              >
                <Badge
                  badgeContent={criticalItems.length}
                  color="error"
                  overlap="circular"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      height: 18,
                      minWidth: 18,
                      bgcolor: '#dc2626',
                      color: '#ffffff',
                    }
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 21 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Popover de Alertas de Inventario */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={() => setNotifAnchorEl(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: { xs: '92vw', sm: 380 },
                    maxWidth: 400,
                    borderRadius: '16px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    mt: 1.5,
                  }
                }
              }}
            >
              {/* Encabezado */}
              <Box sx={{ p: 2, bgcolor: criticalItems.length > 0 ? '#fef2f2' : '#f0fdf4', borderBottom: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {criticalItems.length > 0 ? (
                      <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 34, height: 34 }}>
                        <WarningAmberIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                    ) : (
                      <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 34, height: 34 }}>
                        <CheckCircleIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                        Alertas de Inventario
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {criticalItems.length > 0
                          ? `${criticalItems.length} insumos bajo stock mínimo`
                          : 'Insumos en niveles óptimos'}
                      </Typography>
                    </Box>
                  </Box>

                  {criticalItems.length > 0 && (
                    <Chip
                      label={`${criticalItems.length} Críticos`}
                      size="small"
                      sx={{ bgcolor: '#dc2626', color: '#ffffff', fontWeight: 900, fontSize: '0.68rem', height: 22 }}
                    />
                  )}
                </Box>
              </Box>

              {/* Lista scrollable de insumos */}
              <Box sx={{ maxHeight: 340, overflowY: 'auto', p: 1.5 }}>
                {criticalItems.length === 0 && warningItems.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center', px: 2 }}>
                    <CheckCircleIcon sx={{ fontSize: 42, color: '#16a34a', mb: 1, opacity: 0.8 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                      ¡Cocina y bodega al día!
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      No hay insumos agotados ni bajo el stock de seguridad.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    {criticalItems.map((item) => {
                      const min = Number(item.minStock) || 0;
                      const cur = Number(item.currentStock) || 0;
                      const max = Number(item.maxStock) || Math.max(min * 4, 30);
                      const percent = Math.min(100, Math.round((cur / (max || 1)) * 100));

                      return (
                        <Paper
                          key={item.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            border: '1px solid #fecaca',
                            bgcolor: '#fff5f5',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: '#fee2e2' }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Box sx={{ pr: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#991b1b', lineHeight: 1.2 }}>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                                {item.category || 'Insumo'}
                              </Typography>
                            </Box>
                            <Chip
                              label="Agotado"
                              size="small"
                              sx={{
                                bgcolor: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 900,
                                fontSize: '0.66rem',
                                height: 20,
                                border: '1px solid #fca5a5'
                              }}
                            />
                          </Box>

                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#7f1d1d' }}>
                                Stock: {cur} {item.unit}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
                                Mínimo: {min} {item.unit}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{
                                height: 5,
                                borderRadius: 3,
                                bgcolor: '#fecaca',
                                '& .MuiLinearProgress-bar': { bgcolor: '#dc2626' }
                              }}
                            />
                          </Box>
                        </Paper>
                      );
                    })}

                    {warningItems.slice(0, 3).map((item) => {
                      const min = Number(item.minStock) || 0;
                      const cur = Number(item.currentStock) || 0;

                      return (
                        <Paper
                          key={item.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            border: '1px solid #fef08a',
                            bgcolor: '#fefce8',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#854d0e', lineHeight: 1.2 }}>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#a16207', fontWeight: 600 }}>
                                {item.category || 'Insumo'} • Quedan: {cur} {item.unit} (Mín: {min})
                              </Typography>
                            </Box>
                            <Chip
                              label="Por agotarse"
                              size="small"
                              sx={{
                                bgcolor: '#fef08a',
                                color: '#854d0e',
                                fontWeight: 800,
                                fontSize: '0.66rem',
                                height: 20,
                              }}
                            />
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Botones de acción */}
              <Divider />
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', display: 'flex', gap: 1 }}>
                {criticalItems.length > 0 && (
                  <Button
                    variant="contained"
                    fullWidth
                    size="small"
                    startIcon={<OrderMoreIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setNotifAnchorEl(null);
                      const itemsToOrder = criticalItems.map((item) => ({
                        itemId: item.id,
                        quantity: Math.max(5, (Number(item.maxStock) || 20) - (Number(item.currentStock) || 0)),
                        unitCost: item.unitCost || 10000,
                      }));
                      sessionStorage.setItem('sesamo_suggested_po_items', JSON.stringify(itemsToOrder));
                      navigate('/purchases');
                    }}
                    sx={{
                      bgcolor: '#ea580c',
                      color: '#ffffff',
                      fontWeight: 800,
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontSize: '0.78rem',
                      '&:hover': { bgcolor: '#c2410c' }
                    }}
                  >
                    Pedir Insumos
                  </Button>
                )}
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setNotifAnchorEl(null);
                    navigate('/inventory');
                  }}
                  sx={{
                    color: '#1e290b',
                    borderColor: '#cbd5e1',
                    fontWeight: 800,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontSize: '0.78rem',
                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                  }}
                >
                  Ver Inventario
                </Button>
              </Box>
            </Popover>

            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ bgcolor: user?.role === 'COCINA' ? '#ea580c' : user?.role === 'MESERO' ? '#65a30d' : 'secondary.main', width: 32, height: 32 }}>
                  {user?.name?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user?.name} ({user?.role})</Typography>
                </MenuItem>
                {!isAppInstalled && (
                  <MenuItem onClick={() => { handleClose(); handleInstallClick(); }}>
                    <ListItemIcon>
                      <InstallIcon fontSize="small" sx={{ color: '#4d7c0f' }} />
                    </ListItemIcon>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#4d7c0f' }}>
                      Instalar en PC (Chrome)
                    </Typography>
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Cerrar Sesión
                </MenuItem>
              </Menu>
            </div>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          overflowX: 'hidden',
          mt: { xs: 7, sm: 8 }
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
