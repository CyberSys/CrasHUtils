import { app } from "../../scripts/app.js";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const CANVAS_WIDTH = COLS * BLOCK_SIZE + 160; // Extra space for sidebar
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE + 40;

const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000',
    empty: '#000000',
    grid: '#333333'
};

const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

class TetrisGame {
    constructor(node) {
        this.node = node;
        this.reset();
    }

    reset() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        
        this.currentPiece = this.createPiece();
        this.nextPiece = this.createPiece();
    }

    createPiece() {
        const types = Object.keys(SHAPES);
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            type: type,
            shape: SHAPES[type],
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
            y: 0
        };
    }

    collide(piece = this.currentPiece) {
        const shape = piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardX = piece.x + x;
                    const boardY = piece.y + y;
                    
                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                        return true;
                    }
                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.type;
                    }
                }
            });
        });
    }

    rotate() {
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        const previousShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;
        
        // Wall kick
        let offset = 0;
        while (this.collide()) {
            this.currentPiece.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.currentPiece.shape[0].length) {
                this.currentPiece.shape = previousShape;
                return;
            }
        }
    }

    move(dir) {
        this.currentPiece.x += dir;
        if (this.collide()) {
            this.currentPiece.x -= dir;
        }
    }

    drop() {
        this.currentPiece.y++;
        if (this.collide()) {
            this.currentPiece.y--;
            this.merge();
            this.clearLines();
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.createPiece();
            
            if (this.collide()) {
                this.gameOver = true;
            }
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        while (!this.collide()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.drop();
    }

    clearLines() {
        let linesCleared = 0;
        
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (!this.board[y][x]) {
                    continue outer;
                }
            }
            
            // Line is full
            this.board.splice(y, 1);
            this.board.unshift(Array(COLS).fill(null));
            linesCleared++;
            y++; // Check this row again
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += [0, 40, 100, 300, 1200][linesCleared] * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
        }
    }

    update(deltaTime) {
        if (this.gameOver || this.paused) return;
        
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
    }

    draw(ctx) {
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('TETRIS', 10, 25);
        
        // Draw board border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(9, 39, COLS * BLOCK_SIZE + 2, ROWS * BLOCK_SIZE + 2);
        
        // Draw grid
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(10, 40 + y * BLOCK_SIZE);
            ctx.lineTo(10 + COLS * BLOCK_SIZE, 40 + y * BLOCK_SIZE);
            ctx.stroke();
        }
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(10 + x * BLOCK_SIZE, 40);
            ctx.lineTo(10 + x * BLOCK_SIZE, 40 + ROWS * BLOCK_SIZE);
            ctx.stroke();
        }
        
        // Draw board
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(10 + x * BLOCK_SIZE, 40 + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(10 + x * BLOCK_SIZE, 40 + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
        
        // Draw current piece
        if (this.currentPiece) {
            ctx.fillStyle = COLORS[this.currentPiece.type];
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const drawX = 10 + (this.currentPiece.x + x) * BLOCK_SIZE;
                        const drawY = 40 + (this.currentPiece.y + y) * BLOCK_SIZE;
                        ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
        }
        
        // Draw sidebar
        const sidebarX = COLS * BLOCK_SIZE + 30;
        
        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('SCORE', sidebarX, 60);
        ctx.font = 'bold 16px monospace';
        ctx.fillText(this.score.toString(), sidebarX, 80);
        
        // Level
        ctx.font = '12px monospace';
        ctx.fillText('LEVEL', sidebarX, 110);
        ctx.font = 'bold 16px monospace';
        ctx.fillText(this.level.toString(), sidebarX, 130);
        
        // Lines
        ctx.font = '12px monospace';
        ctx.fillText('LINES', sidebarX, 160);
        ctx.font = 'bold 16px monospace';
        ctx.fillText(this.lines.toString(), sidebarX, 180);
        
        // Next piece
        ctx.font = '12px monospace';
        ctx.fillText('NEXT', sidebarX, 220);
        if (this.nextPiece) {
            const offsetX = sidebarX + 10;
            const offsetY = 230;
            ctx.fillStyle = COLORS[this.nextPiece.type];
            this.nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
        }
        
        // Controls
        ctx.fillStyle = '#888888';
        ctx.font = '10px monospace';
        ctx.fillText('← → Move', sidebarX, 320);
        ctx.fillText('↑ Rotate', sidebarX, 335);
        ctx.fillText('↓ Soft Drop', sidebarX, 350);
        ctx.fillText('Space Hard Drop', sidebarX, 365);
        ctx.fillText('P Pause', sidebarX, 380);
        
        // Game over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, CANVAS_HEIGHT / 2 - 40, COLS * BLOCK_SIZE, 80);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', 10 + COLS * BLOCK_SIZE / 2, CANVAS_HEIGHT / 2 - 10);
            ctx.font = '12px monospace';
            ctx.fillText('Press SPACE to restart', 10 + COLS * BLOCK_SIZE / 2, CANVAS_HEIGHT / 2 + 15);
            ctx.textAlign = 'left';
        }
        
        // Paused
        if (this.paused && !this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, CANVAS_HEIGHT / 2 - 30, COLS * BLOCK_SIZE, 60);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', 10 + COLS * BLOCK_SIZE / 2, CANVAS_HEIGHT / 2 + 5);
            ctx.textAlign = 'left';
        }
    }
}

