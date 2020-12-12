/**
 * Returns the price of a given frame configuration in euro cents.
 *
 * @param printSize {'S'|'M'|'L'} The size of the print.
 * @param frameStyle {'classic'|'natural'|'shabby'|'elegant'} The type of frame, as a string.
 * @param frameWidth {number} The width of the frame, in millimeters.
 * @param matWidth {number} The width of the mat, in millimeters.
 */
function calculatePrice(printSize, frameStyle, frameWidth, matWidth) {
  const sizeMultiplier = {
    'S': 1,
    'M': 2,
    'L': 3.5
  };

  const frameCost = {
    'classic': 1,
    'natural': 0.8,
    'shabby': 0.9,
    'elegant': 0.85,
  };

  const price = (30 + frameCost[frameStyle] * (frameWidth / 10) + 0.05 * (matWidth / 10)) * sizeMultiplier[printSize];
  return Math.round((price + Number.EPSILON) * 100);
}

module.exports = { calculatePrice }
