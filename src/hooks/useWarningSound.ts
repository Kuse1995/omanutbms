import { useCallback, useRef } from "react";

export function useWarningSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playWarningBeep = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Warning alarm sound - high frequency beep
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    oscillator.type = "square"; // Harsh, alarm-like sound
    
    // Volume envelope - quick attack, quick decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  const playAlarmSequence = useCallback((beepCount: number = 6, interval: number = 150) => {
    for (let i = 0; i < beepCount; i++) {
      setTimeout(() => {
        playWarningBeep();
      }, i * interval);
    }
  }, [playWarningBeep]);

  return { playWarningBeep, playAlarmSequence };
}
