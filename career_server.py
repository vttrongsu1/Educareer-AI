import os
import re
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="EduCareer Career Guide AI Generator Server")

# Configure CORS so static web pages can call this server on port 5001
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerationRequest(BaseModel):
    career_name: str

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

@app.get("/")
def index():
    return {"status": "ok", "app": "EduCareer Career Server (Port 5001)"}

@app.post("/api/generate-career-guide")
async def generate_career_guide(req: GenerationRequest):
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in .env file."
        )

    # 1. Read huongdan.md instructions
    huongdan_path = os.path.join("Data", "Nganh", "huongdan.md")
    if not os.path.exists(huongdan_path):
        raise HTTPException(
            status_code=500,
            detail="Data/Nganh/huongdan.md instructions file not found."
        )

    with open(huongdan_path, "r", encoding="utf-8") as f:
        instructions = f.read()

    career_name = req.career_name.strip()
    if not career_name:
        raise HTTPException(
            status_code=400,
            detail="career_name cannot be empty."
        )

    print(f"Triggering Gemini generation with Google Search for: {career_name}...")

    # 2. Call Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
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
        response = requests.post(url, headers=headers, json=payload, timeout=90)
        if response.status_code != 200:
            raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")
            
        res_data = response.json()
        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        
        # Làm sạch chuỗi JSON nếu Gemini trả về bọc trong ```json ... ```
        cleaned_text = raw_text.strip()
        if "```" in cleaned_text:
            start = cleaned_text.find("{")
            end = cleaned_text.rfind("}")
            if start != -1 and end != -1:
                cleaned_text = cleaned_text[start:end+1]
                
        # Parse JSON to verify validity
        parsed_json = json.loads(cleaned_text)
        
    except Exception as e:
        print(f"Lỗi khi gọi API Gemini: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi sinh dữ liệu cẩm nang từ Gemini: {str(e)}"
        )

    # 3. Save JS file to Data/Nganh/{slug}.js
    slug = slugify(career_name)
    js_content = f"window.CAREER_DATA_{slug} = {json.dumps(parsed_json, ensure_ascii=False, indent=2)};\n"
    
    output_dir = os.path.join("Data", "Nganh")
    os.makedirs(output_dir, exist_ok=True)
    js_file_path = os.path.join(output_dir, f"{slug}.js")
    
    with open(js_file_path, "w", encoding="utf-8") as out:
        out.write(js_content)
        
    print(f"Đã lưu tệp cẩm nang thành công tại: {js_file_path}")

    # 4. Update Data/Nganh/list.js
    list_path = os.path.join(output_dir, "list.js")
    if os.path.exists(list_path):
        with open(list_path, "r", encoding="utf-8") as f:
            list_content = f.read()
            
        list_match = re.search(r'window\.CAREER_LIST\s*=\s*\[(.*?)\]', list_content, re.DOTALL)
        if list_match:
            # Parse list elements
            current_list_str = list_match.group(1)
            # Remove whitespace and quotes
            majors = [m.strip().strip('"').strip("'") for m in current_list_str.split(",") if m.strip()]
            
            if slug not in majors:
                majors.append(slug)
                # Format list back
                new_list_str = "window.CAREER_LIST = [\n" + ",\n".join([f'  "{m}"' for m in majors]) + "\n];\n"
                with open(list_path, "w", encoding="utf-8") as out:
                    out.write(new_list_str)
                print(f"Đã thêm '{slug}' vào danh sách list.js.")
    else:
        # Create list.js if not found
        new_list_str = f'window.CAREER_LIST = [\n  "{slug}"\n];\n'
        with open(list_path, "w", encoding="utf-8") as out:
            out.write(new_list_str)
        print("Đã tạo mới file list.js.")

    return {
        "success": True,
        "slug": slug,
        "data": parsed_json
    }
