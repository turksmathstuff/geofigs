const SVG_NS = "http://www.w3.org/2000/svg";
const EXPORT_FONT_FAMILY = '"Times New Roman", Times, serif';
const SCRIPT_SCALE = 0.6;

let measureCanvas = null;

function getMeasureContext() {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  return measureCanvas.getContext("2d");
}

function measureText(text, size, style = "normal", family = EXPORT_FONT_FAMILY) {
  const ctx = getMeasureContext();
  if (!ctx) {
    const width = text.length * size * 0.6;
    return { width, ascent: size * 0.75, descent: size * 0.25 };
  }
  ctx.font = `${style} ${size}px ${family}`;
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || size * 0.75;
  const descent = metrics.actualBoundingBoxDescent || size * 0.25;
  return {
    width: metrics.width,
    ascent,
    descent,
  };
}

function normalizeLabelText(text) {
  return String(text ?? "")
    .replace(/<sup>\s*o\s*<\/sup>/gi, "°")
    .replace(/\^\(o\)/g, "°")
    .replace(/\^o\b/g, "°");
}

function isMathLike(text) {
  const value = normalizeLabelText(text).trim();
  if (!value) {
    return false;
  }
  return (
    value.includes("sqrt(") ||
    value.includes("^") ||
    value.includes("_") ||
    value.includes("°") ||
    /[+\-=]/.test(value) ||
    /^[a-z]$/.test(value)
  );
}

function splitTextRun(text, mathMode) {
  const out = [];
  let buffer = "";
  let italic = null;
  const push = () => {
    if (!buffer) return;
    out.push({ type: "text", value: buffer, italic: !!italic });
    buffer = "";
  };
  for (const char of text) {
    const nextItalic = mathMode && /[a-z]/.test(char);
    if (italic === null) {
      italic = nextItalic;
      buffer = char;
      continue;
    }
    if (nextItalic !== italic) {
      push();
      italic = nextItalic;
    }
    buffer += char;
  }
  push();
  return out;
}

function findMatchingParen(text, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function parseSequence(text, options = {}, stopChar = "") {
  const nodes = [];
  const mathMode = !!options.mathMode;
  let i = 0;

  const pushText = (value) => {
    for (const part of splitTextRun(value, mathMode)) {
      nodes.push(part);
    }
  };

  while (i < text.length) {
    const char = text[i];
    if (stopChar && char === stopChar) {
      break;
    }
    if (text.slice(i, i + 5) === "sqrt(") {
      const close = findMatchingParen(text, i + 4);
      if (close !== -1) {
        const inner = parseSequence(text.slice(i + 5, close), options);
        nodes.push({ type: "sqrt", child: { type: "sequence", children: inner } });
        i = close + 1;
        continue;
      }
    }
    if (char === "(") {
      const close = findMatchingParen(text, i);
      if (close !== -1) {
        const inner = parseSequence(text.slice(i + 1, close), options);
        nodes.push(...splitTextRun("(", mathMode));
        nodes.push({ type: "sequence", children: inner });
        nodes.push(...splitTextRun(")", mathMode));
        i = close + 1;
        continue;
      }
    }
    if (char === "^" || char === "_") {
      const last = nodes.pop();
      if (!last) {
        pushText(char);
        i += 1;
        continue;
      }
      let scriptNode = null;
      if (text[i + 1] === "(") {
        const close = findMatchingParen(text, i + 1);
        if (close !== -1) {
          scriptNode = { type: "sequence", children: parseSequence(text.slice(i + 2, close), options) };
          i = close + 1;
        }
      }
      if (!scriptNode) {
        const next = text[i + 1] || "";
        if (!next) {
          nodes.push(last);
          break;
        }
        scriptNode = { type: "sequence", children: splitTextRun(next, mathMode) };
        i += 2;
      }
      if (last.type === "script") {
        if (char === "^") {
          last.sup = scriptNode;
        } else {
          last.sub = scriptNode;
        }
        nodes.push(last);
      } else {
        nodes.push({
          type: "script",
          base: last,
          sup: char === "^" ? scriptNode : null,
          sub: char === "_" ? scriptNode : null,
        });
      }
      continue;
    }
    pushText(char);
    i += 1;
  }
  return nodes;
}

function layoutNode(node, fontSize) {
  if (node.type === "text") {
    const measured = measureText(node.value, fontSize, node.italic ? "italic" : "normal");
    return { ...node, ...measured };
  }
  if (node.type === "sequence") {
    const children = node.children.map((child) => layoutNode(child, fontSize));
    const ascent = children.reduce((max, child) => Math.max(max, child.ascent), 0);
    const descent = children.reduce((max, child) => Math.max(max, child.descent), 0);
    let offsetX = 0;
    for (const child of children) {
      child.offsetX = offsetX;
      child.offsetY = ascent - child.ascent;
      offsetX += child.width;
    }
    return { ...node, children, width: offsetX, ascent, descent };
  }
  if (node.type === "sqrt") {
    const child = layoutNode(node.child, fontSize);
    const radicalWidth = fontSize * 0.62;
    const pad = fontSize * 0.06;
    const barLift = fontSize * 0.14;
    const childDrop = fontSize * 0.08;
    return {
      ...node,
      child,
      width: radicalWidth + pad + child.width,
      ascent: child.ascent + barLift + fontSize * 0.08,
      descent: child.descent,
      radicalWidth,
      pad,
      barLift,
      childDrop,
    };
  }
  if (node.type === "script") {
    const base = layoutNode(node.base, fontSize);
    const sup = node.sup ? layoutNode(node.sup, fontSize * SCRIPT_SCALE) : null;
    const sub = node.sub ? layoutNode(node.sub, fontSize * SCRIPT_SCALE) : null;
    const pad = fontSize * 0.06;
    const scriptX = base.width + pad;
    const supBaseline = -base.ascent * 0.7;
    const subBaseline = base.descent + (sub ? sub.ascent * 0.45 : 0);
    const ascent = Math.max(base.ascent, sup ? sup.ascent - supBaseline : 0);
    const descent = Math.max(base.descent, sub ? subBaseline + sub.descent : 0);
    const width = base.width + (sup || sub ? pad + Math.max(sup?.width || 0, sub?.width || 0) : 0);
    return {
      ...node,
      base,
      sup,
      sub,
      width,
      ascent,
      descent,
      pad,
      scriptX,
      supBaseline,
      subBaseline,
    };
  }
  return { ...node, width: 0, ascent: 0, descent: 0 };
}

function createSvgText(doc, text, x, baselineY, fontSize, italic, color) {
  const el = doc.createElementNS(SVG_NS, "text");
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(baselineY));
  el.setAttribute("fill", color);
  el.setAttribute("font-family", EXPORT_FONT_FAMILY);
  el.setAttribute("font-size", String(fontSize));
  if (italic) {
    el.setAttribute("font-style", "italic");
  }
  el.textContent = text;
  return el;
}

