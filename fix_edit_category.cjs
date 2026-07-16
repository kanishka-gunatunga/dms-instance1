const fs = require('fs');
const file = 'd:/KODE TECH/DMS LATEST WITH LICENCE/frontend/src/app/document-categories/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const validateEdit = \(\) => \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}[\s\S]*?\};/m;

const replacement = `const validateEdit = () => {
    const validationErrors: any = {};

    if (!category_name) {
      validationErrors.category_name = "Category Name is required.";
    }

    return validationErrors;
  };

  const handleEditCategory = async () => {
    try {
      const formData = new FormData();
      formData.append("parent_category", editData.parent_category || "");
      formData.append("category_name", editData.category_name || "");
      formData.append("description", editData.description);
      formData.append("attribute_data", JSON.stringify(attributeData));
      
      if (signingLevels && signingLevels.length > 0) {
        formData.append("signing_users", JSON.stringify(signingLevels));
      } else {
        formData.append("signing_users", "[]");
      }

      const response = await postWithAuth(
        \`category-details/\${selectedItemId}\`,
        formData
      );
      
      if (response.status === "success") {
        handleCloseModal("editModel");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)

        setToastType("success");
        setToastMessage("Category updated successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);

        fetchCategoryChildrenData(setDummyData);
        fetchCategoryData(setCategoryDropDownData);
      } else {
        handleCloseModal("editModel");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)

        setToastType("error");
        setToastMessage("Failed to update category!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to update category!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      // console.error("Error new version updating:", error);
    }
  };`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log('Successfully fixed handleEditCategory');
} else {
    console.log('Regex did not match!');
}
