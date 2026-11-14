import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogActions,
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
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { Product, Category, StoreSettings } from '../types';

export default function PublicMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    window.addEventListener('sesamo_catalog_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('sesamo_catalog_updated', loadData);
      window.removeEventListener('storage', loadData);
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
      console.error('Error al cargar menú público:', err);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.categoryId === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.tags && product.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsVideoModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsVideoModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Box sx={{ bgcolor: '#0b160a', minHeight: '100vh', color: '#f8fafc', pb: 8 }}>
      {/* Top Navbar */}
      <AppBar position="sticky" sx={{ bgcolor: 'rgba(11, 22, 10, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(101, 163, 13, 0.2)' }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1.5, px: { xs: 0, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Sésamo Alimentos"
                sx={{
                  height: { xs: 46, sm: 54 },
                  width: 'auto',
                  filter: 'drop-shadow(0px 4px 10px rgba(101, 163, 13, 0.3))'
                }}
              />
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#facc15', lineHeight: 1.1 }}>
                  Sésamo Alimentos
                </Typography>
                <Typography variant="caption" sx={{ color: '#84cc16', display: 'block', fontWeight: 600 }}>
                  Menú Digital & Catálogo Interactivo
                </Typography>
              </Box>
            </Box>

            {settings?.phone && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<PhoneIcon sx={{ color: '#84cc16 !important', fontSize: '15px !important' }} />}
                  label={settings.phone}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(132, 204, 22, 0.1)',
                    color: '#84cc16',
                    fontWeight: 700,
                    border: '1px solid rgba(132, 204, 22, 0.25)'
                  }}
                />
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Banner Header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)',
          pt: { xs: 4, md: 6 },
          pb: { xs: 4, md: 6 },
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip
                icon={<FireIcon sx={{ color: '#ff6b00 !important' }} />}
                label="Menú Interactivo con Video & Precios en Tiempo Real"
                sx={{
                  bgcolor: 'rgba(255, 107, 0, 0.15)',
                  color: '#ff9d42',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  mb: 2,
                  border: '1px solid rgba(255, 107, 0, 0.3)'
                }}
              />
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2.2rem', sm: '3rem', md: '3.5rem' },
                  lineHeight: 1.1,
                  mb: 2,
                  background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Sabores Artesanales que Enamoran 🍔🍕
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '1.1rem', mb: 3, maxWidth: 620, lineHeight: 1.6 }}>
                Explora nuestras preparaciones hechas al instante con ingredientes seleccionados. Consulta fotos HD, videos de preparación y precios actualizados.
              </Typography>

              {/* Info Badges */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ color: '#cbd5e1' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon sx={{ color: '#ff6b00', fontSize: 20 }} />
                  <Typography variant="body2">{settings?.address || 'Calle 10 # 40-20, El Poblado'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon sx={{ color: '#ff6b00', fontSize: 20 }} />
                  <Typography variant="body2">{settings?.phone || '+57 (604) 444 8899'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon sx={{ color: '#ff6b00', fontSize: 20 }} />
                  <Typography variant="body2">Abierto: 12:00 PM - 10:30 PM</Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '24px',
                  bgcolor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center'
                }}
              >
                <Box
                  component="video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-delicious-burger-42898-large.mp4"
                  sx={{
                    width: '100%',
                    height: 240,
                    objectFit: 'cover',
                    borderRadius: '16px',
                    mb: 1.5
                  }}
                />
                <Typography variant="subtitle2" sx={{ color: '#ff9d42', fontWeight: 700 }}>
                  🎥 Preparación en Vivo • Sésamo Kitchen
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Main Content & Catalog */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Search and Category Filter Bar */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                placeholder="Buscar platillo, ingrediente o antojo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '14px',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '& fieldset': { border: 'none' }
                    }
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                <Chip
                  label="⭐ Todos los Platillos"
                  clickable
                  onClick={() => setSelectedCategory('ALL')}
                  sx={{
                    px: 1.5,
                    py: 2.2,
                    borderRadius: '12px',
                    fontWeight: 700,
                    bgcolor: selectedCategory === 'ALL' ? '#ff6b00' : 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: selectedCategory === 'ALL' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: selectedCategory === 'ALL' ? '#e66000' : 'rgba(255, 107, 0, 0.2)' }
                  }}
                />
                {categories.map(cat => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    clickable
                    onClick={() => setSelectedCategory(cat.id)}
                    sx={{
                      px: 1.5,
                      py: 2.2,
                      borderRadius: '12px',
                      fontWeight: 700,
                      bgcolor: selectedCategory === cat.id ? '#ff6b00' : 'rgba(30, 41, 59, 0.8)',
                      color: '#ffffff',
                      border: selectedCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: selectedCategory === cat.id ? '#e66000' : 'rgba(255, 107, 0, 0.2)' }
                    }}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'rgba(30, 41, 59, 0.5)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="h6" sx={{ color: '#94a3b8' }}>
              No se encontraron productos que coincidan con tu búsqueda.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredProducts.map(product => {
              const category = categories.find(c => c.id === product.categoryId);

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'rgba(30, 41, 59, 0.75)',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                        borderColor: '#ff6b00'
                      }
                    }}
                  >
                    {/* Image / Video Container */}
                    <Box sx={{ position: 'relative', pt: '65%', overflow: 'hidden' }}>
                      <CardMedia
                        component="img"
                        image={product.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'}
                        alt={product.name}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />

                      {/* Video Indicator Badge */}
                      {product.videoUrl && (
                        <Chip
                          icon={<PlayIcon sx={{ color: '#ffffff !important', fontSize: '1.2rem' }} />}
                          label="Ver Video HD"
                          onClick={() => handleOpenProduct(product)}
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            bgcolor: 'rgba(255, 107, 0, 0.9)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            backdropFilter: 'blur(4px)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#e66000' }
                          }}
                        />
                      )}

                      {/* Category Badge */}
                      <Chip
                        label={category?.name || 'General'}
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          bgcolor: 'rgba(15, 23, 42, 0.85)',
                          color: '#e2e8f0',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          backdropFilter: 'blur(4px)'
                        }}
                      />
                    </Box>

                    {/* Content */}
                    <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.15rem', lineHeight: 1.3 }}>
                          {product.name}
                        </Typography>
                      </Box>

                      {/* Rating & Calories */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        {product.rating && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ color: '#ffb703', fontSize: 18 }} />
                            <Typography variant="caption" sx={{ color: '#ffb703', fontWeight: 800 }}>
                              {product.rating.toFixed(1)}
                            </Typography>
                          </Box>
                        )}
                        {product.calories && (
                          <Typography variant="caption" sx={{ color: '#94a3b8', bgcolor: 'rgba(255,255,255,0.05)', px: 1, py: 0.2, borderRadius: '6px' }}>
                            {product.calories}
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          color: '#94a3b8',
                          fontSize: '0.875rem',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5
                        }}
                      >
                        {product.description}
                      </Typography>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1 }}>
                          {product.tags.map((tag, i) => (
                            <Chip
                              key={i}
                              label={tag}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(255, 107, 0, 0.1)',
                                color: '#ff9d42',
                                fontSize: '0.7rem',
                                height: 22,
                                border: '1px solid rgba(255, 107, 0, 0.2)'
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                    {/* Footer Actions & Price */}
                    <CardActions sx={{ p: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Precio Final
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#ff8800', fontSize: '1.25rem' }}>
                          ${product.price.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>COP</Typography>
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        size="small"
                        startIcon={product.videoUrl ? <PlayIcon /> : undefined}
                        onClick={() => handleOpenProduct(product)}
                        sx={{
                          bgcolor: '#ff6b00',
                          color: '#ffffff',
                          fontWeight: 700,
                          borderRadius: '10px',
                          textTransform: 'none',
                          px: 2,
                          '&:hover': { bgcolor: '#e66000' }
                        }}
                      >
                        {product.videoUrl ? 'Ver Video' : 'Detalles'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Product Detail & Video Player Modal */}
      <Dialog
        open={isVideoModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0f172a',
              color: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden'
            }
          }
        }}
      >
        {selectedProduct && (
          <>
            <Box sx={{ position: 'relative', bgcolor: '#000000' }}>
              <IconButton
                onClick={handleCloseModal}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
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
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd'}
                  alt={selectedProduct.name}
                  sx={{
                    width: '100%',
                    maxHeight: 380,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              )}
            </Box>

            <DialogContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#ffffff' }}>
                    {selectedProduct.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {selectedProduct.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={selectedProduct.rating} readOnly precision={0.1} size="small" sx={{ color: '#ffb703' }} />
                        <Typography variant="subtitle2" sx={{ color: '#ffb703', fontWeight: 800 }}>
                          {selectedProduct.rating.toFixed(1)} / 5.0
                        </Typography>
                      </Box>
                    )}
                    {selectedProduct.calories && (
                      <Chip label={`🔥 ${selectedProduct.calories}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }} />
                    )}
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                    Precio
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#ff8800' }}>
                    ${selectedProduct.price.toLocaleString()} COP
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body1" sx={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: '1.05rem', mb: 3 }}>
                {selectedProduct.description}
              </Typography>

              {/* Modifiers / Options */}
              {selectedProduct.modifiers && selectedProduct.modifiers.length > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', mb: 1.5 }}>
                    Adicionales y Personalización:
                  </Typography>
                  {selectedProduct.modifiers.map(group => (
                    <Box key={group.id} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#ff9d42', fontWeight: 700, mb: 1 }}>
                        {group.name} {group.isRequired ? '(Requerido)' : '(Opcional)'}
                      </Typography>
                      <Grid container spacing={1}>
                        {group.options.map(opt => (
                          <Grid size={{ xs: 12, sm: 6 }} key={opt.id}>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                bgcolor: 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                                {opt.name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ff8800', fontWeight: 700 }}>
                                +${opt.price.toLocaleString()}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 4, pb: 4, pt: 0, justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                * Consulta la disponibilidad con tu mesero.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleCloseModal}
                sx={{
                  bgcolor: '#ff6b00',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '12px',
                  px: 4,
                  '&:hover': { bgcolor: '#e66000' }
                }}
              >
                Cerrar Vista
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
