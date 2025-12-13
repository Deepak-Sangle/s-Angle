import { Action, ActionType, TimelineData, VisualObject, Vector2, ColorProp } from '../types';

// Easing functions
const Easings = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutBounce: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
    easeOutElastic: (x: number) => {
        const c4 = (2 * Math.PI) / 3;
        return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
};

// Interfaces for Scenes
interface BarChartItem {
    label: string;
    value: number;
    color?: string;
}

interface BarChartConfig {
    width?: number; // Max width of bars in pixels
    barHeight?: number;
    gap?: number;
    domain?: [number, number]; // [min, max] value for scaling
    color?: string; // Default color
}

// Predefined Scenes Library
export const Scenes = {
    Grid: (scene: VideoContext, size: number = 1000, step: number = 100) => {
        // Grid Lines
        for (let i = -size; i <= size; i += step) {
             // Vertical
             scene.addLine({ p1: {x: i, y: -size}, p2: {x: i, y: size}, thickness: 1, color: '#334155', opacity: 0.5 });
             // Horizontal
             scene.addLine({ p1: {x: -size, y: i}, p2: {x: size, y: i}, thickness: 1, color: '#334155', opacity: 0.5 });
        }
        
        // Axes
        const xAxis = scene.addArrow({ p1: {x: -size, y: 0}, p2: {x: size, y: 0}, thickness: 3, color: '#94a3b8' });
        const yAxis = scene.addArrow({ p1: {x: 0, y: size}, p2: {x: 0, y: -size}, thickness: 3, color: '#94a3b8' }); // Upward

        return { xAxis, yAxis };
    },
    
    // Low-level single bar (kept for legacy/granular use)
    BarGraph: (scene: VideoContext, width: number = 200, label: string = "Value", color: string = "#60a5fa") => {
        const bar = scene.addRect({
            x: 0, y: 0, width: width, height: 40,
            color: color,
            anchor: { x: 0, y: 0.5 },
            borderRadius: 4
        });
        
        const text = scene.addText({
            text: label,
            x: -20, y: 0, // Left of the bar
            fontSize: 24,
            color: '#e2e8f0',
            anchor: { x: 1, y: 0.5 } // Right align
        });
        
        const valueLabel = scene.addText({
            text: Math.round(width).toString(),
            x: width + 20, y: 0,
            fontSize: 24,
            color: '#94a3b8',
            anchor: { x: 0, y: 0.5 }
        });

        return { bar, text, valueLabel };
    },

    // High-level Bar Chart Container
    BarChart: (scene: VideoContext, items: BarChartItem[], config: BarChartConfig = {}) => {
        const width = config.width || 600;
        const barHeight = config.barHeight || 40;
        const gap = config.gap || 20;
        const maxVal = config.domain ? config.domain[1] : Math.max(...items.map(i => i.value));
        const defaultColor = config.color || '#60a5fa';

        // Axis Line
        const axisId = scene.addLine({
            p1: { x: 0, y: -gap },
            p2: { x: 0, y: items.length * (barHeight + gap) },
            thickness: 2,
            color: '#cbd5e1'
        });

        const elements: any = {};

        items.forEach((item, index) => {
            const yPos = index * (barHeight + gap);
            const barWidth = (item.value / maxVal) * width;
            
            // 1. Label
            const labelId = scene.addText({
                text: item.label,
                x: -15, y: yPos,
                fontSize: 24,
                color: '#e2e8f0',
                anchor: { x: 1, y: 0.5 },
                fontWeight: 500
            });

            // 2. Bar
            const barId = scene.addRect({
                x: 0, y: yPos,
                width: barWidth,
                height: barHeight,
                color: item.color || defaultColor,
                anchor: { x: 0, y: 0.5 },
                borderRadius: 4
            });

            // 3. Value
            const valueId = scene.addText({
                text: Math.round(item.value).toString(),
                x: barWidth + 15, y: yPos,
                fontSize: 24,
                color: '#94a3b8',
                anchor: { x: 0, y: 0.5 }
            });

            elements[item.label] = { labelId, barId, valueId, currentVal: item.value };
        });

        return { 
            type: 'BAR_CHART',
            elements,
            config: { width, barHeight, gap, maxVal, defaultColor }
        };
    },

    // Helper to update a BarChart instance
    updateChart: (scene: VideoContext, chart: any, newData: BarChartItem[], options: { duration: number, stagger?: number }) => {
        if (chart.type !== 'BAR_CHART') {
            console.warn("Invalid chart object passed to updateChart");
            return;
        }

        const duration = options.duration || 1.0;
        const stagger = options.stagger || 0;
        const baseTime = scene.currentTime;

        newData.forEach((item, index) => {
            const el = chart.elements[item.label];
            if (!el) return; // Skip if label doesn't exist

            const delay = index * stagger;
            const newWidth = (item.value / chart.config.maxVal) * chart.config.width;
            
            // 1. Resize Bar
            // We set time, call update (which increments time), then reset time for next action
            scene.currentTime = baseTime + delay;
            scene.update(el.barId, { width: newWidth }, duration, 'easeOutCubic');

            // 2. Move Value Label
            scene.currentTime = baseTime + delay;
            scene.update(el.valueId, { x: newWidth + 15 }, duration, 'easeOutCubic');

            // 3. Count Text
            scene.currentTime = baseTime + delay;
            scene.count(el.valueId, item.value, duration);
            
            // Update internal state tracking
            el.currentVal = item.value;
        });

        // Advance time by total duration + stagger
        scene.currentTime = baseTime + duration + Math.max(0, newData.length - 1) * stagger;
    }
};

