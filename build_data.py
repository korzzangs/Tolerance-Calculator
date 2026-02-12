
import gspread
import json
import os

# Google Sheets API setup:
# 1. Google Cloud Console에서 프로젝트 생성 및 Sheets/Drive API 활성화
# 2. 서비스 계정 키(JSON)를 'credentials.json'으로 저장
# 3. 구글 시트를 생성하고 서비스 계정 이메일을 공유 대상에 추가

def build_data():
    """
    구글 시트의 데이터를 읽어와 tolerance_data.json 파일을 생성합니다.
    
    시트 구조 예시:
    - Sheet Name: "Holes" 또는 "Shafts"
    - Columns: Grade, MinDia, MaxDia, UpperDeviation, LowerDeviation
    - 예: H7, 18, 30, 0.021, 0.000
    """
    try:
        # 서비스 계정 인증
        # gc = gspread.service_account(filename='credentials.json')
        # sh = gc.open("ISO_286_Tolerance_Table")
        
        # 실제 환경에서는 gspread를 사용하여 데이터를 dict 형태로 가공
        # 여기서는 구조 예시를 위해 더미 데이터를 사용합니다.
        
        data = {
            "holes": {},
            "shafts": {}
        }
        
        # 시트 순회 및 데이터 적재 로직 (예시)
        # worksheet = sh.worksheet("Holes")
        # records = worksheet.get_all_records()
        # for row in records:
        #     grade = row['Grade']
        #     if grade not in data['holes']: data['holes'][grade] = []
        #     data['holes'][grade].append({
        #         "min_dia": float(row['MinDia']),
        #         "max_dia": float(row['MaxDia']),
        #         "upper": float(row['UpperDeviation']),
        #         "lower": float(row['LowerDeviation'])
        #     })
        
        print("Data processed successfully.")
        
        # JSON 파일로 저장
        with open('tolerance_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Error during data building: {e}")

if __name__ == "__main__":
    build_data()
