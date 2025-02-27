import { useMemo } from "react";
import { ListItem } from "rmcw/dist/components3";

export function NotEditableView({ name, rest }: { name: string, rest: { [key: string]: unknown } }) {
  function propToStr(obj: { [s: string]: unknown; }) {
    let str = ""
    for (const [key, value] of Object.entries(obj)) {
      str += `${key}=${JSON.stringify(value)}  `
    }
    return str;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const propStr = useMemo(() => propToStr(rest), [name]);
  return (<ListItem headline={name} end={propStr} />);
}

