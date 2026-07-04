import os
import re
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def slugify(text: str) -> str:
    # Remove tone accents in Vietnamese
    s1 = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', text.lower())
    s1 = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', s1)
    s1 = re.sub(r'[ìíịỉĩ]', 'i', s1)
    s1 = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', s1)
    s1 = re.sub(r'[ùúụủũưừứựửữ]', 'u', s1)
    s1 = re.sub(r'[ỳýỵỷỹ]', 'y', s1)
    s1 = re.sub(r'[đ]', 'd', s1)
    # Remove special chars and spaces
    s1 = re.sub(r'[^\w\s-]', '', s1)
    s1 = s1.strip().replace(' ', '_')
    s1 = re.sub(r'_+', '_', s1)
    return s1

def main():
    print("==================================================")
    print("=== TRÌNH TỰ ĐỘNG TẠO CẨM NĂNG & ĐỒNG BỘ CLOUD ===")
    print("==================================================")

    # 1. Đọc khóa API Gemini từ .env
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if not GEMINI_API_KEY:
        print("Lỗi: Chưa cấu hình GEMINI_API_KEY trong file .env!")
        return

    # 2. Đọc cấu hình Supabase từ supabase-config.js
    config_path = "supabase-config.js"
    if not os.path.exists(config_path):
        print("Lỗi: Không tìm thấy file supabase-config.js!")
        return

    with open(config_path, "r", encoding="utf-8") as f:
        config_content = f.read()

    url_match = re.search(r'window\.SUPABASE_URL\s*=\s*"([^"]+)"', config_content)
    key_match = re.search(r'window\.SUPABASE_ANON_KEY\s*=\s*"([^"]+)"', config_content)

    if not url_match or not key_match:
        print("Lỗi: Không thể phân tích URL hoặc Anon Key trong supabase-config.js!")
        return

    SUPABASE_URL = url_match.group(1)
    SUPABASE_ANON_KEY = key_match.group(1)

    if "DÁN_PROJECT_URL" in SUPABASE_URL or "DÁN_ANON_KEY" in SUPABASE_ANON_KEY:
        print("Lỗi: Vui lòng cấu hình URL và Anon Key thực tế vào file supabase-config.js trước!")
        return

    # 3. Yêu cầu người dùng nhập tên ngành
    career_name = input("\nNhập tên ngành học muốn tạo (Ví dụ: Thiết kế đồ họa và Đa phương tiện): ").strip()
    if not career_name:
        print("Lỗi: Tên ngành không được để trống!")
        return

    slug = slugify(career_name)
    print(f"\n -> Tên tệp lưu trữ sẽ là: {slug}.js")

    # 4. Đọc hướng dẫn định dạng từ Data/Nganh/huongdan.md
    huongdan_path = os.path.join("Data", "Nganh", "huongdan.md")
    if not os.path.exists(huongdan_path):
        print("Lỗi: Không tìm thấy file hướng dẫn Data/Nganh/huongdan.md!")
        return

    with open(huongdan_path, "r", encoding="utf-8") as f:
        instructions = f.read()

    print("\nĐang gọi Gemini AI + Google Search để tra cứu dữ liệu tuyển sinh thật (đang chạy, vui lòng đợi 10-20 giây)...")

    # 5. Gọi API Gemini
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
Hãy tạo cẩm nang hướng nghiệp bằng tiếng Việt dưới định dạng JSON cho ngành học/nghề nghiệp sau: {career_name}
Chú ý: Bạn BẮT BUỘC phải sử dụng công cụ Google Search (Grounding) để tìm kiếm các thông tin tuyển sinh thật (điểm chuẩn năm 2024/2025 mới nhất, học phí, các trường đại học tại 3 miền Bắc, Trung, Nam) của Việt Nam và chèn link tuyển sinh thật đang hoạt động.
Không dùng liên kết giả lập placeholder.
"""

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {
                    "text": f"Bạn là chuyên gia hướng nghiệp tại Việt Nam. Hãy thực hiện đúng và đầy đủ các chỉ dẫn cấu trúc JSON và nội dung được quy định tại đây:\n\n{instructions}"
                }
            ]
        },
        "tools": [
            {
                "googleSearch": {}
            }
        ],
        "generationConfig": {
            # Bỏ responseMimeType vì Gemini không hỗ trợ đồng thời cùng Google Search Tool
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(gemini_url, headers=headers, json=payload, timeout=90)
        if response.status_code != 200:
            print(f"Lỗi gọi API Gemini (HTTP {response.status_code}): {response.text}")
            return
            
        res_data = response.json()
        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        
        # Làm sạch chuỗi JSON nếu Gemini trả về bọc trong ```json ... ```
        cleaned_text = raw_text.strip()
        if "```" in cleaned_text:
            start = cleaned_text.find("{")
            end = cleaned_text.rfind("}")
            if start != -1 and end != -1:
                cleaned_text = cleaned_text[start:end+1]
                
        parsed_json = json.loads(cleaned_text)
        print(" -> Nhận dữ liệu từ Gemini thành công!")
        
    except Exception as e:
        print(f"Lỗi xử lý API Gemini: {e}")
        return

    # 6. Lưu tệp JS cục bộ
    js_content = f"window.CAREER_DATA_{slug} = {json.dumps(parsed_json, ensure_ascii=False, indent=2)};\n"
    output_dir = os.path.join("Data", "Nganh")
    os.makedirs(output_dir, exist_ok=True)
    js_file_path = os.path.join(output_dir, f"{slug}.js")
    
    with open(js_file_path, "w", encoding="utf-8") as out:
        out.write(js_content)
    print(f" -> Đã lưu tệp cục bộ thành công: {js_file_path}")

    # 7. Cập nhật list.js cục bộ
    list_path = os.path.join(output_dir, "list.js")
    if os.path.exists(list_path):
        with open(list_path, "r", encoding="utf-8") as f:
            list_content = f.read()
            
        list_match = re.search(r'window\.CAREER_LIST\s*=\s*\[(.*?)\]', list_content, re.DOTALL)
        if list_match:
            current_list_str = list_match.group(1)
            majors = [m.strip().strip('"').strip("'") for m in current_list_str.split(",") if m.strip()]
            
            if slug not in majors:
                majors.append(slug)
                new_list_str = "window.CAREER_LIST = [\n" + ",\n".join([f'  "{m}"' for m in majors]) + "\n];\n"
                with open(list_path, "w", encoding="utf-8") as out:
                    out.write(new_list_str)
                print(f" -> Đã cập nhật '{slug}' vào list.js.")
    else:
        new_list_str = f'window.CAREER_LIST = [\n  "{slug}"\n];\n'
        with open(list_path, "w", encoding="utf-8") as out:
            out.write(new_list_str)
        print(" -> Đã tạo mới file list.js.")

    # 8. Đồng bộ trực tiếp lên cơ sở dữ liệu Supabase
    print("\nĐang bắt đầu tải dữ liệu trực tiếp lên đám mây Supabase...")
    category = "tech"
    lower_m = slug.lower()
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

    row_data = {
        "id": slug,
        "title": parsed_json.get("ten_nganh", career_name),
        "category": category,
        "desc": desc,
        "data": parsed_json
    }

    supabase_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    supabase_endpoint = f"{SUPABASE_URL}/rest/v1/careers"

    try:
        response = requests.post(supabase_endpoint, headers=supabase_headers, json=row_data)
        if response.status_code in [200, 201]:
            print(f" -> Đồng bộ thành công {slug} lên Supabase!")
            print(f"\n🎉 HOÀN THÀNH XUẤT SẮC! Ngành '{row_data['title']}' đã có sẵn trực tuyến.")
        else:
            print(f" -> Lỗi khi đồng bộ lên Supabase: {response.status_code} - {response.text}")
    except Exception as err:
        print(f" -> Lỗi kết nối mạng khi gửi dữ liệu lên Supabase: {err}")

if __name__ == "__main__":
    main()