interface BaseProps {
    x: number;
    y: number;
    color?: ColorProp; // Defaults to white/transparent depending on object
    opacity?: number;
    anchor?: Vector2;
    // Styling
    backgroundColor?: ColorProp;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
}

type TargetId = string | { id: string };

export class VideoContext {
    currentTime: number = 0;
    actions: Action[] = [];
    initialObjects: Map<string, VisualObject> = new Map();
    // Track current state during "compilation" to know start values for next actions
    currentObjectStates: Map<string, VisualObject> = new Map();

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
    
    private resolveId(target: TargetId): string {
        if (typeof target === 'object' && target !== null && 'id' in target) {
            return target.id;
        }
        return target as string;
    }

    // --- Nouns (Creation) ---

    addCircle(props: BaseProps & { radius: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'CIRCLE',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color || '#ffffff',
            radius: props.radius,
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor,
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: 0 
        };
        
        // Register initial state
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        // Implicit create action (instant)
        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });

        return id;
    }

    addRect(props: BaseProps & { width: number; height: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'RECT',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color || '#ffffff',
            width: props.width,
            height: props.height,
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor, // Usually unused for Rect as color=fill
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: props.borderRadius || 0
        };
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });
        
        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });
        return id;
    }

    addText(props: BaseProps & { 
        text: string; 
        fontSize: number; 
        fontStyle?: string; 
        fontWeight?: string | number; 
        fontFamily?: string; 
    }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'TEXT',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color || '#ffffff',
            text: props.text,
            fontSize: props.fontSize,
            fontStyle: props.fontStyle,
            fontWeight: props.fontWeight,
            fontFamily: props.fontFamily,
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor,
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: props.borderRadius || 0
        };
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });
        return id;
    }

    addMath(props: BaseProps & { latex: string; scale?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'MATH',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: props.scale ?? 1,
            opacity: props.opacity ?? 1,
            color: props.color || '#ffffff',
            latex: props.latex,
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor,
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: props.borderRadius || 0
        };
        
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });
        return id;
    }

    addLine(props: { p1: Vector2; p2: Vector2; thickness: number; color: string; opacity?: number }): string {
        const id = this.generateId();
        
        // Calculate Center
        const cx = (props.p1.x + props.p2.x) / 2;
        const cy = (props.p1.y + props.p2.y) / 2;
        
        // Calculate Length (Width)
        const dx = props.p2.x - props.p1.x;
        const dy = props.p2.y - props.p1.y;
        const length = Math.sqrt(dx*dx + dy*dy);
        
        // Calculate Rotation
        const angle = Math.atan2(dy, dx);

        const obj: VisualObject = {
            id,
            type: 'LINE',
            x: cx,
            y: cy,
            rotation: angle,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color,
            width: length,
            height: props.thickness,
            anchor: { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            // Lines ignore borders/backgrounds for now
        };

        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });

        return id;
    }

    addArrow(props: { p1: Vector2; p2: Vector2; thickness: number; color: string; opacity?: number }): string {
        // Reuse line logic, just change type
        const id = this.addLine(props);
        const obj = this.initialObjects.get(id);
        if (obj) {
            obj.type = 'ARROW';
            const currentObj = this.currentObjectStates.get(id);
            if(currentObj) currentObj.type = 'ARROW';
        }
        return id;
    }

    addDottedLine(props: { p1: Vector2; p2: Vector2; thickness: number; color: string; dash?: number[]; opacity?: number }): string {
        const id = this.addLine(props);
        const obj = this.initialObjects.get(id);
        const currentObj = this.currentObjectStates.get(id);
        
        // Default dash pattern [20px line, 20px gap]
        const dashPattern = props.dash || [20, 20];

        if (obj) {
            obj.lineDash = dashPattern;
        }
        if (currentObj) {
            currentObj.lineDash = dashPattern;
        }

        return id;
    }

    addImage(props: BaseProps & { url: string; width?: number; height?: number; scale?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'IMAGE',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: props.scale ?? 1,
            opacity: props.opacity ?? 1,
            color: 'transparent',
            imageUrl: props.url,
            width: props.width ?? 200, // Default width if none provided
            height: props.height, // Optional, renderer will calc if missing
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor,
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: props.borderRadius || 0
        };
        
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });
        return id;
    }

    // --- Sub-Scenes / Groups ---
    
    // Internal use or explicit group creation
    addGroup(props: BaseProps & { scale?: number; rotation?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'GROUP',
            x: props.x,
            y: props.y,
            rotation: props.rotation ?? 0,
            scale: props.scale ?? 1,
            opacity: props.opacity ?? 1,
            color: 'transparent',
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent'
        };
        
        this.initialObjects.set(id, { ...obj });
        this.currentObjectStates.set(id, { ...obj });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: id,
            startTime: this.currentTime,
            duration: 0
        });
        return id;
    }

    group(objectIds: string[], props?: Partial<BaseProps>): string {
        const objects = objectIds
            .map(id => this.initialObjects.get(id))
            .filter(o => !!o) as VisualObject[];
        
        if (objects.length === 0) {
            console.warn("No valid objects to group.");
            return "";
        }

        let sumX = 0, sumY = 0;
        objects.forEach(o => {
            sumX += o.x;
            sumY += o.y;
        });
        
        const centerX = sumX / objects.length;
        const centerY = sumY / objects.length;

        const groupId = this.addGroup({
            x: centerX,
            y: centerY,
            ...props
        } as any);

        objects.forEach(initialObj => {
            const currentObj = this.currentObjectStates.get(initialObj.id);

            initialObj.parentId = groupId;
            initialObj.x -= centerX;
            initialObj.y -= centerY;

            if (currentObj) {
                currentObj.parentId = groupId;
                currentObj.x -= centerX;
                currentObj.y -= centerY;
            }
        });

        return groupId;
    }

    ungroup(groupId: TargetId) {
        const id = this.resolveId(groupId);
        const groupInitial = this.initialObjects.get(id);
        if (!groupInitial || groupInitial.type !== 'GROUP') return;

        this.initialObjects.forEach(initialChild => {
            if (initialChild.parentId === id) {
                const currentChild = this.currentObjectStates.get(initialChild.id);

                initialChild.x += groupInitial.x;
                initialChild.y += groupInitial.y;
                initialChild.parentId = undefined;

                if (currentChild) {
                    currentChild.x += groupInitial.x; 
                    currentChild.y += groupInitial.y;
                    currentChild.parentId = undefined;
                }
            }
        });
    }

    addScene<T = void>(sceneFn: (scene: VideoContext) => T, props: BaseProps & { scale?: number }): { id: string } & T {
        const groupId = this.addGroup({
            x: props.x,
            y: props.y,
            scale: props.scale,
            opacity: props.opacity,
            anchor: props.anchor
        });

        const subContext = new VideoContext();
        const result = sceneFn(subContext);
        
        const timeline = subContext.getTimeline();
        
        timeline.objects.forEach((obj) => {
            const importedObj = { ...obj, parentId: groupId };
            this.initialObjects.set(importedObj.id, importedObj);
            this.currentObjectStates.set(importedObj.id, { ...importedObj });
        });

        const timeOffset = this.currentTime;
        
        timeline.actions.forEach(action => {
            this.actions.push({
                ...action,
                id: this.generateId(), 
                startTime: action.startTime + timeOffset
            });
        });
        
        // Return a hybrid object: It has an 'id' for the group, but also merged properties from the scene function result.
        // If T is void or null, it's just { id }.
        // If T is { bar: '...' }, result is { id: '...', bar: '...' }.
        if (typeof result === 'object' && result !== null) {
            return { id: groupId, ...result };
        }
        return { id: groupId } as any;
    }

    // --- Verbs (Actions) ---

    wait(duration: number) {
        this.currentTime += duration;
    }

    // Generic Update Property
    update(target: TargetId, props: Partial<VisualObject>, duration: number = 0, easing: string = 'easeInOutCubic') {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const startValues: any = {};
        const endValues: any = { ...props };

        if (props.anchor && props.x === undefined && props.y === undefined) {
             const oldAnchor = current.anchor || { x: 0.5, y: 0.5 };
             const newAnchor = props.anchor;
             
             let w = current.width || 0;
             let h = current.height || 0;

             if (current.type === 'CIRCLE') {
                 const r = current.radius || 0;
                 w = r * 2;
                 h = r * 2;
             }

             const dx = (newAnchor.x - oldAnchor.x) * w;
             const dy = (newAnchor.y - oldAnchor.y) * h;
             
             const s = current.scale;
             const rad = current.rotation;
             const cos = Math.cos(rad);
             const sin = Math.sin(rad);

             const sx = dx * s;
             const sy = dy * s;

             const worldDx = sx * cos - sy * sin;
             const worldDy = sx * sin + sy * cos;
             
             endValues.x = current.x + worldDx;
             endValues.y = current.y + worldDy;
        }
        
        Object.keys(endValues).forEach(key => {
            startValues[key] = (current as any)[key];
        });

        this.actions.push({
            id: this.generateId(),
            type: ActionType.UPDATE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startValues,
            endValue: endValues,
            easing: easing
        });

        Object.assign(current, endValues);
        this.currentTime += duration;
    }

    moveTo(target: TargetId, pos: Vector2, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.MOVE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: { x: current.x, y: current.y },
            endValue: pos,
            easing: 'easeInOutCubic'
        });

        current.x = pos.x;
        current.y = pos.y;
        this.currentTime += duration;
    }

    moveBy(target: TargetId, delta: Vector2, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        
        const targetPos = { x: current.x + delta.x, y: current.y + delta.y };
        this.moveTo(id, targetPos, duration);
    }

    arc(target: TargetId, center: Vector2, angleDegrees: number, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const dx = current.x - center.x;
        const dy = current.y - center.y;
        const radius = Math.sqrt(dx*dx + dy*dy);
        const startAngle = Math.atan2(dy, dx);
        const angleRad = angleDegrees * (Math.PI / 180);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.ARC,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: { centerX: center.x, centerY: center.y, radius, startAngle },
            endValue: angleRad,
            easing: 'easeInOutCubic'
        });

        const endAngle = startAngle + angleRad;
        current.x = center.x + radius * Math.cos(endAngle);
        current.y = center.y + radius * Math.sin(endAngle);
        this.currentTime += duration;
    }

    scale(target: TargetId, factor: number, duration: number) {
        this.update(target, { scale: factor }, duration);
    }

    rotate(target: TargetId, degrees: number, duration: number, direction: 'CW' | 'CCW' | 'SHORT' = 'SHORT') {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const startVal = current.rotation;
        let endVal = degrees * (Math.PI / 180); 

        const PI2 = Math.PI * 2;
        
        if (direction === 'CW') {
             if (endVal <= startVal) {
                 const diff = startVal - endVal;
                 const rotations = Math.floor(diff / PI2) + 1;
                 endVal += rotations * PI2;
             }
        } else if (direction === 'CCW') {
             if (endVal >= startVal) {
                 const diff = endVal - startVal;
                 const rotations = Math.floor(diff / PI2) + 1;
                 endVal -= rotations * PI2;
             }
        }
        
        this.actions.push({
            id: this.generateId(),
            type: ActionType.ROTATE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startVal,
            endValue: endVal,
            easing: 'easeInOutCubic'
        });

        current.rotation = endVal;
        this.currentTime += duration;
    }

    rotateBy(target: TargetId, degrees: number, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        const deltaRad = degrees * (Math.PI / 180);
        this.update(id, { rotation: current.rotation + deltaRad }, duration);
    }

    resize(target: TargetId, val: number | { width?: number, height?: number, radius?: number, length?: number, thickness?: number }, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const props: any = {};
        if (typeof val === 'number') {
             if (current.type === 'CIRCLE') props.radius = val;
             else if (current.type === 'LINE' || current.type === 'ARROW') props.width = val;
             else if (current.type === 'IMAGE') props.width = val;
             else if (current.type === 'RECT') props.width = val;
        } else {
            if (val.width !== undefined) props.width = val.width;
            if (val.height !== undefined) props.height = val.height;
            if (val.radius !== undefined) props.radius = val.radius;
            if (val.length !== undefined) props.width = val.length;
            if (val.thickness !== undefined) props.height = val.thickness;
        }
        this.update(id, props, duration);
    }

    changeColor(target: TargetId, color: string, duration: number) {
        this.update(target, { color }, duration);
    }

    fadeOut(target: TargetId, duration: number) {
        this.update(target, { opacity: 0 }, duration);
    }

    fadeIn(target: TargetId, duration: number) {
        this.update(target, { opacity: 1 }, duration);
    }

    count(target: TargetId, endValue: number, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        const startVal = parseFloat(current.text || '0');
        
        this.actions.push({
            id: this.generateId(),
            type: ActionType.COUNT,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startVal,
            endValue: endValue,
            easing: 'linear'
        });

        current.text = String(endValue);
        this.currentTime += duration;
    }

    typeWriter(target: TargetId, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        const fullText = current.text || '';

        this.actions.push({
            id: this.generateId(),
            type: ActionType.TYPEWRITER,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: 0,
            endValue: fullText, 
            easing: 'linear'
        });
        current.opacity = 1;
        this.currentTime += duration;
    }

    wiggle(target: TargetId, duration: number, strength: number = 10) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.WIGGLE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.rotation,
            endValue: strength * (Math.PI / 180),
            easing: 'linear'
        });
        this.currentTime += duration;
    }

    pulse(target: TargetId, duration: number, scaleFactor: number = 1.2) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.PULSE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.scale,
            endValue: scaleFactor,
            easing: 'linear'
        });
        this.currentTime += duration;
    }

    shake(target: TargetId, duration: number, strength: number = 10) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.SHAKE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.x,
            endValue: strength,
            easing: 'linear'
        });
        this.currentTime += duration;
    }

    glow(target: TargetId, options: { color?: string, strength?: number }, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const targetColor = options.color ?? current.shadowColor;
        const targetBlur = options.strength ?? 20;
        
        this.actions.push({
            id: this.generateId(),
            type: ActionType.GLOW,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: { blur: current.shadowBlur, color: current.shadowColor },
            endValue: { blur: targetBlur, color: targetColor },
            easing: 'easeInOutCubic'
        });

        current.shadowBlur = targetBlur;
        current.shadowColor = targetColor;
        this.currentTime += duration;
    }

    playTogether(tasks: Array<(scene: VideoContext) => void>) {
        const startTime = this.currentTime;
        let maxDuration = 0;
        
        const startStates = new Map<string, VisualObject>();
        
        tasks.forEach(task => {
            this.currentTime = startTime; 
            task(this); 
            const taskDuration = this.currentTime - startTime;
            if (taskDuration > maxDuration) maxDuration = taskDuration;
        });

        this.currentTime = startTime + maxDuration;
    }

    nextPage(duration: number = 1.0) {
        const ids = Array.from(this.currentObjectStates.keys());
        // Use playTogether to run fadeOut in parallel for all active objects
        this.playTogether(ids.map(id => (s) => {
            const obj = s.currentObjectStates.get(id);
            // Only fade things that are visible
            if (obj && obj.opacity > 0) {
                s.fadeOut(id, duration);
            }
        }));
    }

    getTimeline(): TimelineData {
        return {
            duration: this.currentTime,
            actions: this.actions,
            objects: this.initialObjects
        };
    }
}

