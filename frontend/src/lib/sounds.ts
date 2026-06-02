'use client';

const SOUND_URLS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Subtle pop/click
  pop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Bubbly pop
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Soft success chime
  notification: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Soft notification ding
  cart: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Cash register or cart sound
};

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Preload sounds
      Object.entries(SOUND_URLS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.sounds.set(key, audio);
      });
      
      // Check user preference
      const saved = localStorage.getItem('sounds_enabled');
      this.enabled = saved !== 'false';
    }
  }

  play(name: keyof typeof SOUND_URLS) {
    if (!this.enabled || typeof window === 'undefined') return;
    
    const audio = this.sounds.get(name);
    if (audio) {
      // Clone to allow overlapping plays
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.4; // Keep it subtle and premium
      clone.play().catch(e => console.log('Sound play blocked by browser:', e));
    }
  }

  toggle(enabled?: boolean) {
    this.enabled = enabled ?? !this.enabled;
    localStorage.setItem('sounds_enabled', String(this.enabled));
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const playSound = (name: keyof typeof SOUND_URLS) => {
  if (typeof window !== 'undefined') {
    if (!(window as any)._soundManager) {
      (window as any)._soundManager = new SoundManager();
    }
    (window as any)._soundManager.play(name);
  }
};

export const toggleSounds = () => {
  if (typeof window !== 'undefined') {
    if (!(window as any)._soundManager) {
      (window as any)._soundManager = new SoundManager();
    }
    return (window as any)._soundManager.toggle();
  }
  return true;
};
