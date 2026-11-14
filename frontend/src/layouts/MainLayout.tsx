import { useState, useEffect } from 'react';
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
  Chip
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
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

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
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

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
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </div>
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
