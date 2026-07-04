import os
import re
import json
import requests

# 1. Đọc cấu hình Supabase từ supabase-config.js
config_path = "supabase-config.js"
if not os.path.exists(config_path):
    print("Không tìm thấy file supabase-config.js!")
    exit(1)

with open(config_path, "r", encoding="utf-8") as f:
    config_content = f.read()

url_match = re.search(r'window\.SUPABASE_URL\s*=\s*"([^"]+)"', config_content)
key_match = re.search(r'window\.SUPABASE_ANON_KEY\s*=\s*"([^"]+)"', config_content)

if not url_match or not key_match:
    print("Không thể phân tích URL hoặc Anon Key trong supabase-config.js!")
    exit(1)

SUPABASE_URL = url_match.group(1)
SUPABASE_ANON_KEY = key_match.group(1)

if "DÁN_PROJECT_URL" in SUPABASE_URL or "DÁN_ANON_KEY" in SUPABASE_ANON_KEY:
    print("Vui lòng cấu hình URL và Anon Key thực tế vào file supabase-config.js trước!")
    exit(1)

print(f"Cấu hình kết nối thành công:")
print(f" - URL: {SUPABASE_URL}")
print(f" - Anon Key: {SUPABASE_ANON_KEY[:15]}...")

# 2. Đọc danh mục ngành từ Data/Nganh/list.js
list_path = os.path.join("Data", "Nganh", "list.js")
if not os.path.exists(list_path):
    print("Không tìm thấy file Data/Nganh/list.js!")
    exit(1)

with open(list_path, "r", encoding="utf-8") as f:
    list_content = f.read()

# Tìm mảng window.CAREER_LIST
list_match = re.search(r'window\.CAREER_LIST\s*=\s*\[(.*?)\]', list_content, re.DOTALL)
if not list_match:
    print("Không tìm thấy danh sách window.CAREER_LIST trong list.js!")
    exit(1)

# Trích xuất các tên ngành
majors = [m.strip().strip('"').strip("'") for m in list_match.group(1).split(",") if m.strip()]
print(f"Tìm thấy các ngành học cục bộ trong list.js: {majors}")

# 3. Quét từng tệp dữ liệu ngành và đẩy lên Supabase
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # Tương đương upsert (nếu trùng id thì cập nhật đè)
}

supabase_endpoint = f"{SUPABASE_URL}/rest/v1/careers"

for major in majors:
    file_path = os.path.join("Data", "Nganh", f"{major}.js")
    if not os.path.exists(file_path):
        print(f"Cảnh báo: Không tìm thấy file dữ liệu cho {major} tại {file_path}")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        file_content = f.read()
        
    # Trích xuất JSON từ tệp JS
    json_match = re.search(r'window\.CAREER_DATA_[a-zA-Z0-9_]+\s*=\s*(\{.*\});', file_content, re.DOTALL)
    if not json_match:
        print(f"Lỗi: Không thể trích xuất JSON từ file {file_path}")
        continue
        
    try:
        parsed_json = json.loads(json_match.group(1))
    except Exception as e:
        print(f"Lỗi phân tích JSON cho {major}: {e}")
        continue
        
    # Phân nhóm ngành tương ứng với giao diện
    category = "tech"
    lower_m = major.lower()
    if any(k in lower_m for k in ["marketing", "kinh_te", "biz", "quan_tri", "logistics"]):
        category = "biz"
    elif any(k in lower_m for k in ["thiet_ke", "art", "do_hoa"]):
        category = "art"
        
    desc = ""
    tong_quan = parsed_json.get("chung", {}).get("1_tong_quan")
    if tong_quan:
        desc = tong_quan.get("mo_ta", "")
        if len(desc) > 160:
            desc = desc[:160] + "..."

    # Tạo dòng dữ liệu
    row_data = {
        "id": major,
        "title": parsed_json.get("ten_nganh", major),
        "category": category,
        "desc": desc,
        "data": parsed_json
    }
    
    print(f"Đang đồng bộ ngành: {row_data['title']} ({major})...")
    
    try:
        response = requests.post(supabase_endpoint, headers=headers, json=row_data)
        if response.status_code in [200, 201]:
            print(f" -> Đồng bộ thành công {major}!")
        else:
            print(f" -> Lỗi khi đồng bộ {major}: {response.status_code} - {response.text}")
    except Exception as err:
        print(f" -> Lỗi kết nối HTTP khi đồng bộ {major}: {err}")

print("\n=== QUÁ TRÌNH ĐỒNG BỘ HOÀN TẤT ===")
