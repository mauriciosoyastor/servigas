"""Fetchers de imágenes de producto desde fuentes web públicas."""

from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "cache"
USER_AGENT = "ServigasImport/1.0 (+https://github.com/mauriciosoyastor/servigas)"


@dataclass
class FotoEncontrada:
    url: str
    fuente: str
    confianza: float = 1.0
    detalle: str = ""


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^A-Z0-9 ]", " ", text.upper())
    return " ".join(text.split())


def token_set(value: str) -> set[str]:
    stop = {
        "DE", "LA", "EL", "LOS", "LAS", "PARA", "CON", "Y", "X", "UN", "UNA",
        "REPUESTO", "REP", "MOD", "MODELO", "ORIGINAL", "NETO", "UNIDADES",
    }
    return {t for t in normalize_text(value).split() if len(t) > 2 and t not in stop}


def jaccard(a: str, b: str) -> float:
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


class HttpClient:
    def __init__(self, delay_s: float = 0.15):
        self.delay_s = delay_s

    def get_json(self, url: str, timeout: int = 30):
        time.sleep(self.delay_s)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)

    def get_text(self, url: str, timeout: int = 30) -> str:
        time.sleep(self.delay_s)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")

    def download(self, url: str, dest: Path, timeout: int = 60) -> None:
        time.sleep(self.delay_s)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dest.write_bytes(resp.read())


class CarrSurFetcher:
    """Catálogo WooCommerce de Carr-Sur (cubre Orbis y códigos numéricos)."""

    BASE = "https://carrsur.com"
    CACHE_FILE = CACHE_DIR / "carr_sur_index.json"
    CACHE_TTL = timedelta(days=7)

    def __init__(self, http: HttpClient, refresh: bool = False):
        self.http = http
        self.index: dict[str, str | None] = {}
        self._load_or_build(refresh)

    def _load_or_build(self, refresh: bool) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        if not refresh and self.CACHE_FILE.is_file():
            payload = json.loads(self.CACHE_FILE.read_text(encoding="utf-8"))
            updated = datetime.fromisoformat(payload["updated_at"])
            if datetime.now(timezone.utc) - updated < self.CACHE_TTL:
                self.index = payload["skus"]
                return

        self.index = {}
        page = 1
        while True:
            url = f"{self.BASE}/wp-json/wc/store/products?per_page=100&page={page}"
            try:
                batch = self.http.get_json(url)
            except urllib.error.HTTPError:
                break
            if not batch:
                break
            for product in batch:
                sku = (product.get("sku") or "").strip()
                if not sku:
                    continue
                images = product.get("images") or []
                image_url = images[0]["src"] if images else None
                if image_url:
                    self.index[sku] = image_url
                else:
                    self.index.setdefault(sku, None)
            page += 1

        payload = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "skus": self.index,
        }
        self.CACHE_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def lookup(self, code: str) -> FotoEncontrada | None:
        sku = code.strip().zfill(7)
        url = self.index.get(sku)
        if url:
            return FotoEncontrada(url=url, fuente="carrsur", confianza=1.0, detalle=f"sku={sku}")

        # Fallback: patrón directo de imagen en CDN Carr-Sur
        guess = f"{self.BASE}/wp-content/uploads/2026/07/{sku}.jpg"
        try:
            req = urllib.request.Request(guess, method="HEAD", headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    return FotoEncontrada(
                        url=guess, fuente="carrsur-guess", confianza=0.9, detalle=f"sku={sku}"
                    )
        except urllib.error.HTTPError:
            pass
        return None


class CasaVelmenFetcher:
    """Índice de Casa Velmen por código de catálogo y descripción."""

    CACHE_FILE = CACHE_DIR / "casa_velmen_index.json"
    CACHE_TTL = timedelta(days=7)

    LIST_URLS = [
        "https://www.casavelmen.com/productos/cat/2718/repuestos-eskabe-legitimos",
        "https://www.casavelmen.com/productos/mar/16/eskabe",
        "https://www.casavelmen.com/productos/cat/2709/repuestos-brogas",
        "https://www.casavelmen.com/productos/cat/2717/repuestos-de-calefones-orbis-y-varios",
        "https://www.casavelmen.com/productos/mar/22/longvie",
        "https://www.casavelmen.com/productos/mar/3/brogas",
    ]

    ITEM_RE = re.compile(
        r'data-codigo="([^"]+)"\s+data-img="([^"]+)"\s+data-nombre="([^"]+)"',
        re.IGNORECASE,
    )

    def __init__(self, http: HttpClient, refresh: bool = False):
        self.http = http
        self.by_code: dict[str, str] = {}
        self.by_name: list[tuple[str, str]] = []
        self._load_or_build(refresh)

    def _parse_page(self, html: str) -> None:
        for code, img, name in self.ITEM_RE.findall(html):
            if "no-photo" in img:
                continue
            if not img.startswith("http"):
                img = f"https://www.casavelmen.com/{img.lstrip('/')}"
            self.by_code[code.upper()] = img
            self.by_name.append((name, img))

    def _load_or_build(self, refresh: bool) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        if not refresh and self.CACHE_FILE.is_file():
            payload = json.loads(self.CACHE_FILE.read_text(encoding="utf-8"))
            updated = datetime.fromisoformat(payload["updated_at"])
            if datetime.now(timezone.utc) - updated < self.CACHE_TTL:
                self.by_code = {k.upper(): v for k, v in payload["by_code"].items()}
                self.by_name = payload["by_name"]
                return

        self.by_code = {}
        self.by_name = []
        for base_url in self.LIST_URLS:
            for page in range(1, 12):
                url = base_url if page == 1 else f"{base_url}?page={page}"
                try:
                    html = self.http.get_text(url)
                except urllib.error.HTTPError:
                    break
                before = len(self.by_code)
                self._parse_page(html)
                if len(self.by_code) == before:
                    break

        payload = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "by_code": self.by_code,
            "by_name": self.by_name,
        }
        self.CACHE_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def lookup(self, code: str, descripcion: str, min_score: float = 0.38) -> FotoEncontrada | None:
        direct = self.by_code.get(code.upper())
        if direct:
            return FotoEncontrada(
                url=direct, fuente="casavelmen-codigo", confianza=1.0, detalle=code
            )

        best_score = 0.0
        best_url = ""
        best_name = ""
        for name, url in self.by_name:
            score = jaccard(descripcion, name)
            if score > best_score:
                best_score, best_url, best_name = score, url, name

        if best_score >= min_score:
            return FotoEncontrada(
                url=best_url,
                fuente="casavelmen-descripcion",
                confianza=best_score,
                detalle=best_name[:120],
            )
        return None


