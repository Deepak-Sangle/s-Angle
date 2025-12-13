import React, { useRef, useEffect, useState, memo } from 'react';
import { RenderState, VisualObject, ColorProp } from '../types';

interface CanvasPlayerProps {
    width: number;
    height: number;
    renderState: RenderState;
}

// Helper to resolve string or Gradient object into Canvas fillStyle
const resolveColor = (
    ctx: CanvasRenderingContext2D, 
    color: ColorProp, 
    width: number, 
    height: number
): string | CanvasGradient => {
    if (typeof color === 'string') return color;
    
    if (color.type === 'linear') {
        // Coords are 0-1 relative to the object box
        const x1 = color.x1 * width;
        const y1 = color.y1 * height;
        const x2 = color.x2 * width;
        const y2 = color.y2 * height;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        color.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
        return grad;
    } 
    
    if (color.type === 'radial') {
        const x1 = color.x1 * width;
        const y1 = color.y1 * height;
        const r1 = color.r1 * (Math.max(width, height) / 2); // Approximate radius relative to size
        const x2 = color.x2 * width;
        const y2 = color.y2 * height;
        const r2 = color.r2 * (Math.max(width, height) / 2);
        const grad = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
        color.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
        return grad;
    }

    return 'black';
};

// Helper for Rounded Rectangles
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Memoized Math Component to prevent re-typesetting when only position changes
const MathObject = memo(({ obj }: { obj: VisualObject }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastLatexRef = useRef<string>(obj.latex || '');
    
    // Default anchor to center if not present
    const anchor = obj.anchor || { x: 0.5, y: 0.5 };

    useEffect(() => {
        if (containerRef.current && (window as any).MathJax) {
            // Only typeset if latex actually changed or initial mount
            const el = containerRef.current;
            el.innerHTML = `\\( ${obj.latex} \\)`;
            (window as any).MathJax.typesetPromise([el]).catch((err: any) => console.log(err));
        }
    }, [obj.latex]);

    // Handle Background Color for Math
    // Note: Gradients on DOM backgrounds work via CSS syntax, but our Gradient object is data.
    // For simplicity, we only support string colors for DOM background/borders in this iteration
    // or we construct a basic CSS gradient string.
    
    let backgroundStyle = 'transparent';
    if (typeof obj.backgroundColor === 'string') {
        backgroundStyle = obj.backgroundColor;
    } else if (obj.backgroundColor && obj.backgroundColor.type === 'linear') {
        // Basic CSS translation
        const g = obj.backgroundColor;
        const stops = g.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
        // Approximating angle? x1,y1 to x2,y2 is hard to map exactly to deg without math, let's default to to bottom
        backgroundStyle = `linear-gradient(to bottom, ${stops})`; 
    }

    return (
        <div 
            ref={containerRef}
            style={{
                position: 'absolute',
                left: obj.x,
                top: obj.y,
                transformOrigin: `${anchor.x * 100}% ${anchor.y * 100}%`,
                transform: `translate(${-anchor.x * 100}%, ${-anchor.y * 100}%) scale(${obj.scale}) rotate(${obj.rotation}rad)`,
                color: typeof obj.color === 'string' ? obj.color : 'white', // Text color must be string
                opacity: obj.opacity,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: '24px',
                // Styling
                background: backgroundStyle,
                border: obj.borderWidth ? `${obj.borderWidth}px solid ${obj.borderColor}` : 'none',
                borderRadius: obj.borderRadius ? `${obj.borderRadius}px` : '0px',
                padding: obj.backgroundColor || obj.borderWidth ? '4px 8px' : '0', // Add padding if styled box
                
                // Handle Glow using Drop Shadow Filter for proper outline
                filter: obj.shadowBlur > 0 ? `drop-shadow(0 0 ${obj.shadowBlur}px ${obj.shadowColor})` : 'none'
            }}
        />
    );
}, (prev, next) => {
    return (
        prev.obj.x === next.obj.x &&
        prev.obj.y === next.obj.y &&
        prev.obj.scale === next.obj.scale &&
        prev.obj.rotation === next.obj.rotation &&
        prev.obj.opacity === next.obj.opacity &&
        prev.obj.color === next.obj.color &&
        prev.obj.latex === next.obj.latex &&
        prev.obj.anchor?.x === next.obj.anchor?.x &&
        prev.obj.anchor?.y === next.obj.anchor?.y &&
        prev.obj.shadowBlur === next.obj.shadowBlur &&
        prev.obj.shadowColor === next.obj.shadowColor &&
        // Styling props
        prev.obj.backgroundColor === next.obj.backgroundColor &&
        prev.obj.borderColor === next.obj.borderColor &&
        prev.obj.borderWidth === next.obj.borderWidth &&
        prev.obj.borderRadius === next.obj.borderRadius
    );
});

