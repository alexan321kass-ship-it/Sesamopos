import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogContent,
  IconButton,
  Rating,
  AppBar,
  Toolbar,
  Paper,
  Divider,
  Stack,
  Drawer,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayCircle as PlayIcon,
  Close as CloseIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  ShoppingBag as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  RoomService as WaiterIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckIcon,
  Spa as VeganIcon,
  ArrowForward as ArrowForwardIcon,
  TableRestaurant as TableIcon,
  DinnerDining as DiningIcon,
  Restaurant as RestaurantIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Product, Category, StoreSettings, Table, OrderItem, Order, ModifierOption, OrderType } from '../types';
import { playKitchenBellSound } from '../utils/audioAlerts';
import { notifyRealtimeEvent } from '../services/eventBus';

interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  selectedModifiers: ModifierOption[];
  notes: string;
  unitPrice: number;
  totalPrice: number;
}

export default function PublicMenu() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Interactive Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sesamo_public_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Order Details State
  const initialTableParam = searchParams.get('mesa') || searchParams.get('table') || '';
  const [orderType, setOrderType] = useState<OrderType>('MESA');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>(initialTableParam);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [tipPercent, setTipPercent] = useState<number>(10);

  // Customization & Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalSelectedModifiers, setModalSelectedModifiers] = useState<ModifierOption[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Order Placed Confirmation Modal
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Waiter Call Notification
  const [waiterCallNotice, setWaiterCallNotice] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('sesamo_catalog_updated', handleUpdate);
    window.addEventListener('sesamo_tables_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_catalog_updated', handleUpdate);
      window.removeEventListener('sesamo_tables_updated', handleUpdate);
    };
  }, []);

  // Save Cart to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('sesamo_public_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  const loadData = async () => {
    try {
      const [prods, cats, tbls, sets] = await Promise.all([
        mockApi.products.getAll(),
        mockApi.categories.getAll(),
        mockApi.tables.getAll(),
        mockApi.settings.get()
      ]);
      setProducts(prods.filter(p => p.isActive));
      setCategories(cats.filter(c => c.isActive));
      setTables(tbls || []);
      setSettings(sets);
    } catch (err) {
      console.error('Error al cargar menú digital:', err);
    }
  };

  // Cart Calculations
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const cartTipAmount = useMemo(() => Math.round((cartSubtotal * tipPercent) / 100), [cartSubtotal, tipPercent]);
  const cartTotal = useMemo(() => cartSubtotal + cartTipAmount, [cartSubtotal, cartTipAmount]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || product.categoryId === selectedCategory;
      const matchesSearch =
        !searchTerm.trim() ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.tags && product.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      let matchesTag = true;
      if (selectedTag === 'RECOMMENDED') {
        matchesTag = Boolean(product.rating && product.rating >= 4.8);
      } else if (selectedTag === 'VEGAN') {
        matchesTag = Boolean(product.tags && product.tags.some(t => t.toLowerCase().includes('vegan') || t.toLowerCase().includes('vegetar')));
      } else if (selectedTag === 'GLUTEN_FREE') {
        matchesTag = Boolean(product.tags && product.tags.some(t => t.toLowerCase().includes('gluten') || t.toLowerCase().includes('celiac')));
      }

      return matchesCategory && matchesSearch && matchesTag;
    });
  }, [products, selectedCategory, searchTerm, selectedTag]);

  // Handlers for Cart
  const handleOpenDetailModal = (product: Product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalNotes('');
    setModalSelectedModifiers([]);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const handleQuickAddToCart = (product: Product) => {
    // If product has required modifier groups, open customization modal
    if (product.modifiers && product.modifiers.some(m => m.isRequired)) {
      handleOpenDetailModal(product);
      return;
    }

    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && item.selectedModifiers.length === 0 && !item.notes
    );

    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        cartId: `${product.id}_${Date.now()}`,
        product,
        quantity: 1,
        selectedModifiers: [],
        notes: '',
        unitPrice: product.price,
        totalPrice: product.price
      };
      setCart([...cart, newItem]);
    }
  };

  const handleModalAddToCart = () => {
    if (!selectedProduct) return;

    // Calculate item unit price with modifiers
    const modifierSum = modalSelectedModifiers.reduce((sum, mod) => sum + (mod.price || 0), 0);
    const unitPrice = selectedProduct.price + modifierSum;
    const totalPrice = unitPrice * modalQuantity;

    const newItem: CartItem = {
      cartId: `${selectedProduct.id}_${Date.now()}`,
      product: selectedProduct,
      quantity: modalQuantity,
      selectedModifiers: modalSelectedModifiers,
      notes: modalNotes.trim(),
      unitPrice,
      totalPrice
    };

    setCart([...cart, newItem]);
    handleCloseDetailModal();
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // Submit Order to Kitchen / POS
  const handleSubmitOrderToKitchen = async () => {
    if (cart.length === 0) return;

    if (orderType === 'MESA' && !selectedTableNumber) {
      alert('Por favor selecciona o ingresa el número de tu mesa para que el equipo te lleve la orden.');
      return;
    }

    try {
      const orderItems: OrderItem[] = cart.map(c => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        totalPrice: c.totalPrice,
        modifiers: c.selectedModifiers.map(m => ({
          modifierGroupId: 'custom',
          modifierOptionId: m.id,
          name: m.name,
          price: m.price
        })),
        notes: c.notes || undefined,
        isDelivered: false
      }));

      // Match table
      const matchedTable = tables.find(t => String(t.number) === String(selectedTableNumber) || t.id === selectedTableNumber);

      const newOrderPayload: Partial<Order> = {
        id: Date.now().toString(),
        orderNumber: `SES-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: Date.now(),
        tableId: matchedTable?.id || (orderType === 'MESA' ? selectedTableNumber : undefined),
        customerName: customerName.trim() || (orderType === 'MESA' ? `Mesa #${selectedTableNumber}` : 'Cliente Web'),
        items: orderItems,
        subtotal: cartSubtotal,
        discount: 0,
        tax: 0,
        tip: cartTipAmount,
        total: cartTotal,
        status: 'CREADO',
        type: orderType
      };

      const created = await mockApi.orders.create(newOrderPayload as any);
      playKitchenBellSound();
      notifyRealtimeEvent('sesamo_orders_updated');

      setConfirmedOrder(created);
      setIsSuccessModalOpen(true);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error('Error al enviar orden:', err);
      alert('Hubo un inconveniente al procesar tu orden. Por favor avisa a tu mesero.');
    }
  };

  // WhatsApp Order
  const handleOrderViaWhatsApp = () => {
    if (cart.length === 0) return;
    const phone = settings?.phone ? settings.phone.replace(/[^0-9]/g, '') : '573000000001';

    let text = `🌿 *¡Hola Sésamo Alimentos! Quiero realizar este pedido desde el Menú Digital:*%0A%0A`;
    cart.forEach(item => {
      text += `• *${item.quantity}x ${item.product.name}* - $${item.totalPrice.toLocaleString()} COP%0A`;
      if (item.selectedModifiers.length > 0) {
        text += `   ↳ _Opciones: ${item.selectedModifiers.map(m => m.name).join(', ')}_%0A`;
      }
      if (item.notes) {
        text += `   ↳ _Nota de cocina: ${item.notes}_%0A`;
      }
    });

    text += `%0A💵 *Subtotal:* $${cartSubtotal.toLocaleString()} COP`;
    if (cartTipAmount > 0) {
      text += `%0A✨ *Propina (${tipPercent}%):* $${cartTipAmount.toLocaleString()} COP`;
    }
    text += `%0A💰 *TOTAL A PAGAR: $${cartTotal.toLocaleString()} COP*%0A%0A`;

    if (orderType === 'MESA' && selectedTableNumber) {
      text += `📍 *Ubicación:* En Restaurante • Mesa #${selectedTableNumber}%0A`;
    } else if (orderType === 'DOMICILIO') {
      text += `🛵 *Modalidad:* Domicilio%0A🏠 *Dirección:* ${deliveryAddress || 'Por confirmar'}%0A`;
    } else {
      text += `🛍️ *Modalidad:* Para Llevar (Take Away)%0A`;
    }

    if (customerName) text += `👤 *Cliente:* ${customerName}%0A`;
    if (customerPhone) text += `📞 *Teléfono:* ${customerPhone}%0A`;

    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Call Waiter Action
  const handleCallWaiter = () => {
    const tableStr = selectedTableNumber || 'Barra';
    notifyRealtimeEvent('sesamo_waiter_called', { table: tableStr, timestamp: Date.now() });
    setWaiterCallNotice(`🛎️ ¡Tu mesero ha sido llamado a la Mesa #${tableStr}! Ya se acerca a atenderte.`);
  };

  return (
    <Box sx={{ bgcolor: '#0b1307', minHeight: '100vh', color: '#f8fafc', pb: 12 }}>
      {/* ============================================================ */}
      {/* TOP NAVIGATION BAR                                           */}
      {/* ============================================================ */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(11, 19, 7, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(132, 204, 22, 0.18)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1.2, px: { xs: 0, sm: 2 } }}>
            {/* Brand Logo & Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Sésamo Alimentos"
                sx={{
                  height: { xs: 44, sm: 50 },
                  width: 'auto',
                  filter: 'drop-shadow(0 4px 12px rgba(132, 204, 22, 0.35))',
                  cursor: 'pointer'
                }}
                onClick={() => { setSelectedCategory('ALL'); setSearchTerm(''); }}
              />
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    background: 'linear-gradient(135deg, #ffffff 0%, #d9f99d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Sésamo
                </Typography>
                <Typography variant="caption" sx={{ color: '#84cc16', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                  Cocina Consciente & Menú Interactivo
                </Typography>
              </Box>
            </Box>

            {/* Right Quick Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {/* Table Selector Pill */}
              <Chip
                icon={<TableIcon sx={{ color: '#84cc16 !important', fontSize: '18px !important' }} />}
                label={selectedTableNumber ? `Mesa #${selectedTableNumber}` : 'Elige tu Mesa'}
                clickable
                onClick={() => setIsCartOpen(true)}
                sx={{
                  bgcolor: selectedTableNumber ? 'rgba(132, 204, 22, 0.16)' : 'rgba(255, 255, 255, 0.08)',
                  color: selectedTableNumber ? '#bef264' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: '1px solid rgba(132, 204, 22, 0.3)',
                  height: 36
                }}
              />

              {/* Call Waiter Button */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<WaiterIcon />}
                onClick={handleCallWaiter}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  borderRadius: '12px',
                  borderColor: 'rgba(234, 179, 8, 0.4)',
                  color: '#facc15',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  px: 1.8,
                  height: 36,
                  bgcolor: 'rgba(234, 179, 8, 0.08)',
                  '&:hover': {
                    borderColor: '#facc15',
                    bgcolor: 'rgba(234, 179, 8, 0.16)'
                  }
                }}
              >
                Llamar Mesero
              </Button>

              {/* Cart Button */}
              <IconButton
                onClick={() => setIsCartOpen(true)}
                sx={{
                  bgcolor: cartItemCount > 0 ? '#16a34a' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  p: 1.1,
                  borderRadius: '14px',
                  boxShadow: cartItemCount > 0 ? '0 4px 16px rgba(22, 163, 74, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: cartItemCount > 0 ? '#15803d' : 'rgba(255, 255, 255, 0.15)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <Badge badgeContent={cartItemCount} color="error" overlap="circular">
                  <CartIcon sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>

              {/* Staff Portal Link */}
              <IconButton
                onClick={() => navigate('/login')}
                title="Acceso Personal / Colaboradores"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  p: 1.1,
                  borderRadius: '14px',
                  '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.12)' }
                }}
              >
                <LoginIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ============================================================ */}
      {/* HERO BANNER SECTION                                          */}
      {/* ============================================================ */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #121c0b 0%, #0b1307 100%)',
          pt: { xs: 4, md: 5 },
          pb: { xs: 4, md: 5 },
          borderBottom: '1px solid rgba(132, 204, 22, 0.12)'
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={3} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 8 }}>
              {/* Live Status Chip */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.8, flexWrap: 'wrap' }}>
                <Chip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ade80', ml: 1 }} />}
                  label="Cocina Abierta • Pedidos en Vivo"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(74, 222, 128, 0.14)',
                    color: '#86efac',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    border: '1px solid rgba(74, 222, 128, 0.28)'
                  }}
                />
                <Chip
                  icon={<StarIcon sx={{ color: '#facc15 !important', fontSize: '15px !important' }} />}
                  label="Cocina de Origen & Ingredientes Frescos"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(250, 204, 21, 0.1)',
                    color: '#fef08a',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    border: '1px solid rgba(250, 204, 21, 0.25)'
                  }}
                />
              </Box>

              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2.1rem', sm: '2.8rem', md: '3.4rem' },
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  mb: 1.5,
                  background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 60%, #bef264 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Pide a tu ritmo directo a cocina
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#94a3b8',
                  fontSize: { xs: '0.98rem', md: '1.1rem' },
                  lineHeight: 1.6,
                  maxWidth: 680,
                  mb: 2.8
                }}
              >
                Elige tus platillos favoritos, personaliza tus términos y salsas, y envía tu orden en tiempo real para que los chefs comiencen a preparar tu mesa.
              </Typography>

              {/* Location & Time Info */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ color: '#cbd5e1' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <LocationIcon sx={{ color: '#84cc16', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {settings?.address || 'El Poblado & Laureles, Medellín'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <TimeIcon sx={{ color: '#84cc16', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    12:00 PM - 10:30 PM (Lunes a Domingo)
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Chef Highlight Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '24px',
                  bgcolor: 'rgba(23, 35, 17, 0.75)',
                  border: '1px solid rgba(132, 204, 22, 0.25)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <DiningIcon sx={{ color: '#84cc16', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                      Menú QR Interactivo
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#a3e635', fontWeight: 600 }}>
                      Sin filas • Sin esperas • Confirmación Inmediata
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, mb: 2 }}>
                  Tus platos van directamente a la pantalla de cocina. Puedes pagar al final con tu mesero o en la caja en efectivo, datáfono o transferencia.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<WaiterIcon />}
                  onClick={handleCallWaiter}
                  sx={{
                    bgcolor: 'rgba(132, 204, 22, 0.18)',
                    color: '#bef264',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    border: '1px solid rgba(132, 204, 22, 0.35)',
                    '&:hover': {
                      bgcolor: '#16a34a',
                      color: '#ffffff'
                    }
                  }}
                >
                  Solicitar Atención a la Mesa
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SEARCH, CATEGORIES & DIETARY FILTER CONTROLS                 */}
      {/* ============================================================ */}
      <Container maxWidth="xl" sx={{ mt: 3.5 }}>
        {/* Search Input */}
        <Box sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Buscar por plato, ingrediente, vino o antojo (ej. Solomito, Bowl, Mojito...)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#84cc16' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: '#94a3b8' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  bgcolor: 'rgba(20, 32, 15, 0.8)',
                  borderRadius: '16px',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  border: '1px solid rgba(132, 204, 22, 0.2)',
                  '& fieldset': { border: 'none' },
                  '&:hover': { borderColor: '#84cc16' }
                }
              }
            }}
          />
        </Box>

        {/* Category Pills (Horizontal Scrollable) */}
        <Box sx={{ mb: 2 }}>
          <Stack
            direction="row"
            spacing={1.2}
            sx={{
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(132, 204, 22, 0.3)', borderRadius: 2 }
            }}
          >
            <Chip
              label={`⭐ Todos (${products.length})`}
              clickable
              onClick={() => setSelectedCategory('ALL')}
              sx={{
                px: 1.8,
                py: 2.2,
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.88rem',
                bgcolor: selectedCategory === 'ALL' ? '#16a34a' : 'rgba(20, 32, 15, 0.7)',
                color: '#ffffff',
                border: selectedCategory === 'ALL' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: selectedCategory === 'ALL' ? '0 4px 14px rgba(22, 163, 74, 0.35)' : 'none',
                '&:hover': { bgcolor: selectedCategory === 'ALL' ? '#15803d' : 'rgba(132, 204, 22, 0.18)' }
              }}
            />
            {categories.map(cat => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <Chip
                  key={cat.id}
                  label={`${cat.name} (${count})`}
                  clickable
                  onClick={() => setSelectedCategory(cat.id)}
                  sx={{
                    px: 1.8,
                    py: 2.2,
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    bgcolor: selectedCategory === cat.id ? '#16a34a' : 'rgba(20, 32, 15, 0.7)',
                    color: '#ffffff',
                    border: selectedCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: selectedCategory === cat.id ? '0 4px 14px rgba(22, 163, 74, 0.35)' : 'none',
                    '&:hover': { bgcolor: selectedCategory === cat.id ? '#15803d' : 'rgba(132, 204, 22, 0.18)' }
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        {/* Dietary / Preference Quick Filter Tabs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3.5, flexWrap: 'wrap' }}>
          <Chip
            label="Todos"
            size="small"
            clickable
            onClick={() => setSelectedTag('ALL')}
            sx={{
              fontWeight: 700,
              bgcolor: selectedTag === 'ALL' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
              color: '#f8fafc'
            }}
          />
          <Chip
            icon={<StarIcon sx={{ color: '#facc15 !important', fontSize: '15px !important' }} />}
            label="Recomendados del Chef ⭐"
            size="small"
            clickable
            onClick={() => setSelectedTag(selectedTag === 'RECOMMENDED' ? 'ALL' : 'RECOMMENDED')}
            sx={{
              fontWeight: 700,
              bgcolor: selectedTag === 'RECOMMENDED' ? 'rgba(250, 204, 21, 0.25)' : 'rgba(255,255,255,0.05)',
              color: selectedTag === 'RECOMMENDED' ? '#fef08a' : '#94a3b8',
              border: selectedTag === 'RECOMMENDED' ? '1px solid #facc15' : '1px solid transparent'
            }}
          />
          <Chip
            icon={<VeganIcon sx={{ color: '#4ade80 !important', fontSize: '15px !important' }} />}
            label="Vegano / Vegetariano 🌱"
            size="small"
            clickable
            onClick={() => setSelectedTag(selectedTag === 'VEGAN' ? 'ALL' : 'VEGAN')}
            sx={{
              fontWeight: 700,
              bgcolor: selectedTag === 'VEGAN' ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255,255,255,0.05)',
              color: selectedTag === 'VEGAN' ? '#86efac' : '#94a3b8',
              border: selectedTag === 'VEGAN' ? '1px solid #4ade80' : '1px solid transparent'
            }}
          />
          <Chip
            label="🌾 Sin Gluten"
            size="small"
            clickable
            onClick={() => setSelectedTag(selectedTag === 'GLUTEN_FREE' ? 'ALL' : 'GLUTEN_FREE')}
            sx={{
              fontWeight: 700,
              bgcolor: selectedTag === 'GLUTEN_FREE' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255,255,255,0.05)',
              color: selectedTag === 'GLUTEN_FREE' ? '#fdba74' : '#94a3b8',
              border: selectedTag === 'GLUTEN_FREE' ? '1px solid #f97316' : '1px solid transparent'
            }}
          />
        </Box>

        {/* ============================================================ */}
        {/* PRODUCTS GRID SECTION                                        */}
        {/* ============================================================ */}
        {filteredProducts.length === 0 ? (
          <Paper
            sx={{
              p: 7,
              textAlign: 'center',
              bgcolor: 'rgba(20, 32, 15, 0.5)',
              borderRadius: '24px',
              border: '1px dashed rgba(132, 204, 22, 0.25)'
            }}
          >
            <RestaurantIcon sx={{ fontSize: 52, color: '#65a30d', mb: 1.5 }} />
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 800, mb: 1 }}>
              No se encontraron platillos con esos criterios
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5 }}>
              Intenta buscando con otra palabra o quitando los filtros de categoría.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { setSelectedCategory('ALL'); setSearchTerm(''); setSelectedTag('ALL'); }}
              sx={{ color: '#84cc16', borderColor: '#84cc16', borderRadius: '12px', fontWeight: 700 }}
            >
              Ver Toda la Carta
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredProducts.map(product => {
              const category = categories.find(c => c.id === product.categoryId);
              // Check if in cart
              const inCartCount = cart
                .filter(item => item.product.id === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'rgba(20, 32, 15, 0.85)',
                      borderRadius: '22px',
                      border: inCartCount > 0 ? '1.5px solid #84cc16' : '1px solid rgba(132, 204, 22, 0.15)',
                      boxShadow: inCartCount > 0 ? '0 10px 24px rgba(132, 204, 22, 0.15)' : '0 8px 20px rgba(0,0,0,0.25)',
                      transition: 'all 0.25s ease',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 16px 32px rgba(0,0,0,0.45)',
                        borderColor: '#84cc16'
                      }
                    }}
                  >
                    {/* Image & Badges Container */}
                    <Box sx={{ position: 'relative', pt: '62%', overflow: 'hidden', cursor: 'pointer' }} onClick={() => handleOpenDetailModal(product)}>
                      <CardMedia
                        component="img"
                        image={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                        alt={product.name}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.4s ease',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                      />

                      {/* Video Indicator */}
                      {product.videoUrl && (
                        <Chip
                          icon={<PlayIcon sx={{ color: '#ffffff !important', fontSize: '1.1rem' }} />}
                          label="Ver Video"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            bgcolor: 'rgba(22, 163, 74, 0.9)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            backdropFilter: 'blur(6px)'
                          }}
                        />
                      )}

                      {/* Category Tag */}
                      <Chip
                        label={category?.name || 'Especial'}
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          bgcolor: 'rgba(11, 19, 7, 0.85)',
                          color: '#bef264',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(132, 204, 22, 0.3)'
                        }}
                      />
                    </Box>

                    {/* Card Content */}
                    <CardContent sx={{ flexGrow: 1, p: 2.2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
                        <Typography
                          variant="h6"
                          onClick={() => handleOpenDetailModal(product)}
                          sx={{
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '1.08rem',
                            lineHeight: 1.25,
                            cursor: 'pointer',
                            '&:hover': { color: '#bef264' }
                          }}
                        >
                          {product.name}
                        </Typography>
                      </Box>

                      {/* Rating & Calories Chips */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                        {product.rating && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <StarIcon sx={{ color: '#facc15', fontSize: 16 }} />
                            <Typography variant="caption" sx={{ color: '#facc15', fontWeight: 800, fontSize: '0.8rem' }}>
                              {product.rating.toFixed(1)}
                            </Typography>
                          </Box>
                        )}
                        {product.calories && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#94a3b8',
                              bgcolor: 'rgba(255,255,255,0.06)',
                              px: 0.9,
                              py: 0.2,
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600
                            }}
                          >
                            {product.calories}
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          color: '#94a3b8',
                          fontSize: '0.86rem',
                          mb: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.45
                        }}
                      >
                        {product.description}
                      </Typography>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {product.tags.slice(0, 3).map((tag, i) => (
                            <Chip
                              key={i}
                              label={tag}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(132, 204, 22, 0.08)',
                                color: '#a3e635',
                                fontSize: '0.68rem',
                                height: 20,
                                fontWeight: 700
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Price & Interactive Add Action */}
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(11, 19, 7, 0.5)' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                          Precio
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#4ade80', fontSize: '1.2rem', lineHeight: 1.1 }}>
                          ${product.price.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>COP</Typography>
                        </Typography>
                      </Box>

                      {/* Action Button: Add or Quantity Counter */}
                      {inCartCount === 0 ? (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleQuickAddToCart(product)}
                          sx={{
                            bgcolor: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 800,
                            borderRadius: '12px',
                            textTransform: 'none',
                            px: 2,
                            py: 0.8,
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                            '&:hover': { bgcolor: '#15803d' }
                          }}
                        >
                          Agregar
                        </Button>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(22, 163, 74, 0.15)', borderRadius: '12px', border: '1px solid #16a34a', p: 0.4 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const item = cart.find(i => i.product.id === product.id);
                              if (item) handleUpdateQuantity(item.cartId, -1);
                            }}
                            sx={{ color: '#4ade80', p: 0.4 }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ px: 1.2, fontWeight: 900, color: '#ffffff', fontSize: '0.9rem' }}>
                            {inCartCount}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleQuickAddToCart(product)}
                            sx={{ color: '#4ade80', p: 0.4 }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* ============================================================ */}
      {/* FLOATING STICKY CART PILL (VISIBLE WHEN ITEMS IN CART)       */}
      {/* ============================================================ */}
      {cartItemCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 'calc(100% - 32px)',
            maxWidth: 580
          }}
        >
          <Paper
            elevation={8}
            onClick={() => setIsCartOpen(true)}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.6,
              px: 2.5,
              borderRadius: '24px',
              bgcolor: '#16a34a',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(22, 163, 74, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'scale(1.02)' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Badge badgeContent={cartItemCount} color="warning">
                <CartIcon sx={{ fontSize: 28 }} />
              </Badge>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  {cartItemCount} {cartItemCount === 1 ? 'platillo' : 'platillos'} en orden
                </Typography>
                <Typography variant="caption" sx={{ color: '#dcfce7', fontWeight: 600 }}>
                  {selectedTableNumber ? `Para Mesa #${selectedTableNumber}` : 'Toca para elegir mesa y enviar'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                ${cartTotal.toLocaleString()} COP
              </Typography>
              <Button
                variant="contained"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#15803d',
                  fontWeight: 900,
                  borderRadius: '12px',
                  textTransform: 'none',
                  px: 1.8,
                  '&:hover': { bgcolor: '#f0fdf4' }
                }}
              >
                Ver Pedido
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ============================================================ */}
      {/* DISH CUSTOMIZATION & DETAIL MODAL                           */}
      {/* ============================================================ */}
      <Dialog
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#14200f',
              color: '#ffffff',
              borderRadius: '26px',
              border: '1px solid rgba(132, 204, 22, 0.25)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }
          }
        }}
      >
        {selectedProduct && (
          <>
            {/* Media Banner */}
            <Box sx={{ position: 'relative', bgcolor: '#000000', maxHeight: 300, overflow: 'hidden' }}>
              <IconButton
                onClick={handleCloseDetailModal}
                sx={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  zIndex: 10,
                  bgcolor: 'rgba(0,0,0,0.65)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }
                }}
              >
                <CloseIcon />
              </IconButton>

              {selectedProduct.videoUrl ? (
                <Box
                  component="video"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={selectedProduct.videoUrl}
                  sx={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  component="img"
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                  alt={selectedProduct.name}
                  sx={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                />
              )}
            </Box>

            <DialogContent sx={{ p: 3 }}>
              {/* Dish Title & Price */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff' }}>
                    {selectedProduct.name}
                  </Typography>
                  {selectedProduct.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.4 }}>
                      <Rating value={selectedProduct.rating} readOnly precision={0.1} size="small" sx={{ color: '#facc15' }} />
                      <Typography variant="caption" sx={{ color: '#facc15', fontWeight: 800 }}>
                        {selectedProduct.rating.toFixed(1)} / 5.0
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#4ade80' }}>
                  ${selectedProduct.price.toLocaleString()} COP
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#cbd5e1', lineHeight: 1.6, mb: 2.5 }}>
                {selectedProduct.description}
              </Typography>

              {/* Modifiers / Addons Selection */}
              {selectedProduct.modifiers && selectedProduct.modifiers.length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#bef264', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Personalización y Opciones:
                  </Typography>
                  <Stack spacing={1}>
                    {selectedProduct.modifiers.map(group => (
                      <Box key={group.id} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#f8fafc', display: 'block', mb: 0.8 }}>
                          {group.name} {group.isRequired ? '*(Requerido)' : '(Opcional)'}
                        </Typography>
                        <Grid container spacing={1}>
                          {group.options.map(opt => {
                            const isSelected = modalSelectedModifiers.some(m => m.id === opt.id);
                            return (
                              <Grid size={{ xs: 12, sm: 6 }} key={opt.id}>
                                <Button
                                  fullWidth
                                  size="small"
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  onClick={() => {
                                    if (isSelected) {
                                      setModalSelectedModifiers(modalSelectedModifiers.filter(m => m.id !== opt.id));
                                    } else {
                                      setModalSelectedModifiers([...modalSelectedModifiers, opt]);
                                    }
                                  }}
                                  sx={{
                                    justifyContent: 'space-between',
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    bgcolor: isSelected ? '#16a34a' : 'transparent',
                                    borderColor: isSelected ? '#16a34a' : 'rgba(255,255,255,0.15)',
                                    color: isSelected ? '#ffffff' : '#cbd5e1'
                                  }}
                                >
                                  <span>{opt.name}</span>
                                  <span>{opt.price > 0 ? `+$${opt.price.toLocaleString()}` : 'Gratis'}</span>
                                </Button>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Kitchen Special Notes */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', display: 'block', mb: 0.5 }}>
                  Notas especiales para la cocina (Opcional):
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ej. Término medio, salsa al lado, sin cebolla..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        borderRadius: '12px',
                        fontSize: '0.88rem'
                      }
                    }
                  }}
                />
              </Box>

              {/* Quantity Controller & Add Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '12px', p: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    sx={{ color: '#ffffff' }}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ px: 2, fontWeight: 900, fontSize: '1.1rem' }}>
                    {modalQuantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    sx={{ color: '#ffffff' }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleModalAddToCart}
                  sx={{
                    py: 1.3,
                    borderRadius: '14px',
                    fontWeight: 900,
                    fontSize: '0.98rem',
                    bgcolor: '#16a34a',
                    boxShadow: '0 6px 18px rgba(22, 163, 74, 0.4)',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#15803d' }
                  }}
                >
                  Agregar • ${((selectedProduct.price + modalSelectedModifiers.reduce((s, m) => s + (m.price || 0), 0)) * modalQuantity).toLocaleString()} COP
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ============================================================ */}
      {/* CART & CHECKOUT SLIDE-OVER DRAWER                            */}
      {/* ============================================================ */}
      <Drawer
        anchor="right"
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 460 },
              bgcolor: '#0f170b',
              color: '#ffffff',
              p: 3,
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <CartIcon sx={{ color: '#84cc16', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Tu Pedido ({cartItemCount})
            </Typography>
          </Box>
          <IconButton onClick={() => setIsCartOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Dining Type Selector */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#84cc16', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            ¿Dónde vas a disfrutar?
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant={orderType === 'MESA' ? 'contained' : 'outlined'}
              onClick={() => setOrderType('MESA')}
              startIcon={<TableIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                bgcolor: orderType === 'MESA' ? '#16a34a' : 'transparent',
                borderColor: orderType === 'MESA' ? '#16a34a' : 'rgba(255,255,255,0.15)',
                color: orderType === 'MESA' ? '#ffffff' : '#cbd5e1'
              }}
            >
              En Mesa
            </Button>
            <Button
              fullWidth
              size="small"
              variant={orderType === 'PARA_LLEVAR' ? 'contained' : 'outlined'}
              onClick={() => setOrderType('PARA_LLEVAR')}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                bgcolor: orderType === 'PARA_LLEVAR' ? '#16a34a' : 'transparent',
                borderColor: orderType === 'PARA_LLEVAR' ? '#16a34a' : 'rgba(255,255,255,0.15)',
                color: orderType === 'PARA_LLEVAR' ? '#ffffff' : '#cbd5e1'
              }}
            >
              Para Llevar
            </Button>
            <Button
              fullWidth
              size="small"
              variant={orderType === 'DOMICILIO' ? 'contained' : 'outlined'}
              onClick={() => setOrderType('DOMICILIO')}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                bgcolor: orderType === 'DOMICILIO' ? '#16a34a' : 'transparent',
                borderColor: orderType === 'DOMICILIO' ? '#16a34a' : 'rgba(255,255,255,0.15)',
                color: orderType === 'DOMICILIO' ? '#ffffff' : '#cbd5e1'
              }}
            >
              Domicilio
            </Button>
          </Stack>
        </Box>

        {/* Location Inputs (Table number or Delivery address) */}
        {orderType === 'MESA' && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#84cc16', fontWeight: 700 }}>Número de Mesa *</InputLabel>
              <Select
                value={selectedTableNumber}
                label="Número de Mesa *"
                onChange={e => setSelectedTableNumber(e.target.value)}
                sx={{
                  color: '#ffffff',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  fontWeight: 800,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(132, 204, 22, 0.4)' }
                }}
              >
                {tables.length > 0 ? (
                  tables.map(t => (
                    <MenuItem key={t.id} value={String(t.number)}>
                      Mesa #{t.number} — {t.location} ({t.capacity} puestos)
                    </MenuItem>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <MenuItem key={n} value={String(n)}>
                      Mesa #{n}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>
        )}

        {orderType === 'DOMICILIO' && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Dirección de entrega"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              slotProps={{ input: { sx: { bgcolor: 'rgba(255,255,255,0.06)', color: '#ffffff', borderRadius: '12px' } } }}
              sx={{ '& label': { color: '#84cc16' } }}
            />
          </Box>
        )}

        {/* Customer Name & Phone */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Tu Nombre (Opcional)"
            placeholder="¿A nombre de quién registramos la comanda?"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            slotProps={{ input: { sx: { bgcolor: 'rgba(255,255,255,0.06)', color: '#ffffff', borderRadius: '12px' } } }}
            sx={{ '& label': { color: '#94a3b8' }, mb: orderType !== 'MESA' ? 1.5 : 0 }}
          />
          {orderType !== 'MESA' && (
            <TextField
              fullWidth
              size="small"
              label="Teléfono Celular"
              placeholder="Para confirmar tu pedido"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              slotProps={{ input: { sx: { bgcolor: 'rgba(255,255,255,0.06)', color: '#ffffff', borderRadius: '12px' } } }}
              sx={{ '& label': { color: '#94a3b8' } }}
            />
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 2 }} />

        {/* Cart Item List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
          {cart.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
              <CartIcon sx={{ fontSize: 50, color: '#64748b', mb: 1.5 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#ffffff' }}>
                Tu orden está vacía
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Explora el menú y agrega tus platos favoritos.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {cart.map(item => (
                <Paper
                  key={item.cartId}
                  elevation={0}
                  sx={{
                    p: 1.8,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                        {item.product.name}
                      </Typography>
                      {item.selectedModifiers.length > 0 && (
                        <Typography variant="caption" sx={{ color: '#84cc16', display: 'block', fontWeight: 600 }}>
                          + {item.selectedModifiers.map(m => m.name).join(', ')}
                        </Typography>
                      )}
                      {item.notes && (
                        <Typography variant="caption" sx={{ color: '#fbbf24', fontStyle: 'italic', display: 'block' }}>
                          Nota: {item.notes}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 800, display: 'block', mt: 0.4 }}>
                        ${item.totalPrice.toLocaleString()} COP
                      </Typography>
                    </Box>

                    {/* Quantity Controls & Delete */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                        <IconButton size="small" onClick={() => handleUpdateQuantity(item.cartId, -1)} sx={{ color: '#ffffff', p: 0.3 }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ px: 1, fontWeight: 800, fontSize: '0.85rem' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton size="small" onClick={() => handleUpdateQuantity(item.cartId, 1)} sx={{ color: '#ffffff', p: 0.3 }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <IconButton size="small" onClick={() => handleRemoveItem(item.cartId)} sx={{ color: '#64748b', p: 0.3, '&:hover': { color: '#ef4444' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        {/* Footer Summary & Action Buttons */}
        {cart.length > 0 && (
          <Box sx={{ pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Tip Percentage Selector */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                Propina voluntaria para el equipo de sala:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.6 }}>
                {[0, 5, 10, 15].map(p => (
                  <Chip
                    key={p}
                    label={`${p}%`}
                    size="small"
                    clickable
                    onClick={() => setTipPercent(p)}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 24,
                      bgcolor: tipPercent === p ? '#84cc16' : 'rgba(255,255,255,0.08)',
                      color: tipPercent === p ? '#0f170b' : '#ffffff'
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Totals */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>Subtotal:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>${cartSubtotal.toLocaleString()} COP</Typography>
            </Box>
            {cartTipAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#84cc16' }}>Propina ({tipPercent}%):</Typography>
                <Typography variant="body2" sx={{ color: '#84cc16', fontWeight: 700 }}>${cartTipAmount.toLocaleString()} COP</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Total a Pagar:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#4ade80' }}>${cartTotal.toLocaleString()} COP</Typography>
            </Box>

            {/* Action Buttons */}
            <Stack spacing={1.2}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<CheckIcon />}
                onClick={handleSubmitOrderToKitchen}
                sx={{
                  py: 1.4,
                  borderRadius: '16px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  bgcolor: '#16a34a',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  boxShadow: '0 8px 24px rgba(22, 163, 74, 0.4)',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#15803d' }
                }}
              >
                Enviar Pedido a Cocina ⚡
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="medium"
                startIcon={<WhatsAppIcon sx={{ color: '#22c55e' }} />}
                onClick={handleOrderViaWhatsApp}
                sx={{
                  py: 1.1,
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  borderColor: 'rgba(34, 197, 94, 0.4)',
                  color: '#4ade80',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#22c55e', bgcolor: 'rgba(34, 197, 94, 0.1)' }
                }}
              >
                O pedir vía WhatsApp
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/* ORDER CONFIRMED MODAL                                        */}
      {/* ============================================================ */}
      <Dialog
        open={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#14200f',
              color: '#ffffff',
              borderRadius: '26px',
              border: '1px solid rgba(132, 204, 22, 0.4)',
              p: 2,
              textAlign: 'center'
            }
          }
        }}
      >
        <DialogContent sx={{ pt: 3 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'rgba(74, 222, 128, 0.18)',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(74, 222, 128, 0.3)'
            }}
          >
            <CheckIcon sx={{ fontSize: 44 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', mb: 1 }}>
            ¡Tu orden ha sido enviada! 🎉
          </Typography>

          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2.5, lineHeight: 1.5 }}>
            La campana sonó en la cocina y nuestros chefs han recibido tu comanda.
          </Typography>

          {confirmedOrder && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                mb: 2.5,
                textAlign: 'left'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Orden:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#84cc16' }}>#{confirmedOrder.orderNumber}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Ubicación:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {confirmedOrder.tableId ? `Mesa #${confirmedOrder.tableId}` : confirmedOrder.type === 'DOMICILIO' ? 'A Domicilio' : 'Para Llevar'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Total:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#4ade80' }}>${confirmedOrder.total.toLocaleString()} COP</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Tiempo aprox:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#facc15' }}>15 a 20 minutos</Typography>
              </Box>
            </Paper>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={() => setIsSuccessModalOpen(false)}
            sx={{
              py: 1.2,
              borderRadius: '14px',
              fontWeight: 800,
              bgcolor: '#16a34a',
              textTransform: 'none',
              '&:hover': { bgcolor: '#15803d' }
            }}
          >
            Entendido, ¡gracias!
          </Button>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* WAITER CALL NOTIFICATION SNACKBAR                            */}
      {/* ============================================================ */}
      <Snackbar
        open={Boolean(waiterCallNotice)}
        autoHideDuration={6000}
        onClose={() => setWaiterCallNotice(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setWaiterCallNotice(null)}
          severity="success"
          sx={{
            width: '100%',
            fontWeight: 800,
            bgcolor: '#16a34a',
            color: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 163, 74, 0.4)',
            '& .MuiAlert-icon': { color: '#ffffff' }
          }}
        >
          {waiterCallNotice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
