import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  Chip,
  Divider,
  Paper,
  Stack,
  IconButton,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  AttachMoney as CashIcon,
  CreditCard as CardIcon,
  QrCode2 as TransferIcon,
  Payments as MixedIcon,
  Print as PrintIcon,
  CheckCircle as SuccessIcon,
  Person as PersonIcon,
  ReceiptLong as ReceiptIcon,
  Close as CloseIcon,
  CallSplit as SplitIcon
} from '@mui/icons-material';
import { Order, Invoice, Table, StoreSettings } from '../types';
import { mockApi } from '../services/mockApi';
import { useAuthStore } from '../store/authStore';

interface BillingModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  table?: Table | null;
  onPaymentSuccess: (invoice: Invoice) => void;
}

export default function BillingModal({ open, onClose, order, table, onPaymentSuccess }: BillingModalProps) {
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Customer info
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('Consumidor Final');
  const [customerDocument, setCustomerDocument] = useState('222222222222');
  const [customerEmail, setCustomerEmail] = useState('');

  // Financial calculations
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('Cortesía Casa');

  // Split bill mode
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitDiners, setSplitDiners] = useState<number>(2);

  // Cash payment state
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Mixed payment state
  const [cashPart, setCashPart] = useState<number>(0);
  const [cardPart, setCardPart] = useState<number>(0);

  // Invoice finished view
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isCashOpen, setIsCashOpen] = useState<boolean>(true);
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    if (open) {
      setIsSplitMode(false);
      setSplitDiners(2);
      setDiscountAmount(0);
      setDiscountReason('Cortesía Casa');

      mockApi.settings.get().then((s) => {
        setStoreSettings(s);
        const defTip = s.defaultTipPercentage ?? 10;
        setTipPercentage(defTip);

        const sub = order?.subtotal || 0;
        let taxRate = 0;
        if (s.taxType === 'IMPOCONSUMO_8') taxRate = 0.08;
        else if (s.taxType === 'IVA_19') taxRate = 0.19;

        const calculatedTax = Math.round(sub * taxRate);
        const initialTip = Math.round(sub * (defTip / 100));
        const initialTotal = sub + calculatedTax + initialTip;

        setCashReceived(Math.ceil(initialTotal / 1000) * 1000);
        setCashPart(Math.floor(initialTotal / 2));
        setCardPart(Math.ceil(initialTotal / 2));

        // If the order is already paid, show its invoice immediately (allows viewing & reprinting)
        if (order && (order.status === 'PAGADO' || order.paidAt || order.invoiceNumber)) {
          const inv: Invoice = {
            id: order.id,
            invoiceNumber: order.invoiceNumber || `FACT-${order.orderNumber || order.id.slice(-4)}`,
            orderId: order.id,
            createdAt: order.paidAt || order.createdAt,
            customerName: order.customerName || 'Consumidor Final',
            customerDocument: order.customerDocument || '222222222222',
            customerEmail: (order as any).customerEmail,
            tableNumber: table?.number || order.tableId,
            waiterName: order.waiterName || table?.currentWaiterName || 'Atención General',
            items: order.items || [],
            subtotal: order.subtotal || 0,
            discount: order.discount || 0,
            tax: order.tax || 0,
            tip: order.tip || 0,
            total: order.total || 0,
            paymentMethod: (order.paymentMethod as any) || 'EFECTIVO',
            cashReceived: order.cashReceived,
            changeGiven: order.changeGiven,
            mixedPayments: order.mixedPayments,
            resolutionInfo: s.ticketFooter || 'Res. DIAN POS #1876400921 del 2026-01-15'
          };
          setCompletedInvoice(inv);
        } else {
          setCompletedInvoice(null);
        }
      });

      mockApi.cash.getCurrentRegister().then((reg) => {
        setIsCashOpen(!!(reg && reg.isOpen));
      });
    }
  }, [open, order]);

  if (!order) return null;

  const subtotal = order.subtotal || order.items.reduce((s, i) => s + i.totalPrice, 0);

  let taxRate = 0;
  let taxLabel = 'Exento (0%)';
  if (storeSettings?.taxType === 'IMPOCONSUMO_8') {
    taxRate = 0.08;
    taxLabel = 'Impoconsumo (8%)';
  } else if (storeSettings?.taxType === 'IVA_19') {
    taxRate = 0.19;
    taxLabel = 'IVA (19%)';
  }
  const tax = Math.round(subtotal * taxRate);

  const tip = Math.round(subtotal * (Math.max(0, tipPercentage) / 100));
  const grandTotal = Math.max(0, subtotal + tax + tip - discountAmount);

  const changeGiven = Math.max(0, cashReceived - grandTotal);
  const splitPerPerson = splitDiners > 0 ? Math.round(grandTotal / splitDiners) : grandTotal;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleProcessPayment = async () => {
    if (!['ADMINISTRADOR', 'GERENTE', 'CAJERO'].includes(user?.role || '')) {
      alert('🔒 Restricción de Seguridad: Solo el perfil de CAJERO o ADMINISTRADOR puede procesar pagos y emitir facturas.');
      return;
    }

    const activeReg = await mockApi.cash.getCurrentRegister();
    if (!activeReg || !activeReg.isOpen) {
      alert('⚠️ La Caja Registradora se encuentra CERRADA.\n\nPor favor abre la caja e ingresa la base inicial en el módulo de "Caja & Turno" antes de realizar cobros.');
      return;
    }
    const invoiceNum = `FACT-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceData: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: invoiceNum,
      orderId: order.id,
      createdAt: Date.now(),
      customerName: isCustomCustomer ? customerName : 'Consumidor Final',
      customerDocument: isCustomCustomer ? customerDocument : '222222222222',
      customerEmail,
      tableNumber: table?.number || order.tableId,
      waiterName: order.waiterName || table?.currentWaiterName || 'Atención General',
      items: order.items,
      subtotal,
      discount: discountAmount,
      tax,
      tip,
      total: grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : undefined,
      changeGiven: paymentMethod === 'EFECTIVO' ? changeGiven : undefined,
      mixedPayments: paymentMethod === 'MIXTO' ? [
        { method: 'Efectivo', amount: cashPart },
        { method: 'Tarjeta / Digital', amount: cardPart }
      ] : undefined,
      resolutionInfo: storeSettings?.ticketFooter || 'Res. DIAN POS #1876400921 del 2026-01-15'
    };

    try {
      const paymentData = {
        status: 'PAGADO' as const,
        paymentMethod,
        items: order.items || [],
        registerId: activeReg.id,
        paidAt: Date.now(),
        paidBy: user?.name || 'Laura Gómez (Cajera)',
        customerName: isCustomCustomer ? customerName : 'Consumidor Final',
        customerDocument: isCustomCustomer ? customerDocument : '222222222222',
        subtotal,
        discount: discountAmount,
        tax,
        tip,
        total: grandTotal,
        invoiceNumber: invoiceNum,
        cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : undefined,
        changeGiven: paymentMethod === 'EFECTIVO' ? changeGiven : undefined,
        mixedPayments: paymentMethod === 'MIXTO' ? [
          { method: 'Efectivo', amount: cashPart },
          { method: 'Tarjeta / Digital', amount: cardPart }
        ] : undefined
      };

      // Si la orden ya existía en base de datos la actualizamos a PAGADO; si era un borrador de POS la creamos directamente como PAGADO
      try {
        if (order.id && !order.id.startsWith('draft-')) {
          await mockApi.orders.updateOrder(order.id, paymentData);
        } else {
          throw new Error('Draft order');
        }
      } catch (errNotFound) {
        const { id, createdAt, ...orderDataToCreate } = order;
        await mockApi.orders.create({
          ...orderDataToCreate,
          ...paymentData,
          orderNumber: order.orderNumber || Math.floor(1000 + Math.random() * 9000).toString(),
        });
      }

      // Synchronize with Customer CRM if customer document provided
      if (isCustomCustomer && customerDocument) {
        try {
          const matchedCust = await mockApi.customers.getByDocumentOrPhone(customerDocument);
          if (matchedCust) {
            const addedPoints = Math.max(10, Math.floor(grandTotal / 1000));
            await mockApi.customers.update(matchedCust.id, {
              totalSpent: (matchedCust.totalSpent || 0) + grandTotal,
              totalOrders: (matchedCust.totalOrders || 0) + 1,
              loyaltyPoints: (matchedCust.loyaltyPoints || 0) + addedPoints,
              lastVisit: Date.now()
            });
          }
        } catch (e) {
          console.warn('Customer loyalty points sync error:', e);
        }
      }

      // Free table if associated
      const tableIdToFree = table?.id || order.tableId;
      if (tableIdToFree && String(tableIdToFree).toLowerCase() !== 'barra') {
        try {
          await mockApi.tables.updateStatus(tableIdToFree, 'DISPONIBLE');
        } catch (e) {
          console.warn('No se pudo liberar la mesa:', e);
        }
      }

      setCompletedInvoice(invoiceData);
      onPaymentSuccess(invoiceData);

      if (storeSettings?.autoPrintReceipt) {
        setTimeout(() => {
          handlePrintReceipt();
        }, 500);
      }
    } catch (err) {
      console.error('Error al procesar la facturación:', err);
      alert('Ocurrió un error procesando el pago');
    }
  };

  const handlePrintReceipt = () => {
    const el = document.getElementById('printable-ticket');
    if (el) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Factura de Venta POS - Sésamo</title>
              <style>
                @page {
                  size: ${ticketWidth} auto;
                  margin: 0;
                }
                body {
                  font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: ${ticketWidth === '58mm' ? '3mm 2mm' : '5mm 4mm'};
                  width: ${ticketWidth === '58mm' ? '50mm' : '72mm'};
                  max-width: ${ticketWidth === '58mm' ? '50mm' : '72mm'};
                  color: #000000;
                  font-size: ${ticketWidth === '58mm' ? '9.5px' : '11px'};
                  line-height: 1.35;
                }
                * { box-sizing: border-box; }
                hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
              </style>
            </head>
            <body>
              ${el.innerHTML}
            </body>
          </html>
        `);
        doc.close();

        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 250);
        return;
      }
    }
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible !important;
          }
          #printable-ticket {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            border: none !important;
            box-shadow: none !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#65a30d', width: 44, height: 44 }}>
            <ReceiptIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e290b' }}>
              Facturación & Cobro de Pedido
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
              Comanda #{order.orderNumber} • {table?.number ? `Mesa ${table.number}` : (String(order.tableId || '').toLowerCase() === 'barra' ? '🍸 Venta Directa en Barra' : (order.tableId ? `Mesa ${order.tableId}` : 'Venta Directa'))}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {!isCashOpen && !completedInvoice && (
          <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px' }}>
            <Typography variant="subtitle2" sx={{ color: '#991b1b', fontWeight: 900 }}>
              ⚠️ ATENCIÓN: La caja registradora se encuentra CERRADA
            </Typography>
            <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 600 }}>
              Debes realizar la apertura del turno de caja ingresando la base inicial en el menú de "Caja & Turno" antes de procesar este cobro.
            </Typography>
          </Paper>
        )}

        {completedInvoice ? (
          /* View Completed Printable Invoice Receipt */
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <SuccessIcon sx={{ fontSize: 70, color: '#65a30d', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e290b', mb: 0.5 }}>
              ¡Pago Exitoso y Facturado!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              La orden fue marcada como <strong>PAGADA</strong> y la mesa quedó <strong>LIBRE / DISPONIBLE</strong>.
            </Typography>

            {/* Printable Thermal Receipt Container */}
            <Paper
              id="printable-ticket"
              elevation={0}
              sx={{
                p: 3,
                maxWidth: 400,
                mx: 'auto',
                bgcolor: '#fff',
                border: '2px dashed #94a3b8',
                borderRadius: '16px',
                textAlign: 'left',
                fontFamily: 'monospace'
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src="/logo.png"
                  alt="Sésamo Logo"
                  sx={{
                    width: ticketWidth === '58mm' ? 85 : 120,
                    height: 'auto',
                    mx: 'auto',
                    mb: 1,
                    display: 'block',
                    filter: 'grayscale(100%) contrast(150%)',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1 }}>{storeSettings?.name || storeSettings?.storeName || 'SÉSAMO ALIMENTOS'}</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>NIT: {storeSettings?.nit || '901.482.930-1'}</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>{storeSettings?.address || 'Calle 100 # 15-24, Bogotá D.C.'}</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>Tel: {storeSettings?.phone || '+57 601 745 8900'}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                  {completedInvoice.resolutionInfo}
                </Typography>
              </Box>

              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Box sx={{ fontSize: '0.8rem', mb: 1 }}>
                <div>Factura: <strong>{completedInvoice.invoiceNumber}</strong></div>
                <div>Fecha: <strong>{new Date(completedInvoice.createdAt).toLocaleString()}</strong></div>
                <div>Cliente: <strong>{completedInvoice.customerName}</strong></div>
                <div>NIT/CC: <strong>{completedInvoice.customerDocument}</strong></div>
                <div>Atendido por: <strong>{completedInvoice.waiterName}</strong></div>
              </Box>

              <Divider sx={{ my: 1, borderColor: '#000' }} />

              {/* Items Table */}
              <Box sx={{ fontSize: '0.8rem', mb: 1 }}>
                {completedInvoice.items.map((it, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <span>{it.quantity}x {it.productName}</span>
                    <span>${it.totalPrice.toLocaleString()}</span>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Box sx={{ fontSize: '0.85rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>${completedInvoice.subtotal.toLocaleString()}</span>
                </Box>
                {completedInvoice.tax > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Impuesto ({storeSettings?.taxType === 'IVA_19' ? 'IVA 19%' : 'Impoconsumo 8%'}):</span>
                    <span>${completedInvoice.tax.toLocaleString()}</span>
                  </Box>
                )}
                {completedInvoice.tip > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Propina Voluntaria:</span>
                    <span>${completedInvoice.tip.toLocaleString()}</span>
                  </Box>
                )}
                {completedInvoice.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Descuento:</span>
                    <span>-${completedInvoice.discount.toLocaleString()}</span>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', mt: 1 }}>
                  <span>TOTAL A PAGAR:</span>
                  <span>${completedInvoice.total.toLocaleString()}</span>
                </Box>
                <Divider sx={{ my: 1, borderColor: '#000' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Método de Pago:</span>
                  <span><strong>{completedInvoice.paymentMethod}</strong></span>
                </Box>
                {completedInvoice.cashReceived && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Efectivo Recibido:</span>
                      <span>${completedInvoice.cashReceived.toLocaleString()}</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#4d7c0f' }}>
                      <span>Cambio / Vueltas:</span>
                      <span>${completedInvoice.changeGiven?.toLocaleString()}</span>
                    </Box>
                  </>
                )}
              </Box>

              <Box sx={{ textAlign: 'center', mt: 2, pt: 1, borderTop: '1px solid #000', fontSize: '0.75rem' }}>
                <div>{storeSettings?.ticketFooter || '¡Gracias por su visita a Sésamo Alimentos!'}</div>
                <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '3px' }}>Síguenos en Instagram: @sesamo_alimentos</div>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Formato Impresora:
              </Typography>
              <Button
                size="small"
                variant={ticketWidth === '80mm' ? 'contained' : 'outlined'}
                onClick={() => setTicketWidth('80mm')}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  bgcolor: ticketWidth === '80mm' ? '#1e290b' : 'transparent',
                  color: ticketWidth === '80mm' ? '#ffffff' : '#334155',
                }}
              >
                80mm (Estándar)
              </Button>
              <Button
                size="small"
                variant={ticketWidth === '58mm' ? 'contained' : 'outlined'}
                onClick={() => setTicketWidth('58mm')}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  bgcolor: ticketWidth === '58mm' ? '#1e290b' : 'transparent',
                  color: ticketWidth === '58mm' ? '#ffffff' : '#334155',
                }}
              >
                58mm (Compacta)
              </Button>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintReceipt}
                sx={{ bgcolor: '#0284c7', color: '#fff', borderRadius: '12px', fontWeight: 800, px: 3 }}
              >
                Imprimir Ticket de Factura ({ticketWidth})
              </Button>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}
              >
                Finalizar y Cerrar
              </Button>
            </Box>
          </Box>
        ) : (
          /* Payment Setup & Calculation Form */
          <Grid container spacing={3}>
            {/* Left Side: Order Items Breakdown & Totals */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e290b', mb: 1.5 }}>
                  Resumen de la Comanda
                </Typography>
                <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto', mb: 2, pr: 1 }}>
                  {order.items.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        {item.quantity}x {item.productName}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        ${item.totalPrice.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                {/* Subtotal Neto */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Subtotal Neto:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>${subtotal.toLocaleString()}</Typography>
                </Box>

                {/* Impuesto Fiscal */}
                {tax > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">{taxLabel}:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0369a1' }}>+${tax.toLocaleString()}</Typography>
                  </Box>
                )}

                {/* Tip Selector */}
                <Box sx={{ mt: 1.5, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#ea580c', display: 'block', mb: 0.5 }}>
                    Propina Voluntaria para Mesero:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {[0, 10, 15].map((pct) => (
                      <Chip
                        key={pct}
                        label={pct === 0 ? 'Sin Propina' : `${pct}% ($${Math.round(subtotal * (pct / 100)).toLocaleString()})`}
                        clickable
                        onClick={() => setTipPercentage(pct)}
                        sx={{
                          bgcolor: tipPercentage === pct ? '#ea580c' : 'rgba(234, 88, 12, 0.1)',
                          color: tipPercentage === pct ? '#ffffff' : '#ea580c',
                          fontWeight: 800,
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Descuentos con Motivo */}
                <Box sx={{ mt: 1.5, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#dc2626', display: 'block', mb: 0.5 }}>
                    Descuento Autorizado ($):
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="Monto a descontar"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    sx={{ mb: discountAmount > 0 ? 1 : 0 }}
                  />
                  {discountAmount > 0 && (
                    <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                      <InputLabel id="discount-reason-label">Motivo de Descuento</InputLabel>
                      <Select
                        labelId="discount-reason-label"
                        label="Motivo de Descuento"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                      >
                        <MenuItem value="Cortesía Casa">Cortesía de la Casa</MenuItem>
                        <MenuItem value="Empleado / Familiar">Empleado / Familiar</MenuItem>
                        <MenuItem value="Fidelización Cliente">Fidelización Cliente Frecuente</MenuItem>
                        <MenuItem value="Promoción Especial">Promoción Especial / Cupón</MenuItem>
                        <MenuItem value="Compensación por Servicio">Compensación por Demora o Servicio</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Dividir Cuenta en Partes Iguales */}
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: isSplitMode ? 'rgba(14, 165, 233, 0.1)' : 'rgba(0,0,0,0.02)', border: isSplitMode ? '1px solid #0284c7' : '1px solid rgba(0,0,0,0.06)', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SplitIcon sx={{ color: isSplitMode ? '#0284c7' : '#64748b', fontSize: 20 }} />
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isSplitMode ? '#0284c7' : '#334155' }}>
                        Dividir Cuenta
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isSplitMode ? 'contained' : 'outlined'}
                      onClick={() => setIsSplitMode(!isSplitMode)}
                      sx={{
                        fontSize: '0.7rem',
                        py: 0.2,
                        px: 1,
                        bgcolor: isSplitMode ? '#0284c7' : 'transparent',
                        color: isSplitMode ? '#fff' : '#0284c7',
                        borderColor: '#0284c7'
                      }}
                    >
                      {isSplitMode ? 'Activo' : 'Dividir'}
                    </Button>
                  </Box>

                  {isSplitMode && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block', mb: 0.5 }}>
                        Comensales / Personas:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        {[2, 3, 4, 5, 6].map((num) => (
                          <Chip
                            key={num}
                            label={`${num}p`}
                            clickable
                            onClick={() => setSplitDiners(num)}
                            sx={{
                              bgcolor: splitDiners === num ? '#0284c7' : '#ffffff',
                              color: splitDiners === num ? '#ffffff' : '#0284c7',
                              border: '1px solid #0284c7',
                              fontWeight: 800,
                              fontSize: '0.75rem'
                            }}
                          />
                        ))}
                      </Stack>
                      <Box sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: '8px', border: '1px dashed #38bdf8', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>
                          Cada comensal paga:
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>
                          ${splitPerPerson.toLocaleString()} COP
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e290b' }}>TOTAL A COBRAR:</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#65a30d' }}>
                    ${grandTotal.toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Right Side: Customer Info & Payment Method */}
            <Grid size={{ xs: 12, md: 7 }}>
              {/* Customer Type Selector */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: '#0284c7' }} /> Datos del Cliente / Factura POS:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip
                    label="Consumidor Final"
                    clickable
                    onClick={() => { setIsCustomCustomer(false); setCustomerName('Consumidor Final'); setCustomerDocument('222222222222'); }}
                    sx={{
                      bgcolor: !isCustomCustomer ? '#0284c7' : 'rgba(2, 132, 199, 0.1)',
                      color: !isCustomCustomer ? '#fff' : '#0284c7',
                      fontWeight: 800
                    }}
                  />
                  <Chip
                    label="Personalizar Cliente (NIT / Cédula)"
                    clickable
                    onClick={() => { setIsCustomCustomer(true); setCustomerName(''); setCustomerDocument(''); }}
                    sx={{
                      bgcolor: isCustomCustomer ? '#0284c7' : 'rgba(2, 132, 199, 0.1)',
                      color: isCustomCustomer ? '#fff' : '#0284c7',
                      fontWeight: 800
                    }}
                  />
                </Stack>

                {isCustomCustomer && (
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nombre o Razón Social"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cédula / NIT"
                        value={customerDocument}
                        onChange={(e) => setCustomerDocument(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Correo Electrónico (Opcional)"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Payment Method Selector */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e290b', mb: 1 }}>
                Selecciona el Método de Pago:
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {[
                  { key: 'EFECTIVO', label: 'Efectivo', icon: <CashIcon /> },
                  { key: 'TARJETA', label: 'Tarjeta Datáfono', icon: <CardIcon /> },
                  { key: 'TRANSFERENCIA', label: 'Nequi / Daviplata', icon: <TransferIcon /> },
                  { key: 'MIXTO', label: 'Pago Mixto', icon: <MixedIcon /> }
                ].map((pm) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={pm.key}>
                    <Paper
                      elevation={0}
                      onClick={() => setPaymentMethod(pm.key as any)}
                      sx={{
                        p: 1.5,
                        borderRadius: '14px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: paymentMethod === pm.key ? '#65a30d' : 'rgba(0,0,0,0.03)',
                        color: paymentMethod === pm.key ? '#ffffff' : '#1e290b',
                        border: `2px solid ${paymentMethod === pm.key ? '#65a30d' : 'transparent'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Box sx={{ mb: 0.5 }}>{pm.icon}</Box>
                      <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', lineHeight: 1.2 }}>
                        {pm.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* CASH PAYMENT CALCULATOR */}
              {paymentMethod === 'EFECTIVO' && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(101, 163, 13, 0.08)', border: '1px solid rgba(101, 163, 13, 0.2)', mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#4d7c0f', display: 'block', mb: 1 }}>
                    💵 Cálculo de Vueltas / Cambio:
                  </Typography>
                  <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Efectivo Recibido ($)"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: changeGiven >= 0 ? '#ecfccb' : '#fee2e2', border: `1px solid ${changeGiven >= 0 ? '#65a30d' : '#ef4444'}` }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: changeGiven >= 0 ? '#4d7c0f' : '#b91c1c' }}>
                          Vueltas a Entregar:
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: changeGiven >= 0 ? '#4d7c0f' : '#b91c1c' }}>
                          ${changeGiven.toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Fast Billetes Buttons */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    {[20000, 50000, 100000].map((billete) => (
                      <Chip
                        key={billete}
                        label={`$${billete.toLocaleString()}`}
                        clickable
                        onClick={() => handleQuickCash(billete)}
                        sx={{ bgcolor: '#ffffff', fontWeight: 800, border: '1px solid #65a30d', color: '#4d7c0f' }}
                      />
                    ))}
                    <Chip
                      label="Exacto"
                      clickable
                      onClick={() => handleQuickCash(grandTotal)}
                      sx={{ bgcolor: '#4d7c0f', fontWeight: 800, color: '#ffffff' }}
                    />
                  </Stack>
                </Paper>
              )}

              {/* MIXED PAYMENT SETUP */}
              {paymentMethod === 'MIXTO' && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#0369a1', display: 'block', mb: 1 }}>
                    🔀 Dividir Monto de Pago:
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Monto Efectivo ($)"
                        value={cashPart}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCashPart(val);
                          setCardPart(Math.max(0, grandTotal - val));
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Monto Tarjeta / Nequi ($)"
                        value={cardPart}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCardPart(val);
                          setCashPart(Math.max(0, grandTotal - val));
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* PROCESS ACTION BUTTON */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SuccessIcon />}
                onClick={handleProcessPayment}
                disabled={!isCashOpen}
                sx={{
                  bgcolor: '#65a30d',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  py: 1.8,
                  borderRadius: '16px',
                  boxShadow: '0 6px 20px rgba(101, 163, 13, 0.35)',
                  '&:hover': { bgcolor: '#4d7c0f' },
                  '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#64748b' }
                }}
              >
                {!isCashOpen ? '⚠️ Caja Cerrada (Abre turno en Caja antes de cobrar)' : `Cobrar $${grandTotal.toLocaleString()} & Generar Factura`}
              </Button>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}
