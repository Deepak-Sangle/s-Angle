import React, { useRef, useEffect, useState, memo } from 'react';
import { RenderState, VisualObject, ColorProp, Vector3 } from '../types';

interface CanvasPlayerProps {
    width: number;
    height: number;
    renderState: RenderState;
}

// 3D Config
const FOCAL_LENGTH = 1200;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

// 3D Math Helper
const rotatePoint = (p: Vector3, rot: { x: number, y: number, z: number }, center: Vector3): Vector3 => {
    // Relative to center
    let x = p.x - center.x;
    let y = p.y - center.y;
    let z = p.z - center.z;

    // Rotate X
    if (rot.x !== 0) {
        const cos = Math.cos(rot.x);
        const sin = Math.sin(rot.x);
        const y1 = y * cos - z * sin;
        const z1 = y * sin + z * cos;
        y = y1;
        z = z1;
    }

    // Rotate Y
    if (rot.y !== 0) {
        const cos = Math.cos(rot.y);
        const sin = Math.sin(rot.y);
        const x1 = x * cos + z * sin;
        const z1 = -x * sin + z * cos;
        x = x1;
        z = z1;
    }

    // Rotate Z
    if (rot.z !== 0) {
        const cos = Math.cos(rot.z);
        const sin = Math.sin(rot.z);
        const x1 = x * cos - y * sin;
        const y1 = x * sin + y * cos;
        x = x1;
        y = y1;
    }

    return {
        x: x + center.x,
        y: y + center.y,
        z: z + center.z
    };
};

const project = (p: Vector3): { x: number, y: number, scale: number, z: number } => {
    // World space to Camera space (Camera is at 0,0,-FOCAL_LENGTH looking at +Z)
    // Actually, let's keep it simple: Camera is at (CENTER_X, CENTER_Y, -FOCAL_LENGTH)
    // Objects at z=0 are at screen plane.
    
    // We used a Z+ is out, Z- is in model in engine, or vice versa? 
    // Let's standard: Camera at Z = -FL. Screen at Z=0. Objects at Z > -FL are visible.
    // Scale = FL / (FL + z)
    
    const depth = FOCAL_LENGTH + p.z;
    if (depth <= 1) return { x: p.x, y: p.y, scale: 0, z: p.z }; // Clip behind camera

    const scale = FOCAL_LENGTH / depth;
    
    // Perspective projection relative to center
    const x = (p.x - CENTER_X) * scale + CENTER_X;
    const y = (p.y - CENTER_Y) * scale + CENTER_Y;

    return { x, y, scale, z: p.z };
};

// Helper to resolve string or Gradient object into Canvas fillStyle
const resolveColor = (
    ctx: CanvasRenderingContext2D, 
    color: ColorProp, 
    width: number, 
    height: number
): string | CanvasGradient => {
    if (typeof color === 'string') return color;
    
    // For 3D gradients, we'd need to project start/end points. 
    // Fallback: simplified 2D gradient on the projected bounding box.
    if (color.type === 'linear') {
        const x1 = color.x1 * width;
        const y1 = color.y1 * height;
        const x2 = color.x2 * width;
        const y2 = color.y2 * height;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        color.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
        return grad;
    }
    
    // Radial might look weird on skewed planes, but acceptable for now
    if (color.type === 'radial') {
        const x1 = color.x1 * width;
        const y1 = color.y1 * height;
        const r1 = color.r1 * (Math.max(width, height) / 2);
        const x2 = color.x2 * width;
        const y2 = color.y2 * height;
        const r2 = color.r2 * (Math.max(width, height) / 2);
        const grad = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
        color.stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
        return grad;
    }

    return 'black';
};

