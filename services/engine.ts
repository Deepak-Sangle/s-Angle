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
    },

    // 3D Cube Helper
    Cube3D: (scene: VideoContext, size: number, color: string) => {
        const half = size / 2;
        // Create 6 faces as squares
        // Front Face (z=-s/2)
        const f = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(f, { z: -half });
        
        // Back Face (z=s/2)
        const b = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(b, { z: half, rotationY: Math.PI });

        // Left Face (x=-s/2, rotY=90)
        const l = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(l, { x: -half, rotationY: -Math.PI/2 });
        // The rotation pivot is center. If we rotate 90deg Y, the plane runs along Z. 
        // But the "x" position is world X. So it sits at X=-half. Correct.

        // Right Face (x=s/2, rotY=90)
        const r = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(r, { x: half, rotationY: Math.PI/2 });

        // Top Face (y=-s/2, rotX=90)
        const t = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(t, { y: -half, rotationX: Math.PI/2 });

        // Bottom Face (y=s/2, rotX=90)
        const bot = scene.addSquare({ x: 0, y: 0, size, color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 });
        scene.update(bot, { y: half, rotationX: -Math.PI/2 });

        return { front: f, back: b, left: l, right: r, top: t, bottom: bot };
    }
};

interface BaseProps {
    x: number;
    y: number;
    z?: number;
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

    private createBaseObject(type: VisualObject['type'], props: BaseProps): VisualObject {
        return {
            id: this.generateId(),
            type,
            x: props.x,
            y: props.y,
            z: props.z || 0,
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color || '#ffffff',
            anchor: props.anchor || { x: 0.5, y: 0.5 },
            shadowBlur: 0,
            shadowColor: 'transparent',
            backgroundColor: props.backgroundColor,
            borderColor: props.borderColor,
            borderWidth: props.borderWidth || 0,
            borderRadius: props.borderRadius || 0
        };
    }

    private registerObject(obj: VisualObject) {
        this.initialObjects.set(obj.id, { ...obj });
        this.currentObjectStates.set(obj.id, { ...obj });
        this.actions.push({
            id: this.generateId(),
            type: ActionType.CREATE,
            objectId: obj.id,
            startTime: this.currentTime,
            duration: 0
        });
        return obj.id;
    }

    // --- Nouns (Creation) ---

    addCircle(props: BaseProps & { radius: number }): string {
        const obj = this.createBaseObject('CIRCLE', props);
        obj.radius = props.radius;
        return this.registerObject(obj);
    }

    addRect(props: BaseProps & { width: number; height: number }): string {
        const obj = this.createBaseObject('RECT', props);
        obj.width = props.width;
        obj.height = props.height;
        return this.registerObject(obj);
    }

    addSquare(props: BaseProps & { size: number }): string {
        return this.addRect({
            ...props,
            width: props.size,
            height: props.size
        });
    }

    addRegularPolygon(props: BaseProps & { radius: number, sides: number }): string {
        const obj = this.createBaseObject('REGULAR_POLYGON', props);
        obj.radius = props.radius;
        obj.sides = props.sides;
        return this.registerObject(obj);
    }

    addTriangle(props: BaseProps & { radius: number }): string {
        return this.addRegularPolygon({ ...props, sides: 3 });
    }

    addPolygon(props: BaseProps & { points: Vector2[] }): string {
        const obj = this.createBaseObject('POLYGON', props);
        obj.points = props.points;
        return this.registerObject(obj);
    }

    addRhombus(props: BaseProps & { width: number, height: number }): string {
        const w = props.width / 2;
        const h = props.height / 2;
        const points = [
            { x: 0, y: -h },
            { x: w, y: 0 },
            { x: 0, y: h },
            { x: -w, y: 0 }
        ];
        return this.addPolygon({ ...props, points });
    }

    addText(props: BaseProps & { 
        text: string; 
        fontSize: number; 
        fontStyle?: string; 
        fontWeight?: string | number; 
        fontFamily?: string; 
    }): string {
        const obj = this.createBaseObject('TEXT', props);
        obj.text = props.text;
        obj.fontSize = props.fontSize;
        obj.fontStyle = props.fontStyle;
        obj.fontWeight = props.fontWeight;
        obj.fontFamily = props.fontFamily;
        return this.registerObject(obj);
    }

