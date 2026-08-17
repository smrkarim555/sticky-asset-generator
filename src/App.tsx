import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Grid, 
  Maximize2, 
  ShieldCheck, 
  Palette, 
  Check, 
  X,
  Info,
  Layers,
  ArrowDownToLine,
  Eye,
  FileImage,
  Sliders,
  Sun,
  Sparkles,
  Zap,
  Radio,
  UploadCloud,
  Trash2,
  Wand2,
  Image as ImageIcon,
  CheckCircle2,
  Key,
  Lock,
  EyeOff,
  Save,
  AlertCircle,
  Settings,
  Cpu,
  RefreshCw,
  ExternalLink,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpotlightVariation, BackgroundMode } from './types';

export const OPENROUTER_MODEL_GROUPS = [
  {
    category: "⭐ Free Models (No Credits Required)",
    models: [
      { id: "google/gemini-2.0-flash-lite-preview-02-05:free", name: "Gemini 2.0 Flash Lite (Free)", badge: "FREE", note: "Fast Google free tier", vision: true },
      { id: "google/gemini-2.0-pro-exp-02-05:free", name: "Gemini 2.0 Pro Exp (Free)", badge: "FREE", note: "Experimental pro model", vision: true },
      { id: "meta-llama/llama-3.2-11b-vision-instruct:free", name: "Llama 3.2 11B Vision (Free)", badge: "FREE", note: "Multimodal vision & image", vision: true },
      { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 Chat (Free)", badge: "FREE", note: "Fast general intelligence (Text only)", vision: false },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 Reasoning (Free)", badge: "FREE", note: "Deep reasoning free model (Text only)", vision: false },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", badge: "FREE", note: "Specialized for Python & PyCairo (Text only)", vision: false },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (Free)", badge: "FREE", note: "Powerful Meta open model (Text only)", vision: false },
      { id: "mistralai/mistral-small-24b-instruct-2501:free", name: "Mistral Small 24B (Free)", badge: "FREE", note: "Efficient European model (Text only)", vision: false },
    ]
  },
  {
    category: "🚀 Google Gemini Series (All Have Vision)",
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Recommended)", badge: "TOP", note: "Fastest & highest success rate", vision: true },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (High Quality)", badge: "PRO", note: "Superior reasoning & complex code", vision: true },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash Stable", badge: "FAST", note: "Production stable release", vision: true },
      { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash", badge: "STABLE", note: "Standard Flash model", vision: true },
      { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro", badge: "PRO", note: "Deep reasoning 1.5 model", vision: true },
    ]
  },
  {
    category: "🧠 Anthropic Claude Series (All Have Vision)",
    models: [
      { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet (Hybrid Reasoning)", badge: "NEW", note: "Latest flagship from Anthropic", vision: true },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Best Python Coder)", badge: "POPULAR", note: "World-class PyCairo vector artist", vision: true },
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", badge: "SPEED", note: "Ultra low latency responses", vision: true },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", badge: "HEAVY", note: "Max intelligence model", vision: true },
    ]
  },
  {
    category: "⚡ OpenAI GPT Series",
    models: [
      { id: "openai/gpt-4o", name: "GPT-4o (Omnimodal Flagship)", badge: "POPULAR", note: "Multimodal image & Python code", vision: true },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Fast & Cheap)", badge: "SPEED", note: "Economical daily workhorse", vision: true },
      { id: "openai/o1", name: "o1 (Full Deep Reasoning)", badge: "DEEP", note: "Complex architecture reasoning", vision: true },
      { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", badge: "PRO", note: "High context turbo model", vision: true },
      { id: "openai/o3-mini", name: "o3-mini (High Reasoning)", badge: "MATH", note: "Advanced reasoning model (Text only)", vision: false },
    ]
  },
  {
    category: "🔥 DeepSeek & Open Source Leaders",
    models: [
      { id: "mistralai/mistral-large-2411", name: "Mistral Large 2411", badge: "PRO", note: "Top tier European flagship with vision", vision: true },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (High Performance)", badge: "FAST", note: "Extremely cost-effective & smart (Text only)", vision: false },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Full Reasoning)", badge: "REASONING", note: "Deep reasoning with chain-of-thought (Text only)", vision: false },
      { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", badge: "CODER", note: "Python, PyCairo, OpenCV specialist (Text only)", vision: false },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B Instruct", badge: "PRO", note: "Leading open weight model (Text only)", vision: false },
    ]
  }
];

export const GEMINI_MODELS = [
  { id: "gemini-3.7-flash", name: "gemini-3.7-flash (Latest 3.7 Flash - Recommended)" },
  { id: "gemini-3.7-pro", name: "gemini-3.7-pro (3.7 Pro Deep Reasoning)" },
  { id: "gemini-3.6-flash", name: "gemini-3.6-flash (3.6 Flash)" },
  { id: "gemini-3.5-flash-lite", name: "gemini-3.5-flash-lite (3.5 Flash Lite)" },
  { id: "gemini-3.1-flash-lite", name: "gemini-3.1-flash-lite (3.1 Flash Lite)" },
  { id: "gemini-2.5-flash", name: "gemini-2.5-flash (2.5 Flash Stable)" },
  { id: "gemini-2.5-pro", name: "gemini-2.5-pro (2.5 Pro High Quality)" },
  { id: "gemini-2.0-flash", name: "gemini-2.0-flash (2.0 Flash)" },
  { id: "gemini-1.5-flash", name: "gemini-1.5-flash (1.5 Flash High Quota)" },
];

