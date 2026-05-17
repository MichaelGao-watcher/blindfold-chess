        function showCoordinate() {
            document.getElementById('startScreen').classList.remove('active');
            document.getElementById('startScreen').classList.add('hidden');
            const coord = document.getElementById('coordinateScreen');
            coord.classList.remove('hidden');
            requestAnimationFrame(() => coord.classList.add('active'));
            // Reset coordinate practice UI
            coordState.active = false;
            coordState.side = null;
            document.getElementById('coordSetupActions').style.display = 'flex';
            document.getElementById('coordModeActions').style.display = 'none';
            document.getElementById('coordScore').style.display = 'none';
            document.getElementById('coordPrompt').style.display = 'none';
            document.getElementById('coordInputArea').style.display = 'none';
            document.getElementById('coordFeedback').textContent = '';
            document.getElementById('coordinateBoardWrapper').classList.remove('show-coords');
            renderCoordinateBoard();
            updateCoordLabels();
        }

        function showStartFromCoordinate() {
            coordState.active = false;
            clearCoordHighlight();
            document.getElementById('coordinateScreen').classList.remove('active');
            document.getElementById('coordinateScreen').classList.add('hidden');
            const start = document.getElementById('startScreen');
            start.classList.remove('hidden');
            requestAnimationFrame(() => start.classList.add('active'));
        }

        const coordState = { side: null, mode: 'a', score: 0, total: 0, target: null, active: false, waitingCorrect: false };
        const ALL_SQUARES = (() => { const f='abcdefgh',r='12345678',a=[];for(let i=0;i<8;i++)for(let j=0;j<8;j++)a.push(f[j]+r[i]);return a; })();

        function renderCoordinateBoard() {
            const isBlack = coordState.side === 'black';
            const files = isBlack ? 'hgfedcba' : 'abcdefgh';
            const ranks = isBlack ? '12345678' : '87654321';
            let html = '';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const isLight = (r + c) % 2 === 0;
                    const sq = files[c] + ranks[r];
                    const cls = isLight ? 'light' : 'dark';
                    html += `<div class="square ${cls}" data-square="${sq}" onclick="handleCoordClick(this)"></div>`;
                }
            }
            document.getElementById('coordinateBoardGrid').innerHTML = html;
        }

        function updateCoordLabels() {
            const isBlack = coordState.side === 'black';
            const rowLabels = isBlack ? '12345678' : '87654321';
            const colLabels = isBlack ? 'hgfedcba' : 'abcdefgh';
            const rowContainer = document.querySelector('#coordinateBoardWrapper .board-row-labels');
            const colContainer = document.querySelector('#coordinateBoardWrapper .board-col-labels');
            if (rowContainer) {
                rowContainer.innerHTML = rowLabels.split('').map(ch => `<span>${ch}</span>`).join('');
            }
            if (colContainer) {
                colContainer.innerHTML = colLabels.split('').map(ch => `<span>${ch}</span>`).join('');
            }
        }

        function startCoordinatePractice(color) {
            coordState.side = color;
            coordState.score = 0;
            coordState.total = 0;
            coordState.active = true;
            document.getElementById('coordSetupActions').style.display = 'none';
            document.getElementById('coordModeActions').style.display = 'flex';
            document.getElementById('coordScore').style.display = 'block';
            document.getElementById('coordPrompt').style.display = 'block';
            renderCoordinateBoard();
            updateCoordLabels();
            updateCoordScore();
            setCoordMode('a');
        }

        function setCoordMode(mode) {
            coordState.mode = mode;
            document.getElementById('btnModeA').style.background = mode === 'a' ? 'var(--accent)' : 'var(--surface)';
            document.getElementById('btnModeA').style.color = mode === 'a' ? '#fff' : 'var(--text-primary)';
            document.getElementById('btnModeB').style.background = mode === 'b' ? 'var(--accent)' : 'var(--surface)';
            document.getElementById('btnModeB').style.color = mode === 'b' ? '#fff' : 'var(--text-primary)';
            document.getElementById('coordInputArea').style.display = mode === 'b' ? 'flex' : 'none';
            clearCoordHighlight();
            nextCoordQuestion();
        }

        function nextCoordQuestion() {
            coordState.target = ALL_SQUARES[Math.floor(Math.random() * 64)];
            const promptEl = document.getElementById('coordPrompt');
            if (coordState.mode === 'a') {
                promptEl.textContent = t('findSquare') + ' ' + coordState.target.toUpperCase();
                clearCoordHighlight();
            } else {
                promptEl.textContent = t('findSquare');
                clearCoordHighlight();
                highlightCoordSquare(coordState.target);
            }
            document.getElementById('coordFeedback').textContent = '';
            const input = document.getElementById('coordInput');
            if (input) { input.value = ''; input.focus(); }
            document.getElementById('coordinateBoardWrapper').classList.remove('show-coords');
        }

        function handleCoordClick(el) {
            if (!coordState.active) return;
            const sq = el.getAttribute('data-square');

            if (coordState.waitingCorrect) {
                if (sq === coordState.target) {
                    coordState.waitingCorrect = false;
                    clearCoordHighlight();
                    nextCoordQuestion();
                } else {
                    el.classList.add('wrong-tap');
                    shakeCoordinateBoard();
                    setTimeout(() => el.classList.remove('wrong-tap'), 400);
                }
                return;
            }

            if (coordState.mode !== 'a') return;
            checkCoordAnswer(sq);
        }

        function submitCoordAnswer() {
            if (!coordState.active || coordState.mode !== 'b') return;
            const val = document.getElementById('coordInput').value.trim().toLowerCase();
            checkCoordAnswer(val);
        }

        function checkCoordAnswer(answer) {
            coordState.total++;
            const isCorrect = answer === coordState.target;
            if (isCorrect) {
                coordState.score++;
                updateCoordScore();
                const fb = document.getElementById('coordFeedback');
                fb.textContent = t('correct');
                fb.style.color = '#34c759';
                setTimeout(() => {
                    fb.style.color = 'var(--text-secondary)';
                    nextCoordQuestion();
                }, 600);
            } else {
                updateCoordScore();
                const fb = document.getElementById('coordFeedback');
                fb.textContent = t('wrong') + ' ' + coordState.target.toUpperCase() + ' — ' + (coordState.mode === 'a' ? 'Tap the correct square' : 'Tap the correct square');
                fb.style.color = '#ff453a';
                coordState.waitingCorrect = true;
                shakeCoordinateBoard();
                markCorrectTarget(coordState.target);
                document.getElementById('coordinateBoardWrapper').classList.add('show-coords');
            }
        }

        function shakeCoordinateBoard() {
            const grid = document.getElementById('coordinateBoardGrid');
            grid.classList.remove('shake');
            void grid.offsetWidth;
            grid.classList.add('shake');
            setTimeout(() => grid.classList.remove('shake'), 500);
        }

        function markCorrectTarget(sq) {
            const el = document.querySelector('#coordinateBoardGrid .square[data-square="' + sq + '"]');
            if (el) el.classList.add('glass-highlight');
        }

        function updateCoordScore() {
            document.getElementById('coordScore').textContent = 'Score: ' + coordState.score + ' / ' + coordState.total;
        }

        function highlightCoordSquare(sq) {
            clearCoordHighlight();
            const el = document.querySelector('#coordinateBoardGrid .square[data-square="' + sq + '"]');
            if (el) el.classList.add('glass-highlight');
        }

        function clearCoordHighlight() {
            document.querySelectorAll('#coordinateBoardGrid .square').forEach(el => {
                el.style.background = '';
                el.classList.remove('wrong-tap', 'glass-highlight');
            });
        }
