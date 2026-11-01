// Tell Bing (and other IndexNow engines) that URLs are new or changed.
// Usage: npx tsx scripts/indexnow-ping.ts [url ...]
// With no arguments it submits every blog guide URL found in the live sitemap.
// The key file public/<KEY>.txt must be deployed first; IndexNow fetches it to prove we own the site.
const HOST = "todaystab.com";
const KEY = "0a6488b8bbeff4d4fa9bc33c3b8dc9d7";

async function main() {
  let urls = process.argv.slice(2);
  if (urls.length === 0) {
    const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]*\/blog\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  }
  if (urls.length === 0) throw new Error("no URLs to submit");

  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  console.log(`submitted ${urls.length} URLs, status ${res.status}`);
  if (res.status !== 200 && res.status !== 202) {
    console.log(await res.text());
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
