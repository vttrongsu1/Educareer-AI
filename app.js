window.onerror = function(message, source, lineno, colno, error) {
    if (message === "Script error." && lineno == 0) return false;
    alert("Lỗi JavaScript: " + message + " tại dòng " + lineno + ":" + colno);
    return false;
};

// EduCareer AI Landing Page Interactivity
function initApp() {
    const safeInit = (fn, name) => {
        try {
            fn();
        } catch (e) {
            console.error(`Lỗi khởi tạo ${name}:`, e);
        }
    };

    safeInit(initHeaderScroll, "HeaderScroll");
    safeInit(initMobileNav, "MobileNav");
    safeInit(initSandboxTabs, "SandboxTabs");
    safeInit(initOcrDemo, "OcrDemo");
    safeInit(initVoiceDemo, "VoiceDemo");
    safeInit(initGameDemo, "GameDemo");
    safeInit(initChatDemo, "ChatDemo");
    safeInit(initIndustryCatalog, "IndustryCatalog");
    safeInit(initIndustryDetails, "IndustryDetails");
    safeInit(initIndustryCreator, "IndustryCreator");

    // Khởi tạo SoundManager cho toàn bộ website
    if (window.SoundManager) {
        try {
            window.SoundManager.init();
        } catch (e) {
            console.error("Lỗi khởi tạo SoundManager:", e);
        }
    }
}

// ============================================================
// SUPABASE AUTH: Session Check + Cloud Sync cho hồ sơ học sinh
// ============================================================

/**
 * Đồng bộ dữ liệu hồ sơ học sinh lên Supabase nếu đã đăng nhập.
 * Gọi hàm này mỗi khi học sinh quét xong học bạ hoặc làm xong trắc nghiệm.
 * @param {Object} updatedData - Dữ liệu hồ sơ mới (academic, mbti, riasec...)
 */
async function syncStudentDataToCloud(updatedData) {
    try {
        const sb = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
        if (!sb) return;
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        const studentName = updatedData.studentName || "Học sinh";

        await sb.from("students").upsert({
            id: session.user.id,
            name: studentName,
            data: updatedData
        });

        console.log("[EduCareer Sync] Đã đồng bộ hồ sơ học sinh lên đám mây Supabase thành công.");
    } catch (err) {
        console.error("[EduCareer Sync] Lỗi khi đồng bộ lên Supabase:", err);
    }
}

// Gán ra window để các file khác (ocr-handler.js, trac-nghiem.html) có thể gọi được
window.syncStudentDataToCloud = syncStudentDataToCloud;

/**
 * Khi trang web khởi động: kiểm tra phiên đăng nhập Supabase.
 * Nếu đã đăng nhập, tải hồ sơ học sinh từ cloud về localStorage.
 * Đồng thời cập nhật giao diện navbar hiển thị tên học sinh.
 */
async function initSupabaseSession() {
    try {
        const sb = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
        if (!sb) return;

        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        // Tải hồ sơ từ bảng students
        const { data, error } = await sb.from("students").select("*").eq("id", session.user.id).maybeSingle();

        if (data && data.data) {
            // Ghi đè localStorage bằng dữ liệu đám mây (cloud luôn là nguồn sự thật)
            localStorage.setItem('educareer_student_profile', JSON.stringify(data.data));
            console.log("[EduCareer Sync] Đã tải hồ sơ học sinh từ đám mây:", data.name);
            
            // Phát sự kiện để các trang (Bản đồ năng lực, AI tư vấn...) cập nhật UI tức thời không cần F5
            window.dispatchEvent(new CustomEvent('studentProfileUpdated', { detail: data.data }));
        }

        // Cập nhật nút navbar "Hồ sơ của tôi" -> hiện tên học sinh
        const profileLink = document.getElementById('nav-profile-link');
        if (profileLink) {
            const displayName = (data && data.name) ? data.name : session.user.email;
            profileLink.innerHTML = `<i class="fa-solid fa-user-check"></i> ${displayName}`;
        }

    } catch (err) {
        console.error("[EduCareer Sync] Lỗi kiểm tra phiên đăng nhập:", err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
        initSupabaseSession();
    });
} else {
    initApp();
    initSupabaseSession();
}

// 1. Header Scroll effect
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// 2. Mobile Navigation Toggle
function initMobileNav() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
            // Toggle hamburger animation
            menuToggle.classList.toggle('active');
        });

        // Close nav menu when clicking on links
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-active');
                menuToggle.classList.remove('active');
            });
        });
    }
}

// 3. Sandbox Tab Switching
function initSandboxTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.sandbox-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to selected button and panel
            button.classList.add('active');
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
                
                // Special actions depending on tab opened
                if (targetTab === 'game-tab') {
                    resetAndStartGame();
                }
            }
        });
    });
}

// 4. Sandbox OCR Scanning Simulator
function initOcrDemo() {
    const dropzone = document.getElementById('ocr-dropzone');
    const fileInfo = document.getElementById('ocr-file-info');
    const progressBar = document.getElementById('ocr-progress');
    const progressFill = document.getElementById('ocr-progress-fill');
    const table = document.getElementById('ocr-table');
    const analysis = document.getElementById('ocr-analysis');

    if (!dropzone) return;

    dropzone.addEventListener('click', () => {
        // Trigger simulated scanning process
        dropzone.style.pointerEvents = 'none';
        fileInfo.style.display = 'flex';
        progressBar.style.display = 'block';
        table.style.display = 'none';
        analysis.style.display = 'none';
        progressFill.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    table.style.display = 'block';
                    analysis.style.display = 'block';
                    dropzone.style.pointerEvents = 'auto';
                }, 300);
            }
        }, 80);
    });
}

// 5. Sandbox Voice AI MBTI Dialogues
function initVoiceDemo() {
    const micBtn = document.getElementById('voice-mic-btn');
    const promptText = document.getElementById('voice-prompt-text');
    const waves = document.getElementById('voice-waves');
    const optionsWrapper = document.getElementById('voice-options');
    const agentStatus = document.getElementById('voice-agent-status');

    if (!micBtn) return;

    let currentStep = 1;

    const dialogueTree = {
        step1: {
            text: "Chào em! Để tìm hiểu tính cách, em thích tự mình lập trình, thiết kế sản phẩm độc lập hay thích đứng ra làm Leader tổ chức sự kiện nhóm?",
            options: [
                { text: "Em thích tự mình thiết kế và lập trình độc lập", nextStep: 21 },
                { text: "Em thích làm Leader tổ chức sự kiện nhóm", nextStep: 22 }
            ]
        },
        step21: {
            text: "Tuyệt vời, em thích chiều sâu kỹ thuật. Vậy khi đối mặt với một thuật toán logic rất phức tạp, em sẽ cố gắng kiên trì tự nghiên cứu hay muốn hỏi bạn bè ngay?",
            options: [
                { text: "Em sẽ kiên trì tự nghiên cứu tìm lời giải bằng được", nextStep: 31 },
                { text: "Em sẽ hỏi bạn bè hoặc thầy cô để giải quyết nhanh", nextStep: 32 }
            ]
        },
        step22: {
            text: "Tố chất làm chủ đội nhóm rất tốt! Khi thuyết phục các bạn tham gia một hoạt động mới, em thích dùng lập luận logic hay chia sẻ câu chuyện truyền cảm hứng?",
            options: [
                { text: "Em thích dùng số liệu và lập luận logic chặt chẽ", nextStep: 33 },
                { text: "Em thích truyền tải năng lượng và cảm xúc tích cực", nextStep: 34 }
            ]
        },
        step31: {
            text: "Phân tích AI: Em có thế mạnh đặc trưng của Lập trình viên / Kỹ sư AI (Nhóm Logic Hướng Nội). Kết hợp với điểm Toán 9.2 của em, ngành Công nghệ thông tin hoặc Thiết kế vi mạch bán dẫn là hoàn hảo!",
            options: []
        },
        step32: {
            text: "Phân tích AI: Em có tư duy phân tích nhưng thiên hướng làm việc nhóm linh hoạt. Ngành Phân tích dữ liệu (Data Analyst) hoặc Quản trị dự án CNTT rất thích hợp với em.",
            options: []
        },
        step33: {
            text: "Phân tích AI: Em có tư duy Quản lý Hệ thống. Ngành Quản trị kinh doanh công nghệ, Hệ thống thông tin quản lý (MIS) hoặc Kỹ thuật công nghiệp là gợi ý hàng đầu.",
            options: []
        },
        step34: {
            text: "Phân tích AI: Em mang năng lực của một nhà Truyền thông / Sáng tạo (Nhóm Nghệ thuật Xã hội). Ngành Thiết kế UX/UI, Marketing hoặc Quan hệ công chúng rất thích hợp.",
            options: []
        }
    };

    function loadStep(stepKey) {
        const step = dialogueTree[stepKey];
        if (!step) return;

        // Speak simulation
        agentStatus.textContent = "AI Đang nói...";
        micBtn.classList.remove('listening');
        waves.classList.add('active');
        optionsWrapper.innerHTML = '';
        promptText.textContent = "...";

        setTimeout(() => {
            promptText.textContent = step.text;
            waves.classList.remove('active');
            agentStatus.textContent = "AI Đang lắng nghe...";
            micBtn.classList.add('listening');

            // Render option buttons
            if (step.options.length > 0) {
                step.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'voice-option-btn';
                    btn.innerHTML = `<span>Trả lời: "${opt.text}"</span> <i class="fa-solid fa-chevron-right"></i>`;
                    btn.addEventListener('click', () => {
                        // User response animation
                        micBtn.classList.remove('listening');
                        agentStatus.textContent = "Nhận diện giọng nói...";
                        
                        setTimeout(() => {
                            loadStep(`step${opt.nextStep}`);
                        }, 800);
                    });
                    optionsWrapper.appendChild(btn);
                });
            } else {
                // Reset button
                const btn = document.createElement('button');
                btn.className = 'voice-option-btn';
                btn.style.borderColor = 'var(--primary-orange)';
                btn.style.color = 'var(--primary-orange)';
                btn.innerHTML = '<span>Làm lại trắc nghiệm giọng nói</span> <i class="fa-solid fa-rotate-left"></i>';
                btn.addEventListener('click', () => {
                    loadStep('step1');
                });
                optionsWrapper.appendChild(btn);
                micBtn.classList.remove('listening');
                agentStatus.textContent = "Hoàn thành phân tích";
            }
        }, 1500);
    }

    // Set up option button clicks on HTML template
    const initialButtons = optionsWrapper.querySelectorAll('.voice-option-btn');
    initialButtons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            const nextKey = idx === 0 ? 'step21' : 'step22';
            loadStep(nextKey);
        });
    });

    micBtn.addEventListener('click', () => {
        // Toggle listening mode visual only
        micBtn.classList.toggle('listening');
        if (micBtn.classList.contains('listening')) {
            agentStatus.textContent = "Đang thu âm...";
            waves.classList.add('active');
        } else {
            agentStatus.textContent = "Tạm dừng";
            waves.classList.remove('active');
        }
    });
}

// 6. Sandbox Mini-Game Timer & Score
let gameTimerInterval = null;
function initGameDemo() {
    const choiceButtons = document.querySelectorAll('.game-choice-btn');
    const feedback = document.getElementById('game-feedback');

    if (choiceButtons.length === 0 || !feedback) return;

    choiceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Stop timer
            clearInterval(gameTimerInterval);

            // Disable all buttons
            choiceButtons.forEach(b => {
                b.style.pointerEvents = 'none';
                const isCorrect = b.getAttribute('data-correct') === 'true';
                if (isCorrect) {
                    b.classList.add('correct');
                }
            });

            const userSelectedCorrect = btn.getAttribute('data-correct') === 'true';
            if (!userSelectedCorrect) {
                btn.classList.add('wrong');
            }

            // Show AI Feedback
            feedback.style.display = 'block';
        });
    });
}

