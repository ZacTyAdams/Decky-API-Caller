import asyncio
import json
import os
import urllib.error
import urllib.request
import uuid
from urllib.parse import urlparse

import decky

ALLOWED_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")
REQUEST_TIMEOUT = 10


class Plugin:
    def _buttons_path(self) -> str:
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "buttons.json")

    def _load(self) -> list:
        try:
            with open(self._buttons_path(), "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, list) else []
        except (OSError, ValueError):
            return []

    def _save(self, buttons: list) -> None:
        os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
        with open(self._buttons_path(), "w", encoding="utf-8") as f:
            json.dump(buttons, f, indent=2)

    async def get_buttons(self) -> list:
        return self._load()

    async def add_button(self, name: str, url: str, method: str = "GET") -> dict:
        name = (name or "").strip()
        url = (url or "").strip()
        method = (method or "GET").upper()
        parsed = urlparse(url)
        if not name:
            return {"ok": False, "error": "Name is required"}
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return {"ok": False, "error": "URL must start with http:// or https://"}
        if method not in ALLOWED_METHODS:
            return {"ok": False, "error": "Unsupported method"}
        buttons = self._load()
        buttons.append({"id": uuid.uuid4().hex, "name": name, "url": url, "method": method})
        self._save(buttons)
        return {"ok": True, "buttons": buttons}

    async def delete_button(self, button_id: str) -> list:
        buttons = [b for b in self._load() if b.get("id") != button_id]
        self._save(buttons)
        return buttons

    def _request(self, url: str, method: str) -> dict:
        data = b"" if method in ("POST", "PUT", "PATCH") else None
        req = urllib.request.Request(url, data=data, method=method)
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return {"ok": True, "status": resp.status}
        except urllib.error.HTTPError as e:
            return {"ok": False, "status": e.code, "error": f"HTTP {e.code}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def call_api(self, button_id: str) -> dict:
        button = next((b for b in self._load() if b.get("id") == button_id), None)
        if button is None:
            return {"ok": False, "error": "Button not found"}
        result = await asyncio.get_running_loop().run_in_executor(
            None, self._request, button["url"], button["method"])
        decky.logger.info(f"Called {button['method']} {button['url']}: {result}")
        return result

    async def _main(self):
        decky.logger.info("Decky API Caller loaded")

    async def _unload(self):
        decky.logger.info("Decky API Caller unloaded")
