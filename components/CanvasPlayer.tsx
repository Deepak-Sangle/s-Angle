import React, { useRef, useEffect, useState, memo } from 'react';
import { RenderState, VisualObject } from '../types';

interface CanvasPlayerProps {
    width: number;
    height: number;
    renderState: RenderState;
}

// Memoized Math Component to prevent re-typesetting when only position changes
const MathObject = memo(({ obj }: { obj: VisualObject }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastLatexRef = useRef<string>(obj.latex || '');

    useEffect(() => {
        if (containerRef.current && (window as any).MathJax) {
            // Only typeset if latex actually changed or initial mount
            const el = containerRef.current;
            el.innerHTML = `\\( ${obj.latex} \\)`;
            (window as any).MathJax.typesetPromise([el]).catch((err: any) => console.log(err));
        }
    }, [obj.latex]);

    return (
        <div 
            ref={containerRef}
            style={{
                position: 'absolute',
                left: obj.x,
                top: obj.y,
                transform: `translate(-50%, -50%) scale(${obj.scale}) rotate(${obj.rotation}rad)`,
                color: obj.color,
                opacity: obj.opacity,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: '24px' // Base size
            }}
        />
    );
}, (prev, next) => {
    // Custom comparison for memo: return true if we DO NOT need to re-render.
    // However, since we are passing 'obj' which is a new object every frame,
    // we must allow re-renders for style updates (x, y, opacity).
    // BUT we want to avoid the useEffect (typeset) from firing.
    // The useEffect above depends on [obj.latex], so it handles itself efficiently.
    // So standard re-render is fine as long as we use inline styles for position.
    return (
        prev.obj.x === next.obj.x &&
        prev.obj.y === next.obj.y &&
        prev.obj.scale === next.obj.scale &&
        prev.obj.rotation === next.obj.rotation &&
        prev.obj.opacity === next.obj.opacity &&
        prev.obj.color === next.obj.color &&
        prev.obj.latex === next.obj.latex
    );
});

const CanvasPlayer: React.FC<CanvasPlayerProps> = ({ width, height, renderState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Filter objects
    const canvasObjects = renderState.objects.filter(o => o.type !== 'MATH');
    const mathObjects = renderState.objects.filter(o => o.type === 'MATH');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Render Canvas Objects
        canvasObjects.forEach(obj => {
            if (obj.opacity <= 0.01) return;

            ctx.globalAlpha = obj.opacity;
            ctx.fillStyle = obj.color;
            ctx.strokeStyle = obj.color;
            ctx.save();
            
            // Transforms
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
                const h = obj.height || 4; 
                
                ctx.lineWidth = h;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(w / 2, 0);
                ctx.stroke();

                if (obj.type === 'ARROW') {
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

    }, [canvasObjects, width, height]);

    return (
        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 bg-black" style={{ width: '100%', aspectRatio: `${width}/${height}` }}>
             <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="absolute top-0 left-0 w-full h-full block"
            />
            {/* DOM Overlay Layer for Math */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden origin-top-left">
                 <ResponsiveOverlay width={width} height={height}>
                     {mathObjects.map(obj => (
                         <MathObject key={obj.id} obj={obj} />
                     ))}
                 </ResponsiveOverlay>
            </div>
             
             {/* Hidden warning if MathJax isn't loaded yet */}
             {typeof (window as any).MathJax === 'undefined' && (
                 <div className="absolute bottom-2 right-2 text-xs text-yellow-500 bg-black/50 px-2 rounded">
                     Loading Math Engine...
                 </div>
             )}
        </div>
    );
};

// Helper to handle responsive scaling of the DOM layer
const ResponsiveOverlay = ({ width, height, children }: { width: number, height: number, children: React.ReactNode }) => {
    // We use a resize observer to calculate the scale factor needed to map 1920 -> currentWidth
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const currentWidth = entry.contentRect.width;
                setScale(currentWidth / width);
            }
        });
        
        observer.observe(el);
        return () => observer.disconnect();
    }, [width]);

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <div 
                style={{ 
                    width: width, 
                    height: height, 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {children}
            </div>
        </div>
    );
}

export default CanvasPlayer;