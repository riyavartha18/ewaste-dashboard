"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import {
  Presentation,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
} from "lucide-react";

interface PresentationViewerProps {
  buffer: ArrayBuffer;
  fileName: string;
  onDownload: () => void;
}

interface SlideTextRun {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSizePt?: number;
  colorHex?: string;
}

interface SlideParagraph {
  runs: SlideTextRun[];
  alignment?: "left" | "center" | "right";
  isBullet?: boolean;
}

interface SlideShape {
  id: string;
  name?: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  bgHex?: string;
  borderColorHex?: string;
  borderRadius?: number;
  paragraphs: SlideParagraph[];
  imageUrl?: string;
}

interface SlideData {
  index: number;
  bgHex: string;
  shapes: SlideShape[];
  title?: string;
  rawTextPreview: string[];
}

export function PresentationViewer({ buffer, fileName, onDownload }: PresentationViewerProps) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaUrlsRef = useRef<string[]>([]);

  // Parse PPTX archive
  useEffect(() => {
    let active = true;

    async function parsePresentation() {
      try {
        setLoading(true);
        const archive = await JSZip.loadAsync(buffer);

        // Slide dimensions from presentation.xml
        let slideWidthEmu = 12192000;
        let slideHeightEmu = 6858000;
        const presFile = archive.file("ppt/presentation.xml");
        if (presFile) {
          const presXml = await presFile.async("text");
          const sldSz = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
          if (sldSz) {
            slideWidthEmu = Number(sldSz[1]) || slideWidthEmu;
            slideHeightEmu = Number(sldSz[2]) || slideHeightEmu;
          }
        }

        // Extract media images
        const mediaMap = new Map<string, string>();
        for (const [relativePath, file] of Object.entries(archive.files)) {
          if (relativePath.startsWith("ppt/media/")) {
            const blob = await file.async("blob");
            const url = URL.createObjectURL(blob);
            mediaUrlsRef.current.push(url);
            // normalized key
            const normKey = relativePath.replace(/^ppt\//, "");
            mediaMap.set(normKey, url);
            mediaMap.set(relativePath, url);
          }
        }

        // Collect all slide xmls
        const slideEntries = Object.keys(archive.files)
          .map((name) => {
            const match = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
            return match ? { name, order: Number(match[1]) } : null;
          })
          .filter((entry): entry is { name: string; order: number } => entry !== null)
          .sort((a, b) => a.order - b.order);

        if (slideEntries.length === 0) {
          throw new Error("No slides found in this presentation.");
        }

        const parsedSlides: SlideData[] = [];

        for (let i = 0; i < slideEntries.length; i++) {
          const { name } = slideEntries[i];
          const slideFile = archive.file(name);
          if (!slideFile) continue;
          const xml = await slideFile.async("text");

          // Parse relationships for image embeds
          const relsName = name.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
          const relsMap = new Map<string, string>();
          const relsFile = archive.file(relsName);
          if (relsFile) {
            const relsXml = await relsFile.async("text");
            const relMatches = [...relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)];
            for (const rm of relMatches) {
              const relId = rm[1];
              const target = rm[2].replace(/^\.\.\//, "");
              const mediaUrl = mediaMap.get(target);
              if (mediaUrl) relsMap.set(relId, mediaUrl);
            }
          }

          // Parse Slide Background
          let slideBg = "#FFFFFF";
          const bgMatch = xml.match(/<p:bg>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/);
          if (bgMatch) {
            slideBg = `#${bgMatch[1]}`;
          } else if (xml.includes("<p:bgPr>")) {

            // Check for scheme color
            if (xml.includes('schemeClr val="bg1"')) slideBg = "#0B132B";
          } else {
            // Default check from slide content
            const allColors = [...xml.matchAll(/srgbClr val="([A-Fa-f0-9]{6})"/g)].map((m) => m[1]);
            if (allColors.includes("0B132B")) slideBg = "#0B132B";
          }

          const shapes: SlideShape[] = [];
          const rawTexts: string[] = [];

          // Parse shapes <p:sp>
          const spBlocks = xml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) || [];
          spBlocks.forEach((sp, spIdx) => {
            const shape = parseShapeXml(sp, slideWidthEmu, slideHeightEmu, `sp-${i}-${spIdx}`);
            if (shape) {
              shapes.push(shape);
              for (const p of shape.paragraphs) {
                const text = p.runs.map((r) => r.text).join("").trim();
                if (text) rawTexts.push(text);
              }
            }
          });

          // Parse picture shapes <p:pic>
          const picBlocks = xml.match(/<p:pic\b[\s\S]*?<\/p:pic>/g) || [];
          picBlocks.forEach((pic, picIdx) => {
            const shape = parsePicXml(pic, slideWidthEmu, slideHeightEmu, `pic-${i}-${picIdx}`, relsMap);
            if (shape) shapes.push(shape);
          });

          parsedSlides.push({
            index: i + 1,
            bgHex: slideBg,
            shapes,
            title: rawTexts[0] || `Slide ${i + 1}`,
            rawTextPreview: rawTexts,
          });
        }

        if (active) {
          setSlides(parsedSlides);
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Could not read presentation.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void parsePresentation();

    return () => {
      active = false;
      // Clean up blob URLs
      mediaUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      mediaUrlsRef.current = [];
    };
  }, [buffer]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || (isFullscreen && e.key === " ")) {
        e.preventDefault();
        setActiveSlide((s) => Math.min(slides.length - 1, s + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setActiveSlide((s) => Math.max(0, s - 1));
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        void containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-[#6B7869]">
        <Presentation className="h-8 w-8 animate-pulse text-[#D24726]" />
        <p className="text-sm font-medium">Loading PowerPoint presentation &amp; rendering original slide decks…</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <Presentation className="h-8 w-8 text-[#B8613C]" />
        <p className="text-sm font-medium text-[#B8613C]">{error || "No slides found."}</p>
        <button onClick={onDownload} className="ew-btn-primary text-xs">
          <Download className="h-3.5 w-3.5" /> Download original presentation
        </button>
      </div>
    );
  }

  const currentSlide = slides[activeSlide];

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#1E232A] text-white select-none ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "h-full max-h-[85vh]"
      }`}
    >
      {/* Top Slide Presentation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303844] bg-[#161B22] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#D24726] text-xs font-bold text-white shadow-sm">
              PPT
            </span>
            <span className="max-w-[220px] truncate text-xs font-semibold text-white sm:max-w-md">
              {fileName}
            </span>
            <span className="rounded-full bg-[#2C3545] px-2.5 py-0.5 text-[11px] font-medium text-[#9BA8BA]">
              Slide {activeSlide + 1} of {slides.length}
            </span>
          </div>
        </div>

        {/* Slide Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Previous / Next buttons */}
          <div className="flex items-center rounded-lg border border-[#303844] bg-[#222834] p-0.5">
            <button
              onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
              disabled={activeSlide === 0}
              className="flex h-7 w-7 items-center justify-center rounded text-white disabled:opacity-30 hover:bg-[#2C3545]"
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-mono text-[#BAC8D9]">
              {activeSlide + 1} / {slides.length}
            </span>
            <button
              onClick={() => setActiveSlide((s) => Math.min(slides.length - 1, s + 1))}
              disabled={activeSlide === slides.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded text-white disabled:opacity-30 hover:bg-[#2C3545]"
              title="Next slide (Right Arrow / Space)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Fullscreen presentation toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden items-center gap-1.5 rounded-lg border border-[#303844] bg-[#222834] px-2.5 py-1.5 text-xs font-medium text-white transition-colors sm:flex hover:bg-[#2C3545]"
            title="Present Fullscreen Slideshow"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Present Slideshow"}</span>
          </button>

          {/* Open Original in Desktop PowerPoint */}
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D24726] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#B8381A]"
            title="Download and open in Microsoft PowerPoint"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Original in PowerPoint</span>
          </button>
        </div>
      </div>

      {/* Main Slide Workspace: Sidebar + Slide Canvas */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Slide Thumbnail Strip */}
        {!isFullscreen && (
          <aside className="w-48 flex-none overflow-y-auto border-r border-[#303844] bg-[#161B22] p-3 space-y-2.5 hidden md:block">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#79889C]">
              <span>Slides</span>
              <span>{slides.length}</span>
            </div>
            {slides.map((s, idx) => {
              const isActive = idx === activeSlide;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`group relative cursor-pointer rounded-lg border p-1.5 transition-all ${
                    isActive
                      ? "border-[#D24726] bg-[#222834] ring-2 ring-[#D24726]/40"
                      : "border-[#303844] bg-[#1E232A] hover:border-[#4B5565]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] text-[#8C9BAE]">
                    <span className="font-semibold">Slide {idx + 1}</span>
                  </div>
                  {/* Miniature slide preview container */}
                  <div
                    style={{ backgroundColor: s.bgHex }}
                    className="relative aspect-video w-full overflow-hidden rounded border border-black/20 p-1 text-[7px] leading-tight"
                  >
                    <p className="line-clamp-2 font-medium text-white/90">
                      {s.title || `Slide ${idx + 1}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </aside>
        )}

        {/* Center Stage: The Live 16:9 Presentation Slide Canvas */}
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-auto p-4 sm:p-8">
          {/* Slide Stage Wrapper */}
          <div className="relative w-full max-w-5xl shadow-2xl">
            {/* 16:9 Widescreen Container */}
            <div
              style={{
                backgroundColor: currentSlide.bgHex,
                aspectRatio: "16 / 9",
              }}
              className="relative w-full overflow-hidden rounded-xl border border-white/10 shadow-inner"
            >
              {/* Render all shapes and pictures with their original percentage coordinates */}
              {currentSlide.shapes.map((shape) => {
                const style: React.CSSProperties = {
                  position: "absolute",
                  left: `${shape.leftPct}%`,
                  top: `${shape.topPct}%`,
                  width: `${shape.widthPct}%`,
                  height: `${shape.heightPct}%`,
                  backgroundColor: shape.bgHex,
                  borderColor: shape.borderColorHex,
                  borderWidth: shape.borderColorHex ? "2px" : undefined,
                  borderStyle: shape.borderColorHex ? "solid" : undefined,
                  borderRadius: shape.borderRadius ? `${shape.borderRadius}px` : undefined,
                  overflow: "hidden",
                };

                return (
                  <div
                    key={shape.id}
                    style={style}
                    className="flex flex-col justify-start p-1 transition-all"
                  >
                    {shape.imageUrl && (
                      <img
                        src={shape.imageUrl}
                        alt="Slide graphic"
                        className="h-full w-full object-contain"
                      />
                    )}

                    {shape.paragraphs.length > 0 && (
                      <div className="flex h-full w-full flex-col justify-center">
                        {shape.paragraphs.map((p, pIdx) => {
                          const alignClass =
                            p.alignment === "center"
                              ? "text-center"
                              : p.alignment === "right"
                              ? "text-right"
                              : "text-left";

                          return (
                            <p
                              key={pIdx}
                              className={`my-0.5 leading-snug whitespace-pre-wrap ${alignClass}`}
                            >
                              {p.runs.map((r, rIdx) => {
                                const runStyle: React.CSSProperties = {
                                  color: r.colorHex || (isDarkBg(currentSlide.bgHex) ? "#F8FAFC" : "#1E293B"),
                                  fontWeight: r.isBold ? 700 : 400,
                                  fontStyle: r.isItalic ? "italic" : "normal",
                                  fontSize: r.fontSizePt
                                    ? `clamp(10px, ${(r.fontSizePt / 36) * 1.5}vw, ${Math.min(r.fontSizePt, 38)}px)`
                                    : "clamp(9px, 1.2vw, 15px)",
                                };

                                return (
                                  <span key={rIdx} style={runStyle}>
                                    {r.text}
                                  </span>
                                );
                              })}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Fallback if shapes are empty */}
              {currentSlide.shapes.length === 0 && currentSlide.rawTextPreview.length > 0 && (
                <div className="flex h-full w-full flex-col justify-center p-8 sm:p-12">
                  <h1 className="mb-4 text-2xl font-bold sm:text-4xl text-white">
                    {currentSlide.title}
                  </h1>
                  <div className="space-y-3">
                    {currentSlide.rawTextPreview.slice(1).map((t, idx) => (
                      <p key={idx} className="text-sm leading-relaxed text-slate-200 sm:text-base">
                        {t}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Slide Navigator */}
            <div className="mt-3 flex items-center justify-between text-xs text-[#8C9BAE]">
              <span className="hidden sm:inline">Use Arrow keys (← / →) or Spacebar to navigate slides</span>
              <div className="flex items-center gap-2">
                <span>Slide {activeSlide + 1} of {slides.length}</span>
                <span>•</span>
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-1 font-medium text-[#D24726] underline hover:no-underline"
                >
                  Download .pptx
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper to parse <p:sp> into SlideShape
function parseShapeXml(
  xml: string,
  slideW: number,
  slideH: number,
  id: string,
): SlideShape | null {
  const offMatch = xml.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
  const extMatch = xml.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
  if (!offMatch || !extMatch) return null;

  const x = Number(offMatch[1]);
  const y = Number(offMatch[2]);
  const cx = Number(extMatch[1]);
  const cy = Number(extMatch[2]);

  const leftPct = (x / slideW) * 100;
  const topPct = (y / slideH) * 100;
  const widthPct = (cx / slideW) * 100;
  const heightPct = (cy / slideH) * 100;

  // Background fill
  let bgHex: string | undefined = undefined;
  const spPrMatch = xml.match(/<p:spPr[\s\S]*?<\/p:spPr>/);
  if (spPrMatch) {
    const fillMatch = spPrMatch[0].match(/<a:solidFill>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/);
    if (fillMatch) bgHex = `#${fillMatch[1]}`;
  }

  // Border
  let borderColorHex: string | undefined = undefined;
  const lnMatch = xml.match(/<a:ln[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/);
  if (lnMatch) borderColorHex = `#${lnMatch[1]}`;


  // Rounded rect
  const isRounded = xml.includes('prst="roundRect"');
  const borderRadius = isRounded ? 12 : undefined;

  // Paragraphs
  const paragraphs: SlideParagraph[] = [];
  const pBlocks = xml.match(/<a:p\b[\s\S]*?<\/a:p>/g) || [];

  for (const pXml of pBlocks) {
    let alignment: "left" | "center" | "right" = "left";
    if (pXml.includes('algn="ctr"')) alignment = "center";
    else if (pXml.includes('algn="r"')) alignment = "right";

    const runs: SlideTextRun[] = [];
    const rBlocks = pXml.match(/<a:r\b[\s\S]*?<\/a:r>/g) || [];

    for (const rXml of rBlocks) {
      const tMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
      if (!tMatch) continue;
      const text = decodeXmlEntities(tMatch[1]);
      if (!text) continue;

      const isBold = rXml.includes('b="1"');
      const isItalic = rXml.includes('i="1"');
      const szMatch = rXml.match(/sz="(\d+)"/);
      const fontSizePt = szMatch ? Number(szMatch[1]) / 100 : undefined;

      let colorHex: string | undefined = undefined;
      const clrMatch = rXml.match(/<a:srgbClr val="([A-Fa-f0-9]{6})"/);
      if (clrMatch) colorHex = `#${clrMatch[1]}`;

      runs.push({
        text,
        isBold,
        isItalic,
        fontSizePt,
        colorHex,
      });
    }

    if (runs.length > 0) {
      paragraphs.push({ runs, alignment });
    }
  }

  return {
    id,
    leftPct,
    topPct,
    widthPct,
    heightPct,
    bgHex,
    borderColorHex,
    borderRadius,
    paragraphs,
  };
}

// Helper to parse <p:pic>
function parsePicXml(
  xml: string,
  slideW: number,
  slideH: number,
  id: string,
  relsMap: Map<string, string>,
): SlideShape | null {
  const offMatch = xml.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
  const extMatch = xml.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
  if (!offMatch || !extMatch) return null;

  const x = Number(offMatch[1]);
  const y = Number(offMatch[2]);
  const cx = Number(extMatch[1]);
  const cy = Number(extMatch[2]);

  const leftPct = (x / slideW) * 100;
  const topPct = (y / slideH) * 100;
  const widthPct = (cx / slideW) * 100;
  const heightPct = (cy / slideH) * 100;

  const blipMatch = xml.match(/<a:blip[^>]*r:embed="([^"]+)"/);
  const relId = blipMatch ? blipMatch[1] : null;
  const imageUrl = relId ? relsMap.get(relId) : undefined;

  return {
    id,
    leftPct,
    topPct,
    widthPct,
    heightPct,
    paragraphs: [],
    imageUrl,
  };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isDarkBg(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return true;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}