    addMath(props: BaseProps & { latex: string; scale?: number }): string {
        const obj = this.createBaseObject('MATH', props);
        obj.latex = props.latex;
        obj.scale = props.scale ?? 1;
        return this.registerObject(obj);
    }

    addLine(props: { p1: Vector2; p2: Vector2; thickness: number; color: string; opacity?: number }): string {
        const cx = (props.p1.x + props.p2.x) / 2;
        const cy = (props.p1.y + props.p2.y) / 2;
        const dx = props.p2.x - props.p1.x;
        const dy = props.p2.y - props.p1.y;
        const length = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);

        const obj = this.createBaseObject('LINE', { x: cx, y: cy, color: props.color, opacity: props.opacity });
        obj.width = length;
        obj.height = props.thickness;
        obj.rotation = angle;
        
        return this.registerObject(obj);
    }

    addArrow(props: { p1: Vector2; p2: Vector2; thickness: number; color: string; opacity?: number }): string {
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
        const dashPattern = props.dash || [20, 20];
        if (obj) obj.lineDash = dashPattern;
        if (currentObj) currentObj.lineDash = dashPattern;
        return id;
    }

    addImage(props: BaseProps & { url: string; width?: number; height?: number; scale?: number }): string {
        const obj = this.createBaseObject('IMAGE', props);
        obj.imageUrl = props.url;
        obj.width = props.width ?? 200;
        obj.height = props.height;
        obj.scale = props.scale ?? 1;
        return this.registerObject(obj);
    }

    addMatrix(props: BaseProps & { 
        data: (string | number)[][]; 
        fontSize?: number;
        bracketStyle?: 'square' | 'round';
        cellSpacing?: Vector2;
        fontFamily?: string;
    }): string {
        const obj = this.createBaseObject('MATRIX', props);
        obj.matrixData = props.data;
        obj.fontSize = props.fontSize ?? 40;
        obj.bracketStyle = props.bracketStyle ?? 'square';
        obj.cellSpacing = props.cellSpacing ?? { x: 60, y: 60 };
        obj.fontFamily = props.fontFamily;
        return this.registerObject(obj);
    }

    // --- Sub-Scenes / Groups ---
    
    addGroup(props: BaseProps & { scale?: number; rotation?: number }): string {
        const obj = this.createBaseObject('GROUP', props);
        obj.rotation = props.rotation ?? 0;
        obj.scale = props.scale ?? 1;
        obj.color = 'transparent';
        return this.registerObject(obj);
    }

    group(objectIds: string[], props?: Partial<BaseProps>): string {
        const objects = objectIds
            .map(id => this.initialObjects.get(id))
            .filter(o => !!o) as VisualObject[];
        
        if (objects.length === 0) return "";

        let sumX = 0, sumY = 0, sumZ = 0;
        objects.forEach(o => {
            sumX += o.x;
            sumY += o.y;
            sumZ += o.z;
        });
        
        const centerX = sumX / objects.length;
        const centerY = sumY / objects.length;
        const centerZ = sumZ / objects.length;

        const groupId = this.addGroup({
            x: centerX,
            y: centerY,
            z: centerZ,
            ...props
        } as any);

        objects.forEach(initialObj => {
            const currentObj = this.currentObjectStates.get(initialObj.id);

            initialObj.parentId = groupId;
            initialObj.x -= centerX;
            initialObj.y -= centerY;
            initialObj.z -= centerZ;

            if (currentObj) {
                currentObj.parentId = groupId;
                currentObj.x -= centerX;
                currentObj.y -= centerY;
                currentObj.z -= centerZ;
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
                initialChild.z += groupInitial.z;
                initialChild.parentId = undefined;

                if (currentChild) {
                    currentChild.x += groupInitial.x; 
                    currentChild.y += groupInitial.y;
                    currentChild.z += groupInitial.z;
                    currentChild.parentId = undefined;
                }
            }
        });
    }

    addScene<T = void>(sceneFn: (scene: VideoContext) => T, props: BaseProps & { scale?: number }): { id: string } & T {
        const groupId = this.addGroup({
            x: props.x,
            y: props.y,
            z: props.z,
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
        
        if (typeof result === 'object' && result !== null) {
            return { id: groupId, ...result };
        }
        return { id: groupId } as any;
    }

    // --- Verbs (Actions) ---

    wait(duration: number) {
        this.currentTime += duration;
    }

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

    moveTo(target: TargetId, pos: {x?: number, y?: number, z?: number}, duration: number) {
        this.update(target, pos, duration);
    }
    
    moveBy(target: TargetId, delta: {x?: number, y?: number, z?: number}, duration: number) {
        const id = this.resolveId(target);
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        
        const props: any = {};
        if (delta.x !== undefined) props.x = current.x + delta.x;
        if (delta.y !== undefined) props.y = current.y + delta.y;
        if (delta.z !== undefined) props.z = current.z + delta.z;

        this.update(id, props, duration);
    }
    
    // Z-Depth move shortcut
    moveZ(target: TargetId, z: number, duration: number) {
        this.update(target, { z }, duration);
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
    
    rotateX(target: TargetId, degrees: number, duration: number) {
        this.update(target, { rotationX: degrees * (Math.PI / 180) }, duration);
    }

    rotateY(target: TargetId, degrees: number, duration: number) {
        this.update(target, { rotationY: degrees * (Math.PI / 180) }, duration);
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
             if (current.type === 'CIRCLE' || current.type === 'REGULAR_POLYGON') props.radius = val;
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

// Matrix Helpers
const createRotationMatrix = (rx: number, ry: number, rz: number): number[] => {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

    // Rz * Ry * Rx
    // Rx
    const R11=1, R12=0, R13=0;
    const R21=0, R22=cx, R23=-sx;
    const R31=0, R32=sx, R33=cx;

    // Ry
    const S11=cy, S12=0, S13=sy;
    const S21=0, S22=1, S23=0;
    const S31=-sy, S32=0, S33=cy;

    // Rz
    const T11=cz, T12=-sz, T13=0;
    const T21=sz, T22=cz, T23=0;
    const T31=0, T32=0, T33=1;

    // M1 = Ry * Rx
    const M1_11 = S11*R11 + S12*R21 + S13*R31;
    const M1_12 = S11*R12 + S12*R22 + S13*R32;
    const M1_13 = S11*R13 + S12*R23 + S13*R33;
    
    const M1_21 = S21*R11 + S22*R21 + S23*R31;
    const M1_22 = S21*R12 + S22*R22 + S23*R32;
    const M1_23 = S21*R13 + S22*R23 + S23*R33;

    const M1_31 = S31*R11 + S32*R21 + S33*R31;
    const M1_32 = S31*R12 + S32*R22 + S33*R32;
    const M1_33 = S31*R13 + S32*R23 + S33*R33;

    // M2 = Rz * M1
    const M2_11 = T11*M1_11 + T12*M1_21 + T13*M1_31;
    const M2_12 = T11*M1_12 + T12*M1_22 + T13*M1_32;
    const M2_13 = T11*M1_13 + T12*M1_23 + T13*M1_33;

    const M2_21 = T21*M1_11 + T22*M1_21 + T23*M1_31;
    const M2_22 = T21*M1_12 + T22*M1_22 + T23*M1_32;
    const M2_23 = T21*M1_13 + T22*M1_23 + T23*M1_33;

    const M2_31 = T31*M1_11 + T32*M1_21 + T33*M1_31;
    const M2_32 = T31*M1_12 + T32*M1_22 + T33*M1_32;
    const M2_33 = T31*M1_13 + T32*M1_23 + T33*M1_33;

    return [
        M2_11, M2_12, M2_13,
        M2_21, M2_22, M2_23,
        M2_31, M2_32, M2_33
    ];
};

const multiplyMatrices = (a: number[], b: number[]): number[] => {
    const c = new Array(9).fill(0);
    for(let row=0; row<3; row++) {
        for(let col=0; col<3; col++) {
            for(let k=0; k<3; k++) {
                c[row*3+col] += a[row*3+k] * b[k*3+col];
            }
        }
    }
    return c;
};

const extractEuler = (matrix: number[]): { x: number, y: number, z: number } => {
    // Rotation Order: Z * Y * X
    const m11 = matrix[0], m12 = matrix[1], m13 = matrix[2];
    const m21 = matrix[3], m22 = matrix[4], m23 = matrix[5];
    const m31 = matrix[6], m32 = matrix[7], m33 = matrix[8];

    // m31 = -sin(y)
    let y = -Math.asin(Math.max(-1, Math.min(1, m31)));
    let x = 0;
    let z = 0;

    if (Math.abs(m31) < 0.99999) {
        // m32 = sin(x)cos(y), m33 = cos(x)cos(y)
        x = Math.atan2(m32, m33);
        // m21 = sin(z)cos(y), m11 = cos(z)cos(y)
        z = Math.atan2(m21, m11);
    } else {
        // Gimbal lock
        x = 0;
        // m12 = -sin(z), m22 = cos(z) (dependent on sign of m31)
        z = Math.atan2(-m12, m22);
    }
    
    return { x, y, z };
};

const applyMatrixToVector = (m: number[], v: {x: number, y: number, z: number}): {x: number, y: number, z: number} => {
    return {
        x: m[0]*v.x + m[1]*v.y + m[2]*v.z,
        y: m[3]*v.x + m[4]*v.y + m[5]*v.z,
        z: m[6]*v.x + m[7]*v.y + m[8]*v.z
    };
};

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

    const resolveNode = (id: string, parentTransform?: { x: number, y: number, z: number, scale: number, rotation: number, rotationX: number, rotationY: number, opacity: number }) => {
        const obj = objects.get(id);
        if (!obj) return;

        const worldObj = { ...obj };

        if (parentTransform) {
            // Inherit parent scale
            const s = parentTransform.scale;
            
            // Local position (relative to parent center)
            const lx = worldObj.x;
            const ly = worldObj.y;
            const lz = worldObj.z;

            // Construct Parent Matrix
            const parentMatrix = createRotationMatrix(
                parentTransform.rotationX,
                parentTransform.rotationY,
                parentTransform.rotation
            );

            // Rotate local position by parent matrix
            const rotatedPos = applyMatrixToVector(parentMatrix, { x: lx * s, y: ly * s, z: lz * s });

            // Apply translation
            worldObj.x = parentTransform.x + rotatedPos.x;
            worldObj.y = parentTransform.y + rotatedPos.y;
            worldObj.z = parentTransform.z + rotatedPos.z;

            worldObj.scale = worldObj.scale * s;
            worldObj.opacity = worldObj.opacity * parentTransform.opacity;

            // Rotation Composition
            const childMatrix = createRotationMatrix(worldObj.rotationX, worldObj.rotationY, worldObj.rotation);
            const composedMatrix = multiplyMatrices(parentMatrix, childMatrix);
            const newEuler = extractEuler(composedMatrix);

            worldObj.rotationX = newEuler.x;
            worldObj.rotationY = newEuler.y;
            worldObj.rotation = newEuler.z;
        }

        resolved.set(id, worldObj);

        const children = childrenMap.get(id);
        if (children) {
            children.forEach(childId => {
                resolveNode(childId, {
                    x: worldObj.x,
                    y: worldObj.y,
                    z: worldObj.z,
                    scale: worldObj.scale,
                    rotation: worldObj.rotation,
                    rotationX: worldObj.rotationX,
                    rotationY: worldObj.rotationY,
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
                    } else if (key === 'points' && Array.isArray(s) && Array.isArray(e)) {
                        // Interpolate array of vectors for Polygons
                        // Assumes lengths match, or simply interpolates available indices
                        const len = Math.min(s.length, e.length);
                        const newPoints = [];
                        for (let i=0; i<len; i++) {
                            newPoints.push({
                                x: s[i].x + (e[i].x - s[i].x) * easedT,
                                y: s[i].y + (e[i].y - s[i].y) * easedT
                            });
                        }
                        (obj as any)[key] = newPoints;
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