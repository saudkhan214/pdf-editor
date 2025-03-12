export function ggID() {
  let id = 0;
  return function genId() {
    return id++;
  };
}
export function timeout(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
export function calculateObjectPosition(objects, yAxis, pageWidth, text) {
  var samePositions = objects.filter((object) => object.y === yAxis);
  if (samePositions && samePositions.length > 0) {
    var maxXPosition = samePositions.reduce((prev, curr) =>
      curr.x > prev.x ? curr : prev
    );

    var accupiedWidth = getTextWidth([maxXPosition.text || ""], 0);
    var restSpace = pageWidth - maxXPosition.x - accupiedWidth;
    var textWidth = getTextWidth([text || ""], 0);
    if (textWidth < restSpace) {
      return { x: accupiedWidth + maxXPosition.x + 30, y: yAxis };
    } else {
      return calculateObjectPosition(objects, yAxis + 20, pageWidth, text);
      // return { x: 0, y: yAxis + 20 };
    }
  }

  return { x: 0, y: yAxis };
}
export const noop = () => {};
