// QR code render-able + tombol download PNG.
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrImage({ value, size = 256 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1, errorCorrectionLevel: "M" }).catch(() => {});
  }, [value, size]);
  return <canvas ref={canvasRef} className="rounded-md bg-white" />;
}

export function downloadQrPng(value: string, filename: string, size = 512) {
  QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: "M" }).then((url) => {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  });
}
