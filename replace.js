const fs = require('fs');
const file = 'd:/KODE TECH/DMS LATEST WITH LICENCE/frontend/src/app/document-categories/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. State
content = content.replace(
  'const [roles, setRoles] = useState<string[]>([]);',
  'const [roles, setRoles] = useState<string[]>([]);\n  const [signingLevels, setSigningLevels] = useState<{ level: number; users: string[] }[]>([]);'
);

// 2. resetSigningAssignment
content = content.replace(
  'setRoles([]);',
  'setRoles([]);\n    setSigningLevels([]);'
);

// 3. remove renderSigningAssignmentFields definition entirely
content = content.replace(/const renderSigningAssignmentFields =.*?<\/>\n  \);\n/s, '');

// 4. remove calls
content = content.replace(/\s*\{renderSigningAssignmentFields\("add"\)\}/g, '');
content = content.replace(/\s*\{renderSigningAssignmentFields\("child"\)\}/g, '');
content = content.replace(/\s*\{renderSigningAssignmentFields\("edit"\)\}/g, '');

// 5. replace parse logic
content = content.replace(
  /if \(response\.signing_roles\) \{[\s\S]*?if \(response\.signing_users\) \{[\s\S]*?catch \(e\) \{\s*console\.error\("Failed to parse signing_users:", e\);\s*\}\s*\}/,
  `if (response.signing_users) {
          try {
            const parsedLevels = typeof response.signing_users === "string"
              ? JSON.parse(response.signing_users)
              : response.signing_users;
            if (Array.isArray(parsedLevels)) {
              if (parsedLevels.length > 0 && typeof parsedLevels[0] === 'object') {
                  setSigningLevels(parsedLevels);
              } else {
                  setSigningLevels([{ level: 1, users: parsedLevels }]);
              }
            } else {
              setSigningLevels([]);
            }
          } catch (e) {
            console.error("Failed to parse signing_users:", e);
            setSigningLevels([]);
          }
        } else {
            setSigningLevels([]);
        }`
);

// 6. modify append in handleAddCategory and child
content = content.replace(/formData\.append\("signing_roles", JSON\.stringify\(selectedRoleIds\)\);\s*formData\.append\("signing_users", JSON\.stringify\(selectedUserIds\)\);/g, '');

// 7. modify UI in Edit Modal
content = content.replace(
  /editData\.sectors && editData\.sectors\.length > 0 \? \([\s\S]*?\) : \([\s\S]*?\n\s*\)/,
  `editData.sectors && editData.sectors.length > 0 ? (
                <div className={\`col-12 col-lg-12 d-flex flex-column pe-2 \${styles.formGroup}\`}>
                  <label className={styles.formLabel}>
                    Signing Levels 
                    <button 
                      type="button"
                      className="btn btn-sm btn-success ms-2"
                      onClick={() => setSigningLevels([...signingLevels, { level: signingLevels.length + 1, users: [] }])}
                    >
                      <FaPlus /> Add Level
                    </button>
                  </label>
                  {signingLevels.map((levelObj, levelIndex) => (
                    <div key={levelIndex} className="d-flex flex-column position-relative mt-2 p-2 border rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Level {levelObj.level}</strong>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            const newLevels = signingLevels.filter((_, i) => i !== levelIndex);
                            newLevels.forEach((l, i) => l.level = i + 1);
                            setSigningLevels(newLevels);
                          }}
                        >
                          <IoTrashOutline />
                        </button>
                      </div>
                      <DropdownButton
                        id={\`dropdown-level-\${levelObj.level}-users\`}
                        title="Select Users"
                        className={\`custom-dropdown-text-start text-start w-100 \${styles.dropdownToggle}\`}
                        onSelect={(value) => {
                          if (value && !levelObj.users.includes(value)) {
                            const newLevels = [...signingLevels];
                            newLevels[levelIndex].users.push(value);
                            setSigningLevels(newLevels);
                          }
                        }}
                      >
                        {userDropDownData.length > 0 ? (
                          userDropDownData.map((user) => (
                            <Dropdown.Item key={user.id} eventKey={user.id.toString()}>
                              {user.user_name}
                            </Dropdown.Item>
                          ))
                        ) : (
                          <Dropdown.Item disabled>No users available for these sectors</Dropdown.Item>
                        )}
                      </DropdownButton>
                      <div className="mt-1">
                        {levelObj.users.map((userId, userIndex) => {
                          const user = userDropDownData.find(u => u.id.toString() === userId.toString());
                          const userName = user ? user.user_name : userId;
                          return (
                            <span key={userIndex} className={styles.badge}>
                              {userName}
                              <IoClose className={styles.badgeClose} onClick={() => {
                                const newLevels = [...signingLevels];
                                newLevels[levelIndex].users = newLevels[levelIndex].users.filter(id => id !== userId);
                                setSigningLevels(newLevels);
                              }} />
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={\`col-12 col-lg-12 d-flex flex-column pe-2 \${styles.formGroup}\`}>
                  <label className={styles.formLabel}>Signing Levels</label>
                  <div className="d-flex flex-column position-relative mt-2">
                    <Paragraph text="First assign the category to a sector to assign users" color="#dc3545" />
                  </div>
                </div>
              )`
);

// 8. modify append in handleEditCategory
// Since we removed the others, there should only be one left. Wait, the previous replace /g might have removed all.
// Actually, handleAddCategory had formData.append("signing_users", JSON.stringify(selectedUserIds));
// Wait, my regex /g above replaces ALL. 
// Let's just do it directly.
content = content.replace(
  /formData\.append\("signing_roles", JSON\.stringify\(selectedRoleIds\)\);\s*formData\.append\("signing_users", JSON\.stringify\(selectedUserIds\)\);/g,
  'formData.append("signing_users", JSON.stringify(signingLevels));'
);

fs.writeFileSync(file, content);
console.log('done');
