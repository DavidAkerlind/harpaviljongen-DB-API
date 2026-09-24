# Going live with the new admin

Do these steps **in this order**. Until step 3 is merged, production is not touched.

Current setup this guide assumes:

-   **Domain** `harpaviljongen.com` is registered at **Loopia**, with its nameservers pointing to **Cloudflare** (so DNS is managed in Cloudflare).
-   **Public website** is on **Cloudflare Pages** (`harpaviljongen.pages.dev` → `harpaviljongen.com`).
-   **API** is on **Render** (paid plan) and deploys `main` automatically.
-   **Old admin** is on GitHub Pages (`davidakerlind.github.io/harpaviljongen-admin-service`).

---

## 0. Check where your DNS lives (2 minutes)

The admin will get its own subdomain, `admin.harpaviljongen.com`. How you add it depends on who runs your DNS.

-   Log in to **Cloudflare**. Is `harpaviljongen.com` listed under *Websites* (or *Domains*) with status **Active**? Then Cloudflare runs your DNS. This is almost certainly the case, because Cloudflare Pages only accepts the bare domain `harpaviljongen.com` when Cloudflare runs its DNS.
-   To double-check, look in **Loopia → Mina sidor → your domain → Namnservrar (nameservers)**. If they look like `xxx.ns.cloudflare.com`, DNS is at Cloudflare and there is **nothing to change at Loopia**. Loopia only renews the domain.
-   From a terminal: `nslookup -type=NS harpaviljongen.com` gives the same answer.

**Subdomains are free** on the free Cloudflare plan. Cloudflare Pages is free too (a project can have up to 100 custom domains).

---

## 1. Render (API): set the login secret

Render → your API service → **Environment** → add:

| Key | Value |
| --- | --- |
| `JWT_SECRET` | a long random string, e.g. from `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `12h` (optional; how long a login lasts, e.g. `7d`) |

Save. Render restarts the service; nothing else changes yet.

## 2. Cloudinary: allow PDFs to be shown

Cloudinary → **Settings → Security** → enable **Allow delivery of PDF and ZIP files**. Free Cloudinary accounts block PDF links by default. Without this, guests get an error when they open the menu.

## 3. Deploy the API (merge the API branch)

Merge `claude/serene-fermat-05id5w` into `main` in **harpaviljongen-DB-API**. Render deploys it.

What changes the moment it is live:

-   ✅ The public website keeps working exactly as before (it only reads data).
-   🔒 All writes now need a login token. **The old GitHub Pages admin can no longer save anything.** It can still show data.
-   Existing admin users keep working; you log in with the same username and password.

Check: https://harpaviljongen-db-api.onrender.com/api/health shows `"database": "up"`.
Then run *Auth → Login* and *6. Security checks* in Postman with the **Production** environment.

If you ever need a new admin user or a password reset, run this **locally**. It connects to the database in your `.env`, so point `CONNECTION_STRING` at production **only for this command**:

```bash
npm run create-user -- <username> <password>             # new users become admin
npm run create-user -- <username> <password> employee    # or a staff login
```

(Once logged in as an admin, it's easier to add users in the admin under **Användare**.)

## 4. Put the admin on Cloudflare Pages

Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → choose **harpaviljongen-admin-service**.

| Setting | Value |
| --- | --- |
| Project name | `harpaviljongen-admin` (the API already allows `*.harpaviljongen-admin.pages.dev`) |
| Production branch | `main` |
| Framework preset | `React (Vite)` (or *None*) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |

No `VITE_API_URL` is needed; the admin uses the production API by default.

Merge `claude/serene-fermat-05id5w` into `main` in **harpaviljongen-admin-service** so the new admin is what gets deployed. (Every other branch gets its own preview URL, shown on the deployment in Cloudflare.)

Then add the domain: the Pages project → **Custom domains → Set up a custom domain** → `admin.harpaviljongen.com` → **Activate domain**.

-   Cloudflare runs your DNS (step 0), so it creates the DNS record itself (`admin` → CNAME → `harpaviljongen-admin.pages.dev`) and issues the HTTPS certificate. It takes a few minutes.
-   *Only if DNS were still at Loopia:* add a **CNAME** record at Loopia instead, name `admin`, value `harpaviljongen-admin.pages.dev`, then click *Check DNS records* in Cloudflare.

Open https://admin.harpaviljongen.com, log in, and prepare everything **before** the website switches over:

1. **Menyer → Meny**: upload the current menu and click **Visa på hemsidan**.
2. **Menyer → Vinlista**: same.
3. **Sidor**: leave everything off to keep today's look, or switch on what should show.
4. **Öppettider**: check the week.

Nothing of this is visible on the website until step 5.

### Optional: an extra lock on the admin

Cloudflare **Zero Trust → Access** (free for up to 50 users) can put an email login in front of `admin.harpaviljongen.com`. Only listed email addresses get a one-time code, before the admin's own login is even shown. It's not required, since the API already needs a login token for every change.

## 5. Deploy the public website

Merge `claude/serene-fermat-05id5w` into `main` in **harpaviljongen**. If the Cloudflare Pages project is connected to GitHub, it deploys automatically. From now on:

-   *Meny* / *Vinlista* (navbar and homepage buttons) open the PDFs chosen in the admin.
-   Chambre / Evenemang / Galleri follow the switches under **Sidor**.

## 6. Clean up

-   GitHub → **harpaviljongen-admin-service → Settings → Pages** → unpublish, and delete the `gh-pages` branch.
-   Later, remove `https://davidakerlind.github.io` from `allowedOrigins` in `middlewares/corsConfig.js`.
-   Test PDFs from local testing are in the Cloudinary folder `menu-pdfs-dev` and can be deleted.

