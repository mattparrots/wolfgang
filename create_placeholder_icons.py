#!/usr/bin/env python3
"""Create minimal placeholder PNG icons without PIL"""

import struct
import zlib

def create_png(width, height, filename):
    """Create a simple solid color PNG file"""

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = create_chunk(b'IHDR', ihdr_data)

    # Create pixel data (RGB, solid color #2c3e50)
    r, g, b = 0x2c, 0x3e, 0x50

    # Each row starts with a filter byte (0 = no filter)
    row = bytes([0] + [r, g, b] * width)
    pixel_data = row * height

    # Compress pixel data
    compressed = zlib.compress(pixel_data, 9)
    idat_chunk = create_chunk(b'IDAT', compressed)

    # IEND chunk (image trailer)
    iend_chunk = create_chunk(b'IEND', b'')

    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(png_signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

    print(f"Created {filename} ({width}x{height})")

def create_chunk(chunk_type, data):
    """Create a PNG chunk with CRC"""
    length = struct.pack('>I', len(data))
    crc = zlib.crc32(chunk_type + data) & 0xffffffff
    crc_bytes = struct.pack('>I', crc)
    return length + chunk_type + data + crc_bytes

if __name__ == '__main__':
    create_png(192, 192, 'icon-192.png')
    create_png(512, 512, 'icon-512.png')
    print("Placeholder icons created successfully!")
    print("Note: These are solid color placeholders. Use generate-icons.html to create proper icons.")
