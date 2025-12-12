import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Category, Topic, GeneratedPost } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Suggests high-SEO blog categories.
 */
export const suggestCategories = async (): Promise<Category[]> => {
  const prompt = `
    Suggest 6 popular, high-traffic blog categories relevant to a Korean audience for ${new Date().getFullYear()}.
    Focus on lifestyle, tech, finance, or health.
    Return the response as a JSON array.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Short category name in Korean (e.g., '재테크')" },
        description: { type: Type.STRING, description: "Short description of why this is popular in Korean" },
        icon: { type: Type.STRING, description: "A single emoji representing the category" },
      },
      required: ["name", "description", "icon"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert SEO marketing consultant specializing in the Korean market.",
      },
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      ...item,
      id: `cat-${index}`,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Fallback data in case of error
    return [
      { id: '1', name: 'IT & 테크', description: '최신 기기 및 AI 트렌드', icon: '💻' },
      { id: '2', name: '자기계발', description: '생산성 향상 및 동기부여', icon: '🚀' },
      { id: '3', name: '여행', description: '국내외 숨은 명소 추천', icon: '✈️' },
    ];
  }
};

/**
 * Suggests topics based on a selected category.
 */
export const suggestTopics = async (categoryName: string): Promise<Topic[]> => {
  const prompt = `
    Suggest 5 catchy, high-SEO blog article titles for the category: "${categoryName}".
    The titles should be click-worthy and optimized for Korean search engines (Naver, Google Korea).
    Include a main keyword for each.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Catchy blog post title in Korean" },
        keyword: { type: Type.STRING, description: "Main SEO keyword" },
        seoScore: { type: Type.INTEGER, description: "Predicted SEO score between 80 and 99" },
      },
      required: ["title", "keyword", "seoScore"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      ...item,
      id: `topic-${index}`,
    }));
  } catch (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
};

/**
 * Generates the full blog post content.
 */
export const generateBlogPost = async (category: string, topic: string): Promise<GeneratedPost> => {
  const prompt = `
    Write a high-quality, SEO-optimized blog post about "${topic}" in the category "${category}".
    
    Target Audience: General Korean readers (Mobile-first).
    Tone: Professional yet friendly (Polite Korean 'jondaemal').
    
    Structure & Formatting Rules (Crucial for Automatic TOC Generation):
    1. **Structure**: 
       - Start directly with a Hook/Intro.
       - Use clear **H2 (##)** for main sections.
       - Use **H3 (###)** for subsections if necessary.
       - **Do NOT** use H1 (title is already H1).
    2. **Readability**:
       - Keep paragraphs short (2-3 sentences max).
       - Use **bullet points** or **numbered lists** generously.
       - **Bold** key phrases.
    3. **Conclusion**: Brief summary and engagement question.
    4. **Hashtags**: 5 relevant tags at the bottom.

    Ensure the content is informative, factual, and visually organized for easy reading on screens.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7, // Slightly creative
      },
    });

    const text = response.text || "";
    
    // Simple extraction of tags if they are at the bottom
    const tagsMatch = text.match(/#[\w가-힣]+/g);
    const tags = tagsMatch ? tagsMatch.slice(0, 5) : ["#블로그", "#정보공유"];

    return {
      title: topic,
      content: text,
      tags: tags,
    };
  } catch (error) {
    console.error("Error generating post:", error);
    throw error;
  }
};