// Memoized Math Component
const MathObject = memo(({ obj, projected }: { obj: VisualObject, projected: { x: number, y: number, scale: number } }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && (window as any).MathJax) {
            const el = containerRef.current;
            el.innerHTML = `\\( ${obj.latex} \\)`;
            (window as any).MathJax.typesetPromise([el]).catch((err: any) => console.log(err));
        }
    }, [obj.latex]);

    let backgroundStyle = 'transparent';
    if (typeof obj.backgroundColor === 'string') {
        backgroundStyle = obj.backgroundColor;
    }

    return (
        <div 
            ref={containerRef}
            style={{
                position: 'absolute',
                left: projected.x,
                top: projected.y,
                // We use 2D rotation for billboard text, ignoring 3D rotation for readability unless we want 3D transform via CSS
                // Let's stick to billboard (facing camera) but scaled by Z
                transform: `translate(-50%, -50%) scale(${obj.scale * projected.scale}) rotate(${obj.rotation}rad)`,
                color: typeof obj.color === 'string' ? obj.color : 'white',
                opacity: obj.opacity,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: '24px',
                background: backgroundStyle,
                border: obj.borderWidth ? `${obj.borderWidth}px solid ${obj.borderColor}` : 'none',
                borderRadius: obj.borderRadius ? `${obj.borderRadius}px` : '0px',
                padding: obj.backgroundColor || obj.borderWidth ? '4px 8px' : '0',
                filter: obj.shadowBlur > 0 ? `drop-shadow(0 0 ${obj.shadowBlur}px ${obj.shadowColor})` : 'none'
            }}
        />
    );
}, (prev, next) => {
    return (
        prev.projected.x === next.projected.x &&
        prev.projected.y === next.projected.y &&
        prev.projected.scale === next.projected.scale &&
        prev.obj.rotation === next.obj.rotation &&
        prev.obj.opacity === next.obj.opacity &&
        prev.obj.scale === next.obj.scale
    );
});

