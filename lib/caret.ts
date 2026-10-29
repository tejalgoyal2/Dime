// Where the text caret sits in an input, in client coordinates, so Dime can read along.
export function caretPoint(input: HTMLInputElement) {
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = input.type === "password" ? "•".repeat(input.value.length) : input.value.slice(0, input.selectionEnd ?? undefined);
  const w = ctx.measureText(text).width;
  return { x: Math.min(r.left + parseFloat(cs.paddingLeft) + w - input.scrollLeft, r.right - 12), y: r.top + r.height / 2 };
}