---

## Update: profile and all changes (branch `claude/profile-and-change-log`)

Everyone can set a name, username and profile picture under **Min profil**, and **Översikt → Senaste ändringar → Visa alla** opens every change with filters.

1. **API:** merge `claude/profile-and-change-log` into `main` in **harpaviljongen-DB-API**. Nothing to add on Render: pictures go to the Cloudinary folder `admin-avatars` (set `CLOUDINARY_AVATAR_FOLDER` only if you want another name). The first start after this update logs `Activity log: removed the auto-delete index createdAt_1`: from now on the change log is kept instead of being deleted after 180 days.
2. **Admin:** merge `claude/profile-and-change-log` into `main` in **harpaviljongen-admin-service**.

The preview of the admin branch is at `https://claude-profile-and-change-log.harpaviljongen-admin-service.pages.dev` (it uses the live API, so try it after step 1).

## Update: users and roles (branch `claude/user-roles`)

Admins can add staff logins in the admin under **Användare**. Deploy in this order:

1. **API:** merge `claude/user-roles` into `main` in **harpaviljongen-DB-API**. When Render starts it, every existing user gets the role `admin` (the log says `Gave N existing user(s) the admin role`). Nothing changes for the website or for logins.
2. **Admin:** merge `claude/user-roles` into `main` in **harpaviljongen-admin-service**. Cloudflare deploys it.
3. Log in to https://admin.harpaviljongen.com. **Användare** is in the sidebar (on a phone: tap your initial top right).

If the admin were deployed before the API, it keeps working; the Användare page just doesn't show until the API knows about roles.

Cloudflare builds a preview of the admin branch at `https://claude-user-roles.harpaviljongen-admin-service.pages.dev`. It uses the **live API**, so try it after step 1.

---

## If something goes wrong

-   **Website:** Cloudflare Pages → the project → *Deployments* → pick the previous deployment → **Rollback**.
-   **API:** Render → the service → *Events* / *Deploys* → **Rollback** to the previous deploy.
-   **Admin:** it is separate. Rolling it back doesn't affect the website.
