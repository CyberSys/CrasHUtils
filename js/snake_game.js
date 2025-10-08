import { app } from "../../scripts/app.js";

const CELL_SIZE = 8;
const GRID_SIZE = 20;
const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;
const GAME_SPEED = 150; // ms per frame, Nokia 3210 speed

class SnakeGame {
    constructor(node) {
        this.node = node;
        this.reset();
    }

    reset() {
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = this.spawnFood();
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
    }

    spawnFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
        return food;
    }

    update() {
        if (this.gameOver || this.paused) return;

        // Update direction
        this.direction = this.nextDirection;

        // Calculate new head position
        const head = {
            x: (this.snake[0].x + this.direction.x + GRID_SIZE) % GRID_SIZE,
            y: (this.snake[0].y + this.direction.y + GRID_SIZE) % GRID_SIZE
        };

        // Check self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver = true;
            return;
        }

        this.snake.unshift(head);

        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.food = this.spawnFood();
        } else {
            this.snake.pop();
        }
    }

    changeDirection(newDir) {
        // Prevent 180 degree turns
        if (newDir.x === -this.direction.x && newDir.y === -this.direction.y) {
            return;
        }
        this.nextDirection = newDir;
    }

    draw(ctx) {
        // Clear canvas with Nokia-style background
        ctx.fillStyle = '#c7f0d8';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw grid (optional, Nokia style)
        ctx.strokeStyle = '#a8d5ba';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }

        // Draw snake
        ctx.fillStyle = '#000000';
        this.snake.forEach(segment => {
            ctx.fillRect(
                segment.x * CELL_SIZE + 1,
                segment.y * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );
        });

        // Draw food
        ctx.fillStyle = '#000000';
        ctx.fillRect(
            this.food.x * CELL_SIZE + 2,
            this.food.y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );

        // Draw score
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        ctx.fillText(`Score: ${this.score}`, 5, CANVAS_SIZE - 5);

        // Draw game over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(199, 240, 216, 0.8)';
            ctx.fillRect(0, CANVAS_SIZE / 2 - 20, CANVAS_SIZE, 40);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 5);
            ctx.font = '10px monospace';
            ctx.fillText('Press SPACE', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
            ctx.textAlign = 'left';
        }
    }
}

app.registerExtension({
    name: "Comfy.SnakeGame",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SnakeGame") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                // Call original onNodeCreated first
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Set node properties early to avoid conflicts
                this.properties = this.properties || {};
                this.serialize_widgets = false;
                this.widgets = this.widgets || [];
                
                // Prevent re-initialization
                if (this.snakeGameInitialized) {
                    return result;
                }
                this.snakeGameInitialized = true;
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_SIZE;
                canvas.height = CANVAS_SIZE;
                canvas.style.width = `${CANVAS_SIZE * 2}px`;
                canvas.style.height = `${CANVAS_SIZE * 2}px`;
                canvas.style.imageRendering = 'pixelated';
                
                const ctx = canvas.getContext('2d');
                
                // Initialize game
                const game = new SnakeGame(this);
                this.snakeGame = game;
                
                // Game loop
                let lastUpdate = Date.now();
                let animationId = null;
                const gameLoop = () => {
                    const now = Date.now();
                    if (now - lastUpdate >= GAME_SPEED) {
                        game.update();
                        game.draw(ctx);
                        lastUpdate = now;
                    }
                    animationId = requestAnimationFrame(gameLoop);
                };
                gameLoop();
                
                // Store animation ID for cleanup
                this.snakeGameAnimationId = animationId;
                
                // Set node size - account for title bar (~30px) and padding
                const nodeWidth = CANVAS_SIZE * 2 + 20;
                const nodeHeight = CANVAS_SIZE * 2 + 60; // Extra space for title and padding
                this.size = [nodeWidth, nodeHeight];
                this.setSize([nodeWidth, nodeHeight]);
                
                // Add canvas widget
                const widget = this.addDOMWidget("snake_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                // Handle keyboard input
                const handleKeyDown = (e) => {
                    if (!this.snakeGame) return;
                    
                    switch(e.key) {
                        case 'ArrowUp':
                        case 'w':
                        case 'W':
                            e.preventDefault();
                            this.snakeGame.changeDirection({ x: 0, y: -1 });
                            break;
                        case 'ArrowDown':
                        case 's':
                        case 'S':
                            e.preventDefault();
                            this.snakeGame.changeDirection({ x: 0, y: 1 });
                            break;
                        case 'ArrowLeft':
                        case 'a':
                        case 'A':
                            e.preventDefault();
                            this.snakeGame.changeDirection({ x: -1, y: 0 });
                            break;
                        case 'ArrowRight':
                        case 'd':
                        case 'D':
                            e.preventDefault();
                            this.snakeGame.changeDirection({ x: 1, y: 0 });
                            break;
                        case ' ':
                            e.preventDefault();
                            if (this.snakeGame.gameOver) {
                                this.snakeGame.reset();
                            } else {
                                this.snakeGame.paused = !this.snakeGame.paused;
                            }
                            break;
                    }
                };
                
                // Add event listeners when node is selected
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
                if (this.snakeGameAnimationId) {
                    cancelAnimationFrame(this.snakeGameAnimationId);
                }
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});