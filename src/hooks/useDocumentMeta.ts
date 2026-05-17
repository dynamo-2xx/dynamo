import { useEffect } from "react";

/**
 * §11 SEO — Per-page meta + OG card overrides. Mount once per page (record,
 * profile, club, topic). Restores prior values on unmount so navigation back
 * to a generic page doesn't keep a record's title in the tab.
 */
interface DocumentMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile" | "video.other";
  canonical?: string;
}

function setMeta(selector: string, attr: "content" | "href", value: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      if (rel) (el as HTMLLinkElement).setAttribute("rel", rel);
    } else {
      el = document.createElement("meta");
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).setAttribute("name", name);
      if (prop) (el as HTMLMetaElement).setAttribute("property", prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function useDocumentMeta(meta: DocumentMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    if (meta.title) document.title = meta.title;

    const apply = () => {
      if (meta.description) {
        setMeta('meta[name="description"]', "content", meta.description);
        setMeta('meta[property="og:description"]', "content", meta.description);
        setMeta('meta[name="twitter:description"]', "content", meta.description);
      }
      if (meta.title) {
        setMeta('meta[property="og:title"]', "content", meta.title);
        setMeta('meta[name="twitter:title"]', "content", meta.title);
      }
      if (meta.image) {
        setMeta('meta[property="og:image"]', "content", meta.image);
        setMeta('meta[name="twitter:image"]', "content", meta.image);
      }
      if (meta.url) setMeta('meta[property="og:url"]', "content", meta.url);
      if (meta.type) setMeta('meta[property="og:type"]', "content", meta.type);
      if (meta.canonical) setMeta('link[rel="canonical"]', "href", meta.canonical);
    };

    apply();
    return () => {
      document.title = prevTitle;
    };
  }, [meta.title, meta.description, meta.image, meta.url, meta.type, meta.canonical]);
}