// Scene Graph Resolution Helper
const resolveHierarchy = (objects: Map<string, VisualObject>): VisualObject[] => {
    const resolved = new Map<string, VisualObject>();
    
    // Build adjacency list
    const childrenMap = new Map<string, string[]>();
    const roots: string[] = [];

    objects.forEach((obj, id) => {
        if (obj.parentId) {
            if (!childrenMap.has(obj.parentId)) childrenMap.set(obj.parentId, []);
            childrenMap.get(obj.parentId)?.push(id);
        } else {
            roots.push(id);
        }
    });

    const resolveNode = (id: string, parentTransform?: { x: number, y: number, scale: number, rotation: number, opacity: number }) => {
        const obj = objects.get(id);
        if (!obj) return;

        const worldObj = { ...obj };

        if (parentTransform) {
            const rad = parentTransform.rotation;
            const s = parentTransform.scale;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const lx = worldObj.x; 
            const ly = worldObj.y; 

            const rx = (lx * cos - ly * sin) * s;
            const ry = (lx * sin + ly * cos) * s;

            worldObj.x = parentTransform.x + rx;
            worldObj.y = parentTransform.y + ry;

            worldObj.scale = worldObj.scale * s;
            worldObj.rotation = worldObj.rotation + rad;
            worldObj.opacity = worldObj.opacity * parentTransform.opacity;
        }

        resolved.set(id, worldObj);

        const children = childrenMap.get(id);
        if (children) {
            children.forEach(childId => {
                resolveNode(childId, {
                    x: worldObj.x,
                    y: worldObj.y,
                    scale: worldObj.scale,
                    rotation: worldObj.rotation,
                    opacity: worldObj.opacity
                });
            });
        }
    };

    roots.forEach(rootId => resolveNode(rootId));

    return Array.from(resolved.values());
};

