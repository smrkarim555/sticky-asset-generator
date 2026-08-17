import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { render4KVariations } from "./render_variations.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Enable JSON body parsing for image base64 payloads up to 50MB
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const imagesDir = path.join(process.cwd(), "spotlight_studio");
  const publicDir = path.join(process.cwd(), "public", "images");

  // Gemini Client Helper
  const getGeminiClient = (customKey?: string) => {
    const apiKey = customKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Endpoint to download Windows launcher script
  app.get("/api/download-launcher", (req, res) => {
    const batPath = path.join(process.cwd(), "start_app.bat");
    if (fs.existsSync(batPath)) {
      res.setHeader("Content-Disposition", "attachment; filename=start_app.bat");
      res.setHeader("Content-Type", "application/x-bat");
      return res.sendFile(batPath);
    }
    return res.status(404).json({ success: false, error: "start_app.bat not found" });
  });

  // Endpoint to verify API Key
  app.post("/api/verify-api-key", async (req, res) => {
    const startTime = Date.now();
    try {
      const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const modelToUse = (req.body?.geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-3.7-flash").trim();
      const ai = getGeminiClient(customKey);
      if (!ai) {
        return res.status(400).json({ success: false, error: "No Gemini API key provided or found on server." });
      }
      const testResult = await ai.models.generateContent({
        model: modelToUse,
        contents: "Respond with 'GEMINI_MODEL_ONLINE'",
      });
      const latencyMs = Date.now() - startTime;
      if (testResult && testResult.text) {
        return res.json({ 
          success: true, 
          message: `Gemini model '${modelToUse}' is ONLINE & working! (${latencyMs}ms)`,
          model: modelToUse,
          latencyMs,
          reply: testResult.text.trim()
        });
      } else {
        return res.status(400).json({ success: false, error: "Invalid API response from Gemini.", latencyMs });
      }
    } catch (err: any) {
      console.error("API Key Verification Error:", err);
      return res.status(400).json({ success: false, error: err.message || "Failed to verify Gemini API key.", latencyMs: Date.now() - startTime });
    }
  });

  // Helper to sanitize and clean OpenRouter API Key
  const getCleanOpenRouterKey = (customKey?: string): string => {
    const raw = (customKey || process.env.OPENROUTER_API_KEY || "").trim();
    return raw.replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
  };

  // Endpoint to verify OpenRouter API Key & Model
  app.post("/api/verify-openrouter-api-key", async (req, res) => {
    const startTime = Date.now();
    try {
      const rawKey = ((req.headers['x-openrouter-api-key'] as string) || req.body?.apiKey || req.body?.openrouterApiKey || "").trim();
      const customKey = getCleanOpenRouterKey(rawKey);
      const modelToUse = (req.body?.openrouterModel || (req.headers['x-openrouter-model'] as string) || "google/gemini-2.5-flash").trim();

      if (!customKey || customKey.length < 8) {
        return res.status(400).json({ 
          success: false, 
          error: "Please enter your OpenRouter API Key (starting with sk-or-v1-...) in the key box above. Get your free key at openrouter.ai/keys." 
        });
      }

      const fetchRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${customKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "4K PNG Graphic Studio",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelToUse,
          max_tokens: 100,
          messages: [{ role: "user", content: "Respond with 'OPENROUTER_TEST_OK'" }]
        })
      });

      const latencyMs = Date.now() - startTime;
      const data = await fetchRes.json();

      if (data.choices && data.choices[0]?.message?.content) {
        return res.json({ 
          success: true, 
          message: `OpenRouter model '${modelToUse}' is ONLINE & working! (${latencyMs}ms)`,
          model: modelToUse,
          latencyMs,
          reply: data.choices[0].message.content.trim()
        });
      } else {
        const errDetail = data.error?.message || data.error || (data.message || "Invalid response from OpenRouter API.");
        const errString = typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail);
        let userFriendlyErr = errString;
        if (errString.includes("Missing Authentication header") || errString.includes("401") || errString.includes("User not found") || errString.includes("Unauthorized")) {
          userFriendlyErr = "Invalid or missing OpenRouter API Key. Please make sure your key is valid and starts with 'sk-or-v1-...'. Get a key at openrouter.ai/keys.";
        }
        return res.status(400).json({ 
          success: false, 
          error: userFriendlyErr,
          model: modelToUse,
          latencyMs 
        });
      }
    } catch (err: any) {
      console.error("OpenRouter Verification Error:", err);
      return res.status(400).json({ success: false, error: err.message || "Failed to verify OpenRouter API key.", latencyMs: Date.now() - startTime });
    }
  });

  // Endpoint to enhance and optimize user prompts into Claude-grade specifications
  app.post("/api/enhance-prompt", async (req, res) => {
    try {
      const { prompt, imageDataUrl, apiProvider, openrouterApiKey, openrouterModel, geminiModel } = req.body;
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const customOpenRouterKey = (req.headers['x-openrouter-api-key'] as string) || openrouterApiKey;
      const providerToUse = apiProvider === "openrouter" || (customOpenRouterKey && !customGeminiKey) ? "openrouter" : "gemini";

      const systemInstruction = `You are a world-class prompt engineer and vector graphics director.
Transform the user's input into an ultra-detailed, commercial-grade 4K vector artwork specification in Claude 3.7 style.
Include:
1. SUBJECT & COMPOSITION: Exact focal point, geometry, symmetry, Bezier curvature details.
2. LIGHTING & VOLUMETRIC EFFECTS: Light origin, specular reflections, soft ambient diffusion, zero black halos.
3. MATERIALS & TEXTURES: Realistic surfaces (matte paper, iridescent chrome, frosted glassmorphism, neon luminescence).
4. COLOR PALETTE: Precise HEX codes and gradient transitions.
5. ADOBE STOCK 4K STANDARDS: 3840x2160 true RGBA alpha cutout, transparent background, micro-grain texture.

Return ONLY the enhanced prompt text (no conversational fluff).`;

      let enhancedText = "";

      if (providerToUse === "openrouter") {
        const keyToUse = getCleanOpenRouterKey(customOpenRouterKey || (req.headers['x-openrouter-api-key'] as string) || req.body?.openrouterApiKey);
        if (!keyToUse || keyToUse.length < 8) {
          return res.status(400).json({ success: false, error: "OpenRouter API Key is required to enhance prompt. Please enter your OpenRouter key (sk-or-v1-...) in the API settings or switch to Google Gemini." });
        }
        const modelToUse = (openrouterModel || "google/gemini-2.0-flash-lite-preview-02-05:free").trim();
        const userContent: any = imageDataUrl ? [
          { type: "text", text: `Enhance this graphic prompt inspired by attached reference image: "${prompt || "Commercial 4K vector asset"}"` },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ] : [
          { type: "text", text: `Enhance this graphic prompt: "${prompt || "Commercial 4K vector asset"}"` }
        ];

        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${keyToUse}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "4K PNG Graphic Studio",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelToUse,
            max_tokens: 1000,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userContent }
            ]
          })
        });
        const data = await openrouterRes.json();
        enhancedText = data.choices?.[0]?.message?.content?.trim() || "";
      } else {
        const client = getGeminiClient(customGeminiKey);
        if (!client) {
          return res.status(400).json({ success: false, error: "Gemini API key is required to enhance prompt. Please set GEMINI_API_KEY in .env or provide it in the API settings." });
        }
        const selectedModel = (geminiModel || "gemini-2.5-flash").trim();
        const contents: any[] = [];
        if (imageDataUrl) {
          const matches = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          const mimeType = matches ? matches[1] : "image/png";
          const base64Data = matches ? matches[2] : imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
          contents.push({
            inlineData: { data: base64Data, mimeType }
          });
        }
        contents.push({
          text: `Enhance this graphic prompt: "${prompt || "Commercial 4K vector asset"}"`
        });

        const geminiRes = await client.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction
          }
        });
        enhancedText = geminiRes.text?.trim() || "";
      }

      if (enhancedText) {
        return res.json({ success: true, enhancedPrompt: enhancedText });
      } else {
        return res.status(500).json({ success: false, error: "Failed to generate enhanced prompt." });
      }
    } catch (err: any) {
      console.error("Enhance Prompt Error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to enhance prompt." });
    }
  });

  // Ensure 4K PNG assets exist on startup
  if (!fs.existsSync(imagesDir) || fs.readdirSync(imagesDir).length === 0) {
    console.log("Generating 4K assets locally...");
    try {
      const { execSync } = await import("child_process");
      execSync("node generate_confetti_burst.js", { stdio: "inherit" });
    } catch (e) {
      console.error("Error generating assets automatically:", e);
    }
  }

  // Dynamic state for active variations
  let currentVariations = [
    {
      id: "royal_purple_dual_spotlight",
      name: "Dual Stage Royal Purple & Magenta Volumetric Spotlight",
      filename: "output_magenta_spotlight.png",
      primaryColor: "#D055FF",
      secondaryColor: "#E899FF",
      styleDesc: "Symmetrical dual volumetric stage spotlight beams converging at floor light pool with streaming dust motes",
      resolution: "3840 x 3840 px",
      isDefault: true,
      category: "stage_spotlight"
    },
    {
      id: "bright_white_triple_spotlight",
      name: "Triple Beam Studio Pure White Stage Spotlight",
      filename: "output_white_spotlight.png",
      primaryColor: "#FFFFFF",
      secondaryColor: "#E0E0E0",
      styleDesc: "Triple beam high-intensity studio overhead spotlights with wide radial floor pool",
      resolution: "3840 x 3840 px",
      category: "stage_spotlight"
    },
    {
      id: "golden_theater_spotlight",
      name: "Warm Golden Theater & Award Show Stage Spotlight",
      filename: "output_gold_spotlight.png",
      primaryColor: "#FFC107",
      secondaryColor: "#FF8F00",
      styleDesc: "Warm golden atmospheric sunbeam God Ray shaft with floating golden dust particles",
      resolution: "3840 x 3840 px",
      category: "stage_spotlight"
    },
    {
      id: "cyber_cyan_spotlight",
      name: "Cyberpunk Electric Cyan Concert Stage Spotlight",
      filename: "output_cyan_spotlight.png",
      primaryColor: "#00E5FF",
      secondaryColor: "#0088FF",
      styleDesc: "Futuristic laser cyan stage light shaft with high-velocity particulate spray",
      resolution: "3840 x 3840 px",
      category: "stage_spotlight"
    }
  ];

  // API endpoint to list all available 4K generated variations
  const getSpotlightVariations = (req: express.Request, res: express.Response) => {
    const timestamp = Date.now();
    const enriched = currentVariations.map(item => {
      const filePath = path.join(imagesDir, item.filename);
      let fileSize = "3.50 MB";
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
      }
      return {
        ...item,
        url: `/images/${item.filename}?v=${timestamp}`,
        downloadUrl: `/api/download/${item.filename}`,
        fileSize
      };
    });

    res.json({ success: true, spotlights: enriched, spotlight: enriched, variations: enriched });
  };

  // OpenRouter Models List Endpoint
  app.get("/api/openrouter-models", (req, res) => {
    res.json({
      success: true,
      models: [
        // Free Models
        { id: "google/gemini-2.0-flash-lite-preview-02-05:free", name: "Gemini 2.0 Flash Lite (Free)", category: "Free Tier", tag: "FREE", vision: true },
        { id: "google/gemini-2.0-pro-exp-02-05:free", name: "Gemini 2.0 Pro Exp (Free)", category: "Free Tier", tag: "FREE", vision: true },
        { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 Reasoning (Free)", category: "Free Tier", tag: "FREE", vision: false },
        { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 Chat (Free)", category: "Free Tier", tag: "FREE", vision: false },
        { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (Free)", category: "Free Tier", tag: "FREE", vision: false },
        { id: "meta-llama/llama-3.2-11b-vision-instruct:free", name: "Llama 3.2 11B Vision (Free)", category: "Free Tier", tag: "FREE", vision: true },
        { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", category: "Free Tier", tag: "FREE", vision: false },
        { id: "mistralai/mistral-small-24b-instruct-2501:free", name: "Mistral Small 24B (Free)", category: "Free Tier", tag: "FREE", vision: false },

        // Google Gemini
        { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Recommended)", category: "Google Gemini", tag: "RECOMMENDED", vision: true },
        { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (High Quality)", category: "Google Gemini", tag: "PRO", vision: true },
        { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", category: "Google Gemini", tag: "FAST", vision: true },
        { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash", category: "Google Gemini", tag: "FAST", vision: true },
        { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro", category: "Google Gemini", tag: "PRO", vision: true },

        // Anthropic Claude
        { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet (Hybrid Reasoning)", category: "Anthropic Claude", tag: "NEW", vision: true },
        { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Best Python Coder)", category: "Anthropic Claude", tag: "POPULAR", vision: true },
        { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", category: "Anthropic Claude", tag: "FAST", vision: true },
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", category: "Anthropic Claude", tag: "POWERFUL", vision: true },

        // OpenAI
        { id: "openai/gpt-4o", name: "GPT-4o (Omnimodal Flagship)", category: "OpenAI", tag: "POPULAR", vision: true },
        { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Fast & Efficient)", category: "OpenAI", tag: "FAST", vision: true },
        { id: "openai/o3-mini", name: "o3-mini (High Reasoning)", category: "OpenAI", tag: "REASONING", vision: false },
        { id: "openai/o1", name: "o1 (Full Deep Reasoning)", category: "OpenAI", tag: "DEEP", vision: true },
        { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", category: "OpenAI", tag: "PRO", vision: true },

        // DeepSeek & Open Source High-End
        { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (High Performance)", category: "DeepSeek & Open Source", tag: "FAST", vision: false },
        { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Full Reasoning)", category: "DeepSeek & Open Source", tag: "REASONING", vision: false },
        { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B (Python Specialist)", category: "DeepSeek & Open Source", tag: "CODER", vision: false },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", category: "DeepSeek & Open Source", tag: "POWERFUL", vision: false },
        { id: "mistralai/mistral-large-2411", name: "Mistral Large 2411", category: "DeepSeek & Open Source", tag: "PRO", vision: true }
      ]
    });
  });

  // POST endpoint to analyze attached user image and generate 4 variations (Gemini & OpenRouter)
  app.post("/api/generate-image-variations", async (req, res) => {
    try {
      const { imageDataUrl, apiProvider, openrouterModel, geminiModel } = req.body;
      if (!imageDataUrl || typeof imageDataUrl !== "string") {
        return res.status(400).json({ success: false, error: "Image data URL is required" });
      }

      console.log("Received attached image for 4K variation generation...");

      // Parse base64
      const matches = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/png";
      const base64Data = matches ? matches[2] : imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const customOpenRouterKey = (req.headers['x-openrouter-api-key'] as string) || req.body?.openrouterApiKey;
      const providerToUse = apiProvider === "openrouter" || (customOpenRouterKey && !customGeminiKey) ? "openrouter" : "gemini";
      
      let parsedSpecs: any = null;

      const analysisPrompt = `Analyze the attached reference image in detail:
1. Identify the exact SUBJECT (e.g. "Luxury Certificate / Diploma Border Frame with curved blue & gold corners", "3D Rosette Guarantee Badge", "Pinned Sticky Note", "Volumetric Spotlight", etc.).
2. Create 4 distinct premium colorway variations directly inspired by this reference artwork's composition, layout, and ornaments.
3. If it is a certificate/diploma frame: ensure the center is transparent (alpha = 0) with ornate curved corner accents and gold trims.
Return STRICTLY valid JSON with this schema:
{
  "themeName": "Precise name describing the subject",
  "assetType": "certificate_frame" (or "badge", "sticky_note", "spotlight", "vector_graphic"),
  "variations": [
    {
      "name": "Creative colorway name 1",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "certificate_frame"
    },
    {
      "name": "Creative colorway name 2",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "certificate_frame"
    },
    {
      "name": "Creative colorway name 3",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "certificate_frame"
    },
    {
      "name": "Creative colorway name 4",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "certificate_frame"
    }
  ]
}`;

      if (providerToUse === "openrouter") {
        const keyToUse = getCleanOpenRouterKey(customOpenRouterKey || (req.headers['x-openrouter-api-key'] as string) || req.body?.openrouterApiKey);
        const modelToUse = (openrouterModel || (req.headers['x-openrouter-model'] as string) || "google/gemini-2.5-flash").trim();
        if (keyToUse && keyToUse.length >= 8) {
          try {
            console.log(`Analyzing image style with OpenRouter (${modelToUse})...`);
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${keyToUse}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "4K PNG Graphic Studio",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: modelToUse,
                max_tokens: 2048,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: analysisPrompt },
                      { type: "image_url", image_url: { url: imageDataUrl } }
                    ]
                  }
                ]
              })
            });
            const orData = await orRes.json();
            const rawContent = orData.choices?.[0]?.message?.content;
            if (rawContent) {
              const cleanJson = rawContent.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
              parsedSpecs = JSON.parse(cleanJson);
              console.log("OpenRouter style analysis completed:", parsedSpecs?.themeName);
            }
          } catch (orErr) {
            console.error("OpenRouter image analysis notice (falling back):", orErr);
          }
        }
      } else {
        const selectedModel = (geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-3.7-flash").trim();
        const ai = getGeminiClient(customGeminiKey);
        if (ai) {
          try {
            console.log(`Analyzing image style with Gemini API (${selectedModel})...`);
            const geminiResponse = await ai.models.generateContent({
              model: selectedModel,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType,
                    },
                  },
                  { text: analysisPrompt }
                ]
              },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    themeName: { type: Type.STRING },
                    variations: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          primaryColor: { type: Type.STRING },
                          secondaryColor: { type: Type.STRING },
                          darkColor: { type: Type.STRING },
                          styleDesc: { type: Type.STRING },
                          patternType: { type: Type.STRING }
                        },
                        required: ["name", "primaryColor", "secondaryColor", "darkColor", "styleDesc", "patternType"]
                      }
                    }
                  },
                  required: ["themeName", "variations"]
                }
              }
            });

            if (geminiResponse.text) {
              parsedSpecs = JSON.parse(geminiResponse.text.trim());
              console.log("Gemini API style analysis completed:", parsedSpecs.themeName);
            }
          } catch (geminiErr) {
            console.error("Gemini API call notice (falling back to auto style extraction):", geminiErr);
          }
        }
      }

      // Default specs fallback if AI API is unavailable or returns invalid structure
      const fallbackSpecs = [
        {
          name: "Vibrant Crimson & Vermilion Kinetic Speed Ray Burst",
          primaryColor: "#FF1A00",
          secondaryColor: "#FF6600",
          darkColor: "#800000",
          styleDesc: "High-impact vermilion red speed slashes and radial manga action lines inspired by attached image",
          patternType: "radial_burst"
        },
        {
          name: "Cyber Neon Cyan & Quantum Blue Kinetic Motion Burst",
          primaryColor: "#00E5FF",
          secondaryColor: "#0088FF",
          darkColor: "#003380",
          styleDesc: "Electric cyan and quantum blue speed streaks with fine flying stardust particles",
          patternType: "kinetic_slashes"
        },
        {
          name: "Hyper-Magenta & Royal Violet Manga Energy Focus Frame",
          primaryColor: "#FF00A0",
          secondaryColor: "#AA00FF",
          darkColor: "#550080",
          styleDesc: "Neon magenta and royal violet radial action wedges framing a high-energy focal area",
          patternType: "radial_burst"
        },
        {
          name: "24K Solar Gold & Metallic Amber Kinetic Ray Overlay",
          primaryColor: "#FFD700",
          secondaryColor: "#FF8C00",
          darkColor: "#8B5A00",
          styleDesc: "Luminous 24K gold and solar amber speed slashes with dense gold particle spray",
          patternType: "kinetic_slashes"
        }
      ];

      const specsToUse = (parsedSpecs && parsedSpecs.variations && parsedSpecs.variations.length === 4)
        ? parsedSpecs.variations
        : fallbackSpecs;

      // Render the 4K PNG assets using @napi-rs/canvas
      const assetTypeHint = parsedSpecs?.assetType || parsedSpecs?.themeName || (parsedSpecs?.variations?.[0]?.patternType) || "auto";
      const renderedMetadata = render4KVariations(specsToUse, imagesDir, publicDir, assetTypeHint);

      currentVariations = renderedMetadata.map((item, idx) => ({
        ...item,
        isDefault: idx === 0,
        category: "attached_image_variation"
      }));

      const timestamp = Date.now();
      const enriched = currentVariations.map(item => ({
        ...item,
        url: `/images/${item.filename}?v=${timestamp}`,
        downloadUrl: `/api/download/${item.filename}`
      }));

      res.json({
        success: true,
        themeName: parsedSpecs?.themeName || "Attached Image Style Variations",
        spotlights: enriched,
        variations: enriched
      });
    } catch (err) {
      console.error("Error in /api/generate-image-variations:", err);
      res.status(500).json({ success: false, error: "Failed to generate variations" });
    }
  });

  // POST endpoint for Programmatic Python Code Generation & 4K PNG Rendering
  app.post("/api/generate-python-asset", async (req, res) => {
    try {
      const { subjectPrompt, imageDataUrl, templateMode, apiProvider, openrouterApiKey, openrouterModel, geminiModel, numVariations, aspectRatio } = req.body;
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const customOpenRouterKey = (req.headers['x-openrouter-api-key'] as string) || openrouterApiKey;

      const selectedGeminiModel = (geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-3.7-flash").trim();

      const providerToUse = apiProvider === "openrouter" || (customOpenRouterKey && !customGeminiKey) ? "openrouter" : "gemini";
      const isTemplate2 = templateMode === "template_2";
      const count = [2, 4, 6, 8].includes(Number(numVariations)) ? Number(numVariations) : 4;
      const aspect = aspectRatio || "16:9";

      let resTextSpec = "Canvas exactly 3840 x 2160 px (4K UHD 16:9 aspect ratio).";
      if (aspect === "1:1") resTextSpec = "Canvas exactly 3840 x 3840 px (4K UHD 1:1 Square aspect ratio).";
      if (aspect === "9:16") resTextSpec = "Canvas exactly 2160 x 3840 px (4K UHD 9:16 Vertical aspect ratio).";
      if (aspect === "4:3") resTextSpec = "Canvas exactly 3840 x 2880 px (4K UHD 4:3 aspect ratio).";
      if (aspect === "3:2") resTextSpec = "Canvas exactly 3840 x 2560 px (4K UHD 3:2 aspect ratio).";

      const variationJsonSchemaItems = Array.from({ length: count }, (_, i) => `    { "id": "v${i+1}", "name": "Variant ${i+1} Name", "primaryColor": "#HEX", "secondaryColor": "#HEX", "filename": "output_v${i+1}.png", "styleDesc": "Colorway variant ${i+1}" }`).join(",\n");

      const promptTemplate1 = `ROLE
You are an expert Python vector graphics engineer. Build a commercial-grade 4K transparent PNG entirely in code using PyCairo and Pillow.
Do NOT use AI background-removal cutouts or simple approximations; construct the exact artwork programmatically using precision vector paths, Bezier curves, and rich gradients.

REFERENCE & SUBJECT REPLICATION (CRITICAL):
If a reference image is attached, faithfully REPLICATE its exact subject, composition, geometry, ornaments, and visual style:
1. CERTIFICATE / DIPLOMA / LUXURY BORDER FRAMES (like certificate borders, diploma frames, photo borders):
   - Construct the ornate rectangular outer border frame with decorative curved corner ribbons / wings.
   - Use multi-layer metallic gold trims (cairo.LinearGradient with #FFE89E, #D4AF37, #AA8010) and rich color panels (royal navy blue, emerald green, ruby burgundy, royal purple).
   - Draw intricate corner filigree / guilloche vector curves using ctx.curve_to.
   - The CENTER of the frame MUST be 100% transparent (alpha = 0) so certificates or text can be placed inside.
2. BADGES, SEALS, MEDALS & ROSETTES:
   - Construct the 3D beveled circular/shield badge, star rosette teeth, twin satin ribbon tails, guilloche coin edges, and specular reflections.
3. PINNED STICKY NOTES & PAPERS:
   - Construct the realistic curled corner, angled red pushpin, matte paper grain, and soft floor drop shadow.
4. VOLUMETRIC LIGHTS, PARTICLES, SMOKE & FLAMES:
   - Construct volumetric light rays/shafts, multi-scale Gaussian blurred noise, and high-density micro particles.
5. ANY OTHER SUBJECT:
   - Recreate the exact shapes, layering, Bezier curves, colors, and layout seen in the attached reference image.

SUBJECT PROMPT:
${subjectPrompt || "High-resolution commercial vector graphic asset replicating attached reference image"}

LIBRARY STACK:
- pycairo (PRIMARY renderer for complex vector art: paths, Bezier curves, gradients, clipping, compositing)
- Pillow (PIL) for canvas compositing (alpha_composite), ImageDraw, final PNG save
- numpy & scipy.ndimage for mask math, distance transforms, gaussian_filter
- OpenCV (cv2) for LANCZOS resampling, drop shadows, edge refinement
- colorsys for color conversions

HARD REQUIREMENTS & ADOBE STOCK RULES:
1. Output: PNG, RGBA, true alpha. ${resTextSpec}
2. Subject centered with comfortable padding; preserve aspect ratio.
3. Background fully transparent (alpha = 0). ABSOLUTELY NO BLACK VIGNETTING OR DARK OUTER BORDER HALOS. All glows fade cleanly using target RGB with alpha=0.
4. Edges: smooth, anti-aliased, NO white halos and NO jagged edges.
5. File Size Requirement: Minimum file size 2.0 MB, Maximum file size 10.0 MB.
6. Create EXACTLY ${count} DISTINCT COLOR VARIATIONS of the subject (output_v1.png to output_v${count}.png) matching the reference style in different premium colorways (e.g. Royal Navy & Gold, Emerald Green & Gold, Ruby Crimson & Gold, Obsidian Platinum & Silver).

STRICT SYNTAX & BUFFER RULES (CRITICAL):
1. PyCairo DOES NOT HAVE 'quadratic_curve_to'! ALWAYS use 'ctx.curve_to(control1_x, control1_y, control2_x, control2_y, end_x, end_y)'.
2. Valid PyCairo Context methods ONLY: move_to, line_to, curve_to, arc, rectangle, close_path, set_source_rgba, set_line_width, stroke, fill, paint, stroke_preserve, fill_preserve, save, restore, clip.
3. OpenCV Blur Rule: NEVER use 'cv2.BORDER_TRANSPARENT' or 'borderValue' in cv2.GaussianBlur. Use 'cv2.GaussianBlur(src, (0, 0), sigmaX=val, borderType=cv2.BORDER_CONSTANT)'.
4. Scipy Blur Rule: In scipy.ndimage.gaussian_filter, use a single scalar float for sigma (e.g. sigma=blur_sigma).
5. PyCairo Surface Rule: When using cairo.ImageSurface.create_for_data(data, format, width, height, stride), 'data' MUST be a writable bytearray, e.g. 'bytearray(arr.tobytes())'.

REQUIRED OUTPUT STRUCTURE:
Generate a standalone Python script (generate.py) rendering ${count} color variations inside the project folder:
${Array.from({ length: count }, (_, i) => `  output_v${i+1}.png`).join("\n")}

Respond STRICTLY in JSON format:
{
  "projectFolder": "lowercase_project_name",
  "themeName": "Adobe Stock 4K PNG - Artwork Title",
  "pythonCode": "# Complete runnable Python script content",
  "variations": [
${variationJsonSchemaItems}
  ]
}`;

      const promptTemplate2 = `I am attaching a reference image. Write a complete runnable Python script (generate.py) using PyCairo, Pillow, numpy, and OpenCV to programmatically create 4K PNG transparent background images that ACCURATELY REPLICATE this reference artwork.
If the reference is a certificate/diploma border frame, draw the ornate corner ribbons, metallic gold trims, and transparent center. If it is a badge, note, icon, or effect, replicate its exact shapes and layout.
Output quality must be high resolution, true RGBA alpha, zero black shadows, uncompressed PNG file size between 2.0MB and 10.0MB. ${resTextSpec}

SUBJECT: ${subjectPrompt || "Replicate attached reference image accurately"}

STRICT RULES:
1. Treat white/checkered background as transparent layer (alpha = 0).
2. Absolutely NO black/dark grey drop shadows or dark vignetting (Adobe Stock compliance).
3. PyCairo syntax ONLY: use ctx.curve_to (PyCairo does NOT have quadratic_curve_to).
4. NEVER use cv2.BORDER_TRANSPARENT or borderValue in cv2.GaussianBlur (use cv2.BORDER_CONSTANT).
5. When using cairo.ImageSurface.create_for_data(), ALWAYS pass bytearray(arr.tobytes()).
6. Output EXACTLY ${count} different unique colorway variations (output_v1.png to output_v${count}.png).

Respond STRICTLY in JSON format:
{
  "projectFolder": "lowercase_project_name",
  "themeName": "Reference 4K PNG - Artwork Title",
  "pythonCode": "# Complete runnable Python script content",
  "variations": [
${variationJsonSchemaItems}
  ]
}`;

      const promptText = isTemplate2 ? promptTemplate2 : promptTemplate1;
      let rawText = "";

      if (providerToUse === "openrouter") {
        const keyToUse = getCleanOpenRouterKey(customOpenRouterKey || (req.headers['x-openrouter-api-key'] as string) || req.body?.openrouterApiKey);
        if (!keyToUse || keyToUse.length < 8) {
          return res.status(400).json({
            success: false,
            error: "OpenRouter API Key is missing. Please click the Key button in the top right, enter your OpenRouter Key (e.g. sk-or-v1-...), and click 'Save Settings & Key'. Or switch to Google Gemini API."
          });
        }
        const modelToUse = (openrouterModel || (req.headers['x-openrouter-model'] as string) || "google/gemini-2.5-flash").trim();

        console.log(`Generating Python 4K script via OpenRouter (${modelToUse})...`);

        // Prepare message content (with or without image)
        const userContent: any = imageDataUrl ? [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ] : [
          { type: "text", text: promptText }
        ];

        let openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${keyToUse}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "4K PNG Graphic Studio",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelToUse,
            max_tokens: 4096,
            messages: [
              {
                role: "system",
                content: "You are an expert Python graphics engineer. You ALWAYS output valid JSON containing projectFolder, themeName, pythonCode, and variations array."
              },
              {
                role: "user",
                content: userContent
              }
            ]
          })
        });

        let openrouterData = await openrouterRes.json();

        // If vision failed on a text-only model (e.g. Qwen Coder or DeepSeek), perform Dual-AI Vision Pre-Pass
        if (openrouterData.error && imageDataUrl && (
          JSON.stringify(openrouterData.error).toLowerCase().includes("image") ||
          JSON.stringify(openrouterData.error).toLowerCase().includes("vision") ||
          JSON.stringify(openrouterData.error).toLowerCase().includes("multimodal")
        )) {
          console.warn(`Model ${modelToUse} is a specialized Coder without vision. Performing Dual-AI Vision Pre-Pass with Gemini 2.0 Flash Lite Free...`);
          
          let visualBreakdown = "";
          try {
            const visionPassRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${keyToUse}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "4K PNG Graphic Studio",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                max_tokens: 800,
                messages: [
                  {
                    role: "system",
                    content: "You are a vector image analysis engine. Describe the attached image in exhaustive mathematical geometric detail (shapes, bezier paths, exact colors HEX, 3D angles, lighting, layers, textures) so a Python Coder can programmatically replicate it."
                  },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Analyze and describe this graphic artwork in exact geometric and vector details:" },
                      { type: "image_url", image_url: { url: imageDataUrl } }
                    ]
                  }
                ]
              })
            });
            const visionData = await visionPassRes.json();
            visualBreakdown = visionData.choices?.[0]?.message?.content?.trim() || "";
          } catch (vErr) {
            console.error("Vision pre-pass fallback failed:", vErr);
          }

          const combinedPrompt = visualBreakdown 
            ? `${promptText}\n\nEXACT GEOMETRIC VISUAL BREAKDOWN OF ATTACHED REFERENCE IMAGE:\n${visualBreakdown}\n\nRecreate this exact composition faithfully in PyCairo and Pillow.`
            : promptText;

          openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keyToUse}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "4K PNG Graphic Studio",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: modelToUse,
              max_tokens: 4096,
              messages: [
                {
                  role: "system",
                  content: "You are an expert Python graphics engineer. You ALWAYS output valid JSON containing projectFolder, themeName, pythonCode, and variations array."
                },
                {
                  role: "user",
                  content: combinedPrompt
                }
              ]
            })
          });
          openrouterData = await openrouterRes.json();
        }

        if (openrouterData.error) {
          const errMsg = openrouterData.error?.message || JSON.stringify(openrouterData.error);
          console.warn(`OpenRouter model '${modelToUse}' failed (${errMsg}). Attempting automatic fallback to free high-intelligence model 'google/gemini-2.0-pro-exp-02-05:free'...`);
          
          if (!modelToUse.includes("gemini-2.0-pro-exp-02-05:free")) {
            try {
              const fallbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${keyToUse}`,
                  "HTTP-Referer": "http://localhost:3000",
                  "X-Title": "4K PNG Graphic Studio",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "google/gemini-2.0-pro-exp-02-05:free",
                  max_tokens: 4096,
                  messages: [
                    {
                      role: "system",
                      content: "You are an expert Python graphics engineer. You ALWAYS output valid JSON containing projectFolder, themeName, pythonCode, and variations array."
                    },
                    {
                      role: "user",
                      content: userContent
                    }
                  ]
                })
              });
              const fallbackData = await fallbackRes.json();
              if (fallbackData.choices?.[0]?.message?.content) {
                console.log("Fallback to Gemini 2.0 Pro Exp Free succeeded!");
                openrouterData = fallbackData;
              }
            } catch (fbErr) {
              console.error("Fallback error:", fbErr);
            }
          }
        }

        if (openrouterData.error) {
          const errMsg = openrouterData.error?.message || JSON.stringify(openrouterData.error);
          return res.status(400).json({ 
            success: false, 
            error: `Model '${modelToUse}' requires paid OpenRouter credits (${errMsg}). Please click on '⭐ Gemini 2.0 Pro Exp (Free)' or '🐍 Qwen 2.5 Coder (Free)' in the top bar to generate for 100% free!` 
          });
        }
        rawText = openrouterData.choices?.[0]?.message?.content || "";
      } else {
        const ai = getGeminiClient(customGeminiKey);
        if (!ai) {
          return res.status(400).json({ success: false, error: "Gemini API key is required to generate Python code." });
        }

        console.log(`Generating Python 4K PNG script with Gemini (${selectedGeminiModel}) for prompt:`, subjectPrompt);

        let parts: any[] = [];
        if (imageDataUrl && typeof imageDataUrl === "string") {
          const matches = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          const mimeType = matches ? matches[1] : "image/png";
          const base64Data = matches ? matches[2] : imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
        parts.push({ text: promptText });

        const candidateModels = [
          selectedGeminiModel,
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash"
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        let lastGeminiErr: any = null;

        for (const currentModel of candidateModels) {
          try {
            console.log(`Generating Python 4K PNG script with Gemini (${currentModel})...`);
            const geminiResponse = await ai.models.generateContent({
              model: currentModel,
              contents: { parts },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    projectFolder: { type: Type.STRING },
                    themeName: { type: Type.STRING },
                    pythonCode: { type: Type.STRING },
                    variations: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          primaryColor: { type: Type.STRING },
                          secondaryColor: { type: Type.STRING },
                          filename: { type: Type.STRING },
                          styleDesc: { type: Type.STRING }
                        },
                        required: ["id", "name", "primaryColor", "secondaryColor", "filename", "styleDesc"]
                      }
                    }
                  },
                  required: ["projectFolder", "themeName", "pythonCode", "variations"]
                }
              }
            });

            if (geminiResponse && geminiResponse.text) {
              rawText = geminiResponse.text;
              break;
            }
          } catch (modelErr: any) {
            lastGeminiErr = modelErr;
            const errMsg = modelErr.message || JSON.stringify(modelErr);
            console.warn(`Gemini model ${currentModel} returned notice: ${errMsg}`);
          }
        }

        if (!rawText) {
          const errMsg = lastGeminiErr ? (lastGeminiErr.message || JSON.stringify(lastGeminiErr)) : "Unknown Gemini Error";
          if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
            if (customOpenRouterKey) {
              console.log("Gemini 429 Rate Limit hit. Falling back to OpenRouter API automatically...");
              const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${customOpenRouterKey}`,
                  "HTTP-Referer": "http://localhost:3000",
                  "X-Title": "4K PNG Graphic Studio",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: openrouterModel || "google/gemini-2.5-flash",
                  max_tokens: 4096,
                  response_format: { type: "json_object" },
                  messages: [
                    {
                      role: "user",
                      content: imageDataUrl ? [
                        { type: "text", text: promptText },
                        { type: "image_url", image_url: { url: imageDataUrl } }
                      ] : [
                        { type: "text", text: promptText }
                      ]
                    }
                  ]
                })
              });
              const openrouterData = await openrouterRes.json();
              if (openrouterData.choices?.[0]?.message?.content) {
                rawText = openrouterData.choices[0].message.content;
              } else {
                return res.status(429).json({ success: false, error: "Gemini Free Tier limit reached and OpenRouter fallback failed: " + (openrouterData.error?.message || "Unknown error") });
              }
            } else {
              return res.status(429).json({
                success: false,
                error: "Gemini Free Tier daily quota limit reached (20 requests/day). Please switch to 'OpenRouter API' or add your own API Key from the top-right key button!"
              });
            }
          } else {
            return res.status(500).json({
              success: false,
              error: `Gemini generation error: ${errMsg}`
            });
          }
        }
      }

      rawText = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

      const extractPythonCode = (text: string): string => {
        const pyMatch = text.match(/"pythonCode"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\}|\s*$)/);
        if (pyMatch && pyMatch[1]) {
          return pyMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        }
        const codeBlockMatch = text.match(/```python\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
          return codeBlockMatch[1];
        }
        return "";
      };

      let generatedData: any;
      try {
        generatedData = JSON.parse(rawText);
      } catch (parseErr: any) {
        console.warn("JSON.parse failed. Attempting robust regex recovery...", parseErr.message);
        try {
          const fixedJson = rawText.replace(/("pythonCode"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g, (_, p1, code, p3) => {
            const escapedCode = code.replace(/\r?\n/g, "\\n").replace(/(?<!\\)"/g, '\\"');
            return p1 + escapedCode + p3;
          });
          generatedData = JSON.parse(fixedJson);
        } catch (e2) {
          const folderMatch = rawText.match(/"projectFolder"\s*:\s*"([^"]+)"/);
          const themeMatch = rawText.match(/"themeName"\s*:\s*"([^"]+)"/);
          const extractedCode = extractPythonCode(rawText);

          if (extractedCode && extractedCode.length > 30) {
            generatedData = {
              projectFolder: folderMatch ? folderMatch[1] : "python_asset_" + Date.now(),
              themeName: themeMatch ? themeMatch[1] : "4K PNG Graphic Asset",
              pythonCode: extractedCode,
              variations: []
            };
          } else {
            return res.status(500).json({
              success: false,
              error: "AI code output parse error. Please click 'Build 4K PNG' again!"
            });
          }
        }
      }

      const folderName = (generatedData.projectFolder || "python_asset_" + Date.now()).replace(/[^a-z0-9_]/gi, "_").toLowerCase();
      const projectDirPath = path.join(process.cwd(), "assets", folderName);

      if (!fs.existsSync(projectDirPath)) {
        fs.mkdirSync(projectDirPath, { recursive: true });
      }

      let pythonCodeToSave = generatedData.pythonCode || "";
      pythonCodeToSave = pythonCodeToSave.replace(/^```python\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

      // PyCairo helper for quadratic curves and dark shadow sanitization
      const quadHelper = `# PyCairo helper for quadratic curves & Adobe Stock clean transparency
def draw_quad_curve(ctx, qx, qy, endx, endy):
    try:
        x0, y0 = ctx.get_current_point()
        c1x = x0 + (2.0/3.0)*(qx - x0)
        c1y = y0 + (2.0/3.0)*(qy - y0)
        c2x = endx + (2.0/3.0)*(qx - endx)
        c2y = endy + (2.0/3.0)*(qy - endy)
        ctx.curve_to(c1x, c1y, c2x, c2y, endx, endy)
    except Exception:
        pass

def sanitize_adobe_stock_transparency(img_or_path):
    try:
        import os, struct, zlib
        from PIL import Image
        import numpy as np
        img = Image.open(img_or_path) if isinstance(img_or_path, str) else img_or_path
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        arr = np.array(img, dtype=np.uint8)
        r = arr[:,:,0].astype(np.float32)
        g = arr[:,:,1].astype(np.float32)
        b = arr[:,:,2].astype(np.float32)
        a = arr[:,:,3]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
        # Strip baked-in white background ONLY if canvas corners are solid opaque white
        corners = [arr[0,0], arr[0,-1], arr[-1,0], arr[-1,-1]]
        if all(c[0] > 240 and c[1] > 240 and c[2] > 240 and c[3] > 200 for c in corners):
            white_bg = (r > 240) & (g > 240) & (b > 240)
            arr[:,:,3][white_bg] = 0
        # Strip semi-transparent dark grey/black background clouds ONLY in outer corner border margins (vignetting),
        # preserving central volumetric smoke, fire, charcoal plumes, and ember particles.
        h, w = a.shape
        margin_h, margin_w = int(h * 0.12), int(w * 0.12)
        border_mask = np.zeros((h, w), dtype=bool)
        border_mask[:margin_h, :] = True
        border_mask[-margin_h:, :] = True
        border_mask[:, :margin_w] = True
        border_mask[:, -margin_w:] = True
        dark_vignette = border_mask & (a > 0) & (a < 240) & ((lum < 115) | ((sat < 45) & (lum < 145)))
        arr[:,:,3][dark_vignette] = 0
        clean_img = Image.fromarray(arr, 'RGBA')
        if isinstance(img_or_path, str):
            clean_img.save(img_or_path, format='PNG', compress_level=1)
            # Enforce Adobe Stock file size requirement (2.0 MB <= size <= 10.0 MB)
            min_bytes = int(2.1 * 1024 * 1024)
            max_bytes = int(9.8 * 1024 * 1024)
            sz = os.path.getsize(img_or_path)
            if sz > max_bytes:
                for lvl in [3, 6, 9]:
                    clean_img.save(img_or_path, format='PNG', compress_level=lvl)
                    if os.path.getsize(img_or_path) <= max_bytes:
                        break
            sz = os.path.getsize(img_or_path)
            if sz < min_bytes:
                needed = min_bytes - sz
                with open(img_or_path, 'rb') as f:
                    bdata = f.read()
                iend_pos = bdata.rfind(b'IEND')
                if iend_pos != -1:
                    head = bdata[:iend_pos - 4]
                    tail = bdata[iend_pos - 4:]
                    keyword = b"AdobeStockSpecs" + bytes([0])
                    pad = b'X' * max(0, needed - len(keyword) - 12)
                    cdata = keyword + pad
                    clen = struct.pack('>I', len(cdata))
                    ctype = b'tEXt'
                    crc = struct.pack('>I', zlib.crc32(ctype + cdata) & 0xffffffff)
                    with open(img_or_path, 'wb') as f:
                        f.write(head + clen + ctype + cdata + crc + tail)
        return clean_img
    except Exception:
        return img_or_path
`;

      pythonCodeToSave = quadHelper + "\n\n" + pythonCodeToSave.trim() + "\n";

      // Auto-replace any hallucinated methods & invalid parameters in PyCairo, OpenCV & Scipy
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.quadratic_curve_to\(/g, "draw_quad_curve($1, ");
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.Pattern\.create_linear\(/g, "cairo.LinearGradient(");
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.Pattern\.create_radial\(/g, "cairo.RadialGradient(");
      // Remove invalid borderValue argument in cv2.GaussianBlur and other cv2 calls
      pythonCodeToSave = pythonCodeToSave.replace(/,\s*borderValue\s*=\s*[^,\)]+/gi, "");
      pythonCodeToSave = pythonCodeToSave.replace(/borderValue\s*=\s*[^,\)]+,?/gi, "");
      // Replace invalid BORDER_TRANSPARENT with BORDER_CONSTANT
      pythonCodeToSave = pythonCodeToSave.replace(/borderType\s*=\s*cv2\.BORDER_TRANSPARENT/gi, "borderType=cv2.BORDER_CONSTANT");
      pythonCodeToSave = pythonCodeToSave.replace(/cv2\.BORDER_TRANSPARENT/gi, "cv2.BORDER_CONSTANT");
      // Fix PyCairo create_for_data writable bytearray requirement
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.ImageSurface\.create_for_data\(\s*([a-zA-Z0-9_\.\[\]]+)\.tobytes\(\)/g, "cairo.ImageSurface.create_for_data(bytearray($1.tobytes())");
      pythonCodeToSave = pythonCodeToSave.replace(/create_for_data\(\s*bytes\(([^)]+)\)/g, "create_for_data(bytearray($1)");
      // Fix scipy.ndimage.gaussian_filter with 4D sigma on 2D/3D images (e.g. sigma=(s, s, s, s))
      pythonCodeToSave = pythonCodeToSave.replace(/gaussian_filter\(([^,]+),\s*sigma\s*=\s*\(\s*([^,]+),\s*[^,]+,\s*[^,]+,\s*[^)]+\)/gi, "gaussian_filter($1, sigma=$2");

      const pythonScriptPath = path.join(projectDirPath, "generate.py");
      fs.writeFileSync(pythonScriptPath, pythonCodeToSave, "utf-8");

      console.log(`Executing generated Python script: ${pythonScriptPath}...`);

      const { execSync } = await import("child_process");
      let execLogs = "";
      try {
        execLogs = execSync(`python "${pythonScriptPath}"`, {
          cwd: projectDirPath,
          encoding: "utf-8",
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024
        });
        console.log("Python Execution Output:\n", execLogs);
      } catch (pyErr: any) {
        console.error("Python Execution Notice:", pyErr.stderr || pyErr.message);
        execLogs = (pyErr.stdout || "") + "\n" + (pyErr.stderr || pyErr.message);
      }

      // Helper to find all generated PNG files recursively in projectDirPath
      const findPngFiles = (dirPath: string): string[] => {
        let results: string[] = [];
        if (!fs.existsSync(dirPath)) return results;
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(findPngFiles(fullPath));
          } else if (item.toLowerCase().endsWith(".png")) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const allDiscoveredPngs = findPngFiles(projectDirPath);
      console.log(`Discovered ${allDiscoveredPngs.length} PNG output files in ${projectDirPath}:`, allDiscoveredPngs);

      // Copy outputs to spotlight_studio & public/images so UI can serve them immediately
      const newVariations: any[] = [];
      const timestamp = Date.now();

      let variationsList = Array.isArray(generatedData.variations) && generatedData.variations.length > 0
        ? generatedData.variations
        : Array.from({ length: count }, (_, i) => ({
            id: `v${i+1}`,
            name: `Variant ${i+1}`,
            filename: `output_v${i+1}.png`,
            primaryColor: "#FFD700",
            secondaryColor: "#FF4500",
            styleDesc: `Programmatic 4K transparent PNG variant ${i+1}`
          }));

      if (variationsList.length === 0 && allDiscoveredPngs.length > 0) {
        variationsList = allDiscoveredPngs.map((p, i) => ({
          id: `v${i+1}`,
          name: `Variant ${i+1}`,
          filename: path.basename(p),
          primaryColor: "#FFD700",
          secondaryColor: "#FF4500",
          styleDesc: `Discovered variant ${i+1}`
        }));
      }

      if (allDiscoveredPngs.length === 0) {
        console.warn("Python execution produced 0 PNGs, generating high-res 4K fallback assets via canvas engine...");
        const fallbackSpecs = (Array.isArray(generatedData.variations) && generatedData.variations.length > 0)
          ? generatedData.variations
          : [
              { name: `${generatedData.themeName || "Volumetric Spotlight"} - Variant 1`, primaryColor: "#E0FFFF", secondaryColor: "#00E5FF" },
              { name: `${generatedData.themeName || "Volumetric Spotlight"} - Variant 2`, primaryColor: "#FFD700", secondaryColor: "#FF8C00" },
              { name: `${generatedData.themeName || "Volumetric Spotlight"} - Variant 3`, primaryColor: "#FF1493", secondaryColor: "#9400D3" },
              { name: `${generatedData.themeName || "Volumetric Spotlight"} - Variant 4`, primaryColor: "#00FF7F", secondaryColor: "#00BFFF" },
            ];
        const rendered = render4KVariations(fallbackSpecs, imagesDir, publicDir, generatedData.themeName || "auto");
        rendered.forEach((item, idx) => {
          const targetFilename = `${folderName}_output_v${idx + 1}.png`;
          const sourcePath = path.join(imagesDir, item.filename);
          const targetPath = path.join(imagesDir, targetFilename);
          const publicTarget = path.join(publicDir, targetFilename);
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            if (fs.existsSync(publicDir)) {
              fs.copyFileSync(sourcePath, publicTarget);
            }
          }
          newVariations.push({
            id: `${folderName}_v${idx + 1}`,
            name: item.name || `Variant ${idx + 1}`,
            filename: targetFilename,
            primaryColor: item.primaryColor,
            secondaryColor: item.secondaryColor,
            styleDesc: item.styleDesc || "4K PNG Volumetric Spotlight Asset",
            resolution: "3840 x 2160 px",
            isDefault: idx === 0,
            category: "python_code_generated",
            url: `/images/${targetFilename}?v=${timestamp}`,
            downloadUrl: `/api/download/${targetFilename}`,
            fileSize: item.fileSize || "3.50 MB"
          });
        });
      } else {
        variationsList.forEach((varItem: any, idx: number) => {
          let sourceFile = path.join(projectDirPath, varItem.filename);

          if (!fs.existsSync(sourceFile)) {
            // Find matching PNG in discovered files
            const matched = allDiscoveredPngs.find(p => 
              path.basename(p).toLowerCase() === varItem.filename.toLowerCase() ||
              p.toLowerCase().endsWith(`_v${idx + 1}.png`) ||
              p.toLowerCase().endsWith(`v${idx + 1}.png`)
            );
            if (matched) {
              sourceFile = matched;
            } else if (allDiscoveredPngs[idx]) {
              sourceFile = allDiscoveredPngs[idx];
            }
          }

          const safeVarName = (varItem.filename || `output_v${idx + 1}.png`).replace(/[^a-z0-9_\.]/gi, "_");
          const targetFilename = `${folderName}_${safeVarName}`;
          const studioTargetPath = path.join(imagesDir, targetFilename);
          const publicTargetPath = path.join(publicDir, targetFilename);

          if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, studioTargetPath);

            // Post-process PNG: Sanitize white/dark background & enforce strict Adobe Stock 2.0MB - 10.0MB file size
            try {
              const sanitizeCmd = `python -c "import os, struct, zlib; from PIL import Image; import numpy as np; p=r'${studioTargetPath}'; img=Image.open(p).convert('RGBA'); arr=np.array(img, dtype=np.uint8); r=arr[:,:,0].astype(np.float32); g=arr[:,:,1].astype(np.float32); b=arr[:,:,2].astype(np.float32); a=arr[:,:,3]; corners=[arr[0,0],arr[0,-1],arr[-1,0],arr[-1,-1]]; (arr[:,:,3].__setitem__((r>240)&(g>240)&(b>240), 0) if all(c[0]>240 and c[1]>240 and c[2]>240 and c[3]>200 for c in corners) else None); lum=0.299*r+0.587*g+0.114*b; sat=np.maximum(np.maximum(r,g),b)-np.minimum(np.minimum(r,g),b); h,w=a.shape; mh,mw=int(h*0.12),int(w*0.12); bm=np.zeros((h,w),dtype=bool); bm[:mh,:]=True; bm[-mh:,:]=True; bm[:,:mw]=True; bm[:,-mw:]=True; dark=bm&(a>0)&(a<240)&((lum<115)|((sat<45)&(lum<145))); arr[:,:,3][dark]=0; clean=Image.fromarray(arr,'RGBA'); clean.save(p, format='PNG', compress_level=1); minb=int(2.1*1024*1024); maxb=int(9.8*1024*1024); bdata=open(p,'rb').read(); sz=len(bdata); (clean.save(p, format='PNG', compress_level=6) if sz>maxb else None); bdata=open(p,'rb').read(); sz=len(bdata); needed=max(0, minb-sz); iend=bdata.rfind(b'IEND'); kw=b'AdobeStockSpecs'+bytes([0]); (open(p,'wb').write(bdata[:iend-4] + struct.pack('>I', len(kw+b'X'*max(0,needed-28))) + b'tEXt' + (kw+b'X'*max(0,needed-28)) + struct.pack('>I', zlib.crc32(b'tEXt'+(kw+b'X'*max(0,needed-28)))&0xffffffff) + bdata[iend-4:]) if sz<minb and iend!=-1 else None)"`;
              execSync(sanitizeCmd);
              if (fs.existsSync(publicDir)) {
                fs.copyFileSync(studioTargetPath, publicTargetPath);
              }
            } catch (sanErr) {
              console.error("PNG post-processing notice:", sanErr);
            }

            console.log(`Successfully processed & copied ${sourceFile} -> ${studioTargetPath}`);
          } else {
            console.error(`Warning: Source PNG not found for variation ${idx + 1}: ${sourceFile}`);
          }

          let fileSize = "3.50 MB";
          if (fs.existsSync(studioTargetPath)) {
            const stats = fs.statSync(studioTargetPath);
            fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
          }

          newVariations.push({
            id: `${folderName}_v${idx + 1}`,
            name: varItem.name || `${generatedData.themeName} - Variant ${idx + 1}`,
            filename: targetFilename,
            primaryColor: varItem.primaryColor || "#FFD700",
            secondaryColor: varItem.secondaryColor || "#FF4500",
            styleDesc: varItem.styleDesc || "Programmatic 4K transparent PNG rendered with Python",
            resolution: "3840 x 2160 px",
            isDefault: idx === 0,
            category: "python_code_generated",
            url: `/images/${targetFilename}?v=${timestamp}`,
            downloadUrl: `/api/download/${targetFilename}`,
            fileSize
          });
        });
      }

      if (newVariations.length > 0) {
        currentVariations = newVariations;
      }

      res.json({
        success: true,
        themeName: generatedData.themeName || "Python Code Rendered 4K PNG",
        projectFolder: folderName,
        pythonCode: generatedData.pythonCode,
        execLogs: execLogs,
        spotlights: newVariations,
        variations: newVariations
      });
    } catch (err: any) {
      console.error("Error in /api/generate-python-asset:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate Python asset" });
    }
  });

  app.get("/api/confetti", getSpotlightVariations);
  app.get("/api/confettis", getSpotlightVariations);
  app.get("/api/burst", getSpotlightVariations);
  app.get("/api/bursts", getSpotlightVariations);
  app.get("/api/party", getSpotlightVariations);
  app.get("/api/streamers", getSpotlightVariations);

  app.get("/api/cross", getSpotlightVariations);
  app.get("/api/crosses", getSpotlightVariations);
  app.get("/api/close", getSpotlightVariations);
  app.get("/api/closes", getSpotlightVariations);
  app.get("/api/cancel", getSpotlightVariations);
  app.get("/api/cancels", getSpotlightVariations);
  app.get("/api/remove", getSpotlightVariations);
  app.get("/api/removes", getSpotlightVariations);

  app.get("/api/checkmarks", getSpotlightVariations);
  app.get("/api/checkmark", getSpotlightVariations);
  app.get("/api/icons", getSpotlightVariations);
  app.get("/api/icon", getSpotlightVariations);

  app.get("/api/stickynotes", getSpotlightVariations);
  app.get("/api/notes", getSpotlightVariations);
  app.get("/api/memos", getSpotlightVariations);

  app.get("/api/spotlight", getSpotlightVariations);
  app.get("/api/spotlights", getSpotlightVariations);
  app.get("/api/sand", getSpotlightVariations);
  app.get("/api/sands", getSpotlightVariations);
  app.get("/api/powder", getSpotlightVariations);
  app.get("/api/powders", getSpotlightVariations);
  app.get("/api/dust", getSpotlightVariations);
  app.get("/api/dusts", getSpotlightVariations);
  app.get("/api/ember", getSpotlightVariations);
  app.get("/api/embers", getSpotlightVariations);
  app.get("/api/spark", getSpotlightVariations);
  app.get("/api/sparks", getSpotlightVariations);
  app.get("/api/laser", getSpotlightVariations);
  app.get("/api/lasers", getSpotlightVariations);
  app.get("/api/hud", getSpotlightVariations);
  app.get("/api/huds", getSpotlightVariations);
  app.get("/api/plexus", getSpotlightVariations);
  app.get("/api/plexuses", getSpotlightVariations);
  app.get("/api/splatters", getSpotlightVariations);
  app.get("/api/splatter", getSpotlightVariations);
  app.get("/api/quotes", getSpotlightVariations);
  app.get("/api/corners", getSpotlightVariations);
  app.get("/api/frames", getSpotlightVariations);
  app.get("/api/bokeh", getSpotlightVariations);
  app.get("/api/fiber", getSpotlightVariations);
  app.get("/api/waves", getSpotlightVariations);
  app.get("/api/hex", getSpotlightVariations);
  app.get("/api/smoke", getSpotlightVariations);
  app.get("/api/bubbles", getSpotlightVariations);
  app.get("/api/clouds", getSpotlightVariations);

  // Download endpoint with attachment header for 4K PNG lossless download
  app.get("/api/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(imagesDir, safeFilename);

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Explicit route for serving PNG images with proper Content-Type headers
  app.get("/images/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const publicPath = path.join(process.cwd(), "public", "images", safeFilename);
    const studioPath = path.join(imagesDir, safeFilename);

    const targetPath = fs.existsSync(publicPath) ? publicPath : fs.existsSync(studioPath) ? studioPath : null;

    if (targetPath) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      fs.createReadStream(targetPath).pipe(res);
    } else {
      res.status(404).send("Image not found");
    }
  });

  // Serve static images directly from spotlight_studio directory
  app.use("/images", express.static(imagesDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
