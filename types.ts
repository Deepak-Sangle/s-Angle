// Engine Types
export enum ActionType {
    CREATE = 'CREATE',
    MOVE = 'MOVE',
    ARC = 'ARC',
    SCALE = 'SCALE',
    RESIZE = 'RESIZE',
    COLOR = 'COLOR',
    FADE_OUT = 'FADE_OUT',
    FADE_IN = 'FADE_IN',
    COUNT = 'COUNT',
    WAIT = 'WAIT',
    TYPEWRITER = 'TYPEWRITER'
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface VisualObject {
    id: string;
    type: 'CIRCLE' | 'RECT' | 'TEXT' | 'LINE' | 'ARROW' | 'MATH';
    x: number;
    y: number;
    rotation: number;
    scale: number;
    opacity: number;
    color: string;
    // Specific props
    radius?: number;
    width?: number; // Used for Rect width, Line length
    height?: number; // Used for Rect height, Line thickness
    text?: string;
    fontSize?: number;
    latex?: string; // For MATH type
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