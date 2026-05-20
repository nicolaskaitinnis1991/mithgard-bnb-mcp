# Legal FAQ

> Pre-emptive answers for a legal or licensing reviewer at Airbnb (or any reader who wants to know
> the IP, trademark, and licensing posture before they engage). Not legal advice — these are the
> author's stated positions on his own project, written in plain language.

For the live license text see [`LICENSE`](../../LICENSE). For contribution flow see
[`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## 1. Why MIT license?

MIT is permissive, encourages adoption, and doesn't conflict with Airbnb's interests. It lets
Airbnb (or any PMS, or any individual developer) fork the repo, study the architecture, license
it under a different scheme in a downstream proprietary product, or absorb the patterns into an
official Airbnb-shipped MCP server — without owing the author anything beyond the MIT attribution
notice. The license is a deliberate choice to lower the cost of adoption to zero. Copyleft (GPL,
AGPL) would make the project radioactive to Airbnb's legal team; that is exactly the outcome we
want to avoid.

---

## 2. Do you use Airbnb's trademark?

Only **nominative fair use** — i.e. naming the product the tool talks to. The README says things
like "Airbnb host workflows," "public Airbnb data," and "an MCP server for Airbnb." This is the
same kind of reference Hostaway, Smoobu, and Hospitable use on their public marketing pages and
is, in our reading, well within nominative-fair-use doctrine (US: *KP Permanent Make-Up v. Lasting
Impression I, Inc.*; EU: *L'Oréal v. Bellure*).

What we **don't** do:

- No Airbnb logo (the trademark `™` Belo) anywhere in the repo, the README, the Docker image, or
  the pitch material.
- No Airbnb brand colors (`#FF5A5F`) or font in our visual assets.
- No suggestion of affiliation, partnership, sponsorship, or endorsement. The README is explicit:
  this is a community project, no relationship with Airbnb, Inc.
- No use of "Airbnb" in the project name, package name (`@mithgard/bnb-mcp`), or domain
  (`bnb.mithgard.ai`). The name `bnb` is a generic abbreviation for "bed and breakfast" — a
  category, not a brand.

If Airbnb's brand or legal team would prefer different language in the README, we will adjust on
request.

---

## 3. What about copyright on captured HTML fixtures?

The repository contains a small number of HTML fixtures used to test the parsers (`tests/fixtures/`).
Post-Dispatch 8 they are stripped to **the embedded `__NEXT_DATA__` JSON only** — roughly 150 KB
each, with all surrounding HTML, scripts, styling, images, and markup removed. They are reproduced
for the limited purpose of validating the parsers behave correctly against real Airbnb response
shapes.

Our reading: this is fair use under US 17 U.S.C. § 107 — **transformative** (used as a parser
test target, not as a substitute for visiting Airbnb), **non-commercial** (no advertising, no
charge), **factual material** (listing data is mostly facts, not creative expression), and
**minimal amount** (one snapshot per parser, JSON-only, no images). EU positioning: TDM-exception
(Directive (EU) 2019/790, Art. 4) for non-rightsholder-opted-out scientific/technical analysis.

If Airbnb requests removal of any specific fixture, we will remove it on request and replace it
with a synthetic equivalent for the test suite.

---

## 4. Commercial use?

**Yes — the MIT license permits commercial use without further permission from the author.** A PMS
could embed this code in a paid product. An individual host could pay a consultant to run it. A
SaaS could expose the tools behind a paid API. The only obligations are the standard MIT ones:
include the copyright notice and the license text. No royalty, no revenue share, no notification
required.

The 7 demo tools are mocks, not implementations of real Airbnb host-facing features. Anyone using
this code in a commercial product is on the hook for either (a) Partner-API access from Airbnb,
or (b) their own implementation of the underlying integration. The schemas are not a backdoor.

---

## 5. Open-source obligations?

MIT terms only. Specifically:

- **Include the copyright notice** (`Copyright 2026 Nico Kaitinnis / Mithgard`) and the license
  text in copies and substantial portions of the software.
- **No warranty** — the software is provided as-is.
- **No copyleft** — derivative works do not have to be MIT-licensed.
- **No attribution requirement beyond MIT** — there is no "powered by" badge, no "in honor of"
  clause, no community-thanks list to maintain.

That's the whole list. The license file is canonical: [`LICENSE`](../../LICENSE).

---

## 6. Do you require a Contributor License Agreement (CLA)?

**No.** Contributors retain copyright on their contributions. Each commit by a contributor is
covered by the [Developer Certificate of Origin](https://developercertificate.org/) (in spirit —
we don't enforce `Signed-off-by` headers today, but each PR implicitly attests the contributor
has the right to license the contribution under MIT).

This means: a contributor who submits a PR is licensing their contribution under MIT, the same
license as the rest of the repo. No assignment of copyright to the maintainer, no separate
agreement to sign, no friction for someone who wants to fix a typo or add a feature.

This is a deliberate choice to lower the barrier to contribution. If the project grows large
enough that a CLA becomes necessary (e.g. enterprise adoption requires one), we will move to a
[DCO sign-off enforcement](https://probot.github.io/apps/dco/) rather than a full CLA — the former
is a one-line addition to commit messages, the latter is a legal document.
