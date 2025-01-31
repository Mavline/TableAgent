from typing import Dict, Any
import pandas as pd
from abc import ABC, abstractmethod

class ModelProvider(ABC):
    """Абстрактный класс для провайдера модели"""
    
    @abstractmethod
    async def process_table(self, df: pd.DataFrame, prompt: str) -> Dict[str, Any]:
        """
        Обработка таблицы с помощью модели
        
        Args:
            df: pandas DataFrame с данными
            prompt: запрос пользователя
            
        Returns:
            Dict с результатами обработки
        """
        pass 