class LongvieStoreFetcher:
    """Búsqueda en longviestore.com (Shopify) por palabras clave de la descripción."""

    BASE = "https://www.longviestore.com"

    def __init__(self, http: HttpClient):
        self.http = http

    def lookup(self, code: str, descripcion: str) -> FotoEncontrada | None:
        query = code if code.upper().startswith("SD") else " ".join(list(token_set(descripcion))[:5])
        if not query:
            return None
        url = f"{self.BASE}/search/suggest.json?q={urllib.parse.quote(query)}&resources[type]=product&resources[limit]=5"
        try:
            data = self.http.get_json(url)
        except urllib.error.HTTPError:
            return None

        products = (
            data.get("resources", {})
            .get("results", {})
            .get("products", [])
        )
        best_score = 0.0
        best: dict | None = None
        for product in products:
            title = product.get("title") or ""
            score = max(jaccard(descripcion, title), jaccard(code, title))
            if score > best_score:
                best_score, best = score, product

        if not best or best_score < 0.25:
            return None

        handle = best.get("handle")
        if not handle:
            return None

        product_url = f"{self.BASE}/products/{handle}.json"
        try:
            detail = self.http.get_json(product_url)
        except urllib.error.HTTPError:
            return None

        images = detail.get("product", {}).get("images") or []
        if not images:
            return None

        return FotoEncontrada(
            url=images[0]["src"],
            fuente="longviestore",
            confianza=best_score,
            detalle=best.get("title", "")[:120],
        )


class FotoFetcherRouter:
    """Enruta la búsqueda según marca_prioridad."""

    def __init__(self, http: HttpClient, refresh_index: bool = False):
        self.carr_sur = CarrSurFetcher(http, refresh=refresh_index)
        self.casa_velmen = CasaVelmenFetcher(http, refresh=refresh_index)
        self.longvie_store = LongvieStoreFetcher(http)

    def buscar(self, marca_prioridad: str, code: str, descripcion: str) -> FotoEncontrada | None:
        marca = marca_prioridad.strip()

        if marca in {"Orbis", "Fercor"} or code.isdigit():
            found = self.carr_sur.lookup(code)
            if found:
                return found

        if marca in {"Eskabe", "Brogas", "Orbis", "Fercor"}:
            found = self.casa_velmen.lookup(code, descripcion)
            if found and found.confianza >= 0.38:
                return found

        if marca == "Longvie":
            found = self.longvie_store.lookup(code, descripcion)
            if found:
                return found
            return self.casa_velmen.lookup(code, descripcion, min_score=0.42)

        if marca == "Eskabe":
            return self.casa_velmen.lookup(code, descripcion, min_score=0.42)

        if marca == "Brogas":
            return self.casa_velmen.lookup(code, descripcion, min_score=0.42)

        return None
