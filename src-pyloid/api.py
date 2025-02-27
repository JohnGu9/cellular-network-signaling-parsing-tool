from pyloid import Pyloid, PyloidAPI, Bridge, is_production, get_production_path
from PySide6.QtWidgets import QApplication
from scapy.all import rdpcap, send, Packet, Raw, NoPayload, Padding, AnyField
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, TCP, UDP
from scapy.layers.inet6 import IPv6
from scapy.layers.http import HTTPRequest, HTTPResponse
from scapy.layers.sctp import SCTP, SCTPChunkData
from pycrate_asn1rt.asnobj_construct import CHOICE
from pycrate_asn1dir import NGAP, F1AP

from io import BytesIO
import os
import json
import traceback


NGAP_PDU = NGAP.NGAP_PDU_Descriptions.NGAP_PDU
F1AP_PDU = F1AP.F1AP_PDU_Descriptions.F1AP_PDU


class custom(PyloidAPI):
    app: Pyloid

    def __init__(self, app: Pyloid):
        super().__init__()
        self.app = app

    @Bridge(result=str)
    def create_window(self):  # Ignore
        window = self.app.create_window(
            title="Pyloid Browser-2",
            js_apis=[custom(self.app)],
        )

        window.set_size(800, 600)
        window.set_position(0, 0)

        if is_production():
            window.set_dev_tools(False)
            window.load_file(os.path.join(get_production_path(), "build/index.html"))  # type: ignore
        else:
            window.set_dev_tools(True)
            window.load_url("http://localhost:5173")

        window.show()
        window.focus()

        return window.id

    @Bridge(dict, result=dict)
    def print_object(self, obj):
        print(obj)
        return obj

    @Bridge(str)
    def copy_to_clipboard(self, copy_text: str):
        QApplication.clipboard().setText(copy_text)

    @Bridge(dict, result=str)
    def json_to_asn1(self, obj: dict):
        if "data" in obj:
            if obj["name"] == "NGAP":
                obj_str = json.dumps(obj["data"])
                NGAP_PDU.from_json(obj_str)
                return NGAP_PDU.to_asn1()
            elif obj["name"] == "F1 AP":
                obj_str = json.dumps(obj["data"])
                F1AP_PDU.from_json(obj_str)
                return F1AP_PDU.to_asn1()
        raise TypeError()

    original_pkts = []

    @Bridge(int, dict)
    def replay_packet(self, index: int, packet: dict):
        original_pkt: Packet = self.original_pkts[index]

        layers = packet["layers"]
        layers_amount = len(layers)
        if layers_amount == 0:
            return
        last_layer = layers[layers_amount - 1]
        data = None
        if last_layer["name"] == "NGAP":
            data = last_layer["data"]
            if data:
                obj_str = json.dumps(data)
                NGAP_PDU.from_json(obj_str)
                data = NGAP_PDU.to_aper()

        index = 0
        current = original_pkt
        while current:
            if isinstance(current, IP):
                send(copy_packet(current, layers[index:]))
                return
            elif isinstance(current, IPv6):
                send(copy_packet(current, layers[index:]))
                return
            current = current.payload
            index += 1

        send(copy_packet(original_pkt, layers))

    @Bridge(list, result=list)
    def open_file(self, data: list[int]):
        # opened_file_name = tkinter.filedialog.askopenfilename()
        # if opened_file_name:
        obj = []
        pkts = rdpcap(BytesIO(bytes(data)))
        self.original_pkts = pkts
        for pkt in pkts:
            layers = []
            parse_packet(pkt, layers)
            obj.append(
                {
                    "timestamp": f"{pkt.time}",
                    "length": pkt.wirelen,
                    "layers": layers,
                }
            )
        return obj


