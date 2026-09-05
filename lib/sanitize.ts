import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "div", "span", "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "em", "b", "i", "u", "s", "strike",
  "mark", "small", "sup", "sub",
  "a", "ul", "ol", "li", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "img", "figure", "figcaption",
  "video", "source", "audio",
  "iframe",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  iframe: [
    "src",
    "title",
    "width",
    "height",
    "allow",
    "allowfullscreen",
    "allowtransparency",
    "frameborder",
    "scrolling",
  ],
  code: ["class"],
  video: ["src", "controls", "width", "height", "poster", "preload", "playsinline"],
  source: ["src", "type"],
  table: ["border", "cellpadding", "cellspacing"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

const ALLOWED_IFRAME_HOSTNAMES = [
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
];

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
    allowProtocolRelative: false,
  });
}