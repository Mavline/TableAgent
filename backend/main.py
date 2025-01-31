# Стандартные библиотеки
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

# Сторонние библиотеки
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import json
from fastapi.responses import StreamingResponse

# Локальные импорты
from app.services.openrouter_provider import OpenRouterProvider

# Модель для запроса
class AnalyzeRequest(BaseModel):
    prompt: str

# Настройка логирования
logging.basicConfig(
    filename='app.log',
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

app = FastAPI()

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация провайдера
model_provider = OpenRouterProvider()

# Глобальная переменная для хранения данных и имени файла
current_data = {}  # Словарь для хранения DataFrame'ов для каждого листа
current_filename = None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global current_data, current_filename
    try:
        if not file.filename.endswith('.xlsx'):
            return {"error": "Only .xlsx files are supported"}
        
        # Очищаем предыдущие данные
        current_data = {}
        current_filename = None
        
        # Читаем все листы Excel файла
        excel_file = pd.ExcelFile(file.file)
        sheet_names = excel_file.sheet_names
        
        # Читаем каждый лист в отдельный DataFrame
        current_data = {
            sheet_name: pd.read_excel(excel_file, sheet_name=sheet_name).fillna("") 
            for sheet_name in sheet_names
        }
        current_filename = file.filename
        
        # Формируем данные для первого листа
        first_sheet = sheet_names[0]
        first_df = current_data[first_sheet]
        
        # Логируем данные для отладки
        logging.info(f"Headers: {first_df.columns.tolist()}")
        logging.info(f"First row: {first_df.iloc[0].tolist()}")
        logging.info(f"Data shape: {first_df.shape}")
        
        response = {
            "filename": current_filename,
            "sheets": sheet_names,
            "currentSheet": first_sheet,
            "data": first_df.values.tolist(),
            "headers": first_df.columns.tolist()
        }
        
        logging.info(f"Successfully processed file: {current_filename}")
        return response
        
    except Exception as e:
        logging.error(f"Error processing file {file.filename}: {str(e)}")
        return {"error": str(e)}

@app.post("/get-sheet-data")
async def get_sheet_data(sheet_name: str):
    global current_data
    try:
        if sheet_name not in current_data:
            return {"error": "Sheet not found"}
            
        df = current_data[sheet_name]
        return {
            "data": df.values.tolist(),
            "headers": df.columns.tolist()
        }
    except Exception as e:
        logging.error(f"Error getting sheet data: {str(e)}")
        return {"error": str(e)}

@app.post("/analyze")
async def analyze_data(
    request: str = Form(...),
    files: List[UploadFile] = File(None)
):
    try:
        global current_data
        # Парсим JSON из request
        request_data = json.loads(request)
        prompt = request_data['prompt']
        sheet_name = request_data.get('sheet_name')  # Добавляем поддержку указания листа

        # Используем текущие данные или новые файлы
        dataframes = []
        if files and len(files) > 0:
            for file in files:
                if file.filename.endswith('.xlsx'):
                    content = await file.read()
                    df = pd.read_excel(BytesIO(content)).fillna("")
                    dataframes.append(df)
        elif current_data:
            if sheet_name and sheet_name in current_data:
                dataframes.append(current_data[sheet_name])
            else:
                # Если лист не указан, используем первый
                dataframes.append(next(iter(current_data.values())))
        else:
            return {
                "response": "No data available. Please upload an Excel file first.",
                "status": "error"
            }

        # Отправляем запрос к модели
        result = await model_provider.process_table(dataframes, prompt)
        return result

    except Exception as e:
        logging.error(f"Error analyzing data: {str(e)}")
        return {
            "response": str(e),
            "status": "error"
        }

@app.post("/clear-data")
async def clear_data():
    global current_data, current_filename
    try:
        current_data = {}
        current_filename = None
        return {"status": "success", "message": "Data cleared successfully"}
    except Exception as e:
        logging.error(f"Error clearing data: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/download-current")
async def download_current():
    global current_data, current_filename
    try:
        if not current_data or not current_filename:
            return {"error": "No data available"}
            
        # Создаем буфер для записи Excel файла
        output = BytesIO()
        
        # Записываем все листы в Excel файл
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for sheet_name, df in current_data.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        # Подготавливаем файл для отправки
        output.seek(0)
        
        # Возвращаем файл как поток
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={current_filename}"}
        )
        
    except Exception as e:
        logging.error(f"Error downloading file: {str(e)}")
        return {"error": str(e)}

