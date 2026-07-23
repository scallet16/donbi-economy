"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = { eraser: boolean; points: Point[] };

export function WritingCanvas({ completed, onComplete }: { completed: boolean; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [eraser, setEraser] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#fffdf5";
    context.fillRect(0, 0, rect.width, rect.height);
    context.fillStyle = "#d7d6ce";
    context.font = `700 ${Math.min(190, rect.width * 0.38)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("돈", rect.width / 2, rect.height / 2);
    for (const stroke of strokes.current) {
      if (stroke.points.length < 2) continue;
      context.beginPath();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = stroke.eraser ? 28 : 9;
      context.strokeStyle = stroke.eraser ? "#fffdf5" : "#174d35";
      stroke.points.forEach((point, index) => index ? context.lineTo(point.x * rect.width, point.y * rect.height) : context.moveTo(point.x * rect.width, point.y * rect.height));
      context.stroke();
    }
  }, []);

  useEffect(() => { draw(); window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [draw]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); current.current = { eraser, points: [point(event)] }; strokes.current.push(current.current); };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!current.current) return; event.preventDefault(); current.current.points.push(point(event)); draw(); };
  const stop = () => { current.current = null; };
  const clear = () => { strokes.current = []; draw(); };
  const undo = () => { strokes.current.pop(); draw(); };

  return <section className="panel writing-panel" aria-labelledby="writing-title">
    <span className="eyebrow">4단계 · 써 보기</span>
    <h2 id="writing-title">연한 글씨를 따라 ‘돈’을 써 보세요</h2>
    <p>마우스, 손가락, 스타일러스로 쓸 수 있어요. 글씨 모양은 점수로 판단하지 않아요.</p>
    <canvas ref={canvasRef} className="writing-canvas" aria-label="돈 글자를 따라 쓰는 영역" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />
    <div className="button-row">
      <button className="secondary" aria-pressed={eraser} onClick={() => setEraser(!eraser)}>{eraser ? "✎ 연필 쓰기" : "⌫ 지우개"}</button>
      <button className="secondary" onClick={undo}>↶ 한 획 지우기</button>
      <button className="secondary" onClick={clear}>↻ 전체 지우기</button>
      <button className="primary" onClick={onComplete}>✓ {completed ? "완성했어요" : "쓰기 완성"}</button>
    </div>
  </section>;
}
