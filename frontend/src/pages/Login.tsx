import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  LockClock as LockClockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { mockApi } from '../services/mockApi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inactivityNotice, setInactivityNotice] = useState(false);
  
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('sesamo_logout_reason');
      if (reason === 'inactivity') {
        setInactivityNotice(true);
        sessionStorage.removeItem('sesamo_logout_reason');
      }
    } catch (e) {}
  }, []);

  const getRolePath = (role?: string) => {
    if (role === 'COCINA') return '/kitchen';
    if (role === 'MESERO') return '/tables';
    if (role === 'CAJERO') return '/cash-register';
    if (role === 'REPARTIDOR') return '/delivery';
    if (role === 'INVENTARIO') return '/inventory';
    return '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getRolePath(user?.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.trim().length < 4) {
      setError('Debes ingresar tu código privado (PIN de 4 dígitos) para indicar que inicias tu turno.');
      return;
    }

    setLoading(true);
    
    try {
      // Usar API con código privado para iniciar turno
      const loggedUser = await mockApi.auth.login(email, password, pin.trim());
      login(loggedUser);
      navigate(getRolePath(loggedUser.role));
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b160a 0%, #1e290b 100%)',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(101, 163, 13, 0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Sésamo Alimentos"
              sx={{
                height: 125,
                width: 'auto',
                mb: 1,
                filter: 'drop-shadow(0px 8px 16px rgba(101, 163, 13, 0.4))',
                cursor: 'pointer',
                animation: 'bounceScale 2.2s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  animationPlayState: 'paused',
                  transform: 'scale(1.25) translateY(-8px)'
                },
                '@keyframes bounceScale': {
                  '0%, 100%': {
                    transform: 'translateY(0) scale(1)',
                  },
                  '45%': {
                    transform: 'translateY(-16px) scale(1.22)',
                  },
                  '55%': {
                    transform: 'translateY(0) scale(1)',
                  },
                  '70%': {
                    transform: 'translateY(-6px) scale(1.08)',
                  },
                  '85%': {
                    transform: 'translateY(0) scale(1.02)',
                  }
                }
              }}
            />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, color: '#1e290b' }}>
              Sésamo Alimentos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema POS & Gestión Operativa
            </Typography>
          </Box>

          {inactivityNotice && (
            <Alert
              severity="warning"
              onClose={() => setInactivityNotice(false)}
              sx={{ mb: 2, borderRadius: '12px', fontWeight: 600, fontSize: '0.88rem' }}
            >
              Tu sesión se cerró automáticamente por inactividad (más de 20 minutos sin uso). Inicia sesión nuevamente con tu PIN de turno para continuar.
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontWeight: 600 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Correo electrónico"
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              slotProps={{ input: { sx: { borderRadius: '12px' } } }}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              slotProps={{ input: { sx: { borderRadius: '12px' } } }}
            />

            {/* Código Privado / PIN de Turno */}
            <Box
              sx={{
                mt: 2,
                mb: 1,
                p: 2,
                bgcolor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#16a34a' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LockClockIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Código Privado de Turno
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5, fontWeight: 500 }}>
                Ingresa tu PIN de 4 dígitos para registrar inicio de turno y acceder.
              </Typography>
              <TextField
                fullWidth
                label="PIN Táctil (4 Dígitos)"
                type={showPin ? 'text' : 'password'}
                variant="outlined"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                }}
                required
                placeholder="••••"
                slotProps={{
                  htmlInput: {
                    maxLength: 4,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em', fontWeight: 900 }
                  },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPin(!showPin)} edge="end">
                          {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px', bgcolor: '#ffffff', fontWeight: 800 }
                  }
                }}
              />
            </Box>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2.5,
                mb: 2,
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 800,
                bgcolor: '#16a34a',
                color: '#ffffff',
                '&:hover': { bgcolor: '#15803d' }
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Turno & Acceder'}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/menu')}
              sx={{ color: '#65a30d', fontWeight: 700, textTransform: 'none', mb: 1 }}
            >
              ← Volver al Menú Digital Público
            </Button>

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontWeight: 800, color: '#64748b', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Accesos rápidos por rol (Requiere tu PIN):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                <Button size="small" variant="outlined" onClick={() => { setEmail('admin@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                  👑 Admin
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setEmail('cocina@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#ea580c', borderColor: '#fdba74' }}>
                  👨‍🍳 Cocina
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setEmail('carlos@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#65a30d', borderColor: '#bef264' }}>
                  🛎️ Mesero
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setEmail('laura@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#0284c7', borderColor: '#bae6fd' }}>
                  💵 Cajero
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setEmail('kevin@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#d97706', borderColor: '#fde68a' }}>
                  🛵 Repartidor
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setEmail('mateo@sesamo.com'); setPassword('password123'); setPin(''); }} sx={{ fontSize: '0.72rem', borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#7c3aed', borderColor: '#ddd6fe' }}>
                  📦 Inventario
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
