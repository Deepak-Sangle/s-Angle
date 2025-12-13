import { Action, ActionType, TimelineData, VisualObject, Vector2 } from '../types';

// Simple easing functions
const Easings = {
    linear: (t: number) => t,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export class VideoContext {
    currentTime: number = 0;
    actions: Action[] = [];
    initialObjects: Map<string, VisualObject> = new Map();
    // Track current state during "compilation" to know start values for next actions
    currentObjectStates: Map<string, VisualObject> = new Map();

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // --- Nouns (Creation) ---

    addCircle(props: { x: number; y: number; radius: number; color: string; opacity?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'CIRCLE',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color,
            radius: props.radius
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

    addRect(props: { x: number; y: number; width: number; height: number; color: string; opacity?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'RECT',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color,
            width: props.width,
            height: props.height
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

    addText(props: { text: string; x: number; y: number; fontSize: number; color: string; opacity?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'TEXT',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: 1,
            opacity: props.opacity ?? 1,
            color: props.color,
            text: props.text,
            fontSize: props.fontSize
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

    addMath(props: { latex: string; x: number; y: number; scale?: number; color: string; opacity?: number }): string {
        const id = this.generateId();
        const obj: VisualObject = {
            id,
            type: 'MATH',
            x: props.x,
            y: props.y,
            rotation: 0,
            scale: props.scale ?? 1,
            opacity: props.opacity ?? 1,
            color: props.color,
            latex: props.latex,
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
            height: props.thickness
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
            // Update current state tracker as well
            const currentObj = this.currentObjectStates.get(id);
            if(currentObj) currentObj.type = 'ARROW';
        }
        return id;
    }

    // --- Verbs (Actions) ---

    wait(duration: number) {
        this.currentTime += duration;
    }

    moveTo(id: string, target: Vector2, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const startVal = { x: current.x, y: current.y };
        
        this.actions.push({
            id: this.generateId(),
            type: ActionType.MOVE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startVal,
            endValue: target,
            easing: 'easeInOutCubic'
        });

        // Update virtual state
        current.x = target.x;
        current.y = target.y;
        this.currentTime += duration;
    }

    // Relative move
    moveBy(id: string, delta: Vector2, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        
        const target = { x: current.x + delta.x, y: current.y + delta.y };
        this.moveTo(id, target, duration);
    }

    // Circular Arc
    arc(id: string, center: Vector2, angleDegrees: number, duration: number) {
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

        // Update virtual state to end position of arc
        const endAngle = startAngle + angleRad;
        current.x = center.x + radius * Math.cos(endAngle);
        current.y = center.y + radius * Math.sin(endAngle);
        this.currentTime += duration;
    }

    // Transform Scale (Uniform)
    scale(id: string, factor: number, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const startVal = current.scale;
        const endVal = factor; // Absolute scale, or could be relative. Let's do absolute for simplicity.

        this.actions.push({
            id: this.generateId(),
            type: ActionType.SCALE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startVal,
            endValue: endVal,
            easing: 'easeInOutCubic'
        });

        current.scale = endVal;
        this.currentTime += duration;
    }

    // Geometry Resize (Non-Uniform / Property based)
    resize(id: string, target: number | { width?: number, height?: number, radius?: number, length?: number, thickness?: number }, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        const startVal: any = {};
        const endVal: any = {};

        if (current.type === 'CIRCLE') {
            const r = typeof target === 'number' ? target : (target as any).radius;
            if (r !== undefined) {
                startVal.radius = current.radius;
                endVal.radius = r;
                current.radius = r;
            }
        } else if (current.type === 'RECT') {
            const t = target as any;
            if (typeof t === 'object') {
                if (t.width !== undefined) {
                    startVal.width = current.width;
                    endVal.width = t.width;
                    current.width = t.width;
                }
                if (t.height !== undefined) {
                    startVal.height = current.height;
                    endVal.height = t.height;
                    current.height = t.height;
                }
            }
        } else if (current.type === 'LINE' || current.type === 'ARROW') {
            const t = target as any;
            if (typeof t === 'object') {
                 // Map length -> width, thickness -> height
                 if (t.length !== undefined) {
                     startVal.width = current.width;
                     endVal.width = t.length;
                     current.width = t.length;
                 }
                 if (t.thickness !== undefined) {
                     startVal.height = current.height;
                     endVal.height = t.thickness;
                     current.height = t.thickness;
                 }
            } else if (typeof t === 'number') {
                // Assume number on line means length change
                startVal.width = current.width;
                endVal.width = t;
                current.width = t;
            }
        }

        this.actions.push({
            id: this.generateId(),
            type: ActionType.RESIZE,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: startVal,
            endValue: endVal,
            easing: 'easeInOutCubic'
        });
        
        this.currentTime += duration;
    }

    changeColor(id: string, color: string, duration: number) {
         const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.COLOR,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.color,
            endValue: color,
            easing: 'linear'
        });

        current.color = color;
        this.currentTime += duration;
    }

    fadeOut(id: string, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
            id: this.generateId(),
            type: ActionType.FADE_OUT,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.opacity,
            endValue: 0,
            easing: 'linear'
        });

        current.opacity = 0;
        this.currentTime += duration;
    }

    fadeIn(id: string, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);

        this.actions.push({
             id: this.generateId(),
            type: ActionType.FADE_IN,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: current.opacity,
            endValue: 1,
            easing: 'linear'
        });

        current.opacity = 1;
        this.currentTime += duration;
    }

    count(id: string, endValue: number, duration: number) {
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

    typeWriter(id: string, duration: number) {
        const current = this.currentObjectStates.get(id);
        if (!current) throw new Error(`Object ${id} not found`);
        if (current.type !== 'TEXT') throw new Error(`Object ${id} must be TEXT for typeWriter.`);

        const fullText = current.text || '';

        this.actions.push({
            id: this.generateId(),
            type: ActionType.TYPEWRITER,
            objectId: id,
            startTime: this.currentTime,
            duration,
            startValue: 0,
            endValue: fullText, // Store the source text
            easing: 'linear'
        });

        current.opacity = 1;
        this.currentTime += duration;
    }

    playTogether(tasks: Array<(scene: VideoContext) => void>) {
        const startTime = this.currentTime;
        let maxDuration = 0;

        // We need to capture actions generated by these tasks, 
        // but force their startTime to be `startTime`.
        // Also need to track what the max duration added was.
        
        // This is a bit tricky in a synchronous imperative style without deep proxies.
        // Simplified approach: restore currentTime after each task, then jump to max.
        
        const startStates = new Map<string, VisualObject>();
        // Clone states because branches might modify them differently (race condition in logic), 
        // but in animation "playTogether" usually implies distinct objects or non-conflicting props.
        // We will trust the user not to move the SAME object to two DIFFERENT places at once.
        
        tasks.forEach(task => {
            this.currentTime = startTime; // Reset clock for this task
            task(this); // Run task
            const taskDuration = this.currentTime - startTime;
            if (taskDuration > maxDuration) maxDuration = taskDuration;
        });

        this.currentTime = startTime + maxDuration;
    }

    getTimeline(): TimelineData {
        return {
            duration: this.currentTime,
            actions: this.actions,
            objects: this.initialObjects
        };
    }
}

// The Renderer Logic
export const renderSceneAtTime = (timeline: TimelineData, time: number): VisualObject[] => {
    // 1. Start with initial objects
    // Deep clone to avoid mutating the source of truth
    const objects = new Map<string, VisualObject>();
    
    // Initialize
    timeline.objects.forEach((obj, id) => {
        objects.set(id, JSON.parse(JSON.stringify(obj)));
    });

    // 2. Apply actions up to current time
    // Filter active actions
    const activeActions = timeline.actions.filter(a => a.startTime <= time);

    // Sort by start time to apply in order
    activeActions.sort((a, b) => a.startTime - b.startTime);

    activeActions.forEach(action => {
        if (!action.objectId) return;
        const obj = objects.get(action.objectId);
        if (!obj) return;

        // Calculate progress (t)
        // If action is finished, t = 1. If running, t = (time - start) / duration
        let t = 0;
        if (action.duration === 0) {
            t = 1;
        } else {
            const rawT = (time - action.startTime) / action.duration;
            t = Math.min(Math.max(rawT, 0), 1);
        }

        // Apply Easing
        const easedT = action.easing && (Easings as any)[action.easing] 
            ? (Easings as any)[action.easing](t) 
            : t;

        // Apply changes
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
            case ActionType.SCALE:
                if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    obj.scale = action.startValue + (action.endValue - action.startValue) * easedT;
                }
                break;
            case ActionType.RESIZE:
                // Handle geometric resizing
                const s = action.startValue;
                const e = action.endValue;
                if (s.radius !== undefined && e.radius !== undefined) {
                    obj.radius = s.radius + (e.radius - s.radius) * easedT;
                }
                if (s.width !== undefined && e.width !== undefined) {
                    obj.width = s.width + (e.width - s.width) * easedT;
                }
                if (s.height !== undefined && e.height !== undefined) {
                    obj.height = s.height + (e.height - s.height) * easedT;
                }
                break;
            case ActionType.FADE_OUT:
                 if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    obj.opacity = action.startValue + (action.endValue - action.startValue) * easedT;
                }
                break;
            case ActionType.FADE_IN:
                 if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    obj.opacity = action.startValue + (action.endValue - action.startValue) * easedT;
                }
                break;
             case ActionType.COLOR:
                // Simple color switch for now, interpolation is complex without a library
                if (t >= 0.5) obj.color = action.endValue;
                else obj.color = action.startValue;
                break;
             case ActionType.COUNT:
                if (typeof action.startValue === 'number' && typeof action.endValue === 'number') {
                    const val = action.startValue + (action.endValue - action.startValue) * easedT;
                    // Round to integer for standard counter effect
                    obj.text = Math.round(val).toString();
                }
                break;
            case ActionType.TYPEWRITER:
                // Ensure visibility
                obj.opacity = 1;
                const fullText = action.endValue;
                if (typeof fullText === 'string') {
                    const charCount = Math.floor(fullText.length * easedT);
                    obj.text = fullText.substring(0, charCount);
                }
                break;
        }
    });

    return Array.from(objects.values());
};