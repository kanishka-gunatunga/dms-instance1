"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Heading from "@/components/common/Heading";
import { Table, Button, Modal, Form } from "react-bootstrap";
import { IoFolderOutline, IoArrowBack, IoPersonAddOutline } from "react-icons/io5";
import { fetchDocumentCategoryWithCount, fetchDocumentsData, fetchAndMapUserData } from "@/utils/dataFetchFunctions";
import { useUserContext } from "@/context/userContext";
import { postWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import styles from "./sign-approval.module.css";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { UserDropdownItem } from "@/types/types";

interface Category {
  id: number;
  category_name: string;
  doc_count: number;
}

interface Document {
  id: number;
  name: string;
  category: { id: number; category_name: string };
  created_date: string;
  type: string;
}

const SignApprovalPage = () => {
  const { userId } = useUserContext();
  const [view, setView] = useState<"categories" | "documents">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assign Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [users, setUsers] = useState<UserDropdownItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    loadCategories();
    fetchAndMapUserData(setUsers);
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Mocking API call for frontend-only demo
      // await fetchDocumentCategoryWithCount(setCategories);
      setCategories([
        { id: 1, category_name: "Invoices", doc_count: 3 },
        { id: 2, category_name: "Contracts", doc_count: 5 },
        { id: 3, category_name: "Reports", doc_count: 2 },
        { id: 4, category_name: "HR Documents", doc_count: 4 }
      ]);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category);
    setView("documents");
    setLoading(true);
    try {
      // Mocking API call for frontend-only demo
      /*
      await fetchDocumentsData((data: Document[]) => {
        const filtered = data.filter(doc => doc.category?.id === category.id);
        setDocuments(filtered);
      });
      */
      const dummyDocs: Document[] = [
        { id: 101, name: `${category.category_name}_Doc_A.pdf`, type: "pdf", created_date: new Date().toISOString(), category: { id: category.id, category_name: category.category_name } },
        { id: 102, name: `${category.category_name}_Doc_B.png`, type: "png", created_date: new Date().toISOString(), category: { id: category.id, category_name: category.category_name } },
      ];
      setDocuments(dummyDocs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView("categories");
    setSelectedCategory(null);
    setDocuments([]);
  };

  const openAssignModal = (doc: Document) => {
    setSelectedDoc(doc);
    setSelectedUserIds([]);
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0 || !selectedDoc) return;

    setIsAssigning(true);
    try {
      // Mocking successful assignment for frontend demo
      /*
      const formData = new FormData();
      formData.append("type", "user");
      formData.append("assigned_roles_or_users", JSON.stringify(selectedUserIds));
      formData.append("user", userId || "");
      formData.append("is_time_limited", "0");
      formData.append("is_downloadable", "1");
      formData.append("is_signature_request", "1"); 

      const response = await postWithAuth(`document-share/${selectedDoc.id}`, formData);
      */
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      setToastType("success");
      setToastMessage(`Document assigned successfully to ${selectedUserIds.length} users.`);
      setShowToast(true);
      setShowAssignModal(false);
      setSelectedUserIds([]);
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to assign document for signature.");
      setShowToast(true);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading && view === "categories") return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <Heading text={view === "categories" ? "Sign Approval - Categories" : `Sign Approval - ${selectedCategory?.category_name}`} color="#0A0A0A" />
          </div>
        </div>

        <div className={styles.card}>
          {view === "categories" ? (
            <div className={styles.categoryGrid}>
              {categories.map((cat) => (
                <div key={cat.id} className={styles.categoryCard} onClick={() => handleCategoryClick(cat)}>
                  <div className={styles.categoryIcon}>
                    <IoFolderOutline />
                  </div>
                  <div className={styles.categoryName}>{cat.category_name}</div>
                  <div className={styles.docCount}>{cat.doc_count} Documents</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <button className={styles.backBtn} onClick={handleBack}>
                <IoArrowBack /> Back to Categories
              </button>
              
              <div className={styles.tableWrapper}>
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Type</th>
                      <th>Created Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length > 0 ? (
                      documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.name}</td>
                          <td>{doc.type.toUpperCase()}</td>
                          <td>{new Date(doc.created_date).toLocaleDateString()}</td>
                          <td>
                            <Button className={styles.btnAssign} onClick={() => openAssignModal(doc)}>
                              <IoPersonAddOutline /> Assign to Sign
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-muted">No documents found in this category.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1.1rem", fontWeight: 600 }}>Assign for Signature</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">Select one or more users to request their electronic signature on <strong>{selectedDoc?.name}</strong>.</p>
          
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Label className="small mb-0 font-weight-bold">Select Users</Form.Label>
            <Button 
                variant="link" 
                className="p-0 small text-decoration-none"
                onClick={() => {
                    if (selectedUserIds.length === users.length) {
                        setSelectedUserIds([]);
                    } else {
                        setSelectedUserIds(users.map(u => u.id.toString()));
                    }
                }}
            >
                {selectedUserIds.length === users.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #eee", padding: "10px", borderRadius: "0.5rem" }}>
            {users.map(u => (
              <Form.Check 
                key={u.id}
                type="checkbox"
                id={`user-${u.id}`}
                label={u.user_name}
                checked={selectedUserIds.includes(u.id.toString())}
                onChange={(e) => {
                  const id = u.id.toString();
                  if (e.target.checked) {
                    setSelectedUserIds([...selectedUserIds, id]);
                  } else {
                    setSelectedUserIds(selectedUserIds.filter(prev => prev !== id));
                  }
                }}
                className="mb-2"
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)} style={{ borderRadius: "0.5rem" }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={selectedUserIds.length === 0 || isAssigning}
            style={{ backgroundColor: "#EA580C", borderColor: "#EA580C", borderRadius: "0.5rem" }}
          >
            {isAssigning ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastMessage
        show={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
        message={toastMessage}
      />
    </DashboardLayout>
  );
};

export default SignApprovalPage;
