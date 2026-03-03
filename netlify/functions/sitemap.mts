import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Function: Dynamic Sitemap Generator
 *
 * Fetches all active, visible barbers from Supabase and generates
 * a complete sitemap.xml including static pages and dynamic barber profiles.
 *
 * Route: /.netlify/functions/sitemap  (rewritten to /sitemap.xml via netlify.toml)
 */

const DOMAIN = "https://barduck.uz";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async (req: Request, context: Context) => {
  // Supabase credentials — uses env vars set in Netlify dashboard,
  // falls back to hardcoded dev values.
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://gxethvdtqpqtfibpznub.supabase.co";

  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZXRodmR0cXBxdGZpYnB6bnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzExMzUsImV4cCI6MjA4MTgwNzEzNX0.4iPnwMUwCzPR-0FdnjyEIn6FsmDJxIYbX_5BcAfiSZY";

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ---------- Static pages ----------
  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/login", changefreq: "monthly", priority: "0.7" },
    { loc: "/register", changefreq: "monthly", priority: "0.7" },
    { loc: "/barbers", changefreq: "daily", priority: "0.9" },
  ];

  // ---------- Dynamic barber pages ----------
  let barberUrls: { loc: string; changefreq: string; priority: string }[] = [];

  try {
    const now = new Date().toISOString();

    // Fetch only active + visible barbers
    const { data: barbers, error } = await supabase
      .from("barbers")
      .select("id, full_name, subscription_status, subscription_expiry_date, is_available")
      .in("subscription_status", ["active", "free_trial"])
      .neq("is_available", false);

    if (error) {
      console.error("[sitemap] Supabase query error:", error.message);
    }

    if (barbers && barbers.length > 0) {
      barberUrls = barbers
        .filter((b) => {
          // Double-check expiry on the server side
          if (!b.subscription_expiry_date) return true; // No expiry = active
          return new Date(b.subscription_expiry_date) > new Date();
        })
        .map((b) => ({
          loc: `/?barber=${b.id}`,
          changefreq: "weekly",
          priority: "0.8",
        }));
    }
  } catch (err: any) {
    console.error("[sitemap] Failed to fetch barbers:", err.message);
    // Continue with static-only sitemap — don't break the response
  }

  // ---------- Build XML ----------
  const allUrls = [...staticPages, ...barberUrls];

  const urlEntries = allUrls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(DOMAIN + u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Robots-Tag": "noindex",
    },
  });
};
