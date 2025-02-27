import { useState, useMemo } from "react";
import { DataTableBuilder, DataTableCell, DataTableRow, Theme, Card } from "rmcw";
import { Button, Dialog, Icon, CircularProgress, ListItem, Theme as Theme3 } from "rmcw/dist/components3";
import { JsonTreeView } from "./view/JsonTreeView";
import { RawDataView } from "./view/RawDataView";
import { NotEditableView } from "./view/NotEditableView";
import { EditableView } from "./view/EditableView";
import React from "react";
import "@fontsource/roboto";

type Layer = { name: string };
type Record = { timestamp: string, length: number, layers: Layer[] };
type IndexedRecord = { index: number, record: Record };

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<{ index: number, record: Record } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [errorDialog, setErrorDialog] = useState({ open: false, detail: "" });
  function openErrorDialog(detail: string) {
    return setErrorDialog({ open: true, detail });
  }
  function closeErrorDialog() {
    return setErrorDialog(value => { return { ...value, open: false }; })
  }

  return (
    <Theme3 className="full-size">
      <Theme className="full-size"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignContent: 'center',
          padding: 8,
        }}>
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 0px 8px"
        }}>
          <Button buttonStyle="filled"
            icon={<Icon>publish</Icon>}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file"
              input.onchange = async () => {
                if (input.files?.length === 1) {
                  setIsLoading(true);
                  try {
                    const [, buffer] = await Promise.all([delay(650), input.files[0].arrayBuffer()]);
                    const array = [...new Uint8Array(buffer)];
                    const obj = await window.pyloid.custom.open_file(array) as Record[];
                    if (obj === undefined || obj === null || obj.length === 0) {
                      console.log("No file opened");
                    } else {
                      setRecords(obj);
                      setSelectedRecord(null);
                    }
                  } catch (error) {
                    openErrorDialog(`${error}`);
                  }
                  setIsLoading(false);
                }
              };
              input.click();
            }}>Import</Button>
          <Button buttonStyle="filled-tonal" disabled={selectedRecord === null}
            onClick={async () => {
              if (selectedRecord === null) {
                return;
              }

              setIsLoading(true);
              try {
                await window.pyloid.custom.replay_packet(selectedRecord.index, selectedRecord.record);
                alert("Message sent. ")
              } catch (error) {
                openErrorDialog(`${error}`);
              }
              setIsLoading(false);

            }}>Replay Selected</Button>
          <div style={{ flexGrow: 1 }} />
          <Button buttonStyle="filled-tonal" disabled={records.length === 0}
            onClick={() => {
              setRecords([]);
              setSelectedRecord(null);
            }}>Clear</Button>
        </div>
        <DataTableBuilder
          style={{ flexGrow: 1, overflow: 'scroll' }}
          stickyHeader
          headerColumn={0}
          header={<DataTableRow>
            <DataTableCell>Index</DataTableCell>
            <DataTableCell>Timestamp</DataTableCell>
            <DataTableCell>Source</DataTableCell>
            <DataTableCell>Destination</DataTableCell>
            <DataTableCell>Length</DataTableCell>
            <DataTableCell>Protocol</DataTableCell>
          </DataTableRow>}
          itemCount={records.length}
          itemBuilder={function (index: number): React.ReactNode {
            const record = records[index];
            return (<RecordRow key={index} selected={index === selectedRecord?.index} record={{ index, record }} setSelectedRecord={setSelectedRecord} />);
          }} />
        <div style={{ minHeight: 8, height: 8 }} />
        <RecordView selected={selectedRecord} setRecord={indexRecord => {
          records[indexRecord.index] = indexRecord.record;
          setSelectedRecord(indexRecord);
        }} />
        <Dialog open={isLoading}>
          <div className="row" style={{ width: "100%", justifyContent: "center", margin: "16px 0 16px 0" }}><CircularProgress /></div>
        </Dialog>
        <Dialog open={errorDialog.open}
          onScrimClick={closeErrorDialog}
          onEscapeKey={closeErrorDialog}
          headline="Error"
          actions={<Button onClick={closeErrorDialog}>Close</Button>}>
          {errorDialog.detail}
        </Dialog>
      </Theme>
    </Theme3>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(() => resolve(null), ms));
}

function RecordRow({ record, selected, setSelectedRecord }: { record: IndexedRecord, selected: boolean, setSelectedRecord: (record: IndexedRecord) => unknown }) {
  const layers = record.record.layers;
  const protocol = useMemo(() => { return getProtocol(layers) }, [layers]);
  const src = useMemo(() => { return getSrc(layers) }, [layers]);
  const dst = useMemo(() => { return getDst(layers) }, [layers]);
  return (
    <DataTableRow selected={selected}
      onClick={() => setSelectedRecord(record)}>
      <DataTableCell>{record.index + 1}</DataTableCell>
      <DataTableCell>{record.record.timestamp}</DataTableCell>
      <DataTableCell>{src}</DataTableCell>
      <DataTableCell>{dst}</DataTableCell>
      <DataTableCell>{record.record.length}</DataTableCell>
      <DataTableCell>{protocol}</DataTableCell>
    </DataTableRow>
  );
}