def copy_packet(packet: Packet, layers_data: list[dict]) -> Packet:
    def copy_layer(layer: Packet, layer_data: list[dict]):
        def remove_props(old_data: dict, *props_name: str):
            new_data = {**old_data}
            for fname in props_name:
                if fname in new_data:
                    del new_data[fname]
            return new_data

        if isinstance(layer, IP):
            return IP(**remove_props(layer_data[0], "name"))
        if isinstance(layer, IPv6):
            return IPv6(**remove_props(layer_data[0], "name"))
        if isinstance(layer, SCTP):
            return SCTP(**remove_props(layer_data[0], "name"))
        if isinstance(layer, SCTPChunkData):

            def get_data():  #  -> bytes | None
                if len(layer_data) < 2:
                    return None

                raw_data = layer_data[1]
                if "data" in raw_data:
                    if raw_data["name"] == "NGAP":
                        obj_str = json.dumps(raw_data["data"])
                        NGAP_PDU.from_json(obj_str)
                        return NGAP_PDU.to_aper()
                    elif raw_data["name"] == "F1 AP":
                        obj_str = json.dumps(raw_data["data"])
                        F1AP_PDU.from_json(obj_str)
                        return F1AP_PDU.to_aper()

                if "origin_data" in raw_data:
                    return bytes(raw_data["origin_data"])

            return SCTPChunkData(
                **{
                    **remove_props(layer_data[0], "name"),
                    "data": get_data(),
                }
            )

        def build_http_header_props(
            headers: dict[str, str], fields_desc: list[AnyField]
        ):
            known_headers = set()
            for field_desc in fields_desc:
                if field_desc.name == "Unknown_Headers":
                    continue
                known_headers.add(field_desc.name)
            unknown_headers = {}
            props = {}
            for key in headers:
                value = headers[key]
                if isinstance(value, str):
                    name = key.replace("-", "_")
                    if name in known_headers:
                        props[name] = value.encode("utf-8")
                    else:
                        unknown_headers[key.encode("utf-8")] = value.encode("utf-8")
            if unknown_headers:
                props["Unknown_Headers"] = unknown_headers
            return props

        if isinstance(layer, HTTPRequest):
            http_header = HTTPRequest(
                **build_http_header_props(
                    layer_data[0]["headers"], HTTPRequest.fields_desc
                )
            )
            if layer_data[0]["body"] is not None:
                return http_header / Raw(load=bytes(layer_data[0]["body"]))
            else:
                return http_header
        if isinstance(layer, HTTPResponse):
            http_header = HTTPResponse(
                **build_http_header_props(
                    layer_data[0]["headers"], HTTPResponse.fields_desc
                )
            )
            if layer_data[0]["body"] is not None:
                return http_header / Raw(load=bytes(layer_data[0]["body"]))
            else:
                return http_header

        if isinstance(layer, Raw):
            load = layer_data[0]["load"]
            if load:
                load = bytes(load)
            else:
                load = b""
            if isinstance(layer, Padding):
                return Padding(load=load)
            return Raw(load=load)

        copied: Packet = layer.copy()
        copied.remove_payload()
        return copied

    copied_packet = copy_layer(packet, layers_data[0:])
    layers_data_len = len(layers_data)
    current = packet.payload
    index = 1
    while current:
        if index >= layers_data_len:
            copied_packet /= current
            break
        copied_packet /= copy_layer(current, layers_data[index:])
        if (
            isinstance(current, SCTPChunkData)
            or isinstance(current, HTTPRequest)
            or isinstance(current, HTTPResponse)
        ):  # special data pack
            break
        current = current.payload
        index += 1

    copied_packet.show()
    return copied_packet


