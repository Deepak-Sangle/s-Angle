export const DEFAULT_SCRIPT = `// --- PAGE 1: TITLE & INTRO ---
const title = scene.addText({
    text: "MotionScript",
    x: 960, y: 400,
    fontSize: 120,
    fontWeight: 800,
    color: '#fff',
    opacity: 0,
    fontFamily: 'Inter'
});

const subtitle = scene.addText({
    text: "The Code-Based Animation Engine",
    x: 960, y: 550,
    fontSize: 40,
    color: '#94a3b8',
    opacity: 0
});

// Animate Title
scene.playTogether([
    (s) => s.update(title, { opacity: 1, y: 450 }, 1.0, 'easeOutCubic'),
    (s) => s.typeWriter(subtitle, 1.5)
]);

scene.glow(title, { color: '#60a5fa', strength: 40 }, 1.0);
scene.wiggle(title, 0.5, 5);

scene.wait(1.5);
scene.nextPage(0.8);

// --- PAGE 2: SHAPES & PHYSICS DEMO ---

const circle = scene.addCircle({ 
    x: 400, y: 540, radius: 0, color: '#3b82f6', 
    borderColor: '#fff', borderWidth: 4 , opacity: 0
});
const square = scene.addRect({ 
    x: 1520, y: 540, width: 0, height: 160, color: '#ef4444',
    borderRadius: 30 , opacity: 0
});

scene.playTogether([
    s => s.update(circle, { radius: 80 , opacity: 1,}, 0.8, 'easeOutElastic'),
    s => s.update(square, { width: 160 , opacity: 1,}, 0.8, 'easeOutElastic')
]);

scene.wait(0.2);

// Move and morph
scene.playTogether([
    s => s.moveTo(circle, { x: 960, y: 540 }, 1.0),
    s => s.moveTo(square, { x: 960, y: 540 }, 1.0),
    s => s.rotate(square, 180, 1.0),
    s => s.changeColor(circle, '#8b5cf6', 1.0)
]);

scene.playTogether([
    s => s.pulse(circle, 0.5, 1.5),
    s => s.shake(square, 0.5, 20)
]);

scene.wait(0.5);
scene.nextPage(0.8);

// --- PAGE 3: DATA VISUALIZATION ---

// Add a Grid for context
const grid = scene.addScene(Scenes.Grid, { x: 960, y: 540, opacity: 0 });
scene.fadeIn(grid, 0.5);

const chartTitle = scene.addText({
    text: "Live Data Updates",
    x: 300, y: 100,
    fontSize: 50,
    fontWeight: 'bold',
    color: '#e2e8f0',
    anchor: { x: 0, y: 0.5 },
    opacity: 0
});

// Instantiate Bar Chart (Hidden Initially)
const chart = scene.addScene((s) => Scenes.BarChart(s, [
    { label: 'Q1', value: 25, color: '#f59e0b' },
    { label: 'Q2', value: 40, color: '#10b981' },
    { label: 'Q3', value: 35, color: '#3b82f6' },
    { label: 'Q4', value: 50, color: '#8b5cf6' }
], { 
    width: 800, 
    barHeight: 60, 
    gap: 40,
    domain: [0, 100] 
}), { x: 300, y: 250, opacity: 0 }); // <--- Fixed: Start invisible

// Animate Entry
// Move to starting position (invisible) then fade in and slide to final position
scene.update(chart, { x: 250 }, 0);
scene.update(chartTitle, {opacity: 1}, 1.0, 'easeOutCubic');
scene.update(chart, { opacity: 1, x: 300 }, 1.0, 'easeOutCubic');

scene.wait(0.5);

// Update Data dynamically
Scenes.updateChart(scene, chart, [
    { label: 'Q1', value: 45 },
    { label: 'Q2', value: 80 },
    { label: 'Q3', value: 95 }, // Big Growth
    { label: 'Q4', value: 60 }
], { duration: 1.5, stagger: 0.1 });

scene.wait(1.0);
scene.nextPage(0.8);

// --- PAGE 4: MATH RENDERING ---

const mathTitle = scene.addText({
    text: "Beautiful Math",
    x: 960, y: 200,
    fontSize: 60,
    fontWeight: 600,
    opacity: 0
});

const equation = scene.addMath({
    latex: "f(x) = \int_{-\\\\infty}^\\\\infty \\\\hat f(\\\\xi)\\\\,e^{2\\\\pi i \\\\xi x} \\\\,d\\\\xi",
    x: 960, y: 540,
    scale: 0,
    color: '#ffffff',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderColor: '#475569',
    borderWidth: 2
});

scene.scale(equation, 3, 1.0);
scene.fadeIn(mathTitle, 0.5);

scene.wait(1.0);
scene.nextPage(1.0);

// --- FINISH ---
const endText = scene.addText({
    text: "Build Your Story.",
    x: 960, y: 540,
    fontSize: 80,
    fontWeight: 'bold',
    opacity: 0
});

scene.playTogether([
    s => s.fadeIn(endText, 1.0),
    s => s.scale(endText, 1.2, 3.0) // Slow grow
]);
`;

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;