/**
 * Every size a poster can be made in. Print sizes are in millimetres and get
 * rendered at a chosen dpi; screen and social sizes are in pixels. Any size
 * can be flipped between portrait and landscape, and "Custom" takes anything.
 */
const MM_PER_INCH = 25.4;
const inch = x => x * MM_PER_INCH;

export const categories = [
  {
    id: 'print', name: 'Print', unit: 'mm', screen: false,
    sizes: [
      ['a6', 'A6', 105, 148], ['a5', 'A5', 148, 210], ['a4', 'A4', 210, 297], ['a3', 'A3', 297, 420],
      ['a2', 'A2', 420, 594], ['a1', 'A1', 594, 841], ['a0', 'A0', 841, 1189],
      ['b3', 'B3', 353, 500], ['b2', 'B2', 500, 707], ['b1', 'B1', 707, 1000],
      ['letter', 'US Letter', inch(8.5), inch(11)], ['legal', 'US Legal', inch(8.5), inch(14)], ['tabloid', 'Tabloid 11 × 17″', inch(11), inch(17)],
      ['5x7', '5 × 7″', inch(5), inch(7)], ['8x10', '8 × 10″', inch(8), inch(10)], ['11x14', '11 × 14″', inch(11), inch(14)],
      ['12x16', '12 × 16″', inch(12), inch(16)], ['12x18', '12 × 18″', inch(12), inch(18)], ['16x20', '16 × 20″', inch(16), inch(20)],
      ['18x24', '18 × 24″', inch(18), inch(24)], ['20x30', '20 × 30″', inch(20), inch(30)], ['24x36', '24 × 36″', inch(24), inch(36)],
      ['27x40', 'Movie poster 27 × 40″', inch(27), inch(40)],
      ['30x40', '30 × 40 cm', 300, 400], ['40x50', '40 × 50 cm', 400, 500], ['50x70', '50 × 70 cm', 500, 700],
      ['60x90', '60 × 90 cm', 600, 900], ['70x100', '70 × 100 cm', 700, 1000],
      ['sq20', 'Square 20 cm', 200, 200], ['sq30', 'Square 30 cm', 300, 300], ['sq50', 'Square 50 cm', 500, 500],
    ]
  },
  {
    id: 'phone', name: 'Phone', unit: 'px', screen: true,
    sizes: [
      ['iphone', 'iPhone 15–17', 1179, 2556], ['iphone-max', 'iPhone Pro Max', 1320, 2868], ['iphone-se', 'iPhone SE', 750, 1334],
      ['pixel', 'Google Pixel', 1080, 2424], ['pixel-pro', 'Pixel Pro', 1344, 2992], ['galaxy', 'Samsung Galaxy S', 1080, 2340],
      ['galaxy-ultra', 'Galaxy S Ultra', 1440, 3120], ['android', 'Android 20:9', 1080, 2400], ['fold', 'Foldable (open)', 2176, 1812],
    ]
  },
  {
    id: 'tablet', name: 'Tablet', unit: 'px', screen: true,
    sizes: [
      ['ipad', 'iPad 11″', 1640, 2360], ['ipad-pro-11', 'iPad Pro 11″', 1668, 2420], ['ipad-pro-13', 'iPad Pro 13″', 2064, 2752],
      ['ipad-mini', 'iPad mini', 1488, 2266], ['galaxy-tab', 'Galaxy Tab S', 1600, 2560], ['surface', 'Surface Pro', 2880, 1920],
    ]
  },
  {
    id: 'desktop', name: 'Desktop', unit: 'px', screen: true,
    sizes: [
      ['hd', 'HD 1366 × 768', 1366, 768], ['fhd', 'Full HD 1080p', 1920, 1080], ['wuxga', '1920 × 1200 (16:10)', 1920, 1200],
      ['qhd', 'QHD 1440p', 2560, 1440], ['macbook-air', 'MacBook Air', 2560, 1664], ['macbook-pro-14', 'MacBook Pro 14″', 3024, 1964],
      ['macbook-pro-16', 'MacBook Pro 16″', 3456, 2234], ['4k', '4K UHD', 3840, 2160], ['imac', 'iMac 24″', 4480, 2520],
      ['5k', '5K', 5120, 2880], ['xdr', 'Pro Display XDR 6K', 6016, 3384], ['8k', '8K', 7680, 4320],
    ]
  },
  {
    id: 'ultrawide', name: 'Ultrawide', unit: 'px', screen: true,
    sizes: [
      ['uw-1080', '21:9 2560 × 1080', 2560, 1080], ['uw-1440', '21:9 3440 × 1440', 3440, 1440], ['uw-1600', '24:10 3840 × 1600', 3840, 1600],
      ['uw-5k2k', '5K2K 5120 × 2160', 5120, 2160], ['suw-1080', '32:9 3840 × 1080', 3840, 1080], ['suw-1440', '32:9 5120 × 1440', 5120, 1440],
      ['suw-2160', '32:9 7680 × 2160', 7680, 2160], ['triple', 'Triple 1080p', 5760, 1080],
    ]
  },
  {
    id: 'social', name: 'Social', unit: 'px', screen: false,
    sizes: [
      ['ig-square', 'Instagram square', 1080, 1080], ['ig-portrait', 'Instagram portrait 4:5', 1080, 1350],
      ['story', 'Story / Reel / TikTok', 1080, 1920], ['x-post', 'X post 16:9', 1600, 900], ['x-header', 'X header', 1500, 500],
      ['linkedin', 'LinkedIn banner', 1584, 396], ['facebook', 'Facebook cover', 1640, 624], ['youtube', 'YouTube banner', 2560, 1440],
      ['pinterest', 'Pinterest 2:3', 1000, 1500], ['discord', 'Discord banner', 960, 540],
    ]
  },
  {
    id: 'watch', name: 'Watch', unit: 'px', screen: true,
    sizes: [['watch-45', 'Apple Watch 45mm', 396, 484], ['watch-ultra', 'Apple Watch Ultra', 410, 502], ['galaxy-watch', 'Galaxy Watch', 480, 480]]
  },
  {id: 'custom', name: 'Custom', unit: 'custom', screen: false, sizes: []},
].map(category => ({
  ...category,
  sizes: category.sizes.map(([id, name, width, height]) => ({id, name, width, height}))
}));

