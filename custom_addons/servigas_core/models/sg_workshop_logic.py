"""Workshop appliance + work order helpers (pure)."""


def normalize_serial(raw: str | None) -> str:
    if not raw:
        return ""
    return "".join(str(raw).split()).upper()
