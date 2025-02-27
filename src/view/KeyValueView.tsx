import { ListItem } from "rmcw/dist/components3";

export function KeyValueView({ data }: { data: { [key: string]: unknown }, setData: (data: { [key: string]: unknown }) => unknown }) {
  return (
    <>
      {Object.entries(data).map(([key, value], index) =>
        <ListItem key={index} headline={key} end={`${JSON.stringify(value)}`} />)}
    </>
  );
}
