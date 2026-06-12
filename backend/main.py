"""
Vercel Services entrypoint for the FastAPI backend (experimentalServices.backend).

Prepares SQLite on serverless, then re-exports `app` (FastAPI instance required by
Vercel's Python runtime). Route-prefix stripping uses middleware when mounted at /_/backend.
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


from app.main import app  # noqa: E402

_prefix = _service_route_prefix()
if _prefix:

    @app.middleware("http")
    async def _strip_service_prefix(request, call_next):
        path = request.scope.get("path", "")
        if path == _prefix or path.startswith(_prefix + "/"):
            request.scope["path"] = path[len(_prefix) :] or "/"
        return await call_next(request)
