/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Heading from "@/components/common/Heading";
import { Table, Button, Modal } from "react-bootstrap";
import { FaRegFileAlt, FaSignature } from "react-icons/fa";
import { IoClose, IoEyeOutline } from "react-icons/io5";
import { MdOutlineCancel } from "react-icons/md";
import Image from "next/image";
import { useUserContext } from "@/context/userContext";
import styles from "./sign-approval.module.css";

interface SignedDocument {
  id: number;
  name: string;
  category: { category_name: string };
  signed_date: string;
  // signed_by: string;
  status: string;
}

const SignApprovalPage = () => {
  const { userName } = useUserContext();
  const [modalStates, setModalStates] = useState({ viewModel: false });
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [viewDocument, setViewDocument] = useState<any>(null);

  const handleCloseModal = (modalName: string) => {
    setModalStates(prev => ({ ...prev, [modalName]: false }));
  };

  const currentDateTime = new Date().toLocaleString();

  const handleViewOpen = (doc: SignedDocument) => {
    setSelectedDocumentId(doc.id);
    setViewDocument({
      name: doc.name,
      type: doc.name.split('.').pop()?.toLowerCase() || "pdf",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      enable_external_file_view: 0,
    });
    setModalStates({ viewModel: true });
  };
  const [documents] = useState<SignedDocument[]>([
    {
      id: 301,
      name: "Q3_Financial_Report.pdf",
      category: { category_name: "Finance" },
      signed_date: new Date().toISOString(),
      // signed_by: "Alice Smith",
      status: "Signed",
    },
    {
      id: 302,
      name: "Vendor_Contract_ABC.pdf",
      category: { category_name: "Legal" },
      signed_date: new Date(Date.now() - 86400000).toISOString(),
      // signed_by: "Bob Johnson",
      status: "Signed",
    },
    {
      id: 303,
      name: "Employee_Handbook_2026.pdf",
      category: { category_name: "HR" },
      signed_date: new Date(Date.now() - 172800000).toISOString(),
      // signed_by: "Charlie Brown",
      status: "Signed",
    }
  ]);

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <Heading text="Signed Documents" color="#0A0A0A" />
          </div>
        </div>

        <div className={styles.card}>
          {documents.length > 0 ? (
            <div className={styles.tableWrapper}>
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Signed Date</th>
                    {/* <th>Signed By</th> */}
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaRegFileAlt className="me-2 text-muted" />
                          {doc.name}
                        </div>
                      </td>
                      <td>{doc.category?.category_name || "Uncategorized"}</td>
                      <td>{new Date(doc.signed_date).toLocaleDateString()}</td>
                      {/* <td>{doc.signed_by}</td> */}
                      <td>
                        <span className="badge bg-success" style={{ padding: "0.5em 0.7em" }}>
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <Button
                          className={styles.btnView}
                          onClick={() => handleViewOpen(doc)}
                        >
                          <IoEyeOutline fontSize={16} /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className={styles.noDataContainer}>
              <div className={styles.noDataIcon}>
                <FaSignature />
              </div>
              <p className={styles.noDataText}>No signed documents found.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        centered
        show={modalStates.viewModel}
        // className="large-model"
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
                  // setMetaTags([])
                }}
              />
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-2 p-lg-4">
          <div className="d-flex preview-container">
            {viewDocument && (
              <>
                {/* Image Preview */}
                {["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico", "avif"].includes(viewDocument.type) ? (
                  <Image
                    src={viewDocument.url}
                    alt={viewDocument.name}
                    width={600}
                    height={600}
                  />
                ) :
                  /* TXT / CSV / LOG Preview */
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
                    /* PDF or Office Docs */
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
                // setMetaTags([])
              }}
              className="custom-icon-button button-danger text-white bg-danger px-3 py-1 rounded"
            >
              <MdOutlineCancel fontSize={16} className="me-1" /> Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>

    </DashboardLayout>
  );
};

export default SignApprovalPage;
