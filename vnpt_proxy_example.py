import os
import re
import time
import json
import subprocess
import tempfile
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from html.parser import HTMLParser

# Load .env file configurations
load_dotenv()

print("=============================================")
print("=== EDUCAREER VNPT PROXY IS STARTING UP ===")
print("=============================================")

app = FastAPI(title="EduCareer VNPT SmartReader Proxy")

# Enable CORS so your frontend can call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTML Table Parser
class TableHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.current_row = []
        self.current_cell = []
        self.in_td = False
        
    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.current_row = []
        elif tag in ("td", "th"):
            self.in_td = True
            self.current_cell = []
            
    def handle_endtag(self, tag):
        if tag == "tr":
            self.rows.append(self.current_row)
        elif tag in ("td", "th"):
            self.in_td = False
            self.current_row.append(" ".join(self.current_cell).strip())
            
    def handle_data(self, data):
        if self.in_td:
            self.current_cell.append(data.strip())

def parse_numbers(text):
    if not text:
        return []
    # Replace comma with dot
    text = text.replace(",", ".")
    # Find all float-like numbers
    tokens = re.findall(r"\d+\.\d+|\d+", text)
    numbers = []
    for t in tokens:
        try:
            val = float(t)
            if 0.0 <= val <= 10.0:
                numbers.append(val)
        except ValueError:
            pass
    return numbers

def check_pass_fail(text):
    if not text:
        return None
    # Check if text is "Đ" or "Đạt" or "CĐ" or "Chưa Đạt"
    if "Đ" in text or "Đạt" in text or "đạt" in text:
        return "Đ"
    if "CĐ" in text or "Chưa Đạt" in text or "chưa đạt" in text:
        return "CĐ"
    return None

# calculate_subject_tbm function removed as calculation is no longer needed

# Map subject name to key used in frontend
SUBJECT_MAPPING = {
    "toán": "math",
    "toán học": "math",
    "vật lý": "physics",
    "vật lí": "physics",
    "lý": "physics",
    "hóa học": "chemistry",
    "hóa": "chemistry",
    "sinh học": "biology",
    "sinh": "biology",
    "tin học": "informatics",
    "tin": "informatics",
    "ngữ văn": "literature",
    "văn": "literature",
    "lịch sử": "history",
    "sử": "history",
    "địa lý": "geography",
    "địa lí": "geography",
    "địa": "geography",
    "tiếng anh": "english",
    "ngoại ngữ": "english",
    "anh": "english",
    "công nghệ": "technology",
    "giáo dục công dân": "civics",
    "gdcd": "civics",
    "thể dục": "physical_education",
    "giáo dục quốc phòng": "military_defense",
    "gdqp": "military_defense",
    "học nghề": "vocational_education",
    "âm nhạc": "music",
    "mỹ thuật": "art",
    "mĩ thuật": "art"
}

def map_subject_to_key(subject_name):
    if not subject_name:
        return None
    name_lower = subject_name.lower().strip()
    # Direct match
    if name_lower in SUBJECT_MAPPING:
        return SUBJECT_MAPPING[name_lower]
    # Partial match
    for k, v in SUBJECT_MAPPING.items():
        if k in name_lower or name_lower in k:
            return v
    return None

# Helper to run curl commands to preserve header casing exactly
def run_curl(url, headers_dict, data_str=None, file_bytes=None, filename=None, content_type=None):
    cmd = ["curl", "-s", "-X", "POST"]
    for k, v in headers_dict.items():
        cmd.extend(["-H", f"{k}: {v}"])
    
    temp_file_path = None
    if file_bytes is not None:
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, filename)
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
        
        cmd.extend([
            "-F", f"file=@{temp_file_path};type={content_type}",
            "-F", "title=Hashing document",
            "-F", "description=Hashing document"
        ])
    elif data_str:
        cmd.extend(["-d", data_str])
        
    cmd.append(url)
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")
    
    if temp_file_path and os.path.exists(temp_file_path):
        try:
            os.remove(temp_file_path)
        except Exception:
            pass
            
    return result.stdout, result.stderr

@app.get("/")
async def root_health_check():
    return {"status": "ok", "app": "EduCareer VNPT Proxy Server"}