function getProtocol(layers: { name: string }[]) {
  for (const layer of layers.slice().reverse()) {
    if ("name" in layer) {
      switch (layer.name) {
        case "Raw":
        case "Padding":
          break;
        default:
          return layer.name;
      }
    }
  }
  return "Unknown";
}

function getSrc(layers: { name: string }[]) {
  let sport = null;
  let src = null;
  for (const layer of layers.slice().reverse()) {
    if (src == null && "src" in layer) src = layer.src;
    if (sport == null && "sport" in layer) sport = layer.sport;
    if (src !== null && sport !== null) break;
  }
  if (src === null && sport === null) {
    return "";
  } else if (src === null) {
    return `${sport}`;
  } else if (sport === null) {
    return `${src}`;
  } else {
    return `${src}:${sport}`;
  }
}

function getDst(layers: { name: string }[]) {
  let dport = null;
  let dst = null;
  for (const layer of layers.slice().reverse()) {
    if (dst == null && "dst" in layer) dst = layer.dst;
    if (dport == null && "dport" in layer) dport = layer.dport;
    if (dst !== null && dport !== null) break;
  }
  if (dst === null && dport === null) {
    return "";
  } else if (dst === null) {
    return `${dport}`;
  } else if (dport === null) {
    return `${dst}`;
  } else {
    return `${dst}:${dport}`;
  }
}

export default App;

function RecordView({ selected, setRecord }: { selected: IndexedRecord | null, setRecord: (record: IndexedRecord) => unknown }) {
  return (
    <Card style={{
      minHeight: 300, height: 300, width: "100%", borderWidth: 1, borderStyle: "solid",
      borderColor: "var(--mdc-theme-text-icon-on-background, rgba(0, 0, 0, 0.12))",
    }}>
      {selected == null ? <></>
        : <div className="full-size" style={{ overflow: 'scroll' }}>
          {selected.record.layers.map((layer, i) =>
            <RecordLayerView key={i} layer={layer} setLayer={newLayer => {
              selected.record.layers[i] = newLayer;
              setRecord({ index: selected.index, record: selected.record });
            }} />)}
        </div>}
    </Card>
  );
}

function RecordLayerView({ layer, setLayer }: { layer: Layer, setLayer: (layer: Layer) => unknown }) {
  // warning: return ReactNode should come with "key" prop
  // or React internal data will be messed up 
  const { name, ...rest } = layer;
  switch (name) {
    case "NGAP":
    case "F1 AP": {
      if ("data" in rest) { // "data" is a object
        return (<>
          <ListItem type="text"
            key={name}
            headline={name}
            end={<Button buttonStyle="text"
              onClick={async (e) => {
                e.stopPropagation();
                const text = await window.pyloid.custom.json_to_asn1({ name, data: rest.data });
                window.pyloid.custom.copy_to_clipboard(text);
                alert("ASN.1 Text Copied. ")
              }}>Copy ASN.1</Button>} />
          <JsonTreeView name="PDU (JSON)" data={rest.data} setData={newData => {
            (layer as unknown as { data: unknown })["data"] = newData;
            setLayer(layer);
          }} />
        </>);
      }
      break;
    }
    case "HTTPResponse":
    case "HTTPRequest": {
      if ("headers" in rest && "body" in rest) {
        const { headers, body } = (rest as unknown as { headers: object, body: number[] | null });
        return (<React.Fragment key={name}>
          <JsonTreeView name={name} data={headers} setData={newData => {
            (layer as unknown as { headers: unknown })["headers"] = newData;
            setLayer(layer);
          }} />
          <RawDataView name="HTTPBody" data={body ?? []} onEdit={newData => {
            (layer as unknown as { body: number[] | null })["body"] = newData;
            setLayer(layer);
          }} />
        </React.Fragment>);
      }
      break;
    }
    case "Raw":
    case "Padding": {
      if ("load" in rest) {
        return (<RawDataView key={name} name={name} data={(rest as unknown as { load: number[] }).load ?? []}
          onEdit={newData => {
            (layer as unknown as { load: number[] })["load"] = newData;
            setLayer(layer);
          }} />);
      }
      break;
    }
    case "TCP":
    case "UDP":
    case "IP":
    case "IPv6":
    case "SCTP":
    case "SCTPChunkData":
      return (<EditableView key={name} name={name} rest={rest}
        onEdit={newData => {
          setLayer({ name, ...newData })
        }} />);

    default:
  }
  return (<NotEditableView key={name} name={name} rest={rest} />);

}

