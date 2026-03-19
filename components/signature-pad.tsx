"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#10315a";

    if (value) {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = value;
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { x, y } = pointerPosition(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { x, y } = pointerPosition(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function finishDrawing() {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    setIsDrawing(false);
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="rounded-[24px] border border-[var(--brand-border)] bg-white p-4">
      <canvas
        ref={canvasRef}
        width={640}
        height={220}
        className="w-full rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)] touch-none"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-semibold text-[var(--brand-navy)]"
        >
          Clear signature
        </button>
      </div>
    </div>
  );
}
