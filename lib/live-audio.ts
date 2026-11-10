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
  /**
   * 대사 음성을 모두 틀 재생기 하나. "재생"을 누를 때 만들어 소리 없이 한 번 틀어 둔다. 휴대폰 브라우저(iOS Safari 등)는 누른 직후가 아닌
   * 때 새로 만든 재생기의 소리를 막아서, 대사마다 새 재생기를 만들면 첫 대사만 들렸다. 없으면 대사마다 새로 만든다.
   */
  blank?: () => HTMLAudioElement;
  /**
   * 대사 음성을 미리 다 받아 브라우저 안 주소(blob:)로 돌려준다. 휴대폰 브라우저는 preload를 무시해 대사마다 틀 때 받느라 1초쯤 늦게 시작했고,
   * 늦은 만큼 컷이 넘어가며 끊겨 어느 컷 대사가 빠질지 매번 달랐다. 없으면 주소를 그대로 튼다.
   */
  fetchBlob?: (url: string) => Promise<string>;
  revoke?: (blobUrl: string) => void;
};

/** 길이 0인 무음 WAV. 재생기를 누른 순간에 한 번 틀어 두는 데 쓴다. */
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/** 배경음을 줄이고 되돌리는 시간(초). */
const DUCK_S = 0.25;

/**
 * 바탕 배경음(장소 소리·배경음악)에 거는 배율. 배경음 파일이 대사 음성보다 4~8dB 크게 녹음돼 있어 대사를 가렸다. 받은 크기(volume, duckVolume)에
 * 이 배율을 곱해 이미 만든 만화에도 똑같이 걸린다.
 */
export const BACKGROUND_LEVEL = 0.5;

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
  blank: () => new Audio(),
  fetchBlob: async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`voice ${res.status}`);
    }
    return URL.createObjectURL(await res.blob());
  },
  revoke: (blobUrl) => URL.revokeObjectURL(blobUrl),
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
  /** 받기 시작한 대사(주소 → 받은 blob 주소). 다 받은 것만 ready에 있다. */
  private readonly fetching = new Set<string>();
  private readonly ready = new Map<string, string>();
  /** 앞 대사가 아직 나오는 동안 시각이 된 대사. 앞 대사가 끝나면 차례로 튼다. */
  private queue: string[] = [];
  /** 대사를 모두 이 재생기로 튼다(누를 때 열어 둔다). 없으면 대사마다 새로 만든다. */
  private voicePlayer: HTMLAudioElement | null = null;
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
    this.openVoicePlayer();
  }

  /** 누른 순간에 대사 재생기를 만들어 무음을 한 번 틀어 둔다. 그 뒤로는 주소만 바꿔 튼다. */
  private openVoicePlayer(): void {
    if (this.voicePlayer || !this.factory.blank) {
      return;
    }
    try {
      const el = this.factory.blank();
      if (this.ctx && this.master) {
        this.ctx.createMediaElementSource(el).connect(this.master);
      }
      el.src = SILENCE;
      void el
        .play()
        ?.then(() => {
          // 그사이 대사를 틀기 시작했으면 끊지 않는다
          if (el.src === SILENCE) {
            el.pause();
          }
        })
        .catch(() => undefined);
      this.voicePlayer = el;
    } catch {
      this.voicePlayer = null;
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

  /** 틀 대사 음성을 미리 받아 둔다. */
  preloadVoice(url: string): void {
    const fetchBlob = this.factory.fetchBlob;
    if (fetchBlob) {
      if (!this.fetching.has(url)) {
        this.fetching.add(url);
        fetchBlob(url)
          .then((blobUrl) => {
            if (this.fetching.has(url)) {
              this.ready.set(url, blobUrl);
            } else {
              this.factory.revoke?.(blobUrl);
            }
          })
          .catch(() => this.fetching.delete(url));
      }
      return;
    }
    if (!this.voices.has(url)) {
      const el = this.factory.audio(url);
      el.preload = "auto";
      this.voices.set(url, el);
    }
  }

  /**
   * 대사 음성을 튼다. 앞 대사가 아직 나오면 끊지 않고 끝난 뒤에 이어 튼다. 나오는 동안 배경음을 duckVolume으로 줄이고 끝나면 되돌린다.
   */
  voice(url: string): void {
    if (this.speaking) {
      this.queue.push(url);
      return;
    }
    this.speak(url);
  }

  private speak(url: string): void {
    const shared = this.voicePlayer;
    const src = this.ready.get(url) ?? url;
    // 미리 받은 재생기는 브라우저 캐시를 채우는 데만 쓰고, 열어 둔 재생기가 있으면 그것으로 튼다
    const el = shared ?? this.voices.get(url) ?? this.factory.audio(src);
    this.voices.delete(url);
    if (shared) {
      shared.src = src;
    }
    el.loop = false;
    if (shared) {
      if (!this.master) {
        el.volume = this.level();
      }
    } else if (this.ctx && this.master) {
      this.ctx.createMediaElementSource(el).connect(this.master);
    } else {
      el.volume = this.level();
    }
    this.speaking = el;
    this.duck(true);
    const done = () => {
      if (this.speaking === el) {
        this.speaking = null;
        const next = this.queue.shift();
        if (next) {
          this.speak(next);
        } else {
          this.duck(false);
        }
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
    this.queue = [];
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
    const to =
      (on ? track.sound.duckVolume : track.sound.volume) * BACKGROUND_LEVEL;
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
    this.voicePlayer?.pause();
    this.voicePlayer = null;
    this.voices.clear();
    this.queue = [];
    this.ready.forEach((blobUrl) => this.factory.revoke?.(blobUrl));
    this.ready.clear();
    this.fetching.clear();
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
      this.current.el.volume = base * BACKGROUND_LEVEL * this.level();
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
        sound.volume * BACKGROUND_LEVEL,
        now + sound.fadeMs / 1000,
      );
      this.ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.master);
    } else {
      el.volume = sound.volume * BACKGROUND_LEVEL * this.level();
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
