const GAME_CNTT_DATA = {
    screen1: {
        tasks: [
            "kiem tra loi dang nhap",
            "sua nut bat dau",
            "cap nhat diem hoc sinh",
            "kiem tra du lieu bi thieu",
            "sua loi hien thi ket qua",
            "luu ket qua hoc sinh",
            "ket noi chatbot tu van",
            "loc nganh phu hop",
            "neu toan cao va thich cong nghe",
            "he thong can giai thich ket qua",
            "kiem tra nut gui du lieu",
            "sua loi goi y nganh",
            "hien thi ban do nang luc",
            "bao cao loi cho nhom",
            "chay thu tinh nang moi"
        ],
        timeLimit: 60, // seconds
    },
    screen2: {
        rounds: [
            {
                template: "Nếu [DROP1] cao và [DROP2] cao thì học sinh có nền tảng tốt cho [DROP3]",
                correctAnswers: ["Toán", "Tin học", "Công nghệ thông tin"],
                distractors: ["Màu yêu thích", "Tên học sinh", "Ảnh đại diện"]
            },
            {
                template: "Để [DROP1] hiệu quả, cần [DROP2] đúng và [DROP3] hợp lý",
                correctAnswers: ["Giải quyết lỗi", "Tìm nguyên nhân", "Thử nghiệm"],
                distractors: ["Đổi màu nền", "Nghe nhạc", "Tăng âm lượng"]
            },
            {
                template: "Hệ thống [DROP1] khi [DROP2] quá lớn và cần [DROP3]",
                correctAnswers: ["Bị chậm", "Lượng truy cập", "Tối ưu hóa"],
                distractors: ["Đẹp hơn", "Ít người dùng", "Thêm hình ảnh"]
            }
        ]
    },
    screen3: {
        timeLimit: 60, // seconds
        tasks: [
            { id: 1, text: "Nút gợi ý lỗi", category: "fix-now" },
            { id: 2, text: "Sai kết quả ngành", category: "fix-now" },
            { id: 3, text: "Thiếu điểm Tin", category: "fix-now" },
            { id: 4, text: "Không có lý do", category: "fix-now" },
            { id: 5, text: "Đổi màu nút", category: "fix-later" },
            { id: 6, text: "Logo hơi nhỏ", category: "fix-later" },
            { id: 7, text: "Thêm nhạc nền", category: "ignore" },
            { id: 8, text: "Pháo hoa mở web", category: "ignore" }
        ]
    }
};
