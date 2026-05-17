        class EngineManager {
            constructor() {
                this.worker = null;
                this.ready = false;
                this.thinking = false;
                this.onEngineMove = null;
                this.onMessage = null;
                this.initPromise = null;
            }

            async init() {
                if (this.initPromise) return this.initPromise;
                const workerUrl = 'https://unpkg.com/stockfish@18.0.7/bin/stockfish-18-lite-single.js';
                const wasmUrl = 'https://unpkg.com/stockfish@18.0.7/bin/stockfish-18-lite-single.wasm';
                
                this.initPromise = new Promise(async (resolve, reject) => {
                    try {
                        let finalWorkerUrl = workerUrl;
                        
                        // Try direct Worker first (fastest for http/https)
                        try {
                            const testWorker = new Worker(workerUrl);
                            testWorker.terminate();
                        } catch (directErr) {
                            // file:// or restricted environment: fall back to Blob Worker
                            console.log('Direct Worker blocked, trying Blob Worker...');
                            const res = await fetch(workerUrl);
                            if (!res.ok) throw new Error('Failed to fetch Stockfish script: ' + res.status);
                            const code = await res.text();
                            const blob = new Blob([code], {type: 'application/javascript'});
                            // Pass wasm URL via hash so stockfish.js can locate it
                            finalWorkerUrl = URL.createObjectURL(blob) + '#' + encodeURIComponent(wasmUrl);
                        }
                        
                        this.worker = new Worker(finalWorkerUrl);
                        let uciokReceived = false;
                        let bootLines = [];
                        this.worker.onmessage = (e) => {
                            const msg = typeof e.data === 'string' ? e.data : '';
                            bootLines.push(msg);
                            if (!uciokReceived && msg.includes('uciok')) {
                                uciokReceived = true;
                                this.ready = true;
                                resolve();
                            } else if (msg.startsWith('bestmove')) {
                                this.thinking = false;
                                const parts = msg.split(' ');
                                const bestMove = parts[1] === '(none)' ? null : parts[1];
                                if (this.onEngineMove) this.onEngineMove(bestMove);
                            }
                            if (this.onMessage) this.onMessage(msg);
                        };
                        this.worker.onerror = (err) => {
                            console.error('Stockfish Worker error:', err);
                            reject(err);
                        };
                        this.postMessage('uci');
                        setTimeout(() => {
                            if (!uciokReceived) {
                                console.error('Stockfish boot log:', bootLines);
                                reject(new Error('Stockfish init timeout (60s). The engine may be loading slowly on your connection.'));
                            }
                        }, 60000);
                    } catch (err) {
                        reject(err);
                    }
                });
                return this.initPromise;
            }

            postMessage(msg) {
                if (this.worker) this.worker.postMessage(msg);
            }

            setDifficulty(level) {
                const map = {
                    easy: { elo: 1200, skill: 5, depth: 8 },
                    medium: { elo: 1800, skill: 10, depth: 10 },
                    hard: { elo: 2200, skill: 15, depth: 14 },
                    expert: { elo: 2800, skill: 20, depth: 18 }
                };
                const cfg = map[level] || map.medium;
                this.postMessage('setoption name UCI_LimitStrength value true');
                this.postMessage(`setoption name UCI_Elo value ${cfg.elo}`);
                this.postMessage(`setoption name Skill Level value ${cfg.skill}`);
                this.depth = cfg.depth;
            }

            newGame() { this.postMessage('ucinewgame'); }
            setPosition(fen) { this.postMessage(`position fen ${fen}`); }

            go() {
                this.thinking = true;
                this.postMessage(`go depth ${this.depth}`);
            }

            terminate() {
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                    this.ready = false;
                    this.initPromise = null;
                }
            }
        }
