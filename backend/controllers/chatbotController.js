const OpenAI = require('openai');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');

// @desc    Get chatbot response (RAG)
// @route   POST /api/chatbot
// @access  Public
const getChatbotResponse = async (req, res) => {
  try {
    const { message } = req.body;

    // Initialize Groq (using OpenAI SDK compatibility)
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'Groq API Key missing. Please check backend .env file.' });
    }

    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // 1. Search DB for relevant context
    const keywords = message.split(' ').filter(word => word.length > 3);
    
    let context = '';
    
    if (keywords.length > 0) {
      const productQuery = {
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { category: { $regex: keywords.join('|'), $options: 'i' } }
        ]
      };

      const boutiqueQuery = {
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } }
        ]
      };

      const [products, boutiques] = await Promise.all([
        Product.find(productQuery).limit(5).select('name description price category').lean(),
        Boutique.find(boutiqueQuery).limit(3).select('name description').lean()
      ]);

      if (products.length > 0) {
        context += '\nRelevant Products found in our database:\n';
        products.forEach(p => {
          context += `- ${p.name}: ${p.price} PKR, Category: ${p.category}. ${p.description.substring(0, 100)}...\n`;
        });
      }

      if (boutiques.length > 0) {
        context += '\nRelevant Boutiques found in our database:\n';
        boutiques.forEach(b => {
          context += `- ${b.name}: ${b.description.substring(0, 100)}...\n`;
        });
      }
    }

    // 2. Construct Prompt for Groq (Llama 3)
    const systemPrompt = `You are "Stitchie", the AI assistant for Auto Stitch, a premium fashion platform in Pakistan. 
Your goal is to help users find products, boutiques, and understand our features like Virtual Try-On and Customization.

Context from our Database:
${context || 'No specific products or boutiques matched this exact query, but you can suggest browsing our general catalogue.'}

Instructions:
- Be professional, helpful, and stylish.
- Use the context provided above to give specific recommendations if available.
- If a user asks about "Virtual Try-On", tell them it's a feature where they can upload their photo to see how clothes look on them.
- If they ask about "Customization", explain they can request modifications and boutiques will bid on their requests.
- Keep answers concise (max 3-4 sentences).
- If you don't know something, suggest they contact our support or visit the Contact page.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    res.json({ success: true, reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Groq Chatbot Error:', error);
    res.status(500).json({ success: false, message: 'I am having trouble stitching together an answer right now. Please try again later.' });
  }
};

module.exports = { getChatbotResponse };
