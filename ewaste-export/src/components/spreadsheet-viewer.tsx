"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Table as TableIcon,
  AlertCircle,
} from "lucide-react";

interface SpreadsheetViewerProps {
  buffer: ArrayBuffer;
  fileName: string;
  onDownload: () => void;
}

interface ParsedCell {
  address: string;
  row: number;
  col: number;
  text: string;
  formula?: string;
  bgHex?: string;
  fontColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
  alignHorizontal?: "left" | "center" | "right";
  alignVertical?: "top" | "middle" | "bottom";
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
}

interface ParsedSheet {
  name: string;
  rowCount: number;
  colCount: number;
  colWidths: number[];
  rows: (ParsedCell | null)[][];
}

function argbToHex(color: any): string | undefined {
  if (!color) return undefined;
  let raw: string | undefined = undefined;
  if (typeof color === "string") raw = color;
  else if (typeof color.argb === "string") raw = color.argb;
  else if (typeof color.theme === "number") return undefined;

  if (!raw) return undefined;
  raw = raw.replace(/^#/, "");
  // If 8 characters (AARRGGBB), strip alpha
  if (raw.length === 8) {
    return `#${raw.slice(2)}`;
  }
  if (raw.length === 6) {
    return `#${raw}`;
  }
  return undefined;
}

function formatCellValue(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if ("result" in val) {
      return formatCellValue(val.result);
    }
    if (Array.isArray(val.richText)) {
      return val.richText.map((p: any) => p.text || "").join("");
    }
    if (val instanceof Date) {
      return val.toLocaleDateString();
    }
    if ("text" in val) {
      return String(val.text);
    }
    if ("error" in val) {
      return String(val.error);
    }
    return "";
  }
  if (typeof val === "number") {
    // round clean numbers if float
    if (Number.isInteger(val)) return String(val);
    return Number(val.toFixed(4)).toString();
  }
  return String(val);
}

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