function resetAndStartGame() {
    const choiceButtons = document.querySelectorAll('.game-choice-btn');
    const feedback = document.getElementById('game-feedback');
    const timerFill = document.getElementById('game-timer-fill');
    const timerCounter = document.getElementById('game-timer-counter').querySelector('span');

    if (!timerFill) return;

    // Reset visual classes
    choiceButtons.forEach(b => {
        b.style.pointerEvents = 'auto';
        b.classList.remove('correct', 'wrong');
    });
    feedback.style.display = 'none';
    clearInterval(gameTimerInterval);

    let timeLeft = 15;
    timerCounter.textContent = `${timeLeft}s`;
    timerFill.style.width = '100%';

    gameTimerInterval = setInterval(() => {
        timeLeft--;
        timerCounter.textContent = `${timeLeft}s`;
        timerFill.style.width = `${(timeLeft / 15) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(gameTimerInterval);
            // Time out - lock game
            choiceButtons.forEach(b => {
                b.style.pointerEvents = 'none';
                if (b.getAttribute('data-correct') === 'true') {
                    b.classList.add('correct');
                }
            });
            // Show timeout feedback
            feedback.style.display = 'block';
            feedback.querySelector('p').innerHTML = "Rất tiếc! Đã hết thời gian làm bài.<br><strong>Gợi ý:</strong> Màu sắc tối ưu cho trẻ em và học sinh là các gam màu ôn hòa (xanh dịu, cam ấm, trắng kem) để giữ mắt thư giãn.";
        }
    }, 1000);
}

// 7. Sandbox Chatbot Career RAG
function initChatDemo() {
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('chat-typing');
    const quickQueries = document.querySelectorAll('.chat-query-btn');

    if (!sendBtn || !chatInput || !chatMessages) return;

    // Set dynamic welcome message based on profile if available
    const profile = window.HOC_SINH_PROFILE || null;
    let welcomeMsg = "Chào em! Hệ thống ghi nhận em đạt độ tương thích cao với <strong>Nhóm ngành Công nghệ thông tin</strong>. Em muốn xem cẩm nang chi tiết ngành nào để anh giúp?";
    if (profile && profile.studentName) {
        let activeData = profile;
        try {
            const saved = localStorage.getItem('educareer_student_profile');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    activeData = parsed;
                }
            }
        } catch(e) {}
        
        const academicKeys = activeData.academic ? Object.keys(activeData.academic).filter(k => activeData.academic[k] !== undefined && activeData.academic[k] !== null && activeData.academic[k] !== 0) : [];
        const avg = academicKeys.length > 0 ? (academicKeys.reduce((s,v)=>s+activeData.academic[v], 0)/academicKeys.length).toFixed(1) : null;
        const riasecStr = activeData.riasec && Object.keys(activeData.riasec).length > 0
            ? Object.keys(activeData.riasec).sort((a,b)=>activeData.riasec[b]-activeData.riasec[a]).slice(0, 2).join('')
            : '';
            
        welcomeMsg = `Chào <strong>${activeData.studentName}</strong>! Anh là Cố vấn học tập AI. Anh đã nhận được hồ sơ năng lực của em từ trường ${activeData.school} (Lớp ${activeData.gradeClass}${avg ? `, GPA ${avg}` : ''}${activeData.mbti ? `, Tính cách ${activeData.mbti}` : ''}${riasecStr ? `, Holland ${riasecStr}` : ''}). Em muốn anh tư vấn chi tiết định hướng ngành học nào hôm nay?`;
    }
    const botBubble = chatMessages.querySelector('.chat-bubble.bot');
    if (botBubble) {
        botBubble.innerHTML = welcomeMsg;
    }

    const botReplies = {
        "so sanh ai va ky thuat phan mem": `
            <div>
                <p><strong>Cẩm nang so sánh (VNPT Smartbot RAG):</strong></p>
                <table>
                    <thead>
                        <tr>
                            <th>Tiêu chí</th>
                            <th>Trí tuệ nhân tạo (AI)</th>
                            <th>Kỹ thuật phần mềm (SE)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Trọng tâm</strong></td>
                            <td>Thuật toán học máy, xử lý dữ liệu lớn, liên kết nơ-ron.</td>
                            <td>Xây dựng ứng dụng, quản lý dự án code, bảo trì hệ thống.</td>
                        </tr>
                        <tr>
                            <td><strong>Môn cốt lõi</strong></td>
                            <td>Toán rời rạc, Đại số tuyến tính, Xác suất thống kê.</td>
                            <td>Cấu trúc dữ liệu, OOP, Kiến trúc phần mềm.</td>
                        </tr>
                        <tr>
                            <td><strong>Mức lương</strong></td>
                            <td>Từ 1.200$ - 3.500$/tháng (Nhu cầu cao đột biến)</td>
                            <td>Từ 800$ - 2.500$/tháng (Nhu cầu ổn định)</td>
                        </tr>
                    </tbody>
                </table>
                <p style="margin-top: 8px;">Em có muốn so sánh điểm chuẩn đại học năm vừa rồi của hai ngành này không?</p>
            </div>
        `,
        "hoc nganh vi mach ban dan ra truong lam gi?": `
            <div>
                <p><strong>Cẩm nang ngành Vi mạch bán dẫn (VNPT SmartReader RAG):</strong></p>
                <p>Sau khi tốt nghiệp, em có thể đảm nhận các vị trí thực tế:</p>
                <ul style="margin-left: 18px; margin-top: 6px;">
                    <li><strong>Kỹ sư thiết kế vi mạch (IC Design Engineer):</strong> Thiết kế các khối logic mạch số/tương tự.</li>
                    <li><strong>Kỹ sư kiểm thử (Verification Engineer):</strong> Viết kịch bản test độ ổn định của chip.</li>
                    <li><strong>Kỹ sư sản xuất (Layout Engineer):</strong> Sắp đặt cấu trúc vật lý chip.</li>
                </ul>
                <p style="margin-top: 8px;"><strong>Mức lương khởi điểm:</strong> $1,000 - $1,800/tháng. Đào tạo tại các trường: ĐHQG Hà Nội, ĐHQG TP.HCM, ĐH Bách Khoa.</p>
            </div>
        `
    };

    function appendMessage(sender, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = text;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleUserInput() {
        const text = chatInput.value.trim();
        if (text === '') return;

        appendMessage('user', text);
        chatInput.value = '';

        // Search bot reply
        const searchKey = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let reply = "Cảm ơn câu hỏi của em. Hệ thống RAG đang đối chiếu dữ liệu tuyển sinh. Anh đề xuất em hỏi về <strong>'So sánh AI và Kỹ thuật phần mềm'</strong> hoặc <strong>'Học ngành Vi mạch bán dẫn ra trường làm gì?'</strong> để trải nghiệm dữ liệu cẩm nang chuẩn hóa nhé!";
        
        for (let key in botReplies) {
            if (searchKey.includes(key) || key.includes(searchKey)) {
                reply = botReplies[key];
                break;
            }
        }

        // Show typing indicator
        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        setTimeout(() => {
            typingIndicator.style.display = 'none';
            appendMessage('bot', reply);
        }, 1200);
    }

    sendBtn.addEventListener('click', handleUserInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

        quickQueries.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.getAttribute('data-question');
            chatInput.value = question;
            handleUserInput();
        });
    });
}

// ==========================================================================
// EDUCAREER AI - CAREER GUIDE SYSTEM (CAM NANG NGANH) LOGIC
// ==========================================================================

// Dynamic script loading helper for serverless file:// compatibility
function loadScriptAsync(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.head.appendChild(script);
    });
}

const DEFAULT_INDUSTRIES = [];
let INDUSTRIES_DATABASE = [];
let industriesLoadedPromise = null;

async function loadAllIndustriesAsync() {
    if (INDUSTRIES_DATABASE.length > 0) return INDUSTRIES_DATABASE;
    
    let majors = [];
    
    // 1. Try to load list.js dynamically (works on both http:// and file://)
    try {
        await loadScriptAsync("Data/Nganh/list.js");
        if (window.CAREER_LIST) {
            majors = window.CAREER_LIST;
        }
    } catch (listErr) {
        console.error("Could not dynamically load Data/Nganh/list.js.", listErr);
    }
    
    const list = [];
    
    for (let m of majors) {
        try {
            // 2. Load major js data file dynamically (e.g. AI.js, Marketing.js)
            await loadScriptAsync(`Data/Nganh/${m}.js`);
            const data = window[`CAREER_DATA_${m}`];
            
            if (!data) {
                console.error(`Dynamic data CAREER_DATA_${m} is undefined`);
                continue;
            }
            
            // Map JSON structure to the app UI schema
            const lowerM = m.toLowerCase();
            let category = "tech";
            if (lowerM.includes("marketing") || lowerM.includes("kinh_te") || lowerM.includes("biz") || lowerM.includes("quan_tri") || lowerM.includes("logistics")) {
                category = "biz";
            } else if (lowerM.includes("thiet_ke") || lowerM.includes("art") || lowerM.includes("do_hoa")) {
                category = "art";
            }

            const isV2 = !!data.chung;
            const tongQuan = isV2 ? data.chung["1_tong_quan"] : data["1_tong_quan"];
            const chuyenNganh = isV2 ? data.chung.chuyen_nganh : data["2_chuyen_nganh"];
            const toChat = isV2 ? data.chung.to_chat_phu_hop : data["3_to_chat_phu_hop"];
            const xuHuong = isV2 ? data.chung.xu_huong_trien_vong : data["8_xu_huong_trien_vong"];

            const ind = {
                id: lowerM,
                title: data.ten_nganh,
                category: category,
                desc: tongQuan ? tongQuan.mo_ta.substring(0, 160) + "..." : "",
                sec1: tongQuan ? tongQuan.mo_ta : "",
                sec2: chuyenNganh ? chuyenNganh.map(c => `- **${c.ten}:** ${c.mo_ta}`).join('\n') : "",
                sec3: toChat ? toChat.map(tc => `- **${tc.to_chat}:** ${tc.giai_thich}`).join('\n') : "",
                sec4: isV2 ? "" : `${data["4_co_hoi_viec_lam"].mo_dau}\n\n` + data["4_co_hoi_viec_lam"].vi_tri.map(vt => `- **${vt.ten_vi_tri}:** ${vt.mo_ta}`).join('\n') + `\n\n* ${data["4_co_hoi_viec_lam"].nhan_xet_chung}`,
                salaryIntern: "",
                salaryFresh: isV2 ? "" : (data["5_muc_luong"][0] ? data["5_muc_luong"][0].muc_luong : "Chưa cập nhật"),
                salaryExp: isV2 ? "" : (data["5_muc_luong"][1] ? data["5_muc_luong"][1].muc_luong : "Chưa cập nhật"),
                salaryNotes: isV2 ? "" : `Đơn vị: ${data._meta.luong_don_vi} (Dữ liệu năm ${data._meta.nam_du_lieu})`,
                sec6: xuHuong ? xuHuong.noi_dung : "",
                compLevel: category === "tech" ? "Rất cao" : "Cao",
                sec7: isV2 ? "" : `${data["10_muc_do_canh_tranh"].mo_dau}\n\n` + data["10_muc_do_canh_tranh"].chi_tiet.map(ct => `- **${ct.cap_do}:** ${ct.mo_ta}`).join('\n'),
                ratings: category === "tech" ? {
                    demand: 5,
                    salary: 5,
                    growth: 5,
                    comp: 4,
                    stress: 5
                } : {
                    demand: 4,
                    salary: 4,
                    growth: 5,
                    comp: 4,
                    stress: 4
                },
                sec9: isV2 ? "" : `${data["12_ket_luan"].doan_1}\n\n${data["12_ket_luan"].doan_2}`,
                raw: data // Keep full json for detailed layout
            };
            list.push(ind);
        } catch (e) {
            console.error(`Error processing major ${m}:`, e);
        }
    }
    
    DEFAULT_INDUSTRIES.length = 0;
    DEFAULT_INDUSTRIES.push(...list);
    
    // Add custom industries (Supabase cloud with LocalStorage fallback)
    let allList = [...DEFAULT_INDUSTRIES];
    const sb = getSupabaseClient();
    let customList = [];
    
    if (sb) {
        try {
            const { data, error } = await sb.from('careers').select('*');
            if (error) {
                console.error("Lỗi khi tải dữ liệu từ Supabase, chuyển sang LocalStorage:", error);
                const custom = localStorage.getItem("custom_industries");
                if (custom) customList = JSON.parse(custom);
            } else if (data) {
                console.log("Tải thành công cẩm nang từ Supabase đám mây:", data.length);
                customList = data.map(row => row.data);
            }
        } catch (err) {
            console.error("Lỗi kết nối Supabase:", err);
            const custom = localStorage.getItem("custom_industries");
            if (custom) customList = JSON.parse(custom);
        }
    } else {
        const custom = localStorage.getItem("custom_industries");
        if (custom) {
            try {
                customList = JSON.parse(custom);
            } catch (e) {
                console.error("Error parsing custom industries", e);
            }
        }
    }
    
    allList.push(...customList);
    
    // Deduplicate by ID (Supabase / custom items override static items if matching)
    const uniqueMap = {};
    allList.forEach(item => {
        if (item && item.id) {
            uniqueMap[item.id] = item;
        }
    });
    
    INDUSTRIES_DATABASE = Object.values(uniqueMap);
    return INDUSTRIES_DATABASE;
}

// Start loading immediately in the background
industriesLoadedPromise = loadAllIndustriesAsync();

// Synchronous wrapper (returns empty if not loaded yet, but usually loaded by the time render runs)
function getAllIndustries() {
    return INDUSTRIES_DATABASE;
}

// 2. Catalog Page Logic (cam-nang-nganh.html)
async function initIndustryCatalog() {
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;

    const searchInput = document.getElementById("catalog-search");
    const filterButtons = document.querySelectorAll("#catalog-filters .filter-btn");
    
    let activeCategory = "all";
    let searchQuery = "";

    // Wait for dynamic industries loading to finish
    await industriesLoadedPromise;

    function render() {
        const industries = getAllIndustries();
        
        // Static coming-soon placeholders to make catalog look premium
        const staticPlaceholders = [
            {
                id: "design",
                title: "Thiết Kế Đồ Họa & Đa Phương Tiện",
                category: "art",
                desc: "Thế giới sáng tạo hình ảnh, giao diện UX/UI, animation và dựng phim số đáp ứng nhu cầu truyền thông hiện đại.",
                isPlaceholder: true
            },
            {
                id: "business",
                title: "Quản Trị Kinh Doanh Công Nghệ",
                category: "biz",
                desc: "Sự kết hợp giữa tư duy quản trị, marketing số và ứng dụng phân tích dữ liệu AI vào quản lý doanh nghiệp.",
                isPlaceholder: true
            }
        ];

        let displayList = [...industries];
        
        // Filter by category
        if (activeCategory !== "all") {
            if (activeCategory === "custom") {
                displayList = displayList.filter(ind => ind.id.startsWith("custom_"));
            } else {
                displayList = displayList.filter(ind => ind.category === activeCategory);
            }
        }

        // Add placeholders if filter matches or all
        if (activeCategory === "all" || activeCategory === "art") {
            displayList.push(staticPlaceholders[0]);
        }
        if (activeCategory === "all" || activeCategory === "biz") {
            displayList.push(staticPlaceholders[1]);
        }

        // Filter by search query
        if (searchQuery !== "") {
            displayList = displayList.filter(ind => 
                ind.title.toLowerCase().includes(searchQuery) || 
                ind.desc.toLowerCase().includes(searchQuery)
            );
        }

        grid.innerHTML = "";

        if (displayList.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 16px; display: block; color: #cbd5e1;"></i>
                    Không tìm thấy ngành học phù hợp.
                </div>
            `;
            return;
        }

        displayList.forEach(ind => {
            const card = document.createElement("div");
            
            if (ind.isPlaceholder) {
                card.className = "catalog-card coming-soon";
                card.innerHTML = `
                    <div class="catalog-card-header">
                        <span class="catalog-card-badge ${ind.category}">${ind.category === 'art' ? 'Mỹ thuật' : 'Kinh tế'}</span>
                        <i class="fa-solid fa-compass-drafting catalog-card-icon"></i>
                    </div>
                    <h3>${ind.title}</h3>
                    <p>${ind.desc}</p>
                    <div class="catalog-card-footer">
                        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-lock"></i> Đang biên soạn</span>
                    </div>
                `;
            } else {
                const isCustom = ind.id.startsWith("custom_");
                let badgeClass = ind.category;
                let badgeText = "Công nghệ";
                if (isCustom) {
                    badgeClass = "custom";
                    badgeText = "Tự tạo";
                } else if (ind.category === "biz") {
                    badgeText = "Kinh tế";
                } else if (ind.category === "art") {
                    badgeText = "Mỹ thuật";
                }

                let iconHtml = '<i class="fa-solid fa-laptop-code catalog-card-icon"></i>';
                if (ind.category === 'biz') iconHtml = '<i class="fa-solid fa-chart-line catalog-card-icon"></i>';
                if (ind.category === 'art') iconHtml = '<i class="fa-solid fa-palette catalog-card-icon"></i>';

                card.className = "catalog-card";
                card.innerHTML = `
                    <div class="catalog-card-header">
                        <span class="catalog-card-badge ${badgeClass}">${badgeText}</span>
                        ${iconHtml}
                    </div>
                    <h3>${ind.title}</h3>
                    <p>${ind.desc}</p>
                    <div class="catalog-card-footer">
                        <a href="chi-tiet-nganh.html?id=${ind.id}" class="catalog-card-link">
                            Xem chi tiết <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>
                `;
            }
            grid.appendChild(card);
        });
    }

    // Search input listener
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        render();
    });

    // Filter buttons listener
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = btn.getAttribute("data-category");
            render();
        });
    });

    render();
}

