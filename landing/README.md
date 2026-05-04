# Landing — bnb.mithgard.ai

This directory is the static site served at https://bnb.mithgard.ai. No JS framework, no build
step, no runtime dependencies. Pure HTML + CSS.

```
landing/
├── index.html      # the page
├── styles.css      # all styles (mobile-first, dark, no externals)
└── README.md       # this file
```

`/vercel.json` at the repo root tells Vercel to deploy this directory as-is.

## Local preview

```bash
open landing/index.html
# or
python3 -m http.server -d landing 8000
# then visit http://localhost:8000
```

## Deploy to Vercel + bnb.mithgard.ai (one-time, ~5 min)

You only need to do this once. Vercel auto-deploys every push to `main` after step 1.

1. **Log in to Vercel.** Go to <https://vercel.com> and sign in with GitHub.

2. **Import the repo.** Click *Add New… → Project*, pick
   `nicolaskaitinnis1991/mithgard-bnb-mcp`. Vercel reads `vercel.json` automatically and shows
   `Output Directory: landing`. Leave everything else as default.

3. **Deploy.** Click *Deploy*. After ~30 seconds you get a `*.vercel.app` URL — confirm the
   page renders.

4. **Add the custom domain.** In the Vercel project, *Settings → Domains*, add `bnb.mithgard.ai`.
   Vercel shows a CNAME record like:

   ```
   Type:  CNAME
   Name:  bnb
   Value: cname.vercel-dns.com
   ```

5. **Add the CNAME to your DNS provider** (whoever manages `mithgard.ai`):

   | Type  | Name  | Value                |
   |-------|-------|----------------------|
   | CNAME | `bnb` | `cname.vercel-dns.com` |

6. **Wait for propagation** (usually 1–5 min). Verify with:

   ```bash
   dig bnb.mithgard.ai +short
   # should show cname.vercel-dns.com → some IP
   ```

7. **SSL is automatic.** Vercel issues a Let's Encrypt cert for `bnb.mithgard.ai` as soon as
   DNS resolves. No action needed from you.

After this, every push to `main` redeploys the landing in about 10 seconds.

## Editing

The page is intentionally one HTML file plus one CSS file. No build, no transpile. Edit, save,
refresh.

- Color palette is at the top of `styles.css` under `:root`.
- The 9-tool grid lives in `index.html` under `<section id="tools">` — copy a `<li class="tool-card">`
  block to add a tenth.
- All sections use `.container` for the max-width gutter.

## OG image

There's no `og-image.png` checked in yet. Browsers will fall back to a text preview, which is
acceptable. If you want a custom social-card image later, drop a 1200×630 PNG at
`landing/og-image.png` and add this to `<head>`:

```html
<meta property="og:image" content="https://bnb.mithgard.ai/og-image.png" />
```
