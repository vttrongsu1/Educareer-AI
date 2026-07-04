/**
 * EduCareer AI - OCR Transcript Handler & Spreadsheet Interactivity
 * 
 * Manages the states, school level curriculums (THCS vs THPT), scanning, 
 * dynamic adding/deleting of subjects, manual entry, live GPA math, and local saving.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const levelButtons = document.querySelectorAll('#level-select .year-btn');
    const yearSelectContainer = document.getElementById('year-select');
    const modeButtons = document.querySelectorAll('#mode-toggle .mode-btn');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadText = document.getElementById('upload-text');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const filenameLabel = document.getElementById('filename-label');
    const gpaCircle = document.getElementById('gpa-circle-display');
    const gpaRating = document.getElementById('gpa-rating');
    const gpaAnalysis = document.getElementById('gpa-analysis');
    const saveBtn = document.getElementById('save-grades-btn');
    const sheetStatus = document.getElementById('sheet-status');
    const tableBody = document.getElementById('grade-table-body');

    // Add Subject Inputs
    const newSubSelect = document.getElementById('new-subject-select');
    const addSubBtn = document.getElementById('add-subject-btn');
    const demoToggleSwitch = document.getElementById('demo-toggle-switch');

    // 2. Active States
    let activeLevel = 'thpt';  // 'thcs' or 'thpt'
    let activeYear = 'ganday'; // 'ganday', 'lop6'-'lop9' or 'lop10'-'lop12'
    let activeMode = 'ocr';    // 'ocr' or 'manual'

    // 3. Subject Curriculum Specifications (GDPT 2018 Standards)
    const curriculums = {
        thcs: [
            { name: "Toán học", code: "TOAN", key: "math" },
            { name: "Ngữ văn", code: "VAN", key: "literature" },
            { name: "Tiếng Anh", code: "ANH", key: "english" },
            { name: "Khoa học tự nhiên", code: "KHTN", key: "science" },
            { name: "Lịch sử & Địa lý", code: "LS_DL", key: "historygeo" },
            { name: "Giáo dục công dân", code: "GDCD", key: "civics" },
            { name: "Tin học", code: "TIN", key: "informatics" },
            { name: "Công nghệ", code: "CN", key: "technology" }
        ],
        thpt: [
            { name: "Toán học", code: "TOAN", key: "math" },
            { name: "Vật lý", code: "LY", key: "physics" },
            { name: "Hóa học", code: "HOA", key: "chemistry" },
            { name: "Sinh học", code: "SINH", key: "biology" },
            { name: "Tin học", code: "TIN", key: "informatics" },
            { name: "Ngữ văn", code: "VAN", key: "literature" },
            { name: "Lịch sử", code: "SU", key: "history" },
            { name: "Địa lý", code: "DIA", key: "geography" },
            { name: "Tiếng Anh", code: "ANH", key: "english" },
            { name: "GD Kinh tế & Pháp luật", code: "GDKT_PL", key: "economylaw" },
            { name: "Công nghệ", code: "CN", key: "technology" }
        ]
    };

    const allSubjectsDb = {
        thcs: [
            { name: "Toán học", code: "TOAN", key: "math" },
            { name: "Ngữ văn", code: "VAN", key: "literature" },
            { name: "Tiếng Anh", code: "ANH", key: "english" },
            { name: "Khoa học tự nhiên", code: "KHTN", key: "science" },
            { name: "Lịch sử & Địa lý", code: "LS_DL", key: "historygeo" },
            { name: "Giáo dục công dân", code: "GDCD", key: "civics" },
            { name: "Tin học", code: "TIN", key: "informatics" },
            { name: "Công nghệ", code: "CN", key: "technology" },
            { name: "Mỹ thuật", code: "MY_THUAT", key: "art" },
            { name: "Âm nhạc", code: "AM_NHAC", key: "music" }
        ],
        thpt: [
            { name: "Toán học", code: "TOAN", key: "math" },
            { name: "Vật lý", code: "LY", key: "physics" },
            { name: "Hóa học", code: "HOA", key: "chemistry" },
            { name: "Sinh học", code: "SINH", key: "biology" },
            { name: "Tin học", code: "TIN", key: "informatics" },
            { name: "Ngữ văn", code: "VAN", key: "literature" },
            { name: "Lịch sử", code: "SU", key: "history" },
            { name: "Địa lý", code: "DIA", key: "geography" },
            { name: "Tiếng Anh", code: "ANH", key: "english" },
            { name: "GD Kinh tế & Pháp luật", code: "GDKT_PL", key: "economylaw" },
            { name: "Công nghệ", code: "CN", key: "technology" },
            { name: "Mỹ thuật", code: "MY_THUAT", key: "art" },
            { name: "Âm nhạc", code: "AM_NHAC", key: "music" },
            { name: "GD Quốc phòng & An ninh", code: "GDQP_AN", key: "mildefense" }
        ]
    };

    function updateAddableSubjectsDropdown() {
        if (!newSubSelect) return;
        const currentKeys = Array.from(tableBody.querySelectorAll('tr[data-key]'))
            .map(row => row.getAttribute('data-key'));
        const addable = (allSubjectsDb[activeLevel] || []).filter(sub => !currentKeys.includes(sub.key));
        if (addable.length > 0) {
            newSubSelect.innerHTML = addable.map(sub => `<option value="${sub.key}">${sub.name}</option>`).join('');
            newSubSelect.disabled = false;
            addSubBtn.disabled = false;
            addSubBtn.style.opacity = '1';
            addSubBtn.style.pointerEvents = 'auto';
        } else {
            newSubSelect.innerHTML = '<option value="">(Đã thêm đủ các môn)</option>';
            newSubSelect.disabled = true;
            addSubBtn.disabled = true;
            addSubBtn.style.opacity = '0.5';
            addSubBtn.style.pointerEvents = 'none';
        }
    }

    // 4. Initial rendering
    renderPageForLevel(activeLevel);

    // 5. School Level Selection Listener (THCS vs THPT)
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            levelButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const selectedLevel = button.getAttribute('data-level');
            if (activeLevel !== selectedLevel) {
                activeLevel = selectedLevel;
                activeYear = 'ganday'; // Reset to default tab
                renderPageForLevel(activeLevel);
                
                sheetStatus.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> Khởi tạo bảng điểm học sinh ${activeLevel.toUpperCase()}`;
                sheetStatus.style.background = 'rgba(37, 99, 235, 0.08)';
                sheetStatus.style.color = 'var(--primary-blue)';
            }
        });
    });

    // Render years list and spreadsheet columns dynamically based on level
    function renderPageForLevel(level) {
        // A. Render Year Selector Buttons
        let yearsHtml = "";
        if (level === 'thcs') {
            yearsHtml = `
                <button class="year-btn" data-year="lop6">Lớp 6</button>
                <button class="year-btn" data-year="lop7">Lớp 7</button>
                <button class="year-btn" data-year="lop8">Lớp 8</button>
                <button class="year-btn" data-year="lop9">Lớp 9</button>
                <button class="year-btn active" data-year="ganday">Gần đây</button>
            `;
        } else {
            yearsHtml = `
                <button class="year-btn" data-year="lop10">Lớp 10</button>
                <button class="year-btn" data-year="lop11">Lớp 11</button>
                <button class="year-btn" data-year="lop12">Lớp 12</button>
                <button class="year-btn active" data-year="ganday">Gần đây</button>
            `;
        }
        yearSelectContainer.innerHTML = yearsHtml;

        // Bind click events to the newly generated year buttons
        const yearButtons = yearSelectContainer.querySelectorAll('.year-btn');
        yearButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                yearButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeYear = btn.getAttribute('data-year');
                
                loadGradesForLevelAndYear(activeLevel, activeYear);
                sheetStatus.innerHTML = `<i class="fa-solid fa-folder-open"></i> Đã mở học bạ ${btn.textContent}`;
                sheetStatus.style.background = 'rgba(37, 99, 235, 0.08)';
                sheetStatus.style.color = 'var(--primary-blue)';
            });
        });

        // B. Load saved scores (which dynamically renders the rows depending on what is stored)
        loadGradesForLevelAndYear(activeLevel, activeYear);
    }

    // Dynamic Row rendering helper
    function appendGradeRow(subjectName, subjectCode, subjectKey, scoreHK1, scoreHK2) {
        const row = document.createElement('tr');
        row.setAttribute('data-key', subjectKey);
        
        const hk1 = parseFloat(scoreHK1) || 0.0;
        const hk2 = parseFloat(scoreHK2) || 0.0;
        
        let cn = "0.0";
        if (hk1 > 0 && hk2 > 0) {
            cn = ((hk1 + hk2 * 2) / 3).toFixed(1);
        } else if (hk1 > 0) {
            cn = hk1.toFixed(1);
        } else if (hk2 > 0) {
            cn = hk2.toFixed(1);
        }
        
        row.innerHTML = `
            <td><strong>${subjectName}</strong></td>
            <td style="text-align: center;">
                <input type="number" step="0.1" min="0" max="10" class="grade-input-hk1" data-subject="${subjectKey}" value="${hk1 > 0 ? hk1.toFixed(1) : "0.0"}" style="width: 70px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-family: inherit;">
            </td>
            <td style="text-align: center;">
                <input type="number" step="0.1" min="0" max="10" class="grade-input-hk2" data-subject="${subjectKey}" value="${hk2 > 0 ? hk2.toFixed(1) : "0.0"}" style="width: 70px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-family: inherit;">
            </td>
            <td style="text-align: center;">
                <input type="text" class="grade-input-canam" data-subject="${subjectKey}" value="${cn}" readonly style="width: 70px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; background: #f1f5f9; font-weight: bold; color: var(--primary-blue); font-family: inherit;">
            </td>
            <td style="text-align: center;">
                <button class="delete-subject-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1rem; transition: var(--transition-smooth); padding: 4px 8px;" title="Xóa môn này">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);

        const input1 = row.querySelector('.grade-input-hk1');
        const input2 = row.querySelector('.grade-input-hk2');
        const inputCN = row.querySelector('.grade-input-canam');

        const updateRowCN = () => {
            let v1 = parseFloat(input1.value);
            let v2 = parseFloat(input2.value);
            if (isNaN(v1)) v1 = 0.0;
            if (isNaN(v2)) v2 = 0.0;

            if (v1 < 0) { v1 = 0.0; input1.value = "0.0"; }
            if (v1 > 10) { v1 = 10.0; input1.value = "10.0"; }
            if (v2 < 0) { v2 = 0.0; input2.value = "0.0"; }
            if (v2 > 10) { v2 = 10.0; input2.value = "10.0"; }

            if (v1 > 0 && v2 > 0) {
                inputCN.value = ((v1 + v2 * 2) / 3).toFixed(1);
            } else if (v1 > 0) {
                inputCN.value = v1.toFixed(1);
            } else if (v2 > 0) {
                inputCN.value = v2.toFixed(1);
            } else {
                inputCN.value = "0.0";
            }
            calculateGPA();
        };

        input1.addEventListener('input', updateRowCN);
        input2.addEventListener('input', updateRowCN);

        // Bind delete action
        row.querySelector('.delete-subject-btn').addEventListener('click', () => {
            row.remove();
            calculateGPA();
            updateAddableSubjectsDropdown();
            sheetStatus.innerHTML = `<i class="fa-solid fa-trash-can"></i> Đã xóa môn ${subjectName}`;
            sheetStatus.style.background = 'rgba(239, 68, 68, 0.08)';
            sheetStatus.style.color = '#ef4444';
        });
    }

    // 6. Add Custom Subject Listener
    addSubBtn.addEventListener('click', () => {
        const key = newSubSelect.value;
        if (!key) {
            alert('Vui lòng chọn môn học muốn thêm.');
            return;
        }

        // Find subject in database
        const subject = (allSubjectsDb[activeLevel] || []).find(sub => sub.key === key);
        if (!subject) return;

        const inputGradeHK1 = document.getElementById('new-subject-grade-hk1');
        const inputGradeHK2 = document.getElementById('new-subject-grade-hk2');
        
        let grade1 = parseFloat(inputGradeHK1 ? inputGradeHK1.value : 0.0) || 0.0;
        let grade2 = parseFloat(inputGradeHK2 ? inputGradeHK2.value : 0.0) || 0.0;

        if (grade1 < 0) grade1 = 0.0;
        if (grade1 > 10) grade1 = 10.0;
        if (grade2 < 0) grade2 = 0.0;
        if (grade2 > 10) grade2 = 10.0;

        // Append to DOM
        appendGradeRow(subject.name, subject.code, subject.key, grade1.toFixed(1), grade2.toFixed(1));
        
        // Recalculate GPA
        calculateGPA();

        // Update dropdown options
        updateAddableSubjectsDropdown();

        // Clear grade inputs
        if (inputGradeHK1) inputGradeHK1.value = "0.0";
        if (inputGradeHK2) inputGradeHK2.value = "0.0";

        sheetStatus.innerHTML = `<i class="fa-solid fa-plus"></i> Đã thêm môn ${subject.name}`;
        sheetStatus.style.background = 'rgba(16, 185, 129, 0.08)';
        sheetStatus.style.color = '#10b981';
    });

    // 7. Input Mode Selector Listener
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeMode = button.getAttribute('data-mode');

            const uploadGroup = document.getElementById('upload-group');
            const gradeInputs = tableBody.querySelectorAll('.grade-input');

            if (activeMode === 'manual') {
                uploadGroup.style.opacity = '0.5';
                uploadGroup.style.pointerEvents = 'none';
                sheetStatus.innerHTML = '<i class="fa-solid fa-keyboard"></i> Chế độ nhập tay từ đầu';
                sheetStatus.style.background = 'rgba(245, 158, 11, 0.08)';
                sheetStatus.style.color = '#d97706';
            } else {
                uploadGroup.style.opacity = '1';
                uploadGroup.style.pointerEvents = 'auto';
                sheetStatus.innerHTML = '<i class="fa-solid fa-robot"></i> Chế độ quét học bạ AI';
                sheetStatus.style.background = 'rgba(16, 185, 129, 0.08)';
                sheetStatus.style.color = '#10b981';
            }
        });
    });

    // 8. Dropzone uploading and drag actions
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleUploadedFile(fileInput.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-cyan)';
        dropZone.style.background = 'rgba(14, 165, 233, 0.03)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(37, 99, 235, 0.25)';
        dropZone.style.background = '#f8fafc';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(37, 99, 235, 0.25)';
        dropZone.style.background = '#f8fafc';
        
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    function handleUploadedFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chỉ tải lên các tệp định dạng ảnh (PNG, JPG, JPEG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadText.style.display = 'none';
            previewContainer.style.display = 'block';
            filenameLabel.textContent = file.name;
        };
        reader.readAsDataURL(file);

        runOcrScanning(file);
    }

    async function runOcrScanning(file) {
        // Kiểm tra đăng nhập bảo mật trước khi xử lý tệp
        const sb = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
        if (sb) {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                alert("Bạn cần đăng nhập để sử dụng tính năng này.");
                window.location.href = "ho-so-hoc-sinh.html";
                return;
            }
        }

        dropZone.classList.add('scanning');
        sheetStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI đang phân tích biểu mẫu...';
        sheetStatus.style.background = 'rgba(14, 165, 233, 0.08)';
        sheetStatus.style.color = 'var(--primary-cyan)';
        
        const inputs1 = tableBody.querySelectorAll('.grade-input-hk1');
        const inputs2 = tableBody.querySelectorAll('.grade-input-hk2');
        inputs1.forEach(input => input.disabled = true);
        inputs2.forEach(input => input.disabled = true);

        // Check if Demo Simulation mode is checked
        if (demoToggleSwitch && demoToggleSwitch.checked) {
            console.log("Demo simulation mode is enabled. Running mock OCR scan.");
            setTimeout(() => {
                let simulatedGrades = {};
                if (activeLevel === 'thcs') {
                    simulatedGrades = {
                        math: { hk1: (8.2 + Math.random() * 1.5).toFixed(1), hk2: (8.5 + Math.random() * 1.2).toFixed(1) },
                        literature: { hk1: (7.8 + Math.random() * 1.8).toFixed(1), hk2: (8.0 + Math.random() * 1.5).toFixed(1) },
                        english: { hk1: (8.0 + Math.random() * 1.8).toFixed(1), hk2: (8.2 + Math.random() * 1.5).toFixed(1) },
                        science: { hk1: (7.5 + Math.random() * 2.2).toFixed(1), hk2: (7.8 + Math.random() * 1.8).toFixed(1) },
                        historygeo: { hk1: (7.2 + Math.random() * 2.4).toFixed(1), hk2: (7.5 + Math.random() * 2.0).toFixed(1) },
                        civics: { hk1: (8.5 + Math.random() * 1.3).toFixed(1), hk2: (8.8 + Math.random() * 1.0).toFixed(1) },
                        informatics: { hk1: (8.8 + Math.random() * 1.2).toFixed(1), hk2: (9.0 + Math.random() * 1.0).toFixed(1) },
                        technology: { hk1: (8.0 + Math.random() * 1.8).toFixed(1), hk2: (8.2 + Math.random() * 1.5).toFixed(1) }
                    };
                } else {
                    // High school combination - Elective selection simulation
                    simulatedGrades = {
                        math: { hk1: (8.8 + Math.random() * 1.0).toFixed(1), hk2: (9.0 + Math.random() * 0.8).toFixed(1) },
                        physics: { hk1: (8.5 + Math.random() * 1.3).toFixed(1), hk2: (8.8 + Math.random() * 1.0).toFixed(1) },
                        chemistry: { hk1: (8.2 + Math.random() * 1.6).toFixed(1), hk2: (8.5 + Math.random() * 1.2).toFixed(1) },
                        english: { hk1: (8.4 + Math.random() * 1.4).toFixed(1), hk2: (8.6 + Math.random() * 1.0).toFixed(1) },
                        informatics: { hk1: (9.0 + Math.random() * 1.0).toFixed(1), hk2: (9.2 + Math.random() * 0.8).toFixed(1) },
                        literature: { hk1: (7.0 + Math.random() * 2.0).toFixed(1), hk2: (7.5 + Math.random() * 1.5).toFixed(1) },
                        technology: { hk1: (8.0 + Math.random() * 1.8).toFixed(1), hk2: (8.2 + Math.random() * 1.5).toFixed(1) }
                    };
                }
                
                repopulateFromOcr(simulatedGrades);
                sheetStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã mô phỏng kết quả OCR thành công';
                sheetStatus.style.background = 'rgba(16, 185, 129, 0.08)';
                sheetStatus.style.color = '#10b981';
            }, 2500);
            return;
        }

        // Real Scan Mode (strictly calls the backend proxy)
        try {
            const formData = new FormData();
            formData.append('image', file);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout to prevent cold start aborts

            console.log("Connecting to online API proxy server at https://educareer-ai.onrender.com/api/scan-transcript...");
            
            const response = await fetch('https://educareer-ai.onrender.com/api/scan-transcript', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                console.log("OCR Grades loaded successfully from proxy server:", result);
                
                // Repopulate spreadsheet rows based on OCR grades returned
                repopulateFromOcr(result.grades);

                sheetStatus.innerHTML = '<i class="fa-solid fa-check"></i> Đã đồng bộ bằng VNPT SmartReader';
                sheetStatus.style.background = 'rgba(16, 185, 129, 0.08)';
                sheetStatus.style.color = '#10b981';
            } else {
                throw new Error("Local proxy server error. Status: " + response.status);
            }

        } catch (error) {
            console.error("OCR Request failed or server offline. Disabling simulation fallback.");
            
            // Clean up scan state
            dropZone.classList.remove('scanning');
            const inputs1 = tableBody.querySelectorAll('.grade-input-hk1');
            const inputs2 = tableBody.querySelectorAll('.grade-input-hk2');
            inputs1.forEach(input => input.disabled = false);
            inputs2.forEach(input => input.disabled = false);
            
            // Alert user that scanning failed / was not found
            sheetStatus.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Không tìm thấy dữ liệu học bạ';
            sheetStatus.style.background = 'rgba(239, 68, 68, 0.08)';
            sheetStatus.style.color = '#ef4444';

            showOcrErrorModal();
        }
    }

    // Repopulate active table subjects with scanned OCR results
    function repopulateFromOcr(scannedGrades) {
        dropZone.classList.remove('scanning');
        
        tableBody.innerHTML = ""; // Clear table first!
        const defaults = curriculums[activeLevel];
        
        defaults.forEach(item => {
            if (scannedGrades[item.key] !== undefined) {
                const val = scannedGrades[item.key];
                const hk1 = val.hk1 !== undefined ? val.hk1 : val;
                const hk2 = val.hk2 !== undefined ? val.hk2 : val;
                appendGradeRow(item.name, item.code, item.key, hk1, hk2);
            }
        });

        calculateGPA();
        updateAddableSubjectsDropdown();
    }

    function resetInputs() {
        const hk1Inputs = tableBody.querySelectorAll('.grade-input-hk1');
        const hk2Inputs = tableBody.querySelectorAll('.grade-input-hk2');
        const cnInputs = tableBody.querySelectorAll('.grade-input-canam');
        
        hk1Inputs.forEach(input => {
            input.disabled = false;
            input.value = "0.0";
        });
        hk2Inputs.forEach(input => {
            input.disabled = false;
            input.value = "0.0";
        });
        cnInputs.forEach(input => {
            input.value = "0.0";
        });
        calculateGPA();
    }

    // 9. Math Calculations & Analysis
    function calculateGPA() {
        const gradeInputs = tableBody.querySelectorAll('.grade-input-canam');
        let total = 0.0;
        let count = 0;
        let subjects = {};

        gradeInputs.forEach(input => {
            const val = parseFloat(input.value) || 0.0;
            const subject = input.getAttribute('data-subject');
            total += val;
            count++;
            subjects[subject] = val;
        });

        if (count === 0) {
            gpaCircle.textContent = "0.0";
            gpaRating.textContent = "Chờ dữ liệu nhập";
            gpaRating.style.color = 'var(--text-muted)';
            gpaAnalysis.textContent = "Vui lòng thêm môn học hoặc quét học bạ.";
            return;
        }

        const gpa = total / count;
        const gpaFormatted = gpa.toFixed(2);

        gpaCircle.textContent = gpaFormatted;
        gpaCircle.className = 'gpa-circle'; // Reset classes
        
        if (gpa >= 8.0) {
            gpaCircle.classList.add('excellent');
            gpaRating.textContent = "Học lực: Xuất sắc / Giỏi";
            gpaRating.style.color = '#10b981';
        } else if (gpa >= 6.5) {
            gpaCircle.classList.add('good');
            gpaRating.textContent = "Học lực: Khá";
            gpaRating.style.color = 'var(--primary-blue)';
        } else if (gpa > 0.0) {
            gpaCircle.classList.add('average');
            gpaRating.textContent = "Học lực: Trung bình";
            gpaRating.style.color = '#d97706';
        } else {
            gpaRating.textContent = "Chờ dữ liệu nhập";
            gpaRating.style.color = 'var(--text-muted)';
            gpaAnalysis.textContent = "Vui lòng tải ảnh học bạ lên hoặc tự nhập tay điểm số để AI đưa ra đánh giá nền tảng học thuật của em.";
            return;
        }

        // Bias evaluation (Fallback values 0.0 if subject deleted)
        const mathVal = subjects.math || 0.0;
        const physicsVal = subjects.physics || 0.0;
        const chemistryVal = subjects.chemistry || 0.0;
        const biologyVal = subjects.biology || 0.0;
        const infoVal = subjects.informatics || 0.0;
        const litVal = subjects.literature || 0.0;
        const engVal = subjects.english || 0.0;
        
        let strengthText = "";
        if (activeLevel === 'thcs') {
            const sciVal = subjects.science || 0.0;
            const histGeoVal = subjects.historygeo || 0.0;
            const civVal = subjects.civics || 0.0;

            const scienceAvg = (mathVal + sciVal + infoVal) / 3;
            const humanitiesAvg = (litVal + histGeoVal + civVal) / 3;

            if (scienceAvg > humanitiesAvg + 0.5 && scienceAvg > engVal) {
                strengthText = "Thế mạnh rõ nét ở nhóm tự nhiên và tính toán (Toán, KHTN). Thích hợp định hướng sớm các lớp chuyên tự nhiên hoặc các câu lạc bộ Robocon THPT.";
            } else if (humanitiesAvg > scienceAvg + 0.5 && humanitiesAvg > engVal) {
                strengthText = "Thế mạnh nổi trội ở nhóm ngôn ngữ và xã hội (Văn, Lịch sử & Địa lý). Gợi ý định hướng năng lực làm việc cộng đồng, thuyết trình hoặc viết lách.";
            } else if (engVal > scienceAvg && engVal > humanitiesAvg) {
                strengthText = "Năng lực ngoại ngữ cực kỳ vượt trội. Phù hợp hướng học tập hội nhập, ngoại ngữ chuyên sâu, định hình chứng chỉ quốc tế sớm.";
            } else {
                strengthText = "Hồ sơ điểm số đồng đều. Nền tảng học thuật phát triển toàn diện, có thể chủ động chọn tổ hợp môn đa dạng ở cấp THPT.";
            }
        } else {
            const histVal = subjects.history || 0.0;
            const geoVal = subjects.geography || 0.0;

            const naturalScienceAvg = (mathVal + physicsVal + chemistryVal + biologyVal + infoVal) / 5;
            const socialScienceAvg = (litVal + histVal + geoVal) / 3;

            if (naturalScienceAvg > socialScienceAvg + 0.5 && naturalScienceAvg > engVal) {
                strengthText = "Thế mạnh Kỹ thuật - Công nghệ (Khối A00/A01). Phù hợp với các ngành Kỹ thuật phần mềm, Vi mạch bán dẫn, hoặc Khoa học máy tính.";
            } else if (socialScienceAvg > naturalScienceAvg + 0.5 && socialScienceAvg > engVal) {
                strengthText = "Thế mạnh Khoa học Xã hội - Truyền thông (Khối C00). Phù hợp với các nhóm ngành Luật học, Báo chí, Quan hệ công chúng.";
            } else if (engVal > naturalScienceAvg && engVal > socialScienceAvg) {
                strengthText = "Thế mạnh Ngoại ngữ - Kinh tế (Khối D01). Rất thích hợp định hướng nhóm ngành Kinh doanh thương mại, Logistics hoặc Marketing.";
            } else {
                strengthText = "Hồ sơ học tập liên ngành đồng đều. Đề xuất các ngành hiện đại kết hợp như Quản lý dự án công nghệ, Thiết kế đồ họa tương tác UX/UI.";
            }
        }

        gpaAnalysis.textContent = strengthText;
    }

    // 10. Saving & Loading from Local Storage
    saveBtn.addEventListener('click', async () => {
        // Kiểm tra đăng nhập trước khi lưu
        const sb = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
        if (sb) {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                alert("Bạn cần đăng nhập để sử dụng tính năng này.");
                window.location.href = "ho-so-hoc-sinh.html";
                return;
            }
        }

        let gradesList = [];
        const rows = tableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const key = row.getAttribute('data-key');
            const name = row.querySelector('td strong').textContent;
            const code = name.slice(0, 4).toUpperCase();
            const scoreHK1 = parseFloat(row.querySelector('.grade-input-hk1').value) || 0.0;
            const scoreHK2 = parseFloat(row.querySelector('.grade-input-hk2').value) || 0.0;
            
            gradesList.push({ name, code, key, scoreHK1, scoreHK2 });
        });

        const storageKey = `educareer_v2_${activeLevel}_${activeYear}`;
        localStorage.setItem(storageKey, JSON.stringify(gradesList));

        // Sync to the master student profile for Capacity Map
        let profile = {};
        try {
            const savedProfile = localStorage.getItem('educareer_student_profile');
            if (savedProfile) {
                const parsed = JSON.parse(savedProfile);
                if (parsed && typeof parsed === 'object') {
                    profile = parsed;
                }
            }
        } catch (e) {
            console.error("Error parsing student profile:", e);
        }
        
        profile.studentId = profile.studentId || "HS2026";
        profile.studentName = profile.studentName || "Nguyễn Thế Anh";
        profile.academic = {}; // Reset academic to rebuild cleanly
        
        gradesList.forEach(item => {
            let score = 0.0;
            if (item.scoreHK1 > 0 && item.scoreHK2 > 0) {
                score = parseFloat(((item.scoreHK1 + item.scoreHK2 * 2) / 3).toFixed(1));
            } else if (item.scoreHK1 > 0) {
                score = item.scoreHK1;
            } else if (item.scoreHK2 > 0) {
                score = item.scoreHK2;
            }
            if (score > 0) {
                profile.academic[item.key] = score;
            }
        });
        
        localStorage.setItem('educareer_student_profile', JSON.stringify(profile));

        // Đồng bộ hồ sơ học sinh lên Supabase nếu đã đăng nhập
        if (typeof window.syncStudentDataToCloud === 'function') {
            window.syncStudentDataToCloud(profile);
        }

        console.log(`Saved dynamic grades for ${activeLevel} - ${activeYear} to localStorage under key ${storageKey}:`, gradesList);
        showSaveSuccessModal();
    });

    const resetBtn = document.getElementById('reset-grades-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu học bạ và trắc nghiệm của học sinh không?")) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('educareer_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                localStorage.setItem('educareer_reset_flag', 'true');
                window.location.reload();
            }
        });
    }

    function loadGradesForLevelAndYear(level, year) {
        const storageKey = `educareer_v2_${level}_${year}`;
        let savedData = localStorage.getItem(storageKey);
        
        tableBody.innerHTML = ""; // Clear table

        // Đọc hồ sơ học sinh chính từ localStorage (đã đồng bộ từ Supabase)
        let studentProfile = null;
        try {
            const profileStr = localStorage.getItem('educareer_student_profile');
            if (profileStr) {
                studentProfile = JSON.parse(profileStr);
            }
        } catch (e) {}

        // Kiểm tra xem hồ sơ chính đã có điểm học tập nào chưa
        const hasAcademicData = studentProfile && studentProfile.academic && Object.keys(studentProfile.academic).length > 0;

        // Nếu trong hồ sơ chính không có điểm học tập (tài khoản mới), ta xóa bỏ cache điểm cũ và đặt lại bảng điểm = 0.0
        if (!hasAcademicData) {
            localStorage.removeItem(storageKey);
            savedData = null;
        }

        if (demoToggleSwitch && demoToggleSwitch.checked) {
            syncElectronicTranscriptSilent();
            return;
        }

        if (savedData) {
            try {
                const gradesList = JSON.parse(savedData);
                if (gradesList.length > 0) {
                    gradesList.forEach(item => {
                        const hk1 = item.scoreHK1 !== undefined ? item.scoreHK1 : (item.score || 0.0);
                        const hk2 = item.scoreHK2 !== undefined ? item.scoreHK2 : (item.score || 0.0);
                        appendGradeRow(item.name, item.code, item.key, hk1, hk2);
                    });
                    calculateGPA();
                    updateAddableSubjectsDropdown();
                    return;
                }
            } catch (e) {
                console.error("Error loading saved grades:", e);
            }
        }
        
        // Fallback: load default curriculum list with 0.0 if no saved data is found
        const defaults = curriculums[level];
        defaults.forEach(item => {
            appendGradeRow(item.name, item.code, item.key, "0.0", "0.0");
        });
        calculateGPA();
        updateAddableSubjectsDropdown();
    }

    function showSaveSuccessModal() {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(11, 25, 44, 0.4)';
        modal.style.backdropFilter = 'blur(6px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.animation = 'fadeIn 0.3s ease';

        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 20px 50px rgba(11,25,44,0.15); border: 1px solid rgba(37,99,235,0.05); animation: bubblePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(16,185,129,0.1); color: #10b981; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.4rem; color: var(--bg-dark); margin-bottom: 10px;">Lưu học bạ thành công!</h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">Bản đồ điểm số của em đã được lưu. Tiếp theo, hãy thực hiện các bài trắc nghiệm tính cách để tìm kiếm nhóm ngành phù hợp nhất nhé!</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <a href="trac-nghiem%20-%20Truyen.html" style="width: 100%; border-radius: 12px; padding: 12px; cursor: pointer; text-decoration: none; display: inline-block; font-weight: 700; background: #2563eb; color: white; border: none; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.88rem;">
                        Làm Trắc Nghiệm Ngay
                    </a>
                    <button class="btn btn-secondary" style="width: 100%; border-radius: 12px; padding: 10px; cursor: pointer; background: transparent; border: 1px solid #cbd5e1; color: #1e293b; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.82rem;" id="modal-close-btn">
                        Ở lại xem điểm
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#modal-close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    function showOcrErrorModal() {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(11, 25, 44, 0.4)';
        modal.style.backdropFilter = 'blur(6px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.animation = 'fadeIn 0.3s ease';

        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 20px 50px rgba(11,25,44,0.15); border: 1px solid rgba(239,68,68,0.05); animation: bubblePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(239,68,68,0.1); color: #ef4444; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.4rem; color: var(--bg-dark); margin-bottom: 10px;">Không tìm thấy dữ liệu học bạ</h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">Không tìm thấy thông tin điểm số hợp lệ trên ảnh học bạ tải lên. Vui lòng kiểm tra lại chất lượng hình ảnh hoặc chuyển sang chế độ <strong>"Nhập tay"</strong> để tự điền điểm số.</p>
                <button class="btn btn-secondary" style="width: 100%; border-radius: 12px; padding: 12px; cursor: pointer; border-color: rgba(37,99,235,0.1);" id="modal-err-close-btn">Tôi đã hiểu</button>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#modal-err-close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    function syncElectronicTranscriptSilent() {
        let simulatedGrades = {};
        if (activeLevel === 'thcs') {
            simulatedGrades = {
                math: { hk1: 8.5, hk2: 9.0 },
                literature: { hk1: 8.0, hk2: 8.2 },
                english: { hk1: 8.2, hk2: 8.8 },
                science: { hk1: 7.8, hk2: 8.4 },
                historygeo: { hk1: 8.0, hk2: 8.2 },
                civics: { hk1: 8.8, hk2: 9.0 },
                informatics: { hk1: 9.0, hk2: 9.5 },
                technology: { hk1: 8.5, hk2: 8.8 }
            };
        } else {
            // High school combination - Elective selection simulation (no Biology, History, Geography, Civics)
            simulatedGrades = {
                math: { hk1: 9.2, hk2: 9.5 },
                physics: { hk1: 8.8, hk2: 9.2 },
                chemistry: { hk1: 8.5, hk2: 9.0 },
                english: { hk1: 8.5, hk2: 9.0 },
                informatics: { hk1: 9.5, hk2: 9.8 },
                literature: { hk1: 7.8, hk2: 8.2 },
                technology: { hk1: 8.5, hk2: 9.0 }
            };
        }
        
        tableBody.innerHTML = ""; // Clear table first!
        
        const defaults = curriculums[activeLevel];
        defaults.forEach(item => {
            if (simulatedGrades[item.key] !== undefined) {
                const grades = simulatedGrades[item.key];
                appendGradeRow(item.name, item.code, item.key, grades.hk1, grades.hk2);
            }
        });
        
        calculateGPA();
        updateAddableSubjectsDropdown();
    }

    if (demoToggleSwitch) {
        demoToggleSwitch.addEventListener('change', () => {
            if (demoToggleSwitch.checked) {
                sheetStatus.innerHTML = '<i class="fa-solid fa-link fa-spin"></i> Đang kết nối học bạ điện tử...';
                sheetStatus.style.background = 'rgba(14, 165, 233, 0.08)';
                sheetStatus.style.color = 'var(--primary-cyan)';
                
                setTimeout(() => {
                    syncElectronicTranscriptSilent();
                    
                    sheetStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã kết nối học bạ điện tử thành công!';
                    sheetStatus.style.background = 'rgba(16, 185, 129, 0.08)';
                    sheetStatus.style.color = '#10b981';
                }, 800);
            } else {
                loadGradesForLevelAndYear(activeLevel, activeYear);
                sheetStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Bảng điểm trống. Hãy kết nối học bạ điện tử hoặc quét ảnh.';
                sheetStatus.style.background = '';
                sheetStatus.style.color = '';
            }
        });
    }

    // Auto-reload page when storage changes in another tab (e.g. from developer panel)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('educareer_')) {
            window.location.reload();
        }
    });
});
