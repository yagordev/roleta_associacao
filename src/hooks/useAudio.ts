import { useEffect, useRef, useState } from 'react';

// Using public domain/placeholder sounds for now
const BGM_URL = '/festa-na-roca.mp3'; // Música tema de Festa Junina
const APPLAUSE_URL = '/applause.mp3'; // Plateia aplaudindo
const FIREWORKS_URL = '/fireworks.mp3'; // Fogos de artifício
const TICK_URL = '/tick.mp3'; // O arquivo roubado da invertexto
const CLICK_URL = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b8f72a40.mp3'; // Som de clique/botão

export function useAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const applauseRef = useRef<HTMLAudioElement | null>(null);
  const fireworksRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<HTMLAudioElement | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false); // Used to check if user has interacted

  useEffect(() => {
    // Initialize audio objects
    bgmRef.current = new Audio(BGM_URL);
    bgmRef.current.preload = 'auto';
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.5;

    applauseRef.current = new Audio(APPLAUSE_URL);
    applauseRef.current.preload = 'auto';
    
    fireworksRef.current = new Audio(FIREWORKS_URL);
    fireworksRef.current.preload = 'auto';
    
    clickRef.current = new Audio(CLICK_URL);
    clickRef.current.preload = 'auto';
    clickRef.current.volume = 0.7;

    tickRef.current = new Audio(TICK_URL);
    tickRef.current.preload = 'auto';
    tickRef.current.volume = 0.8;

    return () => {
      bgmRef.current?.pause();
      applauseRef.current?.pause();
      fireworksRef.current?.pause();
      clickRef.current?.pause();
      tickRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
    if (applauseRef.current) applauseRef.current.muted = isMuted;
    if (fireworksRef.current) fireworksRef.current.muted = isMuted;
    if (clickRef.current) clickRef.current.muted = isMuted;
    if (tickRef.current) tickRef.current.muted = isMuted;
  }, [isMuted]);

  const toggleMute = () => {
    if (!isPlaying) {
      bgmRef.current?.play().catch(console.error);
      setIsPlaying(true);
    }
    setIsMuted(!isMuted);
  };

  const playBgm = () => {
    if (bgmRef.current && isPlaying && !isMuted) {
      bgmRef.current.volume = 0.5;
      bgmRef.current.play().catch(console.error);
    }
  };
  
  const playClick = () => {
    if (!isMuted && clickRef.current) {
      clickRef.current.currentTime = 0;
      clickRef.current.play().catch(console.error);
    }
  };

  const playTick = () => {
    if (!isMuted && tickRef.current) {
      tickRef.current.currentTime = 0;
      tickRef.current.play().catch(console.error);
    }
  };

  const playSpin = () => {
    if (!isMuted) {
      // Fade out BGM (antes era 0.1, agora é 0.35 para não abaixar tanto)
      if (bgmRef.current) bgmRef.current.volume = 0.35;
    }
  };

  const stopSpin = () => {
    // Agora o tick para sozinho, não precisamos mais pausar o som de giro contínuo
  };

  const playWin = (isRare: boolean) => {
    if (!isMuted) {
      if (applauseRef.current) {
        applauseRef.current.currentTime = 0;
        applauseRef.current.play().catch(console.error);
      }
      // Sempre toca fogos agora (mas poderíamos limitar a isRare se quiser)
      if (fireworksRef.current) {
        fireworksRef.current.currentTime = 0;
        fireworksRef.current.play().catch(console.error);
      }
      
      // Return BGM volume to normal after 1.5 seconds (quicker recovery)
      setTimeout(() => {
        if (bgmRef.current) bgmRef.current.volume = 0.5;
      }, 1500);
    }
  };

  return {
    isMuted,
    toggleMute,
    playBgm,
    playClick,
    playTick,
    playSpin,
    stopSpin,
    playWin,
  };
}
