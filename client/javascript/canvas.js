//************************************Socket************************************************** */

const socket = io("http://localhost:5001");

socket.on("connect", () => {
  let roomId = new URLSearchParams(window.location.search).get("room");

  if (!roomId) {
    roomId = crypto.randomUUID();
    window.history.replaceState(null, "", `?room=${roomId}`);
  }

  console.log("CLIENT joining room:", roomId);
  socket.emit("JOIN_ROOM", { roomId });
});


socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});

socket.on("CANVAS_CLEARED", () => {
  clearCanvas();
});


//**********************************Canvas***************************************************** */

let currentColor = '#000000';
let currentTool = 'pen';
let prevStrokes = [];


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
        id: crypto.randomUUID(),
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
  const index = strokes.findIndex(s => s.id === stroke.id);

  if (index === -1) {
    strokes.push(stroke);
  } else {
    strokes[index] = stroke;
  }

  redraw();
});


socket.on("STROKE_REMOVED", ({ strokeId }) => {
  const index = strokes.findIndex(s => s.id === strokeId);
  if (index === -1) return;

  const [removed] = strokes.splice(index, 1);

  if (removed.ownerId && removed.ownerId === socket.id) {
    redoStack.push(removed);
  }

  redraw();
});


document.addEventListener('mouseup', () => {
    if(!currentstroke) return;
    const stroke  = currentstroke;
    strokes.push(stroke);

    socket.emit("DRAW_STROKE", stroke);
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
  strokes = [];
  currentstroke = null;
  redoStack = [];
  redraw();
}

clear.addEventListener('click', () => {
  const proceed = confirm("Do you want to clear the Canvas?");
  if (!proceed) return;

  prevStrokes = strokes.map(stroke => ({
    ...stroke,
    points: stroke.points.map(p => ({ ...p }))
  }));

  redoStack = [];

  socket.emit("CLEAR_CANVAS");
});


const restore = document.getElementById('restore');

restore.addEventListener('click', () => {
  if (!prevStrokes || prevStrokes.length === 0) {
    alert("Nothing to restore");
    return;
  }

  const proceed = confirm(
    "Restore will bring back the canvas to what it was before the last clear. Continue?"
  );

  if (!proceed) return;

  strokes = prevStrokes.map(stroke => ({
    ...stroke,
    points: stroke.points.map(p => ({ ...p }))
  }));

  currentstroke = null;
  redoStack = [];

  redraw();
});


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
const undo_btn = document.getElementById('undo');
const redo_btn = document.getElementById('redo');



undo_btn.addEventListener('click', () => {
  socket.emit("UNDO_STROKE");
});


redo_btn.addEventListener('click', () => {
  const stroke = redoStack.pop();
  if (!stroke) return;

  socket.emit("REDO_STROKE", stroke);
});
