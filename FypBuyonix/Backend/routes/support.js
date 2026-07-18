const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/supportTicket');
const { sendSupportReplyEmail } = require('../utils/emailService');

// POST /support/create — Submit a new ticket
router.post('/create', async (req, res) => {
    try {
        const { senderType, senderId, senderName, senderEmail, subject, category, priority, message } = req.body;

        if (!senderType || !senderId || !senderName || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const ticket = new SupportTicket({
            senderType,
            senderId,
            senderName,
            senderEmail: senderEmail || '',
            subject,
            category: category || 'Other',
            priority: priority || 'Medium',
            messages: [{
                sender: 'customer',
                text: message,
                time: new Date()
            }]
        });

        await ticket.save();

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket: {
                id: ticket.ticketId,
                subject: ticket.subject,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ success: false, message: 'Error creating ticket' });
    }
});

// GET /support/queries — Get all tickets (admin)
router.get('/queries', async (req, res) => {
    try {
        const { senderType, status } = req.query;
        const filter = {};

        if (senderType && senderType !== 'all') {
            filter.senderType = senderType;
        }
        if (status && status !== 'all') {
            filter.status = status;
        }

        const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });

        const formatted = tickets.map(t => ({
            id: t.ticketId,
            issue: t.subject,
            customer: t.senderName,
            email: t.senderEmail,
            senderType: t.senderType,
            priority: t.priority,
            status: t.status,
            category: t.category,
            date: t.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            messages: t.messages.map(m => ({
                sender: m.sender,
                text: m.text,
                time: m.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            }))
        }));

        res.json({ success: true, tickets: formatted });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ success: false, message: 'Error fetching tickets' });
    }
});

// GET /support/my-tickets — Get tickets for a specific user/seller
router.get('/my-tickets', async (req, res) => {
    try {
        const { senderId, senderType } = req.query;

        if (!senderId || !senderType) {
            return res.status(400).json({ success: false, message: 'senderId and senderType are required' });
        }

        const tickets = await SupportTicket.find({ senderId, senderType }).sort({ createdAt: -1 });

        const formatted = tickets.map(t => ({
            id: t.ticketId,
            subject: t.subject,
            category: t.category,
            priority: t.priority,
            status: t.status,
            date: t.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            messages: t.messages.map(m => ({
                sender: m.sender,
                text: m.text,
                time: m.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            }))
        }));

        res.json({ success: true, tickets: formatted });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ success: false, message: 'Error fetching tickets' });
    }
});

// POST /support/:ticketId/reply — Reply to a ticket
router.post('/:ticketId/reply', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { text, sender } = req.body;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Reply text is required' });
        }

        const ticket = await SupportTicket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        ticket.messages.push({
            sender: sender || 'agent',
            text,
            time: new Date()
        });

        // Auto-update status to In Progress if admin replies on an Open ticket
        if (sender === 'agent' && ticket.status === 'Open') {
            ticket.status = 'In Progress';
        }

        await ticket.save();

        // Send email notification asynchronously (don't block response)
        if (sender === 'agent' && ticket.senderEmail) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const viewUrl = ticket.senderType === 'seller'
                ? `${frontendUrl}/seller-support`
                : `${frontendUrl}/support`;

            sendSupportReplyEmail(
                ticket.senderEmail,
                ticket.senderName,
                ticket.ticketId,
                ticket.subject,
                text.substring(0, 100),
                viewUrl
            ).catch(err => console.error('Support email notification error:', err));
        }

        res.json({
            success: true,
            message: 'Reply added successfully',
            ticket: {
                id: ticket.ticketId,
                status: ticket.status,
                messages: ticket.messages.map(m => ({
                    sender: m.sender,
                    text: m.text,
                    time: m.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                }))
            }
        });
    } catch (error) {
        console.error('Error replying to ticket:', error);
        res.status(500).json({ success: false, message: 'Error replying to ticket' });
    }
});

// PUT /support/:ticketId/status — Update ticket status
router.put('/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const ticket = await SupportTicket.findOneAndUpdate(
            { ticketId },
            { status },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        res.json({
            success: true,
            message: 'Status updated',
            ticket: { id: ticket.ticketId, status: ticket.status }
        });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ success: false, message: 'Error updating status' });
    }
});

