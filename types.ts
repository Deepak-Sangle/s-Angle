// Engine Types
export enum ActionType {
    CREATE = 'CREATE',
    MOVE = 'MOVE',
    ARC = 'ARC',
    SCALE = 'SCALE',
    ROTATE = 'ROTATE',
    RESIZE = 'RESIZE',
    COLOR = 'COLOR',
    FADE_OUT = 'FADE_OUT',
    FADE_IN = 'FADE_IN',
    COUNT = 'COUNT',
    WAIT = 'WAIT',
    TYPEWRITER = 'TYPEWRITER',
    WIGGLE = 'WIGGLE',
    PULSE = 'PULSE',
    SHAKE = 'SHAKE',
    GLOW = 'GLOW',
    UPDATE = 'UPDATE'
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface GradientStop {
    offset: number; // 0 to 1
    color: string;
}

export interface LinearGradient {
    type: 'linear';
    x1: number; y1: number; // Relative 0-1 to object bounding box
    x2: number; y2: number;
    stops: GradientStop[];
}

export interface RadialGradient {
    type: 'radial';
    x1: number; y1: number; r1: number; // Relative
    x2: number; y2: number; r2: number;
    stops: GradientStop[];
}

export type ColorProp = string | LinearGradient | RadialGradient;

export interface VisualObject {
    id: string;
    type: 'CIRCLE' | 'RECT' | 'TEXT' | 'LINE' | 'ARROW' | 'MATH' | 'IMAGE' | 'GROUP';
    x: number;
    y: number;
    rotation: number;
    scale: number;
    opacity: number;
    color: ColorProp; // Main Fill / Text Color
    parentId?: string; // For nested scenes
    anchor?: Vector2; // Pivot point (0-1). Default is {x: 0.5, y: 0.5}
    
    // Advanced Styling
    backgroundColor?: ColorProp; // Box background (behind text/math/image)
    borderColor?: string; // Stroke color
    borderWidth?: number; // Stroke width
    borderRadius?: number; // Corner radius (for Rects and Background boxes)

    // Text Styling
    fontStyle?: string; // 'normal', 'italic'
    fontWeight?: string | number; // 'normal', 'bold', 100-900
    fontFamily?: string; // 'Inter', 'JetBrains Mono', 'serif', etc.

    // Glow/Shadow Props
    shadowBlur: number;
    shadowColor: string;

    // Specific props
    radius?: number;
    width?: number; // Used for Rect width, Line length, Image width
    height?: number; // Used for Rect height, Line thickness, Image height
    text?: string;
    fontSize?: number;
    latex?: string; // For MATH type
    imageUrl?: string; // For IMAGE type
    lineDash?: number[]; // Array of dash lengths [dash, gap, dash, gap...]
}

export interface Action {
    id: string;
    type: ActionType;
    objectId?: string; // Null for global waits
    startTime: number;
    duration: number;
    startValue?: any;
    endValue?: any;
    easing?: string; // 'linear', 'ease-in-out'
}

export interface TimelineData {
    duration: number;
    actions: Action[];
    objects: Map<string, VisualObject>; // Initial states
}

export interface RenderState {
    objects: VisualObject[];
}

// App Types
export interface ScriptError {
    line?: number;
    message: string;
}