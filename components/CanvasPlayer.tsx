import React, { useRef, useEffect } from 'react';
import { RenderState, VisualObject } from '../types';

interface CanvasPlayerProps {
    width: number;
    height: number;
    renderState: RenderState;
}

const CanvasPlayer: React.FC<CanvasPlayerProps> = ({ width, height, renderState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Background (Canvas specific)
        ctx.fillStyle = '#0f172a'; // Slate-900 like
        ctx.fillRect(0, 0, width, height);

        // Render Objects
        renderState.objects.forEach(obj => {
            if (obj.opacity <= 0.01) return;

            ctx.globalAlpha = obj.opacity;
            ctx.fillStyle = obj.color;
            ctx.strokeStyle = obj.color;
            ctx.save();
            
            // Transforms
            // Translate to object position (Center of object)
            ctx.translate(obj.x, obj.y);
            ctx.scale(obj.scale, obj.scale);
            ctx.rotate(obj.rotation);

            if (obj.type === 'CIRCLE') {
                ctx.beginPath();
                ctx.arc(0, 0, obj.radius || 10, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.type === 'RECT') {
                const w = obj.width || 50;
                const h = obj.height || 50;
                ctx.fillRect(-w / 2, -h / 2, w, h);
            } else if (obj.type === 'TEXT') {
                ctx.font = `${obj.fontSize || 24}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = obj.color;
                ctx.fillText(obj.text || '', 0, 0);
            } else if (obj.type === 'LINE' || obj.type === 'ARROW') {
                const w = obj.width || 100;
                const h = obj.height || 4; // Thickness
                
                ctx.lineWidth = h;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(w / 2, 0);
                ctx.stroke();

                if (obj.type === 'ARROW') {
                    // Draw Arrowhead at the end (w/2, 0)
                    const headSize = h * 3;
                    ctx.beginPath();
                    ctx.moveTo(w / 2, 0);
                    ctx.lineTo(w / 2 - headSize, -headSize / 1.5);
                    ctx.lineTo(w / 2 - headSize, headSize / 1.5);
                    ctx.fill();
                }
            }

            ctx.restore();
            ctx.globalAlpha = 1;
        });

    }, [renderState, width, height]);

    return (
        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 bg-black">
             <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full h-auto block"
                style={{ maxHeight: '60vh', aspectRatio: `${width}/${height}` }}
            />
             <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono">
                {width}x{height}
            </div>
        </div>
       
    );
};

export default CanvasPlayer;