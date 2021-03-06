const ALIGN_LOG2: usize = 3;
const ALIGN_SIZE: usize = 1 << ALIGN_LOG2;
const ALIGN_MASK: usize = ALIGN_SIZE - 1;

var HEAP_OFFSET: usize = HEAP_BASE; // HEAP_BASE is a constant generated by the compiler

export function allocate_memory(size: usize): usize {
  if (!size) return 0;
  var len: i32 = current_memory();
  if (HEAP_OFFSET + size > <usize>len << 16)
    if(grow_memory(max<i32>(<i32>ceil<f64>(<f64>size / 65536), len * 2 - len)) < 0)
      unreachable();
  var ptr: usize = HEAP_OFFSET;
  if ((HEAP_OFFSET += size) & ALIGN_MASK) // align next offset
    HEAP_OFFSET = (HEAP_OFFSET | ALIGN_MASK) + 1;
  return ptr;
}

export function free_memory(ptr: usize): void {
  // just a big chunk of non-disposable memory for now
}

function copy_memory(dest: usize, src: usize, n: usize): void {
  // based on musl's implementation of memcpy
  // not a future instruction and sufficiently covered by the upcoming move_memory intrinsic

  var w: u32, x: u32;

  // copy 1 byte each until src is aligned to 4 bytes
  while (n && src % 4) {
    store<u8>(dest++, load<u8>(src++));
    n--;
  }

  // if dst is aligned to 4 bytes as well, copy 4 bytes each
  if (dest % 4 == 0) {
    while (n >= 16) {
      store<u32>(dest     , load<u32>(src     ));
      store<u32>(dest +  4, load<u32>(src +  4));
      store<u32>(dest +  8, load<u32>(src +  8));
      store<u32>(dest + 12, load<u32>(src + 12));
      src += 16; dest += 16; n -= 16;
    }
    if (n & 8) {
      store<u32>(dest    , load<u32>(src    ));
      store<u32>(dest + 4, load<u32>(src + 4));
      dest += 8; src += 8;
    }
    if (n & 4) {
      store<u32>(dest, load<u32>(src));
      dest += 4; src += 4;
    }
    if (n & 2) { // drop to 2 bytes each
      store<u16>(dest, load<u16>(src));
      dest += 2; src += 2;
    }
    if (n & 1) { // drop to 1 byte
      store<u8>(dest++, load<u8>(src++));
    }
    return;
  }

  // if dst is not aligned to 4 bytes, use alternating shifts to copy 4 bytes each
  // doing shifts if faster when copying enough bytes (here: 32 or more)
  if (n >= 32) {
    switch (dest % 4) {
      // known to be != 0
      case 1:
        w = load<u32>(src);
        store<u8>(dest++, load<u8>(src++));
        store<u8>(dest++, load<u8>(src++));
        store<u8>(dest++, load<u8>(src++));
        n -= 3;
        while (n >= 17) {
          x = load<u32>(src + 1);
          store<u32>(dest, w >> 24 | x << 8);
          w = load<u32>(src + 5);
          store<u32>(dest + 4, x >> 24 | w << 8);
          x = load<u32>(src + 9);
          store<u32>(dest + 8, w >> 24 | x << 8);
          w = load<u32>(src + 13);
          store<u32>(dest + 12, x >> 24 | w << 8);
          src += 16; dest += 16; n -= 16;
        }
        break;
      case 2:
        w = load<u32>(src);
        store<u8>(dest++, load<u8>(src++));
        store<u8>(dest++, load<u8>(src++));
        n -= 2;
        while (n >= 18) {
          x = load<u32>(src + 2);
          store<u32>(dest, w >> 16 | x << 16);
          w = load<u32>(src + 6);
          store<u32>(dest + 4, x >> 16 | w << 16);
          x = load<u32>(src + 10);
          store<u32>(dest + 8, w >> 16 | x << 16);
          w = load<u32>(src + 14);
          store<u32>(dest + 12, x >> 16 | w << 16);
          src += 16; dest += 16; n -= 16;
        }
        break;
      case 3:
        w = load<u32>(src);
        store<u8>(dest++, load<u8>(src++));
        n -= 1;
        while (n >= 19) {
          x = load<u32>(src + 3);
          store<u32>(dest, w >> 8 | x << 24);
          w = load<u32>(src + 7);
          store<u32>(dest + 4, x >> 8 | w << 24);
          x = load<u32>(src + 11);
          store<u32>(dest + 8, w >> 8 | x << 24);
          w = load<u32>(src + 15);
          store<u32>(dest + 12, x >> 8 | w << 24);
          src += 16; dest += 16; n -= 16;
        }
        break;
    }
  }

  // copy remaining bytes one by one
  if (n & 16) {
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
  }
  if (n & 8) {
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
  }
  if (n & 4) {
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
  }
  if (n & 2) {
    store<u8>(dest++, load<u8>(src++));
    store<u8>(dest++, load<u8>(src++));
  }
  if (n & 1) {
    store<u8>(dest++, load<u8>(src++));
  }
}

