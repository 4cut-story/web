/** 라이브 모드 WebGL 층(깊이 패럴랙스, 인물 움직임)이 함께 쓰는 것. */

/** 그림을 읽는다. 못 읽으면 실패한다. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

/** 화면 전체를 덮는 사각형. uv는 왼쪽 위가 0이다. */
export const QUAD_VERTEX = `
attribute vec2 a;
varying vec2 uv;
void main() {
  uv = vec2((a.x + 1.0) * 0.5, (1.0 - a.y) * 0.5);
  gl_Position = vec4(a, 0.0, 1.0);
}`;

/** 셰이더를 묶고 화면 사각형을 잇는다. samplers는 차례로 텍스처 0, 1, 2…에 둔다. 실패하면 null. */
export function buildProgram(
  gl: WebGLRenderingContext,
  fragment: string,
  samplers: string[],
): WebGLProgram | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) {
      return null;
    }
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, QUAD_VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  samplers.forEach((name, k) =>
    gl.uniform1i(gl.getUniformLocation(program, name), k),
  );
  return program;
}

/** 텍스처 index 자리에 새 텍스처를 만들어 묶는다(가장자리 늘이기, 선형 보간). */
export function bindNewTexture(
  gl: WebGLRenderingContext,
  index: number,
): WebGLTexture | null {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

/** 그림을 텍스처 index 자리에 올린다. */
export function imageTexture(
  gl: WebGLRenderingContext,
  img: HTMLImageElement,
  index: number,
): WebGLTexture | null {
  const t = bindNewTexture(gl, index);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  return t;
}

/** 캔버스의 WebGL 문맥. 캔버스가 없거나 WebGL을 못 쓰면 null. */
export function webglOf(
  el: HTMLCanvasElement | null,
): WebGLRenderingContext | null {
  return el?.getContext("webgl", { premultipliedAlpha: false }) ?? null;
}
