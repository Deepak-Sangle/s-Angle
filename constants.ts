export const DEFAULT_SCRIPT = `// --- DEEP DIVE: MATRIX MULTIPLICATION ---

// 1. Title
const title = scene.addText({
    text: "Matrix Multiplication",
    x: 960, y: 80,
    fontSize: 60,
    fontWeight: 700,
    color: '#cbd5e1',
    opacity: 0
});
scene.fadeIn(title, 1);

// 2. Setup Matrices
// A: 2x2 at Left
const matA = scene.addMatrix({
    data: [[1, 2], [3, 4]],
    x: 400, y: 540,
    fontSize: 50,
    color: '#60a5fa', // Blue
    bracketStyle: 'square',
    cellSpacing: { x: 80, y: 80 },
    opacity: 0
});
const labelA = scene.addText({ text: "A", x: 400, y: 700, fontSize: 30, color: '#60a5fa', opacity: 0 });

// B: 2x2 Middle
const matB = scene.addMatrix({
    data: [[2, 0], [1, 2]],
    x: 800, y: 540,
    fontSize: 50,
    color: '#f472b6', // Pink
    bracketStyle: 'square',
    cellSpacing: { x: 80, y: 80 },
    opacity: 0
});
const labelB = scene.addText({ text: "B", x: 800, y: 700, fontSize: 30, color: '#f472b6', opacity: 0 });

// Result C: Wide matrix at Right
const matC = scene.addMatrix({
    data: [['', ''], ['', '']], 
    x: 1400, y: 540,
    fontSize: 40,
    color: '#a78bfa', // Purple
    bracketStyle: 'square',
    cellSpacing: { x: 260, y: 100 }, 
    opacity: 0
});
const labelC = scene.addText({ text: "Result", x: 1400, y: 700, fontSize: 30, color: '#a78bfa', opacity: 0 });

// Symbols
const times = scene.addText({ text: "×", x: 600, y: 540, fontSize: 50, color: '#fff', opacity: 0 });
const equals = scene.addText({ text: "=", x: 1000, y: 540, fontSize: 50, color: '#fff', opacity: 0 });

scene.playTogether([
    s => s.fadeIn(matA, 1),
    s => s.fadeIn(matB, 1),
    s => s.fadeIn(matC, 1),
    s => s.fadeIn(times, 1),
    s => s.fadeIn(equals, 1),
    s => s.fadeIn(labelA, 1),
    s => s.fadeIn(labelB, 1),
    s => s.fadeIn(labelC, 1),
]);
scene.wait(0.5);

// Reusable Operators (Hidden initially)
const opMul1 = scene.addText({ text: "·", fontSize: 40, color: '#e2e8f0', opacity: 0 });
const opAdd  = scene.addText({ text: "+", fontSize: 40, color: '#e2e8f0', opacity: 0 });
const opMul2 = scene.addText({ text: "·", fontSize: 40, color: '#e2e8f0', opacity: 0 });

// Highlighters
const rowH = scene.addRect({
    width: 180, height: 70, x: 400, y: 540,
    color: 'rgba(96, 165, 250, 0.1)', borderColor: '#60a5fa', borderWidth: 3, borderRadius: 12, opacity: 0
});
const colH = scene.addRect({
    width: 70, height: 180, x: 800, y: 540,
    color: 'rgba(244, 114, 182, 0.1)', borderColor: '#f472b6', borderWidth: 3, borderRadius: 12, opacity: 0
});

// Coords for Matrix Cells (Calculated based on spacing)
// A (center 400,540, space 80) -> TL: 360,500 | TR: 440,500 | BL: 360,580 | BR: 440,580
// B (center 800,540, space 80) -> TL: 760,500 | TR: 840,500 | BL: 760,580 | BR: 840,580
// C (center 1400,540, space 260,100) -> TL: 1270,490 | TR: 1530,490 | BL: 1270,590 | BR: 1530,590

// --- ANIMATION STEP 1: C[0,0] ---
// Row 0 of A (1, 2) * Col 0 of B (2, 1)

// Highlight
scene.update(rowH, { x: 400, y: 500 }); // Top row A
scene.update(colH, { x: 760, y: 540 }); // Left col B
scene.playTogether([ s => s.fadeIn(rowH, 0.5), s => s.fadeIn(colH, 0.5) ]);

// Float Numbers
const f1 = scene.addText({ text: "1", x: 360, y: 500, fontSize: 40, color: '#60a5fa', opacity: 0 }); // from A00
const f2 = scene.addText({ text: "2", x: 440, y: 500, fontSize: 40, color: '#60a5fa', opacity: 0 }); // from A01
const f3 = scene.addText({ text: "2", x: 760, y: 500, fontSize: 40, color: '#f472b6', opacity: 0 }); // from B00
const f4 = scene.addText({ text: "1", x: 760, y: 580, fontSize: 40, color: '#f472b6', opacity: 0 }); // from B10

scene.playTogether([
    s => s.fadeIn(f1, 0.3), s => s.fadeIn(f2, 0.3), s => s.fadeIn(f3, 0.3), s => s.fadeIn(f4, 0.3)
]);

// Move to C[0,0] Center: 1270, 490
// Spacing: f1(1145) op*(1185) f3(1225) op+(1270) f2(1315) op*(1355) f4(1395)
const y0 = 490;
scene.playTogether([
    s => s.moveTo(f1, { x: 1145, y: y0 }, 1), // 1
    s => s.moveTo(f3, { x: 1225, y: y0 }, 1), // 2 (B)
    s => s.moveTo(f2, { x: 1315, y: y0 }, 1), // 2 (A)
    s => s.moveTo(f4, { x: 1395, y: y0 }, 1), // 1 (B)
    
    // Operators
    s => { s.update(opMul1, { x: 1185, y: y0 }, 0); s.fadeIn(opMul1, 1); },
    s => { s.update(opAdd,  { x: 1270, y: y0 }, 0); s.fadeIn(opAdd, 1); },
    s => { s.update(opMul2, { x: 1355, y: y0 }, 0); s.fadeIn(opMul2, 1); }
]);

// Show Expression
scene.update(matC, { matrixData: [['1 · 2 + 2 · 1', ''], ['', '']] });
scene.playTogether([
    s => s.fadeOut(f1, 0.1), s => s.fadeOut(f2, 0.1), s => s.fadeOut(f3, 0.1), s => s.fadeOut(f4, 0.1),
    s => s.fadeOut(opMul1, 0.1), s => s.fadeOut(opAdd, 0.1), s => s.fadeOut(opMul2, 0.1)
]);
scene.wait(0.8);

// Resolve
scene.update(matC, { matrixData: [['4', ''], ['', '']] });
scene.glow(matC, { color: '#a78bfa', strength: 30 }, 0.5);
scene.wait(0.5);


// --- ANIMATION STEP 2: C[0,1] ---
// Row 0 of A (1, 2) * Col 1 of B (0, 2)

scene.moveTo(colH, { x: 840, y: 540 }, 0.5); // Right col B

// Float Numbers
scene.update(f1, { text: "1", x: 360, y: 500, color: '#60a5fa' });
scene.update(f2, { text: "2", x: 440, y: 500, color: '#60a5fa' });
scene.update(f3, { text: "0", x: 840, y: 500, color: '#f472b6' }); // B01
scene.update(f4, { text: "2", x: 840, y: 580, color: '#f472b6' }); // B11

scene.playTogether([
    s => s.fadeIn(f1, 0.3), s => s.fadeIn(f2, 0.3), s => s.fadeIn(f3, 0.3), s => s.fadeIn(f4, 0.3)
]);

// Move to C[0,1] Center: 1530, 490
const cx1 = 1530;
scene.playTogether([
    s => s.moveTo(f1, { x: cx1 - 125, y: y0 }, 1),
    s => s.moveTo(f3, { x: cx1 - 45, y: y0 }, 1),
    s => s.moveTo(f2, { x: cx1 + 45, y: y0 }, 1),
    s => s.moveTo(f4, { x: cx1 + 125, y: y0 }, 1),
    
    // Operators
    s => { s.update(opMul1, { x: cx1 - 85, y: y0 }, 0); s.fadeIn(opMul1, 1); },
    s => { s.update(opAdd,  { x: cx1,      y: y0 }, 0); s.fadeIn(opAdd, 1); },
    s => { s.update(opMul2, { x: cx1 + 85, y: y0 }, 0); s.fadeIn(opMul2, 1); }
]);

scene.update(matC, { matrixData: [['4', '1 · 0 + 2 · 2'], ['', '']] });
scene.playTogether([
    s => s.fadeOut(f1, 0.1), s => s.fadeOut(f2, 0.1), s => s.fadeOut(f3, 0.1), s => s.fadeOut(f4, 0.1),
    s => s.fadeOut(opMul1, 0.1), s => s.fadeOut(opAdd, 0.1), s => s.fadeOut(opMul2, 0.1)
]);
scene.wait(0.8);
scene.update(matC, { matrixData: [['4', '4'], ['', '']] });
scene.glow(matC, { color: '#a78bfa', strength: 30 }, 0.5);
scene.wait(0.5);


// --- ANIMATION STEP 3: C[1,0] ---
// Row 1 of A (3, 4) * Col 0 of B (2, 1)

scene.playTogether([
    s => s.moveTo(rowH, { x: 400, y: 580 }, 0.5), // Bottom row A
    s => s.moveTo(colH, { x: 760, y: 540 }, 0.5)  // Left col B
]);

// Float
scene.update(f1, { text: "3", x: 360, y: 580, color: '#60a5fa' }); // A10
scene.update(f2, { text: "4", x: 440, y: 580, color: '#60a5fa' }); // A11
scene.update(f3, { text: "2", x: 760, y: 500, color: '#f472b6' }); // B00
scene.update(f4, { text: "1", x: 760, y: 580, color: '#f472b6' }); // B10

scene.playTogether([
    s => s.fadeIn(f1, 0.3), s => s.fadeIn(f2, 0.3), s => s.fadeIn(f3, 0.3), s => s.fadeIn(f4, 0.3)
]);

// Move to C[1,0] Center: 1270, 590
const y1 = 590;
const cx2 = 1270;
scene.playTogether([
    s => s.moveTo(f1, { x: cx2 - 125, y: y1 }, 1),
    s => s.moveTo(f3, { x: cx2 - 45, y: y1 }, 1),
    s => s.moveTo(f2, { x: cx2 + 45, y: y1 }, 1),
    s => s.moveTo(f4, { x: cx2 + 125, y: y1 }, 1),
    
    // Operators
    s => { s.update(opMul1, { x: cx2 - 85, y: y1 }, 0); s.fadeIn(opMul1, 1); },
    s => { s.update(opAdd,  { x: cx2,      y: y1 }, 0); s.fadeIn(opAdd, 1); },
    s => { s.update(opMul2, { x: cx2 + 85, y: y1 }, 0); s.fadeIn(opMul2, 1); }
]);

scene.update(matC, { matrixData: [['4', '4'], ['3 · 2 + 4 · 1', '']] });
scene.playTogether([
    s => s.fadeOut(f1, 0.1), s => s.fadeOut(f2, 0.1), s => s.fadeOut(f3, 0.1), s => s.fadeOut(f4, 0.1),
    s => s.fadeOut(opMul1, 0.1), s => s.fadeOut(opAdd, 0.1), s => s.fadeOut(opMul2, 0.1)
]);
scene.wait(0.8);
scene.update(matC, { matrixData: [['4', '4'], ['10', '']] });
scene.glow(matC, { color: '#a78bfa', strength: 30 }, 0.5);
scene.wait(0.5);


// --- ANIMATION STEP 4: C[1,1] ---
// Row 1 of A (3, 4) * Col 1 of B (0, 2)

scene.moveTo(colH, { x: 840, y: 540 }, 0.5); // Right col B

// Float
scene.update(f1, { text: "3", x: 360, y: 580, color: '#60a5fa' }); // A10
scene.update(f2, { text: "4", x: 440, y: 580, color: '#60a5fa' }); // A11
scene.update(f3, { text: "0", x: 840, y: 500, color: '#f472b6' }); // B01
scene.update(f4, { text: "2", x: 840, y: 580, color: '#f472b6' }); // B11

scene.playTogether([
    s => s.fadeIn(f1, 0.3), s => s.fadeIn(f2, 0.3), s => s.fadeIn(f3, 0.3), s => s.fadeIn(f4, 0.3)
]);

// Move to C[1,1] Center: 1530, 590
const cx3 = 1530;
scene.playTogether([
    s => s.moveTo(f1, { x: cx3 - 125, y: y1 }, 1),
    s => s.moveTo(f3, { x: cx3 - 45, y: y1 }, 1),
    s => s.moveTo(f2, { x: cx3 + 45, y: y1 }, 1),
    s => s.moveTo(f4, { x: cx3 + 125, y: y1 }, 1),
    
    // Operators
    s => { s.update(opMul1, { x: cx3 - 85, y: y1 }, 0); s.fadeIn(opMul1, 1); },
    s => { s.update(opAdd,  { x: cx3,      y: y1 }, 0); s.fadeIn(opAdd, 1); },
    s => { s.update(opMul2, { x: cx3 + 85, y: y1 }, 0); s.fadeIn(opMul2, 1); }
]);

scene.update(matC, { matrixData: [['4', '4'], ['10', '3 · 0 + 4 · 2']] });
scene.playTogether([
    s => s.fadeOut(f1, 0.1), s => s.fadeOut(f2, 0.1), s => s.fadeOut(f3, 0.1), s => s.fadeOut(f4, 0.1),
    s => s.fadeOut(opMul1, 0.1), s => s.fadeOut(opAdd, 0.1), s => s.fadeOut(opMul2, 0.1)
]);
scene.wait(0.8);
scene.update(matC, { matrixData: [['4', '4'], ['10', '8']] });
scene.glow(matC, { color: '#a78bfa', strength: 30 }, 0.5);
scene.wait(0.5);


// End
scene.playTogether([
    s => s.fadeOut(rowH, 0.5),
    s => s.fadeOut(colH, 0.5),
    s => s.scale(matC, 1.2, 1.5)
]);
scene.wait(1);
`;

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;