const CanvasPlayer: React.FC<CanvasPlayerProps> = ({ width, height, renderState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [, setForceUpdate] = useState(0);

    // 1. Prepare Objects: Calculate 3D Project for sorting
    // We need to determine the "Z-index" of each object.
    const sortedObjects = renderState.objects
        .map(obj => {
            const center3D = { x: obj.x, y: obj.y, z: obj.z };
            const proj = project(center3D);
            return { obj, proj, sortZ: obj.z }; // Sort by world Z or camera Z. Simple Z sort works for non-intersecting planes.
        })
        .sort((a, b) => a.sortZ - b.sortZ); // Painter's Algorithm: Draw from deep (small Z, if Z- is in?) 
        // Wait, standard convention: Z decreases into screen? 
        // Our engine: Z=0 screen. Z=1000 away? Or Z=-1000 away? 
        // In the project function: depth = FL + p.z. If z is positive, depth increases -> scale decreases. So Z+ is AWAY from camera.
        // So we draw largest Z first.
    sortedObjects.reverse(); // Draw large Z (far) first, small Z (close) last.

    const mathObjects = sortedObjects.filter(item => item.obj.type === 'MATH');

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

        // Render Loop
        sortedObjects.forEach(({ obj, proj }) => {
            if (obj.opacity <= 0.01 || proj.scale <= 0) return;

            // Types that support full 3D Vertex Distortion: RECT, SQUARE, POLYGON, REGULAR_POLYGON
            const is3DPlane = ['RECT', 'SQUARE', 'POLYGON', 'REGULAR_POLYGON'].includes(obj.type);
            
            ctx.globalAlpha = obj.opacity;

            if (is3DPlane) {
                // Generate Vertices relative to center (0,0)
                let localPoints: Vector3[] = [];
                const anchor = obj.anchor || { x: 0.5, y: 0.5 };

                if (obj.type === 'RECT') {
                    const w = obj.width || 0;
                    const h = obj.height || 0;
                    const ox = -w * anchor.x;
                    const oy = -h * anchor.y;
                    localPoints = [
                        { x: ox, y: oy, z: 0 },         // TL
                        { x: ox + w, y: oy, z: 0 },     // TR
                        { x: ox + w, y: oy + h, z: 0 }, // BR
                        { x: ox, y: oy + h, z: 0 }      // BL
                    ];
                } else if (obj.type === 'REGULAR_POLYGON') {
                    const r = obj.radius || 50;
                    const sides = obj.sides || 3;
                    for (let i = 0; i < sides; i++) {
                        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                        localPoints.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r, z: 0 });
                    }
                } else if (obj.type === 'POLYGON' && obj.points) {
                    localPoints = obj.points.map(p => ({ x: p.x, y: p.y, z: 0 }));
                }

                // Apply Scale
                localPoints = localPoints.map(p => ({ x: p.x * obj.scale, y: p.y * obj.scale, z: p.z * obj.scale }));

                // Apply 3D Rotations (X, Y, Z)
                const center = { x: obj.x, y: obj.y, z: obj.z };
                const rotations = { x: obj.rotationX || 0, y: obj.rotationY || 0, z: obj.rotation };
                
                const worldPoints = localPoints.map(p => {
                    // 1. Rotate
                    // 2. Translate to World
                    const rotated = rotatePoint(p, rotations, { x: 0, y: 0, z: 0 });
                    return { x: rotated.x + center.x, y: rotated.y + center.y, z: rotated.z + center.z };
                });

                // Project to 2D
                const screenPoints = worldPoints.map(p => project(p));

                // Draw Path
                ctx.beginPath();
                screenPoints.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();

                // Fill
                // We handle basic flat color or approximate gradient
                // Note: Canvas gradients are axis-aligned in 2D. Real 3D gradients need shaders.
                // Approximation: Use the projected bounding box for gradient coords.
                let minX = width, minY = height, maxX = 0, maxY = 0;
                screenPoints.forEach(p => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });
                
                const w = maxX - minX;
                const h = maxY - minY;

                // Hack: For gradients, we regenerate the gradient on the fly based on screen BBox
                if (typeof obj.color !== 'string') {
                    // Re-implement simplified gradient for distorted shape
                    // This creates a gradient aligned with the screen BBox of the distorted shape
                    const g = obj.color;
                    let grad;
                    if (g.type === 'linear') {
                        grad = ctx.createLinearGradient(
                            minX + g.x1 * w, minY + g.y1 * h,
                            minX + g.x2 * w, minY + g.y2 * h
                        );
                    } else {
                        grad = ctx.createRadialGradient(
                            minX + g.x1 * w, minY + g.y1 * h, g.r1 * w,
                            minX + g.x2 * w, minY + g.y2 * h, g.r2 * w
                        );
                    }
                    g.stops.forEach(s => grad.addColorStop(s.offset, s.color));
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = obj.color;
                }

                // Shadows
                if (obj.shadowBlur > 0) {
                    ctx.shadowBlur = obj.shadowBlur;
                    ctx.shadowColor = obj.shadowColor;
                } else {
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }

                ctx.fill();

                if (obj.borderWidth && obj.borderWidth > 0 && obj.borderColor) {
                    ctx.lineWidth = Math.max(0.5, obj.borderWidth * proj.scale);
                    ctx.strokeStyle = obj.borderColor;
                    ctx.stroke();
                }

            } else if (obj.type === 'MATRIX' && obj.matrixData) {
                const rows = obj.matrixData.length;
                const cols = obj.matrixData[0]?.length || 0;
                const spacingX = obj.cellSpacing?.x || 60;
                const spacingY = obj.cellSpacing?.y || 60;
                const fontSize = obj.fontSize || 40;
                
                // Calculate center offsets for centering the matrix around obj.x/y
                const offsetX = -((cols - 1) * spacingX) / 2;
                const offsetY = -((rows - 1) * spacingY) / 2;

                // 1. Draw Cells (Numbers)
                obj.matrixData.forEach((row, r) => {
                    row.forEach((cell, c) => {
                        const lx = offsetX + c * spacingX;
                        const ly = offsetY + r * spacingY;
                        const p = { x: lx * obj.scale, y: ly * obj.scale, z: 0 };
                        
                        // Transform
                        const center = { x: obj.x, y: obj.y, z: obj.z };
                        const rot = { x: obj.rotationX, y: obj.rotationY, z: obj.rotation };
                        const worldP = rotatePoint(p, rot, { x: 0, y: 0, z: 0 }); // Rotate around local 0,0 first
                        const finalP = { x: worldP.x + center.x, y: worldP.y + center.y, z: worldP.z + center.z };
                        
                        const proj = project(finalP);
                        
                        if (proj.scale > 0) {
                            ctx.save();
                            ctx.translate(proj.x, proj.y);
                            ctx.scale(proj.scale * obj.scale, proj.scale * obj.scale); // Scale text by depth and obj scale
                            
                            // Text Style
                            ctx.font = `${obj.fontWeight || 400} ${fontSize}px ${obj.fontFamily || 'Inter'}`;
                            ctx.fillStyle = resolveColor(ctx, obj.color, fontSize, fontSize); // Simple color resolve
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(String(cell), 0, 0);
                            ctx.restore();
                        }
                    });
                });

                // 2. Draw Brackets
                // Bracket geometry relative to center
                const bracketMargin = 30; // Distance from outer columns
                const bracketHeight = (rows - 1) * spacingY + fontSize * 1.5; 
                
                const bx = ((cols-1) * spacingX) / 2 + bracketMargin;
                const by = bracketHeight / 2;
                const tipLen = 15;

                // Left Bracket Points (local)
                const leftBracket = [
                    { x: -bx + tipLen, y: -by, z: 0 }, // Top Tip
                    { x: -bx, y: -by, z: 0 },          // Top Corner
                    { x: -bx, y: by, z: 0 },           // Bottom Corner
                    { x: -bx + tipLen, y: by, z: 0 }   // Bottom Tip
                ];

                // Right Bracket Points
                const rightBracket = [
                    { x: bx - tipLen, y: -by, z: 0 },
                    { x: bx, y: -by, z: 0 },
                    { x: bx, y: by, z: 0 },
                    { x: bx - tipLen, y: by, z: 0 }
                ];

                const drawPoly = (points: Vector3[]) => {
                    const screenPoints = points.map(p => {
                        const scaled = { x: p.x * obj.scale, y: p.y * obj.scale, z: p.z * obj.scale };
                        const center = { x: obj.x, y: obj.y, z: obj.z };
                        const rot = { x: obj.rotationX, y: obj.rotationY, z: obj.rotation };
                        const world = rotatePoint(scaled, rot, { x: 0, y: 0, z: 0 });
                        return project({ x: world.x + center.x, y: world.y + center.y, z: world.z + center.z });
                    });

                    ctx.beginPath();
                    screenPoints.forEach((p, i) => {
                        if (i===0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    
                    const avgScale = screenPoints.reduce((acc, p) => acc + p.scale, 0) / screenPoints.length;
                    ctx.lineWidth = Math.max(1, 4 * avgScale * obj.scale);
                    ctx.strokeStyle = obj.borderColor || (typeof obj.color === 'string' ? obj.color : 'white');
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                };

                drawPoly(leftBracket);
                drawPoly(rightBracket);

            } else {
                // BILLBOARD RENDERING (Circle, Text, Image, Line, Arrow)
                // These always face the camera but scale with Z
                
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.scale(proj.scale * obj.scale, proj.scale * obj.scale);
                ctx.rotate(obj.rotation); // 2D Z-rotation

                // Shadows
                if (obj.shadowBlur > 0) {
                    ctx.shadowBlur = obj.shadowBlur;
                    ctx.shadowColor = obj.shadowColor;
                }

                const anchor = obj.anchor || { x: 0.5, y: 0.5 };

                if (obj.type === 'CIRCLE') {
                    const r = obj.radius || 10;
                    const ox = (0.5 - anchor.x) * 2 * r;
                    const oy = (0.5 - anchor.y) * 2 * r;
                    
                    ctx.beginPath();
                    ctx.arc(ox, oy, r, 0, Math.PI * 2);
                    ctx.fillStyle = resolveColor(ctx, obj.color, r*2, r*2);
                    ctx.fill();
                    if (obj.borderWidth) {
                        ctx.lineWidth = obj.borderWidth;
                        ctx.strokeStyle = obj.borderColor || 'white';
                        ctx.stroke();
                    }
                } 
                else if (obj.type === 'TEXT') {
                     // Canvas Text Rendering
                    const style = obj.fontStyle || 'normal';
                    const weight = obj.fontWeight || 400;
                    const size = obj.fontSize || 24;
                    const family = obj.fontFamily || "'Inter', sans-serif";
                    ctx.font = `${style} ${weight} ${size}px ${family}`;

                    const metrics = ctx.measureText(obj.text || '');
                    const textWidth = metrics.width;
                    const textHeight = size; 

                    // Background Box
                    if (obj.backgroundColor || (obj.borderWidth && obj.borderWidth > 0)) {
                        const padding = 8;
                        const boxW = textWidth + padding * 2;
                        const boxH = textHeight + padding * 2;
                        // Align box based on anchor
                        const boxX = -boxW * anchor.x;
                        const boxY = -boxH * anchor.y;

                        ctx.beginPath();
                        if (obj.borderRadius) {
                            // simple round rect
                             ctx.roundRect(boxX, boxY, boxW, boxH, obj.borderRadius);
                        } else {
                            ctx.rect(boxX, boxY, boxW, boxH);
                        }
                        
                        if (obj.backgroundColor) {
                            ctx.fillStyle = resolveColor(ctx, obj.backgroundColor, boxW, boxH);
                            ctx.fill();
                        }
                        if (obj.borderWidth && obj.borderColor) {
                             ctx.lineWidth = obj.borderWidth;
                             ctx.strokeStyle = obj.borderColor;
                             ctx.stroke();
                        }
                    }

                    // Text
                    if (anchor.x < 0.25) ctx.textAlign = 'left';
                    else if (anchor.x > 0.75) ctx.textAlign = 'right';
                    else ctx.textAlign = 'center';
                    
                    if (anchor.y < 0.25) ctx.textBaseline = 'top';
                    else if (anchor.y > 0.75) ctx.textBaseline = 'bottom';
                    else ctx.textBaseline = 'middle';

                    ctx.fillStyle = resolveColor(ctx, obj.color, textWidth, textHeight);
                    ctx.fillText(obj.text || '', 0, 0);
                }
                else if (obj.type === 'IMAGE' && obj.imageUrl) {
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
                        ctx.drawImage(img, x, y, w, h);
                    }
                }
                else if (obj.type === 'LINE' || obj.type === 'ARROW') {
                    // Lines are also drawn as billboards for now, but 3D lines are better done as polygons
                    // Implementing 3D lines properly requires projecting p1 and p2 separately.
                    // Fallback to Billboard for simplicity in this iteration
                    const w = obj.width || 100;
                    const h = obj.height || 4;
                    const dx = -w * anchor.x;
                    ctx.translate(dx, (0.5 - anchor.y) * h);
                    if (obj.lineDash) ctx.setLineDash(obj.lineDash);
                    ctx.lineWidth = h;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.lineTo(w, 0);
                    ctx.strokeStyle = typeof obj.color === 'string' ? obj.color : 'white';
                    ctx.stroke();
                }

                ctx.restore();
            }
        });

    }, [sortedObjects, width, height]);

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
                     {mathObjects.map(({obj, proj}) => (
                         // Don't render if behind camera or too small
                         proj.scale > 0 && <MathObject key={obj.id} obj={obj} projected={proj} />
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