export function SpreadsheetViewer({ buffer, fileName, onDownload }: SpreadsheetViewerProps) {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<ParsedCell | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);

    async function parseWorkbook() {
      try {
        const ExcelJS = await import("exceljs");

        // Safe patch for ExcelJS bug where worksheets with unmapped/dangling tables crash on table.name
        try {
          const dummyWb = new ExcelJS.Workbook();
          const dummyWs = dummyWb.addWorksheet("__patch_check__");
          const wsProto = Object.getPrototypeOf(dummyWs);
          const origDesc = Object.getOwnPropertyDescriptor(wsProto, "model");
          const origSet = origDesc?.set;
          if (origSet && !(wsProto as any).__tables_patched) {
            Object.defineProperty(wsProto, "model", {
              get: origDesc?.get,
              set: function (this: any, val: any) {
                if (val && Array.isArray(val.tables)) {
                  val.tables = val.tables.filter((t: any) => t && typeof t.name === "string");
                }
                origSet.call(this, val);
              },
              configurable: true,
              enumerable: true,
            });
            (wsProto as any).__tables_patched = true;
          }
        } catch {
          // ignore patch error
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const parsed: ParsedSheet[] = [];

        workbook.worksheets.forEach((ws) => {
          const maxRow = Math.min(ws.rowCount || 0, 500); // safety cap for massive sheets
          const maxCol = Math.min(ws.columnCount || 0, 50);

          // Build column widths
          const colWidths: number[] = [];
          for (let c = 1; c <= Math.max(maxCol, 10); c++) {
            const colDef = ws.getColumn(c);
            const w = colDef && colDef.width ? Math.round(colDef.width * 8) : 90;
            colWidths.push(Math.max(w, 60));
          }

          // Build merged cell dictionary
          const merges: { top: number; left: number; bottom: number; right: number }[] = [];
          const rawMerges = (ws.model as any)?.merges || (ws as any)._merges || [];
          if (Array.isArray(rawMerges)) {
            for (const m of rawMerges) {
              const rangeStr = typeof m === "string" ? m : m?.range;
              if (typeof rangeStr === "string") {
                const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
                if (match) {
                  const col1 = parseColLetter(match[1]);
                  const row1 = Number(match[2]);
                  const col2 = parseColLetter(match[3]);
                  const row2 = Number(match[4]);
                  merges.push({
                    top: Math.min(row1, row2),
                    left: Math.min(col1, col2),
                    bottom: Math.max(row1, row2),
                    right: Math.max(col1, col2),
                  });
                }
              }
            }
          }

          // Build row/cell matrix
          const rows: (ParsedCell | null)[][] = [];
          const actualMaxRow = Math.max(maxRow, 1);
          const actualMaxCol = Math.max(maxCol, 8);

          for (let r = 1; r <= actualMaxRow; r++) {
            const rowCells: (ParsedCell | null)[] = [];
            const wsRow = ws.getRow(r);

            for (let c = 1; c <= actualMaxCol; c++) {
              // Check if inside a merge
              const merge = merges.find((m) => r >= m.top && r <= m.bottom && c >= m.left && c <= m.right);
              if (merge) {
                if (r === merge.top && c === merge.left) {
                  // Master cell
                  const cell = wsRow.getCell(c);
                  const parsedCell = extractCellInfo(cell, r, c);
                  parsedCell.rowSpan = merge.bottom - merge.top + 1;
                  parsedCell.colSpan = merge.right - merge.left + 1;
                  rowCells.push(parsedCell);
                } else {
                  // Subsumed cell
                  rowCells.push({
                    address: `${getColumnLetter(c)}${r}`,
                    row: r,
                    col: c,
                    text: "",
                    hidden: true,
                  });
                }
              } else {
                const cell = wsRow.getCell(c);
                rowCells.push(extractCellInfo(cell, r, c));
              }
            }
            rows.push(rowCells);
          }

          parsed.push({
            name: ws.name,
            rowCount: actualMaxRow,
            colCount: actualMaxCol,
            colWidths,
            rows,
          });
        });

        if (active) {
          setSheets(parsed);
          if (parsed.length > 0 && parsed[0].rows[0]?.[0]) {
            setSelectedCell(parsed[0].rows[0][0]);
          }
        }
      } catch (e: any) {
        console.error("Failed to parse Excel workbook:", e);
        if (active) {
          setError(e?.message || "Could not parse Excel workbook for inline preview");
        }
      }
    }

    void parseWorkbook();
    return () => {
      active = false;
    };
  }, [buffer]);

  const activeSheet = sheets[activeSheetIndex] || null;

  // Filter matches when searching
  const matchingAddresses = useMemo(() => {
    if (!activeSheet || !searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const set = new Set<string>();
    for (const row of activeSheet.rows) {
      for (const cell of row) {
        if (cell && !cell.hidden && cell.text.toLowerCase().includes(q)) {
          set.add(cell.address);
        }
      }
    }
    return set;
  }, [activeSheet, searchQuery]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-7 w-7 text-[#B8613C]" />
        <p className="text-sm font-semibold text-[#B8613C]">Unable to display spreadsheet inline</p>
        <p className="max-w-md text-xs text-[#6B7869]">
          This Excel workbook could not be formatted for browser view. You can open and edit the complete original file in Microsoft Excel.
        </p>
        <button onClick={onDownload} className="ew-btn-primary text-xs">
          <Download className="h-3.5 w-3.5" /> Open / Download Original in Excel
        </button>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-[#6B7869]">
        <TableIcon className="h-8 w-8 animate-pulse text-[#355844]" />
        <p className="text-sm font-medium">Loading Excel workbook &amp; rendering original spreadsheet layout…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[85vh] flex-col bg-[#F7FAF5]">
      {/* Top Spreadsheet Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EAE0] bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#107C41] text-xs font-bold text-white shadow-sm">
              XLS
            </span>
            <span className="text-xs font-semibold text-[#303832]">
              {fileName}
            </span>
            <span className="rounded-full bg-[#E4F0DF] px-2 py-0.5 text-[10px] font-medium text-[#355844]">
              {sheets.length} Sheet{sheets.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7869]" />
            <input
              type="text"
              placeholder="Search sheet…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-40 rounded-md border border-[#E3EAE0] bg-[#F7FAF5] pl-8 pr-2 text-xs text-[#303832] placeholder:text-[#6B7869] focus:border-[#355844] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6B7869]">
                {matchingAddresses.size} found
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Zoom & Open Original File */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden items-center rounded-md border border-[#E3EAE0] bg-[#F7FAF5] p-0.5 md:flex">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 text-[#6B7869] hover:text-[#355844]"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-medium text-[#6B7869]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="p-1 text-[#6B7869] hover:text-[#355844]"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Open Original File in Desktop Excel */}
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#107C41] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0E6B38]"
            title="Download and open in Microsoft Excel"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Original in Excel</span>
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 border-b border-[#E3EAE0] bg-[#FCFDFB] px-4 py-1.5 text-xs font-mono">
        <div className="flex h-6 w-14 items-center justify-center rounded border border-[#E3EAE0] bg-white font-semibold text-[#107C41]">
          {selectedCell ? selectedCell.address : "A1"}
        </div>
        <div className="text-[#6B7869]">fx</div>
        <div className="min-w-0 flex-1 truncate rounded border border-[#E3EAE0] bg-white px-2.5 py-1 text-xs text-[#303832]">
          {selectedCell?.formula ? `=${selectedCell.formula}` : selectedCell?.text || ""}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="relative min-h-0 flex-1 overflow-auto bg-white p-1">
        {activeSheet && (
          <div
            style={{
              zoom: `${zoomLevel}%`,
              transformOrigin: "top left",
            }}
            className="inline-block min-w-full"
          >
            <table className="border-collapse border border-[#D4DDD1] text-xs">
              <thead>
                <tr className="sticky top-0 z-20 bg-[#F2F6F0]">
                  {/* Top-left corner box */}
                  <th className="sticky left-0 z-30 h-6 w-10 border border-[#D4DDD1] bg-[#E8EFE5] text-center text-[10px] text-[#6B7869]"></th>
                  {/* Column Letters */}
                  {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        width: activeSheet.colWidths[cIdx] || 90,
                        minWidth: activeSheet.colWidths[cIdx] || 90,
                      }}
                      className="h-6 border border-[#D4DDD1] bg-[#F2F6F0] px-2 text-center text-[11px] font-semibold text-[#52634F]"
                    >
                      {getColumnLetter(cIdx + 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSheet.rows.map((rowCells, rIdx) => {
                  const rowNumber = rIdx + 1;
                  return (
                    <tr key={rIdx} className="hover:bg-[#F9FCF8]/50">
                      {/* Row Number header */}
                      <td className="sticky left-0 z-10 h-6 border border-[#D4DDD1] bg-[#F2F6F0] px-1 text-center text-[11px] font-medium text-[#52634F] select-none">
                        {rowNumber}
                      </td>
                      {/* Cells */}
                      {rowCells.map((cell, cIdx) => {
                        if (!cell) {
                          return (
                            <td
                              key={cIdx}
                              className="h-6 border border-[#E4EAE1] px-2 py-0.5"
                            />
                          );
                        }
                        if (cell.hidden) return null;

                        const isSelected = selectedCell?.address === cell.address;
                        const isMatch = matchingAddresses.has(cell.address);

                        const style: React.CSSProperties = {
                          backgroundColor: cell.bgHex || (isSelected ? "#EAF5E7" : isMatch ? "#FFF3C4" : undefined),
                          color: cell.fontColor || (cell.bgHex ? getContrastTextColor(cell.bgHex) : undefined),
                          fontWeight: cell.isBold ? 600 : undefined,
                          fontStyle: cell.isItalic ? "italic" : undefined,
                          fontSize: cell.fontSize ? `${Math.max(10, Math.min(cell.fontSize, 16))}px` : undefined,
                          textAlign: cell.alignHorizontal || (isNumeric(cell.text) ? "right" : "left"),
                          verticalAlign: cell.alignVertical || "middle",
                        };

                        return (
                          <td
                            key={cIdx}
                            rowSpan={cell.rowSpan}
                            colSpan={cell.colSpan}
                            onClick={() => setSelectedCell(cell)}
                            style={style}
                            className={`min-h-6 border border-[#DCE4DA] px-2 py-1 text-xs select-text ${
                              isSelected
                                ? "ring-2 ring-inset ring-[#107C41]"
                                : isMatch
                                ? "ring-1 ring-inset ring-[#F59E0B]"
                                : ""
                            }`}
                          >
                            <span className="block whitespace-pre-wrap break-words">
                              {cell.text}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Sheet Tab Navigation */}
      <footer className="flex items-center justify-between border-t border-[#E3EAE0] bg-[#EAEFE8] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {sheets.map((sheet, index) => {
            const isActive = index === activeSheetIndex;
            return (
              <button
                key={sheet.name}
                onClick={() => {
                  setActiveSheetIndex(index);
                  if (sheet.rows[0]?.[0]) setSelectedCell(sheet.rows[0][0]);
                }}
                className={`flex flex-none items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-t-2 border-[#107C41] bg-white text-[#107C41] shadow-xs"
                    : "text-[#52634F] hover:bg-[#DEE7DC]"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{sheet.name}</span>
                <span className="text-[10px] text-[#6B7869]">
                  ({sheet.rowCount} rows)
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 text-xs text-[#6B7869] lg:flex">
          <span>
            Sheet {activeSheetIndex + 1} of {sheets.length}
          </span>
          <span>•</span>
          <span>Original Excel formatting preserved</span>
        </div>
      </footer>
    </div>
  );
}

function extractCellInfo(cell: any, r: number, c: number): ParsedCell {
  const address = cell.address || `${getColumnLetter(c)}${r}`;
  const text = formatCellValue(cell.value);
  const formula = typeof cell.value === "object" && cell.value && "formula" in cell.value ? cell.value.formula : undefined;

  let bgHex: string | undefined = undefined;
  if (cell.fill && cell.fill.type === "pattern" && cell.fill.pattern !== "none") {
    bgHex = argbToHex(cell.fill.fgColor);
  }

  let fontColor: string | undefined = undefined;
  let isBold = false;
  let isItalic = false;
  let fontSize: number | undefined = undefined;

  if (cell.font) {
    if (cell.font.bold) isBold = true;
    if (cell.font.italic) isItalic = true;
    if (cell.font.size) fontSize = cell.font.size;
    fontColor = argbToHex(cell.font.color);
  }

  let alignHorizontal: "left" | "center" | "right" | undefined = undefined;
  let alignVertical: "top" | "middle" | "bottom" | undefined = undefined;

  if (cell.alignment) {
    if (cell.alignment.horizontal === "center") alignHorizontal = "center";
    else if (cell.alignment.horizontal === "right") alignHorizontal = "right";
    else if (cell.alignment.horizontal === "left") alignHorizontal = "left";

    if (cell.alignment.vertical === "top") alignVertical = "top";
    else if (cell.alignment.vertical === "bottom") alignVertical = "bottom";
    else if (cell.alignment.vertical === "middle") alignVertical = "middle";
  }

  return {
    address,
    row: r,
    col: c,
    text,
    formula,
    bgHex,
    fontColor,
    isBold,
    isItalic,
    fontSize,
    alignHorizontal,
    alignVertical,
  };
}

function parseColLetter(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

function isNumeric(str: string): boolean {
  if (!str || str.trim() === "") return false;
  return !isNaN(Number(str.replace(/[,%$₹]/g, "").trim()));
}

function getContrastTextColor(hexBg: string): string {
  const hex = hexBg.replace("#", "");
  if (hex.length !== 6) return "#000000";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#1A1A1A" : "#FFFFFF";
}
