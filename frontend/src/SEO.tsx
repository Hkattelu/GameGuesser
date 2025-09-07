import React, { useEffect } from 'react';
import { useLocation } from 'react-router';

const DEFAULT_TITLE = "Quiz Bot's Arcade";
const DEFAULT_DESC = "Play daily AI-powered guessing games. Let the bot guess your game or try to guess the bot's — fast, fun, and privacy-friendly.";

const routeMeta: Record<string, { title: string; desc: string }> = {
  '/': {
    title: "Quiz Bot's Arcade — Play AI guessing games",
    desc: DEFAULT_DESC,
  },
  '/ai-guesses': {
    title: "AI Guesses — Quiz Bot's Arcade",
    desc: "Think of any video game and let the bot guess it by asking you questions.",
  },
  '/player-guesses': {
    title: "You Guess — Quiz Bot's Arcade",
    desc: "The bot is thinking of a game — can you figure it out within twenty questions?",
  },
};

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link#canonical-link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.id = 'canonical-link';
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function upsertJSONLD(id: string, data: unknown) {
  let script = document.head.querySelector<HTMLScriptElement>(`script#${id}[type="application/ld+json"]`);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const { pathname } = location;
    const origin = window.location.origin;
    const meta = routeMeta[pathname] || { title: DEFAULT_TITLE, desc: DEFAULT_DESC };

    document.title = meta.title;

    // Basic meta
    upsertMeta('meta[name="description"]', { name: 'description' }, meta.desc);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, 'index, follow');

    // Canonical
    updateCanonical(`${origin}${pathname}`);

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, meta.title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, meta.desc);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, `${origin}${pathname}`);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, DEFAULT_TITLE);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, '/android-chrome-512x512.png');

    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.desc);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, '/android-chrome-512x512.png');

    // JSON-LD (WebApplication)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: DEFAULT_TITLE,
      url: origin,
      applicationCategory: 'Game',
      operatingSystem: 'All',
      description: DEFAULT_DESC,
    };
    upsertJSONLD('ld-json', jsonLd);
  }, [location]);

  return null;
}
