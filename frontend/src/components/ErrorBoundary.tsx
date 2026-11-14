import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Container, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Refresh as RefreshIcon, ExitToApp as LogoutIcon, ExpandMore as ExpandMoreIcon, Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL REACT ERROR CAUGHT BY ERRORBOUNDARY:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('sesamo_auth_user');
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/login';
  };

  private handleResetDataAndSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0d160e',
            color: '#f8fafc',
            p: 3,
            fontFamily: '"Inter", "Roboto", sans-serif',
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={8}
              sx={{
                p: 4,
                borderRadius: '20px',
                bgcolor: '#162215',
                border: '1px solid rgba(101, 163, 13, 0.4)',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  mb: 2.5,
                }}
              >
                <ErrorIcon sx={{ fontSize: 48 }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 1 }}>
                Sésamo Alimentos
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#facc15', fontWeight: 600, mb: 2 }}>
                Se detectó una interrupción en la interfaz
              </Typography>

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3, lineHeight: 1.6 }}>
                El sistema experimentó un error temporal al renderizar este módulo. Puede recargar la página o restablecer la sesión si el problema persiste.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                  sx={{
                    bgcolor: '#65a30d',
                    '&:hover': { bgcolor: '#4d7c0f' },
                    fontWeight: 700,
                    borderRadius: '10px',
                    px: 3,
                    py: 1.2,
                  }}
                >
                  Recargar Pantalla
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  onClick={this.handleResetSession}
                  sx={{
                    color: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': { borderColor: '#facc15', bgcolor: 'rgba(250, 204, 21, 0.08)' },
                    borderRadius: '10px',
                    px: 2.5,
                    py: 1.2,
                  }}
                >
                  Reiniciar Sesión
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleResetDataAndSession}
                  sx={{
                    color: '#fca5a5',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
                    borderRadius: '10px',
                    px: 2,
                    py: 1.2,
                  }}
                >
                  Limpiar Caché y Restablecer
                </Button>
              </Box>

              {this.state.error && (
                <Accordion
                  defaultExpanded
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.3)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px !important',
                    textAlign: 'left',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#94a3b8' }} />}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Detalles técnicos del error ({this.state.error.name})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#f87171',
                        fontSize: '0.75rem',
                        m: 0,
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
