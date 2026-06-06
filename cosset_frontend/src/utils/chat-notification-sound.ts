let audioContext: AudioContext | null = null;
let unlockListenerAttached = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }

  return audioContext;
}

function attachUnlockListener() {
  if (unlockListenerAttached || typeof window === 'undefined') {
    return;
  }

  unlockListenerAttached = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      ctx.resume();
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** Short two-tone chime for incoming chat messages. */
export function playChatNotificationSound() {
  attachUnlockListener();

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const playTone = (frequency: number, startAt: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  };

  const start = ctx.currentTime;
  playTone(880, start, 0.12);
  playTone(1174.66, start + 0.1, 0.18);
}
