        let engine = null;
        let game = null;
        let currentLevel = 'medium';
        let boardVisible = false;
        let audioCtx = null;

        function playMoveSound() {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.12);
            } catch (e) {
                // Audio not available, silently ignore
            }
        }
        function startEngine(level) {
            currentLevel = level;
            document.getElementById('diffBadge').textContent = t(level);
            document.getElementById('difficultyScreen').classList.remove('active');
            document.getElementById('difficultyScreen').classList.add('hidden');
            const gs = document.getElementById('gameScreen');
            gs.classList.remove('hidden');
            requestAnimationFrame(() => gs.classList.add('active'));
            initGame();
        }

        function showStartFromGame() {
            if (engine) { engine.terminate(); engine = null; }
            document.getElementById('gameScreen').classList.remove('active');
            document.getElementById('gameScreen').classList.add('hidden');
            const start = document.getElementById('startScreen');
            start.classList.remove('hidden');
            requestAnimationFrame(() => start.classList.add('active'));
        }

        async function initGame() {
            if (engine) { engine.terminate(); engine = null; }
            game = new Chess();
            boardVisible = false;
            document.getElementById('boardPanel').classList.add('hidden');
            document.getElementById('moveHistory').innerHTML = '<div style="color:var(--text-secondary);text-align:center;font-size:0.9rem;padding:1rem 0;">' + t('newGameStarted') + '</div>';
            const input = document.getElementById('moveInput');
            input.value = ''; input.disabled = false;
            updateEngineStatus(t('engineReady'));
            document.getElementById('engineStatus').classList.remove('error');

            try {
                engine = new EngineManager();
                engine.onEngineMove = handleEngineMove;
                await engine.init();
                engine.setDifficulty(currentLevel);
                engine.newGame();
            } catch (err) {
                console.error('Engine init failed:', err);
                engine = null;
                updateEngineStatus(t('loadingError'));
                document.getElementById('engineStatus').classList.add('error');
                document.getElementById('moveHistory').innerHTML = '<div style="color:#ff453a;text-align:center;padding:1rem;">' + t('loadingError') + '</div>';
            }
        }

        function normalizeMove(input) {
            const s = input.trim();
            if (/^0-0-0$/i.test(s) || /^o-o-o$/i.test(s)) return 'O-O-O';
            if (/^0-0$/i.test(s) || /^o-o$/i.test(s)) return 'O-O';
            return s.replace(/[a-h]/gi, m => m.toLowerCase())
                    .replace(/[nbrqk]/gi, m => m.toUpperCase());
        }

        function submitMove() {
            const input = document.getElementById('moveInput');
            const san = normalizeMove(input.value);
            if (!san) return;

            const move = game.move(san);
            if (!move) {
                input.style.borderColor = '#ff453a';
                setTimeout(() => input.style.borderColor = '', 600);
                return;
            }

            input.value = '';
            input.style.borderColor = '';
            updateMoveHistory();
            renderBoard();
            playMoveSound();

            if (game.game_over()) {
                handleGameOver();
                return;
            }

            if (!engine || !engine.ready) {
                updateEngineStatus(t('loadingError'));
                document.getElementById('engineStatus').classList.add('error');
                return;
            }
            input.disabled = true;
            updateEngineStatus(t('engineThinking'));
            engine.setPosition(game.fen());
            engine.go();
        }

        function handleEngineMove(bestMoveUci) {
            if (!bestMoveUci) {
                document.getElementById('moveInput').disabled = true;
                updateEngineStatus(t('engineReady'));
                return;
            }

            const moves = game.moves({ verbose: true });
            const match = moves.find(m => {
                let uci = m.from + m.to;
                if (m.promotion) uci += m.promotion;
                return uci === bestMoveUci;
            });

            if (match) {
                const result = game.move(match.san);
                if (result) {
                    updateMoveHistory();
                    renderBoard();
                    playMoveSound();
                } else {
                    console.error('Engine move failed:', match.san);
                }
            } else {
                console.error('Engine UCI not matched:', bestMoveUci, 'legal moves:', moves.map(m => m.from + m.to + (m.promotion || '')));
            }

            const input = document.getElementById('moveInput');
            input.disabled = false;
            input.focus();
            updateEngineStatus(t('engineReady'));

            if (game.game_over()) {
                handleGameOver();
            }
        }

        function updateMoveHistory() {
            const history = game.history();
            const container = document.getElementById('moveHistory');
            if (history.length === 0) {
                container.innerHTML = '<div style="color:var(--text-secondary);text-align:center;font-size:0.9rem;padding:1rem 0;">' + t('newGameStarted') + '</div>';
                return;
            }
            let html = '';
            for (let i = 0; i < history.length; i += 2) {
                const num = Math.floor(i / 2) + 1;
                const white = history[i];
                const black = history[i + 1] || '';
                html += `<div class="move-row"><span class="move-number">${num}.</span><span class="move-white">${white}</span><span class="move-black">${black}</span></div>`;
            }
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        }

        const pieceSvgs = {
            wk: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M4.48 288.116v.484h-.537v.753h.537c0 .582-.142.476-.533.717-2.418-.972-3.734 2.055-.939 4.107l3.715-.014c2.848-2.038 1.504-5.064-.913-4.077-.46-.253-.545-.111-.545-.733h.548v-.753h-.548v-.484zm1.929 3.058c.644.065.894.873-.79 2.028v-1.617c.312-.315.497-.44.79-.41zm-2.962.008c.272.01.402.139.675.415v1.616c-1.683-1.154-1.433-1.962-.789-2.027a.85.85 0 0 1 .114-.004z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.37229237;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            wq: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M15.014 3.873a3.016 3.016 0 0 0-3.018 3.016 3.016 3.016 0 0 0 1.91 2.804l-.373 8.116-3.984-6.524a3.016 3.016 0 0 0 .53-1.709 3.016 3.016 0 0 0-3.017-3.015 3.016 3.016 0 0 0-3.015 3.015 3.016 3.016 0 0 0 2.504 2.97l4.773 14.69h15.147l4.76-14.6a3.016 3.016 0 0 0 2.595-2.982 3.016 3.016 0 0 0-3.015-3.015 3.016 3.016 0 0 0-3.016 3.015 3.016 3.016 0 0 0 .455 1.584l-4.072 6.57-.319-8.128a3.016 3.016 0 0 0 1.875-2.791 3.016 3.016 0 0 0-3.015-3.016 3.016 3.016 0 0 0-3.016 3.016 3.016 3.016 0 0 0 .854 2.103l-1.702 8.817-1.625-8.88a3.016 3.016 0 0 0 .8-2.04 3.016 3.016 0 0 0-3.016-3.016z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="scale(.26458)"/></g></g></svg>`,
            wr: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.74 294.177-.567-3.253H3.569l-.561 3.253z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.66 289.342-.8-.222-.173.439-.328-.002v-.624l-1.002.017v.607h-.292l-.21-.436-.784.307s-.008 1.53.404 1.521h2.781c.412 0 .404-1.606.404-1.606z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            wb: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495zm.01-.014c.202-.292 1.198-2.21-.75-4.165 0 0-.783 1.088-.913 2.696l-.477-.001c-.009-1.476 1.01-3.004 1.01-3.004.82-1.66-1.874-1.665-1.13 0-2.275 2.009-1.262 4.219-1.095 4.474z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            wn: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.545 294.15H3.201c.046-1.268 1.457-1.942 1.521-2.553.065-.612-.223-.77-.223-.77s-.197.736-.448.886-.836.291-.836.291-.41.37-.651.344c-.242-.025-.449-.603-.449-.603l.82-1.306.417-.926.392-.428.168-.628.473.552c2.601 0 3.165 3.352 2.16 5.14zm-.003.028c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604324;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            wp: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M18.875 10.234a3.938 3.938 0 0 0-3.938 3.938 3.938 3.938 0 0 0 1.27 2.889l-2.234.959v2.33l2.643-.008c-1.555 10.05-6.007 6.96-6.007 12.527h16.657c0-5.646-4.56-2.232-6.124-12.53l2.64-.04v-2.315l-2.21-.945a3.938 3.938 0 0 0 1.242-2.867 3.938 3.938 0 0 0-3.939-3.938z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="scale(.26458)"/></g></g></svg>`,
            bk: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M4.48 287.937v.468h-.537v.727h.537c0 .563-.142.46-.533.694-2.418-.94-3.734 1.985-.939 3.968l3.715-.013c2.848-1.97 1.504-4.894-.913-3.94-.46-.245-.545-.107-.545-.709h.548v-.727h-.548v-.468zm1.929 2.955c.644.063.894.844-.79 1.96v-1.563c.312-.305.497-.425.79-.397m-2.962.008c.272.01.402.134.675.401v1.562c-1.683-1.115-1.433-1.897-.789-1.959a.85.85 0 0 1 .114-.004" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.36596447;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            bq: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M3.917 287.996a.743.747 0 0 0-.743.746.743.747 0 0 0 .47.694l-.092 2.01-.982-1.615a.743.747 0 0 0 .13-.424.743.747 0 0 0-.742-.746.743.747 0 0 0-.743.746.743.747 0 0 0 .617.736l1.176 3.636h3.733l1.173-3.614a.743.747 0 0 0 .64-.738.743.747 0 0 0-.744-.747.743.747 0 0 0-.743.747.743.747 0 0 0 .112.392l-1.003 1.626-.079-2.012a.743.747 0 0 0 .462-.69.743.747 0 0 0-.743-.747.743.747 0 0 0-.743.746.743.747 0 0 0 .21.52l-.419 2.183-.4-2.198a.743.747 0 0 0 .196-.505.743.747 0 0 0-.743-.746" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.37341464;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            br: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.74 293.78-.567-2.412H3.569l-.561 2.412z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.33243936;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.66 289.342-.8-.222-.173.439-.328-.002v-.624l-1.002.017v.607h-.292l-.21-.436-.784.307s-.008 1.53.404 1.521h2.781c.412 0 .404-1.606.404-1.606z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            bb: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000002;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M6.552 293.804c.202-.274 1.198-2.07-.75-3.903 0 0-.783 1.02-.913 2.526h-.477c-.009-1.383 1.01-2.815 1.01-2.815.82-1.555-1.874-1.56-1.13 0-2.275 1.882-1.262 3.953-1.095 4.192z" style="fill:#000002;fill-opacity:1;stroke:none;stroke-width:.37369174;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            bn: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.5422 294.1782c1.0776 0 1.1247.8573 1.1247 1.4946H2.0688c0-.649.0465-1.4946 1.1241-1.4946z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604324;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M6.4242 293.7612H3.3096c.0424-1.2235 1.357-1.8739 1.4169-2.4641.0598-.5903-.208-.7423-.208-.7423s-.1836.7095-.4175.8545c-.234.145-.7784.2813-.7784.2813s-.382.3571-.6072.3323c-.2252-.025-.4179-.5822-.4179-.5822l.7646-1.261.3874-.894.3656-.413.1566-.6066.4401.5334c2.4231 0 2.9485 3.2354 2.0124 4.9617" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.36607537;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
            bp: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M18.875 10.234a3.938 3.938 0 0 0-3.938 3.938 3.938 3.938 0 0 0 1.27 2.889l-2.234.959v2.33l2.643-.008c-1.555 10.05-6.007 6.96-6.007 12.527h16.657c0-5.646-4.56-2.232-6.124-12.53l2.64-.04v-2.315l-2.21-.945a3.938 3.938 0 0 0 1.242-2.867 3.938 3.938 0 0 0-3.939-3.938" style="fill:#000004;fill-opacity:1;stroke:none;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="scale(.26458)"/></g></g></svg>`
        };

        function renderBoard(chessGame) {
            const board = (chessGame || game).board();
            let html = '';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const isLight = (r + c) % 2 === 0;
                    const piece = board[r][c];
                    const cls = isLight ? 'light' : 'dark';
                    const content = piece ? pieceSvgs[piece.color + piece.type] : '';
                    html += `<div class="square ${cls}">${content}</div>`;
                }
            }
            document.getElementById('boardGrid').innerHTML = html;
        }

        function toggleBoard() {
            boardVisible = !boardVisible;
            document.getElementById('boardPanel').classList.toggle('hidden', !boardVisible);
            if (boardVisible) renderBoard();
        }

        function updateEngineStatus(text) {
            const el = document.getElementById('engineStatus');
            const isThinking = text === t('engineThinking');
            const dot = isThinking ? '◐' : '●';
            el.textContent = dot + ' ' + text;
            el.classList.toggle('thinking', isThinking);
        }

        function generatePgnHeader(result) {
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
            const moves = game.pgn() || '';
            return `[Event "Blindfold Chess"]
[Site "https://michaelgao-watcher.github.io/blindfold-chess/"]
[Date "${today}"]
[White "Player"]
[Black "Stockfish"]
[Result "${result}"]

${moves}`;
        }

        function setResultPgn(result) {
            const pgnEl = document.getElementById('resultPgn');
            if (pgnEl) {
                pgnEl.textContent = generatePgnHeader(result);
            }
        }

        function copyPgn() {
            const pgnEl = document.getElementById('resultPgn');
            if (!pgnEl || !pgnEl.textContent) return;
            const text = pgnEl.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    const btn = document.querySelector('.copy-btn');
                    if (btn) {
                        const orig = btn.textContent;
                        btn.textContent = '✓ 已复制';
                        setTimeout(() => btn.textContent = orig, 1500);
                    }
                }).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        }

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                const btn = document.querySelector('.copy-btn');
                if (btn) {
                    const orig = btn.textContent;
                    btn.textContent = '✓ 已复制';
                    setTimeout(() => btn.textContent = orig, 1500);
                }
            } catch (e) {}
            document.body.removeChild(ta);
        }

        function handleGameOver() {
            document.getElementById('moveInput').disabled = true;
            let title, msg, result;
            if (game.in_checkmate()) {
                const winner = game.turn() === 'w' ? 'Black' : 'White';
                title = t('resultCheckmate');
                msg = (winner === 'White' ? t('whiteWins') : t('blackWins'));
                result = winner === 'White' ? '1-0' : '0-1';
            } else if (game.in_stalemate()) {
                title = t('resultStalemate');
                msg = t('stalemateDraw');
                result = '1/2-1/2';
            } else if (game.in_draw()) {
                title = t('resultDraw');
                msg = t('gameDrawn');
                result = '1/2-1/2';
            } else {
                title = t('resultOver');
                msg = t('gameEnded');
                result = '*';
            }
            document.getElementById('resultTitle').textContent = title;
            document.getElementById('resultMsg').textContent = msg;
            setResultPgn(result);
            document.getElementById('resultOverlay').classList.add('show');
        }

        function hideResult() {
            document.getElementById('resultOverlay').classList.remove('show');
        }

        function newGame() {
            hideResult();
            initGame();
        }

        function resign() {
            if (!game || game.game_over()) return;
            document.getElementById('resultTitle').textContent = t('resigned');
            document.getElementById('resultMsg').textContent = t('resignedMsg');
            setResultPgn('0-1');
            document.getElementById('resultOverlay').classList.add('show');
            document.getElementById('moveInput').disabled = true;
        }
