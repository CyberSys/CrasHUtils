import { app } from "../../scripts/app.js";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 400;

app.registerExtension({
    name: "Comfy.DoomGame",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "DoomGame") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.properties = this.properties || {};
                this.serialize_widgets = false;
                this.widgets = this.widgets || [];
                
                if (this.doomGameInitialized) {
                    return result;
                }
                this.doomGameInitialized = true;
                
                // Create container
                const container = document.createElement('div');
                container.style.width = `${CANVAS_WIDTH}px`;
                container.style.height = `${CANVAS_HEIGHT}px`;
                container.style.backgroundColor = '#000';
                container.style.position = 'relative';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                
                // Create canvas for DOS emulator
                const canvas = document.createElement('canvas');
                canvas.id = 'jsdos-' + Date.now(); // Unique ID for each instance
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.imageRendering = 'pixelated';
                canvas.tabIndex = -1; // Make focusable but not in tab order
                
                // Create info overlay
                const infoDiv = document.createElement('div');
                infoDiv.style.position = 'absolute';
                infoDiv.style.top = '10px';
                infoDiv.style.left = '10px';
                infoDiv.style.right = '10px';
                infoDiv.style.color = '#fff';
                infoDiv.style.fontFamily = 'monospace';
                infoDiv.style.fontSize = '12px';
                infoDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                infoDiv.style.padding = '10px';
                infoDiv.style.borderRadius = '4px';
                infoDiv.style.zIndex = '1000';
                infoDiv.style.pointerEvents = 'auto'; // Allow button clicks
                infoDiv.innerHTML = `
                    <div style="margin-bottom: 10px; font-weight: bold; color: #ff0;">⚠️ CHECKING DOOM FILES...</div>
                    <div style="margin-bottom: 5px;">Loading...</div>
                `;
                
                container.appendChild(canvas);
                container.appendChild(infoDiv);
                
                // Store DOS instance for cleanup
                this.dosInstance = null;
                this.keyboardLocked = false;
                
                // Download DOOM files automatically
                const downloadDoomFiles = async () => {
                    infoDiv.innerHTML = `
                        <div style="margin-bottom: 10px; font-weight: bold; color: #ff0;">📥 DOWNLOADING DOOM...</div>
                        <div style="margin-bottom: 5px;">Downloading DOOM Shareware from archive.org...</div>
                        <div style="margin-bottom: 5px; font-size: 11px; color: #888;">This is the official free shareware version (v1.9)</div>
                        <div style="margin-top: 10px; color: #0ff;">This may take 30-60 seconds, please wait...</div>
                    `;
                    
                    try {
                        const response = await fetch('/doom/download', { method: 'POST' });
                        const result = await response.json();
                        
                        if (result.success) {
                            infoDiv.innerHTML = `
                                <div style="margin-bottom: 10px; font-weight: bold; color: #0f0;">✓ DOWNLOAD COMPLETE!</div>
                                <div style="margin-bottom: 5px;">Files: ${result.files.join(', ')}</div>
                                <div style="margin-top: 5px; color: #0ff;">Continuing...</div>
                            `;
                        } else {
                            infoDiv.innerHTML = `
                                <div style="margin-bottom: 10px; font-weight: bold; color: #f00;">❌ DOWNLOAD FAILED</div>
                                <div style="margin-bottom: 5px; color: #ff0;">Error: ${result.error}</div>
                                <div style="margin-top: 10px; font-size: 11px;">
                                    Manual setup:<br>
                                    1. Download DOOM Shareware from <a href="https://archive.org/details/DoomsharewareEpisode" target="_blank" style="color: #0ff;">archive.org</a><br>
                                    2. Place DOOM.EXE and DOOM1.WAD in the doom folder<br>
                                    3. Restart ComfyUI and refresh this page
                                </div>
                            `;
                            console.error('[Doom] Download failed:', result.error);
                        }
                    } catch (err) {
                        console.error('[Doom] Download error:', err);
                        infoDiv.innerHTML = `
                            <div style="margin-bottom: 10px; font-weight: bold; color: #f00;">❌ DOWNLOAD FAILED</div>
                            <div style="margin-bottom: 5px; color: #ff0;">Error: ${err.message}</div>
                            <div style="margin-top: 10px; font-size: 11px;">
                                Manual setup:<br>
                                1. Download DOOM Shareware from <a href="https://archive.org/details/DoomsharewareEpisode" target="_blank" style="color: #0ff;">archive.org</a><br>
                                2. Place DOOM.EXE and DOOM1.WAD in the doom folder<br>
                                3. Restart ComfyUI and refresh this page
                            </div>
                        `;
                    }
                };
                
                // Try to load js-dos and start DOOM or DOS demo
                const checkAndLoadDoom = async () => {
                    try {
                        // Check file status from backend
                        const statusResponse = await fetch('/doom/status');
                        const status = await statusResponse.json();
                        
                        let hasExe = status.hasExe;
                        let hasWad = status.hasWad;
                        
                        // If files are missing, automatically download them
                        if (!hasExe || !hasWad) {
                            await downloadDoomFiles();
                            // After download, re-check status
                            const newStatusResponse = await fetch('/doom/status');
                            const newStatus = await newStatusResponse.json();
                            hasExe = newStatus.hasExe;
                            hasWad = newStatus.hasWad;
                            
                            // If still missing, stop here (download failed)
                            if (!hasExe || !hasWad) {
                            return;
                            }
                        }
                        
                        // Files are ready - show loading message
                        infoDiv.innerHTML = `
                            <div style="margin-bottom: 10px; font-weight: bold; color: #0f0;">✓ DOOM FILES READY - LOADING...</div>
                            <div style="margin-bottom: 5px;">Starting DOOM emulator...</div>
                            <div style="margin-top: 10px; color: #0ff;">Click canvas to play, click outside to release keyboard</div>
                        `;
                        
                        // Load js-dos from CDN
                        const jsDosScript = document.createElement('script');
                        jsDosScript.src = 'https://cdn.jsdelivr.net/npm/js-dos@6.22/dist/js-dos.js';
                        jsDosScript.onload = () => {
                            
                            // Initialize js-dos
                            if (window.Dos) {
                                const ci = window.Dos(canvas, {
                                    wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js",
                                    autolock: false, // Don't auto-lock keyboard
                                    // Try to explicitly enable audio
                                    emulatorFunction: 'dosDirect',
                                });
                                
                                // Store the Promise for now, will update with actual instance
                                this.dosInstance = ci;
                                
                                // Track if emulator is focused
                                let emulatorFocused = false;
                                
                                ci.ready((fs, main) => {
                                    
                                    // NOW store the actual resolved DOS instance
                                    // The 'this' context inside ready() has the actual DOS object
                                    this.dosInstance = ci;
                                    
                                    // Resolve the DOS instance
                                    ci.then(dosInstance => {
                                        this.dosInstance = dosInstance;
                                    });
                                    
                                    // Load files into virtual filesystem
                                    const loadPromises = [];
                                    
                                    if (hasWad) {
                                        loadPromises.push(
                                            fetch('/doom/files/DOOM1.WAD')
                                        .then(response => response.arrayBuffer())
                                        .then(data => {
                                            fs.createFile("DOOM1.WAD", new Uint8Array(data));
                                                })
                                        );
                                    }
                                    
                                    if (hasExe) {
                                        loadPromises.push(
                                            fetch('/doom/files/DOOM.EXE')
                                                .then(response => response.arrayBuffer())
                                                .then(data => {
                                                    fs.createFile("DOOM.EXE", new Uint8Array(data));
                                                })
                                        );
                                    }
                                    
                                    Promise.all(loadPromises).then(() => {

    // Write DEFAULT.CFG with Sound Blaster config (audio may not work in js-dos)
    try {
        const defaultCfg = `mouse_sensitivity 5
sfx_volume 8
music_volume 8
show_messages 1
key_right 77
key_left 75
key_up 72
key_down 80
key_strafeleft 51
key_straferight 52
key_fire 29
key_use 57
key_strafe 56
key_speed 54
use_mouse 1
mouseb_fire 0
mouseb_strafe 1
mouseb_forward 2
joyb_fire 0
joyb_strafe 1
joyb_use 3
joyb_speed 2
screenblocks 10
snd_channels 8
snd_musicdevice 3
snd_sfxdevice 3
snd_sbport 544
snd_sbirq 7
snd_sbdma 1
snd_mport 816`;
        fs.createFile('DEFAULT.CFG', new TextEncoder().encode(defaultCfg));
    } catch (e) {
        // Silent fail
    }

                                        if (hasExe && hasWad) {
                                            // We have everything - try to launch DOOM!
                                            // Create DOSBox config file for better display and SOUND
                                            // NOTE: Don't put DOOM.EXE in [autoexec] - files aren't ready yet
                                            const dosboxConf = `[cpu]
core=auto
cycles=max

[render]
aspect=true
scaler=normal2x

[sdl]
fullscreen=false
output=surface

[mixer]
nosound=false
rate=44100
blocksize=1024
prebuffer=25

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
sbmixer=true
oplmode=auto
oplemu=default
oplrate=44100

[gus]
gus=false

[speaker]
pcspeaker=true
pcrate=44100
tandy=auto
tandyrate=44100
disney=true
`;
                                            
        // Write the config file to the virtual filesystem
        const configData = new TextEncoder().encode(dosboxConf);
        fs.createFile("dosbox.conf", configData);
        infoDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #0f0;">🎮 LAUNCHING DOOM!</div>
            <div style="margin-bottom: 5px;">Click canvas to play</div>
            <div style="color: #888; font-size: 10px;">Click outside to release keyboard</div>
        `;
                                        }
                                        
                                        // Demo mode command for when DOOM.EXE is missing
                                        const demoCommand = `@echo off
echo.
echo ========================================
echo    DOOM Node - DOS Emulator Demo
echo ========================================
echo.
${hasWad ? 'echo Files found: DOOM1.WAD\necho Missing: DOOM.EXE\necho.\necho To play DOOM:\necho 1. Get DOOM.EXE from DOOM Shareware\necho 2. Place in doom folder\necho 3. Restart ComfyUI' : 'echo No DOOM files found\necho.\necho To play DOOM, you need:\necho 1. DOOM.EXE\necho 2. DOOM1.WAD\necho.\necho Place both in the doom folder'}
echo.
echo Type DIR to see files
echo ========================================
echo.`;
                                        
                                        // Choose start args based on whether we have the game
                                        // Use -conf for settings, then -c to run the command after files are mounted
                                        const startArgs = (hasExe && hasWad) 
                                            ? [
                                                "-conf", "dosbox.conf",
                                                "-c", "SET BLASTER=A220 I7 D1 H5 P330 T6",
                                                "-c", "SET MIDI=UART",
                                                "-c", "mixer master 200:200",
                                                "-c", "mixer sb 200:200",
                                                "-c", "mixer opl 200:200",
                                                "-c", "echo Loading DOOM with Sound...",
                                                "-c", "DOOM.EXE -2"
                                              ] 
                                            : ["-c", demoCommand];
                                        
                                        main(startArgs).then((runtime) => {
                                            // Store runtime for keyboard control
                                            this.dosRuntime = runtime;
                                            
                                            if (hasExe && hasWad) {
                                                // Hide info after DOOM starts
                                                setTimeout(() => {
                                                    infoDiv.style.opacity = '0';
                                                    setTimeout(() => { infoDiv.style.display = 'none'; }, 500);
                                                }, 3000);
                                            } else {
                                                // Keep info visible for demo mode
                                                setTimeout(() => {
                                                    infoDiv.style.opacity = '0.8';
                                                }, 3000);
                                            }
                                            }).catch(err => {
                                                console.error('[Doom] Error starting:', err);
                                            infoDiv.innerHTML = `<div style="color: #f00;">Error starting: ${err.message}</div>`;
                                            infoDiv.style.display = 'block';
                                        });
                                    }).catch(err => {
                                        console.error('[Doom] Error loading files:', err);
                                        infoDiv.innerHTML = `<div style="color: #f00;">Error loading files: ${err.message}</div>`;
                                        });
                                });
                            }
                        };
                        jsDosScript.onerror = () => {
                            console.error('[Doom] Failed to load js-dos');
                            infoDiv.innerHTML = `<div style="color: #f00;">Failed to load js-dos library from CDN</div>`;
                        };
                        document.head.appendChild(jsDosScript);
                        
                    } catch (err) {
                        console.error('[Doom] Setup error:', err);
                        infoDiv.innerHTML = `<div style="color: #f00;">Setup error: ${err.message}</div>`;
                    }
                };
                
                // Handle focus/blur to manage keyboard capture
                const releaseKeyboard = () => {
                    this.keyboardLocked = false;
                    
                    // Exit pointer lock if active
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    
                    // Blur all canvases in the container
                    const allCanvases = container.querySelectorAll('canvas');
                    allCanvases.forEach(c => {
                        c.blur();
                        c.setAttribute('tabindex', '-1');
                    });
                    
                    // Blur the wrapper canvas
                    canvas.blur();
                    
                    // Remove focus from any active element in container
                    if (document.activeElement && container.contains(document.activeElement)) {
                        document.activeElement.blur();
                    }
                    
                    // Focus document body to ensure keyboard is released
                    document.body.focus();
                    
                    // Force blur ComfyUI canvas if it has focus
                    const comfyCanvas = document.getElementById('graph-canvas');
                    if (comfyCanvas && comfyCanvas === document.activeElement) {
                        comfyCanvas.blur();
                        const originalTabIndex = comfyCanvas.getAttribute('tabindex');
                        comfyCanvas.setAttribute('tabindex', '-1');
                        setTimeout(() => {
                            comfyCanvas.setAttribute('tabindex', originalTabIndex || '1');
                        }, 100);
                    }
                };
                
                const handleCanvasClick = (e) => {
                    e.stopPropagation();
                    this.keyboardLocked = true;
                };
                
                const handleClickOutside = (e) => {
                    // Check if click is outside the container
                    if (!container.contains(e.target) && this.keyboardLocked) {
                        // Prevent the clicked element from taking focus
                        e.preventDefault();
                        e.stopPropagation();
                        
                        releaseKeyboard();
                        
                        // Blur the element that was clicked
                        if (e.target && e.target.blur) {
                            e.target.blur();
                        }
                    }
                };
                
                // Prevent pointer lock on our wrapper canvas
                canvas.addEventListener('click', handleCanvasClick);
                
                // Global click handler - use capture phase
                document.addEventListener('click', handleClickOutside, true);
                document.addEventListener('mousedown', handleClickOutside, true);
                
                // Listen for pointer lock changes
                const handlePointerLockChange = () => {
                    if (document.pointerLockElement && !container.contains(document.pointerLockElement)) {
                        return; // Pointer lock is outside our container
                    }
                    
                    if (!document.pointerLockElement && this.keyboardLocked) {
                        this.keyboardLocked = false; // Pointer lock was released externally
                    }
                };
                
                document.addEventListener('pointerlockchange', handlePointerLockChange);
                document.addEventListener('pointerlockerror', () => {
                    releaseKeyboard();
                });
                
                // ESC key as emergency release
                const handleEscKey = (e) => {
                    if (e.key === 'Escape' && this.keyboardLocked) {
                        e.preventDefault();
                        e.stopPropagation();
                        releaseKeyboard();
                    }
                };
                document.addEventListener('keydown', handleEscKey, true);
                
                // Block keyboard events from reaching DOSBox when not playing
                const blockKeyboardWhenUnlocked = (e) => {
                    // If keyboard IS locked, allow events (DOOM is playing)
                    if (this.keyboardLocked) {
                        return;
                    }
                    
                    // If keyboard is NOT locked, block events from reaching DOSBox
                    // Use bubble phase so INPUT fields work normally first
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                };
                
                // Add keyboard blockers in BUBBLE phase (after targets handle events)
                // This way INPUT fields work, but DOSBox never sees the events
                document.addEventListener('keydown', blockKeyboardWhenUnlocked, false); // false = bubble phase
                document.addEventListener('keyup', blockKeyboardWhenUnlocked, false);
                document.addEventListener('keypress', blockKeyboardWhenUnlocked, false);
                
                // Store event handlers and functions for cleanup
                this.doomEventHandlers = {
                    releaseKeyboard,
                    handleClickOutside,
                    handlePointerLockChange,
                    handleEscKey,
                    blockKeyboardWhenUnlocked
                };
                
                // Check and load after a short delay
                setTimeout(checkAndLoadDoom, 500);
                
                // Set node size
                const nodeWidth = CANVAS_WIDTH + 20;
                const nodeHeight = CANVAS_HEIGHT + 60;
                this.size = [nodeWidth, nodeHeight];
                this.setSize([nodeWidth, nodeHeight]);
                
                // Add DOM widget
                const widget = this.addDOMWidget("doom_container", "div", container, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                // Store references
                this.doomCanvas = canvas;
                this.doomContainer = container;
                this.doomInfoDiv = infoDiv;
                
                return result;
            };
            
            // Cleanup on removal
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                // Release keyboard
                if (this.doomEventHandlers && this.doomEventHandlers.releaseKeyboard) {
                    this.doomEventHandlers.releaseKeyboard();
                }
                
                // Exit pointer lock if active
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                
                // Remove all event listeners
                if (this.doomEventHandlers) {
                    document.removeEventListener('click', this.doomEventHandlers.handleClickOutside, true);
                    document.removeEventListener('mousedown', this.doomEventHandlers.handleClickOutside, true);
                    document.removeEventListener('pointerlockchange', this.doomEventHandlers.handlePointerLockChange);
                    document.removeEventListener('pointerlockerror', this.doomEventHandlers.handlePointerLockChange);
                    document.removeEventListener('keydown', this.doomEventHandlers.handleEscKey, true);
                    document.removeEventListener('keydown', this.doomEventHandlers.blockKeyboardWhenUnlocked, false);
                    document.removeEventListener('keyup', this.doomEventHandlers.blockKeyboardWhenUnlocked, false);
                    document.removeEventListener('keypress', this.doomEventHandlers.blockKeyboardWhenUnlocked, false);
                }
                
                // Stop DOS instance
                if (this.dosRuntime) {
                    try {
                        this.dosRuntime.exit();
                    } catch (err) {
                        console.error('[Doom] Error exiting runtime:', err);
                    }
                    this.dosRuntime = null;
                }
                
                if (this.dosInstance) {
                    try {
                        if (this.dosInstance.stop) {
                            this.dosInstance.stop();
                        }
                    } catch (err) {
                        console.error('[Doom] Error stopping DOS instance:', err);
                    }
                    this.dosInstance = null;
                }
                
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});