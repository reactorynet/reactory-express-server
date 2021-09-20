

export const contrastingColor = (color) => {
  return (luma(color) >= 165) ? '#000000' : '#ffffff';
}

export const luma = (color) => // color can be a hx string or an array of RGB values 0-255
{
  var rgb = [];
  if (typeof color === 'string') {
    if (color.indexOf("#") === 0) {
      rgb = hexToRGBArray(color.substring(1, color.length));
    } else {
      rgb = hexToRGBArray(color);
    }
  }
  else rgb = color;
  return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]); // SMPTE C, Rec. 709 weightings
}

const hexToRGBArray = (color) => {
  if (color.length === 3)
    color = color.charAt(0) + color.charAt(0) + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2);
  else if (color.length !== 6)
    throw ('Invalid hex color: ' + color);
  var rgb = [];
  for (var i = 0; i <= 2; i++)
    rgb[i] = parseInt(color.substr(i * 2, 2), 16);
  return rgb;
}



// eslint-disable-next-line import/prefer-default-export
export const hex2RGBA = (hex, alpha = 1) => {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = `0x${c.join('')}`;
    return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
  }
  throw new Error('Bad Hex');
};

export default {
  hex2RGBA,
};

