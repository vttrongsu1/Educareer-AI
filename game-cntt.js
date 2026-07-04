document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    const state = {
        scores: {
            sprint: 0,
            logic: 0,
            release: 0,
            final: 0
        },
        skillScores: {
            speed: 0,       // Tốc độ thao tác
            detail: 0,      // Độ cẩn thận
            logic: 0,       // Tư duy logic
            pressure: 0     // Xử lý áp lực
        },
        results: {
            sprint: null,
            logic: null,
            release: null
        }
    };

    // --- DOM Elements ---
    const screens = {
        intro: document.getElementById('screen-intro'),
        sprint: document.getElementById('screen-sprint'),
        logic: document.getElementById('screen-logic'),
        release: document.getElementById('screen-release'),
        result: document.getElementById('screen-result')
    };
    
    const popup = document.getElementById('transition-popup');
    const popupText = document.getElementById('popup-text');
    const popupBtn = document.getElementById('popup-btn');

    // --- Utility Functions ---
    function showScreen(screenKey) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        Object.values(screens).forEach(s => s.classList.remove('active'));
        
        screens[screenKey].classList.remove('hidden');
        // Add slight delay for animation
        setTimeout(() => screens[screenKey].classList.add('active'), 10);
    }

    function showPopup(text, nextScreenKey) {
        popupText.innerText = text;
        popup.classList.remove('hidden');
        
        popupBtn.onclick = () => {
            popup.classList.add('hidden');
            if (nextScreenKey) showScreen(nextScreenKey);
            
            // Init next screen logic
            if (nextScreenKey === 'sprint') initSprint();
            if (nextScreenKey === 'logic') initLogic();
            if (nextScreenKey === 'release') initRelease();
            if (nextScreenKey === 'result') initResult();
        };
    }

    // Giả lập lưu file vào thư mục Data/DataHS (Frontend chỉ có thể tải xuống)
    function saveToDataFolder(filename, dataObj) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "DataHS/" + filename);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        console.log(`[Simulated] Dữ liệu đã được yêu cầu lưu tải về thư mục Data/DataHS/${filename}`);
    }

    // --- Màn 1: Code Sprint ---
    let sprintState = {
        taskIndex: 0,
        timeLeft: GAME_CNTT_DATA.screen1.timeLimit,
        timerId: null,
        correctChars: 0,
        totalTypedChars: 0,
        combo: 0,
        maxCombo: 0,
        mistakes: 0,
        completedLines: 0,
        rawScore: 0
    };

    const sprintUI = {
        time: document.getElementById('sprint-time'),
        wpm: document.getElementById('sprint-wpm'),
        acc: document.getElementById('sprint-acc'),
        combo: document.getElementById('sprint-combo'),
        targetContainer: document.getElementById('target-text-container'),
        input: document.getElementById('sprint-input')
    };

    function initSprint() {
        sprintState = {
            taskIndex: 0,
            timeLeft: GAME_CNTT_DATA.screen1.timeLimit,
            timerId: null,
            correctChars: 0,
            totalTypedChars: 0,
            combo: 0,
            maxCombo: 0,
            mistakes: 0,
            completedLines: 0,
            rawScore: 0
        };
        updateSprintStats();
        sprintUI.time.innerText = sprintState.timeLeft;
        loadNextSprintTask();
        sprintUI.input.value = '';
        sprintUI.input.disabled = false;
        sprintUI.input.focus();
        
        sprintState.timerId = setInterval(() => {
            sprintState.timeLeft--;
            sprintUI.time.innerText = sprintState.timeLeft;
            updateSprintStats();
            
            if (sprintState.timeLeft <= 0) {
                endSprint();
            }
        }, 1000);
    }

    function loadNextSprintTask() {
        if (sprintState.taskIndex >= GAME_CNTT_DATA.screen1.tasks.length) {
            // Loop tasks if they finish early
            sprintState.taskIndex = 0; 
        }
        const text = GAME_CNTT_DATA.screen1.tasks[sprintState.taskIndex];
        sprintUI.targetContainer.innerHTML = text.split('').map(char => `<span>${char}</span>`).join('');
        sprintUI.input.value = '';
    }

    sprintUI.input.addEventListener('input', (e) => {
        const typed = sprintUI.input.value;
        const target = GAME_CNTT_DATA.screen1.tasks[sprintState.taskIndex];
        const spans = sprintUI.targetContainer.querySelectorAll('span');
        
        let isCorrectSoFar = true;
        sprintState.totalTypedChars++;

        spans.forEach((span, i) => {
            if (i < typed.length) {
                if (typed[i] === target[i]) {
                    span.className = 'target-char correct';
                } else {
                    span.className = 'target-char wrong';
                    isCorrectSoFar = false;
                }
            } else {
                span.className = '';
            }
        });

        if (!isCorrectSoFar) {
            sprintUI.input.classList.add('shake');
            setTimeout(() => sprintUI.input.classList.remove('shake'), 300);
            sprintState.combo = 0;
            sprintState.mistakes++;
        }

        // Check if line is fully typed and correct
        if (typed === target) {
            sprintState.completedLines++;
            sprintState.correctChars += target.length;
            sprintState.combo++;
            if (sprintState.combo > sprintState.maxCombo) sprintState.maxCombo = sprintState.combo;
            
            // Calculate raw score
            sprintState.rawScore += 10;
            if (target.length > 25) sprintState.rawScore += 15;
            if (sprintState.combo > 0 && sprintState.combo % 3 === 0) sprintState.rawScore += 5;

            sprintState.taskIndex++;
            loadNextSprintTask();
        }

        updateSprintStats();
    });

    function updateSprintStats() {
        const minutes = (GAME_CNTT_DATA.screen1.timeLimit - sprintState.timeLeft) / 60 || 0.01;
        const wpm = Math.round((sprintState.correctChars / 5) / minutes);
        const acc = sprintState.totalTypedChars === 0 ? 100 : Math.round((sprintState.correctChars / sprintState.totalTypedChars) * 100);
        
        sprintUI.wpm.innerText = wpm;
        sprintUI.acc.innerText = acc;
        sprintUI.combo.innerText = sprintState.combo;
    }

    function endSprint() {
        clearInterval(sprintState.timerId);
        sprintUI.input.disabled = true;
        
        const minutes = GAME_CNTT_DATA.screen1.timeLimit / 60;
        const wpm = Math.round((sprintState.correctChars / 5) / minutes);
        const acc = sprintState.totalTypedChars === 0 ? 0 : Math.round((sprintState.correctChars / sprintState.totalTypedChars) * 100);
        
        // Normalize score to 100 (assume ~200 raw score is max for 60s)
        const normalized = Math.min(100, Math.round((sprintState.rawScore / 150) * 100));
        
        state.results.sprint = {
            screenId: "it_typing_sprint",
            major: "information_technology",
            wpm: wpm,
            accuracy: acc,
            completedLines: sprintState.completedLines,
            maxCombo: sprintState.maxCombo,
            mistakeCount: sprintState.mistakes,
            rawScore: sprintState.rawScore,
            normalizedScore: normalized
        };

        // Skill Mapping Màn 1
        state.skillScores.speed += wpm > 40 ? 40 : wpm; // Tốc độ
        state.skillScores.detail += acc * 0.4; // Cẩn thận
        state.skillScores.pressure += sprintState.maxCombo * 2; // Áp lực (combo cao)

        localStorage.setItem("it_typing_sprint_result", JSON.stringify(state.results.sprint));
        state.scores.sprint = normalized;

        showPopup("Tốt! Em đã xử lý thao tác nhanh. Tiếp theo: sửa logic gợi ý ngành.", "logic");
    }

    // --- Màn 2: Logic Builder ---
    let logicState = {
        roundIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        attempts: 0,
        rawScore: 0
    };

    const logicUI = {
        round: document.getElementById('logic-round'),
        statement: document.getElementById('logic-statement'),
        toolbox: document.getElementById('toolbox-cards'),
        btnRun: document.getElementById('btn-run-logic')
    };

    function initLogic() {
        logicState = { roundIndex: 0, correctCount: 0, wrongCount: 0, attempts: 0, rawScore: 0 };
        loadLogicRound();
    }

    function loadLogicRound() {
        if (logicState.roundIndex >= GAME_CNTT_DATA.screen2.rounds.length) {
            endLogic();
            return;
        }

        const roundData = GAME_CNTT_DATA.screen2.rounds[logicState.roundIndex];
        logicUI.round.innerText = logicState.roundIndex + 1;
        logicUI.btnRun.classList.add('hidden');
        
        // Render Statement
        let statementHTML = roundData.template;
        for (let i = 1; i <= roundData.correctAnswers.length; i++) {
            statementHTML = statementHTML.replace(`[DROP${i}]`, `<span class="drop-slot" data-id="${i}"></span>`);
        }
        logicUI.statement.innerHTML = statementHTML;

        // Render Toolbox Cards
        const allCards = [...roundData.correctAnswers, ...roundData.distractors];
        // Shuffle
        allCards.sort(() => Math.random() - 0.5);
        
        logicUI.toolbox.innerHTML = allCards.map((text, i) => 
            `<div class="draggable-card" draggable="true" data-text="${text}">${text}</div>`
        ).join('');

        setupLogicDragDrop();
    }

    function setupLogicDragDrop() {
        const cards = document.querySelectorAll('.draggable-card');
        const slots = document.querySelectorAll('.drop-slot');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.text);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const text = e.dataTransfer.getData('text/plain');
                slot.innerText = text;
                slot.classList.add('filled');
                checkLogicCompletion();
            });
            
            // Allow remove from slot by clicking
            slot.addEventListener('click', () => {
                if (slot.innerText) {
                    slot.innerText = '';
                    slot.classList.remove('filled');
                    logicUI.btnRun.classList.add('hidden');
                }
            });
        });
    }

    function checkLogicCompletion() {
        const slots = document.querySelectorAll('.drop-slot');
        const allFilled = Array.from(slots).every(slot => slot.innerText.trim() !== '');
        if (allFilled) {
            logicUI.btnRun.classList.remove('hidden');
        } else {
            logicUI.btnRun.classList.add('hidden');
        }
    }

    logicUI.btnRun.addEventListener('click', () => {
        logicState.attempts++;
        const roundData = GAME_CNTT_DATA.screen2.rounds[logicState.roundIndex];
        const slots = document.querySelectorAll('.drop-slot');
        let isCorrect = true;

        slots.forEach((slot, i) => {
            if (slot.innerText !== roundData.correctAnswers[i]) {
                isCorrect = false;
                slot.classList.add('shake');
                setTimeout(() => slot.classList.remove('shake'), 300);
            }
        });

        if (isCorrect) {
            logicState.correctCount++;
            let score = 30;
            if (logicState.attempts === 1) score += 5; // Bonus first try
            logicState.rawScore += score;
            
            logicState.roundIndex++;
            logicState.attempts = 0;
            setTimeout(loadLogicRound, 1000);
        } else {
            logicState.wrongCount++;
            logicState.rawScore -= 5; // Penalty
        }
    });

    function endLogic() {
        const normalized = Math.max(0, Math.min(100, logicState.rawScore)); // Max is around 105
        
        state.results.logic = {
            screenId: "it_logic_builder",
            correctCount: logicState.correctCount,
            wrongCount: logicState.wrongCount,
            normalizedScore: normalized
        };

        // Skill Mapping Màn 2
        state.skillScores.logic += normalized * 0.4; // Logic
        state.skillScores.detail += (3 - logicState.wrongCount) * 10; // Cẩn thận

        localStorage.setItem("it_logic_builder_result", JSON.stringify(state.results.logic));
        state.scores.logic = normalized;

        showPopup("Logic đã ổn hơn! Nhưng demo sắp bắt đầu. Hãy chọn việc cần xử lý trước.", "release");
    }

    // --- Màn 3: Release Rush ---
    let releaseState = {
        timeLeft: GAME_CNTT_DATA.screen3.timeLimit,
        timerId: null,
        correctCount: 0,
        missedCritical: []
    };

    const releaseUI = {
        time: document.getElementById('release-time'),
        pool: document.getElementById('release-tasks-pool'),
        btnFinish: document.getElementById('btn-finish-release')
    };

    function initRelease() {
        releaseState = {
            timeLeft: GAME_CNTT_DATA.screen3.timeLimit,
            timerId: null,
            correctCount: 0,
            missedCritical: []
        };
        releaseUI.time.innerText = releaseState.timeLeft;
        
        // Reset Dropzones
        document.querySelectorAll('.kanban-dropzone').forEach(dz => dz.innerHTML = '');

        // Render Tasks
        const tasks = [...GAME_CNTT_DATA.screen3.tasks].sort(() => Math.random() - 0.5);
        releaseUI.pool.innerHTML = tasks.map(t => 
            `<div class="task-card" draggable="true" data-id="${t.id}" data-category="${t.category}">${t.text}</div>`
        ).join('');

        setupReleaseDragDrop();

        releaseState.timerId = setInterval(() => {
            releaseState.timeLeft--;
            releaseUI.time.innerText = releaseState.timeLeft;
            if (releaseState.timeLeft <= 0) {
                clearInterval(releaseState.timerId);
                finishRelease();
            }
        }, 1000);
    }

    function setupReleaseDragDrop() {
        const cards = document.querySelectorAll('.task-card');
        const dropzones = document.querySelectorAll('.kanban-dropzone, #release-tasks-pool');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.id);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        });

        dropzones.forEach(dz => {
            dz.addEventListener('dragover', e => {
                e.preventDefault();
                dz.classList.add('drag-over');
            });
            dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
            dz.addEventListener('drop', e => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                const id = e.dataTransfer.getData('text/plain');
                const card = document.querySelector(`.task-card[data-id="${id}"]`);
                if (card) {
                    dz.appendChild(card);
                }
            });
        });
    }

    releaseUI.btnFinish.addEventListener('click', () => {
        clearInterval(releaseState.timerId);
        finishRelease();
    });

    function finishRelease() {
        let score = 0;
        let missed = [];
        
        document.querySelectorAll('.kanban-dropzone').forEach(dz => {
            const dzCategory = dz.dataset.category;
            const cards = dz.querySelectorAll('.task-card');
            cards.forEach(card => {
                const targetCategory = card.dataset.category;
                if (dzCategory === targetCategory) {
                    score += 12.5; // 8 cards = 100
                } else if (targetCategory === 'fix-now') {
                    missed.push(card.innerText);
                }
            });
        });

        // Check cards left in pool
        document.querySelectorAll('#release-tasks-pool .task-card').forEach(card => {
            if (card.dataset.category === 'fix-now') missed.push(card.innerText);
        });

        if (releaseState.timeLeft > 0 && score > 0) score += 5; // time bonus
        const normalized = Math.min(100, Math.round(score));

        state.results.release = {
            screenId: "it_release_rush",
            correctCount: Math.round(score / 12.5),
            missedCritical: missed,
            timeUsed: 60 - releaseState.timeLeft,
            normalizedScore: normalized
        };

        // Skill Mapping Màn 3
        state.skillScores.logic += normalized * 0.3; // Tư duy phân loại
        state.skillScores.pressure += releaseState.timeLeft > 10 ? 30 : 10; // Xử lý áp lực

        localStorage.setItem("it_release_rush_result", JSON.stringify(state.results.release));
        state.scores.release = normalized;

        showPopup("Demo đã hoàn thành. Xem kết quả một ngày làm CNTT của em.", "result");
    }

    // --- Màn Tổng Kết ---
    function initResult() {
        // Tỷ trọng: Màn 1: 25%, Màn 2: 40%, Màn 3: 35%
        state.scores.final = Math.round(
            (state.scores.sprint * 0.25) + 
            (state.scores.logic * 0.40) + 
            (state.scores.release * 0.35)
        );

        // Calculate skill scores based on game performance
        const speedScore = Math.min(100, Math.round(state.skillScores.speed || state.scores.sprint * 1.2));
        const precisionScore = Math.min(100, Math.round(state.skillScores.detail || state.scores.logic));
        const logicScore = Math.min(100, Math.round(state.skillScores.logic || (state.scores.logic + state.scores.release) / 2));
        const pressureScore = Math.min(100, Math.round(state.skillScores.pressure || state.scores.release * 0.9 + (releaseState.timeLeft > 10 ? 10 : 0)));

        // Save scores to localStorage for game-result.html to read
        localStorage.setItem("career_game_final_score", state.scores.final);
        localStorage.setItem("career_game_speed_score", speedScore);
        localStorage.setItem("career_game_precision_score", precisionScore);
        localStorage.setItem("career_game_logic_score", logicScore);
        localStorage.setItem("career_game_pressure_score", pressureScore);

        // Redirect to static results page
        window.location.href = "game-result.html";
    }

    // --- Init ---
    document.getElementById('btn-start-game').addEventListener('click', () => {
        showScreen('sprint');
        initSprint();
    });

    document.getElementById('btn-replay').addEventListener('click', () => {
        showScreen('intro');
    });
});
