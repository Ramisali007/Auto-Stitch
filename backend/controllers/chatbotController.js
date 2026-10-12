const OpenAI = require('openai');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');

// Model cache to avoid querying Groq /models on every single prompt
let cachedModels = null;
let lastModelFetch = 0;
const MODEL_CACHE_TTL = 3600000; // 1 hour

const PREFERRED_CHAT_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

async function getAvailableGroqModels(groq) {
  const now = Date.now();
  if (cachedModels && now - lastModelFetch < MODEL_CACHE_TTL) {
    return cachedModels;
  }
  try {
    const list = await groq.models.list();
    const available = list?.data ? list.data.map((m) => m.id) : [];
    const matched = PREFERRED_CHAT_MODELS.filter((m) => available.includes(m));
    cachedModels = matched.length > 0 ? matched : PREFERRED_CHAT_MODELS;
    lastModelFetch = now;
    return cachedModels;
  } catch (err) {
    return PREFERRED_CHAT_MODELS;
  }
}

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function extractKeywords(message) {
  const stopWords = new Set([
    'what', 'have', 'tell', 'suit', 'best', 'some', 'with', 'from', 'that', 'this',
    'want', 'like', 'need', 'does', 'your', 'help', 'good', 'show', 'find', 'boutique',
    'clothes', 'dress', 'shop', 'order', 'please', 'know', 'give', 'could', 'would',
    'there', 'their', 'they', 'them', 'about', 'more', 'into', 'just', 'look', 'looks',
    'which', 'will', 'make', 'made', 'much', 'many', 'very', 'were', 'been', 'being',
    'stitch', 'auto'
  ]);

  const tokens = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  return [...new Set(tokens)];
}

