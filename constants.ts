export const DEFAULT_SCRIPT = `// Geometry & Vectors Demo

// 1. Setup Points
const left = { x: 500, y: 800 };
const right = { x: 1420, y: 800 };
const peak = { x: 960, y: 300 };

// 2. Create Base Line
const base = scene.addLine({ 
    p1: left, 
    p2: right, 
    thickness: 4, 
    color: '#475569' // Slate color
});

// 3. Create Vectors (Arrows) pointing to peak
const vecA = scene.addArrow({ 
    p1: left, 
    p2: peak, 
    thickness: 8, 
    color: '#3b82f6', // Blue
    opacity: 0 
});

const vecB = scene.addArrow({ 
    p1: right, 
    p2: peak, 
    thickness: 8, 
    color: '#ef4444', // Red
    opacity: 0
});

scene.wait(0.5);

// 4. Animate: Reveal Vectors
scene.playTogether([
    (s) => s.fadeIn(vecA, 1.0),
    (s) => s.fadeIn(vecB, 1.0)
]);

// Label
const label = scene.addText({ 
    text: "Resultant", 
    x: 960, 
    y: 200, 
    fontSize: 60, 
    color: '#ffffff',
    opacity: 0
});

scene.wait(0.2);

// 5. Animate: Float Everything Up
scene.playTogether([
    (s) => s.fadeIn(label, 1.5),
    (s) => s.moveBy(label, { x: 0, y: -50 }, 1.5),
    (s) => s.moveBy(vecA, { x: 0, y: -100 }, 2.0),
    (s) => s.moveBy(vecB, { x: 0, y: -100 }, 2.0),
    (s) => s.moveBy(base, { x: 0, y: -100 }, 2.0)
]);
`;

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;