// Product Types catalog mapping for dynamic accessory searches
const productTypes = [
    { name: 'cover', pattern: /cover|case|pouch|shell/i },
    { name: 'cable', pattern: /cable|cord|wire|charger/i },
    { name: 'watch', pattern: /watch|band/i },
    { name: 'shoes', pattern: /shoe|sneaker|boot|slipper|croc/i },
    { name: 'headphones', pattern: /headphone|earbud|airbud|headset|earphone/i },
    { name: 'bag', pattern: /bag|pack|pouch/i },
    { name: 'book', pattern: /book|manual/i },
    { name: 'ball', pattern: /ball|bat|racket/i }
];

// Category mapping for local chatbot fallback
const categoryMapping = {
    'Footwear': ['shoe', 'shoes', 'shoewear', 'footwear', 'boots', 'sneakers', 'sandals', 'slippers', 'heels', 'loafers', 'trainers'],
    'Sports': ['sports', 'sportswear', 'athletic', 'gym', 'fitness', 'workout', 'activewear', 'sports item', 'skateboard', 'hockey', 'cricket', 'football', 'basketball', 'volleyball', 'baseball', 'tennis', 'badminton'],
    'Books': ['book', 'books', 'novel', 'novels', 'textbook', 'ebook', 'reading'],
    'Toys': ['toy', 'toys', 'game', 'games', 'gaming', 'video game', 'board game', 'console', 'playstation', 'xbox', 'rubik'],
    'Clothing': ['apparel', 'clothes', 'clothing', 'dress', 'shirt', 'pants', 'trousers', 'top', 'wear', 'fabric', 'jeans', 'jacket', 'hoodie', 'sweater', 'shalwar', 'kameez', 'kurta'],
    'Electronics': ['electronic', 'electronics', 'phone', 'laptop', 'computer', 'gadget', 'device', 'tablet', 'tv', 'camera'],
    'Accessories': ['accessories', 'phone accessories', 'phone case', 'charger', 'cable', 'screen protector', 'earphones', 'headphones', 'watch', 'bag', 'belt', 'wallet'],
    'Beauty': ['beauty', 'cosmetics', 'skincare', 'makeup', 'salon', 'personal care', 'lipstick', 'foundation', 'mascara'],
    'Home & Garden': ['home', 'garden', 'furniture', 'decor', 'home decor', 'gardening', 'fan', 'lamp', 'curtain'],
    'Jewelry': ['jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'diamond'],
};

// Check categories for local fallback
function extractCategory(message) {
    const lowerMessage = message.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryMapping)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            return category;
        }
    }
    return null;
}

// Clean product name search terms for local fallback
function extractProductName(message) {
    const removeWords = [
        'price', 'rate', 'cost', 'tell', 'give', 'show', 'what', 'how', 'much',
        'please', 'can', 'you', 'me', 'the', 'of', 'a', 'an', 'is', 'are', 'for',
        'available', 'availability', 'stock', 'find', 'search', 'get', 'want', 'all',
        'do', 'does', 'have', 'has', 'it', 'in', 'i', 'need', 'looking',
        'list', 'items', 'products', 'any', 'every', 'each', 'kinds', 'types',
        'this', 'that', 'these', 'those', 'there', 'here', 'about',
        'also', 'buy', 'purchase', 'got', 'some',
        'and', 'or', 'not', 'but', 'with', 'to', 'on', 'at',
        'ha', 'hai', 'hain', 'he', 'kya', 'kia', 'bhi', 'b', 'ko', 'ki', 'ka', 'ke', 'me', 'main', 'se', 'ya', 'tw', 'toh', 'nhi', 'nahi'
    ];
    let cleaned = message.toLowerCase();
    removeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    });
    return cleaned.replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
}

