import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Snackbar,
  Stack,
  Collapse,
  Tabs,
  Tab,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Kitchen as KitchenIcon,
  MenuBook as MenuBookIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Timer as TimerIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { mockApi } from '../services/mockApi';
import { Recipe, RecipeIngredient, Product, InventoryItem } from '../types';
import { useAuthStore } from '../store/authStore';

// Helper to calculate exact ingredient cost based on inventory unit and recipe quantity
function calculateIngredientCost(item: InventoryItem | undefined, quantity: number, unit?: string): number {
  if (!item || quantity <= 0) return 0;
  const invUnit = (item.unit || '').toLowerCase();
  const reqUnit = (unit || item.unit || '').toLowerCase();

  // If inventory item is stored in Kg
  if (invUnit.includes('kg') || invUnit.includes('kilo')) {
    if (reqUnit.includes('g') && !reqUnit.includes('kg')) {
      return (quantity / 1000) * item.unitCost;
    }
    return quantity * item.unitCost;
  }

  // If inventory item is stored in Litro / Lt
  if (invUnit.includes('litro') || invUnit.includes('lt')) {
    if (reqUnit.includes('ml')) {
      return (quantity / 1000) * item.unitCost;
    }
    return quantity * item.unitCost;
  }

  return quantity * item.unitCost;
}

// Helper to calculate maximum portions possible with current warehouse stock
function calculateAvailablePortions(recipe: Recipe, inventoryList: InventoryItem[]): number {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
  let minPortions = Infinity;

  for (const ing of recipe.ingredients) {
    const item = inventoryList.find(i => i.id === ing.inventoryItemId);
    if (!item) continue;
    const invUnit = (item.unit || '').toLowerCase();
    const reqUnit = (ing.unit || item.unit || '').toLowerCase();
    let usageInInvUnits = ing.quantity;

    if ((invUnit.includes('kg') || invUnit.includes('kilo')) && reqUnit.includes('g') && !reqUnit.includes('kg')) {
      usageInInvUnits = ing.quantity / 1000;
    } else if ((invUnit.includes('litro') || invUnit.includes('lt')) && reqUnit.includes('ml')) {
      usageInInvUnits = ing.quantity / 1000;
    }

    if (usageInInvUnits > 0) {
      const possible = Math.floor(item.currentStock / usageInInvUnits);
      if (possible < minPortions) {
        minPortions = possible;
      }
    }
  }

  return minPortions === Infinity ? 0 : Math.max(0, minPortions);
}

// Available allergen badges
const AVAILABLE_ALLERGENS = [
  'Gluten',
  'Lácteos',
  'Huevo',
  'Maní / Frutos Secos',
  'Mariscos / Pescado',
  'Soja',
  'Sésamo',
  'Mostaza'
];

