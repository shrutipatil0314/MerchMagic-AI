
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private handleApiError(error: any, context: string): never {
    console.error(`Gemini Service Error [${context}]:`, error);

    // Extract the most descriptive error message possible
    let message = error.message || `An unexpected error occurred during ${context}.`;
    let details = '';

    // Handle known error patterns and status codes
    if (error.status === 429) {
      message = 'Rate limit exceeded. Please wait a moment before trying again.';
      details = 'HTTP 429: Too Many Requests';
    } else if (error.status === 400) {
      if (message.includes('API_KEY')) {
        message = 'Invalid or missing API Key. Please check your configuration.';
      } else {
        message = 'The request was invalid. This could be due to an unsupported image format or an overly complex prompt.';
      }
      details = `HTTP 400: Bad Request`;
    } else if (error.status === 403) {
      message = 'Access forbidden. This might be due to regional restrictions or API key permissions.';
      details = 'HTTP 403: Forbidden';
    } else if (error.status >= 500) {
      message = 'The Gemini server encountered an error. Please try again later.';
      details = `HTTP ${error.status}: Server Error`;
    }

    // Check for safety specifically if not already handled
    if (message.includes('SAFETY')) {
      // Safety errors are handled by getSafetyErrorMessage and thrown with "SAFETY: " prefix
    }

    const finalError = new Error(message);
    (finalError as any).status = error.status;
    (finalError as any).details = details || error.stack;
    
    throw finalError;
  }

  private getSafetyErrorMessage(candidate: any): string {
    const safetyRatings = candidate.safetyRatings || [];
    const blockedCategories = safetyRatings
      .filter((r: any) => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
      .map((r: any) => {
        const cat = r.category.replace('HARM_CATEGORY_', '').toLowerCase().replace(/_/g, ' ');
        return cat.charAt(0).toUpperCase() + cat.slice(1);
      });

    if (blockedCategories.length > 0) {
      return `Blocked due to potential issues: ${blockedCategories.join(', ')}.`;
    }
    
    return 'The content was flagged by safety filters. Try a more neutral prompt.';
  }

  async generateMockup(logoBase64: string, prompt: string): Promise<string> {
    const cleanBase64 = logoBase64.split(',')[1] || logoBase64;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/png',
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        }
      });

      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error('The AI service did not return any results.');

      if (candidate.finishReason === 'SAFETY') {
        throw new Error(`SAFETY: ${this.getSafetyErrorMessage(candidate)}`);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error('The AI returned a response without an image. It might have only returned text feedback.');
    } catch (error: any) {
      this.handleApiError(error, 'mockup generation');
    }
  }

  async editMockup(baseImageBase64: string, editPrompt: string, backgroundImageBase64?: string): Promise<string> {
    const cleanBase64 = baseImageBase64.split(',')[1] || baseImageBase64;
    const parts: any[] = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/png',
        },
      },
      {
        text: editPrompt,
      },
    ];

    if (backgroundImageBase64) {
      const cleanBgBase64 = backgroundImageBase64.split(',')[1] || backgroundImageBase64;
      parts.push({
        inlineData: {
          data: cleanBgBase64,
          mimeType: 'image/png',
        },
      });
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        }
      });

      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error('The AI service did not return any results.');

      if (candidate.finishReason === 'SAFETY') {
        throw new Error(`SAFETY: ${this.getSafetyErrorMessage(candidate)}`);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error('The AI was unable to generate an edited image from your prompt.');
    } catch (error: any) {
      this.handleApiError(error, 'mockup editing');
    }
  }
}

export const geminiService = new GeminiService();