const CanvasPlayer: React.FC<CanvasPlayerProps> = ({ width, height, renderState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [, setForceUpdate] = useState(0);

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
            
            // Note: color handles Fill. borderColor handles Stroke.
            // For Text, we might need special handling.
            
            ctx.save();
            
            // Transforms
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.rotation);
            ctx.scale(obj.scale, obj.scale);

            // Glow / Shadow Configuration
            if (obj.shadowBlur > 0) {
                ctx.shadowBlur = obj.shadowBlur;
                ctx.shadowColor = obj.shadowColor;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            }

            // Anchor Handling
            const anchor = obj.anchor || { x: 0.5, y: 0.5 };
            
            if (obj.type === 'CIRCLE') {
                const r = obj.radius || 10;
                const ox = (0.5 - anchor.x) * 2 * r;
                const oy = (0.5 - anchor.y) * 2 * r;
                
                ctx.beginPath();
                ctx.arc(ox, oy, r, 0, Math.PI * 2);
                
                // Fill
                ctx.fillStyle = resolveColor(ctx, obj.color, r*2, r*2); // width/height is 2r
                ctx.fill();

                // Border
                if (obj.borderWidth && obj.borderWidth > 0 && obj.borderColor) {
                    ctx.lineWidth = obj.borderWidth;
                    ctx.strokeStyle = obj.borderColor;
                    ctx.stroke();
                }

            } else if (obj.type === 'RECT') {
                const w = obj.width || 50;
                const h = obj.height || 50;
                const x = -w * anchor.x;
                const y = -h * anchor.y;

                if (obj.borderRadius && obj.borderRadius > 0) {
                    roundRect(ctx, x, y, w, h, obj.borderRadius);
                } else {
                    ctx.beginPath();
                    ctx.rect(x, y, w, h);
                }

                ctx.fillStyle = resolveColor(ctx, obj.color, w, h);
                ctx.fill();

                if (obj.borderWidth && obj.borderWidth > 0 && obj.borderColor) {
                    ctx.lineWidth = obj.borderWidth;
                    ctx.strokeStyle = obj.borderColor;
                    ctx.stroke();
                }

            } else if (obj.type === 'TEXT') {
                const style = obj.fontStyle || 'normal';
                const weight = obj.fontWeight || 400; // Default to normal weight
                const size = obj.fontSize || 24;
                const family = obj.fontFamily || "'Inter', sans-serif";
                
                // Construct font string carefully
                ctx.font = `${style} ${weight} ${size}px ${family}`;
                
                // Measure Text to determine Box size if background needed
                const metrics = ctx.measureText(obj.text || '');
                const textWidth = metrics.width;
                const textHeight = size; // Approximation
                
                // Draw Background Box if exists
                if (obj.backgroundColor || (obj.borderWidth && obj.borderWidth > 0)) {
                    const padding = 8;
                    const boxW = textWidth + padding * 2;
                    const boxH = textHeight + padding * 2;
                    
                    // Box origin needs to respect anchor, but relative to text.
                    // Text draws at 0,0 (with align). 
                    // Let's assume box centers on text origin if centered.
                    
                    let boxX = 0;
                    let boxY = 0;

                    // Text align offset
                    if (anchor.x < 0.25) { // Left
                        boxX = -padding;
                    } else if (anchor.x > 0.75) { // Right
                        boxX = -boxW + padding;
                    } else { // Center
                        boxX = -boxW / 2;
                    }

                    if (anchor.y < 0.25) { // Top
                        boxY = -padding;
                    } else if (anchor.y > 0.75) { // Bottom
                         boxY = -boxH + padding;
                    } else { // Middle
                        boxY = -boxH / 2;
                    }

                    if (obj.borderRadius && obj.borderRadius > 0) {
                        roundRect(ctx, boxX, boxY, boxW, boxH, obj.borderRadius);
                    } else {
                        ctx.beginPath();
                        ctx.rect(boxX, boxY, boxW, boxH);
                    }

                    if (obj.backgroundColor) {
                        ctx.fillStyle = resolveColor(ctx, obj.backgroundColor, boxW, boxH);
                        ctx.fill();
                    }
                    
                    if (obj.borderWidth && obj.borderWidth > 0 && obj.borderColor) {
                        ctx.lineWidth = obj.borderWidth;
                        ctx.strokeStyle = obj.borderColor;
                        ctx.stroke();
                    }
                }

                // Text Alignment
                if (anchor.x < 0.25) ctx.textAlign = 'left';
                else if (anchor.x > 0.75) ctx.textAlign = 'right';
                else ctx.textAlign = 'center';
                
                if (anchor.y < 0.25) ctx.textBaseline = 'top';
                else if (anchor.y > 0.75) ctx.textBaseline = 'bottom';
                else ctx.textBaseline = 'middle';
                
                // Text Color/Fill
                ctx.fillStyle = resolveColor(ctx, obj.color, textWidth, textHeight);
                ctx.fillText(obj.text || '', 0, 0);

            } else if (obj.type === 'LINE' || obj.type === 'ARROW') {
                const w = obj.width || 100;
                const h = obj.height || 4; 
                
                const dx = -w * anchor.x;
                
                ctx.translate(dx, (0.5 - anchor.y) * h);

                // Apply dash if present
                if (obj.lineDash) {
                    ctx.setLineDash(obj.lineDash);
                }

                ctx.lineWidth = h;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0); 
                ctx.lineTo(w, 0); 
                
                // Lines use strokeStyle as their "color"
                // But we store it in obj.color
                if (typeof obj.color === 'string') {
                    ctx.strokeStyle = obj.color;
                } else {
                     ctx.strokeStyle = resolveColor(ctx, obj.color, w, h);
                }
                ctx.stroke();

                if (obj.type === 'ARROW') {
                    // Reset Dash for Arrow Head
                    ctx.setLineDash([]);
                    
                    const headSize = h * 3;
                    ctx.beginPath();
                    ctx.moveTo(w, 0);
                    ctx.lineTo(w - headSize, -headSize / 1.5);
                    ctx.lineTo(w - headSize, headSize / 1.5);
                    ctx.fillStyle = typeof obj.color === 'string' ? obj.color : 'white';
                    ctx.fill();
                }
            } else if (obj.type === 'IMAGE' && obj.imageUrl) {
                let img = imageCache.current.get(obj.imageUrl);
                
                if (!img) {
                    img = new Image();
                    img.src = obj.imageUrl;
                    img.onload = () => setForceUpdate(c => c + 1); 
                    imageCache.current.set(obj.imageUrl, img);
                }

                if (img.complete && img.naturalWidth > 0) {
                    const w = obj.width || 100;
                    const h = obj.height || (w * (img.naturalHeight / img.naturalWidth));
                    
                    const x = -w * anchor.x;
                    const y = -h * anchor.y;

                    // Draw Background/Border for Image?
                     if (obj.backgroundColor || (obj.borderWidth && obj.borderWidth > 0)) {
                         if (obj.borderRadius && obj.borderRadius > 0) {
                            roundRect(ctx, x, y, w, h, obj.borderRadius);
                        } else {
                            ctx.beginPath();
                            ctx.rect(x, y, w, h);
                        }

                        if (obj.backgroundColor) {
                            ctx.fillStyle = resolveColor(ctx, obj.backgroundColor, w, h);
                            ctx.fill();
                        }
                     }

                    // Clip image to border radius
                    ctx.save();
                    if (obj.borderRadius && obj.borderRadius > 0) {
                         roundRect(ctx, x, y, w, h, obj.borderRadius);
                         ctx.clip();
                    }
                    
                    ctx.drawImage(img, x, y, w, h);
                    ctx.restore();

                    // Draw Border
                    if (obj.borderWidth && obj.borderWidth > 0 && obj.borderColor) {
                        if (obj.borderRadius && obj.borderRadius > 0) {
                            roundRect(ctx, x, y, w, h, obj.borderRadius);
                        } else {
                            ctx.beginPath();
                            ctx.rect(x, y, w, h);
                        }
                        ctx.lineWidth = obj.borderWidth;
                        ctx.strokeStyle = obj.borderColor;
                        ctx.stroke();
                    }
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
             
             {typeof (window as any).MathJax === 'undefined' && (
                 <div className="absolute bottom-2 right-2 text-xs text-yellow-500 bg-black/50 px-2 rounded">
                     Loading Math Engine...
                 </div>
             )}
        </div>
    );
};

const ResponsiveOverlay = ({ width, height, children }: { width: number, height: number, children: React.ReactNode }) => {
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