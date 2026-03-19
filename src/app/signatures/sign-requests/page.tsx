/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Heading from "@/components/common/Heading";
import { Table, Button } from "react-bootstrap";
import { FaSignature, FaRegFileAlt } from "react-icons/fa";

import { useUserContext } from "@/context/userContext";
import SignaturePlacementModal from "@/components/common/SignaturePlacementModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";

import ToastMessage from "@/components/common/Toast";
import styles from "./sign-requests.module.css";

interface Document {
  id: number;
  name: string;
  type: string;
  created_date: string;
  category?: { category_name: string };
  url?: string;
}

const SignRequestsPage = () => {
  const { userId } = useUserContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [userSignatureUrl, setUserSignatureUrl] = useState<string>("");

  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    if (userId) {
      loadSignRequests();
      loadUserSignature();
    }
  }, [userId]);

  const loadUserSignature = async () => {
    try {
      /*
      const response = await getWithAuth(`edit-user/${userId}`);
      if (response && response.user_details) {
        setUserSignatureUrl(response.user_details.digital_signature || "");
      }
      */
      setUserSignatureUrl("https://via.placeholder.com/200x100?text=John+Doe+Signature");
    } catch (error) {
      console.error("Failed to load user signature:", error);
    }
  };

  const loadSignRequests = async () => {
    setLoading(true);
    try {
      /*
      await fetchAssignedDocumentsByUserData(Number(userId), (data: any) => {
        setDocuments(data || []);
      });
      */
      const dummyRequests: Document[] = [
        { id: 201, name: "Employment_Agreement_2026.pdf", type: "pdf", created_date: new Date().toISOString(), category: { category_name: "HR" } },
        { id: 202, name: "NDA_Project_X.pdf", type: "pdf", created_date: new Date().toISOString(), category: { category_name: "Legal" } },
      ];
      setDocuments(dummyRequests);
    } catch (error) {
      console.error("Failed to load sign requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const openSignModal = async (doc: Document) => {
    try {
      /*
      const response = await getWithAuth(`view-document/${doc.id}/${userId}`);
      if (response && response.data) {
        setSelectedDoc(response.data);
        setShowSignModal(true);
      } else {
        throw new Error("Failed to load document details");
      }
      */
      setSelectedDoc({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        created_date: doc.created_date,
        url: doc.name.includes("pdf") ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : "https://via.placeholder.com/800x1100?text=Document+Preview"
      });
      setShowSignModal(true);
    } catch (error) {
      console.error("Error loading document for signing:", error);
      setToastType("error");
      setToastMessage("Failed to load document details for signing.");
      setShowToast(true);
    }
  };

  const handleSaveSignedDocument = async (signedFile: File) => {
    setIsProcessing(true);
    try {
      /*
      const formData = new FormData();
      formData.append("document", signedFile);
      formData.append("user", userId || "");
      
      const response = await postWithAuth(
        `document-upload-new-version/${selectedDoc?.id}`,
        formData
      );

      if (response.status === "success") {
        setShowSignModal(false);
        setToastType("success");
        setToastMessage("Document signed and updated successfully!");
        setShowToast(true);
        loadSignRequests(); // Refresh the list
      } else {
        setToastType("error");
        setToastMessage("Failed to save the signed document!");
        setShowToast(true);
      }
      */

      await new Promise(resolve => setTimeout(resolve, 1500));

      setShowSignModal(false);
      setToastType("success");
      setToastMessage("Document signed and updated successfully (Demo Mode)!");
      setShowToast(true);

      setDocuments(prev => prev.filter(d => d.id !== selectedDoc?.id));
    } catch (error) {
      console.error("Error saving signed document:", error);
      setToastType("error");
      setToastMessage("An error occurred while saving the signed document!");
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading && documents.length === 0) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <Heading text="Sign Requests" color="#0A0A0A" />
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
                    <th>Received Date</th>
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
                      <td>{new Date(doc.created_date).toLocaleDateString()}</td>
                      <td>
                        <span className={styles.statusBadge}>Pending Sign</span>
                      </td>
                      <td>
                        <Button className={styles.btnSign} onClick={() => openSignModal(doc)}>
                          <FaSignature /> Sign Now
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
              <p className={styles.noDataText}>No pending signature requests found.</p>
            </div>
          )}
        </div>
      </div>

      {showSignModal && selectedDoc && (
        <SignaturePlacementModal
          show={showSignModal}
          onHide={() => setShowSignModal(false)}
          documentUrl={selectedDoc.url || ""}
          documentType={selectedDoc.type}
          signatureUrl={userSignatureUrl}
          onSave={handleSaveSignedDocument}
        />
      )}

      <ToastMessage
        show={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
        message={toastMessage}
      />
    </DashboardLayout>
  );
};

export default SignRequestsPage;
