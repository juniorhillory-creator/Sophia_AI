import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import URLError

import pytest

from app.domain.errors import AppError
from app.infrastructure import ollama as ollama_module
from app.infrastructure.ollama import OllamaClient


class _Server:
    def __init__(self, respond) -> None:
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length)
                status, payload = respond(body)
                data = payload if isinstance(payload, bytes) else payload.encode()
                self.send_response(status)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                try:
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                    return

            def log_message(self, fmt: str, *args: Any) -> None:
                return

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}"

    def close(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()


def test_connection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    def unreachable(*_args: object, **_kwargs: object) -> None:
        raise URLError(ConnectionRefusedError(10061, "refused"))

    monkeypatch.setattr(ollama_module, "urlopen", unreachable)
    client = OllamaClient("http://127.0.0.1:11434", "llama3.2")
    with pytest.raises(AppError) as caught:
        client.complete([{"role": "user", "content": "hi"}], json_schema=None, timeout=2)
    assert caught.value.code == "model_unavailable"
    assert caught.value.status_code == 503
    assert caught.value.message == "Could not reach the local model."


def test_timeout() -> None:
    def respond(_body: bytes) -> tuple[int, str]:
        import time

        time.sleep(2)
        return 200, "{}"

    server = _Server(respond)
    try:
        client = OllamaClient(server.url, "llama3.2")
        with pytest.raises(AppError) as caught:
            client.complete([{"role": "user", "content": "hi"}], json_schema=None, timeout=0.2)
        assert caught.value.code == "model_timeout"
        assert caught.value.status_code == 504
    finally:
        threading.Thread(target=server.close, daemon=True).start()


def test_malformed_payload() -> None:
    server = _Server(lambda _body: (200, "not-json"))
    try:
        client = OllamaClient(server.url, "llama3.2")
        with pytest.raises(AppError) as caught:
            client.complete([{"role": "user", "content": "hi"}], json_schema=None, timeout=2)
        assert caught.value.code == "malformed_model_response"
        assert caught.value.status_code == 502
    finally:
        server.close()


def test_http_failure() -> None:
    server = _Server(lambda _body: (500, "{\"error\":\"missing\"}"))
    try:
        client = OllamaClient(server.url, "llama3.2")
        with pytest.raises(AppError) as caught:
            client.complete([{"role": "user", "content": "hi"}], json_schema=None, timeout=2)
        assert caught.value.code == "model_unavailable"
        assert caught.value.message == "The local model request failed."
    finally:
        server.close()


def test_posts_configured_model_and_schema() -> None:
    seen: dict[str, Any] = {}

    def respond(body: bytes) -> tuple[int, str]:
        seen["body"] = json.loads(body)
        return 200, json.dumps({"message": {"content": "{\"ok\": true}"}})

    server = _Server(respond)
    try:
        client = OllamaClient(server.url, "custom-model")
        text = client.complete(
            [{"role": "user", "content": "paper"}],
            json_schema={"type": "object"},
            timeout=2,
        )
        assert text == "{\"ok\": true}"
        assert seen["body"]["model"] == "custom-model"
        assert seen["body"]["stream"] is False
        assert seen["body"]["format"] == {"type": "object"}
        assert seen["body"]["messages"][0]["content"] == "paper"
    finally:
        server.close()
