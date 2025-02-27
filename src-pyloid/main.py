from pyloid import Pyloid, is_production, get_production_path
import os
from api import custom

app = Pyloid(app_name="cellular-network-signaling-parsing-tool", single_instance=False)

###################`########### Tray ################################
# from pyloid import TrayEvent
# if (is_production()):
#     app.set_icon(os.path.join(get_production_path(), "icons/icon.png")) # type: ignore
#     app.set_tray_icon(os.path.join(get_production_path(), "icons/icon.png")) # type: ignore
# else:
#     app.set_icon("src-pyloid/icons/icon.png")
#     app.set_tray_icon("src-pyloid/icons/icon.png")


# def on_double_click():
#     print("Tray icon was double-clicked.")


# app.set_tray_actions(
#     {
#         TrayEvent.DoubleClick: on_double_click,
#     }
# )
# app.set_tray_menu_items(
#     [
#         {"label": "Show Window", "callback": app.show_and_focus_main_window},
#         {"label": "Exit", "callback": app.quit},
#     ]
# )
####################################################################


if is_production():
    # production
    window = app.create_window(
        title="Cellular Network Signaling Parsing Tool",
        js_apis=[custom(app)],
    )
    window.load_file(os.path.join(get_production_path(), "build/index.html"))  # type: ignore
else:
    window = app.create_window(
        title="Dev (Cellular Network Signaling Parsing Tool)",
        js_apis=[custom(app)],
        dev_tools=True,
    )
    window.load_url("http://localhost:5173")

window.show_and_focus()

app.run()  # run