// Local helper to fetch products and answer questions when Gemini is offline/rate-limited
async function getLocalFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    const Product = require('../models/product');

    const detectedCategory = extractCategory(message);
    const productName = extractProductName(message);

    const isProductQuery = detectedCategory !== null || productName.length > 1 || 
                           ['price', 'rate', 'cost', 'available', 'stock', 'show', 'find', 'search'].some(w => lowerMessage.includes(w));

    if (isProductQuery) {
        try {
            let products = [];
            
            // Build tokenized keywords (handle dashes and spaces)
            const keywords = productName.replace(/-/g, ' ').split(/\s+/).filter(w => w.trim().length > 0);

            if (keywords.length > 0) {
                // 1. Prioritize name match containing ALL keywords (AND logic)
                const andQueries = keywords.map(kw => ({ name: new RegExp(kw, 'i') }));
                products = await Product.find({ status: 'active', $and: andQueries }).limit(5).lean();
            }

            // 2. If no products, search alternatives of the same product type
            let isAlternative = false;
            if (products.length === 0) {
                const matchedType = productTypes.find(t => t.pattern.test(lowerMessage));
                if (matchedType) {
                    isAlternative = true;
                    const otherKeywords = keywords.filter(kw => !matchedType.pattern.test(kw) && kw.length > 1);
                    let orQueries = [];
                    if (otherKeywords.length > 0) {
                        orQueries = otherKeywords.map(kw => ({ name: new RegExp(kw, 'i') }));
                    }

                    if (orQueries.length > 0) {
                        products = await Product.find({
                            status: 'active',
                            name: matchedType.pattern,
                            $or: orQueries
                        }).limit(5).lean();
                    }

                    if (products.length === 0) {
                        products = await Product.find({
                            status: 'active',
                            name: matchedType.pattern
                        }).limit(5).lean();
                    }
                } else if (keywords.length > 0) {
                    // General OR fallback
                    const longKeywords = keywords.filter(w => w.length > 1);
                    const queryKeywords = longKeywords.length > 0 ? longKeywords : keywords;
                    const orQueries = queryKeywords.map(kw => ({ name: new RegExp(kw, 'i') }));
                    products = await Product.find({ status: 'active', $or: orQueries }).limit(5).lean();
                }
            }

            // 3. Fallback to category if name query returns empty
            if (products.length === 0 && detectedCategory) {
                products = await Product.find({ status: 'active', category: new RegExp('^' + detectedCategory + '$', 'i') }).limit(5).lean();
            }

            if (products.length > 0) {
                let response = "";
                if (isAlternative) {
                    response += `⚠️ **Afsos, aap ka requested item available nahi hai. Lekin humare paas ye matching options available hain:**\n\n`;
                } else {
                    response += `🛍️ **Here are some matching products from our catalog:**\n\n`;
                }
                products.forEach((product, idx) => {
                    const priceDisplay = product.discount && product.originalPrice
                        ? `~~$${product.originalPrice}~~ **$${product.price}** (${product.discount}% OFF)`
                        : `**$${product.price}**`;
                    const availability = product.stock > 0 ? `✅ In Stock (${product.stock} available)` : '❌ Out of Stock';
                    response += `**${idx + 1}. ${product.name}**\n   💰 Price: ${priceDisplay}\n   📦 ${availability}\n   🔗 [View Product](/product/${product._id})\n\n`;
                });
                response += `🛒 Visit the **Shop** page to make a purchase!`;
                return response;
            }

            // Explicitly notify user if the searched product is not available in catalog
            return `🤖 **Buyonix AI Assistant:**\n\nAfsos, **"${productName}"** humare catalog mein available nahi hai. Please koi aur keyword try karein ya Shop page check karein!`;
        } catch (e) {
            console.error("Local product query fallback error:", e);
        }
    }

    // Platform QA local replies
    if (lowerMessage.includes('visual search') || lowerMessage.includes('image search')) {
      return "🔍 **Visual Search:**\n1. Click the camera icon 📷 in search bar\n2. Upload any product image\n3. AI will find similar products!";
    }
    if (lowerMessage.includes('bargain') || lowerMessage.includes('negotiate') || lowerMessage.includes('price lower')) {
      return "💰 **Smart Bargaining:**\n1. Go to any product page\n2. Click **'Smart Bargaining'** button\n3. Enter your offer price\n4. AI will accept, reject, or counter-offer!";
    }
    if (lowerMessage.includes('become seller') || lowerMessage.includes('sell products')) {
      return "🏪 **Become a Seller:**\n1. Click **'Become a Seller'** in navbar\n2. Fill in store details\n3. Submit for approval\n4. Add products and start selling!";
    }
    if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('easypaisa') || lowerMessage.includes('jazzcash')) {
      return "💳 **Payment Methods:**\n• **EasyPaisa / JazzCash** 📱\n• **Card** 💳 (Visa/Mastercard via Stripe)\n• **COD** 📦 (Cash on Delivery)";
    }
    if (lowerMessage.includes('track') || lowerMessage.includes('order status') || lowerMessage.includes('where is my order')) {
      return "📦 **Track Your Order:**\n1. Click profile icon\n2. Go to **'My Orders'**\n3. Click **'Track'** button next to your order.";
    }
    if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('cancel')) {
      return "↩️ **Returns & Refunds:**\n1. Go to **My Orders**\n2. Click **'Return'**\n3. Refund is processed within 2-3 business days.";
    }
    if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
      return "🚚 **Shipping Info:**\n• Delivery: 3-5 business days across Pakistan.\n• Free Shipping on orders above Rs. 5000!";
    }
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('greetings')) {
      return "👋 **Hello! Welcome to Buyonix!**\n\nI'm your AI assistant. Ask me about products, payments, bargaining, or shipping! How can I help you today?";
    }

    // General default fallback
    return "🤖 **Buyonix AI Assistant:**\n\nHow can I help you today? Try asking about:\n• **Visual Search**\n• **Bargaining**\n• **Payment Methods**\n• **Shipping & Delivery**\n• Or search products (e.g. type: *'cable'*, *'shirt'*, *'shoes'*)";
}
const searchProductsDeclaration = {
    name: "search_products",
    description: "Invoked to perform search / product matching on the store catalog for incomplete names, typos, categories, or descriptions. Returns matching product names and their corresponding MongoDB IDs.",
    parameters: {
        type: "OBJECT",
        properties: {
            query: {
                type: "STRING",
                description: "The search keyword, partial product name, or category term (e.g. 'c-type cable', 'iphone', 'shoes').",
            },
        },
        required: ["query"],
    },
};