export const customUnits = ['px', 'mm', 'cm', 'in'];

// Browsers refuse very large canvases (iOS Safari stops at ~16.7 megapixels),
// so we lower the resolution of very large prints rather than fail.
const MAX_PIXELS = 40e6;
const MAX_SIDE = 16000;

export const defaultOutput = {
  category: 'print',
  size: 'a3',
  flip: false, // swap width and height
  dpi: 300,
  custom: {width: 2400, height: 1200, unit: 'px'}
};

export function getCategory(id) {
  return categories.find(c => c.id === id) || categories[0];
}

/**
 * Resolves output settings into pixels, the physical size (for prints) and a
 * label. settings: {category, size, flip, dpi, custom: {width, height, unit}}
 */
export function getOutput(settings) {
  let category = getCategory(settings.category);
  let dpi = settings.dpi || 300;
  let width, height, physical = null, name;

  if (category.id === 'custom') {
    let {unit} = settings.custom;
    let w = Math.max(1, Number(settings.custom.width) || 1);
    let h = Math.max(1, Number(settings.custom.height) || 1);
    name = `${trim(w)} × ${trim(h)} ${unit}`;
    if (unit === 'px') {
      width = w;
      height = h;
    } else {
      let mm = unit === 'in' ? MM_PER_INCH : unit === 'cm' ? 10 : 1;
      physical = {width: w * mm, height: h * mm};
    }
  } else {
    let size = category.sizes.find(s => s.id === settings.size) || category.sizes[0];
    name = size.name;
    if (category.unit === 'mm') physical = {width: size.width, height: size.height};
    else {
      width = size.width;
      height = size.height;
    }
  }

  if (physical) {
    width = physical.width / MM_PER_INCH * dpi;
    height = physical.height / MM_PER_INCH * dpi;
  }
  if (settings.flip) {
    [width, height] = [height, width];
    if (physical) physical = {width: physical.height, height: physical.width};
  }
  width = Math.max(16, Math.round(width));
  height = Math.max(16, Math.round(height));

  let fit = limit(width, height);
  return {
    category: category.id,
    isScreen: category.screen,
    id: category.id === 'custom' ? 'custom' : settings.size,
    name,
    width: fit.width,
    height: fit.height,
    reduced: fit.reduced,
    dpi: physical ? Math.floor(dpi * fit.width / width) : null,
    physicalSize: physical ? {width: trim(physical.width) + 'mm', height: trim(physical.height) + 'mm'} : null,
    aspect: fit.height / fit.width,
    landscape: fit.width > fit.height
  };
}

function limit(width, height) {
  let k = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)), MAX_SIDE / Math.max(width, height));
  if (k >= 1) return {width, height, reduced: false};
  return {width: Math.floor(width * k), height: Math.floor(height * k), reduced: true};
}

function trim(x) {
  return Math.round(x * 10) / 10;
}
