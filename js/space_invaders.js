import { app } from "../../scripts/app.js";

const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 480;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 16;
const INVADER_WIDTH = 22;
const INVADER_HEIGHT = 16;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 8;

class SpaceInvadersGame {
    constructor(node) {
        this.node = node;
        this.keys = {};
        this.reset();
    }

    reset() {
        this.player = {
            x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
            y: CANVAS_HEIGHT - 60,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            speed: 3
        };

        this.invaders = [];
        this.createInvaders();
        
        this.bullets = [];
        this.enemyBullets = [];
        this.shields = this.createShields();
        
        this.invaderDirection = 1;
        this.invaderSpeed = 1;
        this.invaderDropDistance = 16;
        this.frameCount = 0;
        this.invaderMoveInterval = 60;
        this.shootCooldown = 0;
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.won = false;
        this.animFrame = 0;
    }

    createInvaders() {
        const rows = 5;
        const cols = 11;
        const startX = 50;
        const startY = 60;
        const spacingX = 40;
        const spacingY = 35;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let type = row < 1 ? 3 : row < 3 ? 2 : 1;
                this.invaders.push({
                    x: startX + col * spacingX,
                    y: startY + row * spacingY,
                    width: INVADER_WIDTH,
                    height: INVADER_HEIGHT,
                    type: type,
                    alive: true
                });
            }
        }
    }

    createShields() {
        const shields = [];
        const shieldY = CANVAS_HEIGHT - 120;
        const positions = [80, 200, 320, 440];
        
        positions.forEach(x => {
            const shield = {
                x: x,
                y: shieldY,
                width: 60,
                height: 40,
                blocks: []
            };
            
            // Create shield blocks
            for (let by = 0; by < 5; by++) {
                for (let bx = 0; bx < 8; bx++) {
                    // Skip corners for classic shape
                    if ((by === 0 && (bx < 2 || bx > 5)) ||
                        (by === 4 && bx >= 2 && bx <= 5)) {
                        continue;
                    }
                    shield.blocks.push({
                        x: bx * 8,
                        y: by * 8,
                        alive: true
                    });
                }
            }
            shields.push(shield);
        });
        
        return shields;
    }

    update() {
        if (this.gameOver || this.won) return;

        this.frameCount++;
        this.animFrame = Math.floor(this.frameCount / 15) % 2;

        // Move player
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.player.x = Math.min(CANVAS_WIDTH - this.player.width, this.player.x + this.player.speed);
        }

        // Shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // Move invaders
        if (this.frameCount % this.invaderMoveInterval === 0) {
            let hitEdge = false;
            
            this.invaders.forEach(inv => {
                if (!inv.alive) return;
                inv.x += this.invaderDirection * this.invaderSpeed * 20;
                if (inv.x <= 0 || inv.x + inv.width >= CANVAS_WIDTH) {
                    hitEdge = true;
                }
            });

            if (hitEdge) {
                this.invaderDirection *= -1;
                this.invaders.forEach(inv => {
                    if (inv.alive) {
                        inv.y += this.invaderDropDistance;
                        // Check if invaders reached player
                        if (inv.y + inv.height >= this.player.y) {
                            this.gameOver = true;
                        }
                    }
                });
            }

            // Random enemy shooting
            const aliveInvaders = this.invaders.filter(inv => inv.alive);
            if (aliveInvaders.length > 0 && Math.random() < 0.05) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                this.enemyBullets.push({
                    x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
                    y: shooter.y + shooter.height,
                    width: BULLET_WIDTH,
                    height: BULLET_HEIGHT,
                    speed: 1.5
                });
            }
        }

        // Move bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            if (bullet.y < 0) return false;

            // Check invader collision
            for (let inv of this.invaders) {
                if (inv.alive && this.collision(bullet, inv)) {
                    inv.alive = false;
                    this.score += inv.type * 10;
                    return false;
                }
            }

            // Check shield collision
            if (this.checkShieldCollision(bullet)) {
                return false;
            }

            return true;
        });

        // Move enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.y += bullet.speed;
            if (bullet.y > CANVAS_HEIGHT) return false;

            // Check player collision
            if (this.collision(bullet, this.player)) {
                this.lives--;
                if (this.lives <= 0) {
                    this.gameOver = true;
                }
                return false;
            }

            // Check shield collision
            if (this.checkShieldCollision(bullet)) {
                return false;
            }

            return true;
        });

        // Check win condition
        if (this.invaders.every(inv => !inv.alive)) {
            this.won = true;
        }

        // Increase speed as invaders are destroyed
        const aliveCount = this.invaders.filter(inv => inv.alive).length;
        this.invaderMoveInterval = Math.max(10, 60 - (55 - aliveCount));
    }

    shoot() {
        if (this.shootCooldown === 0 && !this.gameOver && !this.won) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - BULLET_WIDTH / 2,
                y: this.player.y,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT,
                speed: 2.5
            });
            this.shootCooldown = 20;
        }
    }

    collision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    checkShieldCollision(bullet) {
        for (let shield of this.shields) {
            for (let i = shield.blocks.length - 1; i >= 0; i--) {
                const block = shield.blocks[i];
                if (block.alive) {
                    const blockRect = {
                        x: shield.x + block.x,
                        y: shield.y + block.y,
                        width: 8,
                        height: 8
                    };
                    if (this.collision(bullet, blockRect)) {
                        block.alive = false;
                        return true;
                    }
                }
            }
        }
        return false;
    }

    draw(ctx) {
        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw score and lives
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`SCORE: ${this.score.toString().padStart(4, '0')}`, 10, 25);
        ctx.fillText(`LIVES: ${this.lives}`, CANVAS_WIDTH - 120, 25);
        ctx.fillText(`LEVEL: ${this.level}`, CANVAS_WIDTH / 2 - 40, 25);

        // Draw line separator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 35);
        ctx.lineTo(CANVAS_WIDTH, 35);
        ctx.stroke();

        // Draw player
        this.drawPlayer(ctx);

        // Draw invaders
        this.invaders.forEach(inv => {
            if (inv.alive) {
                this.drawInvader(ctx, inv);
            }
        });

        // Draw bullets
        ctx.fillStyle = '#ffffff';
        this.bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });

        // Draw enemy bullets
        ctx.fillStyle = '#ff0000';
        this.enemyBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });

        // Draw shields
        ctx.fillStyle = '#00ff00';
        this.shields.forEach(shield => {
            shield.blocks.forEach(block => {
                if (block.alive) {
                    ctx.fillRect(shield.x + block.x, shield.y + block.y, 8, 8);
                }
            });
        });

        // Game over / Win screen
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, CANVAS_HEIGHT / 2 - 50, CANVAS_WIDTH, 100);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.font = '16px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Press SPACE to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
            ctx.textAlign = 'left';
        } else if (this.won) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, CANVAS_HEIGHT / 2 - 50, CANVAS_WIDTH, 100);
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.font = '16px monospace';
            ctx.fillText('Press SPACE to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
            ctx.textAlign = 'left';
        }
    }

    drawPlayer(ctx) {
        ctx.fillStyle = '#00ff00';
        const px = this.player.x;
        const py = this.player.y;
        
        // Tank body
        ctx.fillRect(px + 8, py + 12, 10, 4);
        // Tank turret
        ctx.fillRect(px + 11, py + 8, 4, 8);
        // Tank wheels
        ctx.fillRect(px, py + 14, 26, 2);
    }

    drawInvader(ctx, inv) {
        ctx.fillStyle = inv.type === 3 ? '#ff0000' : inv.type === 2 ? '#ffff00' : '#00ffff';
        const x = inv.x;
        const y = inv.y;
        const frame = this.animFrame;
        
        // Draw different invader sprites based on type and animation frame
        if (inv.type === 3) {
            // Top row - squid
            if (frame === 0) {
                ctx.fillRect(x + 8, y, 6, 2);
                ctx.fillRect(x + 2, y + 2, 18, 8);
                ctx.fillRect(x, y + 10, 4, 2);
                ctx.fillRect(x + 18, y + 10, 4, 2);
                ctx.fillRect(x + 4, y + 12, 4, 4);
                ctx.fillRect(x + 14, y + 12, 4, 4);
            } else {
                ctx.fillRect(x + 8, y, 6, 2);
                ctx.fillRect(x + 2, y + 2, 18, 8);
                ctx.fillRect(x + 4, y + 10, 4, 2);
                ctx.fillRect(x + 14, y + 10, 4, 2);
                ctx.fillRect(x, y + 12, 4, 4);
                ctx.fillRect(x + 18, y + 12, 4, 4);
            }
        } else if (inv.type === 2) {
            // Middle rows - crab
            if (frame === 0) {
                ctx.fillRect(x + 4, y, 2, 4);
                ctx.fillRect(x + 16, y, 2, 4);
                ctx.fillRect(x + 2, y + 4, 18, 6);
                ctx.fillRect(x, y + 10, 4, 4);
                ctx.fillRect(x + 8, y + 10, 6, 4);
                ctx.fillRect(x + 18, y + 10, 4, 4);
            } else {
                ctx.fillRect(x, y, 4, 4);
                ctx.fillRect(x + 18, y, 4, 4);
                ctx.fillRect(x + 2, y + 4, 18, 6);
                ctx.fillRect(x + 4, y + 10, 4, 4);
                ctx.fillRect(x + 14, y + 10, 4, 4);
            }
        } else {
            // Bottom rows - octopus
            if (frame === 0) {
                ctx.fillRect(x + 6, y, 10, 6);
                ctx.fillRect(x + 2, y + 6, 18, 4);
                ctx.fillRect(x, y + 10, 4, 4);
                ctx.fillRect(x + 8, y + 10, 2, 4);
                ctx.fillRect(x + 12, y + 10, 2, 4);
                ctx.fillRect(x + 18, y + 10, 4, 4);
            } else {
                ctx.fillRect(x + 6, y, 10, 6);
                ctx.fillRect(x + 2, y + 6, 18, 4);
                ctx.fillRect(x + 2, y + 10, 4, 4);
                ctx.fillRect(x + 16, y + 10, 4, 4);
                ctx.fillRect(x + 8, y + 12, 2, 2);
                ctx.fillRect(x + 12, y + 12, 2, 2);
            }
        }
    }
}