export const DEFAULT_TEMPLATE_1_PROMPT = `========
ROLE
You are an expert Python vector graphics engineer. Build a commercial-grade 4K transparent PNG entirely in code using PyCairo, Pillow, and NumPy.
Do NOT use AI background-removal cutouts; construct the exact artwork programmatically using precision vector paths, Bezier curves, and rich metallic/color gradients.

REFERENCE & SUBJECT REPLICATION (CRITICAL)
If an image is attached, faithfully REPLICATE its exact subject, composition, geometry, ornaments, and visual style:
- If it is a Certificate / Diploma / Luxury Border Frame: draw the ornate curved corner ribbon wings, metallic gold trims, and transparent center window.
- If it is a Badge, Seal, Medal, or Rosette: draw the 3D beveled shield/circle, star rosette, ribbons, and reflections.
- If it is a Sticky Note or Paper: draw the curled corner, pushpin, and matte texture.
- If it is any other graphic: recreate its exact shapes, Bezier curves, and layout with high fidelity.

SUBJECT
<describe the design here — colors, style, key elements, layering. Be specific.>

LIBRARY STACK (use the right tool per task)
- pycairo ............ PRIMARY renderer for complex vector art: paths, Bezier curves, gradients, clipping, compositing. Best AA quality.
- Pillow (PIL) ........ Canvas management, layer compositing (alpha_composite), ImageDraw, final PNG save.
- numpy ............... Pixel-level math, masks, building/blending alpha channels.
- scipy.ndimage ....... Gaussian blur, distance transforms for clean edge feathering & glows.
- OpenCV (cv2) ........ Fast filters, seamless blending, high-quality LANCZOS resampling, drop shadows.
- colorsys ............ Accurate color and gradient/HSV manipulation.

HARD REQUIREMENTS & ADOBE STOCK RULES
1. Output: PNG, RGBA, true alpha. Canvas exactly 3840 x 2160 px (4K UHD).
2. Subject centered with comfortable padding; preserve aspect ratio; nothing clipped at the edges.
3. Background fully transparent (alpha = 0). ABSOLUTELY NO BLACK VIGNETTING OR DARK OUTER HALOS.
4. Edges: smooth, anti-aliased, NO white halos and NO jagged staircase.
5. File Size Requirement: Minimum file size 2.0 MB, Maximum file size 10.0 MB.
6. Create 4 DISTINCT COLOR VARIATIONS of the subject (output_v1.png to output_v4.png) matching the reference style in different premium colorways.`;

export const DEFAULT_TEMPLATE_2_PROMPT = `I am attaching a reference image. Write a complete runnable Python script (generate.py) using PyCairo, Pillow, numpy, and OpenCV to programmatically create 4K PNG transparent background images that ACCURATELY REPLICATE this reference artwork.
If the reference is a certificate/diploma border frame, draw the ornate corner ribbons, metallic gold trims, and transparent center. If it is a badge, note, icon, or effect, replicate its exact shapes and layout.
Output quality must be high resolution, true RGBA alpha, zero black shadows, uncompressed PNG file size between 2.0MB and 10.0MB.

SUBJECT: <describe your subject here — e.g. Luxury Royal Blue & Gold Diploma Border Frame, 3D Rosette Badge, Canary Yellow Pinned Sticky Note>

Also it should output 4 different unique style color variations of this (output_v1.png to output_v4.png).

Assume white/checkered background as transparent layer (alpha = 0).`;

export const HOT_PRESETS = [
  {
    id: "certificate_gold_frame",
    title: "📜 Luxury Certificate Border",
    badge: "HOT SELLER",
    desc: "Royal navy blue & polished gold ornate diploma frame",
    prompt: "Luxury ornate certificate and diploma border frame (royal navy blue #0A1931 and polished metallic gold #D4AF37 to #FFE28A). Elegant curved corner ribbon accents, multi-layered gold beveled trim, decorative corner ornaments, wide transparent center cutout for diploma text, 4K UHD true RGBA transparent background."
  },
  {
    id: "sticky_note_yellow",
    title: "📌 Pinned Sticky Note",
    badge: "HOT SELLER",
    desc: "Yellow paper note with red pushpin & curled corner",
    prompt: "Realistic 3D square yellow sticky note (canary yellow #FFE566) pinned with an angled red pushpin (#E63946) at top center. Subtle paper curl at bottom right corner, soft ambient floor drop shadow, matte paper grain texture, 4K UHD true RGBA transparent background."
  },
  {
    id: "ecommerce_seal",
    title: "🏷️ Luxury Gold Guarantee Seal",
    badge: "COMMERCIAL",
    desc: "Premium 5-star quality rosette with satin ribbons",
    prompt: "Luxury metallic golden 5-star quality guarantee rosette medal with twin satin ribbon tails (#C59B27 to #FFE28A). Intricate guilloche coin edge pattern, glossy embossed center star, soft drop shadow, 4K RGBA transparent cutout."
  },
  {
    id: "stage_spotlights",
    title: "🔦 Volumetric Spotlights",
    badge: "CONCERT",
    desc: "Dual conical light beams with floor splash pool",
    prompt: "Dual volumetric stage spotlights (golden amber #FFB703 and electric magenta #D055FF) originating from 3D angled top fixtures converging at a soft elliptical illuminated floor pool. Smooth Gaussian cross-falloff, delicate hazing mist particles, zero black halos, 4K transparent cutout."
  },
  {
    id: "glass_badge_3d",
    title: "💎 3D Glassmorphism Shield",
    badge: "3D ASSET",
    desc: "Frosted glass shield with polished gold rim",
    prompt: "3D frosted glassmorphism hexagonal shield badge with polished brushed gold metallic rim (#D4AF37). Translucent refraction blur, soft specular glass edge highlights, multi-layered depth, true alpha transparency."
  },
  {
    id: "cyberpunk_hud",
    title: "🎮 Cyberpunk HUD Badge",
    badge: "NEON",
    desc: "Neon cyan & fiery orange glowing interface compass",
    prompt: "Futuristic cyberpunk holographic circular HUD compass badge with neon cyan (#00F0FF) and fiery electric orange (#FF6B00) glowing vector accents. Segmented gauge rings, glowing micro runes, crisp anti-aliased lines, 4K transparent background."
  }
];

export const TOP_CLAUDE_FREE_MODELS = [
  { id: "google/gemini-2.0-pro-exp-02-05:free", label: "⭐ Gemini 2.0 Pro Exp", sub: "Claude 3.5 Level • Vision", badge: "FREE VISION" },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", label: "🐍 Qwen 2.5 Coder 32B", sub: "Python PyCairo Master", badge: "TOP CODER" },
  { id: "deepseek/deepseek-r1:free", label: "🧠 DeepSeek R1", sub: "671B Deep Reasoning", badge: "REASONING" },
  { id: "google/gemini-2.5-flash", label: "⚡ Gemini 2.5 Flash", sub: "Fastest Vision AI", badge: "POPULAR" },
];

