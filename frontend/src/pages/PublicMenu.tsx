import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayCircle as PlayIcon,
  Close as CloseIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Spa as VeganIcon,
  Restaurant as RestaurantIcon,
  Login as LoginIcon,
  WineBar as WineIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Product, Category, StoreSettings } from '../types';

export default function PublicMenu() {
  const navigate = useNavigate();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Dish Interactive Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Load Catalog Data
  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('sesamo_catalog_updated', handleUpdate);
    return () => {
      window.removeEventListener('sesamo_catalog_updated', handleUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats, sets] = await Promise.all([
        mockApi.products.getAll(),
        mockApi.categories.getAll(),
        mockApi.settings.get()
      ]);
      setProducts(prods.filter(p => p.isActive));
      setCategories(cats.filter(c => c.isActive));
      setSettings(sets);
    } catch (err) {
      console.error('Error al cargar menú digital:', err);
    }
  };

  // Filtered Products
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

  // Modal Handlers
  const handleOpenDetailModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Box sx={{ bgcolor: '#0b1307', minHeight: '100vh', color: '#f8fafc', pb: 8 }}>
      {/* ============================================================ */}
      {/* TOP APP BAR (HEADER LIMPIO)                                  */}
      {/* ============================================================ */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(11, 19, 7, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(132, 204, 22, 0.18)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1.2, px: { xs: 0, sm: 2 } }}>
            {/* Brand Logo & Name */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.8, cursor: 'pointer' }}
              onClick={() => { setSelectedCategory('ALL'); setSearchTerm(''); setSelectedTag('ALL'); }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="Sésamo Alimentos"
                sx={{
                  height: { xs: 44, sm: 52 },
                  width: 'auto',
                  filter: 'drop-shadow(0 4px 12px rgba(132, 204, 22, 0.35))'
                }}
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
                <Typography variant="caption" sx={{ color: '#84cc16', fontWeight: 700, display: 'block', fontSize: '0.74rem' }}>
                  Menú & Carta Digital
                </Typography>
              </Box>
            </Box>

            {/* Right: Staff Portal Button */}
            <IconButton
              onClick={() => navigate('/login')}
              title="Acceso Personal / Staff"
              sx={{
                bgcolor: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                p: 1.1,
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                '&:hover': { color: '#ffffff', bgcolor: 'rgba(132, 204, 22, 0.2)', borderColor: '#84cc16' }
              }}
            >
              <LoginIcon sx={{ fontSize: 20 }} />
            </IconButton>
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
          background: 'linear-gradient(180deg, #131e0c 0%, #0b1307 100%)',
          pt: { xs: 4, md: 5 },
          pb: { xs: 3.5, md: 4.5 },
          borderBottom: '1px solid rgba(132, 204, 22, 0.12)'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ maxWidth: 780 }}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.2rem', sm: '2.9rem', md: '3.4rem' },
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                mb: 1.5,
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 60%, #bef264 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Nuestra Carta
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: '#94a3b8',
                fontSize: { xs: '0.98rem', md: '1.08rem' },
                lineHeight: 1.6,
                mb: 2.5
              }}
            >
              Explora nuestras creaciones con fotos, videos de preparación, maridajes sugeridos e información nutricional. Toca cualquier platillo para conocer su ficha completa.
            </Typography>

            {/* Location & Time Info */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ color: '#cbd5e1' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <LocationIcon sx={{ color: '#84cc16', fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {settings?.address || 'El Poblado & Laureles, Medellín'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <TimeIcon sx={{ color: '#84cc16', fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Horario: 12:00 PM - 10:30 PM
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SEARCH, CATEGORIES & DIETARY FILTER CONTROLS                 */}
      {/* ============================================================ */}
      <Container maxWidth="xl" sx={{ mt: 3.5 }}>
        {/* Search Bar */}
        <Box sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Buscar por platillo, ingrediente, vino o término (ej. Solomito, Risotto, Bowl, Mojito...)"
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
                  bgcolor: 'rgba(20, 32, 15, 0.85)',
                  borderRadius: '16px',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  border: '1px solid rgba(132, 204, 22, 0.22)',
                  '& fieldset': { border: 'none' },
                  '&:hover': { borderColor: '#84cc16' }
                }
              }
            }}
          />
        </Box>

        {/* Category Navigation Pills */}
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
              label={`⭐ Toda la Carta (${products.length})`}
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
            label="Todos los Platillos"
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
        {/* DISH CARDS GRID                                              */}
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

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card
                    onClick={() => handleOpenDetailModal(product)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'rgba(20, 32, 15, 0.85)',
                      borderRadius: '22px',
                      border: '1px solid rgba(132, 204, 22, 0.16)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                      transition: 'all 0.25s ease',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
                        borderColor: '#84cc16'
                      }
                    }}
                  >
                    {/* Image & Video Indicator */}
                    <Box sx={{ position: 'relative', pt: '62%', overflow: 'hidden' }}>
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
                          '&:hover': { transform: 'scale(1.06)' }
                        }}
                      />

                      {/* Video Indicator */}
                      {product.videoUrl && (
                        <Chip
                          icon={<PlayIcon sx={{ color: '#ffffff !important', fontSize: '1.1rem' }} />}
                          label="Video HD"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            bgcolor: 'rgba(22, 163, 74, 0.92)',
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
                          bgcolor: 'rgba(11, 19, 7, 0.88)',
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
                          sx={{
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '1.1rem',
                            lineHeight: 1.25,
                            '&:hover': { color: '#bef264' }
                          }}
                        >
                          {product.name}
                        </Typography>
                      </Box>

                      {/* Rating & Calories */}
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
                          mb: 1.6,
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

                    {/* Card Price & Details CTA */}
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(11, 19, 7, 0.5)' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                          Precio
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#4ade80', fontSize: '1.2rem', lineHeight: 1.1 }}>
                          ${product.price.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>COP</Typography>
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<InfoIcon />}
                        sx={{
                          borderRadius: '12px',
                          borderColor: 'rgba(132, 204, 22, 0.4)',
                          color: '#bef264',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          textTransform: 'none',
                          px: 1.8,
                          py: 0.6,
                          '&:hover': {
                            borderColor: '#84cc16',
                            bgcolor: 'rgba(132, 204, 22, 0.12)'
                          }
                        }}
                      >
                        Ver Ficha
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* ============================================================ */}
      {/* DISH INTERACTIVE DETAIL MODAL                                */}
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
              boxShadow: '0 25px 50px rgba(0,0,0,0.85)',
              overflow: 'hidden'
            }
          }
        }}
      >
        {selectedProduct && (
          <>
            {/* Visual Media Header */}
            <Box sx={{ position: 'relative', bgcolor: '#000000', maxHeight: 320, overflow: 'hidden' }}>
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
                  sx={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  component="img"
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                  alt={selectedProduct.name}
                  sx={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
                />
              )}
            </Box>

            <DialogContent sx={{ p: 3 }}>
              {/* Title & Price */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                    {selectedProduct.name}
                  </Typography>
                  {selectedProduct.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5 }}>
                      <Rating value={selectedProduct.rating} readOnly precision={0.1} size="small" sx={{ color: '#facc15' }} />
                      <Typography variant="caption" sx={{ color: '#facc15', fontWeight: 800 }}>
                        {selectedProduct.rating.toFixed(1)} / 5.0 (Valoración comensales)
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                    Precio
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#4ade80' }}>
                    ${selectedProduct.price.toLocaleString()} COP
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" sx={{ color: '#cbd5e1', lineHeight: 1.65, mb: 2.5, fontSize: '0.92rem' }}>
                {selectedProduct.description}
              </Typography>

              {/* Options & Variations Preview */}
              {selectedProduct.modifiers && selectedProduct.modifiers.length > 0 && (
                <Box sx={{ mb: 2.5, p: 2, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#84cc16', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Opciones y Acompañamientos:
                  </Typography>
                  {selectedProduct.modifiers.map(group => (
                    <Box key={group.id} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>
                        • {group.name}:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 0.5 }}>
                        {group.options.map(opt => (
                          <Chip
                            key={opt.id}
                            label={`${opt.name} ${opt.price > 0 ? `(+$${opt.price.toLocaleString()})` : ''}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(132, 204, 22, 0.1)',
                              color: '#bef264',
                              fontWeight: 600,
                              fontSize: '0.74rem'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Pairing / Maridaje Sugerido */}
              <Box sx={{ p: 2, bgcolor: 'rgba(234, 179, 8, 0.08)', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.25)', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <WineIcon sx={{ color: '#facc15', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fef08a' }}>
                    Maridaje & Sugerencia de la Casa
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#cbd5e1', lineHeight: 1.5, display: 'block' }}>
                  Ideal acompañado de una copa de vino tinto joven o nuestra refrescante limonada de coco artesanal.
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleCloseDetailModal}
                sx={{
                  py: 1.1,
                  borderRadius: '14px',
                  fontWeight: 800,
                  borderColor: 'rgba(132, 204, 22, 0.4)',
                  color: '#bef264',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#84cc16', bgcolor: 'rgba(132, 204, 22, 0.12)' }
                }}
              >
                Cerrar Ficha
              </Button>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
