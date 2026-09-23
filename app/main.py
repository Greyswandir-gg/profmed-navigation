from __future__ import annotations

import asyncio
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

EKB = ZoneInfo("Asia/Yekaterinburg")
SITE_ROOT = Path(os.environ.get("SITE_ROOT", "/app/site"))
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
VISITS_FILE = DATA_DIR / "visits.jsonl"
SURVEYS_FILE = DATA_DIR / "surveys.jsonl"
STATE_FILE = DATA_DIR / "state.json"
BOT_UA = re.compile(r"bot|crawler|spider|preview|scan|httpie|curl|wget", re.I)
TAG = "[ПрофМед]"
PEAK_START = 8
PEAK_END = 14
SURVEY_WINDOW = 10 * 60
SURVEY_MAX = 4

_survey_hits: dict[str, list[float]] = {}


def load_env_file() -> None:
    for env_path in (Path("/app/.env"), Path("/opt/profmed-navigation/.env")):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        break


load_env_file()
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ПрофМед навигация")
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


def now_ekb() -> datetime:
    return datetime.now(EKB)


def telegram_token() -> str:
    return (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()


def read_chat_id() -> str:
    return (os.environ.get("TELEGRAM_CHAT_ID") or "").strip()


def telegram_api_base() -> str:
    return (os.environ.get("TELEGRAM_API_BASE") or "https://api.telegram.org").strip().rstrip("/")


def telegram_api(method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    token = telegram_token()
    if not token:
        return {}
    url = f"{telegram_api_base()}/bot{token}/{method}"
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method="POST" if data else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            parsed = json.loads(resp.read().decode("utf-8"))
        return parsed if isinstance(parsed, dict) else {}
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return {}


def send_telegram(text: str) -> bool:
    chat_id = read_chat_id()
    if not telegram_token() or not chat_id:
        return False
    if not text.startswith(TAG):
        text = f"{TAG} {text}"
    result = telegram_api("sendMessage", {"chat_id": chat_id, "text": text, "disable_web_page_preview": True})
    return bool(result.get("ok"))


def read_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    try:
        raw = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return raw if isinstance(raw, dict) else {}


def write_state(state: dict[str, Any]) -> None:
    tmp = STATE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(STATE_FILE)


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_bot(request: Request) -> bool:
    ua = request.headers.get("user-agent") or ""
    return not ua or bool(BOT_UA.search(ua))


def load_visits_for(day: str) -> list[dict[str, Any]]:
    if not VISITS_FILE.exists():
        return []
    rows: list[dict[str, Any]] = []
    with VISITS_FILE.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict) and item.get("day") == day:
                rows.append(item)
    return rows


def summarize(day: str, until_hour: int | None = None) -> dict[str, Any]:
    rows = load_visits_for(day)
    if until_hour is not None:
        rows = [row for row in rows if int(row.get("hour") or 0) < until_hour]

    def unique(items: list[dict[str, Any]]) -> int:
        return len({str(row.get("visitor") or "") for row in items if row.get("visitor")})

    peak = [row for row in rows if PEAK_START <= int(row.get("hour") or 0) < PEAK_END]
    before = [row for row in rows if int(row.get("hour") or 0) < PEAK_START]
    hourly = []
    for hour in range(PEAK_START, PEAK_END):
        bucket = [row for row in peak if int(row.get("hour") or 0) == hour]
        hourly.append({"hour": hour, "views": len(bucket), "unique": unique(bucket)})
    return {
        "day": day,
        "total_views": len(rows),
        "total_unique": unique(rows),
        "peak_views": len(peak),
        "peak_unique": unique(peak),
        "before_views": len(before),
        "before_unique": unique(before),
        "hourly": hourly,
    }


def format_report(stats: dict[str, Any]) -> str:
    day = datetime.strptime(str(stats["day"]), "%Y-%m-%d").strftime("%d.%m.%Y")
    lines = [
        f"{TAG} Статистика посещений",
        f"Сайт: profmed.crimsonblomhost.ru",
        f"Дата: {day}",
        "",
        f"С 8:00 до 14:00: {stats['peak_unique']} чел., {stats['peak_views']} открытий",
    ]
    for item in stats["hourly"]:
        lines.append(f"  {item['hour']:02d}:00 — {item['unique']} чел. / {item['views']} откр.")
    lines.extend(
        [
            "",
            f"До 8:00: {stats['before_unique']} чел., {stats['before_views']} открытий",
            f"Всего к 14:00: {stats['total_unique']} чел., {stats['total_views']} открытий",
        ]
    )
    return "\n".join(lines)


def maybe_send_daily_report() -> None:
    now = now_ekb()
    if now.hour < PEAK_END:
        return
    day = now.strftime("%Y-%m-%d")
    state = read_state()
    if state.get("last_report_day") == day:
        return
    stats = summarize(day, until_hour=PEAK_END)
    if now.hour > PEAK_END and stats["total_views"] == 0:
        state["last_report_day"] = day
        write_state(state)
        return
    if send_telegram(format_report(stats)):
        state["last_report_day"] = day
        state["last_report_at"] = now.isoformat()
        write_state(state)


async def report_loop() -> None:
    await asyncio.sleep(5)
    while True:
        try:
            maybe_send_daily_report()
        except Exception:
            pass
        await asyncio.sleep(30)


@app.on_event("startup")
async def startup() -> None:
    state = read_state()
    if not state.get("hello_sent"):
        if send_telegram(
            "Уведомления с сайта навигации подключены.\n"
            "Статистика посещений — каждый день после 14:00 по Екатеринбургу.\n"
            "Ответы на опрос приходят сразу."
        ):
            state["hello_sent"] = True
            write_state(state)
    asyncio.create_task(report_loop())


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "bot": bool(telegram_token() and read_chat_id())}