export default function App() {
  const [spotlightList, setSpotlightList] = useState<SpotlightVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('golden_spotlight_v1');
  const [bgMode, setBgMode] = useState<BackgroundMode>('checkerboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Attached Image & AI Variation States
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectedTheme, setDetectedTheme] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Python Code Generation Engine States (Persisted in localStorage)
  const [promptTemplateMode, setPromptTemplateMode] = useState<'template_1' | 'template_2'>(
    () => (localStorage.getItem('user_prompt_template_mode') as any) || 'template_1'
  );

  const [subjectPrompt, setSubjectPrompt] = useState<string>(() => {
    const saved = localStorage.getItem('user_subject_prompt');
    if (saved && saved.trim()) return saved;
    return (localStorage.getItem('user_prompt_template_mode') === 'template_2')
      ? DEFAULT_TEMPLATE_2_PROMPT
      : DEFAULT_TEMPLATE_1_PROMPT;
  });

  const [isPythonGenerating, setIsPythonGenerating] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [pythonCodeOutput, setPythonCodeOutput] = useState<string | null>(null);
  const [execLogsOutput, setExecLogsOutput] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);

  // API Provider States (Gemini vs OpenRouter)
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openrouter'>(() => (localStorage.getItem('user_api_provider') as any) || 'gemini');

  // Variation Count & Canvas Ratio States (Persisted in localStorage)
  const [numVariations, setNumVariations] = useState<number>(() => Number(localStorage.getItem('user_num_variations')) || 4);
  const [aspectRatio, setAspectRatio] = useState<string>(() => localStorage.getItem('user_aspect_ratio') || '16:9');

  // Custom User Gemini API Key & Model States (Persisted in localStorage)
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem('user_gemini_api_key') || '');
  const [savedApiKey, setSavedApiKey] = useState<string>(() => localStorage.getItem('user_gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<string>(() => localStorage.getItem('user_gemini_model') || 'gemini-3.7-flash');

  // OpenRouter API States (Persisted in localStorage)
  const [openrouterKeyInput, setOpenrouterKeyInput] = useState<string>(() => localStorage.getItem('user_openrouter_api_key') || '');
  const [savedOpenrouterKey, setSavedOpenrouterKey] = useState<string>(() => localStorage.getItem('user_openrouter_api_key') || '');
  const [openrouterModel, setOpenrouterModel] = useState<string>(() => localStorage.getItem('user_openrouter_model') || 'google/gemini-2.0-pro-exp-02-05:free');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(() => {
    const saved = localStorage.getItem('user_openrouter_model') || 'google/gemini-2.0-pro-exp-02-05:free';
    const allKnown = OPENROUTER_MODEL_GROUPS.flatMap(g => g.models).map(m => m.id);
    return !allKnown.includes(saved);
  });
  const [customModelInput, setCustomModelInput] = useState<string>(() => localStorage.getItem('user_openrouter_custom_model') || '');

  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [showApiKeyText, setShowApiKeyText] = useState<boolean>(false);
  const [apiKeyVerifyStatus, setApiKeyVerifyStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [apiKeyVerifyMsg, setApiKeyVerifyMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchSpotlights();
  }, []);

  // Window paste listener for easy Ctrl+V / Cmd+V image attachment
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const fetchSpotlights = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/spotlight');
      const data = await res.json();
      if (data.success && (data.spotlights || data.spotlight)) {
        const list = data.spotlights || data.spotlight;
        setSpotlightList(list);
        if (list.length > 0) {
          const defaultItem = list.find((item: SpotlightVariation) => item.id === 'golden_spotlight_v1') || list[0];
          setSelectedId(defaultItem.id);
        }
      }
    } catch (err) {
      console.error("Failed to load Studio assets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAttachedImage(e.target.result as string);
        setAttachedFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (key) {
      localStorage.setItem('user_gemini_api_key', key);
      setSavedApiKey(key);
      setApiKeyVerifyStatus('idle');
      setApiKeyVerifyMsg('Gemini API Key successfully saved in local storage!');
    } else {
      localStorage.removeItem('user_gemini_api_key');
      setSavedApiKey('');
      setApiKeyVerifyStatus('idle');
      setApiKeyVerifyMsg('Saved API Key removed.');
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setApiKeyInput('');
    setSavedApiKey('');
    setApiKeyVerifyStatus('idle');
    setApiKeyVerifyMsg('Saved API Key cleared.');
  };

  const handleVerifyApiKey = async () => {
    const keyToTest = apiKeyInput.trim() || savedApiKey;
    if (!keyToTest) {
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('Please enter a Gemini API Key to test.');
      return;
    }
    setApiKeyVerifyStatus('verifying');
    setApiKeyVerifyMsg(`Testing Gemini API model (${geminiModel})...`);
    try {
      const res = await fetch('/api/verify-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': keyToTest,
          'x-gemini-model': geminiModel
        },
        body: JSON.stringify({ apiKey: keyToTest, geminiModel })
      });
      const data = await res.json();
      if (data.success) {
        setApiKeyVerifyStatus('valid');
        setApiKeyVerifyMsg(`✅ ${data.message || `Gemini model '${geminiModel}' is verified & working!`}`);
      } else {
        setApiKeyVerifyStatus('invalid');
        setApiKeyVerifyMsg(`❌ Gemini Error: ${data.error || 'Failed to verify Gemini API key'}`);
      }
    } catch (err: any) {
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('Network error verifying Gemini API key');
    }
  };

  const handleVerifyOpenRouterKey = async () => {
    const rawKey = openrouterKeyInput.trim() || savedOpenrouterKey;
    const keyToTest = rawKey.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    if (!keyToTest || keyToTest.length < 8) {
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('⚠️ Please enter an OpenRouter API Key (starting with sk-or-v1-...) in the input box above. Get a free key at openrouter.ai/keys');
      return;
    }
    const modelToTest = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;
    setApiKeyVerifyStatus('verifying');
    setApiKeyVerifyMsg(`Testing OpenRouter model (${modelToTest})...`);
    try {
      const res = await fetch('/api/verify-openrouter-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-api-key': keyToTest,
          'x-openrouter-model': modelToTest
        },
        body: JSON.stringify({ apiKey: keyToTest, openrouterModel: modelToTest })
      });
      const data = await res.json();
      if (data.success) {
        setApiKeyVerifyStatus('valid');
        setApiKeyVerifyMsg(`✅ ${data.message || `OpenRouter model '${modelToTest}' is working! (${data.latencyMs}ms)`}`);
        // Auto-save verified key to localStorage
        setSavedOpenrouterKey(keyToTest);
        localStorage.setItem('user_openrouter_api_key', keyToTest);
      } else {
        setApiKeyVerifyStatus('invalid');
        setApiKeyVerifyMsg(`❌ OpenRouter Error: ${data.error || 'Failed to verify OpenRouter model'}`);
      }
    } catch (err: any) {
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('Network error connecting to OpenRouter verification.');
    }
  };

  const handleGenerateVariations = async () => {
    if (!attachedImage) return;

    // Check if OpenRouter key is missing when OpenRouter is selected
    if (apiProvider === 'openrouter' && (!savedOpenrouterKey || savedOpenrouterKey.trim().length < 8)) {
      setShowApiKeyModal(true);
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('⚠️ Please enter your OpenRouter API Key (sk-or-v1-...) below and click "Save Settings & Key". Get your free key at openrouter.ai/keys');
      return;
    }

    try {
      setIsAnalyzing(true);
      const activeModel = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'x-gemini-model': geminiModel,
        'x-openrouter-model': activeModel
      };
      if (savedApiKey) {
        headers['x-gemini-api-key'] = savedApiKey;
      }
      if (savedOpenrouterKey) {
        headers['x-openrouter-api-key'] = savedOpenrouterKey;
      }
      const res = await fetch('/api/generate-image-variations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          imageDataUrl: attachedImage, 
          apiKey: savedApiKey, 
          geminiModel,
          apiProvider,
          openrouterApiKey: savedOpenrouterKey,
          openrouterModel: activeModel
        }),
      });
      const data = await res.json();
      if (data.success && data.spotlights) {
        setSpotlightList(data.spotlights);
        setDetectedTheme(data.themeName || "Attached Reference Style");
        if (data.spotlights.length > 0) {
          setSelectedId(data.spotlights[0].id);
        }
      } else if (data.error) {
        alert("Variation Notice: " + data.error);
      }
    } catch (err: any) {
      console.error("Failed to generate image variations:", err);
      alert("Notice: " + (err.message || "Failed to generate variations"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePythonAsset = async () => {
    // Check if OpenRouter key is missing when OpenRouter is selected
    if (apiProvider === 'openrouter' && (!savedOpenrouterKey || savedOpenrouterKey.trim().length < 8)) {
      setShowApiKeyModal(true);
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('⚠️ Please enter your OpenRouter API Key (sk-or-v1-...) below and click "Save Settings & Key". Get your free key at openrouter.ai/keys');
      return;
    }

    try {
      setIsPythonGenerating(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedApiKey) {
        headers['x-gemini-api-key'] = savedApiKey;
      }
      if (savedOpenrouterKey) {
        headers['x-openrouter-api-key'] = savedOpenrouterKey;
      }

      const activeModel = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;

      let finalPrompt = subjectPrompt.trim();
      if (!finalPrompt || finalPrompt.includes('<describe')) {
        const defaultSubject = attachedImage ? 'High resolution 4K vector asset inspired by attached reference image' : 'Realistic 4K transparent vector asset';
        if (finalPrompt.includes('<describe')) {
          finalPrompt = finalPrompt.replace(/<describe[^>]*>/gi, defaultSubject);
        } else {
          finalPrompt = defaultSubject;
        }
      }

      const res = await fetch('/api/generate-python-asset', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          subjectPrompt: finalPrompt,
          imageDataUrl: attachedImage, 
          apiKey: savedApiKey, 
          geminiModel: geminiModel,
          templateMode: promptTemplateMode,
          apiProvider: apiProvider,
          openrouterApiKey: savedOpenrouterKey,
          openrouterModel: activeModel,
          numVariations: numVariations,
          aspectRatio: aspectRatio
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        throw new Error(`Server error (${res.status}): ${resText.slice(0, 200) || "Empty response from server"}`);
      }

      if (data.success && data.variations) {
        setSpotlightList(data.variations);
        setDetectedTheme(data.themeName || "Python Code Rendered Assets");
        setPythonCodeOutput(data.pythonCode || null);
        setExecLogsOutput(data.execLogs || null);
        if (data.variations.length > 0) {
          setSelectedId(data.variations[0].id);
        }
      } else {
        alert("Python Generation Notice: " + (data.error || "Failed to execute Python script"));
      }
    } catch (err: any) {
      console.error("Failed to generate Python asset:", err);
      if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
        alert("Local Server Notice: Unable to connect to local server (http://localhost:3000). Please make sure 'run.bat' is running on your PC.");
      } else {
        alert("Execution Notice: " + err.message);
      }
    } finally {
      setIsPythonGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    // Check if OpenRouter key is missing when OpenRouter is selected
    if (apiProvider === 'openrouter' && (!savedOpenrouterKey || savedOpenrouterKey.trim().length < 8)) {
      setShowApiKeyModal(true);
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('⚠️ Please enter your OpenRouter API Key (sk-or-v1-...) in Settings to use the AI Prompt Enhancer.');
      return;
    }

    try {
      setIsEnhancingPrompt(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedApiKey) headers['x-gemini-api-key'] = savedApiKey;
      if (savedOpenrouterKey) headers['x-openrouter-api-key'] = savedOpenrouterKey;

      const activeModel = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;

      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: subjectPrompt,
          imageDataUrl: attachedImage,
          apiProvider,
          openrouterApiKey: savedOpenrouterKey,
          openrouterModel: activeModel,
          geminiModel
        })
      });
      const data = await res.json();
      if (data.success && data.enhancedPrompt) {
        setSubjectPrompt(data.enhancedPrompt);
        localStorage.setItem('user_subject_prompt', data.enhancedPrompt);
      } else {
        alert("Enhance Notice: " + (data.error || "Failed to enhance prompt"));
      }
    } catch (err: any) {
      console.error("Failed to enhance prompt:", err);
      alert("Notice: " + (err.message || "Failed to enhance prompt"));
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleClearAttachedImage = () => {
    setAttachedImage(null);
    setAttachedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetDefaults = () => {
    handleClearAttachedImage();
    setDetectedTheme(null);
    fetchSpotlights();
  };

  const selectedItem = spotlightList.find(b => b.id === selectedId) || spotlightList[0];

  const handleDownload = (item: SpotlightVariation) => {
    const link = document.createElement('a');
    link.href = item.downloadUrl;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(item.id);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadAll = () => {
    spotlightList.forEach((b, index) => {
      setTimeout(() => {
        handleDownload(b);
      }, index * 300);
    });
  };

  const activeModelDisplay = apiProvider === 'openrouter' 
    ? (isCustomModel && customModelInput.trim() ? customModelInput.trim() : openrouterModel)
    : geminiModel;

  const isCurrentModelVision = () => {
    if (apiProvider === 'gemini') return true;
    const target = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;
    for (const group of OPENROUTER_MODEL_GROUPS) {
      const found = group.models.find(m => m.id === target);
      if (found) return found.vision;
    }
    return true; // Default fallback to true for custom models
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20 text-white">
              <Sparkles className="w-5 h-5 font-bold text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Adobe Stock 4K PNG Studio</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-mono">
                  4K UHD RGBA
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono border ${
                  apiProvider === 'openrouter'
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  {apiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'}
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 mt-0.5">
                <span>Active Model:</span>
                <span className="font-mono text-cyan-400 text-[11px] font-semibold">{activeModelDisplay}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
                (apiProvider === 'gemini' && savedApiKey) || (apiProvider === 'openrouter' && savedOpenrouterKey)
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white'
              }`}
            >
              <Key className={`w-3.5 h-3.5 ${(apiProvider === 'gemini' && savedApiKey) || (apiProvider === 'openrouter' && savedOpenrouterKey) ? 'text-emerald-400' : 'text-cyan-400'}`} />
              <div className="flex flex-col items-start text-left">
                <span className="text-[11px] leading-none">{apiProvider === 'openrouter' ? 'OpenRouter API' : 'Gemini API'}</span>
                <span className="text-[9px] text-slate-400 font-mono leading-none mt-0.5 max-w-[120px] truncate">
                  {activeModelDisplay.split('/').pop()}
                </span>
              </div>
              {((apiProvider === 'gemini' && savedApiKey) || (apiProvider === 'openrouter' && savedOpenrouterKey)) ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
              )}
            </button>

            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 bg-gradient-to-r from-slate-100 via-cyan-300 to-cyan-500 hover:from-white hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4 text-slate-950" />
              <span>Download All Assets</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Claude-Level Top Free AI Models Quick Switcher Bar */}
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-400 rounded-xl text-slate-950 shadow-md font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>Claude 3.7 Grade AI Models</span>
                <span className="text-[9px] px-2 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full font-mono border border-emerald-500/30 font-bold">100% Free Tiers</span>
              </h3>
              <p className="text-[11px] text-slate-400">One-click switch to world-class Python vector artists & deep reasoning models.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto relative z-10">
            {TOP_CLAUDE_FREE_MODELS.map((item) => {
              const isActive = apiProvider === 'openrouter' && openrouterModel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setApiProvider('openrouter');
                    localStorage.setItem('user_api_provider', 'openrouter');
                    setOpenrouterModel(item.id);
                    localStorage.setItem('user_openrouter_model', item.id);
                    setIsCustomModel(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20 ring-1 ring-purple-400/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-500/40 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono font-bold">{item.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Image Attachment & Gemini AI Generator Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 rounded-2xl border border-purple-500/30 p-6 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl shadow-lg text-slate-950">
                <Wand2 className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Attach Reference Image to Generate 4 Color Style Variations</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                    apiProvider === 'openrouter'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {apiProvider === 'openrouter' ? 'OpenRouter AI' : 'Gemini AI'} Powered
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Upload, drag & drop, or press Ctrl+V to attach any image. The AI will analyze its artistic style and render 4 high-res 4K transparent PNG variations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {((apiProvider === 'gemini' && savedApiKey) || (apiProvider === 'openrouter' && savedOpenrouterKey)) ? (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs text-emerald-200 hover:bg-emerald-900/80 cursor-pointer"
                  title="Click to manage saved API key and model"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{apiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} Key: <strong className="text-white font-mono">{(apiProvider === 'openrouter' ? savedOpenrouterKey : savedApiKey).slice(0, 6)}...{(apiProvider === 'openrouter' ? savedOpenrouterKey : savedApiKey).slice(-4)}</strong></span>
                </button>
              ) : (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 cursor-pointer"
                  title="Click to configure custom API key and model"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configure {apiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API</span>
                </button>
              )}

              {detectedTheme && (
                <div className="flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-xs text-cyan-200">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Active Theme: <strong className="text-white font-semibold">{detectedTheme}</strong></span>
                </div>
              )}

              {(attachedImage || detectedTheme) && (
                <button
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:border-red-500/50 hover:bg-red-950/40 text-slate-300 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                  title="Clear attached image and restore 4K default variations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear & Reset Defaults</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            {/* Dropzone & Attachment Input (7 cols) */}
            <div className="md:col-span-7">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!attachedImage ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group ${
                    dragActive 
                      ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]' 
                      : 'border-slate-700/80 bg-slate-950/60 hover:border-cyan-500/60 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-cyan-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Click to Browse or Drag & Drop Image Here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PNG, JPG, WEBP • You can also press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">Ctrl+V</kbd> to paste
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0 relative group">
                      <img
                        src={attachedImage}
                        alt="Attached Reference"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                          {attachedFileName || 'attached_reference_image.png'}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                          Attached
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ready for Gemini API style analysis & 4K PNG variation rendering.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClearAttachedImage}
                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-950/50 rounded-xl border border-slate-800 hover:border-red-500/40 transition-all cursor-pointer"
                    title="Remove Attached Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Prompt Input & Action Triggers (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-center space-y-3">
              {/* Asset Generation Parameters (Variations & Aspect Ratio) */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Variations Count:</span>
                    <span className="text-[10px] text-cyan-400 font-mono">{numVariations} Images</span>
                  </label>
                  <select
                    value={numVariations}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNumVariations(val);
                      localStorage.setItem('user_num_variations', String(val));
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value={2}>2 Variations</option>
                    <option value={4}>4 Variations (Default)</option>
                    <option value={6}>6 Variations</option>
                    <option value={8}>8 Variations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Canvas Ratio:</span>
                    <span className="text-[10px] text-purple-400 font-mono">{aspectRatio}</span>
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAspectRatio(val);
                      localStorage.setItem('user_aspect_ratio', val);
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="16:9">16:9 (3840 x 2160 px)</option>
                    <option value="1:1">1:1 (3840 x 3840 px Square)</option>
                    <option value="9:16">9:16 (2160 x 3840 px Vertical)</option>
                    <option value="4:3">4:3 (3840 x 2880 px)</option>
                    <option value="3:2">3:2 (3840 x 2560 px)</option>
                  </select>
                </div>
              </div>

              {/* Prompt Template Selector Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Select Prompt Template:</span>
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {promptTemplateMode === 'template_1' ? 'Template 1 (Default Full Specs)' : 'Template 2 (Concise Style)'}
                  </span>
                </div>

                {/* Template Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptTemplateMode('template_1');
                      localStorage.setItem('user_prompt_template_mode', 'template_1');
                      setSubjectPrompt(DEFAULT_TEMPLATE_1_PROMPT);
                      localStorage.setItem('user_subject_prompt', DEFAULT_TEMPLATE_1_PROMPT);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      promptTemplateMode === 'template_1'
                        ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Template 1 (Default Specs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPromptTemplateMode('template_2');
                      localStorage.setItem('user_prompt_template_mode', 'template_2');
                      setSubjectPrompt(DEFAULT_TEMPLATE_2_PROMPT);
                      localStorage.setItem('user_subject_prompt', DEFAULT_TEMPLATE_2_PROMPT);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      promptTemplateMode === 'template_2'
                        ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Template 2 (Concise Style)</span>
                  </button>
                </div>

                {/* Hot 1-Click Asset Presets */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>One-Click Top Selling Presets (Auto-Write Prompt):</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {HOT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSubjectPrompt(preset.prompt);
                          localStorage.setItem('user_subject_prompt', preset.prompt);
                        }}
                        className="p-2 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/50 rounded-xl text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-pink-300 truncate">{preset.title}</span>
                          <span className="text-[8px] px-1 py-0.2 bg-pink-500/10 text-pink-300 rounded border border-pink-500/20 font-mono">{preset.badge}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Textarea Box (Auto-Populates & Auto-Saves) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <span>Editable Prompt Box:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancingPrompt}
                        className="px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 shadow-sm shadow-purple-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Enhance prompt with Claude 3.7 level 4K graphics specifications"
                      >
                        {isEnhancingPrompt ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Enhancing...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3" />
                            <span>✨ Enhance Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const defaultText = promptTemplateMode === 'template_2' ? DEFAULT_TEMPLATE_2_PROMPT : DEFAULT_TEMPLATE_1_PROMPT;
                          setSubjectPrompt(defaultText);
                          localStorage.setItem('user_subject_prompt', defaultText);
                        }}
                        className="text-[10px] text-slate-400 hover:text-cyan-400 hover:underline cursor-pointer"
                      >
                        Reset Default
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={subjectPrompt}
                    onChange={(e) => {
                      setSubjectPrompt(e.target.value);
                      localStorage.setItem('user_subject_prompt', e.target.value);
                    }}
                    placeholder="Describe your subject or edit prompt template here..."
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono resize-none leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* Vision Warning Banner if image attached with text-only model */}
              {attachedImage && apiProvider === 'openrouter' && !isCurrentModelVision() && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-start gap-2.5 text-amber-200 text-xs shadow-md">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-amber-300">Vision Notice:</strong> Current model (<span className="font-mono text-white font-bold">{openrouterModel}</span>) is a <strong>Text-Only model</strong> (cannot see attached images).
                    To replicate your attached image with 100% accuracy, please <button type="button" onClick={() => setShowApiKeyModal(true)} className="underline text-cyan-300 font-bold hover:text-cyan-200 cursor-pointer">switch to an 👁️ Vision Model</button> (e.g. <em>Gemini 2.5 Flash, Gemini Flash Lite Free, Claude 3.5 Sonnet, or GPT-4o</em>).
                  </div>
                </div>
              )}

              {/* Python Code Engine Trigger Button */}
              <button
                onClick={handleGeneratePythonAsset}
                disabled={isPythonGenerating || isAnalyzing}
                className={`w-full py-3 px-5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  isPythonGenerating
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/50 cursor-wait'
                    : apiProvider === 'openrouter'
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 shadow-purple-500/20 active:scale-[0.98]'
                    : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
                }`}
              >
                {isPythonGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{apiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} + Python 4K Rendering...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950 font-bold" />
                    <span>Build 4K PNG via {apiProvider === 'openrouter' ? 'OpenRouter API' : 'Gemini Engine'}</span>
                  </>
                )}
              </button>

              {/* AI Variation Trigger Button */}
              <button
                onClick={handleGenerateVariations}
                disabled={!attachedImage || isAnalyzing || isPythonGenerating}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                  !attachedImage
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                    : isAnalyzing
                    ? 'bg-purple-900/80 text-purple-200 border-purple-500/50 cursor-wait'
                    : 'bg-purple-950/60 border-purple-500/40 text-purple-200 hover:bg-purple-900/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Generate 4 Variations via {apiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'}</span>
              </button>

              {pythonCodeOutput && (
                <button
                  onClick={() => setShowCodeModal(true)}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  <span>View Generated Python Code & Logs</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Showcase & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Stage Preview (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-2xl space-y-4">
              
              {/* Preview Stage Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">
                    Live 4K Transparent PNG Graphic Cutout Preview
                  </span>
                  {selectedItem && (
                    <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md font-mono">
                      {selectedItem.resolution}
                    </span>
                  )}
                </div>

                {/* Canvas Background Mode Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 px-2 font-medium">
                    Test Canvas Background:
                  </span>

                  <button
                    onClick={() => setBgMode('dark')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'dark'
                        ? 'bg-cyan-400 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Dark Studio Canvas"
                  >
                    <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-700" />
                    <span>Dark Canvas</span>
                  </button>

                  <button
                    onClick={() => setBgMode('checkerboard')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'checkerboard'
                        ? 'bg-cyan-400 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Transparent Grid Background"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Alpha Grid</span>
                  </button>

                  <button
                    onClick={() => setBgMode('white')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'white'
                        ? 'bg-cyan-400 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="White Background"
                  >
                    <div className="w-3 h-3 rounded-full bg-white border border-slate-300" />
                    <span>White</span>
                  </button>

                  <button
                    onClick={() => setBgMode('cream_parchment')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'cream_parchment'
                        ? 'bg-cyan-400 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Parchment Background"
                  >
                    <Palette className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Parchment</span>
                  </button>
                </div>
              </div>

              {/* Display Canvas Box */}
              <div 
                className={`relative min-h-[360px] sm:min-h-[460px] rounded-xl overflow-hidden flex items-center justify-center p-6 border border-slate-800 transition-colors duration-300 ${
                  bgMode === 'checkerboard' ? 'bg-checkerboard' :
                  bgMode === 'white' ? 'bg-white' :
                  bgMode === 'dark' ? 'bg-slate-950' :
                  'bg-[#FBF8EF]'
                }`}
              >
                {isLoading || isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-300">
                      {isAnalyzing ? "Gemini AI analyzing image style & rendering 4K variations..." : "Loading 4K PNG spotlight beam assets..."}
                    </span>
                  </div>
                ) : selectedItem ? (
                  <motion.div 
                    key={selectedItem.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative max-w-full flex items-center justify-center group h-full"
                  >
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.name}
                      className="max-w-full max-h-[420px] object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                    />

                    {/* Quick overlay button */}
                    <button
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-slate-200 p-2 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 shadow-xl cursor-pointer"
                      title="Inspect Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : null}
              </div>

              {/* Download Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>True Alpha (32-Bit RGBA Cutout)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-300">{selectedItem?.resolution || '3840 × 2160 px'} ({selectedItem?.fileSize || '3.50 MB'})</span>
                  </div>
                </div>

                {selectedItem && (
                  <button
                    onClick={() => handleDownload(selectedItem)}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-100 via-cyan-300 to-cyan-500 hover:from-white hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
                  >
                    {downloadSuccess === selectedItem.id ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>Downloaded Lossless 4K PNG!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-slate-950" />
                        <span>Download 4K Graphic PNG ({selectedItem.fileSize})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Right Info Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Tech Specs Box */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>4K Asset Technical Specifications</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Resolution Standard</span>
                  <span className="font-mono text-cyan-400 font-bold">3840 × 2160 (4K UHD)</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">File Size Range</span>
                  <span className="font-mono text-emerald-400 font-semibold">2.0 MB - 10.0 MB Guaranteed</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Alpha Transparency</span>
                  <span className="font-mono text-slate-200 font-semibold">True 32-bit RGBA Cutout</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Gemini API Engine</span>
                  <span className="font-mono text-purple-400 font-semibold">{geminiModel} Multi-Modal</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Particle Grain Texture</span>
                  <span className="font-mono text-cyan-400 font-semibold">Ultra-Dense Stardust & Micro Spray</span>
                </div>
              </div>
            </div>

            {/* Color Palette Details for Selected Frame */}
            {selectedItem && (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Selected Asset Profile</span>
                </h2>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Primary Tone</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 shadow-sm" 
                        style={{ backgroundColor: selectedItem.primaryColor }} 
                      />
                      <span className="font-mono text-slate-200 font-medium">{selectedItem.primaryColor}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Secondary Tone</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 shadow-sm" 
                        style={{ backgroundColor: selectedItem.secondaryColor }} 
                      />
                      <span className="font-mono text-slate-200 font-medium">{selectedItem.secondaryColor}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block mb-1">Visual Design Features:</span>
                    <p className="text-slate-200 font-medium text-[11px]">
                      {selectedItem.styleDesc}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Gallery Grid Section */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>4K PNG Graphics Collection Gallery (4 Variations)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Explore high-resolution cutout assets with true 32-bit RGBA alpha transparency and realistic textures on transparent background.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {spotlightList.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`group relative bg-slate-900/90 rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-xl shadow-cyan-500/10' 
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div className="p-4 bg-slate-950 min-h-[190px] flex items-center justify-center relative border-b border-slate-800/80">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="max-h-[160px] max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Active Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-3 left-3 bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-sm text-cyan-400 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-800 font-bold">
                      {item.fileSize}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-cyan-300/80 mt-1 line-clamp-2 font-medium">
                        {item.styleDesc}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        {item.resolution}
                      </span>
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-medium mr-1">Tone Spectrum:</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: item.primaryColor }} title="Primary Tone" />
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: item.secondaryColor }} title="Secondary Tone" />
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-slate-200 font-semibold rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-1.5 mt-2 active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download 4K ({item.fileSize})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 sm:p-8"
            onClick={() => setIsZoomOpen(false)}
          >
            <div 
              className="max-w-5xl w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">{selectedItem.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">{selectedItem.resolution} (4K UHD) • {selectedItem.fileSize}</span>
                </div>
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close (ESC)
                </button>
              </div>

              <div className="p-6 bg-slate-950 flex-1 flex items-center justify-center overflow-auto min-h-[420px]">
                <img
                  src={selectedItem.url}
                  alt={selectedItem.name}
                  className="max-w-full max-h-[65vh] object-contain drop-shadow-2xl"
                />
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900">
                <p className="text-xs text-slate-400">
                  Full resolution 4K PNG graphics cutout asset with true RGBA alpha transparency ({selectedItem.fileSize}).
                </p>
                <button
                  onClick={() => handleDownload(selectedItem)}
                  className="px-5 py-2 bg-gradient-to-r from-slate-100 via-cyan-300 to-cyan-500 hover:from-white hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Lossless 4K PNG ({selectedItem.fileSize})</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key & Model Settings Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowApiKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-slate-950 shadow-md">
                    <Key className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">AI Provider & Model Settings</h3>
                    <p className="text-xs text-slate-400">Configure OpenRouter or Gemini API keys, select verified models, and test connections.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Provider Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setApiProvider('openrouter');
                      localStorage.setItem('user_api_provider', 'openrouter');
                      setApiKeyVerifyStatus('idle');
                      setApiKeyVerifyMsg(null);
                    }}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      apiProvider === 'openrouter'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>OpenRouter API</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono">30+ Models</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setApiProvider('gemini');
                      localStorage.setItem('user_api_provider', 'gemini');
                      setApiKeyVerifyStatus('idle');
                      setApiKeyVerifyMsg(null);
                    }}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      apiProvider === 'gemini'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Google Gemini API</span>
                  </button>
                </div>

                {apiProvider === 'openrouter' ? (
                  /* OpenRouter Configuration Section */
                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-purple-500/20">
                    <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] text-purple-200 leading-relaxed">
                        <strong className="text-purple-300">OpenRouter Free & Pro Models:</strong> OpenRouter provides access to 30+ AI models. To use any model (including free ones like DeepSeek & Gemini Flash), please generate a free API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline text-cyan-300 font-bold hover:text-cyan-200">openrouter.ai/keys</a> (no credit card needed).
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-purple-400" />
                          <span>OpenRouter API Key</span>
                        </span>
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <span>Get Key from OpenRouter</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyText ? "text" : "password"}
                          value={openrouterKeyInput}
                          onChange={(e) => setOpenrouterKeyInput(e.target.value)}
                          placeholder="sk-or-v1-..."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-purple-400/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyText(!showApiKeyText)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showApiKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-purple-400" />
                          <span>Select OpenRouter Working Model:</span>
                        </label>
                        <span className="text-[10px] text-purple-400 font-mono truncate max-w-[200px]">
                          {isCustomModel ? (customModelInput || 'custom') : openrouterModel}
                        </span>
                      </div>

                      <select
                        value={isCustomModel ? "custom" : openrouterModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setIsCustomModel(true);
                          } else {
                            setIsCustomModel(false);
                            setOpenrouterModel(val);
                            localStorage.setItem('user_openrouter_model', val);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-400 cursor-pointer"
                      >
                        {OPENROUTER_MODEL_GROUPS.map((group, gIdx) => (
                          <optgroup key={gIdx} label={group.category} className="bg-slate-900 text-slate-300 font-bold">
                            {group.models.map((m) => (
                              <option key={m.id} value={m.id} className="bg-slate-950 text-slate-100 font-normal">
                                [{m.badge}] {m.vision ? '👁️ [Vision]' : '📝 [Text]'} {m.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="✏️ Custom Model" className="bg-slate-900 text-purple-400 font-bold">
                          <option value="custom" className="bg-slate-950 text-purple-300 font-normal">
                            + Enter Custom OpenRouter Model ID...
                          </option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Custom Model Input Field if selected */}
                    {isCustomModel && (
                      <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl space-y-1.5">
                        <label className="block text-[11px] font-semibold text-purple-300">
                          Custom Model ID (e.g. `anthropic/claude-3.5-sonnet:beta`, `x-ai/grok-2-vision-1212`):
                        </label>
                        <input
                          type="text"
                          value={customModelInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomModelInput(val);
                            localStorage.setItem('user_openrouter_custom_model', val);
                            if (val.trim()) {
                              setOpenrouterModel(val.trim());
                              localStorage.setItem('user_openrouter_model', val.trim());
                            }
                          }}
                          placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                          className="w-full bg-slate-950 border border-purple-500/50 rounded-lg px-3 py-2 text-xs text-purple-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                        />
                      </div>
                    )}

                    {/* Test & Verification Action for OpenRouter */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyOpenRouterKey}
                        disabled={apiKeyVerifyStatus === 'verifying'}
                        className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {apiKeyVerifyStatus === 'verifying' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing Model Connection...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5" />
                            <span>Test OpenRouter Key & Model</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Gemini Configuration Section */
                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-cyan-500/20">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Gemini API Key</span>
                        </span>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>Get Key from Google AI Studio</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyText ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyText(!showApiKeyText)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showApiKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Select Gemini AI Model:</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 font-mono">{geminiModel}</span>
                      </label>
                      <select
                        value={geminiModel}
                        onChange={(e) => {
                          setGeminiModel(e.target.value);
                          localStorage.setItem('user_gemini_model', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                      >
                        {GEMINI_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Test & Verification Action for Gemini */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyApiKey}
                        disabled={apiKeyVerifyStatus === 'verifying'}
                        className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {apiKeyVerifyStatus === 'verifying' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing Model Connection...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5" />
                            <span>Test Gemini Key & Model</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Notice Display */}
                {apiKeyVerifyMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    apiKeyVerifyStatus === 'valid'
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : apiKeyVerifyStatus === 'invalid'
                      ? 'bg-red-950/70 border-red-500/50 text-red-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}>
                    {apiKeyVerifyStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                    {apiKeyVerifyStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    {apiKeyVerifyStatus === 'verifying' && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 leading-relaxed">
                      <span>{apiKeyVerifyMsg}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (apiProvider === 'gemini') {
                          handleSaveApiKey();
                        } else {
                          const val = openrouterKeyInput.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
                          if (val) {
                            setSavedOpenrouterKey(val);
                            localStorage.setItem('user_openrouter_api_key', val);
                            const targetModel = (isCustomModel && customModelInput.trim()) ? customModelInput.trim() : openrouterModel;
                            setOpenrouterModel(targetModel);
                            localStorage.setItem('user_openrouter_model', targetModel);
                            setApiKeyVerifyStatus('valid');
                            setApiKeyVerifyMsg(`OpenRouter Key saved with active model: ${targetModel}`);
                          } else {
                            setApiKeyVerifyStatus('invalid');
                            setApiKeyVerifyMsg('⚠️ Please paste your OpenRouter API Key (sk-or-v1-...) before saving.');
                          }
                        }
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 hover:from-cyan-300 hover:to-pink-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Settings & Key</span>
                    </button>
                  </div>

                  {(savedApiKey || savedOpenrouterKey) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (apiProvider === 'gemini') {
                          handleClearApiKey();
                        } else {
                          setOpenrouterKeyInput('');
                          setSavedOpenrouterKey('');
                          localStorage.removeItem('user_openrouter_api_key');
                          setApiKeyVerifyStatus('idle');
                          setApiKeyVerifyMsg('OpenRouter API Key cleared.');
                        }
                      }}
                      className="px-3 py-2 text-slate-400 hover:text-red-400 text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Clear Saved Key
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Python Code & Execution Log Modal */}
      <AnimatePresence>
        {showCodeModal && pythonCodeOutput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Zap className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Generated Python 4K PNG Code & Logs</h3>
                    <p className="text-xs text-slate-400 font-mono">generate.py • Executed using PyCairo, Pillow, OpenCV, NumPy</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <h4 className="text-xs font-semibold text-cyan-400 mb-1 font-mono">Python Code (generate.py):</h4>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto selection:bg-emerald-500/30 max-h-[300px]">
                    {pythonCodeOutput}
                  </pre>
                </div>

                {execLogsOutput && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-400 mb-1 font-mono">Execution Logs & Terminal Output:</h4>
                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[150px]">
                      {execLogsOutput}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <p>3840 × 2160 4K UHD PNG Cutout Graphics Studio • High-Fidelity Gemini AI Style Generator</p>
      </footer>
    </div>
  );
}

