/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

const addPropertyControls = () => {};

const RenderTarget = {
  current: () => "preview",
  hasRestrictions: () => false,
  canvas: "canvas",
  export: "export",
  preview: "preview",
  thumbnail: "thumbnail",
};

/**
 * LookAtMeGrid - Recreate the reference exactly. No description was given - read what it is and how it moves from the clip itself.
 *
 * Built on the Cursor template (lib/templates/CursorTemplate.tsx).
 * Only the EFFECT block and the effect controls are specific to this component.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useRef, type CSSProperties } from "react"

// ── moments-kit v1 ──
// Shared by every moments/ component. Canonical copy: moments/kit/moments-kit.v1.ts.
// Edit there, then paste verbatim into each component; moments/checks/kit-sync.mjs enforces it.

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (typeof input !== "string") return fallback
    let hit = COLOR_CACHE.get(input)
    if (hit === undefined) {
        hit = parseColorRaw(input)
        COLOR_CACHE.set(input, hit)
    }
    return hit ?? fallback
}

function parseColorRaw(raw: string): RGBA | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (a: string) => parseInt(a, 16)
        let r: number, g: number, b: number, a = 255
        if (h.length === 3 || h.length === 4) {
            r = x(h[0] + h[0]); g = x(h[1] + h[1]); b = x(h[2] + h[2])
            if (h.length === 4) a = x(h[3] + h[3])
        } else if (h.length === 6 || h.length === 8) {
            r = x(h.slice(0, 2)); g = x(h.slice(2, 4)); b = x(h.slice(4, 6))
            if (h.length === 8) a = x(h.slice(6, 8))
        } else return null
        const out: RGBA = [r / 255, g / 255, b / 255, a / 255]
        return out.every(Number.isFinite) ? out : null
    }
    const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
    if (!m) return null
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const num = (p: string, scale: number) =>
        p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p)
    const alpha = parts.length > 3 ? num(parts[3], 1) : 1
    let rgb: [number, number, number]
    if (m[1].toLowerCase().startsWith("rgb")) {
        rgb = [num(parts[0], 255) / 255, num(parts[1], 255) / 255, num(parts[2], 255) / 255]
    } else {
        const hh = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
        const ss = num(parts[1], 1), ll = num(parts[2], 1)
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
        const p = 2 * ll - q
        const f = (t: number) => {
            t = (t + 1) % 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        rgb = [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)]
    }
    const out: RGBA = [rgb[0], rgb[1], rgb[2], alpha]
    return out.every(Number.isFinite) ? out.map((c) => Math.min(1, Math.max(0, c))) as RGBA : null
}

function cssRgba(c: RGBA): string {
    return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`
}

interface FramerFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
    letterSpacing?: number | string
}

const FALLBACK_FAMILY = "Inter, system-ui, sans-serif"

function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => (n[0] === "'" || n[0] === '"' || /^[a-z-]+$/i.test(n) ? n : `"${n.replace(/"/g, '\\"')}"`))
        .join(", ")
}

function fontShorthand(font: FramerFont | undefined, fallbackSize: number, fallbackWeight: number) {
    const f = font || {}
    let size = fallbackSize
    if (typeof f.fontSize === "number" && Number.isFinite(f.fontSize)) size = f.fontSize
    else if (typeof f.fontSize === "string") {
        const n = parseFloat(f.fontSize)
        if (Number.isFinite(n)) size = f.fontSize.includes("rem") ? n * 16 : n
    }
    let lineHeight = size * 1.3
    if (typeof f.lineHeight === "number" && Number.isFinite(f.lineHeight))
        lineHeight = f.lineHeight <= 4 ? f.lineHeight * size : f.lineHeight
    else if (typeof f.lineHeight === "string") {
        const n = parseFloat(f.lineHeight)
        if (Number.isFinite(n))
            lineHeight = f.lineHeight.endsWith("%") ? (n / 100) * size : f.lineHeight.endsWith("em") ? n * size : n <= 4 ? n * size : n
    }
    const family = f.fontFamily ? quoteFamily(f.fontFamily) : FALLBACK_FAMILY
    const shorthand = `${f.fontStyle || "normal"} ${f.fontWeight || fallbackWeight} ${size}px ${family}`
    return { shorthand, size, lineHeight }
}

function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
    const out: string[] = []
    for (const para of String(text ?? "").split("\n")) {
        const words = para.split(/ +/)
        let line = ""
        for (const w of words) {
            const next = line ? `${line} ${w}` : w
            if (line && measure(next) > maxWidth) {
                out.push(line)
                line = w
            } else line = next
        }
        out.push(line)
    }
    return out
}

function radiusPx(w: number, h: number, pct: number): number {
    return (Math.min(w, h) / 2) * Math.min(1, Math.max(0, pct / 100))
}

type Phase = "idle" | "playing" | "held" | "restoring"
interface TriggerState { phase: Phase; t: number; timer: number; prevPlay: boolean | undefined }
interface TriggerInput {
    dt: number; animDt: number; playDur: number; restoreDur: number; holdS: number
    play: boolean | undefined; clicked: boolean; onCanvas: boolean
}
interface TriggerEvents { started: boolean; completed: boolean; restored: boolean }

const TRIGGER_IDLE: TriggerState = { phase: "idle", t: 0, timer: 0, prevPlay: undefined }
const CANVAS_IDLE_S = 1
// R3 ruling: compare with epsilon everywhere a float accumulator (dt/animDt
// summed frame by frame) is checked against a duration boundary - repeated
// 0.1 additions land on 0.9999999999999999, not 1, so a strict >= misses the
// transition for exactly one extra frame and the reducer's own tests (which
// assert phase after an exact frame count) go red on that alone.
const EPS = 1e-9

// I2 ruling: controlled mode (play !== undefined) reacts to the play LEVEL
// each step, not an edge against prevPlay - an uncontrolled run (play was
// undefined, so prevPlay never became true) that switches straight to
// play:false must still interrupt on that very frame. prevPlay stays on the
// state shape (set below every step) but is no longer read for a decision.
// I1 ruling: only the two *interrupt* transitions - playing→restoring and
// restoring→playing - mirror progress (t = 1 - s.t) so a controlled toggle
// keeps the visual position continuous. held→restoring and idle→playing are
// normal starts and still begin at t = 0.
function stepTrigger(s: TriggerState, i: TriggerInput): { s: TriggerState; e: TriggerEvents } {
    const e: TriggerEvents = { started: false, completed: false, restored: false }
    const n: TriggerState = { ...s, prevPlay: i.play }
    const controlled = i.play !== undefined
    const start = (t = 0) => { n.phase = "playing"; n.t = t; n.timer = 0; e.started = true }
    const restore = (t = 0) => { n.phase = "restoring"; n.t = t; n.timer = 0 }

    switch (s.phase) {
        case "idle":
            n.timer = s.timer + i.dt
            if (controlled ? i.play === true : i.clicked || (i.onCanvas && n.timer >= CANVAS_IDLE_S - EPS)) start()
            break
        case "playing":
            if (controlled && i.play === false) { restore(1 - s.t); break }
            n.t = Math.min(1, s.t + i.animDt / Math.max(1e-3, i.playDur))
            if (n.t >= 1 - EPS) { n.t = 1; n.phase = "held"; n.timer = 0; e.completed = true }
            break
        case "held":
            if (controlled) { if (i.play === false) restore(0); break }
            n.timer = s.timer + i.dt
            if (n.timer >= i.holdS - EPS) restore(0)
            break
        case "restoring":
            if (controlled && i.play === true) { start(1 - s.t); break }
            n.t = Math.min(1, s.t + i.animDt / Math.max(1e-3, i.restoreDur))
            if (n.t >= 1 - EPS) { n.phase = "idle"; n.t = 0; n.timer = 0; e.restored = true }
            break
    }
    return { s: n, e }
}

interface CardSpec {
    w: number; h: number; dpr: number; fill: string; rounded: number
    title: string; body: string; font: FramerFont | undefined; textColor: string
    image: HTMLImageElement | null; pad: number
}
interface GlyphBox { ch: string; x: number; y: number; w: number; h: number }

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

/** Paints the card into ctx (canvas already sized w*dpr × h*dpr). Returns glyph boxes in CSS px when asked. */
function drawCard(ctx: CanvasRenderingContext2D, spec: CardSpec, wantGlyphs: boolean): GlyphBox[] {
    const { w, h, dpr, pad } = spec
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const r = radiusPx(w, h, spec.rounded)
    roundRectPath(ctx, 0, 0, w, h, r)
    ctx.fillStyle = cssRgba(parseColor(spec.fill, [1, 1, 1, 1]))
    ctx.fill()
    ctx.save()
    roundRectPath(ctx, 0, 0, w, h, r)
    ctx.clip()
    let y = pad
    if (spec.image && spec.image.naturalWidth > 0) {
        const ih = Math.round(h * 0.5)
        const s = Math.max(w / spec.image.naturalWidth, ih / spec.image.naturalHeight)
        const dw = spec.image.naturalWidth * s, dh = spec.image.naturalHeight * s
        ctx.save()
        ctx.beginPath(); ctx.rect(0, 0, w, ih); ctx.clip()
        ctx.drawImage(spec.image, (w - dw) / 2, (ih - dh) / 2, dw, dh)
        ctx.restore()
        y = ih + pad
    }
    const glyphs: GlyphBox[] = []
    const color = cssRgba(parseColor(spec.textColor, [0, 0, 0, 1]))
    const title = fontShorthand(spec.font, 22, 700)
    const body = fontShorthand(spec.font ? { ...spec.font, fontSize: title.size * 0.68, fontWeight: 400 } : undefined, 15, 400)
    const block = (text: string, f: { shorthand: string; size: number; lineHeight: number }) => {
        if (!text) return
        ctx.font = f.shorthand
        ctx.fillStyle = color
        ctx.textBaseline = "top"
        ctx.textAlign = "left"
        for (const line of wrapLines((s) => ctx.measureText(s).width, text, w - pad * 2)) {
            if (y + f.size > h - pad * 0.5) break
            ctx.fillText(line, pad, y)
            if (wantGlyphs) {
                // Prefix measures, so kerning between neighbours is respected.
                let prefix = ""
                for (const ch of line) {
                    const x = pad + ctx.measureText(prefix).width
                    const cw = pad + ctx.measureText(prefix + ch).width - x
                    if (ch.trim()) glyphs.push({ ch, x, y, w: cw, h: f.lineHeight })
                    prefix += ch
                }
            }
            y += f.lineHeight
        }
        y += f.size * 0.4
    }
    block(spec.title, title)
    block(spec.body, body)
    ctx.restore()
    return glyphs
}

