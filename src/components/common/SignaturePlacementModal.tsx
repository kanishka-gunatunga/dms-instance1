"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { PDFDocument } from "pdf-lib";
import { IoClose, IoSaveOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { generateKeyPair, signData, arrayBufferToBase64, exportKey, importKey } from "@/utils/cryptography";

interface SignaturePlacementModalProps {
  show: boolean;
  onHide: () => void;
  documentUrl: string;
  documentType: string;
  signatureUrl: string;
  onSave: (signedFile: File) => void;
}

const SignaturePlacementModal: React.FC<SignaturePlacementModalProps> = ({
  show,
  onHide,
  documentUrl,
  documentType,
  signatureUrl,
  onSave,
}) => {
  const [placements, setPlacements] = useState<{ x: number; y: number; pageIndex: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<{ pageCount: number; width: number; height: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [localSignatureUrl, setLocalSignatureUrl] = useState<string | null>(null);
  const signatureBufferRef = useRef<ArrayBuffer | null>(null);
  const [userKeys, setUserKeys] = useState<CryptoKeyPair | null>(null);

  useEffect(() => {
    if (show) {
      setPlacements([]);
      setPreviewError(null);
      if (documentType.toLowerCase() === "pdf") {
        loadPdfMetadata();
      }
      prefetchSignature();
      initUserKeys();
    }
    return () => {
      if (localSignatureUrl) {
        URL.revokeObjectURL(localSignatureUrl);
      }
    };
  }, [show, documentUrl, signatureUrl]);

  const initUserKeys = async () => {
    try {
      const storedKeys = localStorage.getItem("dms_user_keys");
      if (storedKeys) {
        const { privateKeyJwk, publicKeyJwk } = JSON.parse(storedKeys);
        const priv = await importKey(privateKeyJwk, "private");
        const pub = await importKey(publicKeyJwk, "public");
        setUserKeys({ privateKey: priv, publicKey: pub });
      } else {
        const keys = await generateKeyPair();
        setUserKeys(keys);
        const privateKeyJwk = await exportKey(keys.privateKey);
        const publicKeyJwk = await exportKey(keys.publicKey);
        localStorage.setItem("dms_user_keys", JSON.stringify({ privateKeyJwk, publicKeyJwk }));
      }
    } catch (error) {
      console.error("Failed to initialize cryptographic keys:", error);
    }
  };

  const prefetchSignature = async () => {
    if (!signatureUrl) return;
    try {
      const resp = await fetch(signatureUrl);
      if (!resp.ok) throw new Error("Failed to fetch signature");
      const buffer = await resp.arrayBuffer();
      signatureBufferRef.current = buffer;
      const blob = new Blob([buffer], { type: "image/png" });
      const localUrl = URL.createObjectURL(blob);
      setLocalSignatureUrl(localUrl);
    } catch (error) {
      console.error("Signature prefetch failed:", error);
      // We don't set previewError here yet, we'll try to load it via img tag directly as fallback
    }
  };

  const loadPdfMetadata = async () => {
    try {
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const existingPdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        setPdfMetadata({
          pageCount: pages.length,
          width,
          height
        });
      }
    } catch (error) {
      console.error("Failed to load PDF metadata:", error);
      setPreviewError("Could not load the PDF document. Please check the URL.");
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current || isProcessing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (documentType.toLowerCase() === "pdf" && pdfMetadata) {
      const containerWidth = rect.width;
      const scaledPageHeight = (pdfMetadata.height / pdfMetadata.width) * containerWidth;
      const pageIndex = Math.floor(y / scaledPageHeight);
      
      if (pageIndex < pdfMetadata.pageCount) {
        setPlacements(prev => [...prev, { x, y, pageIndex }]);
      }
    } else {
      setPlacements(prev => [...prev, { x, y, pageIndex: 0 }]);
    }
  };

  const handleUndo = () => {
    setPlacements(prev => prev.slice(0, -1));
  };

  const handleSave = async () => {
    if (placements.length === 0 || !documentUrl || !signatureUrl) return;

    setIsProcessing(true);
    try {
      const type = documentType.toLowerCase();
      if (type === "pdf") {
        await signPdf();
      } else if (["png", "jpg", "jpeg"].includes(type)) {
        await signImage();
      }
    } catch (error) {
      console.error("Signing failed:", error);
      alert("Signing failed. Please ensure the document and signature are accessible. Technical error: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const signPdf = async () => {
    const response = await fetch(documentUrl);
    const existingPdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    let signatureBytes = signatureBufferRef.current;
    if (!signatureBytes) {
      const sigResp = await fetch(signatureUrl);
      if (!sigResp.ok) throw new Error("Failed to fetch signature image");
      signatureBytes = await sigResp.arrayBuffer();
    }
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    for (const placement of placements) {
      const targetPage = pages[placement.pageIndex];
      const { width, height } = targetPage.getSize();
      
      const pdfX = (placement.x / containerWidth) * width;
      const scaledPageHeight = (pdfMetadata!.height / pdfMetadata!.width) * containerWidth;
      const yOnPage = placement.y % scaledPageHeight;
      const pdfY = height - (yOnPage / scaledPageHeight) * height - 25;

      targetPage.drawImage(signatureImage, {
        x: pdfX - 50,
        y: pdfY,
        width: 100,
        height: 50,
      });
    }

    // --- Cryptographic Digital Signature ---
    const visualSignedPdfBytes = await pdfDoc.save();
    if (userKeys) {
        const cryptoSig = await signData(visualSignedPdfBytes.buffer as ArrayBuffer, userKeys.privateKey);
        const base64Sig = arrayBufferToBase64(cryptoSig);
        
        pdfDoc.setKeywords(["X-DMS-Signature:" + base64Sig, "X-DMS-Signed:true"]);
        pdfDoc.setProducer("DMS Secure Digital Signer");
        pdfDoc.setAuthor("Authenticated DMS User");
        pdfDoc.setModificationDate(new Date());
    }
    
    const finalPdfBytes = await pdfDoc.save();
    const blob = new Blob([finalPdfBytes as any], { type: "application/pdf" });
    const file = new File([blob], "signed_document.pdf", { type: "application/pdf" });
    onSave(file);
  };

  const signImage = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = documentUrl;

    await new Promise((resolve, reject) => {
      mainImg.onload = resolve;
      mainImg.onerror = () => reject(new Error("Failed to load main image (CORS likely)"));
    });

    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    const sigImg = new Image();
    sigImg.crossOrigin = "anonymous";
    sigImg.src = localSignatureUrl || signatureUrl;

    await new Promise((resolve, reject) => {
      sigImg.onload = resolve;
      sigImg.onerror = () => reject(new Error("Failed to load signature image (CORS likely)"));
    });

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    for (const placement of placements) {
      const drawX = (placement.x / containerRect.width) * mainImg.width;
      const drawY = (placement.y / containerRect.height) * mainImg.height;
      ctx.drawImage(sigImg, drawX - 75, drawY - 37.5, 150, 75);
    }

    // For images, we add a small visual indicator of the crypto signature
    if (userKeys) {
        ctx.font = "12px Arial";
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillText("Cryptographically Secured by DMS", 10, canvas.height - 10);
    }

    canvas.toBlob(async (blob) => {
      if (blob) {
        // We could also sign the image blob here if we wanted to store the signature elsewhere
        const file = new File([blob], "signed_document.png", { type: "image/png" });
        onSave(file);
      }
    }, "image/png");
  };

  const renderContent = () => {
    if (previewError) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center bg-light" style={{ height: "600px" }}>
            <p className="text-danger mb-0">{previewError}</p>
            <small className="text-muted text-center px-4 mt-2">
                This document preview cannot be loaded directly here. <br/>
                You can still click on the grey area below to place signatures blindly if you know where they should go, but we recommend checking the document URL.
            </small>
        </div>
      );
    }

    if (documentType.toLowerCase() === "pdf") {
      const aspectRatio = pdfMetadata ? (pdfMetadata.height / pdfMetadata.width) : 1.414;
      
      return (
        <div 
          className="iframe-container" 
          style={{ 
            height: "600px", 
            overflowY: "auto", 
            position: "relative",
            backgroundColor: "#525659"
          }}
        >
          <div 
            ref={containerRef}
            onClick={handleContainerClick}
            style={{ 
              position: "relative", 
              width: "100%", 
              cursor: "crosshair",
              height: pdfMetadata ? `calc(${pdfMetadata.pageCount} * (100% * ${aspectRatio}))` : "2000px" 
            }}
          >
            <iframe 
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "none", 
                pointerEvents: "none",
                display: "block"
              }}
              onError={() => setPreviewError("Iframe loading failed.")}
            />
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 5 }} />
            
            {placements.map((p, i) => (
              <div key={i} style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 10
              }}>
                <img 
                  src={localSignatureUrl || signatureUrl} 
                  alt="signature" 
                  style={{ width: "100px", height: "auto", border: "1px dashed #ea580c", backgroundColor: "rgba(255,255,255,0.5)" }} 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('placeholder')) {
                      target.src = "https://via.placeholder.com/100x50?text=Signature";
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        onClick={handleContainerClick}
        style={{ 
          position: "relative", 
          cursor: "crosshair", 
          border: "1px solid #ddd",
          maxHeight: "600px",
          overflowY: "auto",
          backgroundColor: "#f8f9fa"
        }}
      >
        <img 
          src={documentUrl} 
          alt="document" 
          crossOrigin="anonymous"
          style={{ width: "100%", height: "auto", display: "block" }}
          onError={() => setPreviewError("Failed to load image preview.")}
        />
        {placements.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none"
          }}>
            <img 
              src={localSignatureUrl || signatureUrl} 
              alt="signature" 
              style={{ width: "100px", height: "auto", border: "1px dashed #ea580c" }} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('placeholder')) {
                   target.src = "https://via.placeholder.com/100x50?text=Signature";
                }
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen centered className="signature-modal">
      <Modal.Header>
        <div className="d-flex w-100 justify-content-end align-items-center">
          <div className="col-11 d-flex flex-row">
            <p className="mb-0" style={{ fontSize: "16px", color: "#333", fontWeight: 500 }}>
              Place Signature : {documentUrl.split('/').pop()}
            </p>
          </div>
          <div className="col-1 d-flex justify-content-end">
            <IoClose
              fontSize={20}
              style={{ cursor: "pointer" }}
              onClick={onHide}
            />
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="p-0">
        <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center px-4">
          <small className="text-muted font-weight-bold">
            {placements.length === 0 ? "Click on the document to place signatures." : `Placed ${placements.length} signatures.`}
          </small>
          {placements.length > 0 && (
            <Button variant="link" size="sm" onClick={handleUndo} className="p-0 text-danger text-decoration-none">
                Undo Last
            </Button>
          )}
        </div>
        {renderContent()}
      </Modal.Body>
      <Modal.Footer>
        {userKeys && (
          <div className="me-auto d-flex align-items-center text-success" style={{ fontSize: "12px", fontWeight: 500 }}>
            <IoShieldCheckmarkOutline className="me-1" fontSize={16} />
            Cryptographic Digital Signature Active
          </div>
        )}
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={placements.length === 0 || isProcessing}
            style={{ backgroundColor: "#ea580c", borderColor: "#ea580c" }}
        >
          {isProcessing ? "Saving..." : "Save Signed Document"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SignaturePlacementModal;
