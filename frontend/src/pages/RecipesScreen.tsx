import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Snackbar,
  Stack,
  Collapse,
  Tabs,
  Tab,
  Avatar,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress
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
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  Speed as SpeedIcon,
  ContentCopy as ContentCopyIcon,
  AutoFixHigh as AutoFixHighIcon,
  Scale as ScaleIcon
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

// Common Culinary Measurement Units
const CULINARY_UNITS: { value: string; label: string; group: string }[] = [
  { value: 'g', label: 'g (Gramos)', group: 'Peso' },
  { value: 'Kg', label: 'Kg (Kilogramos)', group: 'Peso' },
  { value: 'oz', label: 'oz (Onzas)', group: 'Peso' },
  { value: 'ml', label: 'ml (Mililitros)', group: 'Volumen' },
  { value: 'Lt', label: 'Lt (Litros)', group: 'Volumen' },
  { value: 'Unidad', label: 'Unidad (Und)', group: 'Conteo' },
  { value: 'Porción', label: 'Porción', group: 'Conteo' },
  { value: 'Cucharada', label: 'Cucharada (15 ml)', group: 'Volumen' }
];

// Available Stations & Allergens
const STATIONS = ['PARRILLA', 'HORNO', 'COCINA', 'BAR', 'ENSALADAS', 'REPOSTERÍA'];
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

// Helper to calculate ingredient cost with unit conversions
function calculateIngredientCost(item: InventoryItem | undefined, quantity: number, unit?: string, manualUnitCost?: number): number {
  const baseCost = typeof manualUnitCost === 'number' && manualUnitCost > 0 ? manualUnitCost : (item?.unitCost || 0);
  if (baseCost <= 0 || quantity <= 0) return 0;

  const invUnit = (item?.unit || '').toLowerCase();
  const reqUnit = (unit || item?.unit || '').toLowerCase();

  // Weight conversions
  if (invUnit.includes('kg') || invUnit.includes('kilo')) {
    if (reqUnit === 'g' || reqUnit.includes('gram')) return (quantity / 1000) * baseCost;
    if (reqUnit === 'oz' || reqUnit.includes('onza')) return ((quantity * 28.3495) / 1000) * baseCost;
    return quantity * baseCost;
  }

  // Volume conversions
  if (invUnit.includes('litro') || invUnit.includes('lt')) {
    if (reqUnit === 'ml' || reqUnit.includes('mililitro')) return (quantity / 1000) * baseCost;
    if (reqUnit.includes('cucharada')) return ((quantity * 15) / 1000) * baseCost;
    return quantity * baseCost;
  }

  // Unit / portion fallback
  return quantity * baseCost;
}

// Portion & Bottleneck Analysis
interface PortionAnalysis {
  portions: number;
  bottleneckItemName?: string;
  bottleneckStock?: number;
  bottleneckUnit?: string;
  totalIngredientsCount: number;
}

function calculatePortionAnalysis(recipe: Recipe, inventoryList: InventoryItem[]): PortionAnalysis {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return { portions: 0, totalIngredientsCount: 0 };
  }

  let minPortions = Infinity;
  let bottleneck: { name: string; stock: number; unit: string } | undefined;

  for (const ing of recipe.ingredients) {
    const item = inventoryList.find(i => i.id === ing.inventoryItemId);
    const itemName = item?.name || ing.customIngredientName || ing.name || 'Insumo no registrado';
    const itemUnit = item?.unit || ing.unit || 'und';

    if (!item) {
      minPortions = 0;
      bottleneck = { name: itemName, stock: 0, unit: itemUnit };
      break;
    }

    const invUnit = (item.unit || '').toLowerCase();
    const reqUnit = (ing.unit || item.unit || '').toLowerCase();
    let usageInInvUnits = ing.quantity;

    if ((invUnit.includes('kg') || invUnit.includes('kilo')) && (reqUnit === 'g' || reqUnit.includes('gram'))) {
      usageInInvUnits = ing.quantity / 1000;
    } else if ((invUnit.includes('litro') || invUnit.includes('lt')) && (reqUnit === 'ml' || reqUnit.includes('mili'))) {
      usageInInvUnits = ing.quantity / 1000;
    }

    if (usageInInvUnits > 0) {
      const possible = Math.floor((item.currentStock || 0) / usageInInvUnits);
      if (possible < minPortions) {
        minPortions = possible;
        bottleneck = { name: itemName, stock: item.currentStock || 0, unit: itemUnit };
      }
    }
  }

  return {
    portions: minPortions === Infinity ? 0 : Math.max(0, minPortions),
    bottleneckItemName: bottleneck?.name,
    bottleneckStock: bottleneck?.stock,
    bottleneckUnit: bottleneck?.unit,
    totalIngredientsCount: recipe.ingredients.length
  };
}