const getProductDetailsDeclaration = {
    name: "get_product_details",
    description: "Invoked to get the exact real-time price, originalPrice, discount, category, and stock status for a specific product ID.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_id: {
                type: "STRING",
                description: "The 24-character hexadecimal MongoDB ObjectID of the product (retrieved from search_products).",
            },
        },
        required: ["product_id"],
    },
};

// Tool implementation functions
async function search_products(query) {
    const Product = require('../models/product');
    const keywords = query.replace(/-/g, ' ').split(/\s+/).filter(w => w.trim().length > 0);
    let products = [];

    if (keywords.length > 0) {
        // Try AND search
        const andQueries = keywords.map(kw => ({ name: new RegExp(kw, 'i') }));
        products = await Product.find({ status: 'active', $and: andQueries })
            .select('name _id')
            .lean()
            .limit(8);
    }

    let isAlternative = false;
    if (products.length === 0) {
        const matchedType = productTypes.find(t => t.pattern.test(query));
        if (matchedType) {
            isAlternative = true;
            const otherKeywords = keywords.filter(kw => !matchedType.pattern.test(kw) && kw.length > 1);
            let orQueries = [];
            if (otherKeywords.length > 0) {
                orQueries = otherKeywords.map(kw => ({ name: new RegExp(kw, 'i') }));
            }

            if (orQueries.length > 0) {
                products = await Product.find({
                    status: 'active',
                    name: matchedType.pattern,
                    $or: orQueries
                })
                .select('name _id')
                .lean()
                .limit(8);
            }

            if (products.length === 0) {
                products = await Product.find({
                    status: 'active',
                    name: matchedType.pattern
                })
                .select('name _id')
                .lean()
                .limit(8);
            }
        } else if (keywords.length > 0) {
            // Try OR search, filtering out short keywords
            const longKeywords = keywords.filter(w => w.length > 1);
            const queryKeywords = longKeywords.length > 0 ? longKeywords : keywords;
            const orQueries = queryKeywords.map(kw => ({ name: new RegExp(kw, 'i') }));
            products = await Product.find({ status: 'active', $or: orQueries })
                .select('name _id')
                .lean()
                .limit(8);
        }
    }

    return { 
        products: products.map(p => ({
            product_id: p._id.toString(),
            name: p.name
        })),
        isAlternative
    };
}

async function get_product_details(product_id) {
    const Product = require('../models/product');
    try {
        const product = await Product.findById(product_id)
            .select('name price originalPrice discount stock category')
            .lean();
        if (!product) {
            return { error: "Product not found" };
        }
        return {
            product_id: product._id.toString(),
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discount || 0,
            stock: product.stock,
            category: product.category,
            isAvailable: product.stock > 0
        };
    } catch (err) {
        return { error: "Failed to fetch details. Invalid product ID." };
    }
}

