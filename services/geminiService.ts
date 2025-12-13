import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// System instruction to guide Gemini on how to write scripts for our specific engine
const SYSTEM_PROMPT = `
You are an expert animation scripter for the "MotionScript" engine.
Your goal is to translate natural language requests into valid JavaScript/TypeScript code that runs in the engine.

Available API:
- scene.addCircle({ x, y, radius, color, opacity }) -> returns id. opacity defaults to 1.
- scene.addRect({ x, y, width, height, color, opacity }) -> returns id
- scene.addText({ text, x, y, fontSize, color, opacity }) -> returns id
- scene.addLine({ p1: {x,y}, p2: {x,y}, thickness, color, opacity }) -> returns id
- scene.addArrow({ p1: {x,y}, p2: {x,y}, thickness, color, opacity }) -> returns id
- scene.addMath({ latex: "E=mc^2", x, y, color, scale, opacity }) -> returns id. Renders LaTeX.
- scene.wait(seconds)
- scene.moveTo(id, {x, y}, duration)
- scene.moveBy(id, {x, y}, duration) -> relative movement (e.g., move right by 100)
- scene.arc(id, {x, y}, angleDegrees, duration) -> orbit around a center point by X degrees.
- scene.scale(id, factor, duration) -> uniform transform scale
- scene.resize(id, size, duration) -> geometry resize. size can be number (radius/length) or {width, height}.
- scene.changeColor(id, color, duration)
- scene.fadeOut(id, duration)
- scene.fadeIn(id, duration)
- scene.count(id, endValue, duration) -> animates a number in a text object
- scene.typeWriter(id, duration) -> Animates text typing out character by character.
  * NOTE: When using typeWriter, initialize the text with opacity: 0 so it starts invisible.
- scene.playTogether([ (s) => s.moveTo(...), (s) => s.scale(...) ])

Coordinate System:
- 0,0 is top-left.
- 1920, 1080 is bottom-right.
- Center is roughly 960, 540.

Rules:
1. ONLY return the code inside the function body. Do not return the function wrapper itself.
2. Variable declarations should use 'const' or 'let'.
3. Do not use Markdown backticks. Just raw text if possible, or clean them up.
4. Keep animations smooth (1-2 seconds usually).
5. Colors can be hex or standard names.
6. For LaTeX strings, use standard JavaScript string escaping. To get a single backslash in the string (required for LaTeX commands like \\pi), you must type TWO backslashes in the code (\\\\pi).

Example Request: "Show euler's identity"
Example Output:
const eq = scene.addMath({ latex: "e^{i\\\\pi} + 1 = 0", x: 960, y: 540, color: 'white' });
scene.fadeIn(eq, 1.0);
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