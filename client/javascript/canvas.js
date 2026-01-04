//************************************Socket************************************************** */

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU4MDA4YjUzNjBlNGQ1ZGFlNGQ4NjEiLCJpYXQiOjE3Njc0NjU3MzksImV4cCI6MTc2ODA3MDUzOX0.h7mQmhjrEdQE1HvyN6L0mdQBv6Od0de-sEeoWaemrzI";

const socket = io("http://localhost:5001", {
  auth: {
    token: token,
  },
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});

//**********************************Canvas***************************************************** */

let currentColor = '#000000';
let currentTool = 'pen';

const canvas = document.getElementById('writecanvas');
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let currentstroke = null;
let strokes = [];


canvas.addEventListener('mousedown', (e) => {
    const point = { x : e.offsetX, y : e.offsetY};

    currentstroke = {
        id: Date.now() + Math.random(),
        tool: currentTool,
        color: currentColor,
        width: currentTool === 'eraser' ? 30 : 2,
        points: [point]
    };
});


canvas.addEventListener('mousemove', (e) => {
    if(!currentstroke) return;
    if(e.buttons !== 1) return;

    currentstroke.points.push({
        x: e.offsetX,
        y: e.offsetY
    });
    redraw();
});

socket.on("DRAW_STROKE", (stroke) => {
    strokes.push(stroke);
    redraw();
});



document.addEventListener('mouseup', () => {
    if(!currentstroke) return;

    socket.emit("DRAW_STROKE", currentstroke);

    strokes.push(currentstroke);
    currentstroke = null;

    redoStack = [];

    redraw();
});


function drawStroke(stroke) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;

    if(stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    stroke.points.forEach((point,index) => {
        if(index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();
}

function redraw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);

    strokes.forEach(drawStroke);

    if(currentstroke) {
        drawStroke(currentstroke);
    }

    ctx.globalCompositeOperation = 'source-over';
}

//************************************************tool bar options**************************** */

const black_btn = document.getElementById('black');
black_btn.addEventListener('click', (e)=> {
    currentColor = '#000000';
});

const red_btn = document.getElementById('red');
red_btn.addEventListener('click', (e)=> {
    currentColor = '#ff0000';
});

const blue_btn = document.getElementById('blue');
blue_btn.addEventListener('click', (e)=> {
    currentColor = '#0000ff';
});

const green_btn = document.getElementById('green');
green_btn.addEventListener('click', (e)=> {
    currentColor = '#00ff00';
})

const pink_btn = document.getElementById('pink');
pink_btn.addEventListener('click', (e)=> {
    currentColor = '#f119adff';
})

function clearCanvas() {

    prevStrokes = strokes.map(stroke => ({
    ...stroke,
    points: stroke.points.map(p => ({ ...p }))
}));
    strokes = [];
    currentstroke = null;
    redoStack = [];
    redraw();
}
const clear = document.getElementById('clear');
clear.addEventListener('click', ()=> {
    const proceed = confirm(
        "Do you want to clear the Canvas?"
    );

    if (!proceed) return;

    redoStack = [];

    clearCanvas();
})

const restore = document.getElementById('restore');
restore.addEventListener('click', ()=> {
    if (!prevStrokes || prevStrokes.length === 0) return;

    let proceed = false;

    if(strokes.length === 0) {
        proceed = true;
    }
    else {
        proceed = confirm(
        "Restoring will discard the current canvas. Do you want to continue?"
        );
    }

    if (!proceed) return;

    strokes = prevStrokes.map(stroke => ({
        ...stroke,
        points: stroke.points.map(p => ({ ...p }))
    }));
    currentstroke = null;
    redoStack = [];
    redraw();
})

const pen = document.getElementById('pencil');
pen.addEventListener('click', (e) => {
    currentTool = 'pen';
});

const eraser = document.getElementById('eraser');
eraser.addEventListener('click', (e) => {
    currentTool = 'eraser';
});

//*****************************************Undo/Redo******************************************* */
 
let redoStack = [];

function undo() {
    if(strokes.length === 0) return;

    const lastStroke = strokes.pop();

    redoStack.push(lastStroke);
    redraw();
}

function redo() {
    if(redoStack.length === 0) return;

    const redoStroke = redoStack.pop();

    strokes.push(redoStroke);
    redraw();
}

const undo_btn = document.getElementById('undo');
undo_btn.addEventListener('click', (e)=> {
    undo();
});

const redo_btn = document.getElementById('redo');
redo_btn.addEventListener('click', (e)=> {
    redo();
});