@app.post("/api/visit")
def visit(request: Request, response: Response) -> dict[str, str]:
    if is_bot(request):
        return {"ok": "skipped"}
    visitor = (request.cookies.get("profmed_vid") or "").strip()
    if not re.fullmatch(r"[a-f0-9]{32}", visitor or ""):
        visitor = uuid.uuid4().hex
        response.set_cookie(
            "profmed_vid",
            visitor,
            max_age=60 * 60 * 24 * 400,
            httponly=True,
            samesite="lax",
            secure=True,
            path="/",
        )
    now = now_ekb()
    append_jsonl(
        VISITS_FILE,
        {
            "ts": now.isoformat(),
            "day": now.strftime("%Y-%m-%d"),
            "hour": now.hour,
            "visitor": visitor,
        },
    )
    return {"ok": "true"}


def check_survey_rate(ip: str) -> None:
    now = time.time()
    stamps = [t for t in _survey_hits.get(ip, []) if now - t < SURVEY_WINDOW]
    if len(stamps) >= SURVEY_MAX:
        raise HTTPException(status_code=429, detail="Слишком много отправок. Подождите немного.")
    stamps.append(now)
    _survey_hits[ip] = stamps


@app.post("/api/survey")
async def survey(request: Request) -> dict[str, str]:
    if is_bot(request):
        raise HTTPException(status_code=400, detail="Не удалось отправить")
    try:
        body = await request.json()
    except Exception:
        body = {}
    try:
        age = int(body.get("age"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Укажите возраст числом")
    try:
        score = int(body.get("score"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Оцените помощь сайта от 1 до 10")
    comment = re.sub(r"\s+", " ", str(body.get("comment") or "")).strip()
    if age < 10 or age > 120:
        raise HTTPException(status_code=400, detail="Проверьте возраст")
    if score < 1 or score > 10:
        raise HTTPException(status_code=400, detail="Оценка должна быть от 1 до 10")
    if len(comment) > 2000:
        raise HTTPException(status_code=400, detail="Комментарий слишком длинный")
    check_survey_rate(client_ip(request))
    now = now_ekb()
    row = {
        "ts": now.isoformat(),
        "age": age,
        "score": score,
        "comment": comment,
    }
    append_jsonl(SURVEYS_FILE, row)
    lines = [
        f"{TAG} Ответ на опрос",
        "Сайт: profmed.crimsonblomhost.ru",
        f"Возраст: {age}",
        f"Насколько помог сайт: {score}/10",
        f"Что улучшить: {comment or '—'}",
    ]
    if not send_telegram("\n".join(lines)):
        raise HTTPException(status_code=502, detail="Не удалось отправить ответ")
    return {"ok": "true"}


if SITE_ROOT.exists():
    app.mount("/", StaticFiles(directory=str(SITE_ROOT), html=True), name="site")
