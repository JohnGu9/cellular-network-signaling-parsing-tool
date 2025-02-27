import { useState, createContext, useContext } from "react";
import { KeyPath, JSONTree } from "react-json-tree";
import { Button, Dialog, ListItem, Ripple, TextField } from "rmcw/dist/components3";

export function JsonTreeView({ name, data, setData }: { name: string, data: unknown, setData: (data: unknown) => unknown }) {
  const [arrayAddDialog, setArrayAddDialog] = useState(false);
  const [objectAddDialog, setObjectAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, detail: "" });
  function openErrorDialog(detail: string) {
    return setErrorDialog({ open: true, detail });
  }
  function closeErrorDialog() {
    return setErrorDialog(value => { return { ...value, open: false }; })
  }
  const [target, setTarget] = useState<KeyPath>([]);

  function deleteTarget(path: KeyPath) {
    try {
      const realPath = [...path].reverse();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function deleteProp(object: any, path: (string | number)[]) {
        const last = path.pop();
        if (last === undefined) return;
        const lastRoot = path.reduce((o, k) => o[k] || {}, object)
        if (Array.isArray(lastRoot)) {
          lastRoot.splice(last as number, 1);
        } else {
          delete lastRoot[last];
        }
      }
      const copyData = JSON.parse(JSON.stringify(data));
      deleteProp(copyData, realPath)
      setData(copyData);
    } catch (error) {
      openErrorDialog(`${error}`);
      return false;
    }
    return true;
  }
  function addTarget(key: number | string, value: string) {
    try {
      const valObj = JSON.parse(value);
      const realPath = [...target].reverse();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function addProp(object: any, path: (string | number)[], key: number | string, value: unknown) {
        const lastRoot = path.reduce((o, k) => o[k] || {}, object)
        if (Array.isArray(lastRoot)) {
          lastRoot.splice(key as number, 0, value);
        } else {
          lastRoot[key] = value;
        }
      }
      const copyData = JSON.parse(JSON.stringify(data));
      addProp(copyData, realPath, key, valObj);
      setData(copyData);
    } catch (error) {
      openErrorDialog(`${error}`);
      return false;
    }
    return true;
  }
  function editTarget(value: string) {
    try {
      const valObj = JSON.parse(value);
      const realPath = [...target].reverse();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function editProp(object: any, path: (string | number)[], value: unknown) {
        const last = path.pop();
        if (last === undefined) return;
        const lastRoot = path.reduce((o, k) => o[k] || {}, object)
        if (Array.isArray(lastRoot)) {
          lastRoot[last as number] = value;
        } else {
          lastRoot[last] = value;
        }
      }
      const copyData = JSON.parse(JSON.stringify(data));
      editProp(copyData, realPath, valObj);
      setData(copyData);
    } catch (error) {
      openErrorDialog(`${error}`);
      return false;
    }
    return true;
  }

  return (
    <>
      <Ripple>
        <ListItem type="text"
          headline={name}
          end={<>
            <Button buttonStyle="text"
              onClick={() => {
                setTarget(["root"]);
                if (Array.isArray(data)) {
                  setArrayAddDialog(true);
                } else {
                  setObjectAddDialog(true);
                }
              }}>Add</Button>
            <Button buttonStyle="text"
              onClick={() => { window.pyloid.custom.copy_to_clipboard(JSON.stringify(data, null, 2)); }}>Copy JSON</Button>
          </>} />
        <div style={{ width: "100%", padding: "0 12px" }}>
          <JSONTree
            hideRoot
            theme={{ base00: "#00000000", base0D: "var(--md-sys-color-primary, #6200ee)" }}
            shouldExpandNodeInitially={(_keyPath, _data, level) => level < 5}
            getItemString={
              (_type, data, itemType, itemString, keyPath) => {
                const openDialog = () => {
                  if (Array.isArray(data)) {
                    setArrayAddDialog(true);
                  } else {
                    setObjectAddDialog(true);
                  }
                };
                if (keyPath.length == 1) {
                  return <HiddenWrapper>
                    {itemType} {itemString}
                    <HiddenButton style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); window.pyloid.custom.copy_to_clipboard(JSON.stringify(data, null, 2)) }}>Copy</HiddenButton>
                    <HiddenButton style={{ marginLeft: 8, marginRight: 8 }} onClick={e => { e.stopPropagation(); openDialog(); }}>Add</HiddenButton>
                  </HiddenWrapper>;
                }
                return <HiddenWrapper onClick={() => console.log(keyPath)}>
                  {itemType} {itemString}
                  <HiddenButton style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); window.pyloid.custom.copy_to_clipboard(JSON.stringify(data, null, 2)) }}>Copy</HiddenButton>
                  <HiddenButton style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); setTarget(keyPath); openDialog(); }}>Add</HiddenButton>
                  <HiddenButton style={{ marginLeft: 8, marginRight: 8 }} onClick={e => { e.stopPropagation(); deleteTarget(keyPath) }}>Delete</HiddenButton>
                </HiddenWrapper>;
              }}
            labelRenderer={([key, ...rest]) => <strong onClick={() => console.log(rest)}>{key}: </strong>}
            valueRenderer={(raw, _, ...keyPath) => <em>
              <HiddenWrapper>
                {raw as string}
                <HiddenButton style={{ marginLeft: 8 }} onClick={() => { window.pyloid.custom.copy_to_clipboard(raw as string) }}>Copy</HiddenButton>
                <HiddenButton style={{ marginLeft: 8 }} onClick={() => { setTarget(keyPath);; setEditDialog(true); }}>Edit</HiddenButton>
                <HiddenButton style={{ marginLeft: 8 }} onClick={() => deleteTarget(keyPath)}>Delete</HiddenButton>
              </HiddenWrapper>
            </em>}
            data={data} />
          <div style={{ height: 16 }} />
        </div>
      </Ripple>
      <ArrayAddObjectDialog addDialog={errorDialog.open ? false : arrayAddDialog} setAddDialog={setArrayAddDialog} onAdd={addTarget} />
      <ObjectAddObjectDialog addDialog={errorDialog.open ? false : objectAddDialog} setAddDialog={setObjectAddDialog} onAdd={addTarget} />
      <EditDialog addDialog={errorDialog.open ? false : editDialog} setAddDialog={setEditDialog} onEdit={editTarget} />
      <Dialog open={errorDialog.open}
        onScrimClick={closeErrorDialog}
        onEscapeKey={closeErrorDialog}
        headline="Error"
        actions={<Button buttonStyle="text" onClick={closeErrorDialog}>Close</Button>}>
        {errorDialog.detail}
      </Dialog>
    </>
  );
}