// 3. Detail Page Logic (chi-tiet-nganh.html)
async function initIndustryDetails() {
    const titleEl = document.getElementById("display-title");
    if (!titleEl) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        titleEl.textContent = "Không tìm thấy mã ngành";
        return;
    }

    // Wait for dynamic industries loading to finish
    await industriesLoadedPromise;
    const industries = getAllIndustries();
    const ind = industries.find(item => item.id === id);

    if (!ind) {
        titleEl.textContent = "Ngành học không tồn tại";
        document.getElementById("detail-body-content").innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #ef4444; margin-bottom: 16px;"></i>
                <p>Không tìm thấy cẩm nang cho ngành học này.</p>
            </div>
        `;
        return;
    }

    // A. Render Header
    titleEl.textContent = ind.title;
    
    const bannerImg = document.getElementById("display-banner-img");
    if (bannerImg) {
        let bannerSrc = "images/hero_illustration.png";
        if (ind.category === "tech") bannerSrc = "images/nganh/tech/banner.png";
        else if (ind.category === "biz") bannerSrc = "images/nganh/biz/banner.png";
        else if (ind.category === "art") bannerSrc = "images/nganh/art/banner.png";
        bannerImg.src = bannerSrc;
    }
    
    const catBadge = document.getElementById("display-category");
    let categoryName = "Công nghệ & Kỹ thuật";
    if (ind.category === "biz") categoryName = "Kinh tế & Quản lý";
    if (ind.category === "art") categoryName = "Nghệ thuật & Thiết kế";
    if (ind.id.startsWith("custom_")) categoryName = "Cẩm nang Tự soạn";
    catBadge.textContent = categoryName;

    // B. Render Content
    const bodyContent = document.getElementById("detail-body-content");
    
    if (ind.raw) {
        const raw = ind.raw;
        const isV2 = !!raw.chung;
        
        if (isV2) {
            // Render tab-switcher HTML
            bodyContent.innerHTML = `
                <style>
                    .layered-tabs-container {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 24px;
                        background: #F1F5F9;
                        padding: 6px;
                        border-radius: 12px;
                        border: 1px solid #E2E8F0;
                    }
                    .layered-tab-btn {
                        flex: 1;
                        padding: 12px 16px;
                        border: none;
                        background: transparent;
                        font-weight: 800;
                        font-size: 0.95rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        color: #64748B;
                        border-radius: 8px;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .layered-tab-btn:hover {
                        color: var(--primary-blue);
                        background: rgba(255,255,255,0.5);
                    }
                    .layered-tab-btn.active {
                        background: #FFFFFF;
                        color: var(--primary-blue);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    }
                    .timeline-container {
                        position: relative;
                        padding-left: 20px;
                        margin: 20px 0;
                    }
                    .timeline-line {
                        position: absolute;
                        left: 8px;
                        top: 10px;
                        bottom: 10px;
                        width: 2px;
                        background: #E2E8F0;
                    }
                    .timeline-card {
                        position: relative;
                        padding-left: 24px;
                        margin-bottom: 20px;
                    }
                    .timeline-dot {
                        position: absolute;
                        left: -19px;
                        top: 4px;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: var(--primary-blue);
                        border: 3px solid #FFFFFF;
                        box-shadow: 0 0 0 1px var(--primary-blue);
                    }
                    .timeline-title {
                        font-size: 0.95rem;
                        font-weight: 800;
                        color: var(--primary-blue);
                        margin-bottom: 6px;
                    }
                    .timeline-content {
                        font-size: 0.8rem;
                        color: var(--text-muted);
                        line-height: 1.5;
                        background: #FFFFFF;
                        padding: 10px 14px;
                        border-radius: 8px;
                        border: 1px solid #E2E8F0;
                    }
                    .subject-badge {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: #FFFFFF;
                        border: 1px solid #E2E8F0;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 8px;
                    }
                    .subject-name {
                        font-size: 0.9rem;
                        font-weight: 800;
                        color: var(--text-dark);
                    }
                    .subject-desc {
                        font-size: 0.78rem;
                        color: var(--text-muted);
                        margin: 2px 0 0 0;
                    }
                </style>
                <div class="layered-tabs-container">
                    <button class="layered-tab-btn active" id="tab-btn-lop9">
                        <i class="fa-solid fa-graduation-cap"></i> Góc Định Hướng Lớp 9
                    </button>
                    <button class="layered-tab-btn" id="tab-btn-lop12">
                        <i class="fa-solid fa-user-graduate"></i> Tuyển Sinh & Việc Làm Lớp 12
                    </button>
                </div>
                <div id="layered-content-pane">
                    <!-- Dynamic content will be injected here -->
                </div>
                
                <!-- Shared References Section (Always visible at the bottom) -->
                <div class="detail-section" style="border-top: 1px solid #E2E8F0; margin-top: 30px; padding-top: 20px;">
                    <h2><i class="fa-solid fa-circle-info"></i> Tài liệu & Nguồn tham khảo</h2>
                    <ul style="padding-left: 20px; font-size: 0.82rem; display: flex; flex-direction: column; gap: 6px;">
                        ${raw.chung.nguon_tham_khao.map(ref => `
                            <li>
                                <strong>${ref.chu_de}:</strong> 
                                ${ref.link.startsWith('http') ? `<a href="${ref.link}" target="_blank" style="color: var(--primary-blue); text-decoration: underline;">${ref.link}</a>` : `<span style="color: var(--text-muted);">${ref.link}</span>`}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;

            // Function to render Lớp 9 content
            function renderLop9() {
                const pane = document.getElementById("layered-content-pane");
                pane.innerHTML = `
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-compass"></i> 1. Tổng quan ngành học</h2>
                        <p style="line-height: 1.6;">${raw.chung["1_tong_quan"].mo_ta}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-network-wired"></i> 2. Các hướng đi chuyên ngành</h2>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${raw.chung.chuyen_nganh.map(c => `
                                <div style="background: #FFFFFF; border-left: 4px solid var(--primary-blue); border: 1px solid #E2E8F0; border-left-width: 4px; padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.9rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${c.ten}</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${c.mo_ta}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-star"></i> 3. Các tố chất phù hợp</h2>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${raw.chung.to_chat_phu_hop.map(tc => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.88rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                        <i class="fa-solid fa-circle-check" style="color: #10B981; font-size: 0.9rem;"></i> ${tc.to_chat}
                                    </h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5; padding-left: 20px;">${tc.giai_thich}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-route"></i> 4. Lộ trình chuẩn bị gợi ý</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_9.lo_trinh_chuan_bi.mo_ta}</p>
                        <div class="timeline-container">
                            <div class="timeline-line"></div>
                            ${raw.lop_9.lo_trinh_chuan_bi.theo_nam.map(item => `
                                <div class="timeline-card">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-title">${item.giai_doan}</div>
                                    <div class="timeline-content">${item.viec_can_lam.replace(/\n/g, "<br>")}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-book-open"></i> 5. Các môn cần học tốt ở trường phổ thông</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_9.mon_can_hoc_gioi.mo_dau}</p>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${raw.lop_9.mon_can_hoc_gioi.danh_sach.map(item => `
                                <div class="subject-badge">
                                    <div style="background: rgba(37,99,235,0.1); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-blue); font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                                        ${item.mon.charAt(0)}
                                    </div>
                                    <div style="margin-left: 12px;">
                                        <div class="subject-name">${item.mon}</div>
                                        <div class="subject-desc">${item.ly_do}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-briefcase"></i> 6. Công việc tương lai tương ứng</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_9.co_hoi_viec_lam.mo_dau}</p>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${raw.lop_9.co_hoi_viec_lam.vi_tri.map(vt => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid var(--primary-cyan); padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.88rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${vt.ten_vi_tri}</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${vt.mo_ta}</p>
                                </div>
                            `).join('')}
                        </div>
                        <p style="font-size: 0.8rem; font-style: italic; color: var(--text-muted); margin-top: 14px; border-top: 1px dashed #E2E8F0; padding-top: 10px;"><i class="fa-solid fa-circle-info"></i> ${raw.lop_9.co_hoi_viec_lam.nhan_xet_chung}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-money-bill-trend-up"></i> 7. Các bậc lương định hướng</h2>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            ${raw.lop_9.muc_luong.theo_cap_bac.map(item => `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                    <span style="font-size: 0.85rem; font-weight: 800; color: var(--text-dark);">${item.cap_bac}</span>
                                    <span style="font-size: 0.9rem; font-weight: 900; color: #10B981;">${item.muc_luong}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">* ${raw.lop_9.muc_luong.ghi_chu} (Đơn vị: ${raw._meta.luong_don_vi})</p>
                    </div>
                    
                    <div class="detail-section" style="border-bottom: none; padding-bottom: 0;">
                        <h2><i class="fa-solid fa-quote-left"></i> 8. Lời khuyên cho em Lớp 9</h2>
                        <p style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 12px;">${raw.lop_9.ket_luan.doan_1}</p>
                        <p style="font-size: 0.85rem; line-height: 1.6; font-weight: 600; color: var(--primary-blue); background: rgba(37,99,235,0.03); border-left: 4px solid var(--primary-blue); padding: 14px; border-radius: 8px; margin: 0;">${raw.lop_9.ket_luan.doan_2}</p>
                    </div>
                `;
            }

            // Function to render Lớp 12 content
            function renderLop12() {
                const pane = document.getElementById("layered-content-pane");
                pane.innerHTML = `
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-compass"></i> 1. Tổng quan ngành học</h2>
                        <p style="line-height: 1.6;">${raw.chung["1_tong_quan"].mo_ta}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-network-wired"></i> 2. Các hướng đi chuyên ngành</h2>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${raw.chung.chuyen_nganh.map(c => `
                                <div style="background: #FFFFFF; border-left: 4px solid var(--primary-blue); border: 1px solid #E2E8F0; border-left-width: 4px; padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.9rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${c.ten}</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${c.mo_ta}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-star"></i> 3. Các tố chất phù hợp</h2>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            ${raw.chung.to_chat_phu_hop.map(tc => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.88rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                        <i class="fa-solid fa-circle-check" style="color: #10B981; font-size: 0.9rem;"></i> ${tc.to_chat}
                                    </h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5; padding-left: 20px;">${tc.giai_thich}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-briefcase"></i> 4. Thị trường tuyển dụng & Việc làm</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_12.co_hoi_viec_lam.mo_dau}</p>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${raw.lop_12.co_hoi_viec_lam.vi_tri.map(vt => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid var(--primary-cyan); padding: 12px 16px; border-radius: 8px;">
                                    <h4 style="font-size: 0.88rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${vt.ten_vi_tri}</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${vt.mo_ta}</p>
                                </div>
                            `).join('')}
                        </div>
                        <p style="font-size: 0.8rem; font-style: italic; color: var(--text-muted); margin-top: 14px; border-top: 1px dashed #E2E8F0; padding-top: 10px;"><i class="fa-solid fa-circle-info"></i> ${raw.lop_12.co_hoi_viec_lam.nhan_xet_chung}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-money-bill-wave"></i> 5. Thang mức lương chi tiết</h2>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            ${raw.lop_12.muc_luong.theo_cap_bac.map(item => `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                    <span style="font-size: 0.85rem; font-weight: 800; color: var(--text-dark);">${item.cap_bac}</span>
                                    <span style="font-size: 0.9rem; font-weight: 900; color: #10B981;">${item.muc_luong}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">* ${raw.lop_12.muc_luong.ghi_chu} (Đơn vị: ${raw._meta.luong_don_vi})</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-book"></i> 6. Tổ hợp môn xét tuyển THPT Quốc gia</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_12.to_hop_mon.mo_ta}</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            ${raw.lop_12.to_hop_mon.cac_to_hop.map(th => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <span style="font-size: 0.95rem; font-weight: 900; color: var(--primary-blue);">${th.ma_to_hop}</span>
                                        <p style="font-size: 0.72rem; color: var(--text-muted); margin: 2px 0 0 0;">${th.mon_thi}</p>
                                    </div>
                                    ${th.pho_bien ? `<span style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.1); color: #10B981; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Phổ biến</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <p style="font-size: 0.8rem; font-style: italic; color: var(--text-muted); margin-top: 12px;"><i class="fa-solid fa-circle-info"></i> ${raw.lop_12.to_hop_mon.ghi_chu}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-building-columns"></i> 7. Danh sách trường đào tạo & Học phí</h2>
                        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                            ${raw.lop_12.truong_dao_tao.map(t => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 14px; border-radius: 10px;">
                                    <h4 style="font-size: 0.85rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px;">${t.ten_truong}</h4>
                                    <p style="font-size: 0.78rem; margin: 4px 0;"><strong>Điểm chuẩn THPT:</strong> <span style="color: #EF4444; font-weight: 700;">${t.diem_chuan}</span></p>
                                    ${t.hoc_phi_uoc_tinh ? `<p style="font-size: 0.78rem; margin: 4px 0;"><strong>Học phí ước tính:</strong> <span style="color: var(--primary-blue); font-weight: 700;">${t.hoc_phi_uoc_tinh}</span></p>` : ''}
                                    <p style="font-size: 0.78rem; margin: 4px 0;"><strong>Tổ hợp môn:</strong> ${t.to_hop_xet_tuyen}</p>
                                    <p style="font-size: 0.72rem; color: var(--text-muted); font-style: italic; margin: 0; border-top: 1px dashed #F1F5F9; padding-top: 4px; margin-top: 6px;">${t.ghi_chu}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-arrow-trend-up"></i> 8. Xu hướng & Triển vọng tương lai</h2>
                        <p style="line-height: 1.6;">${raw.chung.xu_huong_trien_vong.noi_dung}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h2><i class="fa-solid fa-shield-halved"></i> 9. Mức độ cạnh tranh tuyển sinh & việc làm</h2>
                        <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw.lop_12.muc_do_canh_tranh.mo_dau}</p>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${raw.lop_12.muc_do_canh_tranh.chi_tiet.map(ct => `
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 14px; border-radius: 8px;">
                                    <h4 style="font-size: 0.82rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px;">${ct.cap_do}</h4>
                                    <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.45;">${ct.mo_ta}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section" style="border-bottom: none; padding-bottom: 0;">
                        <h2><i class="fa-solid fa-quote-left"></i> 10. Lời khuyên Tuyển sinh lớp 12</h2>
                        <p style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 12px;">${raw.lop_12.ket_luan.doan_1}</p>
                        <p style="font-size: 0.85rem; line-height: 1.6; font-weight: 600; color: var(--primary-blue); background: rgba(37,99,235,0.03); border-left: 4px solid var(--primary-blue); padding: 14px; border-radius: 8px; margin: 0;">${raw.lop_12.ket_luan.doan_2}</p>
                    </div>
                `;
            }

            // Setup tab button click event listeners
            setTimeout(() => {
                const btn9 = document.getElementById("tab-btn-lop9");
                const btn12 = document.getElementById("tab-btn-lop12");
                if (btn9 && btn12) {
                    btn9.addEventListener("click", () => {
                        btn9.classList.add("active");
                        btn12.classList.remove("active");
                        renderLop9();
                    });

                    btn12.addEventListener("click", () => {
                        btn12.classList.add("active");
                        btn9.classList.remove("active");
                        renderLop12();
                    });
                }
            }, 50);

            // Default render Lớp 9 tab first
            renderLop9();
            
        } else {
            // Version 1.2 Flat fallback
            bodyContent.innerHTML = `
                <div class="detail-section">
                    <h2><i class="fa-solid fa-compass"></i> 1. Tổng quan ngành học</h2>
                    <p style="line-height: 1.6;">${raw["1_tong_quan"].mo_ta}</p>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-graduation-cap"></i> 2. Các chuyên ngành đào tạo</h2>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${raw["2_chuyen_nganh"].map(c => `
                            <div style="background: #FFFFFF; border-left: 4px solid var(--primary-blue); border: 1px solid #E2E8F0; border-left-width: 4px; padding: 12px 16px; border-radius: 8px;">
                                <h4 style="font-size: 0.9rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${c.ten}</h4>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${c.mo_ta}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-user-gear"></i> 3. Tố chất phù hợp</h2>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${raw["3_to_chat_phu_hop"].map(tc => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                <h4 style="font-size: 0.88rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-circle-check" style="color: #10B981; font-size: 0.9rem;"></i> ${tc.to_chat}
                                </h4>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5; padding-left: 20px;">${tc.giai_thich}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-briefcase"></i> 4. Cơ hội việc làm</h2>
                    <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw["4_co_hoi_viec_lam"].mo_dau}</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${raw["4_co_hoi_viec_lam"].vi_tri.map(vt => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid var(--primary-cyan); padding: 12px 16px; border-radius: 8px;">
                                <h4 style="font-size: 0.88rem; color: var(--text-dark); font-weight: 800; margin-bottom: 4px;">${vt.ten_vi_tri}</h4>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${vt.mo_ta}</p>
                            </div>
                        `).join('')}
                    </div>
                    <p style="font-size: 0.8rem; font-style: italic; color: var(--text-muted); margin-top: 14px; border-top: 1px dashed #E2E8F0; padding-top: 10px;"><i class="fa-solid fa-circle-info"></i> ${raw["4_co_hoi_viec_lam"].nhan_xet_chung}</p>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-money-bill-wave"></i> 5. Mức lương tham khảo</h2>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                        ${raw["5_muc_luong"].map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
                                <span style="font-size: 0.85rem; font-weight: 800; color: var(--text-dark);">${item.cap_bac}</span>
                                <span style="font-size: 0.9rem; font-weight: 900; color: #10B981;">${item.muc_luong}</span>
                            </div>
                        `).join('')}
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">* Đơn vị: ${raw._meta.luong_don_vi} (Dữ liệu khảo sát năm ${raw._meta.nam_du_lieu})</p>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-book"></i> 6. Tổ hợp môn xét tuyển</h2>
                    <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw["6_to_hop_mon"].mo_ta}</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${raw["6_to_hop_mon"].cac_to_hop.map(th => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <span style="font-size: 0.95rem; font-weight: 900; color: var(--primary-blue);">${th.ma_to_hop}</span>
                                    <p style="font-size: 0.72rem; color: var(--text-muted); margin: 2px 0 0 0;">${th.mon_thi}</p>
                                </div>
                                ${th.pho_bien ? `<span style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.1); color: #10B981; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Phổ biến</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <p style="font-size: 0.8rem; font-style: italic; color: var(--text-muted); margin-top: 12px;"><i class="fa-solid fa-circle-info"></i> ${raw["6_to_hop_mon"].ghi_chu}</p>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-building-columns"></i> 7. Các trường đào tạo tiêu biểu</h2>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                        ${raw["7_truong_dao_tao"].map(t => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 14px; border-radius: 10px;">
                                <h4 style="font-size: 0.85rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px;">${t.ten_truong}</h4>
                                <p style="font-size: 0.78rem; margin: 2px 0;"><strong>Điểm chuẩn:</strong> <span style="color: #EF4444; font-weight: 700;">${t.diem_chuan_2024 || t.diem_chuan || 'Chưa công bố'}</span> | <strong>Tổ hợp xét tuyển:</strong> ${t.to_hop_xet_tuyen}</p>
                                <p style="font-size: 0.72rem; color: var(--text-muted); font-style: italic; margin: 0;">${t.ghi_chu}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-chart-line"></i> 8. Xu hướng & Triển vọng phát triển</h2>
                    <p style="line-height: 1.6;">${raw["8_xu_huong_trien_vong"].noi_dung}</p>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-gauge-high"></i> 9. Đánh giá mức độ khó khăn</h2>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                        ${raw["9_danh_gia_do_kho"].map(dk => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 14px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-size: 0.82rem; font-weight: 800; color: var(--text-dark);">${dk.tieu_chi}</span>
                                    <span style="font-size: 0.75rem; font-weight: 800; background: ${dk.muc_do === 'Rất cao' ? '#FEE2E2' : '#FEF3C7'}; color: ${dk.muc_do === 'Rất cao' ? '#EF4444' : '#D97706'}; padding: 2px 8px; border-radius: 4px;">${dk.muc_do}</span>
                                </div>
                                <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0;">${dk.ghi_chu}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-shield-halved"></i> 10. Mức độ cạnh tranh trong ngành</h2>
                    <p style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 12px;">${raw["10_muc_do_canh_tranh"].mo_dau}</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${raw["10_muc_do_canh_tranh"].chi_tiet.map(ct => `
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 12px 14px; border-radius: 8px;">
                                <h4 style="font-size: 0.82rem; color: var(--primary-blue); font-weight: 800; margin-bottom: 4px;">${ct.cap_do}</h4>
                                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.45;">${ct.mo_ta}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2><i class="fa-solid fa-circle-info"></i> 11. Tài liệu & Nguồn tham khảo</h2>
                    <ul style="padding-left: 20px; font-size: 0.82rem; display: flex; flex-direction: column; gap: 6px;">
                        ${raw["11_nguon_tham_khao"].map(ref => `
                            <li>
                                <strong>${ref.chu_de}:</strong> 
                                ${ref.link.startsWith('http') ? `<a href="${ref.link}" target="_blank" style="color: var(--primary-blue); text-decoration: underline;">${ref.link}</a>` : `<span style="color: var(--text-muted);">${ref.link}</span>`}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="detail-section" style="border-bottom: none; padding-bottom: 0;">
                    <h2><i class="fa-solid fa-quote-left"></i> 12. Lời khuyên & Kết luận</h2>
                    <p style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 12px;">${raw["12_ket_luan"].doan_1}</p>
                    <p style="font-size: 0.85rem; line-height: 1.6; font-weight: 600; color: var(--primary-blue); background: rgba(37,99,235,0.03); border-left: 4px solid var(--primary-blue); padding: 14px; border-radius: 0 8px 8px 0; margin: 0;">${raw["12_ket_luan"].doan_2}</p>
                </div>
            `;
        }
    } else {
        bodyContent.innerHTML = `
            <div class="detail-section">
                <h2><i class="fa-solid fa-compass"></i> 1. Giới thiệu ngành</h2>
                <p>${ind.sec1.replace(/\n/g, "<br>")}</p>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-graduation-cap"></i> 2. Chương trình đào tạo</h2>
                <div>${formatBulletList(ind.sec2)}</div>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-user-gear"></i> 3. Tố chất phù hợp</h2>
                <div>${formatBulletList(ind.sec3)}</div>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-briefcase"></i> 4. Triển vọng nghề nghiệp</h2>
                <div>${formatBulletList(ind.sec4)}</div>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-money-bill-wave"></i> 5. Mức lương tham khảo</h2>
                <ul>
                    ${ind.salaryIntern ? `<li><strong>Thực tập sinh:</strong> ${ind.salaryIntern}</li>` : ''}
                    <li><strong>Sinh viên mới tốt nghiệp:</strong> ${ind.salaryFresh}</li>
                    <li><strong>Sau vài năm kinh nghiệm:</strong> ${ind.salaryExp}</li>
                </ul>
                ${ind.salaryNotes ? `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; border-top: 1px dashed #e2e8f0; padding-top: 10px; margin-top: 10px;">* Ghi chú: ${ind.salaryNotes}</p>` : ''}
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-chart-line"></i> 6. Xu hướng hiện nay</h2>
                <p>${ind.sec6.replace(/\n/g, "<br>")}</p>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-shield-halved"></i> 7. Mức độ cạnh tranh</h2>
                <p><strong>Đánh giá mức độ:</strong> ${ind.compLevel}</p>
                <p>${ind.sec7}</p>
            </div>
            <div class="detail-section">
                <h2><i class="fa-solid fa-quote-left"></i> 9. Kết luận</h2>
                <p>${ind.sec9.replace(/\n/g, "<br>")}</p>
            </div>
        `;
    }

    // C. Render Ratings sidebar
    const ratingsContainer = document.getElementById("display-ratings");
    ratingsContainer.innerHTML = "";
    
    if (ind.raw && ind.raw.chung) {
        const raw = ind.raw;
        const doKho = raw.lop_12.danh_gia_do_kho;
        doKho.forEach(item => {
            const el = document.createElement("div");
            el.className = "valuation-item";
            el.innerHTML = `
                <div class="valuation-item-header">
                    <span>${item.tieu_chi}</span>
                    <span class="valuation-stars" style="color: #F59E0B; font-weight: bold; font-family: 'Plus Jakarta Sans', sans-serif;">${item.muc_do}</span>
                </div>
            `;
            ratingsContainer.appendChild(el);
        });
        
        const notesItem = document.createElement("div");
        notesItem.className = "valuation-desc";
        notesItem.innerHTML = `Độ khó và áp lực được khảo sát thực tế từ sinh viên và cựu sinh viên của các trường đại học tại Việt Nam.`;
        ratingsContainer.appendChild(notesItem);
    } else {
        const criteriaLabels = {
            demand: "Nhu cầu nhân lực",
            salary: "Mức lương trung bình",
            growth: "Cơ hội phát triển",
            comp: "Độ cạnh tranh",
            stress: "Áp lực học tập"
        };
        for (let crit in ind.ratings) {
            const val = ind.ratings[crit];
            const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(val) + '<i class="fa-regular fa-star"></i>'.repeat(5 - val);
            
            const item = document.createElement("div");
            item.className = "valuation-item";
            item.innerHTML = `
                <div class="valuation-item-header">
                    <span>${criteriaLabels[crit]}</span>
                    <span class="valuation-stars">${starsHtml}</span>
                </div>
            `;
            ratingsContainer.appendChild(item);
        }
        
        const notesItem = document.createElement("div");
        notesItem.className = "valuation-desc";
        notesItem.innerHTML = `Độ cạnh tranh được đánh giá ở mức <strong>${ind.compLevel}</strong>. Áp lực học tập và yêu cầu cập nhật công nghệ mới liên tục đạt mức <strong>${ind.ratings.stress}/5</strong> sao.`;
        ratingsContainer.appendChild(notesItem);
    }

    // D. Setup actions triggers (Download / Copy)
    function downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function generateMarkdown(i) {
        if (i.raw && i.raw.chung) {
            const raw = i.raw;
            return `# Cẩm nang hướng nghiệp: ${i.title}\n\n` +
                   `## 1. Tổng quan\n${raw.chung["1_tong_quan"].mo_ta}\n\n` +
                   `## 2. Chuyên ngành\n` + raw.chung.chuyen_nganh.map(c => `- **${c.ten}:** ${c.mo_ta}`).join('\n') + `\n\n` +
                   `## 3. Tố chất phù hợp\n` + raw.chung.to_chat_phu_hop.map(tc => `- **${tc.to_chat}:** ${tc.giai_thich}`).join('\n') + `\n\n` +
                   `## 4. Định hướng Lớp 9\n` +
                   `- Lộ trình: ${raw.lop_9.lo_trinh_chuan_bi.mo_ta}\n` +
                   raw.lop_9.lo_trinh_chuan_bi.theo_nam.map(item => `  * ${item.giai_doan}: ${item.viec_can_lam}`).join('\n') + `\n` +
                   `- Môn cần học tốt:\n` + raw.lop_9.mon_can_hoc_gioi.danh_sach.map(item => `  * ${item.mon}: ${item.ly_do}`).join('\n') + `\n\n` +
                   `## 5. Tuyển sinh Lớp 12\n` +
                   `- Cơ hội việc làm:\n` + raw.lop_12.co_hoi_viec_lam.vi_tri.map(vt => `  * ${vt.ten_vi_tri}: ${vt.mo_ta}`).join('\n') + `\n` +
                   `- Tổ hợp môn xét tuyển:\n` + raw.lop_12.to_hop_mon.cac_to_hop.map(th => `  * ${th.ma_to_hop}: ${th.mon_thi}`).join('\n') + `\n` +
                   `- Trường đào tạo:\n` + raw.lop_12.truong_dao_tao.map(t => `  * ${t.ten_truong} (Điểm chuẩn: ${t.diem_chuan}, Học phí: ${t.hoc_phi_uoc_tinh || 'N/A'})`).join('\n') + `\n\n` +
                   `*Nội dung tự động tạo bởi EduCareer AI 2026.*`;
        }
        return `# Cẩm nang ngành: ${i.title}\n\n## 1. Giới thiệu ngành\n${i.sec1}\n\n## 2. Chương trình đào tạo\n${i.sec2}\n\n## 3. Tố chất phù hợp\n${i.sec3}\n\n## 4. Triển vọng nghề nghiệp\n${i.sec4}\n\n## 5. Mức lương tham khảo\n- **Thực tập sinh:** ${i.salaryIntern || 'Chưa cập nhật'}\n- **Mới tốt nghiệp:** ${i.salaryFresh}\n- **Có kinh nghiệm:** ${i.salaryExp}\n*Ghi chú:* ${i.salaryNotes || ''}\n\n## 6. Xu hướng và độ hot của ngành hiện nay\n${i.sec6}\n\n## 7. Mức độ cạnh tranh\n- **Mức độ:** ${i.compLevel}\n- **Chi tiết:** ${i.sec7}\n\n## 8. Đánh giá tổng quan\n- Nhu cầu nhân lực: ${i.ratings.demand}/5\n- Mức lương: ${i.ratings.salary}/5\n- Cơ hội phát triển: ${i.ratings.growth}/5\n- Độ cạnh tranh: ${i.ratings.comp}/5\n- Áp lực học tập: ${i.ratings.stress}/5\n\n## 9. Kết luận\n${i.sec9}\n\n---\n*Nội dung tự động tạo bởi EduCareer AI 2026.*`;
    }

    function generateText(i) {
        if (i.raw && i.raw.chung) {
            const raw = i.raw;
            return `CẨM NANG NGÀNH HỌC: ${i.title.toUpperCase()}\n==================================================\n\n` +
                   `1. Tổng quan\n------------------\n${raw.chung["1_tong_quan"].mo_ta}\n\n` +
                   `2. Chuyên ngành\n----------------------\n` + raw.chung.chuyen_nganh.map(c => `- ${c.ten}: ${c.mo_ta}`).join('\n') + `\n\n` +
                   `3. Tố chất phù hợp\n-----------------\n` + raw.chung.to_chat_phu_hop.map(tc => `- ${tc.to_chat}: ${tc.giai_thich}`).join('\n') + `\n\n` +
                   `4. Định hướng Lớp 9\n-----------------\n` +
                   `- Lộ trình: ${raw.lop_9.lo_trinh_chuan_bi.mo_ta}\n` +
                   raw.lop_9.lo_trinh_chuan_bi.theo_nam.map(item => `  * ${item.giai_doan}: ${item.viec_can_lam}`).join('\n') + `\n` +
                   `- Môn cần học tốt:\n` + raw.lop_9.mon_can_hoc_gioi.danh_sach.map(item => `  * ${item.mon}: ${item.ly_do}`).join('\n') + `\n\n` +
                   `5. Tuyển sinh Lớp 12\n-----------------\n` +
                   `- Cơ hội việc làm:\n` + raw.lop_12.co_hoi_viec_lam.vi_tri.map(vt => `  * ${vt.ten_vi_tri}: ${vt.mo_ta}`).join('\n') + `\n` +
                   `- Tổ hợp môn xét tuyển:\n` + raw.lop_12.to_hop_mon.cac_to_hop.map(th => `  * ${th.ma_to_hop}: ${th.mon_thi}`).join('\n') + `\n` +
                   `- Trường đào tạo:\n` + raw.lop_12.truong_dao_tao.map(t => `  * ${t.ten_truong} (Điểm chuẩn: ${t.diem_chuan}, Học phí: ${t.hoc_phi_uoc_tinh || 'N/A'})`).join('\n') + `\n\n` +
                   `Bản quyền thuộc về EduCareer AI 2026.`;
        }
        return `CẨM NANG NGÀNH HỌC: ${i.title.toUpperCase()}\n==================================================\n\n1. Giới thiệu ngành\n------------------\n${i.sec1}\n\n2. Chương trình đào tạo\n----------------------\n${i.sec2}\n\n3. Tố chất phù hợp\n-----------------\n${i.sec3}\n\n4. Triển vọng nghề nghiệp\n------------------------\n${i.sec4}\n\n5. Mức lương tham khảo\n---------------------\n- Thực tập sinh: ${i.salaryIntern || 'Chưa cập nhật'}\n- Mới tốt nghiệp: ${i.salaryFresh}\n- Có kinh nghiệm: ${i.salaryExp}\nGhi chú: ${i.salaryNotes || ''}\n\n6. Xu hướng hiện nay\n------------------\n${i.sec6}\n\n7. Mức độ cạnh tranh\n-------------------\nMức độ: ${i.compLevel}\nChi tiết: ${i.sec7}\n\n8. Đánh giá tổng quan\n---------------------\n- Nhu cầu nhân lực: ${i.ratings.demand}/5\n- Mức lương: ${i.ratings.salary}/5\n- Cơ hội phát triển: ${i.ratings.growth}/5\n- Độ cạnh tranh: ${i.ratings.comp}/5\n- Áp lực học tập: ${i.ratings.stress}/5\n\n9. Kết luận\n----------\n${i.sec9}\n\n--------------------------------------------------\nBản quyền thuộc về EduCareer AI 2026.`;
    }

    const btnDlMd = document.getElementById("btn-dl-md");
    if (btnDlMd) {
        btnDlMd.addEventListener("click", () => {
            const md = generateMarkdown(ind);
            const fileName = `${ind.id.replace("custom_", "")}_guide.md`;
            downloadFile(md, fileName, "text/markdown;charset=utf-8");
        });
    }

    const btnDlTxt = document.getElementById("btn-dl-txt");
    if (btnDlTxt) {
        btnDlTxt.addEventListener("click", () => {
            const txt = generateText(ind);
            const fileName = `${ind.id.replace("custom_", "")}_guide.txt`;
            downloadFile(txt, fileName, "text/plain;charset=utf-8");
        });
    }

    const btnCopyArt = document.getElementById("btn-copy-art");
    if (btnCopyArt) {
        btnCopyArt.addEventListener("click", () => {
            const md = generateMarkdown(ind);
            navigator.clipboard.writeText(md).then(() => {
                const originalText = btnCopyArt.innerHTML;
                btnCopyArt.innerHTML = `<i class="fa-solid fa-check"></i> Đã sao chép!`;
                btnCopyArt.style.background = "#10B981";
                setTimeout(() => {
                    btnCopyArt.innerHTML = originalText;
                    btnCopyArt.style.background = "";
                }, 2000);
            });
        });
    }
}

// 4. Creator Page Logic (tao-cam-nang.html)
function initIndustryCreator() {
    const form = document.getElementById("industry-editor-form");
    if (!form) return;

    const demoBtn = document.getElementById("btn-load-demo");
    const clearBtn = document.getElementById("btn-clear-form");
    const previewContent = document.getElementById("live-preview-content");
    const statusMsg = document.getElementById("save-status-msg");

    // Star pickers state
    const ratingValues = {
        "rating-demand": 0,
        "rating-salary": 0,
        "rating-growth": 0,
        "rating-comp": 0,
        "rating-stress": 0
    };

    // A. Interactivity for star pickers
    const pickers = document.querySelectorAll(".stars-picker");
    pickers.forEach(picker => {
        const ratingId = picker.getAttribute("data-rating-id");
        const stars = picker.querySelectorAll("i");

        stars.forEach(star => {
            star.addEventListener("click", () => {
                const value = parseInt(star.getAttribute("data-value"));
                ratingValues[ratingId] = value;
                picker.setAttribute("data-selected-val", value);

                // Update UI classes
                stars.forEach((s, idx) => {
                    if (idx < value) {
                        s.className = "fa-solid fa-star active";
                    } else {
                        s.className = "fa-regular fa-star";
                    }
                });
                updatePreview();
            });
            
            // Hover states (optional decoration)
            star.addEventListener("mouseenter", () => {
                const value = parseInt(star.getAttribute("data-value"));
                stars.forEach((s, idx) => {
                    if (idx < value) {
                        s.style.color = "#fbbf24";
                    }
                });
            });
            star.addEventListener("mouseleave", () => {
                stars.forEach((s) => {
                    s.style.color = "";
                });
            });
        });
    });

    // B. Live Preview Render
    function updatePreview() {
        const title = document.getElementById("input-title").value || "Tên Ngành Học";
        const catValue = document.getElementById("input-category").value;
        const desc = document.getElementById("input-desc").value || "Tóm tắt ngành học...";
        const sec1 = document.getElementById("input-sec1").value || "Nội dung phần giới thiệu...";
        const sec2 = document.getElementById("input-sec2").value || "Nội dung đào tạo...";
        const sec3 = document.getElementById("input-sec3").value || "Tố chất cần có...";
        const sec4 = document.getElementById("input-sec4").value || "Vị trí việc làm...";
        const salIntern = document.getElementById("input-salary-intern").value || "";
        const salFresh = document.getElementById("input-salary-fresh").value || "Chưa nhập";
        const salExp = document.getElementById("input-salary-exp").value || "Chưa nhập";
        const salNotes = document.getElementById("input-salary-notes").value || "";
        const sec6 = document.getElementById("input-sec6").value || "Nhu cầu và xu hướng hiện nay...";
        const compLevel = document.getElementById("input-comp-level").value;
        const sec7 = document.getElementById("input-sec7").value || "Tại sao cạnh tranh và giải pháp...";
        const sec9 = document.getElementById("input-sec9").value || "Đúc kết và khuyên học sinh...";

        let catText = "Công nghệ";
        if (catValue === "biz") catText = "Kinh tế";
        if (catValue === "art") catText = "Mỹ thuật";

        // Render ratings table preview
        let ratingsHtml = "";
        const criteriaLabels = {
            "rating-demand": "Nhu cầu nhân lực",
            "rating-salary": "Mức lương trung bình",
            "rating-growth": "Cơ hội phát triển",
            "rating-comp": "Độ cạnh tranh",
            "rating-stress": "Áp lực học tập"
        };
        for (let ratingId in ratingValues) {
            const val = ratingValues[ratingId];
            const starsHtml = '★'.repeat(val) + '☆'.repeat(5 - val);
            ratingsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem;">
                    <span>${criteriaLabels[ratingId]}:</span>
                    <span style="color:#fbbf24; font-weight:700;">${starsHtml} (${val}/5)</span>
                </div>
            `;
        }

        previewContent.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 20px;">
                    <span style="background: rgba(37,99,235,0.08); color:#2563eb; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; text-transform:uppercase;">${catText}</span>
                    <h3 style="font-size:1.6rem; color:#0f172a; margin-top:8px; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif;">${title}</h3>
                    <p style="font-size:0.9rem; color:#64748b; margin-top:6px; font-style:italic;">${desc}</p>
                </div>
                
                <div style="font-size:0.9rem; line-height:1.6; color:#334155;">
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">1. Giới thiệu ngành</h4>
                        <p style="white-space:pre-line;">${sec1}</p>
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">2. Chương trình đào tạo</h4>
                        <p style="white-space:pre-line;">${sec2}</p>
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">3. Tố chất phù hợp</h4>
                        <p style="white-space:pre-line;">${sec3}</p>
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">4. Triển vọng nghề nghiệp</h4>
                        <p style="white-space:pre-line;">${sec4}</p>
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">5. Mức lương tham khảo</h4>
                        <ul style="padding-left: 20px;">
                            ${salIntern ? `<li>Thực tập sinh: ${salIntern}</li>` : ''}
                            <li>Mới tốt nghiệp: ${salFresh}</li>
                            <li>Kinh nghiệm lâu năm: ${salExp}</li>
                        </ul>
                        ${salNotes ? `<p style="font-size:0.8rem; font-style:italic; color:#64748b; margin-top:6px;">* Ghi chú: ${salNotes}</p>` : ''}
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">6. Xu hướng & độ hot</h4>
                        <p style="white-space:pre-line;">${sec6}</p>
                    </div>
                    <div style="margin-bottom:20px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">7. Mức độ cạnh tranh</h4>
                        <p><strong>Cấp độ:</strong> ${compLevel}</p>
                        <p>${sec7}</p>
                    </div>
                    <div style="margin-bottom:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:8px;"><i class="fa-solid fa-chart-simple"></i> 8. Đánh giá tổng quan</h4>
                        ${ratingsHtml}
                    </div>
                    <div style="margin-bottom:10px;">
                        <h4 style="color:#2563eb; font-weight:700; margin-bottom:6px; border-left:3px solid #2563eb; padding-left:8px;">9. Kết luận</h4>
                        <p style="white-space:pre-line;">${sec9}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Attach listeners to input fields to trigger live preview
    const formInputs = form.querySelectorAll("input, textarea, select");
    formInputs.forEach(input => {
        input.addEventListener("input", updatePreview);
        input.addEventListener("change", updatePreview);
    });

    // B.1. AI Generation Event Handler
    const aiBtn = document.getElementById("btn-ai-generate");
    if (aiBtn) {
        aiBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const careerName = prompt("Nhập tên ngành học muốn AI tự động tra cứu tuyển sinh thật và biên soạn cẩm nang:");
            if (!careerName || !careerName.trim()) return;
            
            const originalText = aiBtn.innerHTML;
            aiBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tra cứu AI...`;
            aiBtn.disabled = true;
            statusMsg.textContent = "Đang gọi Gemini AI + Google Search để tra cứu dữ liệu tuyển sinh thực tế (mất khoảng 10-20 giây)...";
            statusMsg.className = "save-status-msg warning";

            try {
                const response = await fetch("https://educareer-ai.onrender.com/api/generate-career-guide", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ career_name: careerName.trim() })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || "Sinh dữ liệu thất bại.");
                }

                const result = await response.json();
                const data = result.data;
                const isV2 = !!data.chung;

                if (!isV2) {
                    throw new Error("Dữ liệu trả về từ AI không đúng cấu trúc phân tầng mới.");
                }

                // Auto-fill fields
                document.getElementById("input-title").value = data.ten_nganh;
                
                // Set Category
                let category = "tech";
                const slug = result.slug;
                if (slug.includes("marketing") || slug.includes("kinh_te") || slug.includes("biz") || slug.includes("quan_tri") || slug.includes("logistics")) {
                    category = "biz";
                } else if (slug.includes("thiet_ke") || slug.includes("art") || slug.includes("do_hoa")) {
                    category = "art";
                }
                document.getElementById("input-category").value = category;

                const tongQuan = data.chung["1_tong_quan"];
                const chuyenNganh = data.chung.chuyen_nganh;
                const toChat = data.chung.to_chat_phu_hop;
                
                document.getElementById("input-desc").value = tongQuan ? tongQuan.mo_ta.substring(0, 160) + "..." : "";
                document.getElementById("input-sec1").value = tongQuan ? tongQuan.mo_ta : "";
                document.getElementById("input-sec2").value = chuyenNganh ? chuyenNganh.map(c => `- **${c.ten}:** ${c.mo_ta}`).join('\n') : "";
                document.getElementById("input-sec3").value = toChat ? toChat.map(tc => `- **${tc.to_chat}:** ${tc.giai_thich}`).join('\n') : "";
                
                // Class 12 job details
                const job12 = data.lop_12.co_hoi_viec_lam;
                document.getElementById("input-sec4").value = job12 ? `${job12.mo_dau}\n\n` + job12.vi_tri.map(vt => `- **${vt.ten_vi_tri}:** ${vt.mo_ta}`).join('\n') + `\n\n* ${job12.nhan_xet_chung}` : "";

                // Salaries
                const sal9 = data.lop_9.muc_luong.theo_cap_bac;
                const sal12 = data.lop_12.muc_luong.theo_cap_bac;
                
                document.getElementById("input-salary-intern").value = sal12[0] ? sal12[0].muc_luong : (sal9[0] ? sal9[0].muc_luong : "");
                document.getElementById("input-salary-fresh").value = sal12[1] ? sal12[1].muc_luong : (sal9[1] ? sal9[1].muc_luong : "");
                document.getElementById("input-salary-exp").value = sal12[2] ? sal12[2].muc_luong : (sal9[2] ? sal9[2].muc_luong : "");
                document.getElementById("input-salary-notes").value = `Đơn vị: ${data._meta.luong_don_vi} (Cập nhật thực tế năm ${data._meta.nam_du_lieu})`;

                // Trends
                const xuHuong = data.chung.xu_huong_trien_vong;
                document.getElementById("input-sec6").value = xuHuong ? xuHuong.noi_dung : "";

                // Competitiveness
                const comp12 = data.lop_12.muc_do_canh_tranh;
                document.getElementById("input-comp-level").value = "Cao";
                document.getElementById("input-sec7").value = comp12 ? `${comp12.mo_dau}\n\n` + comp12.chi_tiet.map(ct => `- **${ct.cap_do}:** ${ct.mo_ta}`).join('\n') : "";

                // Stars rating defaults for the form (Gemini returns difficulty ratings out of 5 stars)
                const difficulty = data.lop_12.danh_gia_do_kho;
                const difficultyMap = {
                    "Điểm chuẩn đầu vào": "demand",
                    "Điểm đầu vào": "demand",
                    "Khối lượng kiến thức": "stress",
                    "Kỹ năng thực tế cần thiết": "growth",
                    "Áp lực công việc": "comp",
                    "Yêu cầu ngoại ngữ": "salary"
                };

                const starsVal = {
                    demand: 4,
                    salary: 4,
                    growth: 4,
                    comp: 3,
                    stress: 4
                };

                if (difficulty) {
                    difficulty.forEach(item => {
                        const starsCount = (item.muc_do.match(/⭐/g) || []).length;
                        const key = difficultyMap[item.tieu_chi];
                        if (key && starsCount > 0) {
                            starsVal[key] = starsCount;
                        }
                    });
                }

                // Apply stars UI
                for (let k in starsVal) {
                    const val = starsVal[k];
                    const picker = document.querySelector(`.stars-picker[data-rating-id="rating-${k}"]`);
                    if (picker) {
                        picker.setAttribute("data-selected-val", val);
                        ratingValues[`rating-${k}`] = val;
                        picker.querySelectorAll("i").forEach((s, idx) => {
                            s.className = idx < val ? "fa-solid fa-star active" : "fa-regular fa-star";
                        });
                    }
                }

                // Conclusion
                const concl12 = data.lop_12.ket_luan;
                document.getElementById("input-sec9").value = concl12 ? `${concl12.doan_1}\n\n${concl12.doan_2}` : "";

                updatePreview();
                statusMsg.textContent = `Tự sinh cẩm nang ngành "${data.ten_nganh}" bằng AI thành công! Dữ liệu đã được nạp và lưu trữ.`;
                statusMsg.className = "save-status-msg success";

            } catch (err) {
                console.error(err);
                statusMsg.textContent = `Thất bại khi sinh AI: ${err.message}`;
                statusMsg.className = "save-status-msg error";
                alert(`Lỗi sinh dữ liệu cẩm nang: ${err.message}\n\nHãy chắc chắn bạn đã khởi chạy server Python online tại địa chỉ https://educareer-ai.onrender.com`);
            } finally {
                aiBtn.innerHTML = originalText;
                aiBtn.disabled = false;
            }
        });
    }

    // C. Fill Demo CNTT
    demoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const demoData = DEFAULT_INDUSTRIES[0];

        document.getElementById("input-title").value = demoData.title;
        document.getElementById("input-category").value = demoData.category;
        document.getElementById("input-desc").value = demoData.desc;
        document.getElementById("input-sec1").value = demoData.sec1;
        document.getElementById("input-sec2").value = demoData.sec2;
        document.getElementById("input-sec3").value = demoData.sec3;
        document.getElementById("input-sec4").value = demoData.sec4;
        document.getElementById("input-salary-intern").value = demoData.salaryIntern;
        document.getElementById("input-salary-fresh").value = demoData.salaryFresh;
        document.getElementById("input-salary-exp").value = demoData.salaryExp;
        document.getElementById("input-salary-notes").value = demoData.salaryNotes;
        document.getElementById("input-sec6").value = demoData.sec6;
        document.getElementById("input-comp-level").value = demoData.compLevel;
        document.getElementById("input-sec7").value = demoData.sec7;
        document.getElementById("input-sec9").value = demoData.sec9;

        // Set ratings values
        for (let key in demoData.ratings) {
            const val = demoData.ratings[key];
            const picker = document.querySelector(`.stars-picker[data-rating-id="rating-${key}"]`);
            if (picker) {
                picker.setAttribute("data-selected-val", val);
                ratingValues[`rating-${key}`] = val;
                
                const stars = picker.querySelectorAll("i");
                stars.forEach((s, idx) => {
                    if (idx < val) {
                        s.className = "fa-solid fa-star active";
                    } else {
                        s.className = "fa-regular fa-star";
                    }
                });
            }
        }

        updatePreview();
        statusMsg.textContent = "Đã nhập mẫu CNTT thành công!";
        statusMsg.className = "save-status-msg success";
        setTimeout(() => { statusMsg.textContent = ""; }, 3000);
    });

    // D. Clear Form
    clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        form.reset();
        
        // Reset stars picker
        pickers.forEach(picker => {
            const ratingId = picker.getAttribute("data-rating-id");
            ratingValues[ratingId] = 0;
            picker.removeAttribute("data-selected-val");
            picker.querySelectorAll("i").forEach(s => {
                s.className = "fa-regular fa-star";
            });
        });

        previewContent.innerHTML = `
            <div class="preview-empty-state">
                <i class="fa-solid fa-file-invoice"></i>
                <p>Điền thông tin ở biểu mẫu bên trái và bấm <strong>"Xem trước"</strong> (hoặc bấm nút "Nhập mẫu CNTT") để hiển thị kết quả render bài mẫu ở đây.</p>
            </div>
        `;

        statusMsg.textContent = "Đã xóa toàn bộ nội dung.";
        statusMsg.className = "save-status-msg success";
        setTimeout(() => { statusMsg.textContent = ""; }, 3000);
    });

    // E. Save Industry (Form Submit)
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Validation check for ratings
        for (let ratingId in ratingValues) {
            if (ratingValues[ratingId] === 0) {
                statusMsg.textContent = "Vui lòng chọn xếp hạng sao cho phần 8 (Đánh giá tổng quan)!";
                statusMsg.className = "save-status-msg error";
                return;
            }
        }

        const title = document.getElementById("input-title").value.trim();
        const category = document.getElementById("input-category").value;
        const desc = document.getElementById("input-desc").value.trim();
        const sec1 = document.getElementById("input-sec1").value.trim();
        const sec2 = document.getElementById("input-sec2").value.trim();
        const sec3 = document.getElementById("input-sec3").value.trim();
        const sec4 = document.getElementById("input-sec4").value.trim();
        const salaryIntern = document.getElementById("input-salary-intern").value.trim();
        const salaryFresh = document.getElementById("input-salary-fresh").value.trim();
        const salaryExp = document.getElementById("input-salary-exp").value.trim();
        const salaryNotes = document.getElementById("input-salary-notes").value.trim();
        const sec6 = document.getElementById("input-sec6").value.trim();
        const compLevel = document.getElementById("input-comp-level").value;
        const sec7 = document.getElementById("input-sec7").value.trim();
        const sec9 = document.getElementById("input-sec9").value.trim();

        // Create slug/id
        const slug = "custom_" + title.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove tone accents
            .replace(/[^\w\s-]/g, "") // remove special chars
            .trim()
            .replace(/\s+/g, "_"); // spaces to underscores

        const newIndustry = {
            id: slug,
            title: title,
            category: category,
            desc: desc,
            sec1: sec1,
            sec2: sec2,
            sec3: sec3,
            sec4: sec4,
            salaryIntern: salaryIntern,
            salaryFresh: salaryFresh,
            salaryExp: salaryExp,
            salaryNotes: salaryNotes,
            sec6: sec6,
            compLevel: compLevel,
            sec7: sec7,
            ratings: {
                demand: ratingValues["rating-demand"],
                salary: ratingValues["rating-salary"],
                growth: ratingValues["rating-growth"],
                comp: ratingValues["rating-comp"],
                stress: ratingValues["rating-stress"]
            },
            sec9: sec9
        };

        // Save to localStorage (Local fallback)
        let customList = [];
        const customData = localStorage.getItem("custom_industries");
        if (customData) {
            try {
                customList = JSON.parse(customData);
            } catch (err) {
                console.error("Error reading storage list", err);
            }
        }

        // Replace if already exists or add new
        const existIndex = customList.findIndex(item => item.id === slug || item.title.toLowerCase() === title.toLowerCase());
        if (existIndex !== -1) {
            newIndustry.id = customList[existIndex].id; // maintain exact same ID
            customList[existIndex] = newIndustry;
        } else {
            customList.push(newIndustry);
        }
        localStorage.setItem("custom_industries", JSON.stringify(customList));

        // Save to Supabase Cloud Database (Primary Storage)
        const sb = getSupabaseClient();
        if (sb) {
            statusMsg.textContent = "Đang gửi lên cơ sở dữ liệu đám mây Supabase...";
            statusMsg.className = "save-status-msg warning";
            
            sb.from('careers').upsert({
                id: slug,
                title: title,
                category: category,
                desc: desc,
                data: newIndustry
            }).then(({ error }) => {
                if (error) {
                    console.error("Lỗi lưu Supabase:", error);
                    statusMsg.textContent = "Lưu cục bộ thành công! Nhưng gặp lỗi khi đẩy lên đám mây.";
                    statusMsg.className = "save-status-msg error";
                } else {
                    console.log("Đã lưu cẩm nang lên Supabase thành công!");
                    statusMsg.textContent = "Lưu thành công lên đám mây Supabase và tích hợp vào cẩm nang!";
                    statusMsg.className = "save-status-msg success";
                }
            }).catch(err => {
                console.error("Lỗi kết nối Supabase:", err);
                statusMsg.textContent = "Lưu cục bộ thành công! Lỗi kết nối đám mây.";
                statusMsg.className = "save-status-msg error";
            });
        } else {
            statusMsg.textContent = "Lưu thành công! Ngành học đã được tích hợp vào cẩm nang cục bộ.";
            statusMsg.className = "save-status-msg success";
        }

        statusMsg.textContent = "Lưu thành công! Ngành học đã được tích hợp vào Cẩm nang.";
        statusMsg.className = "save-status-msg success";
        
        // Show alert overlay and redirect option
        setTimeout(() => {
            alert(`Lưu ngành ${title} thành công! Bạn có thể truy cập danh mục cẩm nang để kiểm tra.`);
        }, 100);
    });
}

// Global Sound Management System (SoundManager)
const SoundManager = {
    bgm: null,
    btnClick: null,
    answerSound: null,
    isMuted: false,
    volume: 0.6, // Master volume default
    prevVolume: 0.6,

    init() {
        // Chỉ kích hoạt hệ thống âm thanh trên trang làm trắc nghiệm
        if (!window.location.pathname.includes('trac-nghiem')) {
            return;
        }

        try {
            // Tạo và nhúng các phần tử audio trực tiếp vào DOM của trang để tránh lỗi bảo mật (CORS/Origin) trên giao thức file://
            let bgmEl = document.getElementById('global-bgm-audio');
            if (!bgmEl) {
                bgmEl = document.createElement('audio');
                bgmEl.id = 'global-bgm-audio';
                bgmEl.src = 'music/TracNghiem.mp3';
                bgmEl.loop = true;
                bgmEl.preload = 'auto';
                document.body.appendChild(bgmEl);
            }
            this.bgm = bgmEl;

            let clickEl = document.getElementById('global-click-audio');
            if (!clickEl) {
                clickEl = document.createElement('audio');
                clickEl.id = 'global-click-audio';
                clickEl.src = 'music/nutbam.mp3';
                clickEl.preload = 'auto';
                document.body.appendChild(clickEl);
            }
            this.btnClick = clickEl;

            let answerEl = document.getElementById('global-answer-audio');
            if (!answerEl) {
                answerEl = document.createElement('audio');
                answerEl.id = 'global-answer-audio';
                answerEl.src = 'music/khitraloi.mp3';
                answerEl.preload = 'auto';
                document.body.appendChild(answerEl);
            }
            this.answerSound = answerEl;
            
            // Kích hoạt tải nhạc
            this.bgm.load();
            this.btnClick.load();
            this.answerSound.load();
        } catch (err) {
            console.warn("Không khởi tạo được âm thanh DOM:", err);
        }

        // Đọc thiết lập âm lượng lưu trữ (localStorage) có bọc try-catch phòng trường hợp file:// bị chặn truy cập bộ nhớ
        let savedVol = null;
        try {
            savedVol = localStorage.getItem('educareer_sound_volume');
        } catch(e) {
            console.warn("Truy cập localStorage bị chặn bởi bảo mật file://:", e);
        }

        if (savedVol !== null) {
            this.volume = parseFloat(savedVol);
        } else {
            this.volume = 0.6; // Âm lượng mặc định 60%
        }
        
        // Reset mute if it was true to prevent initial muting confusion
        this.isMuted = this.volume === 0;

        this.createVolumeWidget();
        this.updateVolume(this.volume);
        this.initClickListeners();

        // Autoplay on first user interaction (and unlock audio elements)
        const startBgmOnInteraction = () => {
            // Unlock all audio elements for Safari/Chrome
            try {
                if (this.btnClick) {
                    this.btnClick.play().then(() => {
                        this.btnClick.pause();
                        this.btnClick.currentTime = 0;
                    }).catch(() => {});
                }
                if (this.answerSound) {
                    this.answerSound.play().then(() => {
                        this.answerSound.pause();
                        this.answerSound.currentTime = 0;
                    }).catch(() => {});
                }
            } catch (e) {
                console.warn("Lỗi mở khóa âm thanh:", e);
            }

            if (!this.isMuted && this.isQuizActive()) {
                this.playBgm();
            }
            document.removeEventListener('click', startBgmOnInteraction);
            document.removeEventListener('keydown', startBgmOnInteraction);
        };
        document.addEventListener('click', startBgmOnInteraction);
        document.addEventListener('keydown', startBgmOnInteraction);
    },

    isQuizActive() {
        if (!window.location.pathname.includes('trac-nghiem')) return false;
        
        const hollandFs = document.getElementById('visual-quiz-fullscreen');
        const mbtiFs = document.getElementById('mbti-quiz-fullscreen');
        const tipiFs = document.getElementById('quiz-questionnaire');
        
        return (hollandFs && hollandFs.style.display === 'flex') || 
               (mbtiFs && mbtiFs.style.display === 'flex') || 
               (tipiFs && tipiFs.style.display === 'block');
    },

    createVolumeWidget() {
        if (document.getElementById('sound-control-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'sound-control-widget';
        widget.className = 'sound-control-widget';
        
        // Add styling for hover expand
        const style = document.createElement('style');
        style.id = 'sound-widget-style';
        style.innerHTML = `
            .sound-control-widget {
                position: fixed;
                bottom: 95px;
                right: 30px;
                z-index: 100200;
                display: flex;
                align-items: center;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 30px;
                padding: 5px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 50px;
                height: 50px;
                box-sizing: border-box;
                overflow: hidden;
            }
            .sound-control-widget:hover, .sound-control-widget.expanded {
                max-width: 200px;
                padding-right: 15px;
            }
            .sound-widget-btn {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: none;
                background: transparent;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                outline: none;
                font-size: 1.1rem;
                flex-shrink: 0;
                transition: all 0.2s;
                padding: 0;
            }
            .sound-widget-btn:hover {
                transform: scale(1.1);
                color: #3b82f6;
            }
            .sound-volume-slider {
                width: 0;
                opacity: 0;
                transition: all 0.3s ease;
                cursor: pointer;
                height: 6px;
                border-radius: 3px;
                background: rgba(255, 255, 255, 0.2);
                outline: none;
                -webkit-appearance: none;
                margin: 0;
            }
            .sound-control-widget:hover .sound-volume-slider, .sound-control-widget.expanded .sound-volume-slider {
                width: 100px;
                opacity: 1;
                margin-left: 10px;
            }
            .sound-volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                transition: transform 0.1s;
            }
            .sound-volume-slider::-webkit-slider-thumb:hover {
                transform: scale(1.3);
            }
            @keyframes soundPulse {
                0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
            }
        `;
        document.head.appendChild(style);

        const btn = document.createElement('button');
        btn.id = 'btn-toggle-sound';
        btn.className = 'sound-widget-btn';
        
        btn.addEventListener('click', () => {
            this.toggleMute();
        });

        const slider = document.createElement('input');
        slider.id = 'sound-volume-slider';
        slider.type = 'range';
        slider.className = 'sound-volume-slider';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.05';
        slider.value = this.volume;

        slider.addEventListener('input', (e) => {
            this.updateVolume(e.target.value);
        });

        // Touch support for mobile to toggle expansion
        widget.addEventListener('touchstart', (e) => {
            if (e.target === btn || e.target.closest('button')) {
                // If button is tapped, let the click handler handle it, but toggle class
                widget.classList.toggle('expanded');
            } else {
                widget.classList.add('expanded');
            }
        });

        widget.appendChild(btn);
        widget.appendChild(slider);
        document.body.appendChild(widget);
    },

    updateVolume(value) {
        this.volume = parseFloat(value);
        try {
            localStorage.setItem('educareer_sound_volume', this.volume);
        } catch(e) {
            console.warn("Lưu localStorage bị chặn bởi bảo mật file://:", e);
        }
        
        this.isMuted = this.volume === 0;
        
        if (this.bgm) {
            this.bgm.volume = this.volume * 0.9; // Max BGM volume is 0.9
        }
        if (this.btnClick) {
            this.btnClick.volume = this.volume * 1.0; // Max click volume is 1.0
        }
        if (this.answerSound) {
            this.answerSound.volume = this.volume * 0.25; // Max answer volume is 0.25
        }

        this.updateUI();

        if (this.isMuted) {
            this.pauseBgm();
        } else {
            if (this.isQuizActive()) {
                this.playBgm();
            }
        }
    },

    updateUI() {
        const btn = document.getElementById('btn-toggle-sound');
        const slider = document.getElementById('sound-volume-slider');
        if (slider) {
            slider.value = this.volume;
        }

        if (!btn) return;
        const widget = document.getElementById('sound-control-widget');

        if (this.isMuted || this.volume === 0) {
            btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            btn.title = 'Bật âm thanh';
            if (widget) widget.style.animation = 'none';
        } else {
            if (widget) widget.style.animation = 'soundPulse 2s infinite';
            
            if (this.volume < 0.4) {
                btn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
                btn.title = 'Tắt âm thanh';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                btn.title = 'Tắt âm thanh';
            }
        }
    },

    toggleMute() {
        if (this.volume > 0) {
            this.prevVolume = this.volume;
            this.updateVolume(0);
        } else {
            this.updateVolume(this.prevVolume || 0.6);
        }
    },

    playBgm() {
        if (this.isMuted || !this.bgm) return;
        this.bgm.play().catch(e => {
            console.log("Autoplay blocked or audio load error:", e);
        });
    },

    pauseBgm() {
        if (this.bgm) {
            this.bgm.pause();
        }
    },

    stopBgm() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    },

    playClick() {
        if (this.isMuted || !this.btnClick) return;
        this.btnClick.currentTime = 0;
        this.btnClick.play().catch(e => {
            console.error("Lỗi phát âm thanh click:", e);
        });
    },

    playAnswer() {
        if (this.isMuted || !this.answerSound) return;
        this.answerSound.currentTime = 0;
        this.answerSound.play().then(() => {
            this.showToast("🔔 Tiếng Trả lời câu hỏi!");
        }).catch(e => {
            console.error("Lỗi phát âm thanh trả lời:", e);
            this.showToast("❌ Lỗi phát tiếng Trả lời: " + e.message, true);
        });
    },

    initClickListeners() {
        document.addEventListener('click', (e) => {
            if (this.isMuted) return;
            const clickable = e.target.closest('button, a, .btn, .test-card, .rpg-choice-btn, .rpg-emotion-btn, .rpg-save-exit-btn, .tab-btn, .mbti-choice-card, .tipi-val-btn');
            if (clickable) {
                const isAnswer = clickable.classList.contains('rpg-choice-btn') || 
                                 clickable.classList.contains('tipi-val-btn') || 
                                 clickable.id === 'rpg-btn-yes' || 
                                 clickable.id === 'rpg-btn-no' || 
                                 clickable.id === 'card-mbti-a' || 
                                 clickable.id === 'card-mbti-b' || 
                                 clickable.classList.contains('rpg-emotion-btn');
                if (!isAnswer) {
                    this.playClick();
                }
            }
        });
    }
};

window.SoundManager = SoundManager;
