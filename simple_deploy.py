#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
沃虎科技萌虎计划校招平台 - 简化部署版
运行方式: python simple_deploy.py
访问地址: http://服务器IP:8000
"""

import os
import sys
import json
import time
from email.parser import BytesParser
from email import policy
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from http.cookies import SimpleCookie
import base64

# 配置
HOST = '0.0.0.0'
DATA_DIR = os.environ.get('DATA_DIR', os.getcwd())
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
DATA_FILE = os.path.join(DATA_DIR, 'candidates.json')
DUPLICATE_FILE = os.path.join(DATA_DIR, 'duplicates.json')

def get_port():
    for key in ('WEB_PORT', 'PORT'):
        value = os.environ.get(key)
        if value and value.isdigit():
            return int(value)
    return 8000

PORT = get_port()

# 确保目录存在
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 候选人数据管理
def load_candidates():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_candidates(candidates):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(candidates, f, ensure_ascii=False, indent=2)

def load_duplicates():
    if os.path.exists(DUPLICATE_FILE):
        try:
            with open(DUPLICATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_duplicates(duplicates):
    with open(DUPLICATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(duplicates, f, ensure_ascii=False, indent=2)

def check_duplicate(phone, email):
    """检查手机号或邮箱是否重复"""
    candidates = load_candidates()
    duplicates = []
    for c in candidates:
        if c.get('phone') == phone:
            duplicates.append({'type': 'phone', 'name': c.get('name', '未知'), 'phone': c.get('phone')})
        if c.get('email') == email:
            duplicates.append({'type': 'email', 'name': c.get('name', '未知'), 'email': c.get('email')})
    return duplicates

def normalize_candidate(candidate):
    candidate = dict(candidate)
    if 'submitTime' not in candidate and 'submit_time' in candidate:
        candidate['submitTime'] = candidate.get('submit_time')
    if 'submit_time' not in candidate and 'submitTime' in candidate:
        candidate['submit_time'] = candidate.get('submitTime')
    candidate.setdefault('status', 'pending')
    return candidate

def normalize_duplicate(record):
    record = dict(record)
    if 'duplicateField' not in record and 'duplicate_type' in record:
        duplicate_type = str(record.get('duplicate_type') or '')
        record['duplicateField'] = 'phone' if 'phone' in duplicate_type else 'email'
    if 'submitTime' not in record and 'submit_time' in record:
        record['submitTime'] = record.get('submit_time')
    conflicts = record.get('conflict_with') or []
    if conflicts and isinstance(conflicts, list):
        record.setdefault('existingCandidateName', conflicts[0].get('name', '未知'))
    record.setdefault('existingCandidateName', '未知')
    record.setdefault('existingCandidateSchool', '未知')
    return record

# 自定义请求处理器
class MyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def do_GET(self):
        # 处理API请求
        if self.path.startswith('/api/'):
            self.handle_api()
            return
        
        # 处理健康检查
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "healthy"}')
            return
        
        # 处理Logo和图片资源
        if self.path.startswith('/Logo文件/'):
            self.handle_static_file(self.path[1:])
            return
        
        if self.path.startswith('/ip沃小虎系列资料/'):
            self.handle_static_file(self.path[1:])
            return
        
        # 默认处理
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/submit-resume':
            self.handle_submit_resume()
        elif self.path == '/api/candidates':
            self.handle_candidates()
        elif self.path == '/api/duplicates':
            self.handle_duplicates()
        else:
            self.send_error(404, 'Not Found')
    
    def handle_api(self):
        path = self.path[5:]  # 去掉 /api/
        
        if path == 'candidates':
            candidates = [normalize_candidate(c) for c in load_candidates()]
            self.send_json({'success': True, 'data': candidates})
        elif path == 'duplicates':
            duplicates = [normalize_duplicate(r) for r in load_duplicates()]
            self.send_json({'success': True, 'data': duplicates})
        elif path.startswith('candidates/'):
            # 获取单个候选人
            try:
                cid = str(path.split('/')[1])
                candidates = [normalize_candidate(c) for c in load_candidates()]
                candidate = next((c for c in candidates if str(c.get('id')) == cid), None)
                if candidate:
                    self.send_json({'success': True, 'data': candidate})
                else:
                    self.send_json({'success': False, 'message': '候选人不存在'}, 404)
            except:
                self.send_json({'success': False, 'message': '参数错误'}, 400)
        else:
            self.send_json({'success': False, 'message': 'API不存在'}, 404)
    
    def handle_candidates(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)
            
            action = data.get('action', '')
            
            if action == 'update':
                candidates = load_candidates()
                cid = str(data.get('id'))
                status = data.get('status')
                for c in candidates:
                    if str(c.get('id')) == cid:
                        c['status'] = status
                        break
                save_candidates(candidates)
                self.send_json({'success': True, 'message': '状态更新成功'})
            
            elif action == 'delete':
                candidates = load_candidates()
                cid = str(data.get('id'))
                candidates = [c for c in candidates if str(c.get('id')) != cid]
                save_candidates(candidates)
                self.send_json({'success': True, 'message': '删除成功'})
            
            else:
                self.send_json({'success': False, 'message': '未知操作'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'message': str(e)}, 500)
    
    def handle_duplicates(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)
            
            action = data.get('action', '')
            
            if action == 'clear':
                save_duplicates([])
                self.send_json({'success': True, 'message': '清空成功'})
            else:
                self.send_json({'success': False, 'message': '未知操作'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'message': str(e)}, 500)
    
    def handle_submit_resume(self):
        try:
            form, files = self.parse_multipart_form()

            name = (form.get('name') or '').strip()
            email = (form.get('email') or '').strip()
            phone = (form.get('phone') or '').strip()
            school = (form.get('school') or '').strip()
            major = (form.get('major') or '').strip()
            introduction = (form.get('introduction') or '').strip()

            if not all([name, email, phone, school, major, introduction]):
                self.send_json({'success': False, 'message': '请完整填写申请信息'}, 400)
                return
            
            # 检查重复
            duplicate_info = check_duplicate(phone, email)
            if duplicate_info:
                # 记录重复
                duplicates = load_duplicates()
                duplicates.append({
                    'id': str(int(time.time() * 1000)),
                    'name': name,
                    'school': school,
                    'major': major,
                    'phone': phone,
                    'email': email,
                    'duplicate_type': ','.join([d['type'] for d in duplicate_info]),
                    'duplicateField': duplicate_info[0]['type'],
                    'conflict_with': [{'name': d['name'], 'type': d['type']} for d in duplicate_info],
                    'existingCandidateName': duplicate_info[0]['name'],
                    'existingCandidateSchool': '未知',
                    'submit_time': self.get_current_time(),
                    'submitTime': self.get_current_time()
                })
                save_duplicates(duplicates)
                
                self.send_json({
                    'success': False,
                    'message': '信息重复',
                    'duplicates': duplicate_info,
                    'duplicate': {
                        'field': duplicate_info[0]['type'],
                        'candidate': {'name': duplicate_info[0]['name'], 'school': '未知'}
                    }
                })
                return
            
            # 保存简历文件
            resume_filename = None
            resume_item = files.get('resume')
            if resume_item:
                safe_filename = os.path.basename(resume_item['filename'])
                resume_filename = f"{name}_{phone}_{safe_filename}"
                resume_path = os.path.join(UPLOAD_DIR, resume_filename)
                with open(resume_path, 'wb') as f:
                    f.write(resume_item['content'])
            
            # 保存候选人数据
            candidates = load_candidates()
            candidate_id = str(int(time.time() * 1000))
            submit_time = self.get_current_time()
            
            candidates.append({
                'id': candidate_id,
                'name': name,
                'email': email,
                'phone': phone,
                'school': school,
                'major': major,
                'introduction': introduction,
                'resume': resume_filename,
                'status': 'pending',
                'submit_time': submit_time,
                'submitTime': submit_time
            })
            save_candidates(candidates)
            
            self.send_json({
                'success': True,
                'message': '简历提交成功！我们会尽快与你联系。'
            })
            
        except Exception as e:
            print(f"Error: {e}")
            self.send_json({'success': False, 'message': str(e)}, 500)

    def parse_multipart_form(self):
        content_type = self.headers.get('Content-Type', '')
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        message_bytes = (
            f'Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n'.encode('utf-8') + body
        )
        message = BytesParser(policy=policy.default).parsebytes(message_bytes)

        fields = {}
        files = {}
        for part in message.iter_parts():
            disposition = part.get('Content-Disposition', '')
            if 'form-data' not in disposition:
                continue

            field_name = part.get_param('name', header='content-disposition')
            if not field_name:
                continue

            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b''
            if filename:
                files[field_name] = {'filename': filename, 'content': payload}
            else:
                charset = part.get_content_charset() or 'utf-8'
                fields[field_name] = payload.decode(charset, errors='replace')

        return fields, files
    
    def handle_static_file(self, path):
        try:
            file_path = os.path.join(os.getcwd(), path)
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # 根据扩展名设置Content-Type
                if path.endswith('.png'):
                    content_type = 'image/png'
                elif path.endswith('.jpg') or path.endswith('.jpeg'):
                    content_type = 'image/jpeg'
                elif path.endswith('.gif'):
                    content_type = 'image/gif'
                else:
                    content_type = 'application/octet-stream'
                
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, 'File Not Found')
        except Exception as e:
            self.send_error(500, str(e))
    
    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def get_current_time(self):
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def log_message(self, format, *args):
        # 简化日志
        from datetime import datetime
        print(f"[{datetime.now()}] {format % args}")

def main():
    print("=== 沃虎科技萌虎计划校招平台 ===")
    print(f"启动服务: http://{HOST}:{PORT}")
    print(f"校招主页: http://{HOST}:{PORT}/index.html")
    print(f"管理后台: http://{HOST}:{PORT}/admin.html")
    print("按 Ctrl+C 停止服务")
    
    server = HTTPServer((HOST, PORT), MyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        server.server_close()

if __name__ == '__main__':
    main()
