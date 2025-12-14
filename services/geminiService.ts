import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// System instruction to guide Gemini on how to write scripts for our specific engine
const SYSTEM_PROMPT = `
You are an expert animation scripter for the "MotionScript" engine.
Your goal is to translate natural language requests into valid JavaScript/TypeScript code that runs in the engine.

Available API (2D & 3D):
- scene.addCircle({ x, y, z?, radius, ... })
- scene.addRect({ x, y, z?, width, height, ... })
- scene.addSquare({ x, y, z?, size, ... })
- scene.addTriangle({ x, y, z?, radius, ... })
- scene.addRegularPolygon({ x, y, z?, radius, sides, ... })
- scene.addPolygon({ x, y, z?, points: [{x,y}, ...], ... })
- scene.addRhombus({ x, y, z?, width, height, ... })
- scene.addText({ text, x, y, z?, fontSize, ... })
- scene.addImage({ url, x, y, z?, ... })
- scene.addMath({ latex, x, y, z?, ... })
- scene.addMatrix({ data: [[1,2],[3,4]], x, y, z?, ... }) // 2D array of numbers/strings

Helpers:
- Scenes.Cube3D(scene, size, color) -> Returns object group { front, back, left, right, top, bottom }.
- Scenes.Grid(scene, size?, step?) 
- Scenes.BarChart(scene, items, config)

Animation Actions:
- scene.wait(seconds)
- scene.moveTo(id, {x, y, z}, duration)
- scene.moveBy(id, {x, y, z}, duration)
- scene.moveZ(id, z, duration)
- scene.rotate(id, degrees, duration) // Z-axis rotation
- scene.rotateX(id, degrees, duration) // 3D X-axis
- scene.rotateY(id, degrees, duration) // 3D Y-axis
- scene.rotateBy(id, degrees, duration)
- scene.scale(id, factor, duration)
- scene.resize(id, size, duration)
- scene.changeColor(id, color, duration)
- scene.fadeOut(id, duration) / scene.fadeIn(id, duration)
- scene.count(id, endValue, duration)
- scene.typeWriter(id, duration)
- scene.update(id, props, duration, easing?)
- scene.playTogether([ (s) => s.move(...), (s) => s.scale(...) ])
- scene.nextPage(duration)

Special Effects:
- scene.wiggle(id, duration, strength)
- scene.pulse(id, duration, scaleFactor)
- scene.shake(id, duration, strength)
- scene.glow(id, { color, strength }, duration)

Coordinate System:
- 1920x1080 canvas. 
- Center (960, 540) is roughly 0,0 in 3D projection logic but API uses screen coordinates for x,y.
- Z axis: Positive Z moves AWAY from camera (into background). Negative Z moves towards camera. (Assuming standard projection).

Rules:
1. ONLY return the code inside the function body.
2. Use 'const' or 'let'.
3. Do not use Markdown backticks.
4. Escape backslashes in LaTeX (\\\\pi).

Example Request: "Show a rotating cube"
Example Output:
const cube = scene.addScene(s => Scenes.Cube3D(s, 200, '#3b82f6'), { x: 960, y: 540 });
scene.rotateX(cube, 360, 4);
scene.rotateY(cube, 360, 4);
`;

export const generateScript = async (prompt: string): Promise<string> => {
    if (!apiKey) {
        console.warn("No API Key provided for Gemini");
        return "// Error: No API Key configured for AI generation.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User Request: ${prompt}`,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.2, // Low temperature for deterministic code
            }
        });

        let code = response.text || '';
        
        // Cleanup markdown if present
        code = code.replace(/```javascript/g, '').replace(/```typescript/g, '').replace(/```/g, '').trim();
        
        return code;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "// Error generating script. Please check console.";
    }
};