function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        if (!src || typeof Image === "undefined") return resolve(null)
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
    })
}

function createProgram<U extends string>(gl: WebGL2RenderingContext, vs: string, fs: string, uniforms: readonly U[]) {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(s) || "shader compile failed"
            gl.deleteShader(s)
            throw new Error(log)
        }
        return s
    }
    const program = gl.createProgram()!
    const vsh = sh(gl.VERTEX_SHADER, vs)
    const fsh = sh(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(program, vsh)
    gl.attachShader(program, fsh)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program) || "link failed"
        gl.deleteShader(vsh)
        gl.deleteShader(fsh)
        gl.deleteProgram(program)
        throw new Error(log)
    }
    // Shaders are flagged for deletion once linked; the GL driver frees them
    // for real after they're detached, which happens when the program itself
    // is eventually deleted. No reason to keep the compile units around.
    gl.deleteShader(vsh)
    gl.deleteShader(fsh)
    const u = {} as Record<U, WebGLUniformLocation>
    for (const name of uniforms) {
        const loc = gl.getUniformLocation(program, name)
        if (!loc) {
            gl.deleteProgram(program)
            throw new Error(`uniform ${name} not found`)
        }
        u[name] = loc
    }
    return { program, u }
}
// ── /moments-kit ──

// ══ EFFECT - replace from here ══════════════════════════════════════════════

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    spacingX: 50,
    spacingY: 50,
    coreShare: 30,
    litShare: 50,
    midShare: 73,
    edgeShare: 93,
    farShare: 115,
    push: 55,
    pushReach: 70,
    pressBoost: 60,
    lag: 100,
    dotSize: 46,
    dotGap: 3,
    ringWidth: 2,
    cursorOpacity: 100,
    pathWidth: 100,
    pathHeight: 100,
    hover: 50,
    grain: 0,
    vignette: 0,
}

