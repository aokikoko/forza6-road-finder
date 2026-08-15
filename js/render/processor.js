import { hexToRgb, matchesColor } from "./color.js";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform vec3 u_target;
uniform vec3 u_marker;
uniform float u_tolerance;
uniform vec2 u_texelSize;
uniform int u_noiseFilter;
uniform bool u_grayscaleBackground;
in vec2 v_texCoord;
out vec4 outColor;

bool colorMatches(vec3 color) {
  vec3 delta = (color - u_target) * 255.0;
  float distanceValue = sqrt(dot(delta * delta, vec3(0.299, 0.587, 0.114)));
  return distanceValue <= u_tolerance;
}

void main() {
  vec4 source = texture(u_image, v_texCoord);
  bool shouldMark = colorMatches(source.rgb);

  if (shouldMark && u_noiseFilter > 0) {
    int matchingNeighbors = 0;
    for (int offsetY = -1; offsetY <= 1; offsetY++) {
      for (int offsetX = -1; offsetX <= 1; offsetX++) {
        if (offsetX == 0 && offsetY == 0) {
          continue;
        }
        vec2 neighborCoord = v_texCoord + vec2(float(offsetX), float(offsetY)) * u_texelSize;
        bool inBounds = all(greaterThanEqual(neighborCoord, vec2(0.0)))
          && all(lessThanEqual(neighborCoord, vec2(1.0)));
        if (inBounds && colorMatches(texture(u_image, neighborCoord).rgb)) {
          matchingNeighbors++;
        }
      }
    }
    shouldMark = matchingNeighbors >= u_noiseFilter;
  }

  if (shouldMark) {
    outColor = vec4(u_marker, source.a);
  } else if (u_grayscaleBackground) {
    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    outColor = vec4(vec3(luma), source.a);
  } else {
    outColor = source;
  }
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${message}`);
  }
  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Shader linking failed: ${message}`);
  }
  return program;
}

class WebGlProcessor {
  constructor(canvas) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false
    });
    if (!gl) {
      throw new Error("WEBGL_UNAVAILABLE");
    }

    this.canvas = canvas;
    this.gl = gl;
    this.program = createProgram(gl);
    this.texture = gl.createTexture();

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0
    ]), gl.STATIC_DRAW);
    const textureLocation = gl.getAttribLocation(this.program, "a_texCoord");
    gl.enableVertexAttribArray(textureLocation);
    gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(this.program);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_image"), 0);
    this.targetLocation = gl.getUniformLocation(this.program, "u_target");
    this.markerLocation = gl.getUniformLocation(this.program, "u_marker");
    this.toleranceLocation = gl.getUniformLocation(this.program, "u_tolerance");
    this.texelSizeLocation = gl.getUniformLocation(this.program, "u_texelSize");
    this.noiseFilterLocation = gl.getUniformLocation(this.program, "u_noiseFilter");
    this.grayscaleBackgroundLocation = gl.getUniformLocation(this.program, "u_grayscaleBackground");

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  draw(source, width, height, settings) {
    const gl = this.gl;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    const target = hexToRgb(settings.targetColor).map((value) => value / 255);
    const marker = hexToRgb(settings.markerColor).map((value) => value / 255);
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform3fv(this.targetLocation, target);
    gl.uniform3fv(this.markerLocation, marker);
    gl.uniform1f(this.toleranceLocation, settings.tolerance);
    gl.uniform2f(this.texelSizeLocation, 1 / width, 1 / height);
    gl.uniform1i(this.noiseFilterLocation, settings.noiseFilter);
    gl.uniform1i(this.grayscaleBackgroundLocation, settings.grayscaleBackground ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }
}

class CanvasProcessor {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { willReadFrequently: true });
    if (!this.context) {
      throw new Error("CANVAS_UNAVAILABLE");
    }
  }

  draw(source, width, height, settings) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.drawImage(source, 0, 0, width, height);
    const frame = this.context.getImageData(0, 0, width, height);
    const target = hexToRgb(settings.targetColor);
    const marker = hexToRgb(settings.markerColor);
    const matchMask = new Uint8Array(width * height);

    for (let pixelIndex = 0; pixelIndex < matchMask.length; pixelIndex++) {
      const dataOffset = pixelIndex * 4;
      matchMask[pixelIndex] = matchesColor(
        frame.data[dataOffset],
        frame.data[dataOffset + 1],
        frame.data[dataOffset + 2],
        target,
        settings.tolerance
      ) ? 1 : 0;
    }

    for (let pixelIndex = 0; pixelIndex < matchMask.length; pixelIndex++) {
      const dataOffset = pixelIndex * 4;
      let shouldMark = matchMask[pixelIndex] === 1;

      if (shouldMark && settings.noiseFilter > 0) {
        const pixelX = pixelIndex % width;
        const pixelY = Math.floor(pixelIndex / width);
        let matchingNeighbors = 0;

        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) {
              continue;
            }
            const neighborX = pixelX + offsetX;
            const neighborY = pixelY + offsetY;
            if (
              neighborX >= 0 && neighborX < width
              && neighborY >= 0 && neighborY < height
              && matchMask[neighborY * width + neighborX]
            ) {
              matchingNeighbors++;
            }
          }
        }
        shouldMark = matchingNeighbors >= settings.noiseFilter;
      }

      if (shouldMark) {
        frame.data[dataOffset] = marker[0];
        frame.data[dataOffset + 1] = marker[1];
        frame.data[dataOffset + 2] = marker[2];
      } else if (settings.grayscaleBackground) {
        const luma = Math.round(
          0.299 * frame.data[dataOffset]
          + 0.587 * frame.data[dataOffset + 1]
          + 0.114 * frame.data[dataOffset + 2]
        );
        frame.data[dataOffset] = luma;
        frame.data[dataOffset + 1] = luma;
        frame.data[dataOffset + 2] = luma;
      }
    }
    this.context.putImageData(frame, 0, 0);
  }

  destroy() {}
}

export function createProcessor(canvas) {
  try {
    return { processor: new WebGlProcessor(canvas), backend: "webgl" };
  } catch (error) {
    console.info("WebGL2 renderer unavailable; using Canvas 2D.", error);
    return { processor: new CanvasProcessor(canvas), backend: "canvas" };
  }
}