// src/utils/fingerprint.ts

export interface DeviceFingerprint {
  deviceHash: string;
  canvasHash: string;
  webglRenderer: string;
  isAutomation: boolean;
}

let cachedFingerprint: DeviceFingerprint | null = null;

// 1. Generate Canvas Signature
export function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no_canvas";

    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("NCTONs,⚡#1!", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("NCTONs,⚡#1!", 4, 17);

    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  } catch (e) {
    return "canvas_error";
  }
}

// 2. Extract GPU Details
export function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as any);
    if (!gl) return { vendor: "unknown", renderer: "unknown" };

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return { vendor: "unknown", renderer: "unknown" };

    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown",
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown",
    };
  } catch (e) {
    return { vendor: "error", renderer: "error" };
  }
}

// 3. Automation Detection (Puppeteer, Selenium, Headless Chrome)
export function checkAutomation(): boolean {
  try {
    const nav = navigator as any;
    return Boolean(
      nav.webdriver ||
      window.document.documentElement.getAttribute("webdriver") ||
      (nav.__proto__ && Object.prototype.hasOwnProperty.call(nav.__proto__, "webdriver")) ||
      (window as any)._phantom ||
      (window as any).__nightmare ||
      (nav.plugins && nav.plugins.length === 0 && !/mobile/i.test(nav.userAgent))
    );
  } catch (_) {
    return false;
  }
}

// 4. Compute Unified SHA-256 Device Hash
export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  if (cachedFingerprint) return cachedFingerprint;

  const canvasHash = getCanvasHash();
  const { vendor, renderer } = getWebGLInfo();
  const isAutomation = checkAutomation();

  const components = [
    canvasHash,
    vendor,
    renderer,
    (typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0x0'),
    (typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || "0") : "0"),
    (typeof navigator !== 'undefined' ? (navigator.language || "") : ""),
    new Date().getTimezoneOffset().toString(),
  ].join("###");

  let deviceHash = "";
  try {
    const msgBuffer = new TextEncoder().encode(components);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    deviceHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    let simpleHash = 0;
    for (let i = 0; i < components.length; i++) {
      simpleHash = (simpleHash << 5) - simpleHash + components.charCodeAt(i);
      simpleHash |= 0;
    }
    deviceHash = Math.abs(simpleHash).toString(16).padStart(16, "0");
  }

  cachedFingerprint = {
    deviceHash,
    canvasHash,
    webglRenderer: `${vendor} ~ ${renderer}`,
    isAutomation,
  };

  try {
    sessionStorage.setItem("nc_device_hash", deviceHash);
    sessionStorage.setItem("nc_canvas_hash", canvasHash);
    sessionStorage.setItem("nc_webgl_renderer", cachedFingerprint.webglRenderer);
    sessionStorage.setItem("nc_is_automation", String(isAutomation));
  } catch (_) {}

  return cachedFingerprint;
}

export function getCachedFingerprint(): DeviceFingerprint | null {
  if (cachedFingerprint) return cachedFingerprint;
  try {
    const deviceHash = sessionStorage.getItem("nc_device_hash");
    if (deviceHash) {
      cachedFingerprint = {
        deviceHash,
        canvasHash: sessionStorage.getItem("nc_canvas_hash") || "unknown",
        webglRenderer: sessionStorage.getItem("nc_webgl_renderer") || "unknown",
        isAutomation: sessionStorage.getItem("nc_is_automation") === "true",
      };
      return cachedFingerprint;
    }
  } catch (_) {}
  return null;
}