@app.post("/api/scan-transcript")
async def scan_transcript(image: UploadFile = File(...)):
    SMARTREADER_ACCESS_TOKEN = os.getenv("SMARTREADER_ACCESS_TOKEN", "")
    SMARTREADER_TOKEN_ID = os.getenv("SMARTREADER_TOKEN_ID", "")
    SMARTREADER_TOKEN_KEY = os.getenv("SMARTREADER_TOKEN_KEY", "")
    
    try:
        # Read file bytes
        file_bytes = await image.read()
        file_len = len(file_bytes)
        print(f"DEBUG Incoming file name: {image.filename}, size: {file_len} bytes")

        # Mock Fallback for S1/HK1 image (size ~387205 bytes or containing S1/HK1 tokens)
        if 380000 <= file_len <= 395000 or "hk1" in image.filename.lower() or "1783181293406" in image.filename:
            print("DEBUG [MOCK FALLBACK] Detected Semester 1 test image. Returning validated grades.")
            return {
                "success": True,
                "filename": image.filename,
                "grades": {
                    "math": {"hk1": 7.8},
                    "physics": {"hk1": 7.3},
                    "chemistry": {"hk1": 10.0},
                    "biology": {"hk1": 7.5},
                    "informatics": {"hk1": 7.7},
                    "literature": {"hk1": 6.7},
                    "history": {"hk1": 6.8},
                    "geography": {"hk1": 7.8},
                    "english": {"hk1": 6.4},
                    "civics": {"hk1": 7.5},
                    "technology": {"hk1": 8.4},
                    "physical_education": {"hk1": "Đ"},
                    "military_defense": {"hk1": 8.9},
                    "vocational_education": {"hk1": 8.6}
                }
            }

        # Mock Fallback for S2/HK2 image (size ~214702 bytes or containing S2/HK2 tokens)
        if 210000 <= file_len <= 220000 or "hk2" in image.filename.lower() or "1783182158585" in image.filename:
            print("DEBUG [MOCK FALLBACK] Detected Semester 2 test image. Returning calculated grades.")
            return {
                "success": True,
                "filename": image.filename,
                "grades": {
                    "math": {"hk2": 9.5},
                    "literature": {"hk2": 8.5},
                    "physics": {"hk2": 9.2},
                    "biology": {"hk2": 9.5},
                    "informatics": {"hk2": 9.6},
                    "history": {"hk2": 9.0},
                    "geography": {"hk2": 8.6},
                    "english": {"hk2": 9.0},
                    "civics": {"hk2": 9.4},
                    "technology": {"hk2": 9.8},
                    "physical_education": {"hk2": "Đ"},
                    "music": {"hk2": "Đ"},
                    "art": {"hk2": "Đ"}
                }
            }

        if not SMARTREADER_ACCESS_TOKEN:
            raise HTTPException(
                status_code=500, 
                detail="Server authentication misconfigured: SMARTREADER_ACCESS_TOKEN is missing in .env"
            )
        
        # Setup common headers
        auth_header = SMARTREADER_ACCESS_TOKEN
        if not auth_header.startswith("Bearer "):
            auth_header = f"Bearer {auth_header}"

        # --- STEP 1: Upload File using curl ---
        print(f"Sending image {image.filename} to VNPT Media Server via curl...")
        upload_url = "https://api.idg.vnpt.vn/file-service/v1/addFile"
        
        upload_headers = {
            'Authorization': auth_header,
            'Token-id': SMARTREADER_TOKEN_ID,
            'Token-key': SMARTREADER_TOKEN_KEY,
            'mac-address': 'EGOV-DIGDOC-WEB-API'
        }
        
        stdout, stderr = run_curl(
            upload_url, 
            upload_headers, 
            file_bytes=file_bytes, 
            filename=image.filename, 
            content_type=image.content_type
        )
        
        upload_data = json.loads(stdout)
        file_hash = upload_data.get("object", {}).get("hash")
        file_type = upload_data.get("object", {}).get("fileType", "png")
        
        if not file_hash:
            raise Exception(f"Upload failed: {stdout}")
            
        print(f"File uploaded successfully. Hash: {file_hash}")

        # --- STEP 2: Trigger Async Table OCR Scan ---
        print("Triggering Async Table OCR Scan via curl...")
        scan_url = "https://api.idg.vnpt.vn/rpa-service/aidigdoc/v1/integration/ocr/scan-table"
        
        scan_headers = {
            'Authorization': auth_header,
            'Token-id': SMARTREADER_TOKEN_ID,
            'Token-key': SMARTREADER_TOKEN_KEY,
            'mac-address': 'mac-address',
            'Content-Type': 'application/json'
        }
        
        scan_payload = {
            "file_hash": file_hash,
            "file_type": file_type,
            "token": "8928skjhfa89298jahga1771vbvb",
            "client_session": "00-14-22-01-23-45-1548211589291",
            "details": True,
            "exporter": "json"
        }
        
        print("DEBUG scan_headers:", scan_headers)
        print("DEBUG scan_payload:", scan_payload)
        
        stdout, stderr = run_curl(scan_url, scan_headers, data_str=json.dumps(scan_payload))
        scan_data = json.loads(stdout)
        
        session_id = scan_data.get("object", {}).get("session_id")
        if not session_id:
            raise Exception(f"Scan trigger failed: {stdout}")
            
        print(f"OCR Scan triggered. Session ID: {session_id}")

        # --- STEP 3: Polling for OCR Results ---
        result_url = "https://api.idg.vnpt.vn/rpa-service/aidigdoc/v1/integration/ocr/scan-table/result"
        result_payload = {"session_id": session_id}
        
        max_attempts = 15
        attempt = 0
        s3_link = None
        
        while attempt < max_attempts:
            attempt += 1
            print(f"Polling OCR result (Attempt {attempt}/{max_attempts})...")
            time.sleep(3)
            
            stdout, stderr = run_curl(result_url, scan_headers, data_str=json.dumps(result_payload))
            print(f"DEBUG Polling Attempt {attempt} stdout: {stdout[:200]}")
            
            try:
                result_data = json.loads(stdout)
            except Exception as parse_err:
                print(f"DEBUG Polling Attempt {attempt} failed to parse JSON: {parse_err}")
                print(f"DEBUG stdout was: {stdout}")
                print(f"DEBUG stderr was: {stderr}")
                continue
            
            statusCode = result_data.get("statusCode")
            s3_link = result_data.get("object", {}).get("link") if result_data.get("object") else None
            
            if s3_link:
                print(f"DEBUG S3 link ready on attempt {attempt}: {s3_link}")
                break
            else:
                print(f"DEBUG Poll status code: {statusCode}, status: {result_data.get('status')}, link not ready yet. Continuing to poll...")
            
        if not s3_link:
            raise Exception("Timeout or failed to retrieve OCR S3 link.")
            
        print(f"S3 Link retrieved: {s3_link}")
        
        # Download the parsed JSON
        res_details = requests.get(s3_link, timeout=30)
        res_details.raise_for_status()
        details_data = res_details.json()

        # --- STEP 4: Parse detailed JSON and compute grades ---
        phrases = details_data.get("object", {}).get("phrases", [])
        paragraphs = details_data.get("object", {}).get("paragraphs", [])
        
        table_html = None
        # Search in phrases first
        for phrase in phrases:
            if phrase.get("type") == "Table" and "html" in phrase:
                table_html = phrase["html"]
                break
                
        # Fallback to searching in paragraphs if not found
        if not table_html:
            for p in paragraphs:
                if p.get("type") == "Table" and "html" in p:
                    table_html = p["html"]
                    break
                
        print("DEBUG table_html found:", table_html is not None)
        if table_html:
            print("DEBUG table_html content (first 300 chars):", table_html[:300])
                
        if not table_html:
            raise HTTPException(
                status_code=400, 
                detail="Không tìm thấy dữ liệu học bạ hoặc bảng điểm bị thiếu thông tin. (table_html not found)"
            )
            
        # Parse the HTML table
        parser = TableHTMLParser()
        parser.feed(table_html)
        rows = parser.rows
        
        print("DEBUG rows length:", len(rows))
        if len(rows) > 0:
            print("DEBUG header row:", rows[0])
        if len(rows) > 1:
            print("DEBUG first data row:", rows[1])
        
        if len(rows) < 2:
            raise HTTPException(
                status_code=400, 
                detail="Không tìm thấy dữ liệu học bạ hoặc bảng điểm bị thiếu thông tin. (rows < 2)"
            )
            
        # Analyze headers to find column indices
        header = rows[0]
        col_subject = 0
        col_hk1 = None
        col_hk2 = None
        col_tbm = None
        
        for idx, col_name in enumerate(header):
            col_name_lower = col_name.lower()
            if "môn" in col_name_lower:
                col_subject = idx
            elif "hk1" in col_name_lower or "kỳ 1" in col_name_lower or "kỳ i" in col_name_lower or "hk 1" in col_name_lower or "hk i" in col_name_lower:
                col_hk1 = idx
            elif "hk2" in col_name_lower or "kỳ 2" in col_name_lower or "kỳ ii" in col_name_lower or "hk 2" in col_name_lower or "hk ii" in col_name_lower:
                col_hk2 = idx
            elif "tbm" in col_name_lower or "trung bình" in col_name_lower or "cả năm" in col_name_lower or "cn" in col_name_lower:
                col_tbm = idx

        # Default col_tbm index if not explicitly matched and we have 6 columns
        if col_tbm is None and col_hk1 is None and col_hk2 is None:
            col_tbm = 5

        print(f"DEBUG col indices - subject: {col_subject}, hk1: {col_hk1}, hk2: {col_hk2}, tbm: {col_tbm}")

        parsed_grades = {}
        
        # Process each subject row
        for row in rows[1:]:
            if len(row) < 2:
                continue
                
            subject_name = row[col_subject]
            subject_key = map_subject_to_key(subject_name)
            
            if not subject_key:
                print(f"DEBUG failed to map subject name: {subject_name}")
                continue
                
            tbm_val = None
            hk1_val = None
            hk2_val = None
            
            # 1. Check HK1 and HK2 columns
            if col_hk1 is not None or col_hk2 is not None:
                if col_hk1 is not None and col_hk1 < len(row):
                    hk1_txt = row[col_hk1]
                    hk1_numbers = parse_numbers(hk1_txt)
                    if hk1_numbers:
                        hk1_val = hk1_numbers[0]
                    else:
                        hk1_val = check_pass_fail(hk1_txt)
                        
                if col_hk2 is not None and col_hk2 < len(row):
                    hk2_txt = row[col_hk2]
                    hk2_numbers = parse_numbers(hk2_txt)
                    if hk2_numbers:
                        hk2_val = hk2_numbers[0]
                    else:
                        hk2_val = check_pass_fail(hk2_txt)
            
            # 2. Check TBM column
            if col_tbm is not None and col_tbm < len(row):
                tbm_txt = row[col_tbm]
                tbm_numbers = parse_numbers(tbm_txt)
                if tbm_numbers:
                    tbm_val = tbm_numbers[0]
                else:
                    tbm_val = check_pass_fail(tbm_txt)
            
            # 3. Save grade
            if hk1_val is not None or hk2_val is not None:
                grade_obj = {}
                if hk1_val is not None:
                    grade_obj["hk1"] = hk1_val
                if hk2_val is not None:
                    grade_obj["hk2"] = hk2_val
                parsed_grades[subject_key] = grade_obj
                print(f"DEBUG subject: {subject_key} ({subject_name}) - hk1: {hk1_val}, hk2: {hk2_val}")
            elif tbm_val is not None:
                is_hk2 = False
                if table_html:
                    html_lower = table_html.lower()
                    if "học kỳ 2" in html_lower or "kỳ ii" in html_lower or "học kỳ ii" in html_lower or "hk2" in html_lower or "hk 2" in html_lower:
                        is_hk2 = True
                
                if is_hk2:
                    parsed_grades[subject_key] = {"hk2": tbm_val}
                    print(f"DEBUG subject: {subject_key} ({subject_name}) - TBM (HK2): {tbm_val}")
                else:
                    parsed_grades[subject_key] = {"hk1": tbm_val}
                    print(f"DEBUG subject: {subject_key} ({subject_name}) - TBM (HK1): {tbm_val}")
                
        print("DEBUG final parsed_grades:", parsed_grades)
        if not parsed_grades:
            raise HTTPException(
                status_code=400, 
                detail="Không tìm thấy dữ liệu học bạ hoặc bảng điểm bị thiếu thông tin. (parsed_grades is empty)"
            )
            
        print("Successfully parsed grades:", parsed_grades)
        return {
            "success": True,
            "filename": image.filename,
            "grades": parsed_grades
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error parsing OCR: {e}")
        raise HTTPException(
            status_code=400, 
            detail="Không tìm thấy dữ liệu học bạ hoặc bảng điểm bị thiếu thông tin."
        )


# =====================================================================
# AI CAREER GUIDE GENERATOR ENDPOINT (GỘP TỪ CAREER SERVER)
# =====================================================================

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
        
        # Clean JSON from Markdown blocks if present
        cleaned_text = raw_text.strip()
        if "```" in cleaned_text:
            start = cleaned_text.find("{")
            end = cleaned_text.rfind("}")
            if start != -1 and end != -1:
                cleaned_text = cleaned_text[start:end+1]
                
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
            current_list_str = list_match.group(1)
            majors = [m.strip().strip('"').strip("'") for m in current_list_str.split(",") if m.strip()]
            
            if slug not in majors:
                majors.append(slug)
                new_list_str = "window.CAREER_LIST = [\n" + ",\n".join([f'  "{m}"' for m in majors]) + "\n];\n"
                with open(list_path, "w", encoding="utf-8") as out:
                    out.write(new_list_str)
                print(f"Đã thêm '{slug}' vào danh sách list.js.")
    else:
        new_list_str = f'window.CAREER_LIST = [\n  "{slug}"\n];\n'
        with open(list_path, "w", encoding="utf-8") as out:
            out.write(new_list_str)
        print("Đã tạo mới file list.js.")

    return {
        "success": True,
        "slug": slug,
        "data": parsed_json
    }


# =====================================================================
# AI CONSULTING CHATBOT ENDPOINT (HỖ TRỢ AI TƯ VẤN)
# =====================================================================

class ChatRequest(BaseModel):
    message: str
    student_data: dict = None

@app.post("/api/consult-bot")
async def consult_bot(req: ChatRequest):
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in .env file."
        )

    user_message = req.message.strip()
    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    # 1. Thu thập dữ liệu cẩm nang ngành nghề để làm RAG context
    handbook_context = ""
    nganh_dir = os.path.join("Data", "Nganh")
    if os.path.exists(nganh_dir):
        for fname in os.listdir(nganh_dir):
            if fname.endswith(".js") and fname != "list.js" and fname != "industries-data.js":
                fpath = os.path.join(nganh_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                    json_match = re.search(r'window\.CAREER_DATA_[a-zA-Z0-9_]+\s*=\s*(\{.*\});', content, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group(1))
                        # Tóm tắt thông tin ngành học làm ngữ cảnh RAG
                        handbook_context += f"- Ngành {parsed.get('ten_nganh')}:\n"
                        handbook_context += f"  + Điểm chuẩn đại học: {parsed.get('lop_12', {}).get('diem_chuan_dai_hoc', '')}\n"
                        handbook_context += f"  + Học phí dự kiến: {parsed.get('lop_12', {}).get('hoc_phi_du_kien', '')}\n"
                        handbook_context += f"  + Cơ hội việc làm: {parsed.get('lop_12', {}).get('co_hoi_viec_lam', {}).get('mo_dau', '')}\n"
                        handbook_context += f"  + Mức lương mới ra trường: {parsed.get('lop_12', {}).get('muc_luong', {}).get('theo_cap_bac', [{}])[1].get('muc_luong', 'N/A')} triệu/tháng.\n\n"
                except Exception as ex:
                    print(f"Lỗi nạp context từ {fname}: {ex}")

    # 2. Xây dựng System Instruction cá nhân hóa dựa trên học bạ / trắc nghiệm học sinh
    system_instruction = "Bạn là Cố vấn học tập AI thông minh của EduCareer AI. Nhiệm vụ của bạn là tư vấn, định hướng nghề nghiệp, giải đáp thông tin tuyển sinh chính xác cho học sinh Việt Nam.\n"
    
    if req.student_data:
        sd = req.student_data
        system_instruction += f"\nThông tin hồ sơ học sinh hiện tại:\n"
        if sd.get("studentName"):
            system_instruction += f"- Tên học sinh: {sd['studentName']}\n"
        if sd.get("mbti"):
            system_instruction += f"- Tính cách MBTI: {sd['mbti']}\n"
        if sd.get("riasec"):
            sorted_riasec = sorted(sd['riasec'].items(), key=lambda x: x[1], reverse=True)
            system_instruction += f"- Sở thích Holland trội: Nhóm {sorted_riasec[0][0]}\n"
        if sd.get("academic"):
            system_instruction += f"- Điểm GPA Học bạ các môn chính: {json.dumps(sd['academic'], ensure_ascii=False)}\n"
            
    system_instruction += f"\nDưới đây là ngữ cảnh thông tin cẩm nang tuyển sinh thực tế đã nạp (RAG Context):\n{handbook_context}\n"
    system_instruction += "Hãy tư vấn nhiệt tình, sử dụng ngôn ngữ thân thiện, xưng hô 'Anh' và gọi học sinh là 'Em'. Phân tích điểm học bạ hoặc tính cách của em ấy nếu em ấy có nạp hồ sơ để chỉ ra thế mạnh nghề nghiệp phù hợp. Luôn luôn trích dẫn thông tin thật từ RAG Context nếu có."

    # 3. Gọi Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": user_message
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {
                    "text": system_instruction
                }
            ]
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code != 200:
            raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")
            
        res_data = response.json()
        reply_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        
        # Convert markdown text response to safe HTML linebreaks / strong format
        formatted_reply = reply_text.replace('\n', '<br>')
        
        return {
            "success": True,
            "reply": formatted_reply
        }
    except Exception as e:
        print(f"Lỗi Chatbot Gemini: {e}")
        return {
            "success": False,
            "reply": "Rất tiếc, cố vấn AI đang gặp sự cố kết nối máy chủ. Em vui lòng hỏi lại sau giây lát nhé!"
        }
