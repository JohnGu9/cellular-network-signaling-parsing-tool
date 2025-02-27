import { useState, useMemo } from "react";
import { Button, Dialog, ListItem, TextField } from "rmcw/dist/components3";

const HEX_CHAR = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f']);

// data should be bytes
export function RawDataView({ name, data, onEdit }: { name: string, data: number[], onEdit: (data: number[]) => unknown }) {
  const [openDialog, setOpenDialog] = useState(false);
  const oldData = useMemo(() => data.map(byte => byte.toString(16).padStart(2, '0')).join(''), [data]);
  const [content, setContent] = useState(oldData);
  return (
    <>
      <ListItem type="button"
        headline={name}
        supportingText={oldData}
        end={`len=${data.length}`}
        onClick={() => setOpenDialog(true)} />
      <Dialog open={openDialog}
        onScrimClick={() => setOpenDialog(false)}
        headline="Edit Raw Data"
        actions={<>
          <Button buttonStyle="text"
            disabled={content.length % 2 !== 0}
            onClick={() => {
              function hexToBytes(hex: string) {
                const bytes = [];
                for (let c = 0; c < hex.length; c += 2)
                  bytes.push(parseInt(hex.slice(c, c + 2), 16));
                return bytes;
              }
              onEdit(hexToBytes(content));
              setOpenDialog(false);
            }}>Edit</Button>
          <Button buttonStyle="text"
            onClick={() => setOpenDialog(false)}>Cancel</Button>
        </>}>
        <TextField key={oldData} type="textarea" label="HEX" style={{ width: "100%" }}
          value={content} onChange={(e) => {
            if (e.target.value.length !== 0) {
              const last = e.target.value.slice(-1);
              if (!HEX_CHAR.has(last)) {
                e.preventDefault();
                return;
              }
            }
            setContent(e.target.value);
          }} />
      </Dialog>
    </>
  );
}

