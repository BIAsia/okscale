type Bucket = {
  r: number;
  g: number;
  b: number;
  count: number;
};

function toHexByte(value: number): string {
  var clamped = Math.max(0, Math.min(255, Math.round(value)));
  var hex = clamped.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + toHexByte(r) + toHexByte(g) + toHexByte(b);
}

function colorDistanceSquared(a: Bucket, b: Bucket): number {
  var dr = a.r - b.r;
  var dg = a.g - b.g;
  var db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var image = new Image();

    image.onload = function () {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image file.'));
    };

    image.src = url;
  });
}

function extractBuckets(imageData: ImageData): Bucket[] {
  var counts: Record<string, Bucket> = {};
  var data = imageData.data;
  var quantize = 24;

  for (var i = 0; i < data.length; i += 16) {
    var alpha = data[i + 3];
    if (alpha < 200) continue;

    var r = data[i];
    var g = data[i + 1];
    var b = data[i + 2];

    var qr = Math.round(r / quantize) * quantize;
    var qg = Math.round(g / quantize) * quantize;
    var qb = Math.round(b / quantize) * quantize;
    var key = qr + ',' + qg + ',' + qb;

    if (!counts[key]) {
      counts[key] = { r: qr, g: qg, b: qb, count: 0 };
    }
    counts[key].count += 1;
  }

  return Object.keys(counts)
    .map(function (key) {
      return counts[key];
    })
    .sort(function (left, right) {
      return right.count - left.count;
    });
}

export async function extractThemeFromImageFile(file: File, limit: number = 6): Promise<string[]> {
  var image = await loadImageFromFile(file);

  var maxSide = 180;
  var scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  var width = Math.max(1, Math.round(image.width * scale));
  var height = Math.max(1, Math.round(image.height * scale));

  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  var context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas not supported.');
  }

  context.drawImage(image, 0, 0, width, height);
  var imageData = context.getImageData(0, 0, width, height);
  var buckets = extractBuckets(imageData);

  var selected: Bucket[] = [];
  var minDistance = 900;

  for (var i = 0; i < buckets.length; i++) {
    var candidate = buckets[i];
    var tooClose = selected.some(function (existing) {
      return colorDistanceSquared(existing, candidate) < minDistance;
    });

    if (tooClose) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected.map(function (bucket) {
    return rgbToHex(bucket.r, bucket.g, bucket.b);
  });
}
