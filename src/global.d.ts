declare global {
  interface Window {
    pyloid: {
      custom: {
        create_window: () => Promise<unknown>;
        print_object: (obj: unknown) => Promise<unknown>;
        copy_to_clipboard: (copy_text: string) => Promise<unknown>;
        replay_packet: (index: number, packet: unknown) => Promise<unknown>,
        open_file: (bytes: number[]) => Promise<unknown>,
        json_to_asn1: (a: { name: "NGAP" | "F1 AP", "data": unknown }) => Promise<string>,
      };
    };
  }
}

export { };
