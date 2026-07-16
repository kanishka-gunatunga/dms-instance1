import React, { useState, useEffect } from "react";
import { Modal, Table } from "react-bootstrap";
import { getWithAuth } from "@/utils/apiClient";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Heading from "@/components/common/Heading";

interface ViewSignHistoryModalProps {
  show: boolean;
  handleClose: () => void;
  documentId: number | null;
  documentName: string;
}

interface SignStatusData {
  user_id: number;
  name: string;
  status: string;
  sign_option: string;
  date: string | null;
  level?: number;
}

const ViewSignHistoryModal: React.FC<ViewSignHistoryModalProps> = ({
  show,
  handleClose,
  documentId,
  documentName,
}) => {
  const [data, setData] = useState<SignStatusData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && documentId) {
      fetchSignStatus();
    }
  }, [show, documentId]);

  const fetchSignStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWithAuth(`document-sign-status/${documentId}`);
      if (response && response.status === "success") {
        setData(response.data);
      } else {
        setError(response?.message || "Failed to fetch sign status");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching sign status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <Heading text={`Sign History: ${documentName}`} color="#444" />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="d-flex justify-content-center my-4">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <div className="custom-scroll" style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table hover responsive bordered>
              <thead className="sticky-header bg-light">
                <tr>
                  <th>User Name</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Sign Option</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.level || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "Signed"
                              ? "bg-success"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.sign_option}</td>
                      <td>{item.date || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No assigned users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ViewSignHistoryModal;
