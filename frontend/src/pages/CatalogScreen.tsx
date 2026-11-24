import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
  Avatar,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  InputAdornment,
  Stack,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  PlayCircle as PlayIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  Movie as MovieIcon,
  Close as ClearIcon,
  Search as SearchIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  QrCode2 as QrCodeIcon,
  ContentCopy as CopyIcon,
  TrendingUp as TrendingUpIcon,
  Restaurant as FoodIcon,
  Casino as RandomIcon,
  FolderSpecial as CategoryIcon,
  Refresh as RefreshIcon,
  LocalFireDepartment as FireIcon,
  MenuBook as MenuBookIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Product, Category, ModifierGroup, Recipe } from '../types';
import { subscribeRealtimeEvents } from '../services/eventBus';
import { useAuthStore } from '../store/authStore';

const QUICK_TAG_SUGGESTIONS = [
  '⭐ Favorito',
  '🔥 Especial',
  '🌱 Vegano',
  '🌾 Sin Gluten',
  '🥩 Corte Premium',
  '🍹 Signature',
  '🌶️ Picante',
  '🧀 Con Queso',
  '🥬 Saludable',
  '🐟 Mar y Tierra',
  '🥐 Para Compartir'
];

export default function CatalogScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdminOrManager = ['ADMINISTRADOR', 'GERENTE'].includes(user?.role || '');
  const canManageCatalog = isAdminOrManager;
  const canToggleAvailability = isAdminOrManager || user?.role === 'COCINA';

  const [tabIndex, setTabIndex] = useState<number>(0); // 0: Carta Gastronómica, 1: Categorías
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pendingConfigProduct, setPendingConfigProduct] = useState<{ id: string; name: string } | null>(null);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'OUT_OF_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'MARGIN_DESC'>('NAME_ASC');

  // Dialog state for Product (Create/Edit)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productDialogTab, setProductDialogTab] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State para Producto
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    price: 0,
    cost: 0,
    imageUrl: '',
    videoUrl: '',
    tags: [] as string[],
    calories: '',
    isAvailable: true,
    modifiers: [] as ModifierGroup[]
  });

  // Dialog state para Categoría
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Modal QR Code
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeRealtimeEvents((type) => {
      if (type === 'sesamo_catalog_updated' || type === 'sesamo_order_created') {
        loadData();
      }
    });
    window.addEventListener('sesamo_catalog_updated', loadData);
    return () => {
      window.removeEventListener('sesamo_catalog_updated', loadData);
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats, recs] = await Promise.all([
        mockApi.products.getAll(),
        mockApi.categories.getAll(),
        mockApi.recipes.getAll()
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setRecipes(recs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // KPIs
  const totalProducts = products.length;
  const availableProducts = products.filter(p => p.isAvailable).length;
  const outOfStockProducts = products.filter(p => !p.isAvailable).length;
  const activeCategoriesCount = categories.length;

  const validMarginProducts = products.filter(p => p.price > 0 && p.cost >= 0);
  const avgMarginPercentage = validMarginProducts.length > 0
    ? Math.round(validMarginProducts.reduce((sum, p) => sum + (((p.price - p.cost) / p.price) * 100), 0) / validMarginProducts.length)
    : 0;

  // Filtrado y ordenamiento de productos
  const filteredProducts = products.filter(p => {
    if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) return false;
    if (availabilityFilter === 'AVAILABLE' && !p.isAvailable) return false;
    if (availabilityFilter === 'OUT_OF_STOCK' && p.isAvailable) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      return matchName || matchSku || matchDesc || matchTags;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.price - b.price;
    if (sortBy === 'PRICE_DESC') return b.price - a.price;
    if (sortBy === 'MARGIN_DESC') {
      const marginA = a.price > 0 ? ((a.price - a.cost) / a.price) : 0;
      const marginB = b.price > 0 ? ((b.price - b.cost) / b.price) : 0;
      return marginB - marginA;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Generador aleatorio de SKU
  const generateRandomSku = () => {
    const random = Math.floor(100 + Math.random() * 900);
    setProductForm(prev => ({ ...prev, sku: `SES-${random}` }));
  };

  // Apertura y Preparación de Diálogo de Producto
  const handleOpenProductDialog = (product?: Product) => {
    if (!canManageCatalog) return;
    setProductDialogTab(0);
    if (product) {
      setEditingProduct(product);
      setProductForm({
        sku: product.sku || '',
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || (categories[0]?.id || ''),
        price: product.price || 0,
        cost: product.cost || 0,
        imageUrl: product.imageUrl || '',
        videoUrl: product.videoUrl || '',
        tags: Array.isArray(product.tags) ? [...product.tags] : [],
        calories: product.calories || '',
        isAvailable: product.isAvailable ?? true,
        modifiers: Array.isArray(product.modifiers) ? JSON.parse(JSON.stringify(product.modifiers)) : []
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        sku: `SES-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        description: '',
        categoryId: categories[0]?.id || '',
        price: 25000,
        cost: 8500,
        imageUrl: '',
        videoUrl: '',
        tags: ['⭐ Especial'],
        calories: '550 kcal',
        isAvailable: true,
        modifiers: []
      });
    }
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!canManageCatalog) return;
    if (!productForm.name.trim() || !productForm.categoryId) {
      alert('Por favor diligencia el nombre y la categoría del producto.');
      return;
    }

    const payload = {
      sku: productForm.sku.trim() || `SES-${Date.now().toString().slice(-4)}`,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      categoryId: productForm.categoryId,
      price: Math.max(0, Number(productForm.price) || 0),
      cost: Math.max(0, Number(productForm.cost) || 0),
      imageUrl: productForm.imageUrl.trim(),
      videoUrl: productForm.videoUrl.trim(),
      tags: productForm.tags,
      calories: productForm.calories.trim(),
      isAvailable: productForm.isAvailable,
      isActive: true,
      modifiers: productForm.modifiers
    };

    try {
      let createdId: string | null = null;
      if (editingProduct) {
        await mockApi.products.update(editingProduct.id, payload);
      } else {
        const created = await mockApi.products.create(payload);
        if (created && created.id) {
          createdId = String(created.id);
        }
      }
      setIsProductDialogOpen(false);
      await loadData();
      if (createdId) {
        setPendingConfigProduct({ id: createdId, name: payload.name });
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al guardar el producto');
    }
  };

  const handleToggleAvailable = async (product: Product) => {
    if (!canToggleAvailability) return;
    try {
      await mockApi.products.toggleAvailable(product.id);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al modificar disponibilidad');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!canManageCatalog) return;
    if (window.confirm(`¿Confirmas que deseas eliminar "${name}" del menú?`)) {
      await mockApi.products.delete(id);
      loadData();
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    if (!canManageCatalog) return;
    try {
      const newSku = `SES-${Math.floor(100 + Math.random() * 900)}`;
      const payload: Omit<Product, 'id'> = {
        sku: newSku,
        name: `${product.name} (Copia)`,
        description: product.description || '',
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        imageUrl: product.imageUrl || '',
        videoUrl: product.videoUrl || '',
        tags: product.tags ? [...product.tags] : [],
        calories: product.calories || '',
        isAvailable: product.isAvailable,
        isActive: true,
        modifiers: product.modifiers ? JSON.parse(JSON.stringify(product.modifiers)) : []
      };
      await mockApi.products.create(payload);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Error al duplicar el producto');
    }
  };

  // Carga de Archivos
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProductForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProductForm(prev => ({ ...prev, videoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Gestión de Etiquetas Rápidas
  const handleToggleTag = (tag: string) => {
    setProductForm(prev => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  // Gestión de Modificadores en Formulario
  const handleAddModifierGroup = () => {
    const newGroup: ModifierGroup = {
      id: `mod-${Date.now()}`,
      name: 'Opciones de Preparación',
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      options: [
        { id: `opt-${Date.now()}-1`, name: 'Opción Estándar', price: 0 }
      ]
    };
    setProductForm(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, newGroup]
    }));
  };

  const handleRemoveModifierGroup = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, idx) => idx !== index)
    }));
  };

  const handleAddOptionToGroup = (groupIndex: number) => {
    setProductForm(prev => {
      const updated = [...prev.modifiers];
      updated[groupIndex].options.push({
        id: `opt-${Date.now()}`,
        name: 'Nuevo Extra / Variante',
        price: 2000
      });
      return { ...prev, modifiers: updated };
    });
  };

  const handleRemoveOptionFromGroup = (groupIndex: number, optionIndex: number) => {
    setProductForm(prev => {
      const updated = [...prev.modifiers];
      updated[groupIndex].options = updated[groupIndex].options.filter((_, idx) => idx !== optionIndex);
      return { ...prev, modifiers: updated };
    });
  };

  // Categorías
  const handleOpenCategoryDialog = (category?: Category) => {
    if (!canManageCatalog) return;
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!canManageCatalog) return;
    if (!categoryForm.name.trim()) {
      alert('El nombre de la categoría es requerido.');
      return;
    }
    try {
      if (editingCategory) {
        await mockApi.categories.update(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim()
        });
      } else {
        await mockApi.categories.create({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          isActive: true
        });
      }
      setIsCategoryDialogOpen(false);
      setCategoryForm({ name: '', description: '' });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al guardar categoría');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!canManageCatalog) return;
    const prodsInCat = products.filter(p => p.categoryId === id).length;
    if (prodsInCat > 0) {
      alert(`No se puede eliminar la categoría "${name}" porque contiene ${prodsInCat} plato(s) asociado(s). Reasigna los productos primero.`);
      return;
    }
    if (window.confirm(`¿Deseas eliminar la categoría "${name}"?`)) {
      await mockApi.categories.delete(id);
      loadData();
    }
  };

  // Cálculo de Margen en el diálogo
  const currentPrice = Number(productForm.price) || 0;
  const currentCost = Number(productForm.cost) || 0;
  const currentProfit = currentPrice - currentCost;
  const currentMargin = currentPrice > 0 ? Math.round((currentProfit / currentPrice) * 100) : 0;

  // URL del menú digital
  const publicMenuUrl = `${window.location.origin}/menu`;

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Principal & Acciones Globales */}
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
              <FoodIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                  Catálogo de Menú y Carta
                </Typography>
                <Chip
                  label={
                    canManageCatalog
                      ? 'Admin • Control Total'
                      : canToggleAvailability
                      ? 'Cocina • Disponibilidad'
                      : 'Modo Consulta'
                  }
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    borderRadius: 2,
                    bgcolor: canManageCatalog ? '#ecfccb' : '#ffedd5',
                    color: canManageCatalog ? '#3f6212' : '#c2410c',
                    border: `1px solid ${canManageCatalog ? '#bef264' : '#fed7aa'}`,
                    height: 24,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Administra platos, precios, recetas, fotos y disponibilidad sincronizados en tiempo real con el POS y el Menú Digital QR.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<QrCodeIcon sx={{ fontSize: 18 }} />}
            onClick={() => setIsQrModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 800,
              borderColor: '#e2e8f0',
              color: '#475569',
              bgcolor: '#ffffff',
              px: 1.8,
              py: 0.9,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
            }}
          >
            Menú Digital QR
          </Button>

          {canManageCatalog && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CategoryIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleOpenCategoryDialog()}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 800,
                  borderColor: '#bef264',
                  color: '#4d7c0f',
                  bgcolor: '#ffffff',
                  px: 1.8,
                  py: 0.9,
                  '&:hover': { bgcolor: '#f7fee7', borderColor: '#84cc16' },
                }}
              >
                Nueva Categoría
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleOpenProductDialog()}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 900,
                  bgcolor: '#65a30d',
                  color: '#ffffff',
                  px: 2.2,
                  py: 0.9,
                  boxShadow: '0 4px 14px rgba(101, 163, 13, 0.35)',
                  '&:hover': { bgcolor: '#4d7c0f', boxShadow: '0 6px 18px rgba(101, 163, 13, 0.45)' },
                }}
              >
                Nuevo Platillo
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* 2. Tarjetas de Estadísticas & KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* KPI 1: Total Platillos */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#cbd5e1',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
              },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: '#f1f5f9',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FoodIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}
                  >
                    Total Platillos
                  </Typography>
                </Box>
                <Chip
                  label={`${activeCategoriesCount} categorías`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e293b', mb: 0.5, letterSpacing: -0.5 }}>
                {totalProducts}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              En catálogo activo de restaurante
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Disponibles */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#86efac',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 18px rgba(22, 163, 74, 0.08)',
              },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}
                  >
                    Disponibles
                  </Typography>
                </Box>
                <Chip
                  label="EN CARTA"
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900, bgcolor: '#dcfce7', color: '#15803d' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', mb: 0.5, letterSpacing: -0.5 }}>
                {availableProducts}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Listos para pedir en salón y domicilios
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 3: Agotados (86'd) */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 3,
              border: outOfStockProducts > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              bgcolor: outOfStockProducts > 0 ? '#fff5f5' : '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: outOfStockProducts > 0 ? '#ef4444' : '#cbd5e1',
                transform: 'translateY(-2px)',
                boxShadow: outOfStockProducts > 0 ? '0 6px 18px rgba(239, 68, 68, 0.12)' : '0 6px 18px rgba(0,0,0,0.06)',
              },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: outOfStockProducts > 0 ? '#fee2e2' : '#f1f5f9',
                      color: outOfStockProducts > 0 ? '#dc2626' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: outOfStockProducts > 0 ? '#dc2626' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.72rem',
                    }}
                  >
                    Agotados (86'd)
                  </Typography>
                </Box>
                <Chip
                  label={outOfStockProducts > 0 ? `⚠️ ${outOfStockProducts} SIN STOCK` : '🟢 100% ACTIVO'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    bgcolor: outOfStockProducts > 0 ? '#fee2e2' : '#f0fdf4',
                    color: outOfStockProducts > 0 ? '#b91c1c' : '#15803d',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: outOfStockProducts > 0 ? '#dc2626' : '#1e293b',
                  mb: 0.5,
                  letterSpacing: -0.5,
                }}
              >
                {outOfStockProducts}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: outOfStockProducts > 0 ? '#dc2626' : 'text.secondary', fontWeight: 600 }}
            >
              {outOfStockProducts > 0 ? 'Ocultos temporalmente en la carta' : 'Carta 100% disponible para orden'}
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 4: Margen Promedio */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#7dd3fc',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 18px rgba(2, 132, 199, 0.08)',
              },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}
                  >
                    Margen Promedio
                  </Typography>
                </Box>
                <Chip
                  label="ESTIMADO"
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0284c7' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7', mb: 0.5, letterSpacing: -0.5 }}>
                {avgMarginPercentage}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Rentabilidad bruta promedio del menú
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Pestañas de Vista (Carta vs Categorías) */}
      <Box sx={{ borderBottom: 1, borderColor: '#e2e8f0', mb: 2.5 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.95rem',
              textTransform: 'none',
              minWidth: 140,
              color: '#64748b',
              '&.Mui-selected': { color: '#1e290b' }
            },
            '& .MuiTabs-indicator': { bgcolor: '#84cc16', height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab label={`🍽️ Carta y Platos (${products.length})`} />
          <Tab label={`📂 Secciones y Categorías (${categories.length})`} />
        </Tabs>
      </Box>

      {/* Vista de Carta de Productos */}
      {tabIndex === 0 && (
        <>
          {/* Barra de Filtros, Búsqueda y Selector de Modo de Vista */}
          <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              {/* Buscador */}
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre, SKU, etiqueta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
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
              </Grid>

              {/* Filtro por Estado */}
              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Disponibilidad"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="ALL">Todos los Estados</MenuItem>
                  <MenuItem value="AVAILABLE">🟢 Solo Disponibles</MenuItem>
                  <MenuItem value="OUT_OF_STOCK">🔴 Solo Agotados (86)</MenuItem>
                </TextField>
              </Grid>

              {/* Ordenamiento */}
              <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Ordenar por"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="NAME_ASC">Nombre (A - Z)</MenuItem>
                  <MenuItem value="PRICE_DESC">Precio: Mayor a Menor</MenuItem>
                  <MenuItem value="PRICE_ASC">Precio: Menor a Mayor</MenuItem>
                  <MenuItem value="MARGIN_DESC">Mayor Margen de Ganancia</MenuItem>
                </TextField>
              </Grid>

              {/* Selector de Vista (Grilla vs Tabla) */}
              <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                <Paper elevation={0} sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '12px', p: 0.3, bgcolor: '#f8fafc' }}>
                  <Tooltip title="Vista en Cuadrícula Gastronómica">
                    <Button
                      size="small"
                      onClick={() => setViewMode('GRID')}
                      sx={{
                        minWidth: 42,
                        borderRadius: '9px',
                        bgcolor: viewMode === 'GRID' ? '#1e290b' : 'transparent',
                        color: viewMode === 'GRID' ? '#ffffff' : '#64748b',
                        '&:hover': { bgcolor: viewMode === 'GRID' ? '#0f172a' : '#f1f5f9' }
                      }}
                    >
                      <GridViewIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Vista en Tabla de Datos">
                    <Button
                      size="small"
                      onClick={() => setViewMode('TABLE')}
                      sx={{
                        minWidth: 42,
                        borderRadius: '9px',
                        bgcolor: viewMode === 'TABLE' ? '#1e290b' : 'transparent',
                        color: viewMode === 'TABLE' ? '#ffffff' : '#64748b',
                        '&:hover': { bgcolor: viewMode === 'TABLE' ? '#0f172a' : '#f1f5f9' }
                      }}
                    >
                      <TableViewIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                </Paper>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadData}
                  sx={{ borderRadius: '12px', fontWeight: 700, color: '#64748b' }}
                >
                  Actualizar
                </Button>
              </Grid>
            </Grid>

            {/* Chips de Categorías con Conteo Dinámico */}
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mt: 1.8, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
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
                  flexShrink: 0
                }}
              />
              {categories.map((cat) => {
                const count = products.filter(p => p.categoryId === cat.id).length;
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    label={`${cat.name} (${count})`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#1e290b' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: `1px solid ${isSelected ? '#1e290b' : '#e2e8f0'}`,
                      flexShrink: 0
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Estado Vacío */}
          {filteredProducts.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '20px', border: '1px dashed #cbd5e1', bgcolor: '#ffffff' }}>
              <FoodIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155' }}>
                No se encontraron platillos ni bebidas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mx: 'auto', mt: 0.5 }}>
                Intenta cambiando los filtros o la búsqueda ingresada.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => { setSearchQuery(''); setSelectedCategoryId('ALL'); setAvailabilityFilter('ALL'); }}
                sx={{ mt: 2, borderRadius: '10px', fontWeight: 700 }}
              >
                Limpiar Filtros
              </Button>
            </Paper>
          ) : viewMode === 'GRID' ? (
            /* Vista de Grilla de Tarjetas */
            <Grid container spacing={2}>
              {filteredProducts.map((product) => {
                const category = categories.find(c => c.id === product.categoryId);
                const profit = product.price - product.cost;
                const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;
                const hasModifiers = Boolean(product.modifiers && product.modifiers.length > 0);

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '20px',
                        border: product.isAvailable ? '1px solid #e2e8f0' : '2px dashed #fca5a5',
                        bgcolor: product.isAvailable ? '#ffffff' : '#fef2f2',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.08)'
                        }
                      }}
                    >
                      {/* Cabecera Multimedia */}
                      <Box sx={{ position: 'relative', height: 160, width: '100%', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                        {product.imageUrl ? (
                          <CardMedia
                            component="img"
                            height="160"
                            image={product.imageUrl}
                            alt={product.name}
                            sx={{
                              objectFit: 'cover',
                              filter: !product.isAvailable ? 'grayscale(80%)' : 'none'
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: '100%',
                              width: '100%',
                              background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#9a3412'
                            }}
                          >
                            <FoodIcon sx={{ fontSize: 44, opacity: 0.8, mb: 0.5 }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                              Sésamo Alimentos
                            </Typography>
                          </Box>
                        )}

                        {/* Badge de Precio Flotante */}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 10,
                            right: 10,
                            bgcolor: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(6px)',
                            color: '#ffffff',
                            px: 1.2,
                            py: 0.4,
                            borderRadius: '10px',
                            fontWeight: 900,
                            fontSize: '0.85rem'
                          }}
                        >
                          ${product.price.toLocaleString()} COP
                        </Box>

                        {/* Badge de Disponibilidad (Interactivo) */}
                        <Chip
                          size="small"
                          clickable={canToggleAvailability}
                          onClick={canToggleAvailability ? () => handleToggleAvailable(product) : undefined}
                          icon={product.isAvailable ? <CheckIcon sx={{ fontSize: 13 }} /> : <CancelIcon sx={{ fontSize: 13 }} />}
                          label={product.isAvailable ? 'Disponible' : 'Agotado (86)'}
                          sx={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            bgcolor: product.isAvailable ? '#16a34a' : '#ef4444',
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            cursor: canToggleAvailability ? 'pointer' : 'default',
                            '&:hover': canToggleAvailability ? { opacity: 0.9 } : {}
                          }}
                        />

                        {/* Indicador de Video */}
                        {product.videoUrl && (
                          <Tooltip title="Incluye video explicativo de cocina">
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: 'rgba(0,0,0,0.6)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <PlayIcon sx={{ fontSize: 18 }} />
                            </Box>
                          </Tooltip>
                        )}
                      </Box>

                      {/* Cuerpo de la Tarjeta */}
                      <CardContent sx={{ flex: 1, p: 2, pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#65a30d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
                            {category?.name || 'General'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, fontFamily: 'monospace' }}>
                            {product.sku}
                          </Typography>
                        </Box>

                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.25, mb: 0.8 }}>
                          {product.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.8rem',
                            lineHeight: 1.4,
                            minHeight: 36,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1.5
                          }}
                        >
                          {product.description || 'Platillo preparado artesanalmente con ingredientes frescos y balanceados.'}
                        </Typography>

                        {/* Tags & Extras */}
                        <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', mb: 1.5 }}>
                          {/* Recipe Status Chip */}
                          {(() => {
                            const hasRecipe = recipes.some(r => String(r.productId) === String(product.id));
                            return hasRecipe ? (
                              <Tooltip title="Ficha técnica de receta configurada. Clic para ver en Recetas">
                                <Chip
                                  size="small"
                                  label="✅ Receta OK"
                                  onClick={() => navigate('/recipes')}
                                  clickable
                                  sx={{ fontSize: '0.65rem', height: 22, fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Platillo nuevo sin escandallo culinario. Clic para configurarlo">
                                <Chip
                                  size="small"
                                  label="⚠️ Falta Receta"
                                  onClick={() => navigate(`/recipes?configureProduct=${product.id}`)}
                                  clickable
                                  sx={{ fontSize: '0.65rem', height: 22, fontWeight: 800, bgcolor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                                />
                              </Tooltip>
                            );
                          })()}
                          {product.calories && (
                            <Chip
                              size="small"
                              label={`🔥 ${product.calories}`}
                              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }}
                            />
                          )}
                          {hasModifiers && (
                            <Chip
                              size="small"
                              label={`⚙️ ${product.modifiers?.length} Opciones`}
                              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }}
                            />
                          )}
                          {(product.tags || []).slice(0, 2).map(tag => (
                            <Chip
                              key={tag}
                              size="small"
                              label={tag}
                              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 700, bgcolor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                            />
                          ))}
                        </Box>

                        {/* Finanzas Rápidas */}
                        <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', fontWeight: 700 }}>
                              Costo Insumos:
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155' }}>
                              ${product.cost.toLocaleString()}
                            </Typography>
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', fontWeight: 700 }}>
                              Margen Bruto:
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: margin >= 50 ? '#16a34a' : margin >= 30 ? '#d97706' : '#dc2626' }}>
                              +{margin}% (${profit.toLocaleString()})
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>

                      {/* Barra de Acciones */}
                      {canManageCatalog && (
                        <CardActions sx={{ p: 1.5, pt: 0, justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleOpenProductDialog(product)}
                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', py: 0.5 }}
                          >
                            Editar
                          </Button>

                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Duplicar como nuevo plato">
                              <IconButton size="small" onClick={() => handleDuplicateProduct(product)} sx={{ color: '#64748b' }}>
                                <CopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar del menú">
                              <IconButton size="small" onClick={() => handleDeleteProduct(product.id, product.name)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardActions>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            /* Vista de Tabla Detallada */
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '18px', border: '1px solid #e2e8f0', overflowX: 'auto', maxWidth: '100%' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Platillo</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Categoría</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Costo Insumos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Precio Venta</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Margen Bruto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Disponibilidad</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Escandallo / Receta</TableCell>
                    {canManageCatalog && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Acciones</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const category = categories.find(c => c.id === product.categoryId);
                    const profit = product.price - product.cost;
                    const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;

                    return (
                      <TableRow key={product.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              variant="rounded"
                              src={product.imageUrl}
                              sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: '#fef3c7', color: '#9a3412', fontWeight: 800 }}
                            >
                              {product.name[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                                {product.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                                {product.sku} {product.calories ? `• ${product.calories}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={category?.name || 'General'} size="small" sx={{ fontWeight: 700, borderRadius: '8px' }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#64748b' }}>
                          ${product.cost.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          ${product.price.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 900, color: margin >= 50 ? '#16a34a' : margin >= 30 ? '#d97706' : '#dc2626' }}>
                            +{margin}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            ${profit.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            clickable={canToggleAvailability}
                            onClick={canToggleAvailability ? () => handleToggleAvailable(product) : undefined}
                            icon={product.isAvailable ? <CheckIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                            label={product.isAvailable ? 'Disponible' : 'Agotado'}
                            color={product.isAvailable ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 800, borderRadius: '8px' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {(() => {
                            const hasRecipe = recipes.some(r => String(r.productId) === String(product.id));
                            return hasRecipe ? (
                              <Tooltip title="Ficha técnica de receta configurada. Clic para ver en Recetas">
                                <Chip
                                  size="small"
                                  label="✅ Receta OK"
                                  onClick={() => navigate('/recipes')}
                                  clickable
                                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Platillo nuevo sin escandallo culinario. Clic para ir a Recetas">
                                <Chip
                                  size="small"
                                  label="⚠️ Falta Receta"
                                  onClick={() => navigate(`/recipes?configureProduct=${product.id}`)}
                                  clickable
                                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                                />
                              </Tooltip>
                            );
                          })()}
                        </TableCell>
                        {canManageCatalog && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              <IconButton size="small" onClick={() => handleOpenProductDialog(product)} color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDuplicateProduct(product)} sx={{ color: '#64748b' }}>
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteProduct(product.id, product.name)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Pestaña 2: Secciones y Categorías */}
      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                Categorías de la Carta Gastronómica
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organiza las secciones que ven tus clientes en el menú digital y el personal en el punto de venta.
              </Typography>
            </Box>
            {canManageCatalog && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCategoryDialog()}
                sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#1e290b', '&:hover': { bgcolor: '#2d3e11' } }}
              >
                Crear Sección
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            {categories.map((cat) => {
              const catProducts = products.filter(p => p.categoryId === cat.id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '18px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#84cc16', boxShadow: '0 6px 18px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(132, 204, 22, 0.15)', color: '#4d7c0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CategoryIcon sx={{ fontSize: 20 }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                            {cat.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${catProducts.length} platos`}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderRadius: '8px' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, fontSize: '0.82rem', mb: 2 }}>
                        {cat.description || 'Sin descripción detallada para esta sección gastronómica.'}
                      </Typography>
                    </Box>

                    {canManageCatalog && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleOpenCategoryDialog(cat)}
                          sx={{ fontWeight: 800, borderRadius: '8px', color: '#334155' }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          sx={{ fontWeight: 800, borderRadius: '8px' }}
                        >
                          Eliminar
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* 4. Diálogo de Creación / Edición Avanzada de Producto */}
      <Dialog
        open={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#1e290b', color: '#84cc16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FoodIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                {editingProduct ? `Editar Platillo: ${editingProduct.name}` : 'Crear Nuevo Platillo en Menú'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Configuración gastronómica, precios, recetas, fotos y extras
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setIsProductDialogOpen(false)}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        {/* Pestañas del Diálogo */}
        <Box sx={{ px: 3, borderBottom: 1, borderColor: '#e2e8f0' }}>
          <Tabs
            value={productDialogTab}
            onChange={(_, v) => setProductDialogTab(v)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 800,
                fontSize: '0.85rem',
                textTransform: 'none',
                minWidth: 100,
                color: '#64748b',
                '&.Mui-selected': { color: '#1e290b' }
              },
              '& .MuiTabs-indicator': { bgcolor: '#84cc16', height: 3 }
            }}
          >
            <Tab label="1. Datos Generales" />
            <Tab label="2. Precios & Finanzas" />
            <Tab label="3. Multimedia" />
            <Tab label="4. Etiquetas & Nutrición" />
            <Tab label={`5. Extras & Opciones (${productForm.modifiers.length})`} />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          {/* TAB 0: Datos Generales */}
          {productDialogTab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Código SKU"
                  value={productForm.sku}
                  onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Generar código automático">
                            <IconButton size="small" onClick={generateRandomSku}>
                              <RandomIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  select
                  fullWidth
                  required
                  size="small"
                  label="Categoría / Sección del Menú"
                  value={productForm.categoryId}
                  onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Nombre del Platillo o Bebida"
                  placeholder="Ej. Hamburguesa Artesanal Sésamo Trufada"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  slotProps={{ input: { sx: { fontWeight: 700 } } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Descripción Comercial para el Cliente"
                  placeholder="Describe los ingredientes, aromas, técnica de cocción o historia del platillo para cautivar a los comensales..."
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                />
              </Grid>
            </Grid>
          )}

          {/* TAB 1: Precios & Rentabilidad */}
          {productDialogTab === 1 && (
            <Box>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Precio de Venta al Público (COP)"
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: Math.max(0, Number(e.target.value) || 0) })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        sx: { fontWeight: 900, fontSize: '1.1rem' }
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Costo de Insumos / Materia Prima (COP)"
                    value={productForm.cost}
                    onChange={e => setProductForm({ ...productForm, cost: Math.max(0, Number(e.target.value) || 0) })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        sx: { fontWeight: 800 }
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Tarjeta de Rentabilidad en Tiempo Real */}
              <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon sx={{ color: '#84cc16' }} /> Análisis Financiero de Rentabilidad:
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                      Ganancia Bruta por Plato:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: currentProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                      ${currentProfit.toLocaleString()} COP
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                      Margen Comercial:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: currentMargin >= 50 ? '#16a34a' : currentMargin >= 30 ? '#d97706' : '#dc2626' }}>
                      {currentMargin}%
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                      Food Cost (% Costo):
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569' }}>
                      {currentPrice > 0 ? Math.round((currentCost / currentPrice) * 100) : 0}%
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, currentMargin))}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: currentMargin >= 50 ? '#16a34a' : currentMargin >= 30 ? '#f59e0b' : '#ef4444'
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b', mt: 0.8, display: 'block' }}>
                    {currentMargin >= 60
                      ? '⭐ Margen Excelente: Rentabilidad ideal para platillos insignia del restaurante.'
                      : currentMargin >= 35
                      ? '✓ Margen Estándar: Saludable para platos principales con proteína de alto costo.'
                      : '⚠️ Alerta: El costo de los insumos representa más del 65% del precio de venta.'}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

          {/* TAB 2: Multimedia (Foto y Video) */}
          {productDialogTab === 2 && (
            <Stack spacing={2.5}>
              {/* Imagen */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mb: 1 }}>
                  Fotografía Gastronómica del Platillo:
                </Typography>
                {productForm.imageUrl && (
                  <Box sx={{ position: 'relative', width: '100%', mb: 1.5 }}>
                    <Box
                      component="img"
                      src={productForm.imageUrl}
                      alt="Vista previa"
                      sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: '16px', border: '1px solid #e2e8f0' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setProductForm({ ...productForm, imageUrl: '' })}
                      sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.6)', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 800, bgcolor: '#65a30d', '&:hover': { bgcolor: '#4d7c0f' } }}
                  >
                    Subir Imagen Local
                    <input type="file" hidden accept="image/*" onChange={handleImageFileChange} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">o enlazar por URL:</Typography>
                  <TextField
                    size="small"
                    placeholder="https://images.unsplash.com/..."
                    value={productForm.imageUrl}
                    onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* Video */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mb: 1 }}>
                  Video de Preparación o Emplatado (Opcional):
                </Typography>
                {productForm.videoUrl && (
                  <Box sx={{ position: 'relative', width: '100%', mb: 1.5 }}>
                    <Box
                      component="video"
                      controls
                      src={productForm.videoUrl}
                      sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: '16px', bgcolor: '#000000' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setProductForm({ ...productForm, videoUrl: '' })}
                      sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.7)', color: '#ffffff', '&:hover': { bgcolor: '#000000' } }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<MovieIcon />}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 800 }}
                  >
                    Subir Video Local
                    <input type="file" hidden accept="video/*" onChange={handleVideoFileChange} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">o por URL MP4:</Typography>
                  <TextField
                    size="small"
                    placeholder="https://...mp4"
                    value={productForm.videoUrl}
                    onChange={e => setProductForm({ ...productForm, videoUrl: e.target.value })}
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </Box>
            </Stack>
          )}

          {/* TAB 3: Etiquetas & Nutrición */}
          {productDialogTab === 3 && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mb: 1 }}>
                  Etiquetas Rápidas Sugeridas (Toca para activar/desactivar):
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {QUICK_TAG_SUGGESTIONS.map(tag => {
                    const isSelected = productForm.tags.includes(tag);
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        clickable
                        onClick={() => handleToggleTag(tag)}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 800, borderRadius: '10px' }}
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
                    label="Calorías Estimadas"
                    placeholder="Ej. 650 kcal"
                    value={productForm.calories}
                    onChange={e => setProductForm({ ...productForm, calories: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><FireIcon fontSize="small" sx={{ color: '#ea580c' }} /></InputAdornment>
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper elevation={0} sx={{ p: 1, px: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={productForm.isAvailable}
                          onChange={e => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                          color="success"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 800, color: productForm.isAvailable ? '#16a34a' : '#dc2626' }}>
                          {productForm.isAvailable ? '🟢 Disponible para la Venta' : '🔴 Agotado Temporalmente'}
                        </Typography>
                      }
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 4: Extras & Modificadores */}
          {productDialogTab === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                    Grupos de Opciones, Modificadores y Extras
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Configura opciones de personalización para el comensal (ej. Términos de cocción, adiciones con costo o salsas).
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddModifierGroup}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, bgcolor: '#1e290b' }}
                >
                  Nuevo Grupo
                </Button>
              </Box>

              {productForm.modifiers.length === 0 ? (
                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '16px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700 }}>
                    Este platillo no tiene opciones de personalización asignadas.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Puedes agregar grupos como &quot;Término de la carne&quot; o &quot;Adición de Queso / Tocineta&quot;.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {productForm.modifiers.map((group, groupIdx) => (
                    <Paper key={group.id || groupIdx} elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <TextField
                          size="small"
                          label="Nombre del Grupo de Opciones"
                          value={group.name}
                          onChange={(e) => {
                            const updated = [...productForm.modifiers];
                            updated[groupIdx].name = e.target.value;
                            setProductForm({ ...productForm, modifiers: updated });
                          }}
                          sx={{ width: 260 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={group.isRequired}
                                onChange={(e) => {
                                  const updated = [...productForm.modifiers];
                                  updated[groupIdx].isRequired = e.target.checked;
                                  setProductForm({ ...productForm, modifiers: updated });
                                }}
                              />
                            }
                            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Obligatorio</Typography>}
                          />
                          <IconButton size="small" color="error" onClick={() => handleRemoveModifierGroup(groupIdx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Lista de Opciones del Grupo */}
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 1 }}>
                        Opciones disponibles:
                      </Typography>
                      <Stack spacing={1}>
                        {group.options.map((opt, optIdx) => (
                          <Box key={opt.id || optIdx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              size="small"
                              placeholder="Nombre de la opción (ej. Queso Cheddar Extra)"
                              value={opt.name}
                              onChange={(e) => {
                                const updated = [...productForm.modifiers];
                                updated[groupIdx].options[optIdx].name = e.target.value;
                                setProductForm({ ...productForm, modifiers: updated });
                              }}
                              sx={{ flex: 1 }}
                            />
                            <TextField
                              size="small"
                              type="number"
                              label="Precio Extra"
                              value={opt.price}
                              onChange={(e) => {
                                const updated = [...productForm.modifiers];
                                updated[groupIdx].options[optIdx].price = Number(e.target.value) || 0;
                                setProductForm({ ...productForm, modifiers: updated });
                              }}
                              sx={{ width: 140 }}
                              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                            />
                            <IconButton size="small" color="error" onClick={() => handleRemoveOptionFromGroup(groupIdx, optIdx)}>
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>

                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddOptionToGroup(groupIdx)}
                        sx={{ mt: 1.5, fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}
                      >
                        Añadir Opción a este Grupo
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1.5, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setIsProductDialogOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProduct}
            sx={{
              borderRadius: '12px',
              fontWeight: 900,
              bgcolor: '#1e290b',
              px: 3,
              '&:hover': { bgcolor: '#2d3e11' }
            }}
          >
            {editingProduct ? 'Guardar Cambios' : 'Crear Platillo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. Diálogo de Creación / Edición de Categoría */}
      <Dialog
        open={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#1e290b' }}>
          {editingCategory ? 'Editar Sección del Menú' : 'Nueva Sección / Categoría'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              required
              label="Nombre de la Sección"
              placeholder="Ej. Entradas, Platos Fuertes, Vinos & Cócteles"
              value={categoryForm.name}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción de la Sección"
              placeholder="Ej. Selección de carnes maduradas y cortes al carbón..."
              value={categoryForm.description}
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCategoryDialogOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            sx={{ borderRadius: '10px', fontWeight: 900, bgcolor: '#1e290b', '&:hover': { bgcolor: '#2d3e11' } }}
          >
            Guardar Sección
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. Modal de Código QR & Menú Digital del Restaurante */}
      <Dialog
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1.5, textAlign: 'center' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
            Código QR Menú Digital
          </Typography>
          <IconButton size="small" onClick={() => setIsQrModalOpen(false)}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Los comensales pueden escanear este código QR en las mesas para visualizar la carta digital en vivo con fotos y videos.
          </Typography>

          <Box
            sx={{
              display: 'inline-block',
              p: 2,
              bgcolor: '#ffffff',
              borderRadius: '20px',
              border: '2px solid #84cc16',
              boxShadow: '0 8px 24px rgba(132, 204, 22, 0.2)',
              mb: 2
            }}
          >
            <Box
              component="img"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicMenuUrl)}`}
              alt="Código QR del Menú"
              sx={{ width: 220, height: 220, display: 'block' }}
            />
          </Box>

          <Paper elevation={0} sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {publicMenuUrl}
            </Typography>
            <Button
              size="small"
              startIcon={<CopyIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                navigator.clipboard.writeText(publicMenuUrl);
                setQrCopied(true);
                setTimeout(() => setQrCopied(false), 2500);
              }}
              sx={{ fontWeight: 800, textTransform: 'none', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              {qrCopied ? '¡Copiado!' : 'Copiar'}
            </Button>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open('/menu', '_blank')}
            sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#1e290b', '&:hover': { bgcolor: '#2d3e11' } }}
          >
            Abrir Vista Previa Cliente
          </Button>
        </DialogActions>
      </Dialog>
      {/* 6. Diálogo Alerta: Platillo Creado -> Enviado a Recetas */}
      <Dialog
        open={Boolean(pendingConfigProduct)}
        onClose={() => setPendingConfigProduct(null)}
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1.5, maxWidth: 480 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 900, pb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              bgcolor: 'rgba(101, 163, 13, 0.15)',
              color: '#4d7c0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <MenuBookIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
              ¡Platillo agregado a tu Menú!
            </Typography>
            <Typography variant="caption" sx={{ color: '#65a30d', fontWeight: 800 }}>
              Enviado al módulo de Recetas & Escandallos
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#334155', mb: 2, lineHeight: 1.6 }}>
            El platillo <strong>"{pendingConfigProduct?.name}"</strong> ya está disponible en la carta.
            <br />
            Para que este producto <strong>descuente automáticamente las materias primas del inventario al venderse en el POS</strong> y puedas controlar su Food Cost % real, es necesario configurar su escandallo culinario.
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
            Estado actual en cocina: <strong>⚠️ Pendiente de configurar receta</strong>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button
            onClick={() => setPendingConfigProduct(null)}
            sx={{ fontWeight: 700, color: '#64748b', textTransform: 'none' }}
          >
            Configurar Después
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const pid = pendingConfigProduct?.id;
              setPendingConfigProduct(null);
              navigate(`/recipes?configureProduct=${pid}`);
            }}
            sx={{
              borderRadius: '12px',
              fontWeight: 900,
              bgcolor: '#65a30d',
              px: 2.5,
              py: 0.9,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(101, 163, 13, 0.35)',
              '&:hover': { bgcolor: '#4d7c0f' }
            }}
          >
            Configurar Receta Ahora
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
