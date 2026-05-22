import React, { useEffect, useRef } from 'react';

interface Props {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

const MiniChart: React.FC<Props> = ({ data, color, width = 290, height = 32 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...data, 1);
    const min = 0;
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const margin = 4;

    const points = data.map((v, i) => ({
      x: i * stepX,
      y: height - margin - ((v - min) / range) * (height - margin * 2),
    }));

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}44`);
    gradient.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, cpX, (points[i - 1].y + points[i].y) / 2);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color, width, height]);

  return <canvas ref={canvasRef} className="mini-chart" style={{ width, height }} />;
};

export default MiniChart;
