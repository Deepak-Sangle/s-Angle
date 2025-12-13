import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// System instruction to guide Gemini on how to write scripts for our specific engine
const SYSTEM_PROMPT = `
You are an expert animation scripter for the "MotionScript" engine.
Your goal is to translate natural language requests into valid JavaScript/TypeScript code that runs in the engine.

Available API:
- scene.addCircle({ x, y, radius, color, opacity, anchor, borderColor, borderWidth }) -> returns id.
- scene.addRect({ x, y, width, height, color, opacity, anchor, borderRadius, borderColor, borderWidth }) -> returns id
  * Anchor defaults to {x: 0.5, y: 0.5} (Center). 
  * Use {x: 0, y: 0.5} to pivot from Left Middle.
- scene.addText({ text, x, y, fontSize, color, opacity, anchor, backgroundColor, borderRadius, borderColor, borderWidth, fontStyle, fontWeight, fontFamily }) -> returns id
- scene.addImage({ url, x, y, width, height, opacity, anchor, borderRadius, borderColor, borderWidth }) -> returns id.
- scene.addScene(sceneFunction, { x, y, scale, opacity }) -> Import a sub-scene. Returns an object: { id: string, ...refs }.
- scene.addMath({ latex, x, y, color, scale, opacity, anchor, backgroundColor, borderRadius }) -> returns id.

Predefined Scenes (Global 'Scenes' object):
- Scenes.Grid(scene, size?, step?) -> Draws a grid.
- Scenes.BarChart(scene, items: {label, value, color}[], config: {width, barHeight, gap, domain?}) -> Creates a complete Bar Chart.
  * Usage: 
    const chart = scene.addScene(
       (s) => Scenes.BarChart(s, [{label:'A', value:10}, {label:'B', value:20}], { width: 500 }), 
       { x: 100, y: 100 }
    );
- Scenes.updateChart(scene, chartRef, newData: {label, value}[], options: { duration, stagger }) -> Automatically animates the chart to new values.
  * Usage: Scenes.updateChart(scene, chart, [{label:'A', value:50}, {label:'B', value:80}], { duration: 1.5, stagger: 0.2 });

Hierarchy:
- scene.group([id1, id2...]) -> returns groupId.
- scene.ungroup(groupId).

Animation Actions:
- scene.wait(seconds)
- scene.moveTo(id, {x, y}, duration)
- scene.moveBy(id, {x, y}, duration)
- scene.rotate(id, degrees, duration, direction)
- scene.rotateBy(id, degrees, duration)
- scene.scale(id, factor, duration)
- scene.resize(id, size, duration)
- scene.changeColor(id, color, duration)
- scene.fadeOut(id, duration) / scene.fadeIn(id, duration)
- scene.count(id, endValue, duration)
- scene.typeWriter(id, duration)
- scene.update(id, props, duration, easing?)
  * Easings: 'linear', 'easeOutBounce', 'easeOutElastic', 'easeInOutCubic', etc.
- scene.playTogether([ (s) => s.move(...), (s) => s.scale(...) ])

Scene Management:
- scene.nextPage(duration) -> Fades out all current objects to clear the stage for the next section.

Special Effects:
- scene.wiggle(id, duration, strength)
- scene.pulse(id, duration, scaleFactor)
- scene.shake(id, duration, strength)
- scene.glow(id, { color, strength }, duration)

Coordinate System:
- 1920x1080 canvas. Top-Left is 0,0.

Rules:
1. ONLY return the code inside the function body.
2. Use 'const' or 'let'.
3. Do not use Markdown backticks.
4. Escape backslashes in LaTeX (\\\\pi).

Example Request: "Show a title then move to a chart"
Example Output:
const title = scene.addText({ text: "Introduction", x: 960, y: 540, fontSize: 100 });
scene.fadeIn(title, 1);
scene.wait(1);
scene.nextPage(1);

const chart = scene.addScene((s) => Scenes.BarChart(s, ...), { x: 960, y: 540 });
// ...
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