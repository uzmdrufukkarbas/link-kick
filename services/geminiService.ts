import { GoogleGenAI, Type } from "@google/genai";
import { ChatAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeChatAndExtractLinks = async (chatId: string): Promise<ChatAnalysisResult> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Kullanıcı bir Chat ID'si sağladı: "${chatId}".
    
    Bu, bir simülasyon görevidir. Gerçek verilere erişimin yok.
    
    1. Bu Chat ID'sine dayanarak, makul bir sohbet senaryosu (örneğin bir yazılım ekibi, bir oyun grubu, bir öğrenci grubu vb.) hayal et ve simüle et.
    2. Bu hayali sohbette geçen yaklaşık 10-15 farklı web linki oluştur (Github, Youtube, Haber siteleri, Dökümantasyon, Sosyal Medya vb.).
    3. Bu linkleri analiz et ve kategorize et.
    4. Türkçe yanıt ver.

    Aşağıdaki JSON şemasına tam olarak uyarak yanıt ver.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chatSummary: {
              type: Type.STRING,
              description: "Sohbetin bağlamı ve içeriği hakkında kısa bir özet (Türkçe).",
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  url: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Sayfanın veya linkin kısa başlığı." },
                  category: { type: Type.STRING, description: "Kategori (örn: Yazılım, Medya, Sosyal, Eğitim, Diğer)." },
                  sender: { type: Type.STRING, description: "Linki gönderen kurgusal kullanıcı adı." },
                  description: { type: Type.STRING, description: "Linkin neden paylaşıldığına dair kısa açıklama." },
                },
                required: ["url", "title", "category", "sender", "description"],
              },
            },
            stats: {
              type: Type.OBJECT,
              properties: {
                totalLinks: { type: Type.NUMBER },
                topCategory: { type: Type.STRING },
              },
              required: ["totalLinks", "topCategory"],
            },
          },
          required: ["chatSummary", "links", "stats"],
        },
      },
    });

    if (!response.text) {
      throw new Error("API'den boş yanıt döndü.");
    }

    const data = JSON.parse(response.text) as ChatAnalysisResult;
    return data;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
