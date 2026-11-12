import sharp from "sharp";

/**
 * 게시물·만화 그림을 받는 화면 크기와 형식에 맞게 줄여 보낸다. 원본은 1024px PNG(장당 1.3MB 남짓)라 그대로 보내면 7컷 게시물 하나에
 * 40MB 가까이 내려간다. 브라우저가 WebP를 받으면 WebP로 바꾸고, w가 있으면 그 폭으로 줄인다. AVIF는 더 작지만 인코딩이 다섯 배쯤
 * 느려 web pod(CPU 100m 요청)에서 첫 요청이 늦어지므로 쓰지 않는다.
 */

/** 받을 수 있는 폭. 아무 값이나 받으면 캐시가 쪼개지므로 이 중 하나로 맞춘다. */
export const IMAGE_WIDTHS = [256, 384, 512, 640, 768, 1024, 1280, 1600, 2048];

/** WebP 품질. 1024px 컷에서 PNG 1.4MB → 100KB 남짓이고, 그림체와 말풍선 글자가 눈에 띄게 뭉개지지 않는 선이다. */
export const WEBP_QUALITY = 78;

export type ImageFormat = "webp" | "original";

/** 요청한 폭을 IMAGE_WIDTHS 중 그보다 크거나 같은 가장 작은 값으로 맞춘다. 없거나 틀리면 null(원본 크기). */
export function pickWidth(raw: string | null): number | null {
  if (raw === null || !/^\d{1,4}$/.test(raw)) {
    return null;
  }
  const want = Number(raw);
  if (want <= 0) {
    return null;
  }
  return IMAGE_WIDTHS.find((w) => w >= want) ?? IMAGE_WIDTHS.at(-1)!;
}

/** Accept 헤더에 image/webp가 있으면 WebP로 보낸다. 오래된 브라우저와 미리보기 로봇은 원본 형식 그대로 받는다. */
export function pickFormat(accept: string | null): ImageFormat {
  return accept !== null && /image\/webp/i.test(accept) ? "webp" : "original";
}

/** 바꿀 수 있는 원본 형식. 깊이 지도·음성·배경음은 여기 오지 않는다. */
export function transformable(contentType: string): boolean {
  return /^image\/(png|jpeg)$/i.test(contentType.split(";")[0].trim());
}

type Entry = { etag: string; body: Uint8Array; contentType: string };

/** 바꾼 결과를 원본 ETag와 함께 메모리에 둔다. pod 메모리 한도(512Mi)를 생각해 48MB까지만 두고 오래 안 쓴 것부터 버린다. */
export class ImageCache {
  private readonly entries = new Map<string, Entry>();
  private bytes = 0;

  constructor(private readonly limit: number) {}

  get(key: string): Entry | undefined {
    const hit = this.entries.get(key);
    if (hit) {
      // 최근에 쓴 것을 뒤로 보낸다
      this.entries.delete(key);
      this.entries.set(key, hit);
    }
    return hit;
  }

  set(key: string, entry: Entry): void {
    if (entry.body.byteLength > this.limit) {
      return;
    }
    this.delete(key);
    this.entries.set(key, entry);
    this.bytes += entry.body.byteLength;
    for (const [k, v] of this.entries) {
      if (this.bytes <= this.limit) {
        break;
      }
      this.entries.delete(k);
      this.bytes -= v.body.byteLength;
    }
  }

  delete(key: string): void {
    const old = this.entries.get(key);
    if (old) {
      this.entries.delete(key);
      this.bytes -= old.body.byteLength;
    }
  }

  get size(): number {
    return this.bytes;
  }
}

export const imageCache = new ImageCache(48 * 1024 * 1024);

// libvips 자체 캐시는 끈다. 위 캐시가 결과를 들고 있어 같은 원본을 다시 풀 일이 드물다.
sharp.cache(false);

/** 원본 바이트를 폭·형식에 맞게 바꾼다. 원본보다 크게 늘리지 않는다. */
export async function transformImage(
  input: Uint8Array,
  width: number | null,
  format: ImageFormat,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  let pipeline = sharp(input);
  if (width !== null) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  if (format === "webp") {
    const body = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    return { body: new Uint8Array(body), contentType: "image/webp" };
  }
  if (width === null) {
    return null;
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { body: new Uint8Array(data), contentType: `image/${info.format}` };
}
