import { useMemo, useState } from "react";
import { Button, Dialog, ListItem, TextField } from "rmcw/dist/components3";

export function EditableView({ name, rest, onEdit }: { name: string, rest: { [key: string]: unknown }, onEdit: (newData: { [key: string]: unknown }) => unknown }) {
  function propToStr(obj: { [key: string]: unknown; }) {
    let str = ""
    for (const [key, value] of Object.entries(obj)) {
      str += `${key}=${JSON.stringify(value)}  `
    }
    return str;
  }
  const [openDialog, setOpenDialog] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const propStr = useMemo(() => propToStr(rest), [name]);
  const [data, setData] = useState(Object.entries(rest).reduce((res, [key, value]) => { res[key] = JSON.stringify(value); return res; }, {} as { [key: string]: string }));
  return (<>
    <ListItem type="button" headline={name} end={propStr}
      onClick={() => setOpenDialog(true)} />
    <Dialog key={name} headline="Edit" open={openDialog}
      onScrimClick={() => setOpenDialog(false)}
      onEscapeKey={() => setOpenDialog(false)}
      actions={<>
        <Button buttonStyle="text" onClick={() => {
          try {
            const newData = Object.entries(data).reduce((res, [key, value]) => {
              res[key] = JSON.parse(value);
              return res;
            }, {} as { [key: string]: unknown });
            onEdit(newData);
          } catch (e) {
            alert(`${e}`);
            return;
          }
          setOpenDialog(false);
        }}>Submit</Button>
        <Button buttonStyle="text"
          onClick={() => setOpenDialog(false)}>Cancel</Button>
      </>}>
      {Object.entries(data).map(([key, value]) =>
        <TextField type="text"
          key={key}
          style={{ display: "block", margin: "8px 0" }}
          value={value}
          label={key}
          onChange={e => { setData(data => { return { ...data, [key]: e.target.value } }) }} />)}
    </Dialog>
  </>
  );
}

