# Nurse Shift Planner — Setup Guide
**Elite Nurse Jackie** — nurse-shift-planner.vercel.app

---

## ✅ Step 1 — Run Supabase SQL

1. Go to [supabase.com](https://supabase.com) → your **nurse-shift-planner** project
2. Click **SQL Editor** (left sidebar) → **New Query**
3. Copy the entire contents of `supabase-setup.sql` → paste → click **Run**
4. You should see "Success" — this creates the `access_codes` and `reviews` tables

---

## ✅ Step 2 — Get your Supabase keys

In Supabase → ⚙️ Settings → **API**:

| Key | Where to use |
|-----|-------------|
| Project URL | `SUPABASE_URL` env var |
| `anon` public key | `SUPABASE_ANON_KEY` env var |
| `service_role` key | `SUPABASE_SERVICE_KEY` env var |

Your Project URL: `https://javxvrwpoaeluvroeebd.supabase.co`

---

## ✅ Step 3 — Get your Resend API key

1. Go to [resend.com](https://resend.com) → API Keys → **Create API Key**
2. Name it `nurse-shift-planner`
3. Copy it (starts with `re_`)

---

## ✅ Step 4 — Get Ko-fi verification token (Ko-fi Gold required)

1. Go to Ko-fi → **Settings** → scroll to **Webhooks**
2. Enable webhook → copy the **Verification Token**
3. Set Webhook URL to: `https://nurse-shift-planner.vercel.app/api/kofi-webhook`

> Ko-fi Gold ($9 USD/month) is required for webhooks. Check Settings → Membership.

---

## ✅ Step 5 — Add Environment Variables to Vercel

1. Go to [vercel.com](https://vercel.com) → **nurse-shift-planner** project → **Settings** → **Environment Variables**
2. Add all 6 variables below:

| Variable Name | Value |
|--------------|-------|
| `SUPABASE_URL` | `https://javxvrwpoaeluvroeebd.supabase.co` |
| `SUPABASE_ANON_KEY` | *(your anon key from Step 2)* |
| `SUPABASE_SERVICE_KEY` | *(your service_role key from Step 2)* |
| `RESEND_API_KEY` | *(your Resend key from Step 3, starts with re_)* |
| `KOFI_VERIFICATION_TOKEN` | *(your Ko-fi webhook token from Step 4)* |
| `KOFI_SHOP_URL` | `https://ko-fi.com/elitenursejackie/shop` |

3. Click **Save** for each one

---

## ✅ Step 6 — Upload files to GitHub

Files to upload to `sageeralove-cpu/nurse-shift-planner`:

```
index.html
community.html
vercel.json
api/
  kofi-webhook.js
  verify-code.js
  submit-review.js
  get-reviews.js
```

**How to upload:**
1. Go to github.com → `sageeralove-cpu/nurse-shift-planner`
2. Click **Add file** → **Upload files**
3. Drag all files in (create `api/` folder first by adding a file inside it)
4. Click **Commit changes**
5. Vercel auto-deploys in ~30 seconds ✅

---

## ✅ Step 7 — Install Vercel dependencies

Your `api/` functions need two packages. In Vercel:
1. Settings → **Functions** → make sure Node.js runtime is selected
2. In your GitHub repo, add a `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "resend": "^2.0.0"
  }
}
```

Upload this `package.json` to GitHub alongside the other files.

---

## ✅ Step 8 — Test end-to-end

1. Make a **test purchase** on Ko-fi (use a test payment method or Ko-fi's sandbox)
2. Check your email for the `ENJ-XXXXXX` code
3. Go to `nurse-shift-planner.vercel.app`
4. Enter the code → confirm the app unlocks
5. Check Supabase → `access_codes` table → your code should appear with `used = true`

---

## 🔑 Access Code Format

All access codes follow the format: **ENJ-XXXXXX** (e.g. `ENJ-AB3K9M`)

Codes are generated automatically when Ko-fi confirms payment. Each code is single-use.

---

## 📋 Approve Community Reviews

Reviews need manual approval before appearing publicly:

1. Go to Supabase → Table Editor → **reviews**
2. Find new rows where `approved = false`
3. Set `approved = true` to publish them

---

## 💰 Pricing Suggestion

- $4.99 AUD — Lifetime Access (one-time Ko-fi shop item)
- Add this to Ko-fi Shop → Digital Item → paste the app link in the description
