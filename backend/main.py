"""
Vercel Services entrypoint for the FastAPI backend (experimentalServices.backend).

Prepares SQLite on serverless, auto-seeds demo data when empty, then re-exports `app`.
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


def _ensure_demo_data() -> None:
    """On Vercel (or AUTO_SEED=1), seed CSV demo data if the DB has no users."""
    if os.getenv("SKIP_AUTO_SEED", "").lower() in ("1", "true", "yes"):
        return
    on_vercel = bool(os.getenv("VERCEL"))
    auto_seed = os.getenv("AUTO_SEED", "").lower() in ("1", "true", "yes")
    if not on_vercel and not auto_seed:
        return

    from app.seed_data import database_has_users, seed_database

    if database_has_users():
        return

    seed_database(wipe=False)


from app.main import app  # noqa: E402

_ensure_demo_data()

_prefix = _service_route_prefix()
if _prefix:

    @app.middleware("http")
    async def _strip_service_prefix(request, call_next):
        path = request.scope.get("path", "")
        if path == _prefix or path.startswith(_prefix + "/"):
            request.scope["path"] = path[len(_prefix) :] or "/"
        return await call_next(request)
