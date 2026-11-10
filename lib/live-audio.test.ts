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
    // 바탕 배경음은 대사를 가리지 않게 배율(0.5)을 곱한다
    expect(audios[0].volume).toBeCloseTo(0.4);
    audio.setVolume(0.5);
    expect(audios[0].volume).toBeCloseTo(0.2);
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

  it("사건 효과음은 배경음을 끊지 않고 한 번만 겹쳐 튼다", () => {
    const { f, audios, gains } = factory(true);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play(sound("rain"));
    audio.effect({ ...sound("alarm"), loop: false, volume: 0.9, fadeMs: 0 });
    audio.effect(null);
    expect(audios).toHaveLength(2);
    expect(audios[1].loop).toBe(false);
    expect(audios[1].play).toHaveBeenCalled();
    expect(audios[0].pause).not.toHaveBeenCalled();
    expect(gains.at(-1)?.gain.value).toBe(0.9);
    audio.stop();
    expect(audios[1].pause).toHaveBeenCalled();
  });

  it("Web Audio가 없으면 효과음 크기를 바로 정하고, 음소거하면 멈춘다", () => {
    const { f, audios } = factory(false);
    const audio = new LiveAudio(f);
    audio.start();
    audio.setVolume(0.5);
    audio.effect({ ...sound("alarm"), loop: false, volume: 0.8, fadeMs: 0 });
    expect(audios[0].volume).toBeCloseTo(0.4);
    audio.setMuted(true);
    expect(audios[0].pause).toHaveBeenCalled();
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

  it("FR-050: 대사 음성이 나오는 동안 배경음을 줄이고, 끝나면 되돌린다", () => {
    const { f, audios, gains } = factory(true);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play({ ...sound("a"), duckVolume: 0.2 });
    const bg = gains[1];
    audio.preloadVoice("/v/1");
    audio.preloadVoice("/v/1");
    expect(audios).toHaveLength(2);
    audio.voice("/v/1");
    expect(audios).toHaveLength(2);
    expect(audios[1].play).toHaveBeenCalled();
    expect(audio.isSpeaking()).toBe(true);
    expect(bg.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.1, 0.25);
    (audios[1] as unknown as { onended: () => void }).onended();
    expect(audio.isSpeaking()).toBe(false);
    expect(bg.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.4, 0.25);
    // 앞 대사가 나오는 동안 시각이 된 대사는 끊지 않고 끝난 뒤 이어 틀고, 멈추면 되돌린다
    audio.voice("/v/2");
    audio.voice("/v/3");
    expect(audios).toHaveLength(3);
    expect(audios[2].pause).not.toHaveBeenCalled();
    (audios[2] as unknown as { onended: () => void }).onended();
    expect(audios).toHaveLength(4);
    expect(audios[3].play).toHaveBeenCalled();
    expect(audio.isSpeaking()).toBe(true);
    audio.voice("/v/9");
    audio.stopVoice();
    expect(audios[3].pause).toHaveBeenCalled();
    expect(audio.isSpeaking()).toBe(false);
    audio.stopVoice();
    audio.voice("/v/4");
    audio.stop();
    expect(audio.isSpeaking()).toBe(false);
  });

  it("FR-050: 재생을 누를 때 대사 재생기를 하나 열어 두고 모든 대사를 그 재생기로 튼다(휴대폰 브라우저)", async () => {
    const { f, audios, gains } = factory(true);
    const blanks: FakeAudio[] = [];
    f.blank = () => {
      const a = f.audio("") as unknown as FakeAudio;
      blanks.push(a);
      return a as unknown as HTMLAudioElement;
    };
    const audio = new LiveAudio(f);
    audio.start();
    expect(blanks).toHaveLength(1);
    const player = blanks[0];
    expect(player.src).toMatch(/^data:audio\/wav/);
    expect(player.play).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(player.pause).toHaveBeenCalledTimes(1);
    audio.start();
    expect(blanks).toHaveLength(1);
    audio.play({ ...sound("a"), duckVolume: 0.2 });
    const bg = gains[1];
    audio.preloadVoice("/v/1");
    const made = audios.length;
    audio.voice("/v/1");
    audio.voice("/v/2");
    expect(audios).toHaveLength(made);
    expect(player.src).toBe("/v/1");
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(audio.isSpeaking()).toBe(true);
    expect(bg.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.1, 0.25);
    (player as unknown as { onended: () => void }).onended();
    expect(player.src).toBe("/v/2");
    expect(player.play).toHaveBeenCalledTimes(3);
    (player as unknown as { onended: () => void }).onended();
    expect(audio.isSpeaking()).toBe(false);
    audio.stop();
    expect(player.pause).toHaveBeenCalled();
  });

  it("FR-050: 열어 둔 대사 재생기는 Web Audio가 없으면 소리 크기를 직접 맞춘다", () => {
    const { f } = factory(false);
    const blanks: FakeAudio[] = [];
    f.blank = () => {
      const a = f.audio("") as unknown as FakeAudio;
      blanks.push(a);
      return a as unknown as HTMLAudioElement;
    };
    const audio = new LiveAudio(f);
    audio.start();
    audio.setVolume(0.5);
    audio.voice("/v/1");
    expect(blanks[0].volume).toBeCloseTo(0.5);
  });

  it("FR-050: Web Audio가 없으면 대사 동안 배경음 크기를 바로 줄이고, duckVolume이 없으면 그대로 둔다", () => {
    const { f, audios } = factory(false);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play({ ...sound("a"), duckVolume: 0.2 });
    audio.voice("/v/1");
    expect(audios[0].volume).toBeCloseTo(0.1);
    audio.setVolume(0.5);
    expect(audios[0].volume).toBeCloseTo(0.05);
    expect(audios[1].volume).toBeCloseTo(0.5);
    audio.stopVoice();
    expect(audios[0].volume).toBeCloseTo(0.2);
    audio.play(sound("b"));
    audio.voice("/v/2");
    expect(audios[2].volume).toBeCloseTo(0.2);
  });

  it("FR-050: 대사를 미리 다 받아 두고 받은 것은 브라우저 안 주소로 튼다(휴대폰은 preload를 무시해 늦게 시작했다)", async () => {
    const { f, audios } = factory(false);
    const fetched: string[] = [];
    const revoked: string[] = [];
    let fail: (e: Error) => void = () => undefined;
    f.fetchBlob = (url) => {
      fetched.push(url);
      if (url === "/v/bad") {
        return new Promise((_, reject) => {
          fail = reject;
        });
      }
      return Promise.resolve(`blob:${url}`);
    };
    f.revoke = (u) => revoked.push(u);
    const audio = new LiveAudio(f);
    audio.start();
    audio.preloadVoice("/v/1");
    audio.preloadVoice("/v/1");
    audio.preloadVoice("/v/bad");
    expect(fetched).toEqual(["/v/1", "/v/bad"]);
    expect(audios).toHaveLength(0);
    await Promise.resolve();
    audio.voice("/v/1");
    expect(audios[0].src).toBe("blob:/v/1");
    audio.stopVoice();
    // 받지 못했으면 주소를 그대로 튼다
    fail(new Error("x"));
    await Promise.resolve();
    audio.voice("/v/bad");
    expect(audios[1].src).toBe("/v/bad");
    audio.preloadVoice("/v/late");
    audio.stop();
    expect(revoked).toEqual(["blob:/v/1"]);
    await Promise.resolve();
    expect(revoked).toEqual(["blob:/v/1", "blob:/v/late"]);
  });

  it("FR-050: 대사 음성 재생을 막으면 배경음을 되돌린다", async () => {
    const { f, audios } = factory(false);
    const audio = new LiveAudio(f);
    audio.start();
    audio.play({ ...sound("a"), duckVolume: 0.2 });
    audio.preloadVoice("/v/1");
    audios[1].play.mockImplementation(() => Promise.reject(new Error("x")));
    audio.voice("/v/1");
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.isSpeaking()).toBe(false);
    expect(audios[0].volume).toBeCloseTo(0.4);
  });
});
