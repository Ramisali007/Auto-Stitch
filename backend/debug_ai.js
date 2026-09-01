const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    console.log("Checking your API key...");
    // Using fetch directly to avoid SDK abstraction issues
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("API Error:", data.error.message);
      return;
    }

    console.log("--- AVAILABLE MODELS ---");
    if (data.models && data.models.length > 0) {
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(m.name);
        }
      });
    } else {
      console.log("No models found. Your API key might not have the Generative Language API enabled.");
    }
    console.log("-----------------------");
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}
listModels();