app.registerExtension({
    name: "Comfy.SpaceInvadersGame",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SpaceInvadersGame") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.properties = this.properties || {};
                this.serialize_widgets = false;
                this.widgets = this.widgets || [];
                
                if (this.spaceInvadersGameInitialized) {
                    return result;
                }
                this.spaceInvadersGameInitialized = true;
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvas.style.width = `${CANVAS_WIDTH}px`;
                canvas.style.height = `${CANVAS_HEIGHT}px`;
                
                const ctx = canvas.getContext('2d');
                
                // Initialize game
                const game = new SpaceInvadersGame(this);
                this.spaceInvadersGame = game;
                
                // Game loop
                let animationId = null;
                const gameLoop = () => {
                    game.update();
                    game.draw(ctx);
                    animationId = requestAnimationFrame(gameLoop);
                };
                gameLoop();
                
                this.spaceInvadersGameAnimationId = animationId;
                
                // Set node size
                const nodeWidth = CANVAS_WIDTH + 20;
                const nodeHeight = CANVAS_HEIGHT + 60;
                this.size = [nodeWidth, nodeHeight];
                this.setSize([nodeWidth, nodeHeight]);
                
                // Add canvas widget
                const widget = this.addDOMWidget("space_invaders_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                // Handle keyboard input
                const handleKeyDown = (e) => {
                    if (!this.spaceInvadersGame) return;
                    
                    const key = e.key.toLowerCase();
                    this.spaceInvadersGame.keys[key] = true;
                    this.spaceInvadersGame.keys[e.key] = true;
                    
                    if (e.key === ' ') {
                        e.preventDefault();
                        if (this.spaceInvadersGame.gameOver || this.spaceInvadersGame.won) {
                            this.spaceInvadersGame.reset();
                        } else {
                            this.spaceInvadersGame.shoot();
                        }
                    }
                };
                
                const handleKeyUp = (e) => {
                    if (!this.spaceInvadersGame) return;
                    
                    const key = e.key.toLowerCase();
                    this.spaceInvadersGame.keys[key] = false;
                    this.spaceInvadersGame.keys[e.key] = false;
                };
                
                canvas.tabIndex = 0;
                canvas.addEventListener('keydown', handleKeyDown);
                canvas.addEventListener('keyup', handleKeyUp);
                canvas.addEventListener('click', () => canvas.focus());
                
                // Auto-focus when created
                setTimeout(() => canvas.focus(), 100);
                
                return result;
            };
            
            // Cleanup on removal
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                if (this.spaceInvadersGameAnimationId) {
                    cancelAnimationFrame(this.spaceInvadersGameAnimationId);
                }
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});