def parse_packet(packet: Packet, layers: list):
    def get_address():
        return {
            "src": f"{getattr(packet, 'src', None)}",
            "dst": f"{getattr(packet, 'dst', None)}",
        }

    def get_port():
        return {
            "sport": getattr(packet, "sport", None),
            "dport": getattr(packet, "dport", None),
        }

    def get_http_header(field: dict):
        new_field = {**field}
        if "Unknown_Headers" in new_field:
            unknown_headers = new_field["Unknown_Headers"]
            del new_field["Unknown_Headers"]
            new_field = {**new_field, **unknown_headers}

        readable_field = {}
        for key in new_field:
            value = new_field[key]
            if isinstance(value, bytes):
                try:
                    readable_field[key.replace("_", "-")] = value.decode("utf-8")
                except KeyboardInterrupt as e:
                    raise e
                except:
                    continue
        return readable_field

    def get_http_body(payload):
        if isinstance(payload, Raw):
            return list(payload.load)
        return None

    # layer2
    if isinstance(packet, Ether):
        layers.append(
            {
                "name": "Ether",
                **get_address(),
            }
        )
    # layer3
    elif isinstance(packet, IP):
        layers.append(
            {
                "name": "IP",
                **get_address(),
            }
        )
    # layer4
    elif isinstance(packet, TCP):
        layers.append(
            {
                "name": "TCP",
                **get_port(),
            }
        )
    elif isinstance(packet, UDP):
        layers.append(
            {
                "name": "UDP",
                **get_port(),
            }
        )
    elif isinstance(packet, SCTP):
        layers.append(
            {
                "name": "SCTP",
                **get_port(),
            }
        )
    # layer5
    elif isinstance(packet, SCTPChunkData):
        layers.append(
            {
                "name": "SCTPChunkData",
                "reserved": packet.reserved,
                "delay_sack": packet.delay_sack,
                "unordered": packet.unordered,
                "beginning": packet.beginning,
                "ending": packet.ending,
                "tsn": packet.tsn,
                "stream_id": packet.stream_id,
                "stream_seq": packet.stream_seq,
                "proto_id": packet.proto_id,
            }
        )
        parse_sctp_chunk_data(packet, layers)
        return  # parse completed
    elif isinstance(packet, HTTPResponse):
        layers.append(
            {
                "name": "HTTPResponse",
                "headers": get_http_header(packet.fields),
                "body": get_http_body(packet.payload),
            }
        )
        return  # parse completed
    elif isinstance(packet, HTTPRequest):
        layers.append(
            {
                "name": "HTTPRequest",
                "headers": get_http_header(packet.fields),
                "body": get_http_body(packet.payload),
            }
        )
        return  # parse completed
    # other
    elif isinstance(packet, Raw):  # Raw or Padding
        layers.append({"name": f"{packet.name}", "load": list(packet.load)})
    else:
        layers.append({"name": f"{packet.name}"})

    if len(layers) >= 16:
        return

    payload = packet.payload
    if isinstance(payload, NoPayload):
        return  # parse completed

    parse_packet(payload, layers)


protocols_map = {
    18: "S1AP",
    19: "RUA",
    20: "HNBAP",
    24: "SBc-AP",
    25: "NBAP",
    26: "Unassigned",
    27: "X2AP",
    29: "LCS-AP",
    42: "RNA",
    43: "M2AP",
    44: "M3AP",
    55: "PUA",
    58: "XwAP",
    59: "Xw-Control Plane",
    60: "NGAP",
    61: "XnAP",
    62: "F1 AP",
    64: "E1AP",
    66: "DTLS(NGAP)",
    67: "DTLS(XnAP)",
    68: "DTLS(F1AP)",
    69: "DTLS(E1AP)",
    70: "E2-CP",
    71: "E2-UP",
    72: "E2-DU",
    73: "3GPP W1AP",
}  # https://www.iana.org/assignments/sctp-parameters/sctp-parameters.xhtml


def parse_sctp_chunk_data(packet: SCTPChunkData, layers: list):
    beginning = getattr(packet, "beginning", None)
    ending = getattr(packet, "ending", None)

    proto_id = getattr(packet, "proto_id", None)
    if proto_id == 60 and beginning and ending:  # NGAP
        # TODO: handle not a completed packet
        obj = {"name": "NGAP"}
        parse_pdu(NGAP_PDU, packet.data, obj)
        layers.append(obj)
    elif proto_id == 62 and beginning and ending:  # F1 AP
        # TODO: handle not a completed packet
        obj = {"name": "F1 AP"}
        parse_pdu(F1AP_PDU, packet.data, obj)
        layers.append(obj)
    else:
        if proto_id in protocols_map:
            layers.append(
                {"name": protocols_map[proto_id], "origin_data": list(packet.data)}
            )
        else:
            layers.append({"name": "Other", "origin_data": list(packet.data)})


def parse_pdu(pdu: CHOICE, data: bytes, obj):
    try:
        pdu.from_aper(data)
        json_obj_str = pdu.to_json()
        json_obj = json.loads(json_obj_str)
        obj["data"] = json_obj
    except KeyboardInterrupt as e:
        raise e
    except Exception as e:
        print(traceback.format_exc())
        obj["error"] = f"{e}"
        obj["origin_data"] = data.hex()