export default function RecipesScreen() {
  const { user } = useAuthStore();
  const isKitchen = user?.role === 'COCINA';
  const canManageRecipes = ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'].includes(user?.role || '');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seedingSamples, setSeedingSamples] = useState<boolean>(false);

  // Tabs (0: Fichas & Escandallos, 1: Auditoría Food Cost)
  const [mainTab, setMainTab] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [selectedStation, setSelectedStation] = useState('TODAS');
  const [selectedType, setSelectedType] = useState('TODAS');
  const [marginFilter, setMarginFilter] = useState('TODOS');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);

  // Form custom product fields
  const [customProductName, setCustomProductName] = useState('');
  const [customProductPrice, setCustomProductPrice] = useState<number | ''>(22000);
  const [customProductCategory, setCustomProductCategory] = useState('Platos Fuertes');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);

  const [deleteConfirmRecipe, setDeleteConfirmRecipe] = useState<Recipe | null>(null);

  // Feedback Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const configureProductId = searchParams.get('configureProduct');

  // Compute products from catalog that do NOT yet have an associated recipe
  const pendingProducts = useMemo(() => {
    const configuredProductIds = new Set(recipes.map(r => String(r.productId)));
    return products.filter(p => !configuredProductIds.has(String(p.id)));
  }, [products, recipes]);

  const handleConfigurePendingProduct = useCallback((product: Product) => {
    setIsNewProductMode(false);
    const defaultFirstInv = inventory[0];
    setEditingRecipe({
      productId: String(product.id),
      productName: product.name,
      category: 'Platos Fuertes',
      recipeType: 'PLATO_MENU',
      preparationTimeMinutes: 15,
      portions: 1,
      wasteMarginPercentage: 5,
      packagingCost: 500,
      station: 'COCINA',
      difficulty: 'MEDIA',
      allergens: [],
      salePriceManual: product.price,
      ingredients: defaultFirstInv ? [
        {
          inventoryItemId: String(defaultFirstInv.id),
          customIngredientName: defaultFirstInv.name,
          quantity: defaultFirstInv.unit?.toLowerCase().includes('kg') ? 150 : 1,
          unit: defaultFirstInv.unit?.toLowerCase().includes('kg') ? 'g' : (defaultFirstInv.unit || 'Unidad'),
          notes: ''
        }
      ] : [],
      preparationInstructions: '1. Preparar mise en place de ingredientes.\n2. Cocinar y montar en plato o empaque.\n3. Servir a temperatura ideal.',
      chefNotes: 'Ficha técnica asignada desde el catálogo de platillos.',
    });
    setIsEditModalOpen(true);
  }, [inventory]);

  // If navigated with ?configureProduct=<id>, auto-open editor for that product
  useEffect(() => {
    if (configureProductId && products.length > 0) {
      const targetProd = products.find(p => String(p.id) === String(configureProductId));
      if (targetProd) {
        handleConfigurePendingProduct(targetProd);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('configureProduct');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [configureProductId, products, searchParams, setSearchParams, handleConfigurePendingProduct]);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const handleUpdate = () => loadData(false);
    window.addEventListener('sesamo_recipes_updated', handleUpdate);
    window.addEventListener('sesamo_inventory_updated', handleUpdate);
    window.addEventListener('sesamo_order_created', handleUpdate);
    window.addEventListener('sesamo_catalog_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_recipes_updated', handleUpdate);
      window.removeEventListener('sesamo_inventory_updated', handleUpdate);
      window.removeEventListener('sesamo_order_created', handleUpdate);
      window.removeEventListener('sesamo_catalog_updated', handleUpdate);
    };
  }, []);

  // Compute metrics for a single recipe
  const getRecipeFinancials = useCallback((recipe: Recipe) => {
    const product = products.find(p => String(p.id) === String(recipe.productId));
    const salePrice = (recipe.salePriceManual && recipe.salePriceManual > 0)
      ? recipe.salePriceManual
      : (product?.price || 0);

    let rawIngredientsCost = 0;
    let hasZeroCostInsumos = false;

    const ingredientsDetailed = (recipe.ingredients || []).map(ing => {
      const invItem = inventory.find(i => String(i.id) === String(ing.inventoryItemId));
      const cost = calculateIngredientCost(invItem, ing.quantity, ing.unit, ing.unitCostManual);
      rawIngredientsCost += cost;

      if ((!invItem || invItem.unitCost <= 0) && (!ing.unitCostManual || ing.unitCostManual <= 0)) {
        hasZeroCostInsumos = true;
      }

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
    const portionAnalysis = calculatePortionAnalysis(recipe, inventory);

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
      portionAnalysis,
      hasZeroCostInsumos,
    };
  }, [products, inventory]);

  // Aggregated KPI summary
  const summaryKPIs = useMemo(() => {
    if (recipes.length === 0) {
      return { totalRecipes: 0, avgCost: 0, avgMargin: 0, avgFoodCost: 0, criticalCount: 0, healthyCount: 0 };
    }

    let totalCostAccum = 0;
    let totalMarginPctAccum = 0;
    let totalFoodCostPctAccum = 0;
    let criticalCount = 0;
    let healthyCount = 0;

    recipes.forEach(r => {
      const fin = getRecipeFinancials(r);
      totalCostAccum += fin.totalCost;
      totalMarginPctAccum += fin.grossMarginPercent;
      totalFoodCostPctAccum += fin.foodCostPercent;
      if (fin.foodCostPercent > 35) {
        criticalCount++;
      } else if (fin.foodCostPercent <= 32) {
        healthyCount++;
      }
    });

    return {
      totalRecipes: recipes.length,
      avgCost: Math.round(totalCostAccum / recipes.length),
      avgMargin: +(totalMarginPctAccum / recipes.length).toFixed(1),
      avgFoodCost: +(totalFoodCostPctAccum / recipes.length).toFixed(1),
      criticalCount,
      healthyCount
    };
  }, [recipes, getRecipeFinancials]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const fin = getRecipeFinancials(r);
      const prodName = fin.product?.name?.toLowerCase() || r.productName?.toLowerCase() || '';
      const matchesSearch = prodName.includes(searchQuery.toLowerCase()) ||
        (r.preparationInstructions?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.ingredients?.some(i => {
          const inv = inventory.find(invI => String(invI.id) === String(i.inventoryItemId));
          const name = inv?.name || i.customIngredientName || i.name || '';
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        }));

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== 'TODAS') {
        const cat = r.category;
        if (cat !== selectedCategory) return false;
      }

      // Station filter
      if (selectedStation !== 'TODAS' && r.station !== selectedStation) {
        return false;
      }

      // Type filter (Plato menú vs Sub-receta)
      if (selectedType !== 'TODAS') {
        const type = r.recipeType || 'PLATO_MENU';
        if (type !== selectedType) return false;
      }

      // Margin filter
      if (marginFilter === 'OPTIMO' && fin.foodCostPercent > 30) return false;
      if (marginFilter === 'SALUDABLE' && (fin.foodCostPercent <= 30 || fin.foodCostPercent > 35)) return false;
      if (marginFilter === 'CRITICO' && fin.foodCostPercent <= 35) return false;

      return true;
    });
  }, [recipes, inventory, searchQuery, selectedCategory, selectedStation, selectedType, marginFilter, getRecipeFinancials]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const existingProductIds = new Set(recipes.map(r => String(r.productId)));
    const availableProduct = products.find(p => !existingProductIds.has(String(p.id)));

    const defaultFirstInv = inventory[0];

    if (availableProduct) {
      setIsNewProductMode(false);
      setEditingRecipe({
        productId: String(availableProduct.id),
        productName: availableProduct.name,
        category: 'Platos Fuertes',
        recipeType: 'PLATO_MENU',
        preparationTimeMinutes: 15,
        portions: 1,
        wasteMarginPercentage: 5,
        packagingCost: 500,
        station: 'COCINA',
        difficulty: 'MEDIA',
        allergens: [],
        ingredients: [
          {
            inventoryItemId: defaultFirstInv ? String(defaultFirstInv.id) : '__NEW__',
            customIngredientName: defaultFirstInv ? defaultFirstInv.name : 'Insumo Principal',
            quantity: defaultFirstInv?.unit?.toLowerCase().includes('kg') ? 150 : 1,
            unit: defaultFirstInv?.unit?.toLowerCase().includes('kg') ? 'g' : (defaultFirstInv?.unit || 'Unidad'),
            notes: ''
          }
        ],
        preparationInstructions: '1. Preparar mise en place de ingredientes.\n2. Cocinar y montar en plato o empaque.\n3. Servir a temperatura ideal.',
        chefNotes: 'Mantener insumos frescos y verificar punto de cocción antes de servicio.',
      });
    } else {
      // Direct new dish mode (works even if database has 0 products)
      setIsNewProductMode(true);
      setCustomProductName('Hamburguesa Especial Sésamo');
      setCustomProductPrice(24000);
      setCustomProductCategory('Hamburguesas');

      setEditingRecipe({
        productId: `prod-temp-${Date.now()}`,
        productName: 'Hamburguesa Especial Sésamo',
        category: 'Hamburguesas',
        recipeType: 'PLATO_MENU',
        preparationTimeMinutes: 15,
        portions: 1,
        wasteMarginPercentage: 5,
        packagingCost: 600,
        station: 'PARRILLA',
        difficulty: 'MEDIA',
        allergens: ['Gluten', 'Lácteos'],
        ingredients: [
          {
            inventoryItemId: defaultFirstInv ? String(defaultFirstInv.id) : '__NEW__',
            customIngredientName: defaultFirstInv ? defaultFirstInv.name : 'Carne de Res Molida 80/20',
            quantity: 180,
            unit: 'g',
            unitCostManual: 3600,
            notes: 'Porción por hamburguesa'
          }
        ],
        preparationInstructions: '1. Sellar la carne en plancha a 200°C por 3 minutos por lado.\n2. Tostar pan brioche con mantequilla.\n3. Montar vegetales frescos y servir.',
        chefNotes: 'Servir inmediatamente para mantener textura crujiente del pan.',
      });
    }

    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (recipe: Recipe) => {
    setIsNewProductMode(false);
    const prod = products.find(p => String(p.id) === String(recipe.productId));
    setCustomProductName(recipe.productName || prod?.name || '');
    setCustomProductPrice(recipe.salePriceManual || prod?.price || 0);
    setCustomProductCategory(recipe.category || 'General');

    setEditingRecipe(JSON.parse(JSON.stringify(recipe)));
    setIsEditModalOpen(true);
  };

  // Duplicate / Clone Recipe
  const handleDuplicateRecipe = (recipe: Recipe) => {
    const prod = products.find(p => String(p.id) === String(recipe.productId));
    const clonedName = `${recipe.productName || prod?.name || 'Receta'} (Copia)`;
    const newProdId = `prod-copy-${Date.now()}`;

    setIsNewProductMode(true);
    setCustomProductName(clonedName);
    setCustomProductPrice(recipe.salePriceManual || prod?.price || 0);
    setCustomProductCategory(recipe.category || 'General');

    setEditingRecipe({
      ...JSON.parse(JSON.stringify(recipe)),
      id: undefined,
      productId: newProdId,
      productName: clonedName,
      recipeType: recipe.recipeType || 'PLATO_MENU',
      salePriceManual: recipe.salePriceManual || prod?.price || 0,
      updatedAt: Date.now()
    });

    setIsEditModalOpen(true);
    setSnackbar({
      open: true,
      message: `Receta clonada como "${clonedName}". Ajusta los ingredientes o precio y guarda.`,
      severity: 'info'
    });
  };

  // Handle Save Recipe
  const handleSaveRecipe = async () => {
    if (!editingRecipe) return;

    let targetProductId = editingRecipe.productId;
    let targetProductName = editingRecipe.productName;
    let targetPrice = Number(customProductPrice) || 0;

    // If creating a new dish directly, ensure it exists in catalog
    if (isNewProductMode) {
      if (!customProductName.trim()) {
        setSnackbar({ open: true, message: 'Ingresa el nombre del platillo o preparación.', severity: 'error' });
        return;
      }
      targetProductName = customProductName.trim();

      // Look if product already exists with this name, otherwise create it
      const existing = products.find(p => p.name.toLowerCase().trim() === targetProductName!.toLowerCase());
      if (existing) {
        targetProductId = String(existing.id);
      } else {
        try {
          const newProduct = await mockApi.products.create({
            sku: `PLT-${Date.now().toString().slice(-4)}`,
            name: targetProductName,
            price: targetPrice,
            cost: Math.round(targetPrice * 0.3),
            description: `Receta gastronómica con ${editingRecipe.ingredients?.length || 0} insumos`,
            isAvailable: true,
            isActive: true,
            categoryId: '1'
          });
          targetProductId = String(newProduct.id);
          products.unshift(newProduct);
        } catch (e) {
          targetProductId = `prod-${Date.now()}`;
        }
      }
    }

    if (!editingRecipe.ingredients || editingRecipe.ingredients.length === 0) {
      setSnackbar({ open: true, message: 'La receta debe incluir al menos un insumo.', severity: 'error' });
      return;
    }

    try {
      const recipeToSave: Recipe = {
        id: editingRecipe.id || `rec-${Date.now()}`,
        productId: String(targetProductId),
        productName: targetProductName,
        category: customProductCategory || editingRecipe.category || 'General',
        recipeType: editingRecipe.recipeType || 'PLATO_MENU',
        ingredients: editingRecipe.ingredients.map(ing => ({
          ...ing,
          quantity: Number(ing.quantity) || 1,
          unitCostManual: ing.unitCostManual ? Number(ing.unitCostManual) : undefined
        })),
        preparationTimeMinutes: Number(editingRecipe.preparationTimeMinutes) || 15,
        portions: Number(editingRecipe.portions) || 1,
        wasteMarginPercentage: Number(editingRecipe.wasteMarginPercentage) || 0,
        packagingCost: Number(editingRecipe.packagingCost) || 0,
        preparationInstructions: editingRecipe.preparationInstructions || '',
        allergens: editingRecipe.allergens || [],
        chefNotes: editingRecipe.chefNotes || '',
        difficulty: editingRecipe.difficulty || 'MEDIA',
        station: editingRecipe.station || 'COCINA',
        salePriceManual: targetPrice,
        updatedAt: Date.now(),
      };

      await mockApi.recipes.save(recipeToSave);
      setIsEditModalOpen(false);
      setEditingRecipe(null);

      setSnackbar({
        open: true,
        message: `Escandallo de "${recipeToSave.productName}" guardado exitosamente.`,
        severity: 'success'
      });

      loadData(false);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al guardar la receta.', severity: 'error' });
    }
  };

  // Seed sample recipes
  const handleSeedSamples = async () => {
    try {
      setSeedingSamples(true);

      const samples: Omit<Recipe, 'id'>[] = [
        {
          productId: `sample-burger-${Date.now()}`,
          productName: 'Hamburguesa Doble Queso Sésamo',
          category: 'Hamburguesas',
          recipeType: 'PLATO_MENU',
          preparationTimeMinutes: 12,
          portions: 1,
          wasteMarginPercentage: 4,
          packagingCost: 700,
          salePriceManual: 26000,
          difficulty: 'MEDIA',
          station: 'PARRILLA',
          allergens: ['Gluten', 'Lácteos', 'Sésamo'],
          ingredients: [
            { inventoryItemId: '__NEW__', customIngredientName: 'Pan Brioche Artesanal', quantity: 1, unit: 'Unidad', unitCostManual: 1200 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Carne de Res Molida 80/20', quantity: 180, unit: 'g', unitCostManual: 3600 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Queso Cheddar Americano', quantity: 40, unit: 'g', unitCostManual: 1000 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Tocineta Ahumada', quantity: 40, unit: 'g', unitCostManual: 1200 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Salsa Especial de la Casa', quantity: 30, unit: 'ml', unitCostManual: 400 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Cebolla Caramelizada', quantity: 30, unit: 'g', unitCostManual: 300 },
          ],
          preparationInstructions: '1. Sellar la carne en plancha a fuego vivo formando costra.\n2. Fundir cheddar doble sobre la carne caliente.\n3. Tostar pan brioche y coronar con tocineta crujiente y salsa.',
          chefNotes: 'Mantener la carne a temperatura ambiente 10 min antes del grill para cocción homogénea.'
        },
        {
          productId: `sample-pizza-${Date.now()}`,
          productName: 'Pizza Margherita Clásica',
          category: 'Pizzas',
          recipeType: 'PLATO_MENU',
          preparationTimeMinutes: 10,
          portions: 1,
          wasteMarginPercentage: 3,
          packagingCost: 900,
          salePriceManual: 28000,
          difficulty: 'MEDIA',
          station: 'HORNO',
          allergens: ['Gluten', 'Lácteos'],
          ingredients: [
            { inventoryItemId: '__NEW__', customIngredientName: 'Masa Madre Fermentada 48h', quantity: 250, unit: 'g', unitCostManual: 1400 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Salsa de Tomate San Marzano', quantity: 80, unit: 'g', unitCostManual: 800 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Queso Mozzarella Flor di Latte', quantity: 120, unit: 'g', unitCostManual: 3200 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Albahaca Fresca', quantity: 10, unit: 'g', unitCostManual: 250 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Aceite de Oliva Extra Virgen', quantity: 15, unit: 'ml', unitCostManual: 500 },
          ],
          preparationInstructions: '1. Estirar la masa a mano dejando borde pronunciado (cornicione).\n2. Esparcir salsa y mozzarella.\n3. Hornear a 400°C por 90 segundos. Finalizar con albahaca y oliva.',
          chefNotes: 'No usar rodillo para preservar el alveolado de la masa en el borde.'
        },
        {
          productId: `sample-fries-${Date.now()}`,
          productName: 'Papas Rústicas a las Finas Hierbas',
          category: 'Entradas',
          recipeType: 'PLATO_MENU',
          preparationTimeMinutes: 8,
          portions: 1,
          wasteMarginPercentage: 5,
          packagingCost: 400,
          salePriceManual: 14000,
          difficulty: 'FÁCIL',
          station: 'COCINA',
          allergens: [],
          ingredients: [
            { inventoryItemId: '__NEW__', customIngredientName: 'Papa Sabanera en Cascos', quantity: 300, unit: 'g', unitCostManual: 1200 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Aceite Vegetal de Fritura', quantity: 40, unit: 'ml', unitCostManual: 450 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Romero y Finas Hierbas', quantity: 5, unit: 'g', unitCostManual: 200 },
            { inventoryItemId: '__NEW__', customIngredientName: 'Sal Marina y Pimienta Negra', quantity: 5, unit: 'g', unitCostManual: 100 },
          ],
          preparationInstructions: '1. Freír en doble cocción: primero a 140°C por 5 min, luego a 180°C por 3 min para lograr crocancia.\n2. Escurrir y espolvorear sal marina y romero.',
          chefNotes: 'Servir en cono térmico de papel antigrasa inmediatamente.'
        }
      ];

      for (const sample of samples) {
        // Create product first
        const p = await mockApi.products.create({
          sku: `PLT-${Date.now().toString().slice(-4)}`,
          name: sample.productName!,
          price: sample.salePriceManual || 20000,
          cost: Math.round((sample.salePriceManual || 20000) * 0.3),
          categoryId: '1',
          description: `Ficha técnica culinaria estándar`,
          isAvailable: true,
          isActive: true
        });

        await mockApi.recipes.save({
          ...sample,
          id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: String(p.id),
          updatedAt: Date.now()
        });
      }

      setSnackbar({
        open: true,
        message: '¡3 fichas técnicas maestras cargadas con insumos y Food Cost calculados!',
        severity: 'success'
      });
      await loadData(false);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error cargando ejemplos.', severity: 'error' });
    } finally {
      setSeedingSamples(false);
    }
  };

  // Delete Recipe
  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await mockApi.recipes.delete(recipe.productId);
      setDeleteConfirmRecipe(null);
      setSnackbar({ open: true, message: 'Ficha técnica eliminada.', severity: 'info' });
      loadData(false);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar la receta.', severity: 'error' });
    }
  };

  // Print Technical Sheet Modal
  const handleOpenPrintModal = (recipe: Recipe) => {
    setPrintingRecipe(recipe);
    setIsPrintModalOpen(true);
  };

  // Ingredient list handlers in Modal
  const handleAddIngredientRow = () => {
    if (!editingRecipe) return;
    const firstInv = inventory[0];
    const newIngredients = [
      ...(editingRecipe.ingredients || []),
      {
        inventoryItemId: firstInv ? String(firstInv.id) : '__NEW__',
        customIngredientName: firstInv ? firstInv.name : 'Insumo Adicional',
        quantity: 1,
        unit: firstInv ? firstInv.unit : 'g',
        notes: ''
      }
    ];
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleAddNewCustomIngredientRow = () => {
    if (!editingRecipe) return;
    const newIngredients = [
      ...(editingRecipe.ingredients || []),
      {
        inventoryItemId: '__NEW__',
        customIngredientName: '',
        quantity: 100,
        unit: 'g',
        unitCostManual: 1500,
        notes: 'Nuevo insumo para inventario'
      }
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

    if (field === 'inventoryItemId' && value !== '__NEW__') {
      const inv = inventory.find(i => String(i.id) === String(value));
      if (inv) {
        newIngredients[index].unit = inv.unit;
        newIngredients[index].name = inv.name;
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
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
        <CircularProgress size={44} sx={{ color: '#65a30d', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b' }}>
          Cargando Ingeniería de Recetas & Escandallos...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sincronizando inventario y Food Cost % en tiempo real
        </Typography>
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
                  label="Control de Food Cost %"
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
                    label="👨‍🍳 Vista de Cocina"
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#ffedd5', color: '#c2410c', borderRadius: 2, height: 24 }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Fichas técnicas culinarias, costeo de materias primas por gramo/mililitro, margen de rentabilidad y descargue de stock.
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
              p: 2.2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#f1f5f9', color: '#1e290b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KitchenIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Fichas Técnicas
                  </Typography>
                </Box>
                <Chip
                  label={products.length > 0 ? `${Math.round((summaryKPIs.totalRecipes / products.length) * 100)}% Menú` : '0%'}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900, bgcolor: '#f1f5f9', color: '#475569' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5, letterSpacing: -0.5 }}>
                {summaryKPIs.totalRecipes} <Typography component="span" variant="h6" sx={{ color: '#94a3b8', fontWeight: 700 }}>/ {products.length}</Typography>
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Platos con costeo gramo a gramo
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Costo Promedio */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#7dd3fc', transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MoneyIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Costo Materia Prima
                  </Typography>
                </Box>
                <Chip label="POR PLATO" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0284c7' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0284c7', mb: 0.5, letterSpacing: -0.5 }}>
                ${summaryKPIs.avgCost.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Insumos + empaque + merma técnica
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 3: Margen Promedio */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#86efac', transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Margen Bruto
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

        {/* KPI 4: Food Cost % Promedio */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#fde047', transform: 'translateY(-2px)' },
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#fef9c3', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SpeedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#a16207', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Food Cost %
                  </Typography>
                </Box>
                <Chip
                  label={summaryKPIs.avgFoodCost <= 35 ? 'SALUDABLE' : 'ALTO'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    bgcolor: summaryKPIs.avgFoodCost <= 35 ? '#dcfce7' : '#fee2e2',
                    color: summaryKPIs.avgFoodCost <= 35 ? '#15803d' : '#b91c1c'
                  }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: summaryKPIs.avgFoodCost <= 35 ? '#15803d' : '#b91c1c', mb: 0.5, letterSpacing: -0.5 }}>
                {summaryKPIs.avgFoodCost}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Meta del restaurante: 28% al 35%
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 5: Alertas Food Cost */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid',
              borderColor: summaryKPIs.criticalCount > 0 ? '#fca5a5' : '#e2e8f0',
              borderRadius: 3,
              bgcolor: summaryKPIs.criticalCount > 0 ? '#fff5f5' : '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: summaryKPIs.criticalCount > 0 ? '#fee2e2' : '#f0fdf4',
                      color: summaryKPIs.criticalCount > 0 ? '#dc2626' : '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: summaryKPIs.criticalCount > 0 ? '#991b1b' : '#166534', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Alertas Margen
                  </Typography>
                </Box>
                <Chip
                  label={summaryKPIs.criticalCount > 0 ? 'REVISAR' : 'OK'}
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
              {summaryKPIs.criticalCount > 0 ? 'Costo > 35% del precio de venta' : 'Márgenes en rango saludable'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ALERTA DE PLATILLOS PENDIENTES DE CONFIGURAR */}
      {pendingProducts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            px: 2.5,
            borderRadius: 3,
            bgcolor: '#fffbeb',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <WarningIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#92400e' }}>
                ¡Tienes {pendingProducts.length} {pendingProducts.length === 1 ? 'platillo nuevo' : 'platillos nuevos'} del catálogo sin receta ni escandallo!
              </Typography>
              <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>
                Configura sus materias primas para calcular su costo real, margen de ganancia y descontar stock automáticamente.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {pendingProducts.slice(0, 3).map(p => (
              <Chip
                key={p.id}
                label={`+ ${p.name}`}
                onClick={() => handleConfigurePendingProduct(p)}
                clickable
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  fontWeight: 800,
                  color: '#92400e',
                  border: '1px solid #fcd34d',
                  '&:hover': { bgcolor: '#fef3c7' }
                }}
              />
            ))}
            <Button
              size="small"
              variant="contained"
              onClick={() => setMainTab(1)}
              sx={{
                bgcolor: '#d97706',
                color: '#ffffff',
                fontWeight: 900,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: '#b45309' }
              }}
            >
              Ver Todos ({pendingProducts.length})
            </Button>
          </Box>
        </Paper>
      )}

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
          <Tab label={`📋 Fichas Activas (${recipes.length})`} />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>⚠️ Platillos Sin Receta</span>
                <Chip
                  label={pendingProducts.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    bgcolor: pendingProducts.length > 0 ? '#fef3c7' : '#f1f5f9',
                    color: pendingProducts.length > 0 ? '#b45309' : '#64748b',
                    border: pendingProducts.length > 0 ? '1px solid #fcd34d' : 'none'
                  }}
                />
              </Box>
            }
          />
          {canManageRecipes && <Tab label="📊 Auditoría y Control de Food Cost %" />}
        </Tabs>
      </Box>

      {/* TAB 0: FICHAS TÉCNICAS & ESCANDALLOS */}
      {mainTab === 0 && (
        <>
          {/* BARRA DE HERRAMIENTAS Y FILTROS */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: '18px', bgcolor: '#ffffff' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 3.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por plato, ingrediente o estación..."
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
                  label="Categoría"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontWeight: 700 } } }}
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
                  slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontWeight: 700 } } }}
                >
                  <MenuItem value="TODAS">Todas las Estaciones</MenuItem>
                  {STATIONS.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Rango Food Cost"
                  value={marginFilter}
                  onChange={(e) => setMarginFilter(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: '#f8fafc', fontWeight: 700 } } }}
                >
                  <MenuItem value="TODOS">Todos los Márgenes</MenuItem>
                  <MenuItem value="OPTIMO">🟢 Óptimo (&lt; 30%)</MenuItem>
                  <MenuItem value="SALUDABLE">🟡 Saludable (30% - 35%)</MenuItem>
                  <MenuItem value="CRITICO">🔴 Alerta Crítico (&gt; 35%)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.5 }} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Paper
                  elevation={0}
                  sx={{
                    display: 'flex',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    p: 0.4,
                    bgcolor: '#f8fafc'
                  }}
                >
                  <Tooltip title="Vista Fichas / Tarjetas">
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

          {/* EMPTY STATE CUANDO NO HAY RECETAS */}
          {recipes.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 6 },
                textAlign: 'center',
                borderRadius: '24px',
                border: '1.5px dashed #cbd5e1',
                bgcolor: '#fafafa',
                mt: 1
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '24px',
                  bgcolor: 'rgba(101, 163, 13, 0.12)',
                  color: '#65a30d',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2.5,
                  boxShadow: '0 8px 20px rgba(101, 163, 13, 0.15)'
                }}
              >
                <KitchenIcon sx={{ fontSize: 44 }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b', mb: 1.2 }}>
                Aún no tienes fichas técnicas ni escandallos registrados
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto', mb: 4, lineHeight: 1.6 }}>
                Las recetas te permiten costear cada plato milimétricamente por gramo o mililitro, controlar el Food Cost % para proteger la rentabilidad de tu restaurante, y activar el <strong>descargue automático de insumos en el almacén</strong> con cada orden vendida.
              </Typography>

              {/* Pillars of Recipe Engineering */}
              <Grid container spacing={2} sx={{ maxWidth: 860, mx: 'auto', mb: 4, textAlign: 'left' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper elevation={0} sx={{ p: 2.2, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#ecfccb', color: '#4d7c0f', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.2 }}>
                      <ScaleIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5 }}>
                      Costeo Milimétrico
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Conversión automática de gramos, mililitros, merma técnica y costo de empaque para llevar.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper elevation={0} sx={{ p: 2.2, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.2 }}>
                      <SpeedIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5 }}>
                      Control de Food Cost %
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Semáforo visual de rentabilidad: asegura que el costo de alimentos no supere el 35% del precio de venta.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper elevation={0} sx={{ p: 2.2, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.2 }}>
                      <InventoryIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5 }}>
                      Descargue en Bodega
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Detecta cuál insumo es el cuello de botella que limita las porciones disponibles en cocina.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Call to Actions */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateModal}
                  sx={{
                    borderRadius: '14px',
                    fontWeight: 900,
                    textTransform: 'none',
                    bgcolor: '#65a30d',
                    px: 3.5,
                    py: 1.3,
                    boxShadow: '0 6px 20px rgba(101, 163, 13, 0.35)',
                    '&:hover': { bgcolor: '#4d7c0f' }
                  }}
                >
                  Crear Mi Primer Escandallo
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  disabled={seedingSamples}
                  startIcon={seedingSamples ? <CircularProgress size={18} /> : <AutoFixHighIcon />}
                  onClick={handleSeedSamples}
                  sx={{
                    borderRadius: '14px',
                    fontWeight: 800,
                    textTransform: 'none',
                    color: '#334155',
                    borderColor: '#cbd5e1',
                    bgcolor: '#ffffff',
                    px: 3,
                    py: 1.3,
                    '&:hover': { bgcolor: '#f1f5f9' }
                  }}
                >
                  {seedingSamples ? 'Cargando plantillas...' : 'Cargar 3 Recetas de Ejemplo (Demo)'}
                </Button>
              </Stack>
            </Paper>
          ) : filteredRecipes.length === 0 ? (
            /* EMPTY STATE PARA FILTROS */
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b', mb: 1 }}>
                No se encontraron recetas con los filtros aplicados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Prueba buscando otro término o restablece los filtros de búsqueda.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('TODAS');
                  setSelectedStation('TODAS');
                  setMarginFilter('TODOS');
                  setSelectedType('TODAS');
                }}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
              >
                Limpiar Filtros
              </Button>
            </Paper>
          ) : viewMode === 'CARDS' ? (
            /* VISTA FICHAS (CARDS VIEW) */
            <Grid container spacing={2.5}>
              {filteredRecipes.map(recipe => {
                const fin = getRecipeFinancials(recipe);
                const isExpanded = expandedRecipeId === recipe.productId;
                const portionInfo = fin.portionAnalysis;

                return (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.productId || recipe.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: fin.foodCostPercent > 35 ? '#fca5a5' : '#e2e8f0',
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
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar
                              variant="rounded"
                              src={fin.product?.imageUrl}
                              sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: '#fef3c7', color: '#9a3412', fontWeight: 900 }}
                            >
                              {(fin.product?.name || recipe.productName || 'R')[0]}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
                                  {fin.product?.name || recipe.productName || 'Plato'}
                                </Typography>
                                {recipe.recipeType === 'SUB_RECETA' && (
                                  <Chip label="PREPARACIÓN BASE" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 900, bgcolor: '#f3e8ff', color: '#7e22ce' }} />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4 }}>
                                <Chip
                                  label={recipe.station || 'COCINA'}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }}
                                />
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                                  • {recipe.category || 'General'} • {recipe.preparationTimeMinutes || 15} min
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {/* Food Cost Badge Indicator */}
                          <Box sx={{ textAlign: 'right' }}>
                            <Chip
                              label={`${fin.foodCostPercent.toFixed(1)}% Food Cost`}
                              size="small"
                              sx={{
                                fontWeight: 900,
                                fontSize: '0.75rem',
                                bgcolor: fin.foodCostPercent <= 30 ? '#dcfce7' : fin.foodCostPercent <= 35 ? '#fef9c3' : '#fee2e2',
                                color: fin.foodCostPercent <= 30 ? '#15803d' : fin.foodCostPercent <= 35 ? '#854d0e' : '#b91c1c',
                                border: '1px solid',
                                borderColor: fin.foodCostPercent <= 30 ? '#86efac' : fin.foodCostPercent <= 35 ? '#fde047' : '#fca5a5',
                              }}
                            />
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: '#64748b', fontWeight: 600 }}>
                              {fin.foodCostPercent <= 30 ? 'Margen Óptimo' : fin.foodCostPercent <= 35 ? 'Rango Saludable' : 'Alerta Costo Alto'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Banner Cuello de Botella / Stock en Almacén */}
                        <Box
                          sx={{
                            mb: 2,
                            p: 1.2,
                            px: 1.6,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                            bgcolor: portionInfo.portions > 5 ? '#f0fdf4' : portionInfo.portions > 0 ? '#fffbeb' : '#fef2f2',
                            border: '1px solid',
                            borderColor: portionInfo.portions > 5 ? '#bbf7d0' : portionInfo.portions > 0 ? '#fde68a' : '#fecaca',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InventoryIcon sx={{ fontSize: 18, color: portionInfo.portions > 5 ? '#16a34a' : portionInfo.portions > 0 ? '#d97706' : '#dc2626' }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: portionInfo.portions > 5 ? '#166534' : portionInfo.portions > 0 ? '#92400e' : '#991b1b', fontSize: '0.8rem' }}>
                              {portionInfo.portions > 0
                                ? `${portionInfo.portions} porciones listas con stock actual`
                                : '0 porciones en cocina (Insumos insuficientes)'}
                            </Typography>
                          </Box>

                          {portionInfo.bottleneckItemName && (
                            <Typography variant="caption" sx={{ fontWeight: 700, color: portionInfo.portions > 0 ? '#b45309' : '#dc2626' }}>
                              {portionInfo.portions > 0
                                ? `Limitado por: ${portionInfo.bottleneckItemName} (${portionInfo.bottleneckStock} ${portionInfo.bottleneckUnit})`
                                : `Faltante: ${portionInfo.bottleneckItemName}`}
                            </Typography>
                          )}
                        </Box>

                        {/* Alerta si hay insumos con costo $0 */}
                        {fin.hasZeroCostInsumos && (
                          <Alert severity="warning" sx={{ mb: 1.5, py: 0.3, borderRadius: '10px', fontSize: '0.72rem' }}>
                            Hay insumos con costo $0 en inventario. Edita el escandallo para asignarles costo y no falsear tu Food Cost.
                          </Alert>
                        )}

                        {/* Tarjetas de Métricas de Rentabilidad (3 Bloques) */}
                        <Grid container spacing={1.2} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                Costo Total
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e290b' }}>
                                ${fin.totalCost.toLocaleString()}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                Precio Venta
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0284c7' }}>
                                ${fin.salePrice.toLocaleString()}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 1.2, bgcolor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                Margen Bruto
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#16a34a' }}>
                                +${fin.grossMargin.toLocaleString()}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Botón Desplegar Ingredientes */}
                        <Button
                          fullWidth
                          size="small"
                          onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.productId)}
                          endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            color: '#475569',
                            bgcolor: isExpanded ? '#f1f5f9' : '#f8fafc',
                            textTransform: 'none',
                            py: 0.8
                          }}
                        >
                          {isExpanded
                            ? 'Ocultar ingredientes y preparación'
                            : `Ver ${recipe.ingredients?.length || 0} insumos y técnica de cocción`}
                        </Button>

                        {/* Contenido Expandible de la Ficha Técnica */}
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                            {/* Tabla de Insumos */}
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                              Desglose de Materias Primas por Porción:
                            </Typography>
                            <TableContainer sx={{ mb: 1.5, borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                  <TableRow>
                                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 800 }}>Insumo</TableCell>
                                    <TableCell align="center" sx={{ fontSize: '0.72rem', fontWeight: 800 }}>Cantidad</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 800 }}>Costo Base</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 800 }}>Subtotal</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {fin.ingredientsDetailed.map((ing, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                        {ing.invItem?.name || ing.customIngredientName || ing.name || 'Insumo'}
                                      </TableCell>
                                      <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                                        {ing.quantity} {ing.unit || ing.invItem?.unit}
                                      </TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        ${(ing.unitCostManual || ing.invItem?.unitCost || 0).toLocaleString()} / {ing.unit || ing.invItem?.unit}
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
                              <Tooltip title="Duplicar / Clonar Receta">
                                <IconButton size="small" color="secondary" onClick={() => handleDuplicateRecipe(recipe)}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
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
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Porciones Bodega</TableCell>
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
                    const portionInfo = fin.portionAnalysis;

                    return (
                      <TableRow key={recipe.productId || recipe.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e290b' }}>
                            {fin.product?.name || recipe.productName || 'Plato'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {recipe.ingredients?.length || 0} insumos • {recipe.preparationTimeMinutes || 15} min
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={recipe.station || 'COCINA'} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#f1f5f9' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${portionInfo.portions} und`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              bgcolor: portionInfo.portions > 5 ? '#dcfce7' : portionInfo.portions > 0 ? '#fef9c3' : '#fee2e2',
                              color: portionInfo.portions > 5 ? '#15803d' : portionInfo.portions > 0 ? '#854d0e' : '#b91c1c'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#1e290b' }}>
                          ${fin.totalCost.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0284c7' }}>
                          ${fin.salePrice.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#16a34a' }}>
                          +${fin.grossMargin.toLocaleString()} ({fin.grossMarginPercent.toFixed(0)}%)
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${fin.foodCostPercent.toFixed(1)}%`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              bgcolor: fin.foodCostPercent <= 30 ? '#dcfce7' : fin.foodCostPercent <= 35 ? '#fef9c3' : '#fee2e2',
                              color: fin.foodCostPercent <= 30 ? '#15803d' : fin.foodCostPercent <= 35 ? '#854d0e' : '#b91c1c'
                            }}
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
                                <Tooltip title="Duplicar">
                                  <IconButton size="small" color="secondary" onClick={() => handleDuplicateRecipe(recipe)}>
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Editar">
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

      {/* TAB 1: PLATILLOS PENDIENTES DE RECETA */}
      {mainTab === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Platillos del Menú Sin Receta ({pendingProducts.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Platos dados de alta en el catálogo pero que aún no tienen escandallo, insumos asociados ni costeo Food Cost %.
            </Typography>
          </Box>

          {pendingProducts.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 5,
                textAlign: 'center',
                borderRadius: '20px',
                border: '1px solid #bbf7d0',
                bgcolor: '#f0fdf4'
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}
              >
                <KitchenIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#166534', mb: 1 }}>
                ¡Todos los platillos del catálogo tienen su receta configurada!
              </Typography>
              <Typography variant="body2" sx={{ color: '#15803d', maxWidth: 480, mx: 'auto' }}>
                Cada ítem del menú tiene sus ingredientes, cantidades y costo unitario calculados para descontar inventario al vender.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {pendingProducts.map(prod => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prod.id}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '18px',
                      border: '1px solid #fde68a',
                      bgcolor: '#fffdfa',
                      boxShadow: '0 2px 10px rgba(217, 119, 6, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#d97706', transform: 'translateY(-2px)' }
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b', lineHeight: 1.2 }}>
                            {prod.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                            SKU: {prod.sku || 'N/A'} • {prod.categoryId ? `Cat: ${prod.categoryId}` : 'Menú General'}
                          </Typography>
                        </Box>
                        <Chip
                          label="⚠️ Sin Ficha"
                          size="small"
                          sx={{
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            bgcolor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            height: 24
                          }}
                        />
                      </Box>

                      <Box sx={{ p: 1.5, mb: 2, bgcolor: '#fef2f2', borderRadius: '12px', border: '1px dashed #fca5a5' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#991b1b', fontSize: '0.78rem', mb: 0.5 }}>
                          Faltan materias primas y modo de cocción
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block' }}>
                          Al vender este platillo no se descontarán insumos del inventario y no se calculará el margen de ganancia.
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                          Precio de Venta:
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0284c7' }}>
                          ${(prod.price || 0).toLocaleString()} COP
                        </Typography>
                      </Box>
                    </Box>

                    {canManageRecipes && (
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={() => handleConfigurePendingProduct(prod)}
                        sx={{
                          borderRadius: '12px',
                          fontWeight: 900,
                          textTransform: 'none',
                          bgcolor: '#65a30d',
                          color: '#ffffff',
                          py: 1,
                          boxShadow: '0 4px 12px rgba(101, 163, 13, 0.3)',
                          '&:hover': { bgcolor: '#4d7c0f' }
                        }}
                      >
                        Configurar Escandallo Ahora
                      </Button>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* TAB 2: AUDITORÍA DE FOOD COST */}
      {mainTab === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Auditoría y Control de Food Cost %
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diagnóstico de márgenes para prevenir fugas de rentabilidad y garantizar que el costo de alimentos se mantenga en el rango saludable del 28% al 35%.
            </Typography>
          </Box>

          {recipes.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '18px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Aún no hay recetas registradas para auditar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Crea tus primeros escandallos para visualizar el análisis gráfico de rentabilidad.
              </Typography>
              <Button variant="contained" onClick={handleOpenCreateModal} sx={{ borderRadius: '10px', bgcolor: '#65a30d', fontWeight: 800 }}>
                Crear Escandallo
              </Button>
            </Paper>
          ) : (
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
                        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 60]} />
                        <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Food Cost']} />
                        <Bar dataKey="foodCost" radius={[6, 6, 0, 0]}>
                          {recipes.map((r, idx) => {
                            const fin = getRecipeFinancials(r);
                            return (
                              <Cell key={`cell-${idx}`} fill={fin.foodCostPercent <= 30 ? '#16a34a' : fin.foodCostPercent <= 35 ? '#f59e0b' : '#ef4444'} />
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
                        <Box key={recipe.productId || recipe.id} sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e290b' }}>
                              {fin.product?.name || recipe.productName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              P. Venta: ${fin.salePrice.toLocaleString()} COP
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
          )}
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
              {/* Selector de Modo: Plato del Menú vs Crear Nuevo */}
              {!editingRecipe.id && (
                <Grid size={{ xs: 12 }}>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.8 }}>
                      Tipo de Ficha Culinaria:
                    </Typography>
                    <RadioGroup
                      row
                      value={isNewProductMode ? 'NEW' : 'CATALOG'}
                      onChange={(e) => setIsNewProductMode(e.target.value === 'NEW')}
                    >
                      <FormControlLabel
                        value="CATALOG"
                        disabled={products.length === 0}
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Asociar a Plato existente en Menú {products.length === 0 && '(No hay platos aún)'}
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="NEW"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                            ✨ Crear Nuevo Platillo o Preparación Base
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </Paper>
                </Grid>
              )}

              {/* Nombre y Precio del Plato */}
              {isNewProductMode ? (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nombre del Platillo o Preparación"
                      placeholder="Ej. Hamburguesa Doble Queso, Salsa BBQ Casera..."
                      value={customProductName}
                      onChange={(e) => {
                        setCustomProductName(e.target.value);
                        setEditingRecipe({ ...editingRecipe, productName: e.target.value });
                      }}
                      slotProps={{ input: { sx: { fontWeight: 800 } } }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Precio Venta COP"
                      value={customProductPrice}
                      onChange={(e) => setCustomProductPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          sx: { fontWeight: 800, color: '#0284c7' }
                        }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Categoría"
                      value={customProductCategory}
                      onChange={(e) => setCustomProductCategory(e.target.value)}
                    />
                  </Grid>
                </>
              ) : (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Platillo del Menú"
                    value={editingRecipe.productId || ''}
                    onChange={(e) => {
                      const prod = products.find(p => String(p.id) === String(e.target.value));
                      setEditingRecipe({
                        ...editingRecipe,
                        productId: e.target.value,
                        productName: prod?.name || ''
                      });
                    }}
                    slotProps={{ input: { sx: { fontWeight: 800 } } }}
                  >
                    {products.map(p => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.name} (${p.price.toLocaleString()} COP)
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Estación de Cocina"
                  value={editingRecipe.station || 'COCINA'}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, station: e.target.value as any })}
                >
                  {STATIONS.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
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
                  value={editingRecipe.preparationTimeMinutes || 15}
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
                      ✨ Insumo Nuevo
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.2}>
                  {(editingRecipe.ingredients || []).map((ing, idx) => {
                    const isNew = ing.inventoryItemId === '__NEW__';
                    const inv = inventory.find(i => String(i.id) === String(ing.inventoryItemId));
                    const cost = calculateIngredientCost(inv, ing.quantity, ing.unit, ing.unitCostManual);
                    const isZeroCost = cost === 0;

                    return (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: isZeroCost ? '#fde047' : isNew ? '#bef264' : '#e2e8f0',
                          bgcolor: isZeroCost ? '#fffdf5' : isNew ? '#fbfdf5' : '#ffffff',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          gap: 1.2,
                          alignItems: { md: 'center' }
                        }}
                      >
                        {isNew ? (
                          <Box sx={{ flex: 2, display: 'flex', gap: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Nombre del Nuevo Insumo"
                              placeholder="Ej. Carne de Res, Trufa, Panko..."
                              value={ing.customIngredientName || ''}
                              onChange={(e) => handleUpdateIngredientRow(idx, 'customIngredientName', e.target.value)}
                            />
                            <TextField
                              size="small"
                              type="number"
                              label="Costo Est. ($)"
                              placeholder="2500"
                              value={ing.unitCostManual || ''}
                              onChange={(e) => handleUpdateIngredientRow(idx, 'unitCostManual', Number(e.target.value))}
                              sx={{ width: 140 }}
                            />
                          </Box>
                        ) : (
                          <TextField
                            select
                            size="small"
                            label="Insumo en Almacén"
                            value={String(ing.inventoryItemId)}
                            onChange={(e) => handleUpdateIngredientRow(idx, 'inventoryItemId', e.target.value)}
                            sx={{ flex: 2 }}
                          >
                            {inventory.map(item => (
                              <MenuItem key={item.id} value={String(item.id)}>
                                {item.name} (${item.unitCost.toLocaleString()} / {item.unit}) - Stock: {item.currentStock} {item.unit}
                              </MenuItem>
                            ))}
                            <MenuItem value="__NEW__">✨ + Crear Nuevo Insumo...</MenuItem>
                          </TextField>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField
                            size="small"
                            type="number"
                            label="Cantidad"
                            value={ing.quantity}
                            onChange={(e) => handleUpdateIngredientRow(idx, 'quantity', Number(e.target.value))}
                            sx={{ width: 90 }}
                          />

                          <TextField
                            select
                            size="small"
                            label="Unidad"
                            value={ing.unit || 'g'}
                            onChange={(e) => handleUpdateIngredientRow(idx, 'unit', e.target.value)}
                            sx={{ width: 130 }}
                          >
                            {CULINARY_UNITS.map(u => (
                              <MenuItem key={u.value} value={u.value}>
                                {u.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>

                        {/* Cost Display and Delete Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 140 }}>
                          <Box sx={{ textAlign: 'right', flex: 1 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.65rem' }}>
                              Costo Calculado
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 900, color: isZeroCost ? '#b45309' : '#1e290b' }}>
                              ${Math.round(cost).toLocaleString()}
                            </Typography>
                          </Box>

                          <IconButton size="small" color="error" onClick={() => handleRemoveIngredientRow(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              </Grid>

              {/* ALÉRGENOS */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', display: 'block', mb: 0.8 }}>
                  Alérgenos Presentes en el Plato:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {AVAILABLE_ALLERGENS.map(al => {
                    const isChecked = (editingRecipe.allergens || []).includes(al);
                    return (
                      <Chip
                        key={al}
                        label={al}
                        size="small"
                        onClick={() => toggleAllergen(al)}
                        color={isChecked ? 'primary' : 'default'}
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
              Imprimir Ficha
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
                      Food Cost: {fin.foodCostPercent.toFixed(1)}% (Costo: ${fin.totalCost.toLocaleString()})
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>
                  Gramaje de Insumos por Porción:
                </Typography>
                <TableContainer sx={{ mb: 2.5, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Insumo</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Gramaje / Unidad</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Costo Base</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Costo por Porción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fin.ingredientsDetailed.map((ing, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {ing.invItem?.name || ing.customIngredientName || ing.name || 'Insumo'}
                          </TableCell>
                          <TableCell align="center">
                            {ing.quantity} {ing.unit || ing.invItem?.unit}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#64748b' }}>
                            ${(ing.unitCostManual || ing.invItem?.unitCost || 0).toLocaleString()} / {ing.unit || ing.invItem?.unit}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            ${Math.round(ing.calculatedCost).toLocaleString()} COP
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 900, textAlign: 'right' }}>
                          Costo Total con Merma ({printingRecipe.wasteMarginPercentage || 0}%):
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#1e290b' }}>
                          ${fin.totalCost.toLocaleString()} COP
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {printingRecipe.preparationInstructions && (
                  <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                      Técnica Estándar de Preparación:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#334155', lineHeight: 1.6 }}>
                      {printingRecipe.preparationInstructions}
                    </Typography>
                  </Box>
                )}

                {printingRecipe.chefNotes && (
                  <Box sx={{ mb: 2.5, p: 2, bgcolor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#92400e', mb: 0.5 }}>
                      Consejos del Chef Ejecutivo:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#78350f' }}>
                      {printingRecipe.chefNotes}
                    </Typography>
                  </Box>
                )}

                {/* Sign-off box for culinary kitchen binder */}
                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ width: '40%', borderTop: '1px dashed #94a3b8', pt: 1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>
                      Firma Chef Ejecutivo / Cocina
                    </Typography>
                  </Box>
                  <Box sx={{ width: '40%', borderTop: '1px dashed #94a3b8', pt: 1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>
                      Aprobación Gerencia / Operaciones
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINAR DIÁLOGO */}
      <Dialog
        open={Boolean(deleteConfirmRecipe)}
        onClose={() => setDeleteConfirmRecipe(null)}
        slotProps={{ paper: { sx: { borderRadius: '18px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>¿Eliminar ficha técnica?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que deseas eliminar el escandallo de "{deleteConfirmRecipe?.productName}"? Esto no eliminará el platillo de tu carta ni los insumos del almacén.
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

      {/* SNACKBAR DE FEEDBACK */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ fontWeight: 700, borderRadius: '12px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
