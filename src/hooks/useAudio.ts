import { useEffect, useRef, useState } from 'react';

// Using public domain/placeholder sounds for now
const BGM_URL = '/festa-na-roca.mp3'; // Música tema de Festa Junina
const SPIN_URL = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3'; // Tick sound
const WIN_COMMON_URL = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3'; // Tada
const WIN_RARE_URL = 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_9242978f65.mp3'; // Epic fanfare
const CLICK_URL = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b8f72a40.mp3'; // Som de clique/botão

export function useAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const spinRef = useRef<HTMLAudioElement | null>(null);
  const winCommonRef = useRef<HTMLAudioElement | null>(null);
  const winRareRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false); // Used to check if user has interacted

  useEffect(() => {
    // Initialize audio objects
    bgmRef.current = new Audio(BGM_URL);
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.5;

    spinRef.current = new Audio(SPIN_URL);
    spinRef.current.loop = true;
    spinRef.current.volume = 0.8;

    winCommonRef.current = new Audio(WIN_COMMON_URL);
    winRareRef.current = new Audio(WIN_RARE_URL);
    
    clickRef.current = new Audio(CLICK_URL);
    clickRef.current.volume = 0.7;

    return () => {
      bgmRef.current?.pause();
      spinRef.current?.pause();
      winCommonRef.current?.pause();
      winRareRef.current?.pause();
      clickRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
    if (spinRef.current) spinRef.current.muted = isMuted;
    if (winCommonRef.current) winCommonRef.current.muted = isMuted;
    if (winRareRef.current) winRareRef.current.muted = isMuted;
    if (clickRef.current) clickRef.current.muted = isMuted;
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

  const playSpin = () => {
    if (!isMuted) {
      // Fade out BGM (antes era 0.1, agora é 0.35 para não abaixar tanto)
      if (bgmRef.current) bgmRef.current.volume = 0.35;
      if (spinRef.current) spinRef.current.play().catch(console.error);
    }
  };

  const stopSpin = () => {
    if (spinRef.current) {
      spinRef.current.pause();
      spinRef.current.currentTime = 0;
    }
  };

  const playWin = (isRare: boolean) => {
    if (!isMuted) {
      stopSpin();
      if (isRare) {
        winRareRef.current?.play().catch(console.error);
      } else {
        winCommonRef.current?.play().catch(console.error);
      }
      
      // Return BGM volume to normal after 5 seconds
      setTimeout(() => {
        if (bgmRef.current) bgmRef.current.volume = 0.5;
      }, 5000);
    }
  };

  return {
    isMuted,
    toggleMute,
    playBgm,
    playClick,
    playSpin,
    stopSpin,
    playWin,
  };
}
