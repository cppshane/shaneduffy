import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  HostListener,
  NgZone,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import * as glm from "gl-matrix";

const SHADER_BASE = "assets/webmeter/shaders";

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

function pickParticleDim(): number {
  const coarse =
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 760px)").matches);
  return coarse ? 512 : 1024;
}

class Clock {
  private startTime = 0;
  private oldTime = 0;
  private running = false;

  getDelta(): number {
    if (!this.running) {
      this.startTime = Date.now();
      this.oldTime = this.startTime;
      this.running = true;
    }
    const newTime = Date.now();
    const diff = 0.001 * (newTime - this.oldTime);
    this.oldTime = newTime;
    return diff;
  }
}

interface CameraLike {
  pos: glm.vec3;
  target: glm.vec3;
  up: glm.vec3;
  right: glm.vec3;
  viewMat: glm.mat4;
  projMat: glm.mat4;
  viewProjMat: glm.mat4;
  fov: number;
  aspect: number;
  update(): void;
  getPointOnTargetPlane(u: number, v: number): glm.vec3;
}

class Camera implements CameraLike {
  pos: glm.vec3;
  target: glm.vec3;
  up: glm.vec3;
  right: glm.vec3;
  viewMat: glm.mat4;
  projMat: glm.mat4;
  viewProjMat: glm.mat4;
  fov: number;
  near: number;
  far: number;
  aspect: number;

  constructor(fov: number, near: number, far: number, aspect: number) {
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.aspect = aspect;
    this.pos = [0, 0, 1];
    this.target = [0, 0, 0];
    this.up = [0, 1, 0];
    this.right = [1, 0, 0];
    this.viewMat = glm.mat4.create();
    this.projMat = glm.mat4.create();
    this.viewProjMat = glm.mat4.create();
  }

  update(): void {
    glm.mat4.lookAt(this.viewMat, this.pos, this.target, this.up);
    glm.mat4.perspective(
      this.projMat,
      this.fov * 2,
      this.aspect,
      this.near,
      this.far
    );
    glm.mat4.multiply(this.viewProjMat, this.projMat, this.viewMat);
  }

  getPointOnTargetPlane(u: number, v: number): glm.vec3 {
    const A = glm.vec3.clone(this.right);
    const B = glm.vec3.clone(this.up);
    const C = glm.vec3.create();
    const tanFOV = Math.tan(this.fov);
    glm.vec3.scale(A, A, tanFOV * this.aspect);
    glm.vec3.scale(B, B, tanFOV);
    glm.vec3.subtract(C, this.target, this.pos);
    glm.vec3.normalize(C, C);
    C[0] += (2 * u - 1) * A[0] + (2 * v - 1) * B[0];
    C[1] += (2 * u - 1) * A[1] + (2 * v - 1) * B[1];
    C[2] += (2 * u - 1) * A[2] + (2 * v - 1) * B[2];
    glm.vec3.normalize(C, C);
    const targetVec = glm.vec3.create();
    glm.vec3.subtract(targetVec, this.target, this.pos);
    const targetDist = glm.vec3.length(targetVec);
    const angle = Math.acos(
      glm.vec3.dot(C, targetVec) / (targetDist || 1e-6)
    );
    const scale = targetDist / Math.cos(angle);
    glm.vec3.scale(C, C, scale);
    glm.vec3.add(C, C, this.pos);
    return C;
  }
}

class CameraControls {
  yawAngle = 0;
  pitchAngle = 0;
  radius = 1;
  camera: CameraLike;

  constructor(camera: CameraLike) {
    this.camera = camera;
    this.camera.pos[0] = 0;
    this.camera.pos[1] = 0;
    this.camera.pos[2] = this.radius;
  }

  update(): void {
    const calcPos: glm.vec3 = [
      Math.sin(this.yawAngle),
      0,
      Math.cos(this.yawAngle),
    ];
    this.camera.right[0] = calcPos[2];
    this.camera.right[1] = 0;
    this.camera.right[2] = -calcPos[0];
    const pitchRot = glm.mat4.create();
    glm.mat4.rotate(
      pitchRot,
      pitchRot,
      this.pitchAngle,
      this.camera.right as glm.vec3
    );
    glm.vec3.transformMat4(calcPos, calcPos, pitchRot);
    glm.vec3.scale(calcPos, calcPos, this.radius);
    glm.vec3.add(this.camera.pos, this.camera.target, calcPos);
    glm.vec3.cross(
      this.camera.up,
      calcPos,
      this.camera.right as glm.vec3
    );
    glm.vec3.normalize(this.camera.up, this.camera.up);
  }
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;

interface ColorTargetFormat {
  internalFormat: number;
  format: number;
  type: number;
}

@Component({
  selector: "app-particles-background",
  templateUrl: "./particles-background.component.html",
  styleUrls: ["./particles-background.component.css"],
})
export class ParticlesBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild("canvas") canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() paused = false;
  private destroyed = false;
  particleColor = "#030311";
  alpha = 0.7;
  gravity = 0.65;
  centerGravity = 2.0;

