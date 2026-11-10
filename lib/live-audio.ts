import { soundChange, soundUrl } from "./live";
import type { PanelSound } from "./types";

/** Web Audio에서 쓰는 만큼만. 테스트는 가짜를 넣는다. */
type Gain = {
  gain: {
    value: number;
    cancelScheduledValues: (t: number) => void;
    setValueAtTime: (v: number, t: number) => void;
    linearRampToValueAtTime: (v: number, t: number) => void;
  };
  connect: (to: unknown) => unknown;
  disconnect: () => void;
};

export type AudioContextLike = {
  currentTime: number;
  destination: unknown;
  createGain: () => Gain;
  createMediaElementSource: (el: HTMLAudioElement) => {
    connect: (to: unknown) => unknown;
  };
  resume?: () => Promise<void>;
  close?: () => Promise<void>;
};

export type AudioFactory = {
  context: () => AudioContextLike | null;
  audio: (src: string) => HTMLAudioElement;
};

/** 배경음을 줄이고 되돌리는 시간(초). */
const DUCK_S = 0.25;

type Track = { sound: PanelSound; el: HTMLAudioElement; gain: Gain | null };

const browser: AudioFactory = {
  context: () => {
    const Ctx =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext);
    return Ctx ? (new Ctx() as unknown as AudioContextLike) : null;
  },
  audio: (src) => new Audio(src),
};

/**
 * 라이브 모드 배경음. 컷이 바뀌면 앞 소리는 서서히 줄이고 다음 소리를 서서히 키운다(GainNode). 같은 소리면 끊지 않고 이어 튼다.
 * 브라우저가 누르기 전 소리를 막으므로 start()는 "재생" 버튼을 누를 때 부른다.
 */
export class LiveAudio {
  private ctx: AudioContextLike | null = null;
  private master: Gain | null = null;
  private current: Track | null = null;
  private readonly cache = new Map<string, HTMLAudioElement>();
  private readonly effects = new Set<HTMLAudioElement>();
  private readonly voices = new Map<string, HTMLAudioElement>();
  private speaking: HTMLAudioElement | null = null;
  private volume = 1;
  private muted = false;

  constructor(private readonly factory: AudioFactory = browser) {}

