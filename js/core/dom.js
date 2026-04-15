/**
 * Tiny DOM helpers used by every view module.
 * - h(tag, attrs, ...kids): create an element with attributes and children.
 * - clear(el): remove all children.
 * - setHTMLSafe(el, markup): render a restricted subset of HTML tags
 *   (<code>, <b>, <i>, <kbd>, <br>) into el. Any other content becomes text.
 *   This is the XSS boundary for user-authored lesson content.
 *
 * No unit tests here: these functions touch document and are verified via
 * Playwright MCP end-to-end tests in Plan 3.
 */

const SAFE_TAG_RE = /<(\/?)(code|b|i|kbd|br)\s*>/gi;

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') {
        el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v);
      } else if (k === 'html') {
        setHTMLSafe(el, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    if (typeof kid === 'string' || typeof kid === 'number') {
      el.appendChild(document.createTextNode(String(kid)));
    } else if (Array.isArray(kid)) {
      for (const subkid of kid) {
        if (subkid == null || subkid === false) continue;
        if (typeof subkid === 'string' || typeof subkid === 'number') {
          el.appendChild(document.createTextNode(String(subkid)));
        } else {
          el.appendChild(subkid);
        }
      }
    } else {
      el.appendChild(kid);
    }
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function setHTMLSafe(el, markup) {
  clear(el);
  if (!markup) return;
  const matches = [...String(markup).matchAll(SAFE_TAG_RE)];
  const stack = [el];
  let idx = 0;
  for (const m of matches) {
    const before = markup.slice(idx, m.index);
    if (before) {
      stack[stack.length - 1].appendChild(document.createTextNode(before));
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'br') {
      stack[stack.length - 1].appendChild(document.createElement('br'));
    } else if (closing) {
      if (stack.length > 1) stack.pop();
    } else {
      const child = document.createElement(tag);
      stack[stack.length - 1].appendChild(child);
      stack.push(child);
    }
    idx = m.index + m[0].length;
  }
  if (idx < markup.length) {
    stack[stack.length - 1].appendChild(document.createTextNode(markup.slice(idx)));
  }
}