app.registerExtension({
    name: "Comfy.TetrisGame",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "TetrisGame") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.properties = this.properties || {};
                this.serialize_widgets = false;
                this.widgets = this.widgets || [];
                
                if (this.tetrisGameInitialized) {
                    return result;
                }
                this.tetrisGameInitialized = true;
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvas.style.width = `${CANVAS_WIDTH}px`;
                canvas.style.height = `${CANVAS_HEIGHT}px`;
                
                const ctx = canvas.getContext('2d');
                
                // Initialize game
                const game = new TetrisGame(this);
                this.tetrisGame = game;
                
                // Game loop
                let lastTime = 0;
                let animationId = null;
                const gameLoop = (time = 0) => {
                    const deltaTime = time - lastTime;
                    lastTime = time;
                    
                    game.update(deltaTime);
                    game.draw(ctx);
                    
                    animationId = requestAnimationFrame(gameLoop);
                };
                gameLoop();
                
                this.tetrisGameAnimationId = animationId;
                
                // Set node size
                const nodeWidth = CANVAS_WIDTH + 20;
                const nodeHeight = CANVAS_HEIGHT + 60;
                this.size = [nodeWidth, nodeHeight];
                this.setSize([nodeWidth, nodeHeight]);
                
                // Add canvas widget
                const widget = this.addDOMWidget("tetris_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                // Handle keyboard input
                const handleKeyDown = (e) => {
                    if (!this.tetrisGame) return;
                    
                    switch(e.key) {
                        case 'ArrowLeft':
                        case 'a':
                        case 'A':
                            e.preventDefault();
                            if (!this.tetrisGame.gameOver && !this.tetrisGame.paused) {
                                this.tetrisGame.move(-1);
                            }
                            break;
                        case 'ArrowRight':
                        case 'd':
                        case 'D':
                            e.preventDefault();
                            if (!this.tetrisGame.gameOver && !this.tetrisGame.paused) {
                                this.tetrisGame.move(1);
                            }
                            break;
                        case 'ArrowUp':
                        case 'w':
                        case 'W':
                            e.preventDefault();
                            if (!this.tetrisGame.gameOver && !this.tetrisGame.paused) {
                                this.tetrisGame.rotate();
                            }
                            break;
                        case 'ArrowDown':
                        case 's':
                        case 'S':
                            e.preventDefault();
                            if (!this.tetrisGame.gameOver && !this.tetrisGame.paused) {
                                this.tetrisGame.drop();
                            }
                            break;
                        case ' ':
                            e.preventDefault();
                            if (this.tetrisGame.gameOver) {
                                this.tetrisGame.reset();
                            } else if (!this.tetrisGame.paused) {
                                this.tetrisGame.hardDrop();
                            }
                            break;
                        case 'p':
                        case 'P':
                            e.preventDefault();
                            if (!this.tetrisGame.gameOver) {
                                this.tetrisGame.paused = !this.tetrisGame.paused;
                            }
                            break;
                    }
                };
                
                canvas.tabIndex = 0;
                canvas.addEventListener('keydown', handleKeyDown);
                canvas.addEventListener('click', () => canvas.focus());
                
                // Auto-focus when created
                setTimeout(() => canvas.focus(), 100);
                
                return result;
            };
            
            // Cleanup on removal
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                if (this.tetrisGameAnimationId) {
                    cancelAnimationFrame(this.tetrisGameAnimationId);
                }
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});