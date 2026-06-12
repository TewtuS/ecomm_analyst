"""
Vercel Services entrypoint for the FastAPI backend (experimentalServices.backend).

Prepares SQLite on serverless, then re-exports `app` with route-prefix stripping
so existing `/api/*` routes work when mounted at `/_/backend`.
"""
import os
import shutil
import sys
import tempfile
from urllib.parse import urlparse

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
os.chdir(_BACKEND_DIR)

if os.getenv("VERCEL"):
    db_src = os.path.join(_BACKEND_DIR, "ecommerce.db")
    db_tmp = os.path.join(tempfile.gettempdir(), "ecommerce.db")
    if os.path.isfile(db_src):
        if not os.path.isfile(db_tmp) or os.path.getmtime(db_src) > os.path.getmtime(db_tmp):
            shutil.copy2(db_src, db_tmp)
        os.environ["DATABASE_URL"] = f"sqlite:///{db_tmp}"


def _service_route_prefix() -> str:
    raw = (os.getenv("NEXT_PUBLIC_BACKEND_URL") or os.getenv("BACKEND_URL") or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return urlparse(raw).path.rstrip("/")
    if raw.startswith("/"):
        return raw.rstrip("/")
    return ""


_prefix = _service_route_prefix()
from app.main import app as _fastapi_app  # noqa: E402

if _prefix:

    class _StripPrefix:
        def __init__(self, inner, prefix: str):
            self.inner = inner
            self.prefix = prefix.rstrip("/")

        async def __call__(self, scope, receive, send):
            if scope["type"] == "http":
                path = scope.get("path", "")
                if path == self.prefix or path.startswith(self.prefix + "/"):
                    scope = dict(scope)
                    scope["path"] = path[len(self.prefix) :] or "/"
            await self.inner(scope, receive, send)

    app = _StripPrefix(_fastapi_app, _prefix)
else:
    app = _fastapi_app
