import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LiveAudio,
  type AudioContextLike,
  type AudioFactory,
} from "./live-audio";
import type { PanelSound } from "./types";

function sound(publicId: string): PanelSound {
  return { publicId, title: publicId, volume: 0.8, fadeMs: 800, loop: true };
}

type FakeAudio = {
  src: string;
  preload: string;
  loop: boolean;
  volume: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
};

function gain() {
  return {
    gain: {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function factory(withContext: boolean) {
  const audios: FakeAudio[] = [];
  const gains: ReturnType<typeof gain>[] = [];
  const ctx: AudioContextLike = {
    currentTime: 0,
    destination: {},
    createGain: () => {
      const g = gain();
      gains.push(g);
      return g;
    },
    createMediaElementSource: () => ({ connect: vi.fn() }),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
  const f: AudioFactory = {
    context: () => (withContext ? ctx : null),
    audio: (src) => {
      const a: FakeAudio = {
        src,
        preload: "",
        loop: false,
        volume: 1,
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
      };
      audios.push(a);
      return a as unknown as HTMLAudioElement;
    },
  };
  return { f, audios, gains, ctx };
}

afterEach(() => vi.useRealTimers());

describe("라이브 모드 배경음", () => {
  it("같은 소리는 이어 틀고, 다른 소리는 서서히 바꾼다", () => {
    vi.useFakeTimers();
    const { f, audios, gains } = factory(true);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play(sound("a"));
    audio.play(sound("a"));
    expect(audios).toHaveLength(1);
    expect(audios[0].play).toHaveBeenCalledTimes(1);
    expect(audios[0].loop).toBe(true);
    audio.play(sound("b"));
    expect(audios).toHaveLength(2);
    // 앞 소리는 줄인 뒤 멈춘다
    expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      0.8,
    );
    vi.advanceTimersByTime(800);
    expect(audios[0].pause).toHaveBeenCalled();
    audio.play(null);
    vi.advanceTimersByTime(800);
    expect(audios[1].pause).toHaveBeenCalled();
  });

  it("미리 받은 소리를 다시 받지 않는다", () => {
    const { f, audios } = factory(true);
    const audio = new LiveAudio(f);
    audio.start();
    audio.preload(sound("a"));
    audio.preload(sound("a"));
    audio.preload(null);
    expect(audios).toHaveLength(1);
    expect(audios[0].preload).toBe("auto");
    audio.play(sound("a"));
    expect(audios).toHaveLength(1);
    expect(audios[0].src).toBe("/api/images/sounds/a");
  });

  it("음소거·크기는 전체 크기에 걸고, 끄면 정리한다", () => {
    const { f, gains, ctx } = factory(true);
    const audio = new LiveAudio(f);
    audio.start();
    audio.start();
    expect(ctx.resume).toHaveBeenCalled();
    audio.setVolume(0.5);
    expect(gains[0].gain.value).toBe(0.5);
    audio.setMuted(true);
    expect(gains[0].gain.value).toBe(0);
    audio.setVolume(2);
    audio.setMuted(false);
    expect(gains[0].gain.value).toBe(1);
    audio.play(sound("a"));
    audio.stop();
    expect(ctx.close).toHaveBeenCalled();
  });

  it("Web Audio가 없으면 소리 크기를 바로 바꾼다", () => {
    const { f, audios } = factory(false);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play(sound("a"));
    expect(audios[0].volume).toBeCloseTo(0.8);
    audio.setVolume(0.5);
    expect(audios[0].volume).toBeCloseTo(0.4);
    audio.play(null);
    expect(audios[0].pause).toHaveBeenCalled();
  });

  it("재생을 막아도 멈추지 않는다", () => {
    const { f, audios } = factory(false);
    const blocked: AudioFactory = {
      ...f,
      audio: (src) => {
        const el = f.audio(src) as unknown as FakeAudio;
        el.play = vi.fn(() => {
          throw new Error("NotAllowed");
        });
        return el as unknown as HTMLAudioElement;
      },
    };
    const audio = new LiveAudio(blocked);
    audio.start();
    expect(() => audio.play(sound("a"))).not.toThrow();
    expect(audios).toHaveLength(1);
  });

  it("소리 장치를 만들지 못해도 소리 없이 넘긴다", () => {
    const { f } = factory(false);
    const audio = new LiveAudio({
      ...f,
      context: () => {
        throw new Error("no audio");
      },
    });
    expect(() => audio.start()).not.toThrow();
  });
});
