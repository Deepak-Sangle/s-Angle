export const DEFAULT_SCRIPT = `// Math LaTeX Demo

// 1. Setup the Identity
const euler = scene.addMath({
    latex: "e^{i\\pi} + 1 = 0",
    x: 960,
    y: 540,
    color: '#38bdf8', // Light Blue
    scale: 2.0,
    opacity: 0
});

const label = scene.addText({
    text: "Euler's Identity",
    x: 960,
    y: 400,
    fontSize: 40,
    color: '#94a3b8',
    opacity: 0
});

scene.wait(0.5);

// 2. Animate In
scene.playTogether([
    (s) => s.fadeIn(euler, 2.0),
    (s) => s.scale(euler, 3.0, 2.0), // Scale up
    (s) => s.fadeIn(label, 2.0),
    (s) => s.moveBy(label, { x: 0, y: -50 }, 2.0)
]);

scene.wait(1.0);

// 3. Move and Change
const integral = scene.addMath({
    latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
    x: 500,
    y: 800,
    color: '#ef4444', // Red
    scale: 2.0,
    opacity: 0
});

scene.playTogether([
    // Move Euler top left
    (s) => s.moveTo(euler, { x: 400, y: 300 }, 1.5),
    (s) => s.scale(euler, 2.0, 1.5), // Shrink slightly
    // Show Integral
    (s) => s.fadeIn(integral, 1.5),
    (s) => s.moveBy(integral, { x: 0, y: -100 }, 1.5)
]);

scene.wait(1.0);

// 4. Typewriter & Shapes Demo
const box = scene.addRect({
    x: 1450, 
    y: 850,
    width: 600, 
    height: 120,
    color: '#1e293b', // Slate 800
    opacity: 0
});

const code = scene.addText({
    text: "const magic = scene.render();",
    x: 1450,
    y: 850,
    fontSize: 32,
    color: '#bef264', // Lime
    opacity: 0 // Start invisible for typewriter
});

scene.playTogether([
    (s) => s.fadeIn(box, 0.5),
    (s) => s.typeWriter(code, 2.5)
]);
`;

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;