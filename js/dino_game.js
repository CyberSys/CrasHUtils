import { app } from "../../scripts/app.js";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 150;
const GROUND_HEIGHT = 120;
const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const GAME_SPEED = 6;

class DinoGame {
    constructor(node) {
        this.node = node;
        this.reset();
    }

    reset() {
        this.dino = {
            x: 50,
            y: GROUND_HEIGHT,
            width: 20,
            height: 24,
            velocityY: 0,
            jumping: false
        };
        
        this.obstacles = [];
        this.clouds = [];
        this.score = 0;
        this.gameOver = false;
        this.frameCount = 0;
        this.groundOffset = 0;
        this.speed = GAME_SPEED;
        
        // Add initial obstacles
        this.spawnObstacle();
    }

    jump() {
        if (!this.dino.jumping && !this.gameOver) {
            this.dino.velocityY = JUMP_STRENGTH;
            this.dino.jumping = true;
        }
    }

    spawnObstacle() {
        const types = ['cactus_small', 'cactus_large', 'bird'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacle = {
            x: CANVAS_WIDTH + 100,
            type: type
        };

        if (type === 'cactus_small') {
            obstacle.width = 10;
            obstacle.height = 20;
            obstacle.y = GROUND_HEIGHT;
        } else if (type === 'cactus_large') {
            obstacle.width = 15;
            obstacle.height = 30;
            obstacle.y = GROUND_HEIGHT;
        } else { // bird
            obstacle.width = 24;
            obstacle.height = 18;
            obstacle.y = GROUND_HEIGHT - 25 - Math.floor(Math.random() * 2) * 20;
        }

        this.obstacles.push(obstacle);
    }

    spawnCloud() {
        this.clouds.push({
            x: CANVAS_WIDTH,
            y: 20 + Math.random() * 40,
            width: 30,
            height: 12
        });
    }

    update() {
        if (this.gameOver) return;

        this.frameCount++;
        this.score++;

        // Increase speed gradually
        if (this.frameCount % 100 === 0) {
            this.speed += 0.2;
        }

        // Update dino
        this.dino.velocityY += GRAVITY;
        this.dino.y += this.dino.velocityY;

        if (this.dino.y >= GROUND_HEIGHT) {
            this.dino.y = GROUND_HEIGHT;
            this.dino.velocityY = 0;
            this.dino.jumping = false;
        }

        // Update ground
        this.groundOffset = (this.groundOffset + this.speed) % 20;

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].x -= this.speed;

            // Check collision
            if (this.checkCollision(this.dino, this.obstacles[i])) {
                this.gameOver = true;
            }

            // Remove off-screen obstacles
            if (this.obstacles[i].x + this.obstacles[i].width < 0) {
                this.obstacles.splice(i, 1);
            }
        }

        // Spawn new obstacles
        if (this.obstacles.length === 0 || 
            this.obstacles[this.obstacles.length - 1].x < CANVAS_WIDTH - 200 - Math.random() * 200) {
            this.spawnObstacle();
        }

