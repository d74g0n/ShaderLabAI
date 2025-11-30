import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert GLSL shader engineer specializing in WebGL and ShaderToy.
When the user asks for code, you MUST provide ONLY the GLSL code inside a 'mainImage' function compatible with ShaderToy.
Do not include HTML, CSS, or JavaScript.
Do not include markdown code fences (like \`\`\`glsl) unless explicitly asked for explanation.
The ShaderToy signature is: void mainImage( out vec4 fragColor, in vec2 fragCoord ).
Available uniforms: 
- iResolution (vec3)
- iTime (float)
- iMouse (vec4)
- iChannel0..3 (sampler2D)

If the user provides an error log, explain the fix and provide the corrected code block.
`;

export const generateShader = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    
    // Clean up potential markdown formatting if the model adds it despite instructions
    let text = response.text || "";
    text = text.replace(/```glsl/g, "").replace(/```/g, "").trim();
    
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate shader. Please check your API key.");
  }
};

export const debugShader = async (code: string, errorLog: string): Promise<string> => {
  const prompt = `
  I have a GLSL shader error.
  
  CODE:
  ${code}
  
  ERROR:
  ${errorLog}
  
  Please fix the code and return the FULL corrected shader source (just the mainImage part).
  `;
  
  return generateShader(prompt);
};
