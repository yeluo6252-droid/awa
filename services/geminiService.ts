import { GoogleGenAI } from "@google/genai";
import { SensorReading, Thresholds } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeEnvironment = async (
  reading: SensorReading,
  thresholds: Thresholds
): Promise<string> => {
  try {
    const prompt = `
      你是一位智能家居和环境健康专家助手。

      当前传感器读数：
      - 温度：${reading.temperature}°C (目标范围：${thresholds.tempMin}-${thresholds.tempMax}°C)
      - 湿度：${reading.humidity}% (目标范围：${thresholds.humidMin}-${thresholds.humidMax}%)
      - 气压：${reading.pressure} hPa
      - 海拔 (约)：${reading.altitude}m

      请提供简明的分析（最多3句话）：
      1. 当前环境是否舒适？
      2. 是否存在健康风险（如霉菌、脱水、中暑）？
      3. 建议一个可行的操作（例如“打开窗户”，“开启加湿器”）。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "无法生成分析报告。";
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "AI 分析服务当前不可用，请检查 API 密钥配置。";
  }
};