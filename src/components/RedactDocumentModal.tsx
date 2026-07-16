"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal, Button, Spinner, Form, Badge } from "react-bootstrap";
import { PDFDocument, rgb } from "pdf-lib";
import { postWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";

const DISPLAY_WIDTH = 760;

interface RedactDocumentModalProps {
  show: boolean;
  onHide: () => void;
  documentId: number | null;
  documentUrl: string;
  onSuccess: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

interface PageDimensions {
  w: number;
  h: number;
}

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    canvas: HTMLCanvasElement;
  }) => { promise: Promise<void> };
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import(
      /* webpackIgnore: true */
      `${typeof window !== "undefined" ? window.location.origin : ""}/pdfjs/pdf.min.mjs`
    ).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return pdfjs as PdfJsModule;
    });
  }
  return pdfJsPromise;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clonePdfBytes(bytes: ArrayBuffer): ArrayBuffer {
  return bytes.slice(0);
}

const RedactDocumentModal: React.FC<RedactDocumentModalProps> = ({
  show,
  onHide,
  documentId,
  documentUrl,
  onSuccess,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [rects, setRects] = useState<Rect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Partial<Rect> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pageRendering, setPageRendering] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pageInput, setPageInput] = useState("1");

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);
  const pageDimsRef = useRef<Map<number, PageDimensions>>(new Map());
  const [pageDimensions, setPageDimensions] = useState<PageDimensions>({
    w: DISPLAY_WIDTH,
    h: 600,
  });

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const pageRedactionCount = rects.filter((r) => r.page === pageNumber).length;
  const totalRedactionCount = rects.length;

  useEffect(() => {
    if (!show) {
      pdfBytesRef.current = null;
      pageDimsRef.current.clear();
      setPdfReady(false);
      return;
    }

    setPageNumber(1);
    setPageInput("1");
    setRects([]);
    setNumPages(0);
    setPdfLoading(true);
    setPdfReady(false);

    let cancelled = false;

    fetch(documentUrl)
      .then((res) => res.arrayBuffer())
      .then((bytes) => {
        if (cancelled) return;
        // Keep an owned copy — PDF.js transfers/detaches buffers passed to its worker.
        pdfBytesRef.current = clonePdfBytes(bytes);
        setPdfReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setToastType("error");
          setToastMessage("Failed to load PDF for redaction");
          setShowToast(true);
        }
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, documentUrl]);

  useEffect(() => {
    if (!show || !pdfReady || !pdfBytesRef.current) return;

    let cancelled = false;
    setPageRendering(true);

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const bytes = pdfBytesRef.current;
        if (!bytes || cancelled) return;

        const pdf = await pdfjs
          .getDocument({ data: new Uint8Array(clonePdfBytes(bytes)) })
          .promise;

        if (cancelled) return;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = DISPLAY_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        if (cancelled) return;

        const dims = { w: viewport.width, h: viewport.height };
        pageDimsRef.current.set(pageNumber, dims);
        setPageDimensions(dims);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setToastType("error");
          setToastMessage("Failed to render PDF page");
          setShowToast(true);
        }
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, pdfReady, pageNumber]);

  const goToPage = useCallback(
    (page: number) => {
      if (numPages === 0) return;
      const next = clamp(page, 1, numPages);
      setPageNumber(next);
      setPageInput(String(next));
    },
    [numPages]
  );

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) goToPage(parsed);
    else setPageInput(String(pageNumber));
  };

  const getClampedPoint = (clientX: number, clientY: number) => {
    if (!overlayRef.current) return null;
    const bounds = overlayRef.current.getBoundingClientRect();
    return {
      x: clamp(clientX - bounds.left, 0, bounds.width),
      y: clamp(clientY - bounds.top, 0, bounds.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pageRendering) return;
    const point = getClampedPoint(e.clientX, e.clientY);
    if (!point) return;
    setIsDrawing(true);
    setStartPos(point);
    setCurrentRect({ x: point.x, y: point.y, w: 0, h: 0, page: pageNumber });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;
    const point = getClampedPoint(e.clientX, e.clientY);
    if (!point) return;

    const x = Math.min(startPos.x, point.x);
    const y = Math.min(startPos.y, point.y);
    const w = Math.abs(point.x - startPos.x);
    const h = Math.abs(point.y - startPos.y);

    setCurrentRect({
      x,
      y,
      w: clamp(w, 0, pageDimensions.w - x),
      h: clamp(h, 0, pageDimensions.h - y),
      page: pageNumber,
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.w! > 5 && currentRect.h! > 5) {
      setRects((prev) => [...prev, currentRect as Rect]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const handleUndoLast = () => {
    setRects((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].page === pageNumber) {
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        }
      }
      return prev;
    });
  };

  const handleSave = async () => {
    if (!documentId || rects.length === 0) return;
    setLoading(true);

    try {
      const storedBytes = pdfBytesRef.current;
      const existingPdfBytes = storedBytes
        ? clonePdfBytes(storedBytes)
        : await fetch(documentUrl).then((res) => res.arrayBuffer());
      if (!existingPdfBytes) throw new Error("Failed to load PDF");
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      for (const r of rects) {
        const page = pdfDoc.getPage(r.page - 1);
        const { width, height } = page.getSize();
        const dims = pageDimsRef.current.get(r.page) ?? pageDimensions;

        const scaleX = width / dims.w;
        const scaleY = height / dims.h;

        page.drawRectangle({
          x: r.x * scaleX,
          y: height - (r.y + r.h) * scaleY,
          width: r.w * scaleX,
          height: r.h * scaleY,
          color: rgb(0, 0, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const file = new File([blob], "redacted.pdf", { type: "application/pdf" });

      const formData = new FormData();
      formData.append("file", file);

      const response = await postWithAuth(`redact-document/${documentId}`, formData);

      if (response.status === "success") {
        setToastType("success");
        setToastMessage("Document redacted successfully");
        setShowToast(true);
        onSuccess();
        setTimeout(() => {
          onHide();
          setShowToast(false);
        }, 1500);
      } else {
        setToastType("error");
        setToastMessage(response.message || "Failed to redact");
        setShowToast(true);
      }
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage("An error occurred during redaction");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", top: 0, right: 0, zIndex: 1060 }}>
        <ToastMessage
          message={toastMessage}
          show={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      </div>
      <Modal show={show} onHide={onHide} size="xl" backdrop="static" centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="d-flex align-items-center gap-2">
            Redact Document
            {totalRedactionCount > 0 && (
              <Badge bg="dark">{totalRedactionCount} mark{totalRedactionCount !== 1 ? "s" : ""}</Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          <div className="px-3 py-2 border-bottom bg-light d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={pageNumber <= 1 || pageRendering}
                onClick={() => goToPage(pageNumber - 1)}
              >
                ‹ Prev
              </Button>

              <Form onSubmit={handlePageInputSubmit} className="d-flex align-items-center gap-1">
                <Form.Control
                  size="sm"
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  style={{ width: 56 }}
                  disabled={!numPages}
                />
                <span className="text-muted small">/ {numPages || "—"}</span>
              </Form>

              <Button
                size="sm"
                variant="outline-secondary"
                disabled={pageNumber >= numPages || pageRendering}
                onClick={() => goToPage(pageNumber + 1)}
              >
                Next ›
              </Button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-warning"
                disabled={pageRedactionCount === 0}
                onClick={() => setRects((prev) => prev.filter((r) => r.page !== pageNumber))}
              >
                Clear page
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={pageRedactionCount === 0}
                onClick={handleUndoLast}
              >
                Undo last
              </Button>
            </div>
          </div>

          <p className="text-muted small px-3 py-2 mb-0 border-bottom">
            Click and drag on the page to mark areas for redaction. Marks on this page:{" "}
            <strong>{pageRedactionCount}</strong>
          </p>

          <div
            className="d-flex justify-content-center p-3"
            style={{ maxHeight: "65vh", overflow: "auto", background: "#f0f0f0" }}
          >
            {pdfLoading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <Spinner animation="border" />
                <span className="text-muted mt-2 small">Loading document…</span>
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: pageDimensions.w,
                  height: pageDimensions.h,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ display: "block", width: pageDimensions.w, height: pageDimensions.h }}
                />

                <div
                  ref={overlayRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: pageDimensions.w,
                    height: pageDimensions.h,
                    cursor: pageRendering ? "wait" : "crosshair",
                    zIndex: 10,
                    pointerEvents: pageRendering ? "none" : "auto",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {rects
                    .filter((r) => r.page === pageNumber)
                    .map((r, i) => (
                      <div
                        key={`${r.page}-${i}`}
                        style={{
                          position: "absolute",
                          left: r.x,
                          top: r.y,
                          width: r.w,
                          height: r.h,
                          backgroundColor: "rgba(0, 0, 0, 0.85)",
                          border: "1px solid #000",
                          boxSizing: "border-box",
                        }}
                      />
                    ))}
                  {isDrawing && currentRect && (
                    <div
                      style={{
                        position: "absolute",
                        left: currentRect.x,
                        top: currentRect.y,
                        width: currentRect.w,
                        height: currentRect.h,
                        backgroundColor: "rgba(220, 53, 69, 0.35)",
                        border: "2px dashed #dc3545",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>

                {pageRendering && (
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(255,255,255,0.6)",
                      zIndex: 20,
                    }}
                  >
                    <Spinner animation="border" size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top d-flex justify-content-between">
          <span className="text-muted small align-self-center">
            {totalRedactionCount === 0
              ? "Draw at least one redaction to save"
              : `${totalRedactionCount} redaction${totalRedactionCount !== 1 ? "s" : ""} across document`}
          </span>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || totalRedactionCount === 0 || pdfLoading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-1" /> Saving…
                </>
              ) : (
                "Save Redactions"
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default RedactDocumentModal;