@app.post("/update-cell")
async def update_cell(
    row: str = Form(...),
    col: str = Form(...),
    value: str = Form(...),
    sheet_name: str = Form(...)
):
    global current_data
    try:
        if sheet_name not in current_data:
            return {
                "status": "error",
                "message": "Sheet not found"
            }
            
        df = current_data[sheet_name]
        row_idx = int(row)
        col_idx = int(col)
        
        if row_idx < 0 or row_idx >= len(df.index) or col_idx < 0 or col_idx >= len(df.columns):
            return {
                "status": "error",
                "message": "Invalid cell coordinates"
            }
            
        df.iloc[row_idx, col_idx] = value
        current_data[sheet_name] = df
        
        return {
            "status": "success",
            "message": "Cell updated successfully",
            "data": df.values.tolist()
        }
    except ValueError as e:
        logging.error(f"Error parsing coordinates: {str(e)}")
        return {
            "status": "error",
            "message": f"Invalid coordinates: {str(e)}"
        }
    except Exception as e:
        logging.error(f"Error updating cell: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/add-row")
async def add_row(
    sheet_name: str = Form(...),
    values: str = Form(...)  # JSON строка с значениями
):
    global current_data
    try:
        if sheet_name not in current_data:
            return {"error": "Sheet not found"}
            
        df = current_data[sheet_name]
        new_row = json.loads(values)
        df.loc[len(df)] = new_row
        current_data[sheet_name] = df
        
        return {
            "status": "success",
            "message": "Row added successfully",
            "data": df.values.tolist()
        }
    except Exception as e:
        logging.error(f"Error adding row: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/delete-row")
async def delete_row(
    row: int = Form(...),
    sheet_name: str = Form(...)
):
    global current_data
    try:
        if sheet_name not in current_data:
            return {"error": "Sheet not found"}
            
        df = current_data[sheet_name]
        df.drop(index=row, inplace=True)
        df.reset_index(drop=True, inplace=True)
        current_data[sheet_name] = df
        
        return {
            "status": "success",
            "message": "Row deleted successfully",
            "data": df.values.tolist()
        }
    except Exception as e:
        logging.error(f"Error deleting row: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/add-column")
async def add_column(
    sheet_name: str = Form(...),
    column_name: str = Form(...),
    default_value: str = Form(...)
):
    global current_data
    try:
        if sheet_name not in current_data:
            return {"error": "Sheet not found"}
            
        df = current_data[sheet_name]
        df[column_name] = default_value
        current_data[sheet_name] = df
        
        return {
            "status": "success",
            "message": "Column added successfully",
            "data": df.values.tolist(),
            "headers": df.columns.tolist()
        }
    except Exception as e:
        logging.error(f"Error adding column: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/delete-column")
async def delete_column(
    sheet_name: str = Form(...),
    column_name: str = Form(...)
):
    global current_data
    try:
        if sheet_name not in current_data:
            return {"error": "Sheet not found"}
            
        df = current_data[sheet_name]
        df.drop(columns=[column_name], inplace=True)
        current_data[sheet_name] = df
        
        return {
            "status": "success",
            "message": "Column deleted successfully",
            "data": df.values.tolist(),
            "headers": df.columns.tolist()
        }
    except Exception as e:
        logging.error(f"Error deleting column: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/execute-command")
async def execute_command(
    command: str = Form(...),
    sheet_name: str = Form(...),
    current_data: str = Form(...)
):
    try:
        # Парсим текущие данные
        data = json.loads(current_data)
        
        # Здесь можно добавить обработку различных команд
        # Пока просто возвращаем успешный ответ
        return {
            "status": "success",
            "message": f"Command executed: {command}",
            "data": data
        }
    except Exception as e:
        logging.error(f"Error executing command: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 