// The Renderer Logic
export const renderSceneAtTime = (timeline: TimelineData, time: number): VisualObject[] => {
    const objects = new Map<string, VisualObject>();
    
    timeline.objects.forEach((obj, id) => {
        objects.set(id, JSON.parse(JSON.stringify(obj)));
    });

    const activeActions = timeline.actions.filter(a => a.startTime <= time);
    activeActions.sort((a, b) => a.startTime - b.startTime);

    activeActions.forEach(action => {
        if (!action.objectId) return;
        const obj = objects.get(action.objectId);
        if (!obj) return;

        let t = 0;
        if (action.duration === 0) {
            t = 1;
        } else {
            const rawT = (time - action.startTime) / action.duration;
            t = Math.min(Math.max(rawT, 0), 1);
        }

        const easedT = action.easing && (Easings as any)[action.easing] 
            ? (Easings as any)[action.easing](t) 
            : t;

        switch (action.type) {
            case ActionType.MOVE:
                if (action.startValue && action.endValue) {
                    obj.x = action.startValue.x + (action.endValue.x - action.startValue.x) * easedT;
                    obj.y = action.startValue.y + (action.endValue.y - action.startValue.y) * easedT;
                }
                break;
            case ActionType.ARC:
                 if (action.startValue && typeof action.endValue === 'number') {
                    const { centerX, centerY, radius, startAngle } = action.startValue;
                    const angleDelta = action.endValue;
                    const currentAngle = startAngle + angleDelta * easedT;
                    
                    obj.x = centerX + radius * Math.cos(currentAngle);
                    obj.y = centerY + radius * Math.sin(currentAngle);
                }
                break;
            case ActionType.ROTATE:
                if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    obj.rotation = action.startValue + (action.endValue - action.startValue) * easedT;
                }
                break;
            case ActionType.COUNT:
                if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    const val = action.startValue + (action.endValue - action.startValue) * easedT;
                    obj.text = Math.round(val).toString();
                }
                break;
            case ActionType.TYPEWRITER:
                obj.opacity = 1;
                const fullText = action.endValue;
                if (typeof fullText === 'string') {
                    const charCount = Math.floor(fullText.length * easedT);
                    obj.text = fullText.substring(0, charCount);
                }
                break;
            case ActionType.WIGGLE:
                if (t < 1) {
                    const strength = action.endValue;
                    const decay = 1 - t;
                    const wave = Math.sin(t * Math.PI * 10) * strength * decay;
                    obj.rotation = action.startValue + wave;
                } else {
                    obj.rotation = action.startValue;
                }
                break;
            case ActionType.PULSE:
                if (t < 1) {
                    const val = Math.sin(t * Math.PI);
                    const targetScale = action.endValue;
                    const diff = targetScale - action.startValue;
                    obj.scale = action.startValue + diff * val;
                } else {
                    obj.scale = action.startValue;
                }
                break;
            case ActionType.SHAKE:
                if (t < 1) {
                    const strength = action.endValue;
                    const decay = 1 - t;
                    const wave = Math.sin(t * Math.PI * 20) * strength * decay;
                    obj.x = action.startValue + wave;
                } else {
                    obj.x = action.startValue;
                }
                break;
            case ActionType.GLOW:
                const startGlow = action.startValue;
                const endGlow = action.endValue;
                obj.shadowBlur = startGlow.blur + (endGlow.blur - startGlow.blur) * easedT;
                if (t > 0) obj.shadowColor = endGlow.color;
                break;
            case ActionType.UPDATE:
                const startProps = action.startValue;
                const endProps = action.endValue;
                Object.keys(endProps).forEach(key => {
                    const s = startProps[key];
                    const e = endProps[key];
                    
                    if (typeof s === 'number' && typeof e === 'number') {
                         (obj as any)[key] = s + (e - s) * easedT;
                    } else if (key === 'color' || key === 'borderColor' || key === 'backgroundColor') {
                        // Simple switch for colors for now (or improve to linear RGB later)
                         (obj as any)[key] = t >= 0.5 ? e : s;
                    } else if (key === 'anchor') {
                        // Vector2 interpolation
                        obj.anchor = {
                            x: s.x + (e.x - s.x) * easedT,
                            y: s.y + (e.y - s.y) * easedT
                        };
                    } else {
                        // Immediate switch for strings, etc.
                        (obj as any)[key] = e;
                    }
                });
                break;
        }
    });

    const resolvedObjects = resolveHierarchy(objects);

    return resolvedObjects;
};