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

export const GEMINI_MODELS = [
  { id: "gemini-3.7-flash", name: "gemini-3.7-flash (Latest 3.7 Flash - Recommended)" },
  { id: "gemini-3.7-pro", name: "gemini-3.7-pro (3.7 Pro Deep Reasoning)" },
  { id: "gemini-2.5-flash", name: "gemini-2.5-flash (2.5 Flash Stable)" },
  { id: "gemini-2.5-pro", name: "gemini-2.5-pro (2.5 Pro High Quality)" },
  { id: "gemini-2.0-flash", name: "gemini-2.0-flash (2.0 Flash)" },
  { id: "gemini-1.5-flash", name: "gemini-1.5-flash (1.5 Flash High Quota)" },
];

export const DEFAULT_TEMPLATE_1_PROMPT = `ROLE
You are a world-class Python graphics and computer vision engineer. Build a commercial-grade 4K transparent PNG asset entirely in code using PyCairo, Pillow (PIL), NumPy, and OpenCV.
Do NOT use AI background-removal; construct the exact visual phenomenon programmatically using mathematical paths, Bezier curves, radial/linear gradients, and compositing.

SUBJECT & REFERENCE REPLICATION (CRITICAL):
- Carefully look at the attached reference image.
- Faithfully REPLICATE the EXACT visual subject and optical phenomenon present in the reference:
  * If it is an OPTICAL LENS FLARE / HORIZONTAL LIGHT STREAK / ANAMORPHIC BEAM:
    - Draw the glowing white-hot focal core at the center.
    - Draw the wide razor-sharp horizontal anamorphic light streaks spanning across the canvas using linear gradients with smooth alpha falloff.
    - Draw the multi-point starburst / diamond diffraction rays radiating outward.
    - Draw soft chromatic halo rings and subtle glowing stardust bokeh particles.
  * If it is a STICKY NOTE / PAPER: Draw the paper rectangle, curled corner, pushpin/tape, and subtle shadow.
  * If it is a BADGE / SEAL: Draw the 3D beveled circle/shield, star rosette, ribbons, and metallic reflection.
  * If it is a CERTIFICATE FRAME: Draw the border frame with ornate corner wings and 100% transparent center window.
  * If it is any other graphic: faithfully recreate its exact shapes, geometry, and lighting.

BACKGROUND & TRANSPARENCY REQUIREMENTS (MANDATORY):
1. Background MUST be 100% transparent (RGBA with alpha = 0). Canvas size: 3840 x 2160 px.
2. ABSOLUTELY NO BACKGROUND RECTANGLES, NO DARK BOXES, NO GREY VIGNETTING, NO DROP SHADOW ON THE OVERALL CANVAS BACKGROUND.
3. Every graphic element must fade smoothly to alpha=0 at its outer perimeter.
4. Generate 4 distinct premium colorway variations (output_v1.png to output_v4.png) in the current directory.
5. Each output PNG file size must be clean and uncompressed (2.0 MB to 10.0 MB).`;

export const DEFAULT_TEMPLATE_2_PROMPT = `I am attaching a reference image. Write a complete runnable Python script (generate.py) using PyCairo, Pillow, numpy, and OpenCV to programmatically create 4K PNG transparent background images that ACCURATELY REPLICATE this reference artwork.
Replicate its exact visual elements, light streaks, flares, glows, or geometry faithfully.
Background MUST be 100% transparent (alpha = 0) with zero dark boxes and zero background shadows.
Output 4 unique premium color variations of this subject (output_v1.png to output_v4.png).`;