function renderLayout(doc, parent, layout, originX, originY, fontSize, color) {
  if (layout.type === "text") {
    parent.appendChild(createSvgText(doc, layout.value, originX, originY + layout.ascent, fontSize, layout.italic, color));
    return;
  }
  if (layout.type === "sequence") {
    for (const child of layout.children) {
      renderLayout(doc, parent, child, originX + child.offsetX, originY + child.offsetY, fontSize, color);
    }
    return;
  }
  if (layout.type === "sqrt") {
    const topY = originY + layout.barLift;
    const midY = originY + layout.ascent - fontSize * 0.18;
    const bottomY = originY + layout.ascent + layout.descent;
    const radical = doc.createElementNS(SVG_NS, "path");
    const startX = originX;
    const d = [
      `M ${startX + layout.radicalWidth * 0.05} ${midY - fontSize * 0.08}`,
      `L ${startX + layout.radicalWidth * 0.22} ${midY + fontSize * 0.14}`,
      `L ${startX + layout.radicalWidth * 0.38} ${bottomY}`,
      `L ${startX + layout.radicalWidth * 0.72} ${topY}`,
      `L ${startX + layout.radicalWidth + layout.pad + layout.child.width} ${topY}`,
    ].join(" ");
    radical.setAttribute("d", d);
    radical.setAttribute("fill", "none");
    radical.setAttribute("stroke", color);
    radical.setAttribute("stroke-width", String(Math.max(1, fontSize * 0.07)));
    radical.setAttribute("stroke-linecap", "round");
    radical.setAttribute("stroke-linejoin", "round");
    parent.appendChild(radical);
    renderLayout(
      doc,
      parent,
      layout.child,
      originX + layout.radicalWidth + layout.pad,
      originY + layout.barLift + fontSize * 0.08 + layout.childDrop,
      fontSize,
      color
    );
    return;
  }
  if (layout.type === "script") {
    renderLayout(doc, parent, layout.base, originX, originY + (layout.ascent - layout.base.ascent), fontSize, color);
    if (layout.sup) {
      const supOriginY = originY + layout.ascent + layout.supBaseline - layout.sup.ascent;
      renderLayout(doc, parent, layout.sup, originX + layout.scriptX, supOriginY, fontSize * SCRIPT_SCALE, color);
    }
    if (layout.sub) {
      const subOriginY = originY + layout.ascent + layout.subBaseline - layout.sub.ascent;
      renderLayout(doc, parent, layout.sub, originX + layout.scriptX, subOriginY, fontSize * SCRIPT_SCALE, color);
    }
  }
}

export function buildExportLabelGroup(doc, label) {
  const fontSize = Math.max(8, Number(label.fontSize || 20));
  const color = label.color || "#111";
  const source = normalizeLabelText(label.text);
  const tree = { type: "sequence", children: parseSequence(source, { mathMode: isMathLike(source) }) };
  const layout = layoutNode(tree, fontSize);
  const group = doc.createElementNS(SVG_NS, "g");
  group.setAttribute("data-export-label-id", label.id || "");
  const originX = label.x;
  const originY = label.y;
  renderLayout(doc, group, layout, originX, originY, fontSize, color);
  return group;
}
