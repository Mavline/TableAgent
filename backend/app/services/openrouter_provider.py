import os
from typing import Dict, Any, List
import pandas as pd
from dotenv import load_dotenv
from .model_provider import ModelProvider
import numpy as np
from openai import OpenAI

load_dotenv()

class OpenRouterProvider(ModelProvider):
    def __init__(self):
        self.api_token = os.getenv("OPENROUTER_API_KEY")
        if not self.api_token:
            raise ValueError("OPENROUTER_API_KEY not found in environment")
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_token
        )
        
        # Модель для использования
        self.model = "deepseek/deepseek-r1:free"
    
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
                completion = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                )

                code = completion.choices[0].message.content

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