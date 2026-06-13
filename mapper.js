const canvas = new fabric.Canvas('classCanvas', {
    preserveObjectStacking: true,
    selection: true,
    allowTouchScrolling: false
});

const baseWidth = 794;
const baseHeight = 1123;

canvas.backgroundColor = "#ffffff";  

fabric.Object.prototype.cornerSize = 10;
fabric.Object.prototype.touchCornerSize = 20;
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.cornerColor = '#4CAF50';
fabric.Object.prototype.borderColor = '#4CAF50';
fabric.Object.prototype.transparentCorners = false;

/*.  FIT + ZOOM.   */
let fitScale = 1;
let currentZoom = 1;
const zoomStep = 0.1;
const maxZoom = 3;
const minZoom = 0.2;

function updateZoomDisplay() {
    document.getElementById("zoomDisplay").innerText = Math.round(currentZoom * 100) + "%";
}

function applyZoom(centerPoint = null) {
    const totalScale = fitScale * currentZoom;

    canvas.setDimensions({
        width: baseWidth * totalScale,
        height: baseHeight * totalScale
    });

    if (centerPoint) {
        canvas.zoomToPoint(centerPoint, totalScale);
    } else {
        canvas.setZoom(totalScale);
    }

    canvas.renderAll();
}

function fitToScreen() {
    const wrapper = document.getElementById('wrapper');
    if (!wrapper) return;

    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;

    fitScale = Math.min(w / baseWidth, h / baseHeight);
    fitScale = Math.max(fitScale, 0.35);
    applyZoom();
    updateZoomDisplay();
}

function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        applyZoom();
        updateZoomDisplay();
    }
}

function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        applyZoom();
        updateZoomDisplay();
    }
}

function resetZoom() {
    currentZoom = 1;
    applyZoom();
    updateZoomDisplay();
}

window.addEventListener('resize', fitToScreen);
setTimeout(() => {
    fitToScreen();
}, 80);

/* Prevent pinch zoom */
const canvasElement = document.getElementById('classCanvas');
canvasElement.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
canvasElement.addEventListener('touchmove',  e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
canvasElement.addEventListener('gesturestart', e => e.preventDefault());
canvasElement.addEventListener('gesturechange', e => e.preventDefault());
canvasElement.addEventListener('gestureend',   e => e.preventDefault());

/*---HISTORY---*/
let history = [];
let historyIndex = -1;
let isRestoring = false;

function saveState() {
    if (isRestoring) return;
    const state = JSON.stringify(canvas.toJSON());
    if (historyIndex >= 0 && history[historyIndex] === state) return;
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        isRestoring = true;
        historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => {
            applyZoom();
            isRestoring = false;
        });
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        isRestoring = true;
        historyIndex++;
        canvas.loadFromJSON(history[historyIndex], () => {
            applyZoom();
            isRestoring = false;
        });
    }
}

canvas.on({
    'object:added':   () => { if(!isRestoring) saveState(); },
    'object:modified': () => { if(!isRestoring) saveState(); },
    'object:removed':  () => { if(!isRestoring) saveState(); },
    'object:moving':   e => keepInsideCanvas(e.target)
});

/* ---------------- BOUNDARY ---------------- */
function keepInsideCanvas(obj) {
    obj.setCoords();                     
    const bound = obj.getBoundingRect(true);  

    // Calculate how much we need to push the object back
    let dx = 0;
    let dy = 0;

    if (bound.left < 0) {
        dx = -bound.left;                // push right
    }
    if (bound.top < 0) {
        dy = -bound.top;                 // push down
    }
    if (bound.left + bound.width > baseWidth) {
        dx = baseWidth - (bound.left + bound.width);   // push left
    }
    if (bound.top + bound.height > baseHeight) {
        dy = baseHeight - (bound.top + bound.height);  // push up
    }

    
    if (dx !== 0) obj.left += dx;
    if (dy !== 0) obj.top  += dy;

    obj.setCoords();  
}
/* ---------------- OBJECT CREATION ---------------- */
let offsetCounter = 0;

function createObject(text, w, h, color) {
    const rect = new fabric.Rect({
        width: w, height: h, fill: color, stroke: 'black', strokeWidth: 2,
        originX: 'center', originY: 'center'
    });

    const label = new fabric.Text(text, {
        fontSize: 16, fontWeight: 'bold',
        originX: 'center', originY: 'center', fill: 'black'
    });

    offsetCounter += 20;

    return new fabric.Group([rect, label], {
        left: 100 + offsetCounter,
        top: 100 + offsetCounter
    });
}

function addFan()       { canvas.add(createObject("Fan",       60,  60, "#e3f2fd")); }
function addLight()     { canvas.add(createObject("Light",     80,  30, "#fff9c4")); }
function addBoard()     { canvas.add(createObject("Board",    200,  80, "#c8e6c9")); }
function addProjector() { canvas.add(createObject("Projector",120,  50, "#ffe0b2")); }
function addClock()     { canvas.add(createObject("Clock",     70,  70, "#f8bbd0")); }
function addSwitch()    { canvas.add(createObject("Switch",   100,  50, "#d7ccc8")); }
function addDoor()      { canvas.add(createObject("Door",      80, 150, "#bcaaa4")); }
function addWindow()    { canvas.add(createObject("Window",   150,  80, "#b3e5fc")); }

function addCustom() {
    const name = prompt("Enter object name:");
    if (name) canvas.add(createObject(name, 100, 80, "#e1bee7"));
}

/* ---------------- CONTROLS ---------------- */
function groupSelected() {
    const active = canvas.getActiveObject();
    if (active?.type === 'activeSelection') {
        active.toGroup();
        saveState();
    }
}

function ungroupSelected() {
    const active = canvas.getActiveObject();
    if (active?.type === 'group') {
        active.toActiveSelection();
        saveState();
    }
}

function duplicateSelected() {
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone(cloned => {
        cloned.set({ left: active.left + 30, top: active.top + 30 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        saveState();
    });
}

function deleteSelected() {
    canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject().renderAll();
    saveState();
}

function rotateLeft() {
    const active = canvas.getActiveObject();
    if (active) {
        active.rotate((active.angle - 15) % 360);
        canvas.renderAll();
        saveState();
    }
}

function rotateRight() {
    const active = canvas.getActiveObject();
    if (active) {
        active.rotate((active.angle + 15) % 360);
        canvas.renderAll();
        saveState();
    }
}

function clearCanvas() {
    if (confirm("Clear Canvas?")) {
        canvas.clear();
        canvas.backgroundColor = "#ffffff";
        saveState();
    }
}

/* ---------------- EXPORT ---------------- */
function downloadPNG() {
    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2, quality: 1 });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = "classmap.png";
    link.click();
}

function downloadPDF() {
    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2, quality: 1 });
    const pdf = new jspdf.jsPDF({ orientation: "portrait", unit: "px", format: [baseWidth, baseHeight] });
    pdf.addImage(dataURL, 'PNG', 0, 0, baseWidth, baseHeight);
    pdf.save("classmap.pdf");
}
