        updateTexts();

        document.getElementById('moveInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitMove();
        });
        document.getElementById('coordInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitCoordAnswer();
        });
