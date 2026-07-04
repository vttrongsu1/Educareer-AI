// CẤU HÌNH SUPABASE CHO EDUCAREER AI
// Cấu hình kết nối trực tiếp tới cơ sở dữ liệu đám mây Supabase của bạn.

window.SUPABASE_URL = "https://cvlxmxfvqjahetibtrdg.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_Y11Yd_53mL_9jbGQDSLzBQ_z5ZNM-fP";

// Hàm hỗ trợ khởi tạo và kiểm tra kết nối Supabase
function getSupabaseClient() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || 
        window.SUPABASE_URL.includes("DÁN_PROJECT_URL") || 
        window.SUPABASE_ANON_KEY.includes("DÁN_ANON_KEY")) {
        console.warn("Supabase chưa được cấu hình. Hệ thống sẽ tự động sử dụng LocalStorage làm bộ nhớ dự phòng.");
        return null;
    }
    
    try {
        if (typeof supabase !== 'undefined') {
            return supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error("Lỗi khi kết nối với thư viện Supabase client:", e);
    }
    return null;
}
