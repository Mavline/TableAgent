import os
import replicate
import pandas as pd
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
from .model_provider import ModelProvider
import numpy as np

load_dotenv()

class ReplicateProvider(ModelProvider):
    def __init__(self):
        self.api_token = os.getenv("REPLICATE_API_TOKEN")
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN not found in environment")
        
        # Модель для использования
        self.model = "lucataco/ollama-nemotron-70b:730a266b3a0db453479d5b167132fd6534debde168af62ac328d5d0187d18e0e"
    
    async def process_table(self, dfs: List[pd.DataFrame], prompt: str) -> Dict[str, Any]:
        try:
            if dfs and len(dfs) > 0:
                df = dfs[0]  # Берем первую таблицу
                
                # Создаем среду выполнения для анализа данных
                exec_env = {
                    'pd': pd,
                    'np': np,
                    'df': df,
                    'result': None
                }

                # Формируем системный промпт
                system_prompt = """You are a Python/Pandas expert. The data is already loaded into 'df'.
                Available tools:
                - pandas as pd
                - numpy as np
                - DataFrame as df

                Write Python code to analyze the data. The code will be executed in a prepared environment.
                Your code must store the final result in the 'result' variable.

                Example:
                ```python
                # Get basic info
                print("DataFrame Info:")
                print(df.info())

                # Analyze data
                result = {
                    'total_rows': len(df),
                    'columns': df.columns.tolist(),
                    'summary': df.describe().to_dict()
                }
                ```

                Question: {prompt}
                """

                # Получаем код от модели
                code = replicate.run(
                    self.model,
                    input={
                        "prompt": system_prompt,
                        "max_tokens": 4096,
                        "temperature": 0.1
                    }
                )

                # Извлекаем Python код из ответа (между ```python и ```)
                import re
                code_match = re.search(r'```python\n(.*?)\n```', code, re.DOTALL)
                if code_match:
                    python_code = code_match.group(1)
                    
                    # Выполняем код
                    exec(python_code, exec_env)
                    
                    # Получаем результат
                    result = exec_env.get('result')
                    
                    return {
                        "response": f"Analysis:\n{code}\n\nResult:\n{result}",
                        "status": "success"
                    }
                else:
                    return {
                        "response": "No executable code found in model response",
                        "status": "error"
                    }

            else:
                return {
                    "response": "No data available for analysis",
                    "status": "error"
                }
                
        except Exception as e:
            return {
                "response": str(e),
                "status": "error"
            } 