  private animationId = 0;
  private gl: GL | null = null;
  private isWebGL2 = false;
  private drawBuffersExt: WEBGL_draw_buffers | null = null;
  private colorTarget: ColorTargetFormat | null = null;
  private particleDim = 1024;
  private clock = new Clock();
  private camera: Camera | null = null;
  private cameraControls: CameraControls | null = null;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private inputPos: glm.vec3 = [0, 0, 0];
  private timer = 0;
  private fixedTimeRemainder = 0;
  private readonly FIXED_TIME_STEP = 0.02;
  private readonly FIXED_TIME_STEP_MAX = 0.2;

  private fullScreenQuadPos: Float32Array = new Float32Array([
    -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0,
  ]);
  private particleUV: Float32Array | null = null;
  private particleUVBuffer: WebGLBuffer | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  private particleComputeBuffers: Array<{
    width: number;
    height: number;
    textures: WebGLTexture[];
    frameBuffer: WebGLFramebuffer;
  }> = [];

  private shaders: {
    particle: {
      program: WebGLProgram;
      attributes: { aUV: number };
      uniforms: {
        uViewProjMat: WebGLUniformLocation | null;
        uColor: WebGLUniformLocation | null;
        uTexture0: WebGLUniformLocation | null;
        uTexture1: WebGLUniformLocation | null;
        uTexture2: WebGLUniformLocation | null;
      };
      uColorValue: [number, number, number, number];
    };
    particleCompute: {
      program: WebGLProgram;
      attributes: { aPosition: number };
      uniforms: {
        uResolution: WebGLUniformLocation | null;
        uTime: WebGLUniformLocation | null;
        uDeltaT: WebGLUniformLocation | null;
        uInputPos: WebGLUniformLocation | null;
        uKForce: WebGLUniformLocation | null;
        uCenterPos: WebGLUniformLocation | null;
        uCenterKForce: WebGLUniformLocation | null;
        uTexture0: WebGLUniformLocation | null;
        uTexture1: WebGLUniformLocation | null;
        uTexture2: WebGLUniformLocation | null;
      };
      uKForceValue: number;
      uCenterKForceValue: number;
      uInputPosValue: glm.vec3;
      uCenterPosValue: glm.vec3;
    };
    particleInit: {
      program: WebGLProgram;
      attributes: { aPosition: number };
      uniforms: { uResolution: WebGLUniformLocation | null };
    };
  } | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.runParticles(canvas);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    const gl = this.gl;
    if (gl) {
      for (const buffer of this.particleComputeBuffers) {
        buffer.textures.forEach((texture) => gl.deleteTexture(texture));
        gl.deleteFramebuffer(buffer.frameBuffer);
      }
      gl.deleteBuffer(this.particleUVBuffer);
      gl.deleteBuffer(this.quadBuffer);
      if (this.shaders) {
        gl.deleteProgram(this.shaders.particle.program);
        gl.deleteProgram(this.shaders.particleCompute.program);
        gl.deleteProgram(this.shaders.particleInit.program);
      }
    }
  }

  @HostListener("document:pointermove", ["$event"])
  onPointerMove(e: PointerEvent): void {
    const rect = this.canvasRef?.nativeElement.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    this.mouseX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.mouseY = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  }

  private async runParticles(canvas: HTMLCanvasElement): Promise<void> {
    this.particleDim = pickParticleDim();
    const attrs: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    };

    // Probe on a throwaway canvas so a failed WebGL2 attempt does not
    // lock this display canvas out of a WebGL1 fallback.
    if (this.webgl2Supported(attrs)) {
      const gl2 = canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null;
      if (gl2) {
        this.isWebGL2 = true;
        const targets = this.webgl2ColorTargets(gl2);
        for (const target of targets) {
          this.colorTarget = target;
          this.particleComputeBuffers = [];
          const ok = await this.boot(canvas, gl2, true);
          if (ok) return;
        }
        // A WebGL2 context already owns this canvas, so WebGL1 is unavailable.
        console.warn("WebGL2 particle framebuffer setup failed");
        return;
      }
    }

    const gl1 = canvas.getContext("webgl", attrs);
    if (!gl1) {
      console.warn("WebGL not supported");
      return;
    }
    const extDrawBuffers = gl1.getExtension("WEBGL_draw_buffers");
    const extFloat = gl1.getExtension("OES_texture_float");
    if (!extDrawBuffers || !extFloat) {
      console.warn("Required WebGL extensions not supported");
      return;
    }
    this.isWebGL2 = false;
    this.drawBuffersExt = extDrawBuffers;
    this.colorTarget = {
      internalFormat: gl1.RGBA,
      format: gl1.RGBA,
      type: gl1.FLOAT,
    };
    await this.boot(canvas, gl1, false);
  }

  private webgl2Supported(attrs: WebGLContextAttributes): boolean {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2", attrs) as WebGL2RenderingContext | null;
    if (!gl) return false;
    const colorTarget = this.pickWebGL2ColorTarget(gl);
    const vtfUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    return !!colorTarget && vtfUnits > 0;
  }

  private webgl2ColorTargets(gl: WebGL2RenderingContext): ColorTargetFormat[] {
    const targets: ColorTargetFormat[] = [];
    if (gl.getExtension("EXT_color_buffer_half_float")) {
      targets.push({
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
      });
      targets.push({
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.FLOAT,
      });
    }
    if (gl.getExtension("EXT_color_buffer_float")) {
      targets.push({
        internalFormat: gl.RGBA32F,
        format: gl.RGBA,
        type: gl.FLOAT,
      });
    }
    return targets;
  }

  private pickWebGL2ColorTarget(
    gl: WebGL2RenderingContext
  ): ColorTargetFormat | null {
    return this.webgl2ColorTargets(gl)[0] || null;
  }

  private async boot(
    canvas: HTMLCanvasElement,
    gl: GL,
    webgl2: boolean
  ): Promise<boolean> {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const suffix = webgl2 ? ".300" : "";
    const vs = await this.fetchShader(`particle${suffix}.vs`);
    const fs = await this.fetchShader(`particle${suffix}.fs`);
    const compVs = await this.fetchShader(`particleCompute${suffix}.vs`);
    const compFs = await this.fetchShader(`particleCompute${suffix}.fs`);
    const initFs = await this.fetchShader(`particleInit${suffix}.fs`);
    if (this.destroyed || !vs || !fs || !compVs || !compFs || !initFs) return false;

    this.gl = gl;
    this.resize(canvas);
    this.camera = new Camera(
      radians(45),
      0.1,
      1000,
      canvas.width / canvas.height
    );
    this.cameraControls = new CameraControls(this.camera);
    this.cameraControls.radius = 2.8;

    const particleProgram = this.compileProgram(gl, vs, fs);
    const particleComputeProgram = this.compileProgram(gl, compVs, compFs);
    const particleInitProgram = this.compileProgram(gl, compVs, initFs);
    if (!particleProgram || !particleComputeProgram || !particleInitProgram) {
      console.warn("Particle shader compilation failed");
      return false;
    }

    const rgb = hexToRgb(this.particleColor);
    const uColorValue: [number, number, number, number] = rgb
      ? [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, this.alpha]
      : [0.012, 0.012, 0.067, this.alpha];

    this.shaders = {
      particle: {
        program: particleProgram,
        attributes: {
          aUV: gl.getAttribLocation(particleProgram, "aUV"),
        },
        uniforms: {
          uViewProjMat: gl.getUniformLocation(particleProgram, "uViewProjMat"),
          uColor: gl.getUniformLocation(particleProgram, "uColor"),
          uTexture0: gl.getUniformLocation(particleProgram, "uTexture0"),
          uTexture1: gl.getUniformLocation(particleProgram, "uTexture1"),
          uTexture2: gl.getUniformLocation(particleProgram, "uTexture2"),
        },
        uColorValue,
      },
      particleCompute: {
        program: particleComputeProgram,
        attributes: {
          aPosition: gl.getAttribLocation(particleComputeProgram, "aPosition"),
        },
        uniforms: {
          uResolution: gl.getUniformLocation(
            particleComputeProgram,
            "uResolution"
          ),
          uTime: gl.getUniformLocation(particleComputeProgram, "uTime"),
          uDeltaT: gl.getUniformLocation(particleComputeProgram, "uDeltaT"),
          uInputPos: gl.getUniformLocation(particleComputeProgram, "uInputPos"),
          uKForce: gl.getUniformLocation(particleComputeProgram, "uKForce"),
          uCenterPos: gl.getUniformLocation(
            particleComputeProgram,
            "uCenterPos"
          ),
          uCenterKForce: gl.getUniformLocation(
            particleComputeProgram,
            "uCenterKForce"
          ),
          uTexture0: gl.getUniformLocation(particleComputeProgram, "uTexture0"),
          uTexture1: gl.getUniformLocation(particleComputeProgram, "uTexture1"),
          uTexture2: gl.getUniformLocation(particleComputeProgram, "uTexture2"),
        },
        uKForceValue: this.gravity,
        uCenterKForceValue: this.centerGravity,
        uInputPosValue: [0, 0, 0],
        uCenterPosValue: [0, 0, 0],
      },
      particleInit: {
        program: particleInitProgram,
        attributes: {
          aPosition: gl.getAttribLocation(particleInitProgram, "aPosition"),
        },
        uniforms: {
          uResolution: gl.getUniformLocation(
            particleInitProgram,
            "uResolution"
          ),
        },
      },
    };

    gl.useProgram(particleComputeProgram);
    gl.uniform2f(
      this.shaders.particleCompute.uniforms.uResolution,
      this.particleDim,
      this.particleDim
    );
    gl.useProgram(particleInitProgram);
    gl.uniform2f(
      this.shaders.particleInit.uniforms.uResolution,
      this.particleDim,
      this.particleDim
    );
    gl.useProgram(null);

    this.initParticleUV(gl);
    this.initQuadBuffer(gl);
    if (!this.initComputeBuffers(gl)) {
      console.warn("Particle framebuffer setup failed");
      return false;
    }
    this.drawParticleInit(gl);
    this.cameraControls.update();
    this.camera.update();
    this.draw(gl);
    this.ngZone.runOutsideAngular(() => this.animate(canvas));
    return true;
  }

  private async fetchShader(name: string): Promise<string | null> {
    try {
      const r = await fetch(`${SHADER_BASE}/${name}`);
      return r.ok ? r.text() : null;
    } catch {
      return null;
    }
  }

  private compileProgram(
    gl: GL,
    vsSource: string,
    fsSource: string
  ): WebGLProgram | null {
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  private resize(canvas: HTMLCanvasElement): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.offsetWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.offsetHeight * dpr));
    canvas.width = w;
    canvas.height = h;
    if (this.camera) this.camera.aspect = w / h;
  }

  @HostListener("window:resize")
  onResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.gl) this.resize(canvas);
  }

  private initParticleUV(gl: GL): void {
    const w = this.particleDim;
    const h = this.particleDim;
    const uv: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        uv.push(x / w, y / h);
      }
    }
    this.particleUV = new Float32Array(uv);
    this.particleUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleUV, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private initQuadBuffer(gl: GL): void {
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fullScreenQuadPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private colorAttachments(gl: GL): number[] {
    if (this.isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      return [
        gl2.COLOR_ATTACHMENT0,
        gl2.COLOR_ATTACHMENT1,
        gl2.COLOR_ATTACHMENT2,
      ];
    }
    const ext = this.drawBuffersExt!;
    return [
      ext.COLOR_ATTACHMENT0_WEBGL,
      ext.COLOR_ATTACHMENT1_WEBGL,
      ext.COLOR_ATTACHMENT2_WEBGL,
    ];
  }

  private setDrawBuffers(gl: GL, attachments: number[]): void {
    if (this.isWebGL2) {
      (gl as WebGL2RenderingContext).drawBuffers(attachments);
      return;
    }
    this.drawBuffersExt!.drawBuffersWEBGL(attachments);
  }

  private initComputeBuffers(gl: GL): boolean {
    const target = this.colorTarget!;
    const attachments = this.colorAttachments(gl);

    for (let i = 0; i < 2; i++) {
      const textures: WebGLTexture[] = [];
      for (let t = 0; t < 3; t++) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          target.internalFormat,
          this.particleDim,
          this.particleDim,
          0,
          target.format,
          target.type,
          null
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        textures.push(tex);
      }
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      for (let a = 0; a < 3; a++) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          attachments[a],
          gl.TEXTURE_2D,
          textures[a],
          0
        );
      }
      this.setDrawBuffers(gl, attachments);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn("Particle framebuffer incomplete:", status);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.particleComputeBuffers.push({
        width: this.particleDim,
        height: this.particleDim,
        textures,
        frameBuffer: fb,
      });
    }
    return true;
  }

  private drawParticleInit(gl: GL): void {
    const buf = this.particleComputeBuffers[0];
    const s = this.shaders!.particleInit;
    gl.bindFramebuffer(gl.FRAMEBUFFER, buf.frameBuffer);
    gl.viewport(0, 0, buf.width, buf.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.useProgram(s.program);
    gl.enableVertexAttribArray(s.attributes.aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(s.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(s.attributes.aPosition);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private simulate(gl: GL, deltaT: number): void {
    const s = this.shaders!.particleCompute;
    this.timer += deltaT;
    s.uInputPosValue[0] = this.inputPos[0];
    s.uInputPosValue[1] = this.inputPos[1];
    s.uInputPosValue[2] = this.inputPos[2];
    gl.useProgram(s.program);
    gl.uniform1f(s.uniforms.uTime, this.timer);
    gl.uniform1f(s.uniforms.uDeltaT, deltaT);
    gl.uniform3f(
      s.uniforms.uInputPos!,
      s.uInputPosValue[0],
      s.uInputPosValue[1],
      s.uInputPosValue[2]
    );
    gl.uniform1f(s.uniforms.uKForce, s.uKForceValue);
    gl.uniform3f(
      s.uniforms.uCenterPos!,
      s.uCenterPosValue[0],
      s.uCenterPosValue[1],
      s.uCenterPosValue[2]
    );
    gl.uniform1f(s.uniforms.uCenterKForce!, s.uCenterKForceValue);
    gl.useProgram(null);

    const fromBuf = this.particleComputeBuffers[0];
    const toBuf = this.particleComputeBuffers[1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, toBuf.frameBuffer);
    gl.viewport(0, 0, toBuf.width, toBuf.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.useProgram(s.program);
    gl.enableVertexAttribArray(s.attributes.aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(s.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[0]);
    gl.uniform1i(s.uniforms.uTexture0!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[1]);
    gl.uniform1i(s.uniforms.uTexture1!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[2]);
    gl.uniform1i(s.uniforms.uTexture2!, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(s.attributes.aPosition);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const t = this.particleComputeBuffers[0];
    this.particleComputeBuffers[0] = this.particleComputeBuffers[1];
    this.particleComputeBuffers[1] = t;
  }

  private draw(gl: GL): void {
    const buf = this.particleComputeBuffers[0];
    const s = this.shaders!.particle;
    gl.viewport(0, 0, gl.canvas.width as number, gl.canvas.height as number);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(s.program);
    gl.uniformMatrix4fv(
      s.uniforms.uViewProjMat,
      false,
      this.camera!.viewProjMat as Float32Array
    );
    gl.uniform4f(
      s.uniforms.uColor!,
      s.uColorValue[0],
      s.uColorValue[1],
      s.uColorValue[2],
      s.uColorValue[3]
    );
    gl.enableVertexAttribArray(s.attributes.aUV);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUVBuffer);
    gl.vertexAttribPointer(s.attributes.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[0]);
    gl.uniform1i(s.uniforms.uTexture0!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[1]);
    gl.uniform1i(s.uniforms.uTexture1!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[2]);
    gl.uniform1i(s.uniforms.uTexture2!, 2);
    gl.drawArrays(gl.POINTS, 0, this.particleDim * this.particleDim);
    gl.disableVertexAttribArray(s.attributes.aUV);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }

  private animate = (canvas: HTMLCanvasElement): void => {
    if (this.destroyed) return;
    this.animationId = requestAnimationFrame(() => this.animate(canvas));
    const gl = this.gl;
    if (!gl || !this.shaders || !this.camera || !this.cameraControls) return;

    const deltaT = this.clock.getDelta();
    if (
      this.paused ||
      document.hidden ||
      canvas.getBoundingClientRect().bottom < 0
    ) {
      return;
    }
    this.fixedTimeRemainder = Math.min(
      this.fixedTimeRemainder + deltaT,
      this.FIXED_TIME_STEP_MAX
    );
    while (this.fixedTimeRemainder >= this.FIXED_TIME_STEP) {
      this.simulate(gl, this.FIXED_TIME_STEP);
      this.fixedTimeRemainder -= this.FIXED_TIME_STEP;
    }

    this.cameraControls.update();
    this.camera.update();
    this.inputPos = this.camera.getPointOnTargetPlane(this.mouseX, this.mouseY);
    this.shaders.particleCompute.uInputPosValue[0] = this.inputPos[0];
    this.shaders.particleCompute.uInputPosValue[1] = this.inputPos[1];
    this.shaders.particleCompute.uInputPosValue[2] = this.inputPos[2];
    const centerPos = this.camera.getPointOnTargetPlane(
      0.58,
      canvas.offsetWidth < 760 ? 0.5 : 0.53
    );
    this.shaders.particleCompute.uCenterPosValue[0] = centerPos[0];
    this.shaders.particleCompute.uCenterPosValue[1] = centerPos[1];
    this.shaders.particleCompute.uCenterPosValue[2] = centerPos[2];
    this.draw(gl);
  };
}