function ArrayAddObjectDialog({ addDialog, setAddDialog, onAdd }: {
  addDialog: boolean,
  setAddDialog: React.Dispatch<React.SetStateAction<boolean>>,
  onAdd: (index: number, value: string) => boolean,
}) {
  const [addKey, setAddKey] = useState("0");
  const [addContent, setAddContent] = useState("");

  return (
    <Dialog open={addDialog} headline="Add Object"
      onScrimClick={() => setAddDialog(false)}
      onEscapeKey={() => setAddDialog(false)}
      actions={<>
        <Button buttonStyle="text" onClick={() => { setAddDialog(false); onAdd(JSON.parse(addKey), addContent); }}>Add</Button>
        <Button buttonStyle="text" onClick={() => setAddDialog(false)}>Cancel</Button>
      </>}>
      <div style={{ marginBottom: 16 }}>
        <TextField style={{ width: "100%" }} label="Index (Number)" type="number" min="0" required value={addKey} onChange={e => setAddKey(e.target.value)} />
      </div>
      <TextField style={{ width: "100%" }} label="Value (JSON)" type="textarea" required value={addContent} onChange={(e) => setAddContent(e.target.value)} />
    </Dialog>
  );
}

function ObjectAddObjectDialog({ addDialog, setAddDialog, onAdd }: {
  addDialog: boolean,
  setAddDialog: React.Dispatch<React.SetStateAction<boolean>>,
  onAdd: (key: string, value: string) => boolean,
}) {
  const [addKey, setAddKey] = useState("");
  const [addContent, setAddContent] = useState("");

  return (
    <Dialog open={addDialog} headline="Add Object"
      onScrimClick={() => setAddDialog(false)}
      onEscapeKey={() => setAddDialog(false)}
      actions={<>
        <Button buttonStyle="text" onClick={() => { setAddDialog(false); onAdd(addKey, addContent); }}>Add</Button>
        <Button buttonStyle="text" onClick={() => setAddDialog(false)}>Cancel</Button>
      </>}>
      <div style={{ marginBottom: 16 }}>
        <TextField style={{ width: "100%" }} label="Key (String)" type="text" required value={addKey} onChange={e => setAddKey(e.target.value)} />
      </div>
      <TextField style={{ width: "100%" }} label="Value (JSON)" type="textarea" required value={addContent} onChange={(e) => setAddContent(e.target.value)} />
    </Dialog>
  );
}

function EditDialog({ addDialog, setAddDialog, onEdit }: {
  addDialog: boolean,
  setAddDialog: React.Dispatch<React.SetStateAction<boolean>>,
  onEdit: (value: string) => boolean,
}) {
  const [addContent, setAddContent] = useState("");
  return (
    <Dialog open={addDialog} headline="Edit Object"
      onScrimClick={() => setAddDialog(false)}
      onEscapeKey={() => setAddDialog(false)}
      actions={<>
        <Button buttonStyle="text" onClick={() => { setAddDialog(false); onEdit(addContent); }}>Edit</Button>
        <Button buttonStyle="text" onClick={() => setAddDialog(false)}>Cancel</Button>
      </>}>
      <TextField style={{ width: "100%" }} label="Value (JSON)" type="textarea" required value={addContent} onChange={(e) => setAddContent(e.target.value)} />
    </Dialog>
  );
}

const HiddenContext = createContext<boolean>(true);

function HiddenWrapper(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  const [hidden, setHidden] = useState(true);
  return (
    <HiddenContext.Provider value={hidden}>
      <span {...props}
        onMouseEnter={() => setHidden(false)}
        onMouseLeave={() => setHidden(true)} />
    </HiddenContext.Provider>
  );
}

function HiddenButton({ style, ...props }: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
  const hidden = useContext(HiddenContext);
  return (
    <button style={{ ...style, opacity: hidden ? 0 : 1, transition: "opacity 300ms" }} {...props} />
  );
}
