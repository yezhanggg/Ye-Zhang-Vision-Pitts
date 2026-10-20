"""Read single members out of a large zip on a web server without downloading the whole file.

The server has to allow partial downloads (HTTP Range). Only the zip's index (at the end of the file) and the members
asked for are transferred. Standard library only, so the Colab notebook can embed this file as it is.
"""
from __future__ import annotations

import http.client
import io
import socket
import ssl
import struct
import zipfile
import zlib
from pathlib import Path
from urllib.parse import urlsplit

UA = {"User-Agent": "Mozilla/5.0 (visionpitts shadow build)"}
INDEX_BYTES = 6_000_000   # how much of the file's end is read to find the index
CHUNK = 8 << 20


def _open(url: str, method: str, headers: dict, timeout: int):
    """One request over IPv4. Some networks have a dead IPv6 route to data servers, which costs over a minute per request."""
    u = urlsplit(url)
    port = u.port or 443
    try:
        addr = socket.getaddrinfo(u.hostname, port, socket.AF_INET, socket.SOCK_STREAM)[0][4]
    except socket.gaierror:
        addr = (u.hostname, port)
    conn = http.client.HTTPSConnection(u.hostname, port, timeout=timeout)
    conn.sock = ssl.create_default_context().wrap_socket(socket.create_connection(addr[:2], timeout=timeout), server_hostname=u.hostname)
    conn.request(method, u.path + (f"?{u.query}" if u.query else ""), headers={**UA, **headers})
    return conn.getresponse()


def _get(url: str, start: int, end: int, timeout: int = 300):
    """Open bytes start..end (inclusive) of the file."""
    resp = _open(url, "GET", {"Range": f"bytes={start}-{end}"}, timeout)
    if resp.status != 206:
        raise OSError(f"the server ignored the Range request (status {resp.status})")
    return resp


def size_of(url: str) -> int:
    with _open(url, "HEAD", {}, 60) as resp:
        return int(resp.headers["Content-Length"])


class _Tail(io.RawIOBase):
    """A read-only view of a file of which only the last bytes are in memory; enough for zipfile to list members."""

    def __init__(self, size: int, tail: bytes):
        self.size, self.tail, self.base, self.pos = size, tail, size - len(tail), 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else (self.pos + offset if whence == 1 else self.size + offset)
        return self.pos

    def read(self, n=-1):
        if n < 0:
            n = self.size - self.pos
        if self.pos < self.base:
            raise OSError("the zip index is larger than the part that was read; raise INDEX_BYTES")
        out = self.tail[self.pos - self.base : self.pos - self.base + n]
        self.pos += len(out)
        return out

    def readinto(self, b):
        data = self.read(len(b))
        b[: len(data)] = data
        return len(data)


def index(url: str) -> dict[str, zipfile.ZipInfo]:
    """Member name → zip entry, read from the end of the remote file."""
    size = size_of(url)
    n = min(size, INDEX_BYTES)
    with _get(url, size - n, size - 1) as resp:
        tail = resp.read()
    return {i.filename: i for i in zipfile.ZipFile(_Tail(size, tail)).infolist() if not i.is_dir()}


def fetch(url: str, info: zipfile.ZipInfo, dest: Path) -> int:
    """Download one member to dest (skipped when a file of the right size is already there). Returns its size."""
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size == info.file_size:
        return info.file_size
    if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
        raise OSError(f"{info.filename}: unsupported zip compression {info.compress_type}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    # The local header repeats the name and has its own extra field, so its length is read first.
    with _get(url, info.header_offset, info.header_offset + 29) as resp:
        head = resp.read()
    name_len, extra_len = struct.unpack("<HH", head[26:30])
    start = info.header_offset + 30 + name_len + extra_len
    tmp = dest.with_suffix(dest.suffix + ".part")
    written = 0
    if info.compress_size:
        unzip = zlib.decompressobj(-15) if info.compress_type == zipfile.ZIP_DEFLATED else None
        with _get(url, start, start + info.compress_size - 1, timeout=600) as resp, open(tmp, "wb") as out:
            while True:
                block = resp.read(CHUNK)
                if not block:
                    break
                data = unzip.decompress(block) if unzip else block
                out.write(data)
                written += len(data)
            if unzip:
                data = unzip.flush()
                out.write(data)
                written += len(data)
    else:
        tmp.write_bytes(b"")
    if written != info.file_size:
        tmp.unlink(missing_ok=True)
        raise OSError(f"{info.filename}: got {written:,} bytes, expected {info.file_size:,}")
    tmp.replace(dest)
    return written
