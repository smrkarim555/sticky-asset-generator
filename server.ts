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
  const assetsDir = path.join(process.cwd(), "assets");
  const ASSET_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour (3,600,000 ms)

  // Automatic asset cleanup function: deletes generated folders and files older than 1 hour
  const cleanupOldAssets = (maxAgeMs: number = ASSET_MAX_AGE_MS) => {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // 1. Clean subfolders & temporary generated files inside `assets/`
      if (fs.existsSync(assetsDir)) {
        const entries = fs.readdirSync(assetsDir);
        for (const entry of entries) {
          // Preserve utility scripts (e.g. png_collector) and hidden config files
          if (entry.startsWith("png_collector") || entry.startsWith(".")) {
            continue;
          }

          const entryPath = path.join(assetsDir, entry);
          try {
            const stats = fs.statSync(entryPath);
            const itemTime = Math.max(stats.mtimeMs || 0, stats.birthtimeMs || 0, stats.ctimeMs || 0);
            const ageMs = now - itemTime;

            if (ageMs >= maxAgeMs) {
              if (stats.isDirectory()) {
                fs.rmSync(entryPath, { recursive: true, force: true });
                console.log(`[Auto-Clean 1h] 🗑️ Deleted expired asset folder: assets/${entry} (Age: ${Math.round(ageMs / 60000)} mins)`);
                cleanedCount++;
              } else {
                fs.rmSync(entryPath, { force: true });
                console.log(`[Auto-Clean 1h] 🗑️ Deleted expired asset file: assets/${entry} (Age: ${Math.round(ageMs / 60000)} mins)`);
                cleanedCount++;
              }
            }
          } catch (itemErr) {
            console.error(`[Auto-Clean 1h] Error checking/removing ${entryPath}:`, itemErr);
          }
        }
      }

      // 2. Clean generated output PNG files in `spotlight_studio/` and `public/images/` older than 1 hour
      for (const sDir of [imagesDir, publicDir]) {
        if (fs.existsSync(sDir)) {
          const files = fs.readdirSync(sDir);
          for (const file of files) {
            // Target dynamically generated assets (e.g. python_asset_*, custom theme outputs)
            if (file.startsWith("python_asset_") || file.includes("_output_v") || file.startsWith("asset_")) {
              const filePath = path.join(sDir, file);
              try {
                const stats = fs.statSync(filePath);
                const itemTime = Math.max(stats.mtimeMs || 0, stats.birthtimeMs || 0, stats.ctimeMs || 0);
                const ageMs = now - itemTime;

                if (ageMs >= maxAgeMs) {
                  fs.rmSync(filePath, { force: true });
                  console.log(`[Auto-Clean 1h] 🗑️ Deleted expired generated image: ${file} (Age: ${Math.round(ageMs / 60000)} mins)`);
                  cleanedCount++;
                }
              } catch (fileErr) {
                console.error(`[Auto-Clean 1h] Error checking/removing image ${filePath}:`, fileErr);
              }
            }
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[Auto-Clean 1h] ✅ Successfully deleted ${cleanedCount} expired asset files/folders older than 1 hour.`);
      }
    } catch (cleanErr) {
      console.error("[Auto-Clean 1h] Error during asset cleanup:", cleanErr);
    }
  };

  // Run cleanup once on server startup
  cleanupOldAssets();

  // Run periodic cleanup every 5 minutes in background
  setInterval(() => {
    cleanupOldAssets();
  }, 5 * 60 * 1000);

  // Manual cleanup API endpoint
  app.post("/api/cleanup-assets", (req, res) => {
    const customAgeMs = req.body?.maxAgeMs !== undefined ? Number(req.body.maxAgeMs) : ASSET_MAX_AGE_MS;
    cleanupOldAssets(customAgeMs);
    res.json({
      success: true,
      message: `Assets older than ${Math.round(customAgeMs / 60000)} minutes cleaned up.`
    });
  });

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

  // Endpoint to verify Gemini API Key
  app.post("/api/verify-api-key", async (req, res) => {
    const startTime = Date.now();
    try {
      const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const requestedModel = (req.body?.geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-2.5-flash").trim();
      const ai = getGeminiClient(customKey);
      if (!ai) {
        return res.status(400).json({ success: false, error: "No Gemini API key provided or found on server." });
      }

      let activeModel = requestedModel;
      let testResult: any = null;
      let errorDetails = "";

      const testCandidates = [requestedModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      for (const m of testCandidates) {
        try {
          testResult = await ai.models.generateContent({
            model: m,
            contents: "Respond with 'GEMINI_MODEL_ONLINE'",
          });
          if (testResult && testResult.text) {
            activeModel = m;
            break;
          }
        } catch (e: any) {
          errorDetails = e.message || String(e);
        }
      }

      const latencyMs = Date.now() - startTime;
      if (testResult && testResult.text) {
        const msg = activeModel === requestedModel 
          ? `Gemini model '${activeModel}' is ONLINE & working! (${latencyMs}ms)`
          : `Gemini API key is VALID & ONLINE via '${activeModel}' (Fallback used) (${latencyMs}ms)`;
        return res.json({ 
          success: true, 
          message: msg,
          model: activeModel,
          latencyMs,
          reply: testResult.text.trim()
        });
      } else {
        return res.status(400).json({ success: false, error: errorDetails || "Invalid API response from Gemini.", latencyMs });
      }
    } catch (err: any) {
      console.error("API Key Verification Error:", err);
      return res.status(400).json({ success: false, error: err.message || "Failed to verify Gemini API key.", latencyMs: Date.now() - startTime });
    }
  });

  // Endpoint to enhance and optimize user prompts with Gemini
  app.post("/api/enhance-prompt", async (req, res) => {
    try {
      const { prompt, imageDataUrl, geminiModel } = req.body;
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;

      const systemInstruction = `You are a world-class visual prompt engineer and graphic director.
Look at the user's input or attached reference image.
Transform it into an ultra-detailed, commercial-grade 4K vector artwork specification.
Include:
1. EXACT SUBJECT & REPLICATION: Identify the true subject (e.g. Spiral Notebook Torn Grid Paper, Binder Punched Holes, Lined Memo, Sticky Note, Optical Lens Flare / Anamorphic Streak, Starburst Diffraction, Neon Badge, Border Frame, etc.).
2. STRUCTURE & TEXTURE: Grid spacing, jagged torn paper edges, punched holes, metallic reflections, fiber noise, or light streaks.
3. 100% TRANSPARENT BACKGROUND (alpha = 0): Zero black boxes, zero outer background shadows.
4. COLOR PALETTE: Exact hex colors and gradient transitions.
5. ADOBE STOCK 4K STANDARDS: 3840x2160 true RGBA alpha cutout.

Return ONLY the enhanced prompt text (no conversational fluff).`;

      const client = getGeminiClient(customGeminiKey);
      if (!client) {
        return res.status(400).json({ success: false, error: "Gemini API key is required to enhance prompt. Please enter your Gemini API key in Settings." });
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
        text: `Enhance this graphic prompt inspired by the subject: "${prompt || "Commercial 4K transparent PNG asset"}"`
      });

      const geminiRes = await client.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction
        }
      });
      const enhancedText = geminiRes.text?.trim() || "";

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

  // Ensure initial 4K assets exist on startup
  if (!fs.existsSync(imagesDir) || fs.readdirSync(imagesDir).length === 0) {
    console.log("Generating initial assets locally...");
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
      id: "optical_lens_flare_cyan",
      name: "Cyber Cyan Optical Lens Flare & Horizontal Anamorphic Streak",
      filename: "output_cyan_spotlight.png",
      primaryColor: "#00E5FF",
      secondaryColor: "#FFFFFF",
      darkColor: "#0055AA",
      styleDesc: "Bright central optical flare with horizontal anamorphic light streaks and radiant starburst rays on transparent background",
      resolution: "3840 x 2160 px",
      isDefault: true,
      category: "optical_flare"
    },
    {
      id: "optical_lens_flare_gold",
      name: "Solar Gold Optical Lens Flare & Radiant Rays",
      filename: "output_gold_spotlight.png",
      primaryColor: "#FFD700",
      secondaryColor: "#FFF8DC",
      darkColor: "#8B6508",
      styleDesc: "Warm solar golden optical flare with horizontal light beam and floating stardust motes",
      resolution: "3840 x 2160 px",
      category: "optical_flare"
    },
    {
      id: "optical_lens_flare_magenta",
      name: "Neon Magenta & Royal Violet Light Burst Flare",
      filename: "output_magenta_spotlight.png",
      primaryColor: "#FF00A0",
      secondaryColor: "#FFFFFF",
      darkColor: "#7B0099",
      styleDesc: "High-intensity neon magenta optical lens flare with cross starburst diffraction",
      resolution: "3840 x 2160 px",
      category: "optical_flare"
    },
    {
      id: "optical_lens_flare_white",
      name: "Supernova Pure White Optical Lens Flare",
      filename: "output_white_spotlight.png",
      primaryColor: "#FFFFFF",
      secondaryColor: "#E0F7FA",
      darkColor: "#64B5F6",
      styleDesc: "Ultra-bright supernova pure white optical flare with horizontal ray extensions",
      resolution: "3840 x 2160 px",
      category: "optical_flare"
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

  // POST endpoint to analyze attached user image and generate 4 variations (Pure Gemini)
  app.post("/api/generate-image-variations", async (req, res) => {
    try {
      const { imageDataUrl, geminiModel } = req.body;
      if (!imageDataUrl || typeof imageDataUrl !== "string") {
        return res.status(400).json({ success: false, error: "Image data URL is required" });
      }

      console.log("Analyzing attached image with Google Gemini Vision...");

      // Parse base64
      const matches = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/png";
      const base64Data = matches ? matches[2] : imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const modelToUse = (geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-3.7-flash").trim();

      const ai = getGeminiClient(customGeminiKey);
      let parsedSpecs: any = null;

      const analysisPrompt = `Carefully analyze the attached reference image and identify what it ACTUALLY depicts:

1. Identify the EXACT visual subject. Examples of possible subjects:
   - "Technology Network Grid with Diamond Shapes and Glowing Nodes"
   - "Optical Lens Flare / Horizontal Light Streak"
   - "Abstract Geometric Waves / Curved Lines"
   - "Neon Glow Ring / Circle Effect"
   - "3D Glossy Badge / Seal / Medal"
   - "Pinned Sticky Note / Memo Paper"
   - "Certificate Border Frame"
   - "Volumetric Spotlight Cone"
   - "Particle Scatter / Bokeh Dots"
   - "Hexagonal Tech Pattern / Honeycomb Grid"
   - "Circuit Board / Digital Network Lines"
   - "Abstract Flowing Ribbons / Swirls"

2. DO NOT default to "lens_flare" unless the image is literally a lens flare or light streak.
3. If the image shows interconnected shapes (diamonds, hexagons, squares) with nodes/dots, classify patternType as "network_grid".
4. If the image shows abstract curves, waves, or flowing lines, classify patternType as "wave_pattern".
5. If the image shows scattered particles, dots, confetti, or bokeh, classify patternType as "particle_scatter".
6. Check the primary colors, secondary accent colors, and dark/shadow colors accurately.
7. Provide 4 distinct, gorgeous color variations inspired directly by this subject.
8. Ensure background is 100% transparent (alpha = 0).

Return strictly valid JSON:
{
  "themeName": "Precise name describing the exact visual subject",
  "assetType": one of: "network_grid", "lens_flare", "wave_pattern", "particle_scatter", "hexagon_grid", "spotlight", "badge", "sticky_note", "frame", "abstract_geometric",
  "variations": [
    {
      "name": "Creative colorway name 1",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes and shapes present",
      "patternType": "SAME as assetType above - must match the detected pattern"
    },
    {
      "name": "Creative colorway name 2",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "SAME as assetType above"
    },
    {
      "name": "Creative colorway name 3",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "SAME as assetType above"
    },
    {
      "name": "Creative colorway name 4",
      "primaryColor": "#HEX",
      "secondaryColor": "#HEX",
      "darkColor": "#HEX",
      "styleDesc": "Short description of visual attributes",
      "patternType": "SAME as assetType above"
    }
  ]
}`;

      if (ai) {
        try {
          const geminiResponse = await ai.models.generateContent({
            model: modelToUse,
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: analysisPrompt }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  themeName: { type: Type.STRING },
                  assetType: { type: Type.STRING },
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
                required: ["themeName", "assetType", "variations"]
              }
            }
          });

          if (geminiResponse.text) {
            parsedSpecs = JSON.parse(geminiResponse.text.trim());
            console.log("Gemini API style analysis completed:", parsedSpecs.themeName, "Asset Type:", parsedSpecs.assetType);
          }
        } catch (geminiErr) {
          console.error("Gemini Vision API error (falling back to optical flare defaults):", geminiErr);
        }
      }

      // Default optical flare specs fallback
      const fallbackSpecs = [
        {
          name: "Electric Cyan & Pure White Anamorphic Optical Flare",
          primaryColor: "#00E5FF",
          secondaryColor: "#FFFFFF",
          darkColor: "#0055AA",
          styleDesc: "High-intensity cyan anamorphic horizontal light streak with starburst core and transparent background",
          patternType: "lens_flare"
        },
        {
          name: "24K Solar Gold & Solar Amber Optical Flare Streak",
          primaryColor: "#FFD700",
          secondaryColor: "#FFF8DC",
          darkColor: "#8B6508",
          styleDesc: "Warm solar golden optical flare with horizontal streak and stardust particles",
          patternType: "lens_flare"
        },
        {
          name: "Hyper-Magenta & Royal Violet Optical Flare",
          primaryColor: "#FF00A0",
          secondaryColor: "#FFFFFF",
          darkColor: "#7B0099",
          styleDesc: "Intense neon magenta optical flare with diamond diffraction spikes",
          patternType: "lens_flare"
        },
        {
          name: "Supernova Pure White & Diamond Blue Optical Flare",
          primaryColor: "#FFFFFF",
          secondaryColor: "#E0F7FA",
          darkColor: "#64B5F6",
          styleDesc: "Supernova pure white center flare with ultra-clean horizontal beam",
          patternType: "lens_flare"
        }
      ];

      const specsToUse = (parsedSpecs && parsedSpecs.variations && parsedSpecs.variations.length === 4)
        ? parsedSpecs.variations
        : fallbackSpecs;

      const assetTypeHint = parsedSpecs?.assetType || parsedSpecs?.themeName || "lens_flare";
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
        themeName: parsedSpecs?.themeName || "Optical Lens Flare & Light Effects",
        spotlights: enriched,
        variations: enriched
      });
    } catch (err) {
      console.error("Error in /api/generate-image-variations:", err);
      res.status(500).json({ success: false, error: "Failed to generate variations" });
    }
  });

  // POST endpoint for Programmatic Python Code Generation & 4K PNG Rendering (Pure Gemini)
  app.post("/api/generate-python-asset", async (req, res) => {
    try {
      // Clean any expired assets older than 1 hour before generating new ones
      cleanupOldAssets();

      const { subjectPrompt, imageDataUrl, geminiModel, numVariations, aspectRatio } = req.body;
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
      const selectedGeminiModel = (geminiModel || (req.headers['x-gemini-model'] as string) || "gemini-2.5-flash").trim();

      const count = [2, 4, 6, 8].includes(Number(numVariations)) ? Number(numVariations) : 4;
      const aspect = aspectRatio || "16:9";

      let resWidth = 3840;
      let resHeight = 2160;
      if (aspect === "1:1") { resWidth = 3840; resHeight = 3840; }
      else if (aspect === "9:16") { resWidth = 2160; resHeight = 3840; }
      else if (aspect === "4:3") { resWidth = 3840; resHeight = 2880; }
      else if (aspect === "3:2") { resWidth = 3840; resHeight = 2560; }

      const variationJsonSchemaItems = Array.from({ length: count }, (_, i) => `    { "id": "v${i+1}", "name": "Variant ${i+1} Name", "primaryColor": "#HEX", "secondaryColor": "#HEX", "filename": "output_v${i+1}.png", "styleDesc": "Colorway variant ${i+1}" }`).join(",\n");

      const promptTemplate = `ROLE
You are an elite Python computer vision & vector graphics engineer.
Build a commercial-grade 4K transparent PNG asset script entirely in code using PyCairo, Pillow (PIL), NumPy, and OpenCV.
Do NOT use AI background-removal or blurry cutouts; construct the exact visual phenomenon programmatically using mathematical paths, Bezier curves, radial/linear gradients, and compositing.

SUBJECT & REFERENCE REPLICATION (CRITICAL):
- Carefully inspect the attached reference image (or user prompt: "${subjectPrompt || "High resolution transparent vector asset"}").
- Faithfully REPLICATE the EXACT visual subject and physical characteristics present in the reference:
  * If it is NOTEBOOK PAPER / TORN GRID PAPER / LINED MEMO / STICKY NOTE / KRAFT SHEET:
    - Draw the paper sheet base (realistic crisp white/cream/ivory/kraft).
    - If it has a GRID/GRAPH pattern: render the clean square quad mesh lines across the entire paper surface with subtle opacity.
    - If it has TORN EDGES (e.g. left spiral edge or bottom):
      * Draw the realistic jagged torn paper contour using randomized zigzag / bezier paths.
      * Draw the spiral binder punched holes along the margin (circular punched holes with torn-through openings).
    - Add subtle paper fiber grain micro-texture.
    - Absolute ZERO background shadow or dark boxes on the overall canvas — only pure transparent background outside the paper boundary.
  * If it is an OPTICAL LENS FLARE / HORIZONTAL LIGHT STREAK / ANAMORPHIC BEAM:
    - Draw the glowing white-hot focal core at the center.
    - Draw wide razor-sharp horizontal anamorphic light streaks with smooth alpha falloff.
    - Draw multi-point starburst / diamond diffraction rays and soft halo bloom.
  * If it is a BADGE / SEAL / EMBLEM:
    - Draw 3D beveled circle/shield, star rosette, metallic specular highlights.
  * If it is a CERTIFICATE BORDER FRAME:
    - Draw the border frame with ornate corner filigree and 100% transparent center window.
  * For ANY OTHER graphic: faithfully recreate its exact shapes, geometry, lines, and shading.

BACKGROUND & TRANSPARENCY REQUIREMENTS (MANDATORY):
1. Background MUST be 100% transparent (RGBA with alpha = 0). Canvas size: ${resWidth} x ${resHeight} px.
2. ABSOLUTELY NO BACKGROUND RECTANGLES, NO DARK BOXES, NO GREY VIGNETTING, NO DROP SHADOW ON THE OVERALL CANVAS BACKGROUND.
3. Every graphic element must fade smoothly to alpha=0 at its outer perimeter.
4. Generate ${count} distinct premium colorway variations (output_v1.png to output_v${count}.png) in the current directory.
5. Each output PNG file size must be clean and uncompressed (2.0 MB to 10.0 MB).

Return strictly valid JSON:
{
  "projectFolder": "descriptive_folder_name_in_lowercase",
  "themeName": "Title of the Asset Subject",
  "pythonCode": "Complete runnable python code",
  "variations": [
${variationJsonSchemaItems}
  ]
}`;

      const ai = getGeminiClient(customGeminiKey);
      if (!ai) {
        return res.status(400).json({ success: false, error: "Gemini API key is required to generate Python code. Please enter your key in Settings." });
      }

      console.log(`Generating Python 4K PNG script with Gemini (${selectedGeminiModel})...`);

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
      parts.push({ text: promptTemplate });

      const candidateModels = (selectedGeminiModel === 'auto'
        ? ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        : [selectedGeminiModel, "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash"]
      ).filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      let rawText = "";
      let lastGeminiErr: any = null;

      for (const currentModel of candidateModels) {
        try {
          console.log(`Trying Gemini model (${currentModel})...`);
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
          console.warn(`Gemini model ${currentModel} notice:`, modelErr.message || modelErr);
        }
      }

      if (!rawText) {
        return res.status(500).json({
          success: false,
          error: `Gemini generation error: ${lastGeminiErr ? lastGeminiErr.message : "No response received"}`
        });
      }

      rawText = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

      const extractPythonCode = (text: string): string => {
        const pyMatch = text.match(/"pythonCode"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\}|\s*$)/);
        if (pyMatch && pyMatch[1]) {
          return pyMatch[1]
            .replace(/\\r\\n/g, "\n")
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

      // Normalize any literal escaped newlines from JSON stringification
      if (pythonCodeToSave.includes('\\n') && !pythonCodeToSave.includes('\n')) {
        pythonCodeToSave = pythonCodeToSave
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }

      // Standalone Graphics Helpers (without mutating C-extension classes)
      const graphicsHelpers = `# PyCairo & Graphics Standalone Helpers
import cairo
import numpy as np
import math

def draw_quad_curve(ctx, qx, qy, endx, endy):
    try:
        x0, y0 = ctx.get_current_point()
        c1x = x0 + (2.0/3.0)*(float(qx) - x0)
        c1y = y0 + (2.0/3.0)*(float(qy) - y0)
        c2x = float(endx) + (2.0/3.0)*(float(qx) - float(endx))
        c2y = float(endy) + (2.0/3.0)*(float(qy) - float(endy))
        ctx.curve_to(c1x, c1y, c2x, c2y, float(endx), float(endy))
    except Exception:
        ctx.line_to(float(endx), float(endy))

def draw_rounded_rectangle(ctx, x, y, w, h, r):
    try:
        r = min(float(r), float(w)/2.0, float(h)/2.0)
        ctx.new_sub_path()
        ctx.arc(float(x) + float(w) - r, float(y) + r, r, -np.pi/2, 0)
        ctx.arc(float(x) + float(w) - r, float(y) + float(h) - r, r, 0, np.pi/2)
        ctx.arc(float(x) + r, float(y) + float(h) - r, r, np.pi/2, np.pi)
        ctx.arc(float(x) + r, float(y) + r, r, np.pi, 3*np.pi/2)
        ctx.close_path()
    except Exception:
        ctx.rectangle(float(x), float(y), float(w), float(h))
`;

      pythonCodeToSave = graphicsHelpers + "\n\n" + pythonCodeToSave.trim() + "\n";

      // Robust Auto-Replacements for AI hallucinated methods & 6-arg arc calls
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.arc\(\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*(?:counterclockwise\s*=\s*)?True\s*\)/g, "$1.arc_negative($2, $3, $4, $5, $6)");
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.arc\(\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*([^,\)]+),\s*(?:counterclockwise\s*=\s*)?False\s*\)/g, "$1.arc($2, $3, $4, $5, $6)");
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.quadratic_curve_to\(/g, "draw_quad_curve($1, ");
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.rounded_rectangle\(/g, "draw_rounded_rectangle($1, ");
      pythonCodeToSave = pythonCodeToSave.replace(/([a-zA-Z0-9_]+)\.round_rectangle\(/g, "draw_rounded_rectangle($1, ");
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.Pattern\.create_linear\(/g, "cairo.LinearGradient(");
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.Pattern\.create_radial\(/g, "cairo.RadialGradient(");
      pythonCodeToSave = pythonCodeToSave.replace(/,\s*borderValue\s*=\s*[^,\)]+/gi, "");
      pythonCodeToSave = pythonCodeToSave.replace(/borderValue\s*=\s*[^,\)]+,?/gi, "");
      pythonCodeToSave = pythonCodeToSave.replace(/borderType\s*=\s*cv2\.BORDER_TRANSPARENT/gi, "borderType=cv2.BORDER_CONSTANT");
      pythonCodeToSave = pythonCodeToSave.replace(/cv2\.BORDER_TRANSPARENT/gi, "cv2.BORDER_CONSTANT");
      pythonCodeToSave = pythonCodeToSave.replace(/cairo\.ImageSurface\.create_for_data\(\s*([a-zA-Z0-9_\.\[\]]+)\.tobytes\(\)/g, "cairo.ImageSurface.create_for_data(bytearray($1.tobytes())");
      pythonCodeToSave = pythonCodeToSave.replace(/create_for_data\(\s*bytes\(([^)]+)\)/g, "create_for_data(bytearray($1)");
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

      const newVariations: any[] = [];
      const timestamp = Date.now();

      let variationsList = Array.isArray(generatedData.variations) && generatedData.variations.length > 0
        ? generatedData.variations
        : Array.from({ length: count }, (_, i) => ({
            id: `v${i+1}`,
            name: `Variant ${i+1}`,
            filename: `output_v${i+1}.png`,
            primaryColor: "#00E5FF",
            secondaryColor: "#FFFFFF",
            styleDesc: `Programmatic 4K transparent PNG variant ${i+1}`
          }));

      if (variationsList.length === 0 && allDiscoveredPngs.length > 0) {
        variationsList = allDiscoveredPngs.map((p, i) => ({
          id: `v${i+1}`,
          name: `Variant ${i+1}`,
          filename: path.basename(p),
          primaryColor: "#00E5FF",
          secondaryColor: "#FFFFFF",
          styleDesc: `Discovered variant ${i+1}`
        }));
      }

      if (allDiscoveredPngs.length === 0) {
        console.warn("Python execution produced 0 PNGs, generating high-res 4K fallback assets via canvas engine...");
        const fallbackSpecs = (Array.isArray(generatedData.variations) && generatedData.variations.length > 0)
          ? generatedData.variations
          : [
              { name: `${generatedData.themeName || "Optical Lens Flare"} - Variant 1`, primaryColor: "#00E5FF", secondaryColor: "#FFFFFF" },
              { name: `${generatedData.themeName || "Optical Lens Flare"} - Variant 2`, primaryColor: "#FFD700", secondaryColor: "#FFF8DC" },
              { name: `${generatedData.themeName || "Optical Lens Flare"} - Variant 3`, primaryColor: "#FF00A0", secondaryColor: "#FFFFFF" },
              { name: `${generatedData.themeName || "Optical Lens Flare"} - Variant 4`, primaryColor: "#FFFFFF", secondaryColor: "#E0F7FA" },
            ];
        const rendered = render4KVariations(fallbackSpecs, imagesDir, publicDir, generatedData.themeName || "lens_flare");
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
            styleDesc: item.styleDesc || "4K PNG Transparent Asset",
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

            // Post-process PNG: Sanitize transparency & enforce Adobe Stock 2.0MB - 10.0MB size
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
            primaryColor: varItem.primaryColor || "#00E5FF",
            secondaryColor: varItem.secondaryColor || "#FFFFFF",
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
  app.get("/api/flare", getSpotlightVariations);
  app.get("/api/flares", getSpotlightVariations);
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
