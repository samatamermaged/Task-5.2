// Reviews are rendered as HTML so people can use light formatting (bold, links).
// This helper is the single place review HTML passes through before it is handed
// to React's dangerouslySetInnerHTML.
//
// SECURITY: review bodies are untrusted, user-supplied markup. We SANITIZE (not
// escape) them with DOMPurify using a strict allow-list:
//   - escaping would turn <b>bold</b> into literal text and break legit formatting;
//   - sanitizing keeps the safe tags below and removes everything else
//     (<script>, <img onerror>, <svg onload>, <iframe>, style, javascript: URLs ...).
import DOMPurify from 'dompurify';

// Only these tags survive. Anything not listed (script, img, svg, iframe,
// object, form, style, ...) is removed.
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's',
  'p', 'br', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a',
];

// Only these attributes survive. Every on* event handler (onerror, onload,
// onclick, ...) and style/id/class is removed.
const ALLOWED_ATTR = ['href', 'title'];

// Links may only point to http(s) or mailto. javascript:, data:, vbscript: ... are dropped.
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  // Remove the content of these tags too, not just the tags themselves.
  FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'],
};

// Every surviving link opens in a new tab without giving the target page a
// handle on ours (reverse tabnabbing) and without passing SEO credit to spam.
let hookInstalled = false;
function installLinkHook() {
  if (hookInstalled) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
    }
  });
  hookInstalled = true;
}

export const sanitizeHtml = (dirty) => {
  if (typeof dirty !== 'string' || dirty.length === 0) return '';
  installLinkHook();
  return DOMPurify.sanitize(dirty, { ...CONFIG, ADD_ATTR: ['target', 'rel'] });
};

export default sanitizeHtml;