// Detect clearly off-topic questions
function isOutOfDomain(message) {
  const lower = message.toLowerCase().trim();
  const offTopicPatterns = [
    /\b(python|javascript|coding|function|algorithm|react|node|sql|html|css|bug|syntax)\b/i,
    /\b(solve|math|equation|calculate|derivative|integral|geometry|algebra)\b/i,
    /\b(capital of|who is the president|prime minister|politics|war|election)\b/i,
    /\b(weather in|recipe for|cook|calories|diet|workout|car|football|cricket score)\b/i,
    /\b(write a poem|write code|translate to french|who founded)\b/i
  ];

  // If the query contains Auto Stitch fashion keywords, allow it
  const fashionKeywords = /\b(stitch|dress|cloth|shirt|kurta|suit|fabric|try on|vto|boutique|tailor|custom|bid|order|track|price|pkr|wedding|party|eid|lawn|silk|chiffon|velvet|organza|asim jofa|elan|maria|suffuse|khaadi)\b/i;
  if (fashionKeywords.test(lower)) {
    return false;
  }

  for (const pattern of offTopicPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

const OUT_OF_DOMAIN_RESPONSE =
  "I am Stitchie, the dedicated fashion concierge exclusively for Auto Stitch. I can only assist you with questions regarding our collections, custom tailoring, virtual try-on, boutique orders, and platform features. How can I help you with your wardrobe or order today?";

// Structured Project Knowledge Base
const AUTO_STITCH_KNOWLEDGE = `
=== AUTO STITCH COMPREHENSIVE PROJECT KNOWLEDGE BASE ===
1. OVERVIEW & MISSION:
Auto Stitch is Pakistan's premier high-end fashion ecosystem combining luxury prêt collections, an AI Virtual Try-On Studio, and a bespoke Customization & Bidding network connecting clients directly with master boutique ateliers.

2. CORE FEATURES & MODULES:
- Virtual Try-On Studio (/try-on):
  * State-of-the-art AI dressing room where customers upload a photo to visualize garments realistically.
  * 4-Stage AI Pipeline: 1) Image & Pose Validation, 2) Anatomical Parsing & Garment Segmentation, 3) 3D Cloth Deformation & Inpainting, 4) Photorealistic Lighting & Seam Harmonization.
  * Features: Interactive Before/After slider and side-by-side view, fit styles (Tailored, Relaxed, Slim), direct high-resolution image downloads, and instant 'Add to Cart'.
  * Privacy: Uploaded photos are securely processed and strictly confidential.

- Customization & Bidding Studio (/customize & /bids):
  * Bespoke tailoring: Clients specify garments and select regions to modify (Neckline, Sleeves, Hemline, Embroidery, Collar).
  * Upload up to 5 inspiration photos, enter exact body measurements, target budget (PKR), and design description.
  * Broadcast to verified partner boutiques who place competitive bids detailing custom price and delivery timeline.
  * Client reviews bids in real-time (/bids) and accepts their chosen boutique with one click.
  * Double-accept defense & atomic order creation ensures bespoke orders are generated with custom line items.

- Marketplace & Catalogue (/catalogue & /products/:id):
  * Luxury prêt, formal wear, bridal collections, casual tunics, and festive edits.
  * Renowned partner designers: Asim Jofa, Élan, Suffuse, Maria.B, Sana Safinaz, Khaadi, J., Ideas, Agha Noor, Charizma.
  * Fabrics: Pure Lawn, Raw Silk, Chiffon, Organza, Velvet, Cotton, Net, Banarsi brocade.
  * Filter by category, occasion, price range; view real-time stock, high-resolution galleries, and verified buyer reviews.

- Real-Time Boutique Chat & In-Chat Quotes (/chat):
  * Live messaging directly with boutique designers.
  * Boutiques can issue binding price quotes inside the chat window.
  * Clients can review and accept quotes instantly, triggering automated order creation.

- Orders, Checkout & Milestone Installments (/checkout & /orders):
  * Payment options: Cash on Delivery (COD), secure Stripe credit/debit card, and Milestone Installment Plans.
  * Milestone Installments: Flexible 2 or 3 stage installment schedules (e.g. initial deposit, production milestone, final delivery).
  * Order Tracking (/track & /orders/:id): Live status tracking (placed -> accepted -> in_production -> ready_to_ship -> shipped -> delivered).
  * Returns & Alterations: 14-day policy for alterations or fit adjustments with photo evidence.
  * Invoices: Printable order receipt and invoice generation.

- Security, User Roles & Platform Policies:
  * Distinct portals for Customers, Boutique Owners, and Platform Administrators.
  * Two-Factor Authentication (TOTP 2FA) and account lockout after failed attempts.
  * Shipping: Free nationwide delivery on orders over PKR 5,000 (flat PKR 250 under PKR 5,000).
  * Size Guide (/size-guide), Store Locator (/stores), FAQs (/faq), and Contact Support (/contact).
======================================================
`;

function generateSmartFallback(message, matchedProducts, matchedBoutiques) {
  const lower = message.toLowerCase().trim();

  if (isOutOfDomain(lower)) {
    return OUT_OF_DOMAIN_RESPONSE;
  }

  if (matchedProducts.length > 0) {
    const suggestions = matchedProducts
      .slice(0, 3)
      .map((p) => `• "${p.name}" (PKR ${p.price?.toLocaleString?.() || p.price}) - Category: ${p.category}`)
      .join('\n');
    return `Here are some exquisite pieces from our Auto Stitch collection matching your request:\n\n${suggestions}\n\nYou can visualize how they look on you in our Virtual Try-On Studio (/try-on) or request bespoke tailoring (/customize)!`;
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('salam')) {
    return "Hello! I'm Stitchie, your personal fashion concierge exclusively for Auto Stitch. Whether you're exploring luxury pret in our Catalogue, trying on clothes in our Virtual Try-On Studio, or getting bespoke bids from top boutiques, how can I assist you today?";
  }

  if (lower.includes('party') || lower.includes('event') || lower.includes('wedding') || lower.includes('shaadi') || lower.includes('valima') || lower.includes('reception') || lower.includes('desi')) {
    return "For parties and celebratory events on Auto Stitch, we feature luxurious raw silk ensembles, organza with zardozi threadwork, and rich jewel-toned velvet kurtas. You can explore our Catalogue (/catalogue) for ready-to-wear pieces or submit reference photos to our Customization Studio (/customize) to receive custom bids from partner ateliers!";
  }

  if (lower.includes('try on') || lower.includes('virtual') || lower.includes('vto')) {
    return "Auto Stitch features an AI Virtual Try-On Studio (/try-on). Simply upload your full-length photo to visualize any garment draped over your body in 3D. You can test Tailored, Relaxed, or Slim silhouettes, use our interactive Before/After comparison slider, and download high-res images directly!";
  }

  if (lower.includes('custom') || lower.includes('tailor') || lower.includes('stitch') || lower.includes('bid')) {
    return "In our Customization Studio (/customize), you can select specific regions to customize (neckline, sleeves, hemline, embroidery, collar), submit your exact body measurements and budget, and upload reference photos. Partner boutiques will review your request and place competitive bids with price quotes and delivery timelines on /bids!";
  }

  if (lower.includes('boutique') || lower.includes('designer') || lower.includes('brand') || lower.includes('asim jofa') || lower.includes('elan') || lower.includes('maria b') || lower.includes('sana safinaz')) {
    return "Auto Stitch collaborates with premier Pakistani fashion houses including Asim Jofa, Élan, Suffuse, Maria.B, Sana Safinaz, Khaadi, and J. You can browse their collections in our Catalogue (/catalogue) or submit designer inspiration photos in our Customization Studio for custom tailoring!";
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('installment') || lower.includes('pay') || lower.includes('payment') || lower.includes('stripe')) {
    return "Auto Stitch offers three flexible checkout options: Cash on Delivery (COD), secure Stripe card payments, and Milestone Installment Plans where you pay across 2 or 3 scheduled stages (deposit, production, and delivery)!";
  }

  if (lower.includes('order') || lower.includes('track') || lower.includes('shipping') || lower.includes('delivery')) {
    return "You can track your orders in real time using our Track Order portal (/track) with your reference code (e.g. #AS-XXXXXX) or via your Orders Dashboard (/orders). Nationwide delivery is free for orders over PKR 5,000!";
  }

  return "I am Stitchie, your fashion concierge exclusively for Auto Stitch. You can explore our Catalogue (/catalogue), try on outfits in our Virtual Try-On Studio (/try-on), submit bespoke tailoring requests (/customize), or ask me about our collections, boutiques, and milestone installment plans!";
}

// @desc    Get chatbot response (RAG strictly grounded in Auto Stitch project)
// @route   POST /api/chatbot
// @access  Public
const getChatbotResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const trimmedMessage = message.trim();

    // Guardrail Check: Refuse queries that are strictly unrelated to Auto Stitch
    if (isOutOfDomain(trimmedMessage)) {
      return res.json({ success: true, reply: OUT_OF_DOMAIN_RESPONSE });
    }

    // 1. Live Context Retrieval (RAG from Database)
    const keywords = extractKeywords(trimmedMessage);
    let dbContext = '';
    let matchedProducts = [];
    let matchedBoutiques = [];

    if (keywords.length > 0) {
      const escapedPatterns = keywords.map(escapeRegex).join('|');

      const productQuery = {
        $or: [
          { name: { $regex: escapedPatterns, $options: 'i' } },
          { description: { $regex: escapedPatterns, $options: 'i' } },
          { category: { $regex: escapedPatterns, $options: 'i' } },
          { tags: { $in: keywords.map((k) => new RegExp(escapeRegex(k), 'i')) } },
        ],
      };

      const boutiqueQuery = {
        $or: [
          { name: { $regex: escapedPatterns, $options: 'i' } },
          { description: { $regex: escapedPatterns, $options: 'i' } },
        ],
      };

      try {
        [matchedProducts, matchedBoutiques] = await Promise.all([
          Product.find(productQuery)
            .limit(6)
            .select('name description price category boutique')
            .populate('boutique', 'name')
            .lean(),
          Boutique.find(boutiqueQuery).limit(4).select('name description').lean(),
        ]);

        if (matchedProducts.length > 0) {
          dbContext += '\nLIVE MATCHING CATALOG PRODUCTS:\n';
          matchedProducts.forEach((p) => {
            const bName = p.boutique?.name || 'Exclusive Partner Boutique';
            dbContext += `- "${p.name}" by ${bName}: PKR ${p.price?.toLocaleString?.() || p.price} [Category: ${p.category}]. ${p.description ? p.description.substring(0, 100) : ''}...\n`;
          });
        }

        if (matchedBoutiques.length > 0) {
          dbContext += '\nLIVE MATCHING BOUTIQUES:\n';
          matchedBoutiques.forEach((b) => {
            dbContext += `- "${b.name}": ${b.description ? b.description.substring(0, 100) : 'Premier Fashion Atelier'}...\n`;
          });
        }
      } catch (dbErr) {
        console.warn('[Chatbot RAG Query Notice]:', dbErr.message);
      }
    }

    // 2. Groq LLM Generation with Strict Grounding
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1',
        });

        const candidateModels = await getAvailableGroqModels(groq);

        const systemPrompt = `You are "Stitchie", the dedicated and intelligent AI fashion assistant exclusively for "Auto Stitch".

${AUTO_STITCH_KNOWLEDGE}

LIVE DATABASE SEARCH RESULTS FOR THIS QUERY:
${dbContext || 'No specific catalog items directly matched these keywords; refer to general platform capabilities, catalogue (/catalogue), VTO (/try-on), and customization (/customize).'}

STRICT OPERATING RULES:
1. DOMAIN BOUNDARY (ABSOLUTE): You ONLY answer questions directly about Auto Stitch, its products, boutiques, custom tailoring, virtual try-on, ordering, pricing, installment plans, and fashion styling on the platform.
2. OUT-OF-DOMAIN REFUSAL: If a user asks ANYTHING outside Auto Stitch (e.g., general programming, math, world history, geography, other websites, politics, cooking, non-fashion trivia), you MUST decline politely and return:
"${OUT_OF_DOMAIN_RESPONSE}"
3. ACCURACY: Always quote prices in PKR when referencing products, and mention specific platform paths (e.g. /catalogue, /try-on, /customize, /bids, /orders, /track) so users can navigate easily.
4. TONE: Luxurious, courteous, stylish, and concise (max 3-4 clear sentences or structured bullet points).`;

        for (const modelName of candidateModels) {
          try {
            const completion = await groq.chat.completions.create({
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: trimmedMessage },
              ],
              temperature: 0.6,
              max_tokens: 300,
            });

            const reply = completion?.choices?.[0]?.message?.content?.trim();
            if (reply) {
              return res.json({ success: true, reply });
            }
          } catch (modelErr) {
            console.log(`[Groq Model Notice] ${modelName}: ${modelErr.message}, trying next candidate...`);
          }
        }
      } catch (groqInitErr) {
        console.warn('[Groq Client Notice]:', groqInitErr.message);
      }
    }

    // 3. Dynamic Fallback strictly grounded in Auto Stitch
    const smartReply = generateSmartFallback(trimmedMessage, matchedProducts, matchedBoutiques);
    return res.json({ success: true, reply: smartReply });
  } catch (error) {
    console.error('Chatbot Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'I am temporarily unable to stitch together an answer. Please try again shortly.',
    });
  }
};

module.exports = { getChatbotResponse };
