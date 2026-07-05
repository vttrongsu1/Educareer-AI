import sys
import requests

def run_tests():
    print("=== BẮT ĐẦU CHẠY THỬ NGHIỆM TỰ ĐỘNG ENDPOINTS ===")
    base_url = "http://127.0.0.1:5001"
    
    # 1. Test Health Check Endpoint
    print("\n[Test 1] Kiểm tra trạng thái máy chủ (Health Check)...")
    try:
        res = requests.get(f"{base_url}/", timeout=5)
        if res.status_code == 200:
            print(" -> PASS: Máy chủ đang hoạt động trực tuyến.")
            print(f" -> Kết quả trả về: {res.json()}")
        else:
            print(f" -> FAIL: Máy chủ trả về lỗi status {res.status_code}")
    except requests.exceptions.ConnectionError:
        print(" -> FAIL: Không thể kết nối tới máy chủ. Vui lòng đảm bảo bạn đã khởi chạy Backend bằng lệnh: python career_server.py")
        sys.exit(1)
        
    # 2. Test Career Guide Generator API
    print("\n[Test 2] Kiểm tra API sinh cẩm nang hướng nghiệp ảo (Gemini API)...")
    payload = {"career_name": "Kiểm toán"}
    try:
        res = requests.post(f"{base_url}/api/generate-career-guide", json=payload, timeout=20)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                print(" -> PASS: Đã sinh cẩm nang cho ngành 'Kiểm toán' thành công!")
                print(f" -> Slug ngành: {data.get('slug')}")
            else:
                print(" -> FAIL: Dữ liệu trả về không khớp định dạng mong muốn.")
        else:
            print(f" -> FAIL: API trả về lỗi status {res.status_code}")
            print(f" -> Chi tiết lỗi: {res.text}")
    except Exception as e:
        print(f" -> FAIL: Gặp lỗi trong quá trình kết nối API: {e}")

    print("\n=== HOÀN THÀNH TIẾN TRÌNH KIỂM THỬ TỰ ĐỘNG ===")

if __name__ == "__main__":
    run_tests()
