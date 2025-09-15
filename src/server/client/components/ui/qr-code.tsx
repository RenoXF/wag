import { useEffect, useRef } from "react";
import QrCode from "qrcode-generator";

interface QrCodeComponentProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeComponent({ value, size = 256, className = "" }: QrCodeComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      const qr = QrCode(0, 'M');
      qr.addData(value);
      qr.make();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const moduleCount = qr.getModuleCount();
      const cellSize = size / moduleCount;
      const margin = 0;

      canvas.width = size;
      canvas.height = size;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw QR code
      ctx.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              margin + col * cellSize,
              margin + row * cellSize,
              cellSize,
              cellSize
            );
          }
        }
      }
    }
  }, [value, size]);

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