export default function RecipesScreen() {
  const { user } = useAuthStore();
  const isKitchen = user?.role === 'COCINA';
  const canManageRecipes = ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'].includes(user?.role || '');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Main Tabs (0: Fichas & Escandallos, 1: Auditoría Food Cost)
  const [mainTab, setMainTab] = useState<number>(0);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [selectedStation, setSelectedStation] = useState('TODAS');
  const [marginFilter, setMarginFilter] = useState('TODOS');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);

  const [deleteConfirmRecipe, setDeleteConfirmRecipe] = useState<Recipe | null>(null);

  // Feedback Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, prodList, invList] = await Promise.all([
        mockApi.recipes.getAll(),
        mockApi.products.getAll(),
        mockApi.inventory.getAll()
      ]);
      setRecipes(recList || []);
      setProducts(prodList || []);
      setInventory(invList || []);
    } catch (err) {
      console.error('Error cargando recetas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sesamo_recipes_updated', handleUpdate);
    window.addEventListener('sesamo_inventory_updated', handleUpdate);
    window.addEventListener('sesamo_order_created', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_recipes_updated', handleUpdate);
      window.removeEventListener('sesamo_inventory_updated', handleUpdate);
      window.removeEventListener('sesamo_order_created', handleUpdate);
    };
  }, []);

  // Compute metrics for a single recipe
  const getRecipeFinancials = useCallback((recipe: Recipe) => {
    const product = products.find(p => p.id === recipe.productId);
    const salePrice = product?.price || 0;

    let rawIngredientsCost = 0;
    const ingredientsDetailed = (recipe.ingredients || []).map(ing => {
      const invItem = inventory.find(i => i.id === ing.inventoryItemId);
      const cost = calculateIngredientCost(invItem, ing.quantity, ing.unit);
      rawIngredientsCost += cost;
      return {
        ...ing,
        invItem,
        calculatedCost: cost,
      };
    });

    const packagingCost = recipe.packagingCost || 0;
    const wastePercent = recipe.wasteMarginPercentage || 0;
    const baseCost = rawIngredientsCost + packagingCost;
    const wasteCost = (baseCost * wastePercent) / 100;
    const totalCost = Math.round(baseCost + wasteCost);

    const grossMargin = salePrice - totalCost;
    const grossMarginPercent = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
    const foodCostPercent = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;
    const availablePortions = calculateAvailablePortions(recipe, inventory);

    return {
      product,
      salePrice,
      rawIngredientsCost,
      packagingCost,
      wastePercent,
      wasteCost,
      totalCost,
      grossMargin,
      grossMarginPercent,
      foodCostPercent,
      ingredientsDetailed,
      availablePortions,
    };
  }, [products, inventory]);

  // Popularidad histórica cruzada con órdenes
  // Aggregated KPI summary
  const summaryKPIs = useMemo(() => {
    if (recipes.length === 0) {
      return { totalRecipes: 0, avgCost: 0, avgMargin: 0, avgFoodCost: 0, criticalCount: 0 };
    }

    let totalCostAccum = 0;
    let totalMarginPctAccum = 0;
    let totalFoodCostPctAccum = 0;
    let criticalCount = 0;

    recipes.forEach(r => {
      const fin = getRecipeFinancials(r);
      totalCostAccum += fin.totalCost;
      totalMarginPctAccum += fin.grossMarginPercent;
      totalFoodCostPctAccum += fin.foodCostPercent;
      if (fin.foodCostPercent > 38 || fin.grossMarginPercent < 50) {
        criticalCount++;
      }
    });

    return {
      totalRecipes: recipes.length,
      avgCost: Math.round(totalCostAccum / recipes.length),
      avgMargin: +(totalMarginPctAccum / recipes.length).toFixed(1),
      avgFoodCost: +(totalFoodCostPctAccum / recipes.length).toFixed(1),
      criticalCount,
    };
  }, [recipes, getRecipeFinancials]);

  // Categories and stations list for filters
  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      if (r.category) set.add(r.category);
      else {
        const p = products.find(prod => prod.id === r.productId);
        if (p) set.add(p.categoryId === '1' ? 'Hamburguesas' : p.categoryId === '2' ? 'Pizzas' : 'Otros');
      }
    });
    return Array.from(set);
  }, [recipes, products]);

  const stations = ['PARRILLA', 'HORNO', 'COCINA', 'BAR', 'ENSALADAS'];

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const fin = getRecipeFinancials(r);
      const prodName = fin.product?.name?.toLowerCase() || r.productName?.toLowerCase() || '';
      const matchesSearch = prodName.includes(searchQuery.toLowerCase()) ||
        (r.preparationInstructions?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.ingredients?.some(i => {
          const inv = inventory.find(invI => invI.id === i.inventoryItemId);
          return inv?.name.toLowerCase().includes(searchQuery.toLowerCase());
        }));

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== 'TODAS') {
        const cat = r.category || (fin.product?.categoryId === '1' ? 'Hamburguesas' : 'Pizzas');
        if (cat !== selectedCategory) return false;
      }

      // Station filter
      if (selectedStation !== 'TODAS' && r.station !== selectedStation) {
        return false;
      }

      // Margin filter
      if (marginFilter === 'ALTO' && fin.grossMarginPercent < 65) return false;
      if (marginFilter === 'MEDIO' && (fin.grossMarginPercent < 50 || fin.grossMarginPercent >= 65)) return false;
      if (marginFilter === 'BAJO' && fin.grossMarginPercent >= 50) return false;

      return true;
    });
  }, [recipes, inventory, searchQuery, selectedCategory, selectedStation, marginFilter, getRecipeFinancials]);

  // Handle Open Create Modal
  const handleOpenCreateModal = () => {
    const existingProductIds = new Set(recipes.map(r => r.productId));
    const availableProduct = products.find(p => !existingProductIds.has(p.id)) || products[0];

    setEditingRecipe({
      productId: availableProduct?.id || '1',
      productName: availableProduct?.name || '',
      category: availableProduct?.categoryId === '1' ? 'Hamburguesas' : availableProduct?.categoryId === '2' ? 'Pizzas' : 'General',
      preparationTimeMinutes: 10,
      portions: 1,
      wasteMarginPercentage: 5,
      packagingCost: 500,
      station: 'COCINA',
      difficulty: 'MEDIA',
      allergens: [],
      ingredients: [
        { inventoryItemId: inventory[0]?.id || '1', quantity: 1, unit: inventory[0]?.unit || 'Unidad', notes: '' }
      ],
      preparationInstructions: '1. Preparar ingredientes según porción.\n2. Cocinar y montar plato.\n3. Servir en temperatura ideal.',
      chefNotes: 'Consejo del chef: Mantener mise en place fresca antes del servicio.',
    });
    setIsEditModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (recipe: Recipe) => {
    setEditingRecipe(JSON.parse(JSON.stringify(recipe)));
    setIsEditModalOpen(true);
  };

  // Handle Save Recipe
  const handleSaveRecipe = async () => {
    if (!editingRecipe || !editingRecipe.productId) {
      setSnackbar({ open: true, message: 'Selecciona un producto válido para la receta.', severity: 'error' });
      return;
    }

    if (!editingRecipe.ingredients || editingRecipe.ingredients.length === 0) {
      setSnackbar({ open: true, message: 'La receta debe tener al menos un ingrediente.', severity: 'error' });
      return;
    }

    // Validar si hay ingredientes nuevos que requieran nombre
    for (const ing of editingRecipe.ingredients) {
      if (ing.inventoryItemId === '__NEW__' && !ing.customIngredientName?.trim()) {
        setSnackbar({ open: true, message: 'Ingresa el nombre para los nuevos insumos no registrados en almacén.', severity: 'error' });
        return;
      }
    }

    const hasNewIngredients = editingRecipe.ingredients.some(
      ing => ing.inventoryItemId === '__NEW__' || !inventory.some(i => i.id === ing.inventoryItemId)
    );

    const newIngredientNames = editingRecipe.ingredients
      .filter(ing => ing.inventoryItemId === '__NEW__' || !inventory.some(i => i.id === ing.inventoryItemId))
      .map(ing => ing.customIngredientName || ing.name || 'Nuevo Insumo');

    try {
      const prod = products.find(p => p.id === editingRecipe.productId);
      const recipeToSave: Recipe = {
        id: editingRecipe.id || `rec-${Date.now()}`,
        productId: editingRecipe.productId,
        productName: prod?.name || editingRecipe.productName || 'Plato',
        category: editingRecipe.category || 'General',
        ingredients: editingRecipe.ingredients,
        preparationTimeMinutes: Number(editingRecipe.preparationTimeMinutes) || 10,
        portions: Number(editingRecipe.portions) || 1,
        wasteMarginPercentage: Number(editingRecipe.wasteMarginPercentage) || 0,
        packagingCost: Number(editingRecipe.packagingCost) || 0,
        preparationInstructions: editingRecipe.preparationInstructions || '',
        allergens: editingRecipe.allergens || [],
        chefNotes: editingRecipe.chefNotes || '',
        difficulty: editingRecipe.difficulty || 'MEDIA',
        station: editingRecipe.station || 'COCINA',
        updatedAt: Date.now(),
      };

      await mockApi.recipes.save(recipeToSave);
      setIsEditModalOpen(false);
      setEditingRecipe(null);

      if (hasNewIngredients) {
        setSnackbar({
          open: true,
          message: `Escandallo de "${recipeToSave.productName}" guardado. ¡Insumo(s) [${newIngredientNames.join(', ')}] guardado(s) en inventario! Se envió notificación para actualizar su stock y costo en Almacén.`,
          severity: 'success'
        });
      } else {
        setSnackbar({ open: true, message: `Escandallo de "${recipeToSave.productName}" guardado correctamente.`, severity: 'success' });
      }

      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al guardar la receta.', severity: 'error' });
    }
  };

  // Handle Delete Recipe
  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await mockApi.recipes.delete(recipe.productId);
      setDeleteConfirmRecipe(null);
      setSnackbar({ open: true, message: 'Receta eliminada correctamente.', severity: 'info' });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar la receta.', severity: 'error' });
    }
  };

  // Handle Open Print Technical Sheet Modal
  const handleOpenPrintModal = (recipe: Recipe) => {
    setPrintingRecipe(recipe);
    setIsPrintModalOpen(true);
  };

  // Recipe Ingredient Manipulation in Modal
  const handleAddIngredientRow = () => {
    if (!editingRecipe) return;
    const firstInv = inventory[0];
    const newIngredients = [
      ...(editingRecipe.ingredients || []),
      { inventoryItemId: firstInv ? firstInv.id : '1', quantity: 1, unit: firstInv ? firstInv.unit : 'Unidad', notes: '' }
    ];
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleAddNewCustomIngredientRow = () => {
    if (!editingRecipe) return;
    const newIngredients = [
      ...(editingRecipe.ingredients || []),
      { inventoryItemId: '__NEW__', customIngredientName: '', quantity: 1, unit: 'Kg', notes: 'Nuevo ingrediente para inventario' }
    ];
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleRemoveIngredientRow = (index: number) => {
    if (!editingRecipe || !editingRecipe.ingredients) return;
    const newIngredients = editingRecipe.ingredients.filter((_, idx) => idx !== index);
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleUpdateIngredientRow = (index: number, field: keyof RecipeIngredient, value: any) => {
    if (!editingRecipe || !editingRecipe.ingredients) return;
    const newIngredients = [...editingRecipe.ingredients];
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: value
    };

    if (field === 'inventoryItemId') {
      const inv = inventory.find(i => i.id === value);
      if (inv) {
        newIngredients[index].unit = inv.unit;
      }
    }

    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const toggleAllergen = (allergen: string) => {
    if (!editingRecipe) return;
    const current = editingRecipe.allergens || [];
    if (current.includes(allergen)) {
      setEditingRecipe({ ...editingRecipe, allergens: current.filter(a => a !== allergen) });
    } else {
      setEditingRecipe({ ...editingRecipe, allergens: [...current, allergen] });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Cargando Ingeniería de Recetas y Escandallos...</Typography>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. HEADER SECTION */}
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
              <MenuBookIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', letterSpacing: -0.5 }}>
                  Ingeniería de Recetas & Escandallos
                </Typography>
                <Chip
                  label="Escandallos & Food Cost %"
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
                {isKitchen && (
                  <Chip
                    label="👨‍🍳 Vista Culinaria"
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#ffedd5', color: '#c2410c', borderRadius: 2, height: 24 }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Fichas técnicas culinarias, costeo de materias primas por gramo/mililitro, Food Cost % y control de mermas.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={loadData}
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
            Sincronizar Almacén
          </Button>

          {canManageRecipes && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
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
              Nuevo Escandallo
            </Button>
          )}
        </Box>
      </Box>

      {/* 2. KPI RIBBON */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* KPI 1: Recetas Costeadas */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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
                    <KitchenIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Recetas Costeadas
                  </Typography>
                </Box>
                <Chip
                  label={`${Math.round((summaryKPIs.totalRecipes / (products.length || 1)) * 100)}%`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900, bgcolor: '#f1f5f9', color: '#475569' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5, letterSpacing: -0.5 }}>
                {summaryKPIs.totalRecipes} <Typography component="span" variant="h6" sx={{ color: '#94a3b8', fontWeight: 700 }}>/ {products.length}</Typography>
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Fichas técnicas culinarias activas
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Costo Promedio */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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
                    <MoneyIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                    Costo Promedio
                  </Typography>
                </Box>
                <Chip label="POR PLATO" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0284c7' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7', mb: 0.5, letterSpacing: -0.5 }}>
                ${Math.round(summaryKPIs.avgCost).toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Insumos + empaque + merma
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 3: Margen Promedio */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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
                    Margen Promedio
                  </Typography>
                </Box>
                <Chip label="RENTABILIDAD" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803d', mb: 0.5, letterSpacing: -0.5 }}>
                {summaryKPIs.avgMargin}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Utilidad bruta promedio sobre venta
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 4: Food Cost % */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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
              '&:hover': { borderColor: '#bef264', transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(101, 163, 13, 0.08)' },
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
                      bgcolor: summaryKPIs.avgFoodCost <= 35 ? '#ecfccb' : '#fef3c7',
                      color: summaryKPIs.avgFoodCost <= 35 ? '#4d7c0f' : '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SpeedIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: summaryKPIs.avgFoodCost <= 35 ? '#4d7c0f' : '#d97706',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.72rem',
                    }}
                  >
                    Food Cost %
                  </Typography>
                </Box>
                <Chip
                  label={summaryKPIs.avgFoodCost <= 35 ? 'ÓPTIMO' : 'ALTO'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    bgcolor: summaryKPIs.avgFoodCost <= 35 ? '#ecfccb' : '#fef3c7',
                    color: summaryKPIs.avgFoodCost <= 35 ? '#3f6212' : '#92400e',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: summaryKPIs.avgFoodCost <= 35 ? '#3f6212' : '#d97706',
                  mb: 0.5,
                  letterSpacing: -0.5,
                }}
              >
                {summaryKPIs.avgFoodCost}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Target óptimo: 28% – 35%
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 5: Food Cost Crítico */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: summaryKPIs.criticalCount > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: summaryKPIs.criticalCount > 0 ? '#fff5f5' : '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: summaryKPIs.criticalCount > 0 ? '#ef4444' : '#cbd5e1',
                transform: 'translateY(-2px)',
                boxShadow: summaryKPIs.criticalCount > 0 ? '0 6px 18px rgba(239, 68, 68, 0.12)' : '0 6px 18px rgba(0,0,0,0.06)',
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
                      bgcolor: summaryKPIs.criticalCount > 0 ? '#fee2e2' : '#f1f5f9',
                      color: summaryKPIs.criticalCount > 0 ? '#dc2626' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: summaryKPIs.criticalCount > 0 ? '#dc2626' : '#64748b',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.72rem',
                    }}
                  >
                    Food Cost Crítico
                  </Typography>
                </Box>
                <Chip
                  label={summaryKPIs.criticalCount > 0 ? `⚠️ ${summaryKPIs.criticalCount} ALERTA` : '🟢 TODO OK'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    bgcolor: summaryKPIs.criticalCount > 0 ? '#fee2e2' : '#f0fdf4',
                    color: summaryKPIs.criticalCount > 0 ? '#b91c1c' : '#15803d',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: summaryKPIs.criticalCount > 0 ? '#dc2626' : '#1e290b',
                  mb: 0.5,
                  letterSpacing: -0.5,
                }}
              >
                {summaryKPIs.criticalCount} <Typography component="span" variant="h6" sx={{ color: summaryKPIs.criticalCount > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>platos</Typography>
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: summaryKPIs.criticalCount > 0 ? '#dc2626' : 'text.secondary', fontWeight: 600 }}
            >
              {summaryKPIs.criticalCount > 0 ? 'Costo > 38% del precio de venta' : 'Todos en margen saludable'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. PESTAÑAS PRINCIPALES DEL MÓDULO */}
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
          <Tab label={`📋 Fichas Técnicas & Escandallos (${recipes.length})`} />
          {canManageRecipes && <Tab label="📊 Auditoría de Food Cost" />}
        </Tabs>
      </Box>

      {/* TAB 0: FICHAS TÉCNICAS & ESCANDALLOS */}
      {mainTab === 0 && (
        <>
          {/* BARRA DE HERRAMIENTAS Y FILTROS */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: '18px', bgcolor: '#ffffff' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por plato, ingrediente o técnica..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Sección / Categoría"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="TODAS">Todas las Categorías</MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Estación de Cocina"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="TODAS">Todas las Estaciones</MenuItem>
                  {stations.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Rentabilidad"
                  value={marginFilter}
                  onChange={(e) => setMarginFilter(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px' } } }}
                >
                  <MenuItem value="TODOS">Todos los Márgenes</MenuItem>
                  <MenuItem value="ALTO">Alto Margen (&gt; 65%)</MenuItem>
                  <MenuItem value="MEDIO">Margen Medio (50% - 65%)</MenuItem>
                  <MenuItem value="BAJO">Margen Crítico (&lt; 50%)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Paper elevation={0} sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '12px', p: 0.3, bgcolor: '#f8fafc' }}>
                  <Tooltip title="Vista Fichas Gastronómicas">
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
                  <Tooltip title="Vista Tabla Comparativa">
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

          {/* VISTA FICHAS (CARDS VIEW) */}
          {viewMode === 'CARDS' ? (
            <Grid container spacing={2.5}>
              {filteredRecipes.map(recipe => {
                const fin = getRecipeFinancials(recipe);
                const isExpanded = expandedRecipeId === recipe.productId;

                return (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.productId}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: fin.foodCostPercent > 38 ? '#fca5a5' : '#e2e8f0',
                        borderRadius: '20px',
                        bgcolor: '#ffffff',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.07)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        {/* Cabecera del Plato */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Avatar
                              variant="rounded"
                              src={fin.product?.imageUrl}
                              sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: '#fef3c7', color: '#9a3412', fontWeight: 900 }}
                            >
                              {(fin.product?.name || recipe.productName || 'R')[0]}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
                                  {fin.product?.name || recipe.productName || 'Plato'}
                                </Typography>
                                <Chip
                                  label={recipe.station || 'COCINA'}
                                  size="small"
                                  sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}>
                                <TimerIcon sx={{ fontSize: 14 }} /> {recipe.preparationTimeMinutes || 10} min preparación • {recipe.portions || 1} porción • Dificultad: {recipe.difficulty || 'MEDIA'}
                              </Typography>
                            </Box>
                          </Box>

                          <Stack direction="column" spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                            <Chip
                              label={`Margen: ${fin.grossMarginPercent.toFixed(1)}%`}
                              color={fin.grossMarginPercent >= 65 ? 'success' : fin.grossMarginPercent >= 50 ? 'warning' : 'error'}
                              size="small"
                              sx={{ fontWeight: 900 }}
                            />
                            <Chip
                              label={`Food Cost: ${fin.foodCostPercent.toFixed(1)}%`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                bgcolor: fin.foodCostPercent <= 35 ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: fin.foodCostPercent <= 35 ? '#16a34a' : '#ef4444'
                              }}
                            />
                          </Stack>
                        </Box>

                        {/* Finanzas del Escandallo */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, p: 1.5, mb: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>Insumos Netos</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155' }}>
                              ${Math.round(fin.rawIngredientsCost).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>Empaque + Merma</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#64748b' }}>
                              ${Math.round(fin.packagingCost + fin.wasteCost).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>Costo Total</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#dc2626' }}>
                              ${fin.totalCost.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, display: 'block' }}>Precio Venta</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                              ${fin.salePrice.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Indicador de Porciones Disponibles según Almacén */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <InventoryIcon sx={{ fontSize: 16, color: fin.availablePortions > 5 ? '#16a34a' : '#dc2626' }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: fin.availablePortions > 5 ? '#16a34a' : '#dc2626' }}>
                              {fin.availablePortions > 0
                                ? `${fin.availablePortions} porciones posibles con stock actual en bodega`
                                : '⚠️ Sin stock disponible en inventario para preparar'}
                            </Typography>
                          </Box>

                          {recipe.allergens && recipe.allergens.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {recipe.allergens.slice(0, 2).map(a => (
                                <Chip key={a} label={a} size="small" sx={{ fontSize: '0.62rem', height: 20, bgcolor: '#fef2f2', color: '#991b1b', fontWeight: 700 }} />
                              ))}
                            </Box>
                          )}
                        </Box>

                        {/* Botón de Expansión de Ingredientes Detallados */}
                        <Button
                          fullWidth
                          size="small"
                          onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.productId)}
                          endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{ textTransform: 'none', fontWeight: 800, color: '#475569', bgcolor: '#f1f5f9', borderRadius: '10px', py: 0.6 }}
                        >
                          {isExpanded ? 'Ocultar ingredientes y técnicas' : `Ver ${recipe.ingredients?.length || 0} ingredientes y técnica de cocina`}
                        </Button>

                        {/* Detalle Desplegable */}
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e290b', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                              Ingredientes y Costeo por Ración:
                            </Typography>
                            <TableContainer sx={{ mb: 1.5 }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem' }}>Ingrediente</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem' }}>Cantidad</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.72rem' }}>Costo Unitario</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.72rem' }}>Costo Total</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {fin.ingredientsDetailed.map((ing, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                        {ing.invItem?.name || 'Ingrediente'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {ing.quantity} {ing.unit || ing.invItem?.unit}
                                      </TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        ${ing.invItem?.unitCost.toLocaleString()} / {ing.invItem?.unit}
                                      </TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e290b' }}>
                                        ${Math.round(ing.calculatedCost).toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>

                            {recipe.preparationInstructions && (
                              <Box sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: '10px' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.5 }}>
                                  Paso a Paso de Cocción:
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155', whiteSpace: 'pre-line' }}>
                                  {recipe.preparationInstructions}
                                </Typography>
                              </Box>
                            )}

                            {recipe.chefNotes && (
                              <Box sx={{ p: 1.2, bgcolor: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#92400e', display: 'block' }}>
                                  💡 Tip del Chef Ejecutivo:
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#78350f', fontSize: '0.72rem' }}>
                                  {recipe.chefNotes}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Collapse>

                        {/* Barra de Acciones de la Tarjeta */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PrintIcon sx={{ fontSize: 14 }} />}
                              onClick={() => handleOpenPrintModal(recipe)}
                              sx={{ borderRadius: '10px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'none', color: '#334155', borderColor: '#cbd5e1' }}
                            >
                              Ficha Técnica
                            </Button>
                          </Stack>

                          {canManageRecipes && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Editar Escandallo">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(recipe)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar Escandallo">
                                <IconButton size="small" color="error" onClick={() => setDeleteConfirmRecipe(recipe)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            /* VISTA TABLA COMPARATIVA */
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '18px', border: '1px solid #e2e8f0', overflowX: 'auto', maxWidth: '100%' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Plato / Receta</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Estación</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Porciones en Bodega</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Costo Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Precio Venta</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Margen Bruto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Food Cost %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecipes.map(recipe => {
                    const fin = getRecipeFinancials(recipe);

                    return (
                      <TableRow key={recipe.productId} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                            {fin.product?.name || recipe.productName || 'Plato'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {recipe.ingredients?.length || 0} insumos • {recipe.preparationTimeMinutes || 10} min
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={recipe.station || 'COCINA'} size="small" sx={{ fontWeight: 800, borderRadius: '8px' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${fin.availablePortions} porciones`}
                            size="small"
                            color={fin.availablePortions > 5 ? 'success' : 'error'}
                            sx={{ fontWeight: 800, borderRadius: '8px' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                          ${fin.totalCost.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          ${fin.salePrice.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                            +{fin.grossMarginPercent.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            ${fin.grossMargin.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${fin.foodCostPercent.toFixed(1)}%`}
                            size="small"
                            color={fin.foodCostPercent <= 35 ? 'success' : 'warning'}
                            sx={{ fontWeight: 800, borderRadius: '8px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title="Ficha Técnica">
                              <IconButton size="small" onClick={() => handleOpenPrintModal(recipe)}>
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManageRecipes && (
                              <>
                                <Tooltip title="Editar Escandallo">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(recipe)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton size="small" color="error" onClick={() => setDeleteConfirmRecipe(recipe)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
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

      {/* TAB 1: AUDITORÍA DE FOOD COST */}
      {mainTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Auditoría y Control de Food Cost %
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diagnóstico de márgenes para prevenir fugas de rentabilidad y garantizar que el costo de alimentos se mantenga en el rango saludable del 28% al 35%.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Gráfico de Barras de Food Cost por Plato */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', mb: 2 }}>
                  Food Cost % por Platillo (Target &lt; 35%):
                </Typography>
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={recipes.map(r => {
                        const fin = getRecipeFinancials(r);
                        return {
                          name: (fin.product?.name || r.productName || '').slice(0, 16),
                          foodCost: +fin.foodCostPercent.toFixed(1)
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 50]} />
                      <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Food Cost']} />
                      <Bar dataKey="foodCost" radius={[6, 6, 0, 0]}>
                        {recipes.map((r, idx) => {
                          const fin = getRecipeFinancials(r);
                          return (
                            <Cell key={`cell-${idx}`} fill={fin.foodCostPercent <= 32 ? '#16a34a' : fin.foodCostPercent <= 38 ? '#f59e0b' : '#ef4444'} />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Ranking de Platos Más y Menos Rentables */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b', mb: 1.5 }}>
                  Platos con Mayor Margen ($):
                </Typography>
                <Stack spacing={1.2}>
                  {[...recipes]
                    .map(r => ({ recipe: r, fin: getRecipeFinancials(r) }))
                    .sort((a, b) => b.fin.grossMargin - a.fin.grossMargin)
                    .slice(0, 5)
                    .map(({ recipe, fin }) => (
                      <Box key={recipe.productId} sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                            {fin.product?.name || recipe.productName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            P. Venta: ${fin.salePrice.toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                          +${fin.grossMargin.toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* DIÁLOGO MODAL: CREAR / EDITAR RECETA */}
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
              <MenuBookIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
                {editingRecipe?.id ? 'Editar Escandallo de Receta' : 'Crear Ficha Técnica de Receta'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configura insumos milimétricos, tiempos y merma
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setIsEditModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {editingRecipe && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Platillo del Menú"
                  value={editingRecipe.productId || ''}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setEditingRecipe({
                      ...editingRecipe,
                      productId: e.target.value,
                      productName: prod?.name || ''
                    });
                  }}
                  slotProps={{ input: { sx: { fontWeight: 800 } } }}
                >
                  {products.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} (${p.price.toLocaleString()} COP)
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Estación de Cocina"
                  value={editingRecipe.station || 'COCINA'}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, station: e.target.value as any })}
                >
                  {stations.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Dificultad"
                  value={editingRecipe.difficulty || 'MEDIA'}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, difficulty: e.target.value as any })}
                >
                  <MenuItem value="FÁCIL">Fácil</MenuItem>
                  <MenuItem value="MEDIA">Media</MenuItem>
                  <MenuItem value="ALTA">Alta</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Tiempo Prep (min)"
                  value={editingRecipe.preparationTimeMinutes || 10}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, preparationTimeMinutes: Number(e.target.value) })}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Porciones Salida"
                  value={editingRecipe.portions || 1}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, portions: Number(e.target.value) })}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="% Margen Merma"
                  value={editingRecipe.wasteMarginPercentage || 0}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, wasteMarginPercentage: Number(e.target.value) })}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Costo Empaque ($)"
                  value={editingRecipe.packagingCost || 0}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, packagingCost: Number(e.target.value) })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Grid>

              {/* SECCIÓN INGREDIENTES */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                    Insumos y Materias Primas del Escandallo:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddIngredientRow}
                      sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '10px' }}
                    >
                      Añadir Insumo
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddNewCustomIngredientRow}
                      sx={{
                        fontWeight: 900,
                        textTransform: 'none',
                        borderRadius: '10px',
                        bgcolor: '#65a30d',
                        '&:hover': { bgcolor: '#4d7c0f' },
                        color: '#ffffff'
                      }}
                    >
                      ✨ Insumo Nuevo (No está en inventario)
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.2}>
                  {(editingRecipe.ingredients || []).map((ing, idx) => {
                    const isNew = ing.inventoryItemId === '__NEW__';
                    const inv = inventory.find(i => i.id === ing.inventoryItemId);
                    const cost = calculateIngredientCost(inv, ing.quantity, ing.unit);

                    return (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: isNew ? '#bef264' : '#e2e8f0',
                          bgcolor: isNew ? '#fbfdf5' : '#ffffff',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: 1.5,
                          alignItems: { sm: 'center' }
                        }}
                      >
                        {isNew ? (
                          <Box sx={{ flex: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Nombre del Nuevo Insumo"
                              placeholder="Ej. Trufa Negra, Panko, Aceite Trufado..."
                              value={ing.customIngredientName || ''}
                              onChange={(e) => handleUpdateIngredientRow(idx, 'customIngredientName', e.target.value)}
                              slotProps={{
                                input: {
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Chip
                                        label="AUTO-INVENTARIO"
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.62rem', fontWeight: 900, bgcolor: '#ecfccb', color: '#3f6212' }}
                                      />
                                    </InputAdornment>
                                  ),
                                }
                              }}
                            />
                            <Tooltip title="Cambiar a insumo existente del catálogo">
                              <Button
                                size="small"
                                onClick={() => handleUpdateIngredientRow(idx, 'inventoryItemId', inventory[0]?.id || '1')}
                                sx={{ minWidth: 65, fontSize: '0.7rem', fontWeight: 700 }}
                              >
                                Existente
                              </Button>
                            </Tooltip>
                          </Box>
                        ) : (
                          <TextField
                            select
                            size="small"
                            label="Insumo de Almacén"
                            value={ing.inventoryItemId}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                handleUpdateIngredientRow(idx, 'inventoryItemId', '__NEW__');
                                handleUpdateIngredientRow(idx, 'customIngredientName', '');
                              } else {
                                handleUpdateIngredientRow(idx, 'inventoryItemId', e.target.value);
                              }
                            }}
                            sx={{ flex: 1.5 }}
                          >
                            <MenuItem value="__NEW__" sx={{ fontWeight: 800, color: '#16a34a', bgcolor: '#f0fdf4' }}>
                              ✨ + Crear / Registrar nuevo insumo no existente...
                            </MenuItem>
                            <Divider sx={{ my: 0.5 }} />
                            {inventory.map(invItem => (
                              <MenuItem key={invItem.id} value={invItem.id}>
                                {invItem.name} (${invItem.unitCost.toLocaleString()} / {invItem.unit})
                              </MenuItem>
                            ))}
                          </TextField>
                        )}

                        <TextField
                          size="small"
                          type="number"
                          label="Cantidad"
                          value={ing.quantity}
                          onChange={(e) => handleUpdateIngredientRow(idx, 'quantity', Number(e.target.value))}
                          sx={{ width: { xs: '100%', sm: 110 } }}
                        />

                        <TextField
                          size="small"
                          label="Unidad"
                          value={ing.unit || inv?.unit || 'Kg'}
                          onChange={(e) => handleUpdateIngredientRow(idx, 'unit', e.target.value)}
                          sx={{ width: { xs: '100%', sm: 110 } }}
                        />

                        <Box sx={{ minWidth: 90, textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 700 }}>
                            {isNew ? 'Costo Estimado:' : 'Costo Insumo:'}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                            ${Math.round(cost).toLocaleString()}
                          </Typography>
                        </Box>

                        <IconButton size="small" color="error" onClick={() => handleRemoveIngredientRow(idx)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    );
                  })}
                </Stack>
              </Grid>

              {/* ALÉRGENOS */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mt: 1, mb: 0.8 }}>
                  Alérgenos Alimentarios:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {AVAILABLE_ALLERGENS.map(allergen => {
                    const isChecked = (editingRecipe.allergens || []).includes(allergen);
                    return (
                      <Chip
                        key={allergen}
                        label={allergen}
                        clickable
                        onClick={() => toggleAllergen(allergen)}
                        color={isChecked ? 'error' : 'default'}
                        variant={isChecked ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 800, borderRadius: '8px' }}
                      />
                    );
                  })}
                </Box>
              </Grid>

              {/* INSTRUCCIONES Y NOTAS */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Técnica de Cocción y Emplatado"
                  placeholder="Detalla los pasos para que cualquier cocinero prepare el plato idéntico..."
                  value={editingRecipe.preparationInstructions || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, preparationInstructions: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notas Especiales / Tip del Chef"
                  placeholder="Ej. Mantener temperatura de plancha a 200°C..."
                  value={editingRecipe.chefNotes || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, chefNotes: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setIsEditModalOpen(false)} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRecipe}
            sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#1e290b', px: 3, '&:hover': { bgcolor: '#2d3e11' } }}
          >
            Guardar Escandallo
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL FICHA TÉCNICA CULINARIA IMPRIMIBLE */}
      <Dialog
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 2 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>
            Ficha Técnica Gastronómica Oficial
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ borderRadius: '10px', fontWeight: 800, bgcolor: '#1e290b' }}
            >
              Imprimir
            </Button>
            <IconButton size="small" onClick={() => setIsPrintModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {printingRecipe && (() => {
            const fin = getRecipeFinancials(printingRecipe);
            return (
              <Box id="printable-technical-sheet">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e290b', pb: 2, mb: 2.5 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
                      {fin.product?.name || printingRecipe.productName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                      Ficha de Cocina Sésamo Alimentos • Estación: {printingRecipe.station || 'COCINA'} • Dificultad: {printingRecipe.difficulty || 'MEDIA'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      P. Venta: ${fin.salePrice.toLocaleString()} COP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>
                      Food Cost: {fin.foodCostPercent.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>
                  Gramaje de Insumos por Porción:
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', mb: 2.5 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Ingrediente</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Porción</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Notas de Mise en Place</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {printingRecipe.ingredients?.map((ing, idx) => {
                        const inv = inventory.find(i => i.id === ing.inventoryItemId);
                        return (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontWeight: 800 }}>{inv?.name || 'Insumo'}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{ing.quantity} {ing.unit || inv?.unit}</TableCell>
                            <TableCell sx={{ color: '#64748b' }}>{ing.notes || 'Preparado fresco'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5, textTransform: 'uppercase' }}>
                    Paso a Paso de Cocción y Emplatado:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {printingRecipe.preparationInstructions || 'Sin instrucciones detalladas.'}
                    </Typography>
                  </Paper>
                </Box>

                {printingRecipe.chefNotes && (
                  <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#92400e', display: 'block' }}>
                      Recomendaciones del Chef:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#78350f' }}>
                      {printingRecipe.chefNotes}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO CONFIRMAR ELIMINACIÓN */}
      <Dialog
        open={Boolean(deleteConfirmRecipe)}
        onClose={() => setDeleteConfirmRecipe(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#dc2626' }}>
          ¿Eliminar Escandallo de Receta?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Confirmas que deseas eliminar el escandallo y costeo de &quot;{deleteConfirmRecipe?.productName}&quot;? Los insumos del almacén no se eliminarán.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmRecipe(null)} sx={{ fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmRecipe && handleDeleteRecipe(deleteConfirmRecipe)}
            sx={{ fontWeight: 900, borderRadius: '10px' }}
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
