import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  Typography,
  LinearProgress
} from '@mui/material';
import { AccessTime as TimeIcon, LockClock as LockClockIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

// Inactivity timeout: 20 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 min = 1,200,000 ms
// Warning dialog shown during the last 60 seconds
const WARNING_DURATION_MS = 60 * 1000; // 60 seconds
const LAST_ACTIVITY_KEY = 'sesamo_last_activity';

export default function InactivityTracker() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const navigate = useNavigate();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastRecordedTimeRef = useRef<number>(Date.now());
  const throttleTimeoutRef = useRef<any>(null);

  // Function to register user activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastRecordedTimeRef.current = now;

    // Throttle writing to localStorage to once per second
    if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
        } catch (e) {}
        throttleTimeoutRef.current = null;
      }, 1000);
    }

    // If warning dialog was open and user interacts, close warning
    setIsWarningOpen((prev) => {
      if (prev) {
        setSecondsRemaining(60);
        return false;
      }
      return false;
    });
  }, []);

  // Handle auto logout
  const handleTimeoutLogout = useCallback(() => {
    try {
      sessionStorage.setItem('sesamo_logout_reason', 'inactivity');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch (e) {}

    setIsWarningOpen(false);
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    // La pantalla de KDS Cocina se mantiene activa permanentemente como monitor de pared
    if (!isAuthenticated || user?.role === 'COCINA') {
      setIsWarningOpen(false);
      return;
    }

    // Initialize last activity timestamp
    const now = Date.now();
    lastRecordedTimeRef.current = now;
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!stored) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } else {
        const storedTime = Number(stored);
        if (now - storedTime >= INACTIVITY_TIMEOUT_MS) {
          handleTimeoutLogout();
          return;
        }
      }
    } catch (e) {}

    // Attach user activity listeners
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleUserEvent = () => {
      recordActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserEvent, { passive: true });
    });

    // Check timer every 1 second
    const interval = setInterval(() => {
      let lastActivity = lastRecordedTimeRef.current;
      try {
        const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > lastActivity) {
            lastActivity = parsed;
            lastRecordedTimeRef.current = parsed;
          }
        }
      } catch (e) {}

      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Exceeded 20 minutes -> automatic logout
        handleTimeoutLogout();
      } else if (elapsed >= INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS) {
        // In the last 60 seconds -> show warning dialog
        const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setSecondsRemaining(remainingSec);
        setIsWarningOpen(true);
      } else {
        setIsWarningOpen(false);
      }
    }, 1000);

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime)) {
          lastRecordedTimeRef.current = remoteTime;
          setIsWarningOpen(false);
        }
      } else if (e.key === 'sesamo_auth_user' && !e.newValue) {
        // User logged out in another tab
        logout();
      }
    };

    // When returning to the tab, immediately check if 20 minutes passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        let lastActivity = lastRecordedTimeRef.current;
        try {
          const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (stored) {
            const parsed = Number(stored);
            if (!isNaN(parsed)) lastActivity = parsed;
          }
        } catch (e) {}

        if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
          handleTimeoutLogout();
        } else {
          recordActivity();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserEvent);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(interval);
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [isAuthenticated, recordActivity, handleTimeoutLogout, logout]);

  if (!isAuthenticated) return null;

  return (
    <Dialog
      open={isWarningOpen}
      onClose={() => recordActivity()}
      aria-labelledby="inactivity-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            p: 1.5,
            maxWidth: 440,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }
        }
      }}
    >
      <DialogTitle id="inactivity-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: '#fef3c7',
            color: '#d97706'
          }}
        >
          <LockClockIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e290b', lineHeight: 1.2 }}>
            Aviso de Inactividad
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cierre de sesión automático por seguridad
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <DialogContentText sx={{ color: '#334155', fontSize: '0.92rem', mb: 2 }}>
          El sistema ha estado inactivo. Tu sesión se cerrará automáticamente en:
        </DialogContentText>

        <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', mb: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#d97706', letterSpacing: '-0.02em' }}>
            {secondsRemaining}s
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
            Mueve el cursor o presiona cualquier tecla para continuar
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={(secondsRemaining / 60) * 100}
          color="warning"
          sx={{ height: 6, borderRadius: 3 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleTimeoutLogout}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Cerrar Sesión Ahora
        </Button>
        <Button
          onClick={recordActivity}
          variant="contained"
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 800,
            bgcolor: '#16a34a',
            '&:hover': { bgcolor: '#15803d' }
          }}
          startIcon={<TimeIcon />}
        >
          Continuar Sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}
