/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { Tree, Modal, Input } from 'antd';
import type { TreeDataNode } from 'antd';
import { deleteWithAuth, getWithAuth, postWithAuth } from '@/utils/apiClient';
import Heading from '@/components/common/Heading';
import DashboardLayout from '@/components/DashboardLayout';
import { IoPencil, IoTrash } from 'react-icons/io5';
import styles from './sectors.module.css';

interface CategoryNode extends TreeDataNode {
  title: string | JSX.Element;
  key: string;
  parent_sector: string | null;
  children?: CategoryNode[];
}

const CategoryManagement: React.FC = () => {
  const [treeData, setTreeData] = useState<CategoryNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const fetchRootNodes = async () => {
    try {
      const data = await getWithAuth("all-sectors");
      // console.log("data: ", data)
      const convertToTreeData = (nodes: any[]): CategoryNode[] => {
        const map: Record<string, CategoryNode> = {};
        nodes.forEach((node) => {
          map[node.id] = {
            title: node.sector_name,
            key: node.id.toString(),
            parent_sector: node.parent_sector === 'none' ? null : node.parent_sector,
            children: [],
          };
        });

        const tree: CategoryNode[] = [];
        nodes.forEach((node) => {
          if (node.parent_sector === 'none') {
            tree.push(map[node.id]);
          } else if (map[node.parent_sector]) {
            map[node.parent_sector].children!.push(map[node.id]);
          }
        });

        return tree;
      };

      setTreeData(convertToTreeData(data));
    } catch (error) {
      console.error('Failed to fetch sectors', error);
    }
  };

  useEffect(() => {
    fetchRootNodes();
  }, []);

  const handleAddNode = async () => {
    try {
      const formData = new FormData();
      formData.append('parent_sector', parentId || 'none');
      formData.append('sector_name', categoryName);
      await postWithAuth('add-sector', formData);
      setModalVisible(false);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to add node', error);
    }
  };

  const handleEditNode = async () => {
    if (!selectedKey) return;
    try {
      const formData = new FormData();
      formData.append('sector_name', categoryName);
      formData.append('parent_sector', parentId || 'none');
      await postWithAuth(`sector-details/${selectedKey}`, formData);
      setModalVisible(false);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to edit node', error);
    }
  };

  const handleDeleteNode = async (id: string) => {
    try {
      await  getWithAuth(`delete-sector/${id}`);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to delete node', error);
    }
  };

  // const showModal = (mode: 'add' | 'edit', key: string | null = null, parentKey: string | null = null) => {
  //   setModalMode(mode);
  //   setSelectedKey(key);
  //   setParentId(parentKey);
  //   setCategoryName('');
  //   setModalVisible(true);
  // };

  const showModal = async (mode: 'add' | 'edit', key: string | null = null, parentKey: string | null = null) => {
    setModalMode(mode);
    setSelectedKey(key);
    setParentId(parentKey);
    setCategoryName('');
  
    if (mode === 'edit' && key) {
      try {
        const data = await getWithAuth(`sector-details/${key}`);
        setCategoryName(data.sector_name); 
      } catch (error) {
        console.error('Failed to fetch sector details', error);
      }
    }
  
    setModalVisible(true);
  };
  

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <Heading text="Sectors" color="#444" />
          <button
            type="button"
            className={styles.btnAdd}
            onClick={() => showModal('add')}
          >
            Add Root Category
          </button>
        </div>
        <div className={`${styles.card} w-100`}>
          <div className={styles.treeWrapper}>
            <Tree
              checkable
              treeData={treeData}
              titleRender={(node) => (
                <div className={styles.nodeActions}>
                  <span>{node.title}</span>
                  <button
                    type="button"
                    className={styles.btnAddChild}
                    onClick={() => showModal('add', null, node.key)}
                  >
                    Add Child
                  </button>
                  <button
                    type="button"
                    className={styles.btnEdit}
                    onClick={() => showModal('edit', node.key, node.parent_sector)}
                  >
                    <IoPencil fontSize={16} className="me-1" /> Edit
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => handleDeleteNode(node.key)}
                  >
                    <IoTrash fontSize={16} className="me-1" /> Delete
                  </button>
                </div>
              )}
            />
            <Modal
              className={styles.modalWrapper}
              title={modalMode === 'add' ? 'Add Category' : 'Edit Category'}
              open={modalVisible}
              onOk={modalMode === 'add' ? handleAddNode : handleEditNode}
              onCancel={() => setModalVisible(false)}
            >
              <Input
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </Modal>
          </div>
        </div>
      </div>
    </DashboardLayout>

  );
};

export default CategoryManagement;