export default function App() {
  const [spotlightList, setSpotlightList] = useState<SpotlightVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('optical_lens_flare_cyan');
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

  // Variation Count & Canvas Ratio States (Persisted in localStorage)
  const [numVariations, setNumVariations] = useState<number>(() => Number(localStorage.getItem('user_num_variations')) || 4);
  const [aspectRatio, setAspectRatio] = useState<string>(() => localStorage.getItem('user_aspect_ratio') || '16:9');

  // Custom User Gemini API Key & Model States (Persisted in localStorage)
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem('user_gemini_api_key') || '');
  const [savedApiKey, setSavedApiKey] = useState<string>(() => localStorage.getItem('user_gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<string>(() => localStorage.getItem('user_gemini_model') || 'gemini-3.7-flash');

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
          const defaultItem = list.find((item: SpotlightVariation) => item.id === 'optical_lens_flare_cyan') || list[0];
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
        setSavedApiKey(keyToTest);
        localStorage.setItem('user_gemini_api_key', keyToTest);
      } else {
        setApiKeyVerifyStatus('invalid');
        setApiKeyVerifyMsg(`❌ Gemini Error: ${data.error || 'Failed to verify Gemini API key'}`);
      }
    } catch (err: any) {
      setApiKeyVerifyStatus('invalid');
      setApiKeyVerifyMsg('Network error verifying Gemini API key');
    }
  };

  const handleGenerateVariations = async () => {
    if (!attachedImage) return;

    try {
      setIsAnalyzing(true);
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'x-gemini-model': geminiModel
      };
      if (savedApiKey) {
        headers['x-gemini-api-key'] = savedApiKey;
      }
      const res = await fetch('/api/generate-image-variations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          imageDataUrl: attachedImage, 
          apiKey: savedApiKey, 
          geminiModel
        }),
      });
      const data = await res.json();
      if (data.success && data.spotlights) {
        setSpotlightList(data.spotlights);
        setDetectedTheme(data.themeName || "Optical Lens Flare & Light Effects");
        if (data.spotlights.length > 0) {
          setSelectedId(data.spotlights[0].id);
        }
      } else if (data.error) {
        alert("Notice: " + data.error);
      }
    } catch (err: any) {
      console.error("Failed to generate image variations:", err);
      alert("Notice: " + (err.message || "Failed to generate variations"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePythonAsset = async () => {
    try {
      setIsPythonGenerating(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedApiKey) {
        headers['x-gemini-api-key'] = savedApiKey;
      }

      let finalPrompt = subjectPrompt.trim();
      if (!finalPrompt || finalPrompt.includes('<describe')) {
        const defaultSubject = attachedImage ? 'High resolution 4K transparent vector asset inspired by attached reference image' : 'Realistic 4K transparent vector asset';
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
        alert("Notice: " + (data.error || "Failed to execute Python script"));
      }
    } catch (err: any) {
      console.error("Failed to generate Python asset:", err);
      alert("Notice: " + err.message);
    } finally {
      setIsPythonGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    try {
      setIsEnhancingPrompt(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedApiKey) headers['x-gemini-api-key'] = savedApiKey;

      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: subjectPrompt,
          imageDataUrl: attachedImage,
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

  const handleResetDefaults = () => {
    setAttachedImage(null);
    setAttachedFileName(null);
    setDetectedTheme(null);
    fetchSpotlights();
  };

  const handleDownloadSingle = (item: SpotlightVariation) => {
    const link = document.createElement('a');
    link.href = item.downloadUrl || item.url;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(item.filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadAll = () => {
    spotlightList.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.downloadUrl || item.url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });

    setDownloadSuccess("All 4K PNG Assets");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const currentSpotlight = spotlightList.find(item => item.id === selectedId) || spotlightList[0];

  const getBackgroundStyle = () => {
    switch (bgMode) {
      case 'dark':
        return 'bg-slate-950';
      case 'light':
        return 'bg-slate-100';
      case 'navy':
        return 'bg-[#0A1931]';
      case 'checkerboard':
      default:
        return 'bg-checkerboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
              <Sparkles className="w-5 h-5 font-bold text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>4K PNG Graphics Studio</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-mono">
                  4K UHD RGBA
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full font-mono border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                  Google Gemini AI
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 mt-0.5">
                <span>Active Model:</span>
                <span className="font-mono text-cyan-400 text-[11px] font-semibold">{geminiModel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
                savedApiKey
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white'
              }`}
            >
              <Key className={`w-3.5 h-3.5 ${savedApiKey ? 'text-emerald-400' : 'text-cyan-400'}`} />
              <div className="flex flex-col items-start text-left">
                <span className="text-[11px] leading-none">Gemini API Key</span>
                <span className="text-[9px] text-slate-400 font-mono leading-none mt-0.5 max-w-[120px] truncate">
                  {geminiModel}
                </span>
              </div>
              {savedApiKey ? (
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

        {/* Dynamic Image Attachment & Gemini AI Generator Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 rounded-2xl border border-cyan-500/30 p-6 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg text-slate-950">
                <Wand2 className="w-5 h-5 font-bold text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Attach Reference Image to Generate 4 High-Fidelity 4K Variations</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    Gemini Vision AI
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Upload, drag & drop, or press Ctrl+V to attach any image (Optical Flare, Glow, Badge, Note, Graphic). The AI will replicate ONLY its exact visual elements on 100% transparent background.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {savedApiKey ? (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs text-emerald-200 hover:bg-emerald-900/80 cursor-pointer"
                  title="Click to manage saved API key"
                >
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gemini Key: <strong className="text-white font-mono">{savedApiKey.slice(0, 6)}...{savedApiKey.slice(-4)}</strong></span>
                </button>
              ) : (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 cursor-pointer"
                  title="Click to configure custom Gemini API key"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configure Gemini API Key</span>
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
                  title="Clear attached image and restore defaults"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Image</span>
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
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-950/40 scale-[1.01]'
                      : 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/60 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Click to browse or drag & drop reference image
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PNG, JPG, WebP • Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-cyan-300 font-mono">Ctrl+V</kbd> anywhere to paste screenshot
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950 p-3 flex items-center gap-4">
                  <div className="w-28 h-28 rounded-xl overflow-hidden border border-slate-800 bg-checkerboard flex-shrink-0 flex items-center justify-center">
                    <img
                      src={attachedImage}
                      alt="Reference"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                        REFERENCE IMAGE ATTACHED
                      </span>
                    </div>
                    <h3 className="text-xs font-mono text-slate-200 truncate mt-1">
                      {attachedFileName || "Pasted image from clipboard"}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Gemini Vision AI is ready to replicate this exact effect with 100% transparent background.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setAttachedFileName(null);
                    }}
                    className="p-2 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 hover:border-red-500/40 transition-all cursor-pointer"
                    title="Remove attached image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Control & Prompt Settings Panel (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                {/* Generation Variation Count & Ratio Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Variation Count:</label>
                    <div className="flex items-center gap-1">
                      {[2, 4, 6].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            setNumVariations(cnt);
                            localStorage.setItem('user_num_variations', String(cnt));
                          }}
                          className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            numVariations === cnt
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Canvas Aspect Ratio:</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => {
                        setAspectRatio(e.target.value);
                        localStorage.setItem('user_aspect_ratio', e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="16:9">16:9 (3840x2160)</option>
                      <option value="1:1">1:1 (3840x3840)</option>
                      <option value="9:16">9:16 (2160x3840)</option>
                      <option value="4:3">4:3 (3840x2880)</option>
                      <option value="3:2">3:2 (3840x2560)</option>
                    </select>
                  </div>
                </div>

                {/* Prompt Template Mode Tabs */}
                <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptTemplateMode('template_1');
                      localStorage.setItem('user_prompt_template_mode', 'template_1');
                      setSubjectPrompt(DEFAULT_TEMPLATE_1_PROMPT);
                      localStorage.setItem('user_subject_prompt', DEFAULT_TEMPLATE_1_PROMPT);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      promptTemplateMode === 'template_1'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Template 1 (PyCairo Detailed)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPromptTemplateMode('template_2');
                      localStorage.setItem('user_prompt_template_mode', 'template_2');
                      setSubjectPrompt(DEFAULT_TEMPLATE_2_PROMPT);
                      localStorage.setItem('user_subject_prompt', DEFAULT_TEMPLATE_2_PROMPT);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      promptTemplateMode === 'template_2'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Template 2 (Concise Style)</span>
                  </button>
                </div>

                {/* Prompt Textarea Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <span>Editable Prompt Specification:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancingPrompt}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Enhance prompt specifications with Gemini"
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

              {/* Python Code Engine Trigger Button */}
              <button
                onClick={handleGeneratePythonAsset}
                disabled={isPythonGenerating || isAnalyzing}
                className="w-full py-3 px-5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isPythonGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Gemini + Python 4K Rendering...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950 font-bold" />
                    <span>Build 4K PNG via Gemini Engine</span>
                  </>
                )}
              </button>

              {/* AI Direct Variation Trigger Button */}
              <button
                onClick={handleGenerateVariations}
                disabled={!attachedImage || isAnalyzing || isPythonGenerating}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
                  !attachedImage
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                    : isAnalyzing
                    ? 'bg-blue-900/80 text-blue-200 border-blue-500/50 cursor-wait'
                    : 'bg-blue-950/60 border-blue-500/40 text-blue-200 hover:bg-blue-900/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant 4 Variations via Gemini Vision</span>
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

        {/* Studio Viewer & Asset Showcase */}
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Loading 4K Assets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive 4K Canvas View (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      4K UHD PREVIEW (3840 × 2160)
                    </span>
                  </div>

                  {/* Background Toggle Controls */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setBgMode('checkerboard')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        bgMode === 'checkerboard' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Checkerboard Alpha Transparency"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Transparent</span>
                    </button>
                    <button
                      onClick={() => setBgMode('dark')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        bgMode === 'dark' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Dark Slate Background"
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Dark</span>
                    </button>
                    <button
                      onClick={() => setBgMode('navy')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        bgMode === 'navy' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Deep Navy Background"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Navy</span>
                    </button>
                  </div>
                </div>

                {/* Main 4K Image Render Container */}
                <div
                  className={`w-full aspect-[16/9] rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800/80 transition-colors duration-300 ${getBackgroundStyle()}`}
                >
                  {currentSpotlight ? (
                    <img
                      src={currentSpotlight.url}
                      alt={currentSpotlight.name}
                      className="w-full h-full object-contain select-none"
                    />
                  ) : (
                    <div className="text-center text-slate-500">
                      <FileImage className="w-12 h-12 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-mono">No Asset Selected</p>
                    </div>
                  )}

                  {/* Zoom Fullscreen Action */}
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 rounded-xl text-slate-300 hover:text-cyan-400 transition-all shadow-lg cursor-pointer"
                    title="Open Fullscreen View"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Asset Details Bar */}
                {currentSpotlight && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{currentSpotlight.name}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{currentSpotlight.styleDesc}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400">
                        {currentSpotlight.fileSize || "3.50 MB"}
                      </span>
                      <button
                        onClick={() => handleDownloadSingle(currentSpotlight)}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download 4K PNG</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Variation Palette Cards (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Generated Variations ({spotlightList.length})</span>
                  </h3>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {spotlightList.map((item, idx) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-checkerboard flex-shrink-0 flex items-center justify-center">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-cyan-400 font-mono">
                              V{idx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {item.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.styleDesc}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.fileSize || "3.50 MB"}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-700"
                                style={{ backgroundColor: item.primaryColor }}
                              />
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-700"
                                style={{ backgroundColor: item.secondaryColor }}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(item);
                          }}
                          className="p-2 bg-slate-900 hover:bg-cyan-500 text-slate-400 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
                          title="Download PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && currentSpotlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsZoomOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-6xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{currentSpotlight.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">3840 × 2160 • 4K UHD Transparent PNG Cutout</p>
                </div>
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`w-full aspect-[16/9] rounded-2xl overflow-hidden flex items-center justify-center ${getBackgroundStyle()}`}>
                <img
                  src={currentSpotlight.url}
                  alt={currentSpotlight.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleDownloadSingle(currentSpotlight)}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full 4K PNG</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gemini API Key & Model Settings Modal */}
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
              className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl text-slate-950 font-bold">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Google Gemini API Configuration</h3>
                    <p className="text-xs text-slate-400">Configure your Gemini API key and AI vision model</p>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Gemini API Key:</span>
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
                        <span>Testing Gemini API Connection...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5" />
                        <span>Test Gemini Key & Model</span>
                      </>
                    )}
                  </button>
                </div>

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
                      onClick={handleSaveApiKey}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Key & Settings</span>
                    </button>
                  </div>

                  {savedApiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
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
                    <h4 className="text-xs font-semibold text-blue-400 mb-1 font-mono">Execution Logs & Terminal Output:</h4>
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

      {/* Toast Notification */}
      <AnimatePresence>
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold font-mono">Downloaded: {downloadSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <p>3840 × 2160 4K UHD PNG Cutout Graphics Studio • Pure Gemini AI Vision & Vector Engine</p>
      </footer>
    </div>
  );
}
