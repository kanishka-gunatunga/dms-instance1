/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Tag, message, Modal as AntModal } from 'antd';
import { Modal } from "react-bootstrap";
import { BsEye, BsDownload, BsArrowRepeat } from 'react-icons/bs';
import dayjs from 'dayjs';
import Image from "next/image";
import { handleDownload } from "@/utils/documentFunctions";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { MdCancel, MdArchive } from "react-icons/md";
import { useUserContext } from "@/context/userContext";

interface PendingArchiveDocument {
    id: number;
    name: string;
    category_name: string;
    sector_name: string;
    expiration_date: string;
    days_expired: number;
}

interface PendingArchiveDocumentsProps {
    initialDocuments: PendingArchiveDocument[];
    userId: string | null;
    isAdmin: number | undefined;
    onRefresh: () => void;
}

interface ViewDocumentItem {
    id: number;
    name: string;
    category: { id: number; category_name: string };
    description: string;
    meta_tags: string;
    attributes: string;
    type: string;
    url: string;
    enable_external_file_view: number
}

const PendingArchiveDocuments: React.FC<PendingArchiveDocumentsProps> = ({
    initialDocuments,
    userId,
    isAdmin,
    onRefresh
}) => {
    const [documents, setDocuments] = useState<PendingArchiveDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
    const [selectedDocumentName, setSelectedDocumentName] = useState<string | null>(null);

    const [viewDocument, setViewDocument] = useState<ViewDocumentItem | null>(null);

    const [modalStates, setModalStates] = useState({
        viewModel: false,
    });

    const { userName } = useUserContext();

    useEffect(() => {
        setDocuments(initialDocuments);
    }, [initialDocuments]);

    const handleGetViewData = useCallback(async (id: number) => {
        try {
            const response = await getWithAuth(`view-document/${id}/${userId}`);
            const data = response.data;
            setViewDocument(data);
        } catch (error) {
            console.error("Error :", error);
        }
    }, [userId, setViewDocument]);

    useEffect(() => {
        if (modalStates.viewModel && selectedDocumentId !== null) {
            handleGetViewData(selectedDocumentId);
        }
    }, [modalStates.viewModel, selectedDocumentId, handleGetViewData]);

    const handleCloseModal = (modalName: keyof typeof modalStates) => {
        setModalStates((prev) => ({ ...prev, [modalName]: false }));
    };

    const handleConfirmArchive = async (doc: PendingArchiveDocument) => {
        if (window.confirm(`Are you sure you want to archive ${doc.name}?`)) {
            setIsLoading(true);
            try {
                const response = await postWithAuth(`confirm-archive/${doc.id}`, new FormData());
                if (response.status === 'success') {
                    message.success('Document archived successfully!');
                    onRefresh();
                } else {
                    message.error(response.message || 'Failed to archive document.');
                }
            } catch (error) {
                console.error("Error archiving document:", error);
                message.error('An error occurred while archiving the document.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleOpenModal = (
        modalName: keyof typeof modalStates,
        documentId?: number,
        documentName?: string
    ) => {
        if (documentId) setSelectedDocumentId(documentId);
        if (documentName) setSelectedDocumentName(documentName);

        setModalStates((prev) => ({ ...prev, [modalName]: true }));
    };

    const currentDateTime = new Date().toLocaleString();

    if (!documents || documents.length === 0) return null;

    return (
        <>
            <div className="calendarWrapper nearly-expired-section mt-4" style={{ border: '2px solid #F54900' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <Image src="/warning.svg" alt="warning icon" width={20} height={20} />
                        <h5 className="mb-0" style={{ color: '#0A0A0A', fontSize: '16px', fontWeight: 'bold' }}>
                            Action Required: Pending Archive Documents
                        </h5>
                        <Tag color="red">{documents.length} Documents</Tag>
                    </div>
                    <Button icon={<BsArrowRepeat />} onClick={onRefresh}>Refresh</Button>
                </div>

                <div>
                    {documents.map((doc) => (
                        <div key={doc.id} className="documentCard" style={{ backgroundColor: '#fff3cd' }}>
                            <div className="row align-items-center">
                                <div className="col-12 col-md-6 mb-3 mb-md-0">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <h6 className="mb-0" style={{ color: '#0A0A0A', fontSize: '14px', fontWeight: 'bold' }}>{doc.name}</h6>
                                    </div>
                                    <div className="documentMeta">
                                        <span>ID: DOC-{doc.id}</span>
                                        <span>Category: {doc.category_name}</span>
                                        <span>Sector: {doc.sector_name}</span>
                                    </div>
                                    <small className="documentMeta">
                                        Expired: {dayjs(doc.expiration_date).format('YYYY-MM-DD')} 
                                        <span className="daysLeft" style={{ color: 'red', marginLeft: '10px' }}>{doc.days_expired} days ago</span>
                                    </small>
                                </div>
                                <div className="col-12 col-md-6 d-flex justify-content-md-end align-items-center gap-2">
                                    <Button type="text"
                                        icon={<BsEye />}
                                        onClick={() => handleOpenModal("viewModel", doc.id, doc.name)}
                                    />
                                    <Button type="text" icon={<BsDownload />}
                                        onClick={() => handleDownload(doc.id, userId)} />
                                    
                                    <Button type="primary" danger icon={<MdArchive />} onClick={() => handleConfirmArchive(doc)}>
                                        Confirm Archive
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Modal
                centered
                show={modalStates.viewModel}
                fullscreen
                onHide={() => {
                    handleCloseModal("viewModel");
                    setSelectedDocumentId(null);
                }}
            >
                <Modal.Header>
                    <div className="d-flex w-100 justify-content-end">
                        <div className="col-11 d-flex flex-row">
                            <p className="mb-0" style={{ fontSize: "16px", color: "#333" }}>
                                View Document : {viewDocument?.name || ""}
                            </p>
                        </div>
                        <div className="col-1 d-flex  justify-content-end">
                            <IoClose
                                fontSize={20}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                    handleCloseModal("viewModel");
                                }}
                            />
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-2 p-lg-4">
                    <div className="d-flex preview-container">
                        {viewDocument && (
                            <>
                                {["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico", "avif"].includes(viewDocument.type) ? (
                                    <Image
                                        src={viewDocument.url}
                                        alt={viewDocument.name}
                                        width={600}
                                        height={600}
                                    />
                                ) :
                                    ["txt", "csv", "log"].includes(viewDocument.type) ? (
                                        <div className="text-preview" style={{ width: "100%" }}>
                                            <iframe
                                                src={viewDocument.url}
                                                title="Text Preview"
                                                style={{
                                                    width: "100%",
                                                    height: "500px",
                                                    border: "1px solid #ccc",
                                                    background: "#fff"
                                                }}
                                            ></iframe>
                                        </div>
                                    ) :
                                        (viewDocument.type === "pdf" || viewDocument.enable_external_file_view === 1) ? (
                                            <div
                                                className="iframe-container"
                                                data-watermark={`Confidential\nDo Not Copy\n${userName}\n${currentDateTime}`}
                                            >
                                                <iframe
                                                    src={
                                                        viewDocument.type === "pdf"
                                                            ? viewDocument.url
                                                            : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewDocument.url)}`
                                                    }
                                                    title="Document Preview"
                                                    style={{ width: "100%", height: "500px", border: "none" }}
                                                ></iframe>
                                            </div>
                                        ) : (
                                            <p>No preview available for this document type.</p>
                                        )}
                            </>
                        )}
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <div className="d-flex flex-row justify-content-start">
                        <button
                            onClick={() => {
                                handleCloseModal("viewModel");
                                setSelectedDocumentId(null);
                            }}
                            className="custom-icon-button button-danger text-white bg-danger px-3 py-1 rounded"
                        >
                            <MdCancel fontSize={16} className="me-1" /> Cancel
                        </button>
                    </div>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default PendingArchiveDocuments;