        // Update clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            this.clouds[i].x -= this.speed * 0.3;
            if (this.clouds[i].x + this.clouds[i].width < 0) {
                this.clouds.splice(i, 1);
            }
        }

        // Spawn clouds
        if (Math.random() < 0.01) {
            this.spawnCloud();
        }
    }

    checkCollision(dino, obstacle) {
        // Adjust hitbox for more forgiving collision
        const dinoBox = {
            x: dino.x + 4,
            y: dino.y - dino.height + 4,
            width: dino.width - 8,
            height: dino.height - 8
        };

        const obstacleBox = {
            x: obstacle.x + 2,
            y: obstacle.y - obstacle.height + 2,
            width: obstacle.width - 4,
            height: obstacle.height - 4
        };

        return dinoBox.x < obstacleBox.x + obstacleBox.width &&
               dinoBox.x + dinoBox.width > obstacleBox.x &&
               dinoBox.y < obstacleBox.y + obstacleBox.height &&
               dinoBox.y + dinoBox.height > obstacleBox.y;
    }

    draw(ctx) {
        // Clear canvas
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw clouds
        ctx.fillStyle = '#ccc';
        this.clouds.forEach(cloud => {
            ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
            ctx.fillRect(cloud.x + 10, cloud.y - 5, cloud.width - 10, cloud.height);
            ctx.fillRect(cloud.x + 5, cloud.y + 5, cloud.width - 10, cloud.height - 5);
        });

        // Draw ground
        ctx.strokeStyle = '#535353';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_HEIGHT + 5);
        ctx.lineTo(CANVAS_WIDTH, GROUND_HEIGHT + 5);
        ctx.stroke();

        // Draw ground dots pattern
        ctx.fillStyle = '#535353';
        for (let i = -20; i < CANVAS_WIDTH; i += 20) {
            const x = i + this.groundOffset;
            ctx.fillRect(x, GROUND_HEIGHT + 8, 2, 2);
        }

        // Draw dino
        ctx.fillStyle = '#535353';
        const dinoX = this.dino.x;
        const dinoY = this.dino.y - this.dino.height;
        
        // Body
        ctx.fillRect(dinoX, dinoY + 10, 20, 14);
        // Head
        ctx.fillRect(dinoX + 14, dinoY, 10, 10);
        // Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(dinoX + 18, dinoY + 2, 3, 3);
        ctx.fillStyle = '#535353';
        // Tail
        ctx.fillRect(dinoX - 4, dinoY + 12, 6, 4);
        // Legs (animate)
        if (!this.dino.jumping) {
            const legFrame = Math.floor(this.frameCount / 6) % 2;
            if (legFrame === 0) {
                ctx.fillRect(dinoX + 4, dinoY + 24, 3, 6);
                ctx.fillRect(dinoX + 13, dinoY + 24, 3, 6);
            } else {
                ctx.fillRect(dinoX + 4, dinoY + 24, 3, 6);
                ctx.fillRect(dinoX + 13, dinoY + 24, 3, 4);
            }
        } else {
            ctx.fillRect(dinoX + 4, dinoY + 24, 3, 6);
            ctx.fillRect(dinoX + 13, dinoY + 24, 3, 6);
        }

        // Draw obstacles
        ctx.fillStyle = '#535353';
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'bird') {
                // Bird body
                ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
                // Wings (animate)
                const wingFrame = Math.floor(this.frameCount / 8) % 2;
                if (wingFrame === 0) {
                    ctx.fillRect(obstacle.x + 5, obstacle.y - obstacle.height - 5, 14, 4);
                } else {
                    ctx.fillRect(obstacle.x + 5, obstacle.y - obstacle.height + obstacle.height, 14, 4);
                }
            } else {
                // Cactus
                ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
                if (obstacle.type === 'cactus_large') {
                    // Add arms
                    ctx.fillRect(obstacle.x - 3, obstacle.y - obstacle.height + 8, 3, 8);
                    ctx.fillRect(obstacle.x + obstacle.width, obstacle.y - obstacle.height + 8, 3, 8);
                }
            }
        });

        // Draw score
        ctx.fillStyle = '#535353';
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`HI ${Math.floor(this.score / 10).toString().padStart(5, '0')}`, CANVAS_WIDTH - 10, 20);

        // Draw game over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(247, 247, 247, 0.8)';
            ctx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2 - 30, 200, 60);
            ctx.fillStyle = '#535353';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('G A M E  O V E R', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 5);
            ctx.font = '12px monospace';
            ctx.fillText('Press SPACE to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
        }

        ctx.textAlign = 'left';
    }
}

app.registerExtension({
    name: "Comfy.DinoGame",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "DinoGame") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.properties = this.properties || {};
                this.serialize_widgets = false;
                this.widgets = this.widgets || [];
                
                if (this.dinoGameInitialized) {
                    return result;
                }
                this.dinoGameInitialized = true;
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvas.style.width = `${CANVAS_WIDTH}px`;
                canvas.style.height = `${CANVAS_HEIGHT}px`;
                canvas.style.imageRendering = 'pixelated';
                
                const ctx = canvas.getContext('2d');
                
                // Initialize game
                const game = new DinoGame(this);
                this.dinoGame = game;
                
                // Game loop
                let lastUpdate = Date.now();
                let animationId = null;
                const gameLoop = () => {
                    const now = Date.now();
                    if (now - lastUpdate >= 1000 / 60) { // 60 FPS
                        game.update();
                        game.draw(ctx);
                        lastUpdate = now;
                    }
                    animationId = requestAnimationFrame(gameLoop);
                };
                gameLoop();
                
                this.dinoGameAnimationId = animationId;
                
                // Set node size
                const nodeWidth = CANVAS_WIDTH + 20;
                const nodeHeight = CANVAS_HEIGHT + 60;
                this.size = [nodeWidth, nodeHeight];
                this.setSize([nodeWidth, nodeHeight]);
                
                // Add canvas widget
                const widget = this.addDOMWidget("dino_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                // Handle keyboard input
                const handleKeyDown = (e) => {
                    if (!this.dinoGame) return;
                    
                    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                        e.preventDefault();
                        if (this.dinoGame.gameOver) {
                            this.dinoGame.reset();
                        } else {
                            this.dinoGame.jump();
                        }
                    }
                };
                
                canvas.tabIndex = 0;
                canvas.addEventListener('keydown', handleKeyDown);
                canvas.addEventListener('click', () => {
                    canvas.focus();
                    if (!this.dinoGame.gameOver) {
                        this.dinoGame.jump();
                    }
                });
                
                // Auto-focus when created
                setTimeout(() => canvas.focus(), 100);
                
                return result;
            };
            
            // Cleanup on removal
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                if (this.dinoGameAnimationId) {
                    cancelAnimationFrame(this.dinoGameAnimationId);
                }
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});