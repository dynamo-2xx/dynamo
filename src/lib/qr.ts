import QRCode from "qrcode";

/**
 * Generate a high-contrast QR code as a PNG data URL.
 * Uses error-correction level "H" so the code stays scannable even when
 * partially obscured (e.g. projected on a textured wall).
 */
export async function makeQrDataUrl(text: string, size = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: size,
    color: {
      dark: "#0a0a0a",
      light: "#ffffff",
    },
  });
}