export function move_memory(dest: usize, src: usize, n: usize): void {
  // based on musl's implementation of memmove
  // becomes obsolete once https://github.com/WebAssembly/bulk-memory-operations lands

  if (dest == src)
    return;
  if (src + n <= dest || dest + n <= src) {
    copy_memory(dest, src, n);
    return;
  }
  if (dest < src) {
    if (src % 8 == dest % 8) {
      while (dest % 8) {
        if (!n)
          return;
        --n;
        store<u8>(dest++, load<u8>(src++));
      }
      while (n >= 8) {
        store<u64>(dest, load<u64>(src));
        n -= 8;
        dest += 8;
        src += 8;
      }
    }
    while (n) {
      store<u8>(dest++, load<u8>(src++));
      --n;
    }
  } else {
    if (src % 8 == dest % 8) {
      while ((dest + n) % 8) {
        if (!n)
          return;
        store<u8>(dest + --n, load<u8>(src + n));
      }
      while (n >= 8) {
        n -= 8;
        store<u64>(dest + n, load<u64>(src + n));
      }
    }
    while (n) {
      store<u8>(dest + --n, load<u8>(src + n));
    }
  }
}

export function set_memory(dest: usize, c: u8, n: usize): void {
  // based on musl's implementation of memset
  // becomes obsolete once https://github.com/WebAssembly/bulk-memory-operations lands

  // fill head and tail with minimal branching
  if (!n)
    return;
  store<u8>(dest, c);
  store<u8>(dest + n - 1, c);
  if (n <= 2)
    return;

  store<u8>(dest + 1, c);
  store<u8>(dest + 2, c);
  store<u8>(dest + n - 2, c);
  store<u8>(dest + n - 3, c);
  if (n <= 6)
    return;
  store<u8>(dest + 3, c);
  store<u8>(dest + n - 4, c);
  if (n <= 8)
    return;

  // advance pointer to align it at 4-byte boundary
  var k: usize = -dest & 3;
  dest += k;
  n -= k;
  n &= -4;

  var c32: u32 = -1 / 255 * c;

  // fill head/tail up to 28 bytes each in preparation
  store<u32>(dest, c32);
  store<u32>(dest + n - 4, c32);
  if (n <= 8)
    return;
  store<u32>(dest + 4, c32);
  store<u32>(dest + 8, c32);
  store<u32>(dest + n - 12, c32);
  store<u32>(dest + n - 8, c32);
  if (n <= 24)
    return;
  store<u32>(dest + 12, c32);
  store<u32>(dest + 16, c32);
  store<u32>(dest + 20, c32);
  store<u32>(dest + 24, c32);
  store<u32>(dest + n - 28, c32);
  store<u32>(dest + n - 24, c32);
  store<u32>(dest + n - 20, c32);
  store<u32>(dest + n - 16, c32);

  // align to a multiple of 8
  k = 24 + (dest & 4);
  dest += k;
  n -= k;

  // copy 32 bytes each
  var c64: u64 = <u64>c32 | (<u64>c32 << 32);
  while (n >= 32) {
    store<u64>(dest, c64);
    store<u64>(dest + 8, c64);
    store<u64>(dest + 16, c64);
    store<u64>(dest + 24, c64);
    n -= 32;
    dest += 32;
  }
}

export function compare_memory(vl: usize, vr: usize, n: usize): i32 {
  // based on musl's implementation of memcmp
  // provided because there's no proposed alternative
  if (vl == vr)
    return 0;
  while (n && load<u8>(vl) == load<u8>(vr)) {
    n--;
    vl++;
    vr++;
  }
  return n ? <i32>load<u8>(vl) - <i32>load<u8>(vr) : 0;
}
