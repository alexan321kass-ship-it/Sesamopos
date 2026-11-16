import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Divider,
  List,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TextField,
  MenuItem,
  Paper,
  Stack,
  InputAdornment,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutlined as DeleteIcon,
  Liquor as BarIcon,
  TableRestaurant as TableIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Restaurant as FoodIcon,
  ReceiptLong as ReceiptIcon,
  EditNote as NoteIcon,
  CleaningServices as ClearCartIcon,
  Check as CheckIcon,
  RoomService as KitchenIcon,
  AttachMoney as CashIcon,
  TwoWheeler as DeliveryDiningIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { usePosStore } from '../store/posStore';
import { useAuthStore } from '../store/authStore';
import { mockApi } from '../services/mockApi';
import { Category, Product, OrderItemModifier, ModifierOption, ModifierGroup, Order, Table, Customer, InventoryItem, Recipe } from '../types';
import { playKitchenBellSound } from '../utils/audioAlerts';
import BillingModal from '../components/BillingModal';

const QUICK_KITCHEN_NOTES = [
  'Sin cebolla',
  'Sin picante',
  'Salsa aparte',
  'Término medio',
  'Bien asado',
  'Poco picante',
  'Para llevar',
  'Bebida bien fría'
];

export default function PosScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<OrderItemModifier[]>([]);
  const [productNotes, setProductNotes] = useState('');
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

  // Venta directa en barra & asignación de mesa states
  const [barPromptOpen, setBarPromptOpen] = useState(false);
  const [tableSelectModalOpen, setTableSelectModalOpen] = useState(false);
  const [tableSelectZone, setTableSelectZone] = useState<string>('ALL');
  const [pendingAction, setPendingAction] = useState<'KITCHEN' | 'BILLING' | null>(null);
  const [hasPromptedForBar, setHasPromptedForBar] = useState(false);
  const [isSubmittingKitchen, setIsSubmittingKitchen] = useState(false);

  // Responsive Mobile/Tablet POS View
  const [mobileView, setMobileView] = useState<'catalog' | 'ticket'>('catalog');

  // Gestión de Domicilios en POS
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [deliveryForm, setDeliveryForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    city: 'Medellín',
    zone: 'Salón / Centro',
    deliveryFee: 5000,
    paymentMethod: 'EFECTIVO' as 'EFECTIVO' | 'DATAFONO' | 'TRANSFERENCIA',
    cashAmountPaidWith: 50000,
    notes: '',
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const posStore = usePosStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadData();

    const handleInvChange = () => {
      mockApi.inventory.getAll().then(setInventory);
      mockApi.recipes.getAll().then(setRecipes);
    };
    window.addEventListener('sesamo_inventory_updated', handleInvChange);
    window.addEventListener('sesamo_recipes_updated', handleInvChange);

    return () => {
      window.removeEventListener('sesamo_inventory_updated', handleInvChange);
      window.removeEventListener('sesamo_recipes_updated', handleInvChange);
    };
  }, []);

  useEffect(() => {
    if (!selectedCategoryId || selectedCategoryId === 'ALL') {
      mockApi.products.getAll().then(setProducts);
    } else {
      mockApi.products.getByCategory(selectedCategoryId).then(setProducts);
    }
  }, [selectedCategoryId]);

  const loadData = async () => {
    const [cats, tbls, custList, invList, recList] = await Promise.all([
      mockApi.categories.getAll(),
      mockApi.tables.getAll(),
      mockApi.customers.getAll(),
      mockApi.inventory.getAll(),
      mockApi.recipes.getAll(),
    ]);
    setCategories(cats);
    setTables(tbls);
    setCustomers(custList || []);
    setInventory(invList || []);
    setRecipes(recList || []);
    if (!selectedCategoryId) {
      setSelectedCategoryId('ALL');
    }
  };

  // Cálculo de stock disponible real por receta técnica o insumo directo
  const getProductAvailableStock = (product: Product): { stock: number; isUntracked: boolean; limitingName?: string } => {
    const recipe = recipes.find(r => 
      r.productId === product.id || 
      (r.productName && r.productName.toLowerCase().trim() === product.name.toLowerCase().trim())
    );

    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
      let minPortions = Infinity;
      let limiting = '';

      for (const ing of recipe.ingredients) {
        const invItem = inventory.find(i => i.id === ing.inventoryItemId || i.id === `inv-${ing.inventoryItemId}`);
        if (!invItem) continue;
        const reqQty = Number(ing.quantity) || 0;
        if (reqQty > 0) {
          const possible = Math.floor((invItem.currentStock || 0) / reqQty);
          if (possible < minPortions) {
            minPortions = possible;
            limiting = `${invItem.name} (${invItem.currentStock} ${invItem.unit})`;
          }
        }
      }

      if (minPortions !== Infinity) {
        return { stock: Math.max(0, minPortions), isUntracked: false, limitingName: limiting };
      }
    }

    // Si no tiene receta técnica con ingredientes, buscar insumo directo en inventario
    const pNameLower = product.name.toLowerCase().trim();
    const directInv = inventory.find(i =>
      i.id === product.id ||
      (i.code && product.sku && i.code.toLowerCase() === product.sku.toLowerCase()) ||
      i.name.toLowerCase().trim() === pNameLower ||
      pNameLower.includes(i.name.toLowerCase().trim()) ||
      i.name.toLowerCase().trim().includes(pNameLower)
    );

    if (directInv) {
      return { stock: Math.max(0, Math.floor(directInv.currentStock || 0)), isUntracked: false, limitingName: `${directInv.name} (${directInv.currentStock} ${directInv.unit})` };
    }

    return { stock: 999, isUntracked: true };
  };

  const handleProductClick = (product: Product) => {
    const stockInfo = getProductAvailableStock(product);
    const inCart = getProductCartCount(product.id);

    if (!stockInfo.isUntracked && stockInfo.stock <= 0) {
      alert(`⚠️ Producto Agotado:\n\n"${product.name}" no tiene existencias en bodega.\n(${stockInfo.limitingName || 'Stock 0'})\n\nNo es posible agregarlo.`);
      return;
    }

    if (!stockInfo.isUntracked && inCart + 1 > stockInfo.stock) {
      alert(`⚠️ Límite de Inventario Superado:\n\nSolo dispones de ${stockInfo.stock} unidades de "${product.name}" en inventario.\nYa tienes ${inCart} agregadas en la comanda actual.`);
      return;
    }

    if (!posStore.currentTableId && !posStore.editingOrderId && !hasPromptedForBar && posStore.items.length === 0) {
      setHasPromptedForBar(true);
      setBarPromptOpen(true);
    }

    if (product.modifiers && product.modifiers.length > 0) {
      setSelectedProduct(product);
      setSelectedModifiers([]);
      setProductNotes('');
    } else {
      posStore.addItem(product, 1, []);
    }
  };
  const handleModifierChange = (group: ModifierGroup, option: ModifierOption, checked: boolean) => {
    if (checked) {
      setSelectedModifiers([...selectedModifiers, {
        modifierGroupId: group.id,
        modifierOptionId: option.id,
        name: option.name,
        price: option.price,
        inventoryItemId: option.inventoryItemId,
        quantity: option.quantity,
        unit: option.unit,
      }]);
    } else {
      setSelectedModifiers(selectedModifiers.filter(m => m.modifierOptionId !== option.id));
    }
  };

  const handleAddWithModifiers = () => {
    if (selectedProduct) {
      const stockInfo = getProductAvailableStock(selectedProduct);
      const inCart = getProductCartCount(selectedProduct.id);

      if (!stockInfo.isUntracked && (inCart + 1) > stockInfo.stock) {
        alert(`⚠️ Límite de Inventario:\n\nSolo quedan ${stockInfo.stock} unidades disponibles de "${selectedProduct.name}" (${stockInfo.limitingName || 'Bodega'}).\nNo es posible agregar más.`);
        return;
      }

      if (!posStore.currentTableId && !posStore.editingOrderId && !hasPromptedForBar && posStore.items.length === 0) {
        setHasPromptedForBar(true);
        setBarPromptOpen(true);
      }
      posStore.addItem(selectedProduct, 1, selectedModifiers, productNotes);
      setSelectedProduct(null);
    }
  };

  const handleIncreaseItemQty = (item: any) => {
    const prod = products.find(p => p.id === item.productId) || ({ id: item.productId, name: item.productName } as any);
    const stockInfo = getProductAvailableStock(prod);
    const currentInCart = getProductCartCount(item.productId);

    if (!stockInfo.isUntracked && (currentInCart + 1) > stockInfo.stock) {
      alert(`⚠️ Stock Máximo de Bodega Alcanzado:\n\nNo puedes pedir más de ${stockInfo.stock} unidades de "${item.productName}".\nExistencias actuales en inventario: ${stockInfo.stock} (${stockInfo.limitingName || 'Insumo'}).`);
      return;
    }

    posStore.updateQuantity(item.id, item.quantity + 1);
  };

  const handleToggleQuickNote = (note: string) => {
    if (productNotes.includes(note)) {
      setProductNotes(prev => prev.replace(note, '').replace(/,\s*,/g, ',').trim());
    } else {
      setProductNotes(prev => prev ? `${prev}, ${note}` : note);
    }
  };

  const totals = posStore.getTotals();

  // Cuenta de ítems en el carrito por producto
  const getProductCartCount = (productId: string) => {
    return posStore.items
      .filter(i => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  // Filtrado de productos por búsqueda
  const displayedProducts = products.filter(p => {
    if (!p.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = p.name.toLowerCase().includes(q);
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
      const descMatch = p.description ? p.description.toLowerCase().includes(q) : false;
      return nameMatch || skuMatch || descMatch;
    }
    return true;
  });

  // Vaciar carrito con confirmación
  const handleClearCart = () => {
    if (posStore.items.length === 0) return;
    if (window.confirm('¿Deseas vaciar todos los productos de la comanda actual?')) {
      posStore.clearOrder();
      setHasPromptedForBar(false);
    }
  };

  // Handlers para Venta en Barra, Selección de Mesa y Domicilios
  const handleConfirmBarSale = async () => {
    posStore.setTable('BARRA');
    setBarPromptOpen(false);
    if (pendingAction === 'KITCHEN') {
      setPendingAction(null);
      await executeSendToKitchen('BARRA');
    } else if (pendingAction === 'BILLING') {
      setPendingAction(null);
      await executeOpenBilling('BARRA');
    }
  };

  const handleChooseDelivery = () => {
    posStore.setTable('DOMICILIO');
    setBarPromptOpen(false);
    setDeliveryModalOpen(true);
  };

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find(cust => cust.id === custId);
    if (c) {
      setDeliveryForm(prev => ({
        ...prev,
        customerName: c.name,
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || 'Medellín',
        zone: c.zone || prev.zone
      }));
    }
  };

  const handleSaveDeliveryForm = async (autoSendKitchen = false) => {
    if (!deliveryForm.customerName.trim()) {
      alert('Por favor ingresa el nombre del cliente para el domicilio');
      return;
    }
    if (!deliveryForm.address.trim()) {
      alert('Por favor ingresa la dirección de entrega');
      return;
    }
    posStore.setDeliveryInfo({
      customerName: deliveryForm.customerName,
      customerPhone: deliveryForm.phone,
      deliveryAddress: deliveryForm.address,
      deliveryCity: deliveryForm.city,
      deliveryZone: deliveryForm.zone,
      deliveryFee: Number(deliveryForm.deliveryFee) || 5000,
      paymentMethod: deliveryForm.paymentMethod,
      cashAmountPaidWith: deliveryForm.cashAmountPaidWith,
      deliveryNotes: deliveryForm.notes
    });
    posStore.setTable('DOMICILIO');
    setDeliveryModalOpen(false);

    if (autoSendKitchen || pendingAction === 'KITCHEN') {
      setPendingAction(null);
      await executeSendToKitchen('DOMICILIO');
    } else if (pendingAction === 'BILLING') {
      setPendingAction(null);
      await executeOpenBilling('DOMICILIO');
    }
  };

  const handleChooseTable = () => {
    setBarPromptOpen(false);
    setTableSelectModalOpen(true);
  };

  const handleSelectTableFromModal = async (selectedTableId: string) => {
    posStore.setTable(selectedTableId);
    setTableSelectModalOpen(false);
    if (pendingAction === 'KITCHEN') {
      setPendingAction(null);
      await executeSendToKitchen(selectedTableId);
    } else if (pendingAction === 'BILLING') {
      setPendingAction(null);
      await executeOpenBilling(selectedTableId);
    }
  };

  const handleCancelPrompt = () => {
    setBarPromptOpen(false);
    setPendingAction(null);
  };

  const handleDecideLater = () => {
    setBarPromptOpen(false);
  };

  const handleSendToKitchen = async () => {
    if (posStore.items.length === 0 || isSubmittingKitchen) return;
    if (!posStore.editingOrderId) {
      const confirmUnpaid = window.confirm(
        '⚠️ AVISO DE AUTOSERVICIO:\n\nEl restaurante funciona en modalidad Autoservicio (primero se cobra y luego pasa el pedido a cocina).\n\n¿Deseas enviar esta comanda a cocina SIN registrar el cobro previo?'
      );
      if (!confirmUnpaid) return;
    }
    if (!posStore.currentTableId && !posStore.editingOrderId) {
      setPendingAction('KITCHEN');
      setBarPromptOpen(true);
      return;
    }
    await executeSendToKitchen(posStore.currentTableId);
  };

  const executeSendToKitchen = async (tableId: string | null) => {
    if (posStore.items.length === 0 || isSubmittingKitchen) return;

    // Validación estricta previa de existencias en bodega
    const stockCheck = mockApi.inventory.checkStockAvailability(posStore.items);
    if (!stockCheck.valid) {
      const errorList = stockCheck.errors
        .map(e => `• ${e.productName}: pides ${e.requested}, disponible ${e.available} (${e.missingIngredient || 'Stock'})`)
        .join('\n');
      alert(`❌ No es posible enviar el pedido por falta de inventario:\n\n${errorList}\n\nPor favor ajusta las cantidades en la comanda antes de continuar.`);
      return;
    }

    setIsSubmittingKitchen(true);
    try {
      const isDelivery = tableId === 'DOMICILIO' || tableId === 'Domicilio';
      const isBarSale = tableId === 'BARRA' || tableId === 'Barra';

      if (isDelivery) {
        if (!deliveryForm.address.trim() || !deliveryForm.customerName.trim()) {
          setPendingAction('KITCHEN');
          setDeliveryModalOpen(true);
          return;
        }

        const deliveryCustomer: Customer = {
          id: selectedCustomerId || `cust-${Date.now()}`,
          name: deliveryForm.customerName.trim(),
          phone: deliveryForm.phone.trim() || '3000000000',
          address: deliveryForm.address.trim(),
          city: deliveryForm.city || 'Medellín',
          zone: deliveryForm.zone || 'Salón / Centro',
          loyaltyPoints: 0,
          totalOrders: 1,
        };

        const deliveryFee = Number(deliveryForm.deliveryFee) || 5000;
        const total = totals.subtotal + deliveryFee;

        const newDelivery = await mockApi.deliveries.create({
          orderNumber: `DOM-${Math.floor(1000 + Math.random() * 9000)}`,
          customer: deliveryCustomer,
          deliveryAddress: deliveryForm.address.trim(),
          deliveryCity: deliveryForm.city || 'Medellín',
          deliveryZone: deliveryForm.zone || 'Salón / Centro',
          deliveryFee,
          subtotal: totals.subtotal,
          discount: 0,
          tax: totals.tax,
          total,
          items: posStore.items,
          status: 'EN_PREPARACION',
          deliveryStatus: 'PENDIENTE',
          paymentMethod: deliveryForm.paymentMethod || 'EFECTIVO',
          cashAmountPaidWith: deliveryForm.cashAmountPaidWith,
          deliveryNotes: deliveryForm.notes,
          waiterId: user?.id || '2',
          waiterName: user?.name || 'Carlos Ruiz'
        });

        // Aseguramos la reproducción del timbre de cocina
        playKitchenBellSound();

        alert(`🛵 ¡Pedido a Domicilio #${newDelivery.orderNumber} enviado a cocina exitosamente! 🔔🍳\n\n👤 Cliente: ${deliveryCustomer.name}\n📍 Dirección: ${deliveryCustomer.address}\n💵 Total: $${total.toLocaleString()} COP (${deliveryForm.paymentMethod})\n\n¡El timbre sonoro de cocina ha sonado!`);

        posStore.clearOrder();
        setHasPromptedForBar(false);
        setDeliveryModalOpen(false);
        return;
      }

      if (posStore.editingOrderId) {
        const hasNewAdditions = posStore.items.some(i => !i.isDelivered);
        const newStatus = hasNewAdditions ? 'EN_PREPARACION' : ((posStore.editingOrderStatus as any) || 'EN_PREPARACION');

        await mockApi.orders.updateOrder(posStore.editingOrderId, {
          items: posStore.items,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          status: newStatus,
          waiterId: user?.id || '2',
          waiterName: user?.name || 'Carlos Ruiz'
        });

        if (tableId && !isBarSale) {
          try {
            await mockApi.tables.updateStatus(tableId, 'OCUPADA');
          } catch (e) {}
        }

        if (hasNewAdditions) {
          alert('¡Adición enviada a cocina! 🍳🔥\nLos nuevos productos quedaron marcados para preparar y los anteriores como ya servidos.');
        } else {
          alert('¡Pedido editado y actualizado en cocina exitosamente! 🍳');
        }
      } else {
        await mockApi.orders.create({
          orderNumber: Math.floor(1000 + Math.random() * 9000).toString(),
          items: posStore.items,
          subtotal: totals.subtotal,
          discount: 0,
          tax: totals.tax,
          total: totals.total,
          status: 'CREADO',
          type: isBarSale ? 'BARRA' : 'MESA',
          tableId: isBarSale ? 'Barra' : (tableId || undefined),
          waiterId: user?.id || '2',
          waiterName: user?.name || 'Carlos Ruiz'
        });
        alert(`Pedido ${isBarSale ? 'de Barra' : ''} enviado a cocina exitosamente 🍳`);
      }
      posStore.clearOrder();
      setHasPromptedForBar(false);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Error al guardar/enviar pedido');
    } finally {
      setIsSubmittingKitchen(false);
    }
  };

  const handleOpenBilling = async () => {
    if (posStore.items.length === 0) return;
    if (!posStore.currentTableId && !posStore.editingOrderId) {
      setPendingAction('BILLING');
      setBarPromptOpen(true);
      return;
    }
    await executeOpenBilling(posStore.currentTableId);
  };

  const executeOpenBilling = async (tableId: string | null) => {
    if (posStore.items.length === 0) return;

    // Validación estricta previa de existencias en bodega
    const stockCheck = mockApi.inventory.checkStockAvailability(posStore.items);
    if (!stockCheck.valid) {
      const errorList = stockCheck.errors
        .map(e => `• ${e.productName}: pides ${e.requested}, disponible ${e.available} (${e.missingIngredient || 'Stock'})`)
        .join('\n');
      alert(`❌ No es posible proceder al cobro por falta de inventario:\n\n${errorList}\n\nPor favor ajusta las cantidades en la comanda antes de continuar.`);
      return;
    }

    const isDelivery = tableId === 'DOMICILIO' || tableId === 'Domicilio';
    const isBarSale = tableId === 'BARRA' || tableId === 'Barra';

    if (isDelivery) {
      if (!deliveryForm.address.trim() || !deliveryForm.customerName.trim()) {
        setPendingAction('BILLING');
        setDeliveryModalOpen(true);
        return;
      }

      const deliveryFee = Number(deliveryForm.deliveryFee) || 5000;
      const total = totals.subtotal + deliveryFee;

      const deliveryCustomer: Customer = {
        id: selectedCustomerId || `cust-${Date.now()}`,
        name: deliveryForm.customerName.trim(),
        phone: deliveryForm.phone.trim() || '3000000000',
        address: deliveryForm.address.trim(),
        city: deliveryForm.city || 'Medellín',
        zone: deliveryForm.zone || 'Salón / Centro',
        loyaltyPoints: 0,
        totalOrders: 1,
      };

      try {
        const createdDelivery = await mockApi.deliveries.create({
          orderNumber: `DOM-${Math.floor(1000 + Math.random() * 9000)}`,
          customer: deliveryCustomer,
          deliveryAddress: deliveryForm.address.trim(),
          deliveryCity: deliveryForm.city || 'Medellín',
          deliveryZone: deliveryForm.zone || 'Salón / Centro',
          deliveryFee,
          subtotal: totals.subtotal,
          discount: 0,
          tax: totals.tax,
          total,
          items: posStore.items,
          status: 'EN_PREPARACION',
          deliveryStatus: 'PENDIENTE',
          paymentMethod: deliveryForm.paymentMethod || 'EFECTIVO',
          cashAmountPaidWith: deliveryForm.cashAmountPaidWith,
          deliveryNotes: deliveryForm.notes,
          waiterId: user?.id || '2',
          waiterName: user?.name || 'Carlos Ruiz'
        });

        playKitchenBellSound();
        setBillingOrder(createdDelivery);
        setBillingModalOpen(true);
        posStore.clearOrder();
        setHasPromptedForBar(false);
        setDeliveryModalOpen(false);
      } catch (e) {
        console.error(e);
        alert('Error al procesar el domicilio');
      }
      return;
    }

    const tempOrder: Order = {
      id: posStore.editingOrderId || `draft-${Date.now()}`,
      orderNumber: posStore.editingOrderNumber || Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: Date.now(),
      items: posStore.items,
      subtotal: totals.subtotal,
      discount: 0,
      tax: totals.tax,
      total: totals.total,
      status: 'CREADO',
      type: isBarSale ? 'BARRA' : 'MESA',
      tableId: isBarSale ? 'Barra' : (tableId || undefined),
      waiterId: user?.id || '2',
      waiterName: user?.name || 'Carlos Ruiz'
    };

    // No creamos la orden en base de datos al simplemente abrir el modal.
    // Solo se creará/actualizará cuando el pago sea procesado efectivamente en BillingModal.
    setBillingOrder(tempOrder);
    setBillingModalOpen(true);
  };

  // Zonas de mesas para el modal de asignación
  const availableTableZones = ['ALL', ...Array.from(new Set(tables.map(t => t.location || 'Salón Principal')))];

  // Cálculo de precio en modal de personalización
  const currentModifiersPrice = selectedModifiers.reduce((acc, m) => acc + (m.price || 0), 0);
  const modalUnitPrice = (selectedProduct?.price || 0) + currentModifiersPrice;
  const totalCartUnits = posStore.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: 'calc(100vh - 88px)' },
        minHeight: { xs: 'calc(100vh - 120px)', md: 'auto' },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        pb: { xs: 8, md: 1 },
        position: 'relative'
      }}
    >
      {/* Zona Izquierda/Centro: Catálogo de Productos y Filtros */}
      <Box
        sx={{
          flex: 1,
          display: { xs: mobileView === 'catalog' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        
        {/* Barra Superior: Buscador y Categorías */}
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)', bgcolor: '#ffffff' }}>
          {/* Buscador de productos en tiempo real */}
          <Box sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar por nombre, código SKU o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                  sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontWeight: 600 }
                }
              }}
            />
          </Box>

          {/* Chips horizontales de categorías con conteo */}
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
            {/* Chip Todos */}
            <Chip
              label={`✨ Todos (${products.length})`}
              onClick={() => setSelectedCategoryId('ALL')}
              sx={{
                fontWeight: 800,
                fontSize: '0.78rem',
                borderRadius: '12px',
                cursor: 'pointer',
                bgcolor: selectedCategoryId === 'ALL' ? '#1e290b' : '#f8fafc',
                color: selectedCategoryId === 'ALL' ? '#ffffff' : '#475569',
                border: `1px solid ${selectedCategoryId === 'ALL' ? '#1e290b' : '#e2e8f0'}`,
                transition: 'all 0.15s ease',
                flexShrink: 0,
                '&:hover': { bgcolor: selectedCategoryId === 'ALL' ? '#0f172a' : '#f1f5f9' }
              }}
            />

            {/* Categorías dinámicas */}
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    bgcolor: isSelected ? '#1e290b' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: `1px solid ${isSelected ? '#1e290b' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    '&:hover': { bgcolor: isSelected ? '#0f172a' : '#f1f5f9' }
                  }}
                />
              );
            })}
          </Box>
        </Paper>
        
        {/* Grilla Táctil de Productos */}
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, pb: 2 }}>
          {displayedProducts.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '20px', border: '1px dashed #cbd5e1', bgcolor: '#ffffff', mt: 2 }}>
              <FoodIcon sx={{ fontSize: 52, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569' }}>
                No se encontraron productos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto', mt: 0.5 }}>
                No hay platos ni bebidas que coincidan con &quot;{searchQuery}&quot;.
              </Typography>
              {searchQuery && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSearchQuery('')}
                  sx={{ mt: 2, borderRadius: '10px', fontWeight: 700 }}
                >
                  Limpiar búsqueda
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={1.8}>
              {displayedProducts.map((product) => {
                const inCartCount = getProductCartCount(product.id);
                const hasModifiers = Boolean(product.modifiers && product.modifiers.length > 0);
                const stockInfo = getProductAvailableStock(product);
                const isOutOfStock = !product.isAvailable || (!stockInfo.isUntracked && stockInfo.stock <= 0);

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        borderRadius: '20px',
                        border: inCartCount > 0 ? '2.5px solid #16a34a' : '1px solid #e2e8f0',
                        overflow: 'hidden',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        bgcolor: '#ffffff',
                        boxShadow: inCartCount > 0 ? '0 6px 18px rgba(22, 163, 74, 0.18)' : '0 2px 8px rgba(0,0,0,0.03)',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
                          borderColor: inCartCount > 0 ? '#15803d' : '#cbd5e1'
                        }
                      }}
                    >
                      <CardActionArea 
                        onClick={() => handleProductClick(product)}
                        disabled={isOutOfStock}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          justifyContent: 'flex-start'
                        }}
                      >
                        {/* Cabecera Visual con Imagen o Placeholder Gastronómico */}
                        <Box sx={{ position: 'relative', height: 135, width: '100%', overflow: 'hidden' }}>
                          {product.imageUrl ? (
                            <CardMedia
                              component="img"
                              height="135"
                              image={product.imageUrl}
                              alt={product.name}
                              sx={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                height: 135,
                                width: '100%',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9a3412'
                              }}
                            >
                              <FoodIcon sx={{ fontSize: 40, opacity: 0.8, mb: 0.5 }} />
                              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                                Especial Sésamo
                              </Typography>
                            </Box>
                          )}

                          {/* Pill Flotante de Precio (Glassmorphism de Alto Contraste) */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 10,
                              right: 10,
                              bgcolor: 'rgba(15, 23, 42, 0.88)',
                              backdropFilter: 'blur(8px)',
                              color: '#ffffff',
                              px: 1.4,
                              py: 0.5,
                              borderRadius: '12px',
                              fontWeight: 900,
                              fontSize: '0.92rem',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
                            }}
                          >
                            ${product.price.toLocaleString()}
                          </Box>

                          {/* Pill Flotante de Stock Disponible */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 10,
                              left: 10,
                              bgcolor: isOutOfStock ? '#dc2626' : stockInfo.stock <= 5 ? '#ea580c' : 'rgba(15, 23, 42, 0.85)',
                              backdropFilter: 'blur(8px)',
                              color: '#ffffff',
                              px: 1.2,
                              py: 0.4,
                              borderRadius: '10px',
                              fontWeight: 900,
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                          >
                            {isOutOfStock ? '🔴 Agotado' : stockInfo.isUntracked ? '🟢 Disponible' : `📦 ${stockInfo.stock} disp.`}
                          </Box>

                          {/* Badge de cantidad agregada a la comanda */}
                          {inCartCount > 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                bgcolor: '#16a34a',
                                color: '#ffffff',
                                px: 1.2,
                                py: 0.4,
                                borderRadius: '10px',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.45)'
                              }}
                            >
                              <CheckIcon sx={{ fontSize: 15 }} />
                              {inCartCount} en comanda
                            </Box>
                          )}

                          {/* Badge si tiene Modificadores */}
                          {hasModifiers && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                bgcolor: 'rgba(255,255,255,0.95)',
                                color: '#0284c7',
                                px: 1,
                                py: 0.3,
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                border: '1px solid #bae6fd'
                              }}
                            >
                              ⚙️ Opciones
                            </Box>
                          )}

                          {/* Overlay Agotado */}
                          {isOutOfStock && (
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'rgba(0,0,0,0.68)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                                p: 1,
                              }}
                            >
                              <Chip
                                label="Agotado (0 Stock)"
                                size="small"
                                color="error"
                                sx={{ fontWeight: 900, borderRadius: '8px' }}
                              />
                              {stockInfo.limitingName && (
                                <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.72rem', textAlign: 'center' }}>
                                  {stockInfo.limitingName}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Detalle del Producto */}
                        <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 900,
                                color: '#1e290b',
                                fontSize: '1.02rem',
                                lineHeight: 1.25,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {product.name}
                            </Typography>
                            {product.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mt: 0.5,
                                  fontSize: '0.84rem',
                                  lineHeight: 1.35
                                }}
                              >
                                {product.description}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                            <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 800, fontSize: '0.85rem' }}>
                              + Agregar
                            </Typography>
                            {product.calories && (
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                                {product.calories} kcal
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Zona Derecha: Ticket / Carrito de Comanda */}
      <Card
        elevation={0}
        sx={{
          width: { xs: '100%', md: 400, lg: 430 },
          display: { xs: mobileView === 'ticket' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          borderRadius: '22px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
          bgcolor: '#ffffff'
        }}
      >
        {/* Cabecera del Ticket */}
        <Box
          sx={{
            p: 2,
            bgcolor: posStore.editingOrderId ? '#ea580c' : '#1e290b',
            color: '#ffffff',
            borderBottom: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {/* Botón Volver al Catálogo en Móvil */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.5 }}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setMobileView('catalog')}
              sx={{
                color: '#ffffff',
                bgcolor: 'rgba(255,255,255,0.18)',
                fontWeight: 800,
                borderRadius: '10px',
                textTransform: 'none',
                py: 0.6,
                px: 1.5,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
              }}
            >
              ← Volver al Catálogo de Productos
            </Button>
          </Box>

          {/* Título de comanda y vaciar carrito */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon sx={{ fontSize: 22, color: posStore.editingOrderId ? '#fef08a' : '#84cc16' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: -0.3, lineHeight: 1 }}>
                {posStore.editingOrderId
                  ? `EDITANDO #${posStore.editingOrderNumber || posStore.editingOrderId}`
                  : 'COMANDA ACTUAL'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              {posStore.items.length > 0 && (
                <>
                  <Chip
                    size="small"
                    label={`${posStore.items.reduce((acc, i) => acc + i.quantity, 0)} ítems`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 800, fontSize: '0.72rem' }}
                  />
                  <Tooltip title="Vaciar comanda">
                    <IconButton
                      size="small"
                      onClick={handleClearCart}
                      sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.2)' } }}
                    >
                      <ClearCartIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          {/* Selector Interactivo de Destino (Mesa vs Barra vs Domicilio) */}
          <Box sx={{ mt: 1.2, p: 1.2, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {posStore.currentTableId === 'DOMICILIO' ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ p: 0.8, bgcolor: 'rgba(124, 58, 237, 0.25)', borderRadius: '10px', color: '#c4b5fd' }}>
                    <DeliveryDiningIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#ddd6fe', lineHeight: 1.1 }}>
                      🛵 Pedido a Domicilio
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.68rem', display: 'block' }}>
                      {deliveryForm.address ? `${deliveryForm.customerName || 'Cliente'} • ${deliveryForm.address}` : '⚠️ Falta configurar dirección de entrega'}
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.6}>
                  <Button
                    size="small"
                    onClick={() => setDeliveryModalOpen(true)}
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(124, 58, 237, 0.45)',
                      border: '1px solid rgba(196, 181, 253, 0.4)',
                      borderRadius: '8px',
                      px: 1,
                      '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.65)' }
                    }}
                  >
                    Datos Entrega ⚙️
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setTableSelectModalOpen(true)}
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      px: 0.8,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }
                    }}
                  >
                    Mesa
                  </Button>
                  <Button
                    size="small"
                    onClick={() => posStore.setTable('BARRA')}
                    sx={{
                      color: '#fef08a',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 700,
                      bgcolor: 'rgba(245, 158, 11, 0.15)',
                      borderRadius: '8px',
                      px: 0.8,
                      '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.25)' }
                    }}
                  >
                    Barra
                  </Button>
                </Stack>
              </Box>
            ) : posStore.currentTableId === 'BARRA' || posStore.currentTableId === 'Barra' ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ p: 0.8, bgcolor: 'rgba(245, 158, 11, 0.2)', borderRadius: '10px', color: '#fef08a' }}>
                    <BarIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#fef08a', lineHeight: 1.1 }}>
                      Venta Directa en Barra
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                      Consumo en mostrador
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.6}>
                  <Button
                    size="small"
                    onClick={() => setTableSelectModalOpen(true)}
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      px: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                    }}
                  >
                    Mesa
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      posStore.setTable('DOMICILIO');
                      setDeliveryModalOpen(true);
                    }}
                    sx={{
                      color: '#c4b5fd',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(124, 58, 237, 0.25)',
                      borderRadius: '8px',
                      px: 1,
                      '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.4)' }
                    }}
                  >
                    🛵 Domicilio
                  </Button>
                </Stack>
              </Box>
            ) : posStore.currentTableId ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ p: 0.8, bgcolor: 'rgba(34, 197, 94, 0.2)', borderRadius: '10px', color: '#bbf7d0' }}>
                    <TableIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#bbf7d0', lineHeight: 1.1 }}>
                      Mesa {tables.find(t => t.id === posStore.currentTableId || String(t.number) === String(posStore.currentTableId))?.number || posStore.currentTableId}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                      {tables.find(t => t.id === posStore.currentTableId || String(t.number) === String(posStore.currentTableId))?.location || 'Salón Principal'}
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.6}>
                  <Button
                    size="small"
                    onClick={() => setTableSelectModalOpen(true)}
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      px: 0.8,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }
                    }}
                  >
                    Cambiar
                  </Button>
                  <Button
                    size="small"
                    onClick={() => posStore.setTable('BARRA')}
                    sx={{
                      color: '#fef08a',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(245, 158, 11, 0.15)',
                      borderRadius: '8px',
                      px: 0.8,
                      '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.25)' }
                    }}
                  >
                    Barra
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      posStore.setTable('DOMICILIO');
                      setDeliveryModalOpen(true);
                    }}
                    sx={{
                      color: '#c4b5fd',
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 800,
                      bgcolor: 'rgba(124, 58, 237, 0.25)',
                      borderRadius: '8px',
                      px: 0.8,
                      '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.4)' }
                    }}
                  >
                    🛵 Domicilio
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#fed7aa', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    ⚠️ Sin destino asignado
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                    Selecciona:
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.8 }}>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<TableIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setTableSelectModalOpen(true)}
                    sx={{
                      bgcolor: '#84cc16',
                      color: '#1e290b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      borderRadius: '8px',
                      py: 0.5,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#65a30d' }
                    }}
                  >
                    Mesa
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<BarIcon sx={{ fontSize: 14 }} />}
                    onClick={() => posStore.setTable('BARRA')}
                    sx={{
                      bgcolor: '#f59e0b',
                      color: '#1e290b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      borderRadius: '8px',
                      py: 0.5,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#d97706' }
                    }}
                  >
                    Barra
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<DeliveryDiningIcon sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      posStore.setTable('DOMICILIO');
                      setDeliveryModalOpen(true);
                    }}
                    sx={{
                      bgcolor: '#7c3aed',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      borderRadius: '8px',
                      py: 0.5,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#6d28d9' }
                    }}
                  >
                    Domicilio
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Lista de Ítems del Ticket */}
        <List sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          {posStore.items.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>
              <ReceiptIcon sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#64748b' }}>
                Comanda vacía
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', maxWidth: 220, mx: 'auto', mt: 0.5 }}>
                Toca cualquier plato o bebida del menú para agregarlo al pedido.
              </Typography>
            </Box>
          ) : (
            posStore.items.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 1.4,
                  mb: 1.2,
                  borderRadius: '14px',
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f1f5f9' }
                }}
              >
                {/* Fila 1: Nombre y Total de la Línea */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.4 }}>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
                    {item.productName}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#0f172a' }}>
                    ${item.totalPrice.toLocaleString()}
                  </Typography>
                </Box>

                {/* Modificadores / Extras */}
                {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', fontWeight: 600, mb: 0.3 }}>
                    + {item.modifiers.map(m => m.name).join(', ')}
                  </Typography>
                )}

                {/* Notas de cocina */}
                {item.notes && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <NoteIcon sx={{ fontSize: 13, color: '#ea580c' }} />
                    <Typography variant="caption" sx={{ color: '#ea580c', fontStyle: 'italic', fontWeight: 700 }}>
                      Nota: {item.notes}
                    </Typography>
                  </Box>
                )}

                {/* Controles de Cantidad Táctiles */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 0.8, borderTop: '1px dashed #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        if (item.quantity > 1) {
                          posStore.updateQuantity(item.id, item.quantity - 1);
                        } else {
                          posStore.removeItem(item.id);
                        }
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' }
                      }}
                    >
                      <RemoveIcon sx={{ fontSize: 14 }} />
                    </IconButton>

                    <Typography sx={{ fontWeight: 900, minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>
                      {item.quantity}
                    </Typography>

                    <IconButton 
                      size="small" 
                      onClick={() => handleIncreaseItemQty(item)}
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        '&:hover': { bgcolor: '#f0fdf4', color: '#16a34a' }
                      }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                    </IconButton>

                    <Typography variant="caption" sx={{ color: '#64748b', ml: 0.5 }}>
                      ${item.unitPrice.toLocaleString()} c/u
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => posStore.removeItem(item.id)}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Paper>
            ))
          )}
        </List>
        
        {/* Caja de Totales y Botones de Acción */}
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          {/* Subtotal e Impuestos */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
              Subtotal:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155' }}>
              ${totals.subtotal.toLocaleString()}
            </Typography>
          </Box>
          {(posStore.currentTableId === 'DOMICILIO' || totals.deliveryFee > 0) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
              <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🛵 Domicilio:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#7c3aed' }}>
                +${(totals.deliveryFee || Number(deliveryForm.deliveryFee) || 5000).toLocaleString()}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
              Impuestos (0%):
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155' }}>
              $0
            </Typography>
          </Box>

          <Divider sx={{ my: 1, borderColor: '#cbd5e1' }} />

          {/* TOTAL A PAGAR */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
              TOTAL:
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#65a30d', lineHeight: 1 }}>
              ${totals.total.toLocaleString()}
            </Typography>
          </Box>

          {/* Botonera de Acción Inferior: Modalidad Autoservicio (Primero se Paga, luego a Cocina) */}
          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CashIcon sx={{ fontSize: 24 }} />}
              onClick={handleOpenBilling}
              disabled={posStore.items.length === 0}
              sx={{
                bgcolor: '#16a34a',
                color: '#ffffff',
                fontWeight: 900,
                py: 1.5,
                fontSize: '0.98rem',
                borderRadius: '16px',
                boxShadow: '0 6px 18px rgba(22, 163, 74, 0.35)',
                '&:hover': { bgcolor: '#15803d' }
              }}
            >
              💵 Cobrar y Pasar a Cocina
            </Button>

            <Button
              fullWidth
              variant="text"
              size="small"
              startIcon={<KitchenIcon sx={{ fontSize: 16 }} />}
              onClick={handleSendToKitchen}
              disabled={posStore.items.length === 0 || isSubmittingKitchen}
              sx={{
                color: '#64748b',
                fontWeight: 700,
                fontSize: '0.74rem',
                textTransform: 'none',
                py: 0.4,
                '&:hover': { color: '#0f172a', bgcolor: 'transparent' }
              }}
            >
              {posStore.editingOrderId ? '🍳 Actualizar comanda en cocina' : '🍳 Enviar a cocina sin cobrar (Cortesía / Excepción)'}
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Floating Bottom Bar en móvil para ver la Comanda */}
      {mobileView === 'catalog' && totalCartUnits > 0 && (
        <Box
          onClick={() => setMobileView('ticket')}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            bottom: 14,
            left: 14,
            right: 14,
            zIndex: 1200,
            bgcolor: posStore.editingOrderId ? '#ea580c' : '#1e290b',
            color: '#ffffff',
            borderRadius: '20px',
            p: 1.6,
            px: 2.2,
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            cursor: 'pointer'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge badgeContent={totalCartUnits} color="success">
              <ReceiptIcon sx={{ fontSize: 26, color: '#bef264' }} />
            </Badge>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                {posStore.editingOrderId ? 'Editar Comanda' : 'Ver Comanda'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#d9f99d', fontWeight: 700 }}>
                {totalCartUnits} {totalCartUnits === 1 ? 'ítem agregado' : 'ítems agregados'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#bef264' }}>
              ${totals.total.toLocaleString()}
            </Typography>
            <Button
              size="small"
              variant="contained"
              sx={{
                bgcolor: '#84cc16',
                color: '#0b1307',
                fontWeight: 900,
                borderRadius: '12px',
                px: 1.8,
                py: 0.6,
                fontSize: '0.8rem',
                textTransform: 'none'
              }}
            >
              Comanda →
            </Button>
          </Box>
        </Box>
      )}

      {/* Modifiers Dialog (Personalización de Producto Táctil) */}
      {selectedProduct && (
        <Dialog
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: { sx: { borderRadius: '24px', p: 1 } }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                  {selectedProduct.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#65a30d', fontWeight: 800, fontSize: '0.8rem' }}>
                  Base: ${selectedProduct.price.toLocaleString()} • Personaliza ingredientes y extras
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedProduct(null)} size="small">
                <ClearIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2.5 }}>
            {selectedProduct.modifiers?.map(group => (
              <Box key={group.id} sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 1 }}>
                  {group.name}
                </Typography>
                <Grid container spacing={1}>
                  {group.options.map(option => {
                    const isChecked = selectedModifiers.some(m => m.modifierOptionId === option.id);
                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={option.id}>
                        <Paper
                          elevation={0}
                          onClick={() => handleModifierChange(group, option, !isChecked)}
                          sx={{
                            p: 1.4,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: isChecked ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            bgcolor: isChecked ? '#f0f9ff' : '#ffffff',
                            transition: 'all 0.15s ease',
                            '&:hover': { borderColor: '#0284c7' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                              checked={isChecked}
                              size="small"
                              sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color: '#0284c7' } }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e290b' }}>
                              {option.name}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#0284c7' }}>
                            {option.price > 0 ? `+$${option.price.toLocaleString()}` : 'Incluido'}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}
            
            {/* Sugerencias Rápidas de Notas de Cocina */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.8 }}>
                ⚡ Sugerencias Rápidas para Cocina:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1.5 }}>
                {QUICK_KITCHEN_NOTES.map(note => {
                  const isSelected = productNotes.includes(note);
                  return (
                    <Chip
                      key={note}
                      label={note}
                      size="small"
                      onClick={() => handleToggleQuickNote(note)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        bgcolor: isSelected ? '#ea580c' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        borderColor: isSelected ? '#ea580c' : '#cbd5e1',
                        '&:hover': { bgcolor: isSelected ? '#c2410c' : '#f1f5f9' }
                      }}
                    />
                  );
                })}
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Observaciones Especiales para Cocina"
                placeholder="Ej. Salsa aparte, término medio, sin cebolla..."
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                slotProps={{
                  input: { sx: { borderRadius: '12px' } }
                }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setSelectedProduct(null)} sx={{ fontWeight: 700, color: '#64748b' }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddWithModifiers}
              variant="contained"
              sx={{
                bgcolor: '#16a34a',
                color: '#ffffff',
                fontWeight: 900,
                borderRadius: '12px',
                px: 3,
                py: 1,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                '&:hover': { bgcolor: '#15803d' }
              }}
            >
              Agregar a la Comanda (${modalUnitPrice.toLocaleString()})
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Billing & Invoicing Modal */}
      {billingModalOpen && (
        <BillingModal
          open={billingModalOpen}
          onClose={() => {
            setBillingModalOpen(false);
            setBillingOrder(null);
          }}
          order={billingOrder}
          onPaymentSuccess={() => {
            posStore.clearOrder();
            setHasPromptedForBar(false);
          }}
        />
      )}

      {/* Diálogo de Solicitud: ¿Es Venta Directa en Barra? */}
      <Dialog
        open={barPromptOpen}
        onClose={pendingAction ? handleCancelPrompt : handleDecideLater}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1.5,
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 1.5, textAlign: 'center' }}>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              bgcolor: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <BarIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
            ¿Es venta directa en barra?
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
            Este pedido no tiene ninguna mesa asignada. Indica cómo deseas registrarlo:
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pt: 1, pb: 2 }}>
          <Stack spacing={1.5}>
            {/* Opción 1: Venta Directa en Barra */}
            <Paper
              elevation={0}
              onClick={handleConfirmBarSale}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '2px solid #f59e0b',
                bgcolor: 'rgba(245, 158, 11, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '&:hover': {
                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(245, 158, 11, 0.2)'
                }
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BarIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#b45309', lineHeight: 1.2 }}>
                  🍸 Sí, Venta Directa en Barra
                </Typography>
                <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600 }}>
                  Consumo inmediato en mostrador o barra, sin ocupar mesa del salón.
                </Typography>
              </Box>
            </Paper>

            {/* Opción 2: Asignar Mesa del Salón */}
            <Paper
              elevation={0}
              onClick={handleChooseTable}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                bgcolor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '&:hover': {
                  borderColor: '#0284c7',
                  bgcolor: 'rgba(2, 132, 199, 0.05)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(2, 132, 199, 0.15)'
                }
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <TableIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0369a1', lineHeight: 1.2 }}>
                  🪑 No, Asignar Mesa del Salón
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                  Seleccionar una mesa libre (Salón Principal, Terraza, etc.).
                </Typography>
              </Box>
            </Paper>

            {/* Opción 3: Pedido a Domicilio */}
            <Paper
              elevation={0}
              onClick={handleChooseDelivery}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '2px solid #7c3aed',
                bgcolor: 'rgba(124, 58, 237, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '&:hover': {
                  bgcolor: 'rgba(124, 58, 237, 0.14)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(124, 58, 237, 0.2)'
                }
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <DeliveryDiningIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#6d28d9', lineHeight: 1.2 }}>
                  🛵 Pedido a Domicilio Express
                </Typography>
                <Typography variant="caption" sx={{ color: '#5b21b6', fontWeight: 600 }}>
                  Registrar entrega a domicilio con dirección, teléfono y cálculo de cambio.
                </Typography>
              </Box>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1.5, justifyContent: 'center' }}>
          {pendingAction ? (
            <Button
              onClick={handleCancelPrompt}
              sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'none' }}
            >
              Cancelar acción
            </Button>
          ) : (
            <Button
              onClick={handleDecideLater}
              sx={{ color: '#64748b', fontWeight: 700, textTransform: 'none' }}
            >
              Continuar editando y decidir al cobrar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal de Selección de Mesa Mejorado */}
      <Dialog
        open={tableSelectModalOpen}
        onClose={() => setTableSelectModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1.5
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <TableIcon sx={{ color: '#0284c7', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                Seleccionar Mesa del Restaurante
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Elige la mesa asignada para este pedido
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            startIcon={<BarIcon />}
            onClick={() => {
              setTableSelectModalOpen(false);
              handleConfirmBarSale();
            }}
            sx={{
              color: '#d97706',
              fontWeight: 800,
              textTransform: 'none',
              bgcolor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '10px',
              px: 1.5,
              '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.2)' }
            }}
          >
            Es en Barra
          </Button>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2 }}>
          {/* Selector de zona dentro del modal de mesas */}
          <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 1.5, mb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            {availableTableZones.map(zone => {
              const isZoneActive = tableSelectZone === zone;
              return (
                <Chip
                  key={zone}
                  label={zone === 'ALL' ? 'Todos los sectores' : zone}
                  onClick={() => setTableSelectZone(zone)}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    bgcolor: isZoneActive ? '#0284c7' : '#f8fafc',
                    color: isZoneActive ? '#ffffff' : '#475569',
                    border: `1px solid ${isZoneActive ? '#0284c7' : '#e2e8f0'}`
                  }}
                />
              );
            })}
          </Box>

          <Grid container spacing={1.5}>
            {tables
              .filter(tbl => tableSelectZone === 'ALL' || (tbl.location || 'Salón Principal') === tableSelectZone)
              .map(tbl => {
                const isOccupied = tbl.status === 'OCUPADA';
                const isCurrent = posStore.currentTableId === tbl.id || String(tbl.number) === String(posStore.currentTableId);

                return (
                  <Grid size={{ xs: 6, sm: 4 }} key={tbl.id}>
                    <Paper
                      elevation={0}
                      onClick={() => handleSelectTableFromModal(tbl.id)}
                      sx={{
                        p: 1.8,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        border: isCurrent
                          ? '2px solid #0284c7'
                          : isOccupied
                          ? '1px solid #fdba74'
                          : '1px solid #e2e8f0',
                        bgcolor: isCurrent
                          ? 'rgba(2, 132, 199, 0.08)'
                          : isOccupied
                          ? '#fff7ed'
                          : '#ffffff',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: '#0284c7',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          Mesa {tbl.number}
                        </Typography>
                        <Chip
                          size="small"
                          label={isOccupied ? 'Ocupada' : 'Libre'}
                          color={isOccupied ? 'warning' : 'success'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                        {tbl.location || 'Salón Principal'} • {tbl.capacity}p
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1 }}>
          <Button
            onClick={() => setTableSelectModalOpen(false)}
            sx={{ fontWeight: 700, borderRadius: '10px' }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Configuración de Domicilio en POS */}
      <Dialog
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '14px', bgcolor: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDiningIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                Datos del Pedido a Domicilio
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Información de entrega, cliente y método de pago
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDeliveryModalOpen(false)}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {/* Selector de Cliente Registrado */}
            {customers.length > 0 && (
              <TextField
                select
                fullWidth
                size="small"
                label="Seleccionar Cliente Frecuente (Opcional)"
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
              >
                <MenuItem value="">-- Cliente Nuevo / Digitar Manualmente --</MenuItem>
                {(customers || []).map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.phone ? `- ${c.phone}` : ''} {c.address ? `(${c.address})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Nombre del Cliente"
                  placeholder="Ej. Juan Pérez"
                  value={deliveryForm.customerName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, customerName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Teléfono / WhatsApp"
                  placeholder="Ej. 300 123 4567"
                  value={deliveryForm.phone}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              required
              size="small"
              label="Dirección Completa de Entrega"
              placeholder="Ej. Calle 45 # 10-20, Apto 501, Torre 2"
              value={deliveryForm.address}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })}
            />

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Zona / Barrio"
                  placeholder="Ej. Laureles, Poblado..."
                  value={deliveryForm.zone}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, zone: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Tarifa de Domicilio ($ COP)"
                  value={deliveryForm.deliveryFee}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryFee: Number(e.target.value) || 0 })}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Método de Pago */}
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 1 }}>
                FORMA DE PAGO AL ENTREGAR:
              </Typography>
              <Grid container spacing={1}>
                {(['EFECTIVO', 'DATAFONO', 'TRANSFERENCIA'] as const).map(method => (
                  <Grid size={{ xs: 4 }} key={method}>
                    <Button
                      fullWidth
                      variant={deliveryForm.paymentMethod === method ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setDeliveryForm({ ...deliveryForm, paymentMethod: method })}
                      sx={{
                        borderRadius: '10px',
                        py: 0.8,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        bgcolor: deliveryForm.paymentMethod === method ? '#7c3aed' : '#ffffff',
                        borderColor: deliveryForm.paymentMethod === method ? '#7c3aed' : '#cbd5e1',
                        color: deliveryForm.paymentMethod === method ? '#ffffff' : '#475569',
                        '&:hover': {
                          bgcolor: deliveryForm.paymentMethod === method ? '#6d28d9' : '#f1f5f9'
                        }
                      }}
                    >
                      {method === 'EFECTIVO' ? '💵 Efectivo' : method === 'DATAFONO' ? '💳 Datáfono' : '📲 Transfer.'}
                    </Button>
                  </Grid>
                ))}
              </Grid>

              {deliveryForm.paymentMethod === 'EFECTIVO' && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #cbd5e1', display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    label="¿Con cuánto paga el cliente?"
                    value={deliveryForm.cashAmountPaidWith}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, cashAmountPaidWith: Number(e.target.value) || 0 })}
                    sx={{ width: 220 }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }
                    }}
                  />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                      Cambio a llevar:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: (deliveryForm.cashAmountPaidWith - (totals.subtotal + (deliveryForm.deliveryFee || 5000))) >= 0 ? '#16a34a' : '#dc2626' }}>
                      ${Math.max(0, (deliveryForm.cashAmountPaidWith || 0) - (totals.subtotal + (deliveryForm.deliveryFee || 5000))).toLocaleString()} COP
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Notas para el Repartidor / Cocina"
              placeholder="Ej. Tocar timbre 501, no funciona citófono. Llevar datáfono."
              value={deliveryForm.notes}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setDeliveryModalOpen(false)}
            sx={{ color: '#64748b', fontWeight: 700 }}
          >
            Cerrar
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => handleSaveDeliveryForm(false)}
              sx={{ borderRadius: '12px', fontWeight: 800, textTransform: 'none' }}
            >
              Guardar Datos
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSaveDeliveryForm(true)}
              startIcon={<KitchenIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 900,
                bgcolor: '#7c3aed',
                textTransform: 'none',
                px: 2,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                '&:hover': { bgcolor: '#6d28d9' }
              }}
            >
              Confirmar y Enviar a Cocina 🔔
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
