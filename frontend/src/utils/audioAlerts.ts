// Audio notification utility for Kitchen Display System (KDS) & POS

export const playKitchenBellSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Helper to synthesize bell tone with decay
    const playBellTone = (frequency: number, startTime: number, duration: number, volume = 0.4) => {
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();
      const gainHarmonic = ctx.createGain();

      // Main fundamental bell tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

      // Higher shimmer harmonic for authentic metallic bell sound
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(frequency * 2.4, ctx.currentTime + startTime);

      gainHarmonic.gain.setValueAtTime(volume * 0.25, ctx.currentTime + startTime);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration * 0.7);

      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      oscHarmonic.start(ctx.currentTime + startTime);

      osc.stop(ctx.currentTime + startTime + duration);
      oscHarmonic.stop(ctx.currentTime + startTime + duration);
    };

    // Authentic restaurant double bell chime: "Ding-Ding! 🔔"
    playBellTone(1046.5, 0, 0.65, 0.45);   // C6 note
    playBellTone(1318.51, 0.14, 0.85, 0.5); // E6 note
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de cocina:', e);
  }
};

export const playOrderReadySound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };

    // Ready notification chime: 3 ascending tones
    playTone(523.25, 0, 0.3);    // C5
    playTone(659.25, 0.12, 0.3);  // E5
    playTone(783.99, 0.24, 0.5);  // G5
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de pedido listo:', e);
  }
};