// POST /support/ai-chat — AI support chatbot using Google Gemini with dynamic Agentic RAG
router.post('/ai-chat', async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');

        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Initialize Gemini model with tools (Function Calling)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{
                functionDeclarations: [searchProductsDeclaration, getProductDetailsDeclaration]
            }],
            systemInstruction: `You operate on a strict RAG (Retrieval-Augmented Generation) framework. Your internal knowledge is frozen and potentially outdated. You are strictly forbidden from generating answers about product names, prices, or availability from your own memory. You MUST augment your knowledge context using the external retrieval tools provided below before generating any response.

### ROLE & OBJECTIVE
You are an expert E-Commerce Sales Assistant for Buyonix. Your job is to help users find products, check prices, and verify stock availability using real-time RAG data tools.

### TWO-STEP RAG WORKFLOW (CRITICAL)
Whenever a user asks about a product, you MUST execute this exact 2-step retrieval sequence to augment your generation context:

Step 1: SEMANTIC VECTOR RETRIEVAL (For Product Matching & Incomplete Names)
- If the user uses incomplete names, short forms, typos, or generic terms (e.g., "iphone", "iphne", "black hoodie"), immediately invoke the search_products(query) tool.
- Never guess the exact product variant yourself. Let the tool match the semantic context and return the correct Product ID and full title.
- If the vector search returns multiple variations, stop and ask the user to clarify first.

Step 2: REAL-TIME DATA RETRIEVAL (For Price & Stock)
- Once you have retrieved the exact Product ID from Step 1, you MUST immediately call the function get_product_details(product_id).
- This ensures your augmented generation context contains 100% accurate, real-time data.
- Combine the retrieved context from both steps to generate your final response. Always include a clickable link to the product details page in the format [View Product](/product/PRODUCT_ID) (where PRODUCT_ID is the matching product's ID, e.g. [View Product](/product/694443388fa561c9c5aedd8d)) under each recommended product.

### TONE & LANGUAGE
- Respond in conversational Roman Urdu/English (Hinglish), matching the user's friendly vibe.
- Keep responses short, accurate, and direct.

### GUARDRAILS (ANTI-HALLUCINATION)
- If the semantic retrieval tool doesn't find any product, say: "Mujhe is naam se koi product nahi mila. Kya aap thoda sahi naam bata sakte hain?"
- If the pricing retrieval tool fails, say: "Product toh mil gaya hai lekin is waqt system real-time price fetch nahi kar paa raha. Ma thodi dair me batata hoon." Never hallucinate a fake price.

### FEATURES INFORMATION
If they ask about platform features, explain them briefly:
- **Visual Search**: Click the camera icon in search bar to upload a photo and find matching products.
- **Smart Bargaining**: Go to any product page and click 'Smart Bargaining' to negotiate the price directly with our AI.`
        });

        // Format conversation history for Gemini chat structure
        // Filter out initial bot messages so history starts with a 'user' message
        const firstUserIdx = history.findIndex(h => h.sender === 'user');
        const relevantHistory = firstUserIdx !== -1 ? history.slice(firstUserIdx) : [];

        // Format and collapse consecutive messages of the same role to enforce alternation
        const formattedHistory = [];
        for (const msg of relevantHistory) {
            const role = msg.sender === 'user' ? 'user' : 'model';
            
            if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
                formattedHistory[formattedHistory.length - 1].parts[0].text += "\n" + msg.text;
            } else {
                formattedHistory.push({
                    role: role,
                    parts: [{ text: msg.text }]
                });
            }
        }

        const chat = model.startChat({
            history: formattedHistory
        });

        // Send the main user message to the chat
        let result = await chat.sendMessage(message);

        // Handle function call execution requests from Gemini
        let functionCalls = result.response.functionCalls;
        let loopLimit = 5; // Prevent infinite loops
        while (functionCalls && functionCalls.length > 0 && loopLimit > 0) {
            loopLimit--;
            const functionResponses = [];

            for (const call of functionCalls) {
                const { name, args } = call;
                let functionResult;

                if (name === "search_products") {
                    functionResult = await search_products(args.query);
                } else if (name === "get_product_details") {
                    functionResult = await get_product_details(args.product_id);
                }

                functionResponses.push({
                    functionResponse: {
                        name,
                        response: functionResult
                    }
                });
            }

            // Send tool output back to Gemini to complete response generation
            result = await chat.sendMessage(functionResponses);
            functionCalls = result.response.functionCalls;
        }

        const responseText = result.response.text();

        res.json({
            success: true,
            reply: responseText
        });

    } catch (error) {
        console.warn("AI Chat error (switching to local fallback):", error.message);
        try {
            const fallbackReply = await getLocalFallbackResponse(message);
            res.json({
                success: true,
                reply: fallbackReply,
                isFallback: true
            });
        } catch (fallbackError) {
            console.error("Critical chat error:", fallbackError);
            res.status(500).json({
                success: false,
                message: "Error getting AI response",
                error: error.message
            });
        }
    }
});

module.exports = router;