/** Every colour the effect draws, in one group: from the cursor outward. */
const COLORS_DEFAULTS = {
    cursor: "#FAFCFB",
    center: "#2A44CC",
    bright: "#FFFFFF",
    innerHalo: "#0E1E60",
    outerHalo: "#02112F",
    far: "#07120D",
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
type CursorStyle = "ring" | "dot" | "outline" | "crosshair" | "glow" | "native" | "none"

interface EffectProps {
    glyph?: string
    font?: FramerFont
    radius?: number
    cursorStyle?: CursorStyle
    colors?: Partial<typeof COLORS_DEFAULTS>
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Effect {
    ang: Float32Array
    init: boolean
    live: number
    press: number
    reduced: boolean
    grain: HTMLCanvasElement | null
    grainPattern: CanvasPattern | null
}

type V2 = [number, number]
interface Seg {
    t0: number
    t1: number
    a: V2
    c?: V2
    b: V2
    e: [number, number, number, number]
}

// Measured cursor strokes (fractions of the frame), 0.8 s each with ~0.2 s rests;
// the fifth stroke returns to the start so the 5 s cycle loops.
const CYCLE_S = 5
const PATH: Seg[] = [
    { t0: 0.07, t1: 0.87, a: [0.75, 0.54], b: [0.35, 0.66], e: [0.48, 0.18, 0.55, 0.8] },
    { t0: 1.07, t1: 1.87, a: [0.35, 0.66], c: [0.24, 0.52], b: [0.18, 0.28], e: [0.68, 0.28, 0.4, 0.78] },
    { t0: 2.07, t1: 2.87, a: [0.18, 0.28], b: [0.61, 0.23], e: [0.75, 0.15, 0.3, 1] },
    { t0: 3.07, t1: 3.93, a: [0.61, 0.23], b: [0.52, 0.76], e: [0.63, 0, 0.4, 1] },
    { t0: 4.13, t1: 4.93, a: [0.52, 0.76], b: [0.75, 0.54], e: [0.6, 0.1, 0.4, 0.9] },
]

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

/** CSS cubic-bezier(x1, y1, x2, y2) evaluated at progress x (bisection on x(t)). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const bz = (p1: number, p2: number, t: number) => {
        const it = 1 - t
        return 3 * it * it * t * p1 + 3 * it * t * t * p2 + t * t * t
    }
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 24; i++) {
        t = (lo + hi) / 2
        if (bz(x1, x2, t) < x) lo = t
        else hi = t
    }
    return bz(y1, y2, t)
}

function pathAt(tau: number): V2 {
    let pos: V2 = PATH[PATH.length - 1].b
    for (const seg of PATH) {
        if (tau < seg.t0) break
        if (tau < seg.t1) {
            const u = cubicBezier(seg.e[0], seg.e[1], seg.e[2], seg.e[3], (tau - seg.t0) / (seg.t1 - seg.t0))
            if (seg.c) {
                const iu = 1 - u
                return [
                    iu * iu * seg.a[0] + 2 * iu * u * seg.c[0] + u * u * seg.b[0],
                    iu * iu * seg.a[1] + 2 * iu * u * seg.c[1] + u * u * seg.b[1],
                ]
            }
            return [seg.a[0] + (seg.b[0] - seg.a[0]) * u, seg.a[1] + (seg.b[1] - seg.a[1]) * u]
        }
        pos = seg.b
    }
    return pos
}

function bakeEffect(_stage: Stage, _p: Props): Effect {
    let reduced = false
    try {
        reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    } catch {
        reduced = false
    }
    let grain: HTMLCanvasElement | null = null
    if (typeof document !== "undefined") {
        grain = document.createElement("canvas")
        grain.width = 160
        grain.height = 160
        const g = grain.getContext("2d")
        if (g) {
            const img = g.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            g.putImageData(img, 0, 0)
        }
    }
    return { ang: new Float32Array(0), init: false, live: 0, press: 0, reduced, grain, grainPattern: null }
}

/** A fixed grid of glyphs, each turning its apex toward the cursor, lit blue near it and pushed out around it. */
function drawEffect(stage: Stage, fx: Effect, p: Props, ptr: Pointer, clock: number, dt: number): void {
    const { ctx, W, H, dpr } = stage
    if (W < 2 || H < 2) return
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const h = Math.max(0, Math.min(2, num(adv.hover, 50) / 50))
    const sizePx = Math.max(2, Math.min(200, num(p.size, 26)))
    const s = sizePx / 26

    // Cursor: the measured demo path, blended toward the live pointer.
    const tau = fx.reduced ? 0 : ((clock % CYCLE_S) + CYCLE_S) % CYCLE_S
    const [ux, uy] = pathAt(tau)
    const demoX = W / 2 + (ux - 0.5) * W * (num(adv.pathWidth, 100) / 100)
    const demoY = H / 2 + (uy - 0.5) * H * (num(adv.pathHeight, 100) / 100)
    const manual = p.autoPlay === false
    const liveWant = ptr.demo ? 0 : manual ? 1 : Math.min(1, h)
    fx.live += (liveWant - fx.live) * (1 - Math.exp(-dt * 5))
    const cx = demoX + (ptr.x - demoX) * fx.live
    const cy = demoY + (ptr.y - demoY) * fx.live
    fx.press += ((ptr.down && !ptr.demo ? 1 : 0) - fx.press) * (1 - Math.exp(-dt * 10))
    const pr = fx.press * h

    // Grid.
    const sx = Math.max(8, num(adv.spacingX, 41) * s)
    const sy = Math.max(8, num(adv.spacingY, 46) * s)
    const cols = Math.ceil(W / sx) + 1
    const rows = Math.ceil(H / sy) + 1
    if (fx.ang.length !== cols * rows) {
        fx.ang = new Float32Array(cols * rows)
        fx.init = false
    }
    const x0 = (W - (cols - 1) * sx) / 2
    const y0 = (H - (rows - 1) * sy) / 2

    // Colour ramp by distance, as fractions of the halo radius.
    const R = Math.max(20, num(p.radius, 230)) * (1 + 0.15 * pr)
    const stopT = [adv.coreShare, adv.litShare, adv.midShare, adv.edgeShare, adv.farShare].map((v) => num(v, 50) / 100)
    const pal = { ...COLORS_DEFAULTS, ...(p.colors ?? {}) }
    const stopC = [
        parseColor(pal.center, [0.16, 0.27, 0.8, 1]),
        parseColor(pal.bright, [1, 1, 1, 1]),
        parseColor(pal.innerHalo, [0.05, 0.12, 0.38, 1]),
        parseColor(pal.outerHalo, [0.01, 0.07, 0.18, 1]),
        parseColor(pal.far, [0.03, 0.07, 0.05, 1]),
    ]
    const ramp = (t: number): string => {
        let c = stopC[stopC.length - 1]
        if (t <= stopT[0]) c = stopC[0]
        else {
            for (let i = 1; i < stopT.length; i++) {
                if (t <= stopT[i]) {
                    const f = clamp01((t - stopT[i - 1]) / Math.max(1e-4, stopT[i] - stopT[i - 1]))
                    const a = stopC[i - 1]
                    const b = stopC[i]
                    return `rgb(${Math.round((a[0] + (b[0] - a[0]) * f) * 255)},${Math.round((a[1] + (b[1] - a[1]) * f) * 255)},${Math.round((a[2] + (b[2] - a[2]) * f) * 255)})`
                }
            }
        }
        return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`
    }

    const push = num(adv.push, 55) * s * (1 + (num(adv.pressBoost, 60) / 100) * pr)
    const reach = Math.max(1, num(adv.pushReach, 70) * s)
    const k = fx.reduced || !fx.init ? 1 : 1 - Math.exp((-dt * 1000) / Math.max(1, num(adv.lag, 100)))
    const raw = typeof p.glyph === "string" && p.glyph.trim() ? p.glyph.trim() : "A"
    const glyph = Array.from(raw).slice(0, 2).join("")
    const f = fontShorthand({ ...(p.font || {}), fontSize: sizePx }, sizePx, 500)
    ctx.font = f.shorthand
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"
    const capOff = f.size * 0.36

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c
            const gx = x0 + c * sx
            const gy = y0 + r * sy
            let dx = cx - gx
            let dy = cy - gy
            let d = Math.hypot(dx, dy)
            if (d < 1e-3) {
                dx = 0
                dy = -1
                d = 1e-3
            }
            const nx = dx / d
            const ny = dy / d
            const off = push * Math.exp(-(d / reach) * (d / reach))
            const px = gx - nx * off
            const py = gy - ny * off
            const target = Math.atan2(ny, nx) + Math.PI / 2
            let a = fx.ang[i]
            let diff = target - a
            diff = Math.atan2(Math.sin(diff), Math.cos(diff))
            a += diff * k
            fx.ang[i] = a
            const co = Math.cos(a)
            const si = Math.sin(a)
            ctx.setTransform(dpr * co, dpr * si, -dpr * si, dpr * co, dpr * px, dpr * py)
            ctx.fillStyle = ramp((d + off) / R)
            ctx.fillText(glyph, 0, capOff)
        }
    }
    fx.init = true
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Cursor, in the chosen style. "ring" is the reference: white disc, dark gap, thin white ring.
    const cursorStyle: CursorStyle = typeof p.cursorStyle === "string" ? p.cursorStyle : "ring"
    const cc = parseColor(pal.cursor, [0.98, 0.99, 0.98, 1])
    const col = cssRgba(cc)
    const dotR = (num(adv.dotSize, 46) / 2) * s
    const rw = Math.max(0.5, num(adv.ringWidth, 2) * s)
    const grow = 1 + 0.25 * pr
    // With auto play off the drawn cursor shows only while the pointer is over the component.
    const opacity = clamp01(num(adv.cursorOpacity, 100) / 100) * (manual ? clamp01(ptr.present) : 1)
    ctx.globalAlpha = opacity
    ctx.fillStyle = col
    ctx.strokeStyle = col
    ctx.lineWidth = rw
    ctx.lineCap = "round"
    if (cursorStyle === "ring") {
        const ringR = (dotR + num(adv.dotGap, 3) * s + rw / 2) * grow
        ctx.beginPath()
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.stroke()
    } else if (cursorStyle === "dot") {
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2, dotR * 0.3) * grow, 0, Math.PI * 2)
        ctx.fill()
    } else if (cursorStyle === "outline") {
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2, dotR) * grow, 0, Math.PI * 2)
        ctx.stroke()
    } else if (cursorStyle === "crosshair") {
        const L = Math.max(6, dotR) * grow
        const gap = L * 0.3
        ctx.beginPath()
        ctx.moveTo(cx - L, cy); ctx.lineTo(cx - gap, cy)
        ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + L, cy)
        ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy - gap)
        ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + L)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(1, rw), 0, Math.PI * 2)
        ctx.fill()
    } else if (cursorStyle === "glow") {
        const gr = Math.max(4, dotR * 2) * grow
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr)
        g.addColorStop(0, cssRgba([cc[0], cc[1], cc[2], cc[3]]))
        g.addColorStop(0.35, cssRgba([cc[0], cc[1], cc[2], cc[3] * 0.45]))
        g.addColorStop(1, cssRgba([cc[0], cc[1], cc[2], 0]))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, gr, 0, Math.PI * 2)
        ctx.fill()
    } else if (cursorStyle === "native") {
        // The system arrow shows for a live pointer; the demo draws a stand-in arrow so the path still reads.
        const a = opacity * (1 - fx.live)
        if (a > 0.01) {
            const k2 = 1.1 * s
            ctx.globalAlpha = a
            ctx.setTransform(dpr * k2, 0, 0, dpr * k2, dpr * cx, dpr * cy)
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(0, 17)
            ctx.lineTo(4.5, 13)
            ctx.lineTo(7.5, 20)
            ctx.lineTo(10, 19)
            ctx.lineTo(7, 12)
            ctx.lineTo(13, 12)
            ctx.closePath()
            ctx.fillStyle = col
            ctx.fill()
            ctx.lineWidth = 1
            ctx.lineJoin = "round"
            ctx.strokeStyle = "rgba(0,0,0,0.85)"
            ctx.stroke()
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
    }
    ctx.globalAlpha = 1

    // Overlays.
    const vig = clamp01(num(adv.vignette, 0) / 100)
    if (vig > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6)
        g.addColorStop(0, "rgba(0,0,0,0)")
        g.addColorStop(1, `rgba(0,0,0,${0.85 * vig})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
    }
    const grain = clamp01(num(adv.grain, 0) / 100)
    if (grain > 0 && fx.grain) {
        if (!fx.grainPattern) fx.grainPattern = ctx.createPattern(fx.grain, "repeat")
        if (fx.grainPattern) {
            const ox = Math.floor(Math.random() * 160)
            const oy = Math.floor(Math.random() * 160)
            ctx.globalAlpha = 0.18 * grain
            ctx.translate(ox, oy)
            ctx.fillStyle = fx.grainPattern
            ctx.fillRect(-ox, -oy, W, H)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
        }
    }
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    color?: string
    size?: number
    speed?: number
    autoPlay?: boolean
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
}
interface Pointer {
    x: number
    y: number
    tx: number
    ty: number
    vx: number
    vy: number
    down: boolean
    present: number
    demo: boolean
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const DEMO_AFTER_S = 2

export default function LookAtMeGrid(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", size = 26, speed = 50, autoPlay = true, cursorStyle = "native", style } = props
    void [size, speed, autoPlay]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const stage: Stage = { ctx, W: 0, H: 0, dpr: 1 }
        const resize = () => {
            stage.W = root.offsetWidth
            stage.H = root.offsetHeight
            stage.dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(stage.W * stage.dpr))
            canvas.height = Math.max(1, Math.round(stage.H * stage.dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const ptr: Pointer = { x: stage.W / 2, y: stage.H / 2, tx: stage.W / 2, ty: stage.H / 2, vx: 0, vy: 0, down: false, present: 0, demo: true }
        let inside = false
        let idle = DEMO_AFTER_S
        const onMove = (e: PointerEvent) => {
            if (!inside) {
                ptr.x = e.offsetX
                ptr.y = e.offsetY
            }
            inside = true
            idle = 0
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
        }
        const onLeave = () => {
            inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let fx: Effect | null = null
        let key = ""
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const effectKeys = Object.keys(p).filter((n) => !["style", "background", "color", "colors", "size", "speed", "animation"].includes(n))
            const next = JSON.stringify([stage.W, stage.H, stage.dpr, effectKeys.map((n) => (p as Record<string, unknown>)[n])])
            if (next !== key || !fx) {
                key = next
                fx = bakeEffect(stage, p)
            }
            const rate = Math.max(0, Math.min(100, num(p.speed, 50))) / 50
            const autoPlay = p.autoPlay !== false
            if (autoPlay) clock += dt * rate
            idle += dt
            ptr.demo = autoPlay && (onCanvas || (!inside && idle > DEMO_AFTER_S))
            if (ptr.demo) {
                ptr.tx = stage.W / 2 + Math.sin(clock * 0.9) * stage.W * 0.3
                ptr.ty = stage.H / 2 + Math.sin(clock * 1.3 + 1) * stage.H * 0.25
            }
            const px = ptr.x
            const py = ptr.y
            const k = 1 - Math.exp(-dt * (8 + 24 * rate))
            ptr.x += (ptr.tx - ptr.x) * k
            ptr.y += (ptr.ty - ptr.y) * k
            if (dt > 0) {
                ptr.vx = (ptr.x - px) / dt
                ptr.vy = (ptr.y - py) / dt
            }
            const want = inside || ptr.demo ? 1 : 0
            ptr.present += (want - ptr.present) * (1 - Math.exp(-dt * 6))
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            drawEffect(stage, fx, p, ptr, clock, dt * rate)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: cursorStyle === "native" ? "default" : "none" }} />
        </div>
    )
}