  /** 사용자가 누른 뒤에 부른다. */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume?.();
      return;
    }
    try {
      this.ctx = this.factory.context();
    } catch {
      this.ctx = null;
    }
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = this.level();
      this.master.connect(this.ctx.destination);
    }
  }

  /** 다음 컷 소리를 미리 받아 둔다. */
  preload(sound: PanelSound | null | undefined): void {
    if (sound && !this.cache.has(sound.publicId)) {
      const el = this.factory.audio(soundUrl(sound));
      el.preload = "auto";
      this.cache.set(sound.publicId, el);
    }
  }

  /** 이 소리로 바꾼다. null이면 서서히 끈다. */
  play(next: PanelSound | null | undefined): void {
    const change = soundChange(this.current?.sound, next);
    if (change === "keep" || change === "none") {
      return;
    }
    if (this.current) {
      this.fadeOut(this.current);
      this.current = null;
    }
    if (change === "switch" && next) {
      this.current = this.fadeIn(next);
    }
  }

  /** 사건 효과음을 배경음 위에 한 번 튼다(이어 틀기·서서히 키우기 없음). */
  effect(sound: PanelSound | null | undefined): void {
    if (!sound) {
      return;
    }
    const el = this.element(sound);
    el.loop = false;
    if (this.ctx && this.master) {
      const gain = this.ctx.createGain();
      gain.gain.value = sound.volume;
      this.ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.master);
    } else {
      el.volume = sound.volume * this.level();
    }
    this.effects.add(el);
    el.onended = () => this.effects.delete(el);
    try {
      void el.play()?.catch(() => undefined);
    } catch {
      // 재생을 막은 브라우저는 소리 없이 넘긴다
    }
  }

  /** 다음에 틀 대사 음성을 미리 받아 둔다. */
  preloadVoice(url: string): void {
    if (!this.voices.has(url)) {
      const el = this.factory.audio(url);
      el.preload = "auto";
      this.voices.set(url, el);
    }
  }

  /**
   * 대사 음성을 튼다. 앞 대사가 아직 나오면 끊는다. 나오는 동안 배경음을 duckVolume으로 줄이고 끝나면 되돌린다.
   */
  voice(url: string): void {
    this.stopVoice();
    const el = this.voices.get(url) ?? this.factory.audio(url);
    this.voices.delete(url);
    el.loop = false;
    if (this.ctx && this.master) {
      this.ctx.createMediaElementSource(el).connect(this.master);
    } else {
      el.volume = this.level();
    }
    this.speaking = el;
    this.duck(true);
    const done = () => {
      if (this.speaking === el) {
        this.speaking = null;
        this.duck(false);
      }
    };
    el.onended = done;
    el.onerror = done;
    try {
      void el.play()?.catch(done);
    } catch {
      done();
    }
  }

  /** 나오는 대사 음성을 끊고 배경음을 되돌린다(컷을 넘기거나 멈출 때). */
  stopVoice(): void {
    if (this.speaking) {
      this.speaking.pause();
      this.speaking = null;
      this.duck(false);
    }
  }

  /** 지금 대사 음성이 나오는지. */
  isSpeaking(): boolean {
    return this.speaking !== null;
  }

  /** 배경음을 대사 동안 줄이거나 되돌린다. duckVolume이 없는 소리는 그대로 둔다. */
  private duck(on: boolean): void {
    const track = this.current;
    if (!track || track.sound.duckVolume === undefined) {
      return;
    }
    const to = on ? track.sound.duckVolume : track.sound.volume;
    if (this.ctx && track.gain) {
      const now = this.ctx.currentTime;
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(track.gain.gain.value, now);
      track.gain.gain.linearRampToValueAtTime(to, now + DUCK_S);
    } else {
      track.el.volume = to * this.level();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.apply();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.apply();
  }

  /** 모두 끄고 정리한다(화면을 떠날 때). */
  stop(): void {
    if (this.current) {
      this.current.el.pause();
      this.current = null;
    }
    this.cache.forEach((el) => el.pause());
    this.cache.clear();
    this.effects.forEach((el) => el.pause());
    this.effects.clear();
    this.speaking?.pause();
    this.speaking = null;
    this.voices.clear();
    void this.ctx?.close?.();
    this.ctx = null;
    this.master = null;
  }

  private level(): number {
    return this.muted ? 0 : this.volume;
  }

  private apply(): void {
    if (this.master) {
      this.master.gain.value = this.level();
    } else if (this.current) {
      const base =
        this.speaking && this.current.sound.duckVolume !== undefined
          ? this.current.sound.duckVolume
          : this.current.sound.volume;
      this.current.el.volume = base * this.level();
    }
    if (!this.master && this.speaking) {
      this.speaking.volume = this.level();
    }
    if (!this.master && this.muted) {
      this.effects.forEach((el) => el.pause());
    }
  }

  private element(sound: PanelSound): HTMLAudioElement {
    const cached = this.cache.get(sound.publicId);
    if (cached) {
      this.cache.delete(sound.publicId);
      return cached;
    }
    return this.factory.audio(soundUrl(sound));
  }

  private fadeIn(sound: PanelSound): Track {
    const el = this.element(sound);
    el.loop = sound.loop;
    let gain: Gain | null = null;
    if (this.ctx && this.master) {
      gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(
        sound.volume,
        now + sound.fadeMs / 1000,
      );
      this.ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.master);
    } else {
      el.volume = sound.volume * this.level();
    }
    try {
      void el.play()?.catch(() => undefined);
    } catch {
      // 재생을 막은 브라우저는 소리 없이 넘긴다
    }
    return { sound, el, gain };
  }

  private fadeOut(track: Track): void {
    const { el, gain, sound } = track;
    if (this.ctx && gain) {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + sound.fadeMs / 1000);
      setTimeout(() => {
        el.pause();
        gain.disconnect();
      }, sound.fadeMs);
    } else {
      el.pause();
    }
  }
}
