
import { GoogleGenAI, Type } from "@google/genai";
import { TradeRecord, ExpenseRecord, CoinSaleRecord, ShiftRecord, IdleRecord } from "../types";
import { formatCurrency } from "../utils/currency";

const getContextString = (
  history: TradeRecord[], 
  expenses: ExpenseRecord[], 
  coinSales: CoinSaleRecord[],
  shifts: ShiftRecord[],
  idleRecords: IdleRecord[] = []
) => {
  const now = new Date();
  
  const rawTimeline = history.slice(0, 30).map(t => {
    const end = new Date(t.timestamp);
    const start = new Date(end.getTime() - (t.durationMinutes || 0) * 60000);
    return `- [${start.toLocaleTimeString()} -> ${end.toLocaleTimeString()}] ${t.fromNode} -> ${t.toNode}: +${formatCurrency(t.profit)} (${t.durationMinutes} мин)`;
  }).join('\n');

  const idleHistory = idleRecords.slice(-10).map(r => 
    `- [${new Date(r.timestamp).toLocaleTimeString()}] Причина: "${r.reason}"`
  ).join('\n');

  return `
ДАННЫЕ ТОРГОВОЙ ИМПЕРИИ (ТЕКУЩЕЕ ВРЕМЯ: ${now.toLocaleString('ru-RU')}):

ХРОНОЛОГИЯ РЕЙСОВ:
${rawTimeline || 'История пуста.'}

ЖУРНАЛ ЗАФИКСИРОВАННЫХ ПЕРЕРЫВОВ:
${idleHistory || 'Перерывов не зафиксировано.'}

ИНСТРУКЦИЯ ДЛЯ ГЕНЕРАЛЬНОГО АУДИТА (Кнопка "Получить совет"):
Ты — Верховный Оракул-Казначей Верры. Твоя цель — беспощадный анализ прибыли.
Выдай "Свиток Истины" используя строгое форматирование:
Используй "## " для заголовков разделов.

1. ## 📜 СОСТОЯНИЕ ИМПЕРИИ
Краткое резюме текущего темпа в золоте.
2. ## 🚀 ЗОЛОТЫЕ ЖИЛЫ
Лучшие маршруты.
3. ## ⚠️ ТЕНЕВЫЕ ПОТЕРИ
Анализ пропусков в логах.
4. ## 🏆 РАНГ ТОРГОВЦА
Оценка эффективности.
5. ## 🔮 ПУТЬ К ПРОЦВЕТАНИЮ
Конкретные советы.

ОТВЕЧАЙ КРАТКО, СТРУКТУРИРОВАННО, БЕЗ ЛИШНЕЙ ВОДЫ.

ИНСТРУКЦИЯ ДЛЯ ЧАТА:
Отвечай только на РУССКОМ. Используй Markdown и эмодзи.
`;
};

export const extractIdleReason = async (text: string): Promise<{ reason: string, isIdleAnnouncement: boolean } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй текст: "${text}". Является ли это объяснением почему торговец сейчас не работает (перерыв, афк, вары, чай, отдых)?`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reason: { type: Type.STRING, description: "Суть причины (например: отдых 5 минут)" },
            isIdleAnnouncement: { type: Type.BOOLEAN, description: "True, если это объяснение паузы в работе" }
          },
          required: ["reason", "isIdleAnnouncement"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw e;
  }
};

export const getTradingAdvice = async (
  history: TradeRecord[], 
  expenses: ExpenseRecord[], 
  coinSales: CoinSaleRecord[],
  shifts: ShiftRecord[],
  idleRecords: IdleRecord[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = getContextString(history, expenses, coinSales, shifts, idleRecords);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `ПРОВЕДИ ГЕНЕРАЛЬНЫЙ АУДИТ МОЕЙ ТОРГОВЛИ. 
    ${context}`,
    config: {
      systemInstruction: "Ты — строгий и мудрый Оракул-Казначей. Твои советы должны помогать игроку зарабатывать больше. Твой ответ будет отрендерен специально, используй заголовки ## и списки 1. 2. 3.",
      temperature: 0.3,
    }
  });
  return response.text;
};

export const startOracleChat = (
  history: TradeRecord[], 
  expenses: ExpenseRecord[], 
  coinSales: CoinSaleRecord[],
  shifts: ShiftRecord[],
  idleRecords: IdleRecord[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = getContextString(history, expenses, coinSales, shifts, idleRecords);
  
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `Ты — Оракул-Казначей. Ты видишь всю историю торговца.
      КОНТЕКСТ: ${context}`,
      temperature: 0.7,
    },
  });
};
