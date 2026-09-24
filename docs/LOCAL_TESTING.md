# Testing everything locally

This guide runs the **API**, the **admin** and the **public website** on your own computer, against a **separate test database**, so nothing you do touches the live site.

| What            | Repo                          | Runs on                          |
| --------------- | ----------------------------- | -------------------------------- |
| API             | `harpaviljongen-DB-API`       | http://localhost:7000/api        |
| Admin           | `harpaviljongen-admin-service`| http://localhost:5174            |
| Public website  | `harpaviljongen`              | http://localhost:5173            |

Branches: the **API** and the **admin** use `claude/user-roles` (users and roles, upload card). The **website** has no changes for it, so use `main` there.

The commands work in **PowerShell** (Windows) and in macOS/Linux terminals. Edit `.env` files in VS Code or another editor rather than creating them with `echo`, because PowerShell can save them in an encoding Node and Vite can't read.

---

## 0. Before you start

-   Node.js 20 or newer (`node -v`)
-   [Postman](https://www.postman.com/downloads/)
-   A **test database**. Pick one:
    -   **Docker:** start Docker Desktop, then run once `docker run -d --name harpaviljongen-mongo -p 27017:27017 mongo:7`
        → connection string `mongodb://127.0.0.1:27017/harpaviljongen-dev`.
        After a restart: `docker start harpaviljongen-mongo`. Check with `docker ps`.
    -   **Your Atlas cluster, but another database name:** take your normal connection string and change the database
        name, e.g. `mongodb+srv://USER:PASS@CLUSTER.mongodb.net/harpaviljongen-dev?retryWrites=true&w=majority`.
        Atlas creates the database on first write. (Your IP must be in Atlas → Network Access.)

> ⚠️ Do **not** use the production connection string locally. Everything you save in the admin (opening hours, PDFs, page switches) would go straight to the live website.

---

## 1. Start the API

```bash
cd harpaviljongen-DB-API
git fetch origin
git checkout claude/user-roles
npm install
cp .env.example .env
```

Fill in `.env`:

```env
PORT=7000
CONNECTION_STRING=mongodb://127.0.0.1:27017/harpaviljongen-dev
JWT_SECRET=any-long-random-string-for-local-use
JWT_EXPIRES_IN=12h
CLOUDINARY_CLOUD_NAME=...        # same Cloudinary account as production is fine
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=menu-pdfs-dev  # keeps test uploads out of the production folder
```

Generate a random secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Fill the empty test database and create a login:

```bash
npm run seed                                       # 7 opening-hour days + page settings (never overwrites)
node scripts/createUser.js adminuser testpassword123   # an admin; username ≥ 3 chars, password ≥ 8
npm run dev
```

Users you created before this branch have no role. The API gives them `admin` when it starts (`Gave 1 existing user(s) the admin role` in the log).

(`node scripts/createUser.js …` is the same as `npm run create-user -- …`, and avoids PowerShell swallowing the `--`.)

You should see `DB Connected` and `Server is running on port 7000`. Check:

-   http://localhost:7000/api/health → `"database": "up"`
-   http://localhost:7000/api/docs → Swagger docs (click **Authorize** and paste a token to try protected endpoints)

---

## 2. Test the API with Postman

1. Postman → **Import** → select the three files in `harpaviljongen-DB-API/docs/`:
    - `harpaviljongen-api.postman_collection.json`
    - `harpaviljongen-local.postman_environment.json`
    - `harpaviljongen-production.postman_environment.json`
2. Top right, choose the environment **Harpaviljongen – Local**. Open it (eye icon → Edit) and fill in `username` and `password` (the user from step 1).
3. Open **1. Auth → Login** and press **Send**. The token is saved automatically; every other request uses it.
4. Try the folders in order:

| Folder | What to check |
| --- | --- |
| **2. Öppettider** | `Update whole week` → 200 and all seven days back, Monday first. Empty `from`/`to` = closed. |
| **3. Sidor** | `Update page settings` → 200. Only the values you send change. |
| **4. Meny- & vinlista-PDF:er** | `Upload PDF`: in the **Body** tab click *Select files* on the `file` row and pick a PDF. `type`: `food` = Meny, `wine` = Vinlista. The new id is saved as `{{pdfId}}` for *Activate*, *Deactivate* and *Delete*. |
| **5. Hemsidan & status** | `Site config` shows exactly what the website will use: page switches + the active Meny/Vinlista link (`null` = placeholder PDF). `Senaste ändringar` lists who changed what. |
| **6. Security checks** | All should return **401**. They prove that nobody can change anything without logging in. |
| **7. Användare (bara admin)** | Needs an **admin** login. Creates a temporary employee, logs in as it, checks that it gets **403** on users but can change content, changes its own password, gets a new password from the admin (old tokens → **401**), makes it admin and back, deletes it, and checks that its token stops working (**401**). Run the folder as a whole (it passes values between requests). It never touches your own password. |

You can also run everything at once: click the collection → **Run** (pick a PDF for the upload row first).

> Login is limited to 10 **failed** attempts per 15 minutes per IP. If you get **429**, wait, or restart the API.

> The **Production** environment points to the live API on Render. GET requests there are harmless, but POST/PUT/PATCH/DELETE **change the live website**.

---

## 3. Start the admin

```bash
cd harpaviljongen-admin-service
git fetch origin
git checkout claude/user-roles
npm install
cp .env.example .env.local     # points the admin to http://localhost:7000/api
npm run dev
```

Open http://localhost:5174 and log in with the user from step 1.

---

## 4. Start the public website

```bash
cd harpaviljongen
git checkout main
git pull
npm install
cp .env.example .env.local     # points the website to http://localhost:7000/api
npm run dev
```

Open http://localhost:5173. (Without `.env.local` the website uses the live API.)

---

## 5. Things to try (admin → website)

Keep the admin and the website open side by side. After a change in the admin, **reload** the website.

| In the admin | Expected on the website |
| --- | --- |
| **Menyer → Meny →** the dashed **Ladda upp ny meny** card (first under *Alla uppladdade*), leave *Visa på hemsidan direkt* off | Nothing changes yet. The PDF shows up under *Alla uppladdade*. |
| Drag a PDF from your desktop onto the dashed card | The upload dialog opens with that file and its name filled in. |
| Click the PDF → preview → **Visa på hemsidan** | *Meny* in the navbar and the *MENY* button open that PDF. |
| Upload another and activate it | The first one is no longer *Aktiv*; the website links to the new one. |
| **Sluta visa** on the active one | *MENY* opens *Ny_meny_kommer_snart.pdf* again. |
| **Ta bort** a PDF | It disappears from the list and from Cloudinary (`menu-pdfs-dev` folder). |
| Same things on the **Vinlista** tab | Same, for *Vinlista* / *VINLISTA*. |
| **Öppettider**: switch a day on, type `1700` and `2300` | The fields become `17:00` and `23:00`; after **Spara** the footer shows them. |
| **Sidor**: *Chambre séparée → Länk i menyn* on | *Chambre* appears in the navbar. |
| **Sidor**: *Evenemang → Knapp på startsidan* on | An *EVENEMANG* button appears under MENY/VINLISTA. |
| Switch them off again | They disappear. The pages still open with a direct link (`/chambre`, `/events`, `/gallery`). |
| **Översikt** | Website, API and database are green and the cards show what is live. |
| **Användare → Ny användare**, e.g. `anna` / `hemligt123`, *Personal* | Anna is listed as *Personal*. Log in as her in a private window: she can change menus, hours and pages, but has no *Användare*. |
| **⋮ → Gör till admin** on Anna, then reload her window | She now has *Användare*. |
| **⋮ → Ta bort** on an admin | Greyed out: only *Personal* can be deleted. Make them personal first. |
| **⋮ → Ta bort** on Anna (as personal) | She disappears, and her open window is logged out on her next change. |
| Your own row | Has no **⋮**: you can't change your own role or delete yourself. |
| **⋮ → Nytt lösenord** on Anna | Her open window is logged out on her next click; she logs in with the new password. |
| Your name at the bottom of the sidebar → **Byt lösenord** (phone: your initial top right) | A wrong current password says *Nuvarande lösenord stämmer inte.* After a successful change you stay logged in here; another browser logged in as you is logged out. |
| **Menyer**: the pencil next to a PDF's name | Rename it. The new name shows right away. |
| **Översikt → Senaste ändringar** | Everything above is listed with who did it (*Du* for you). *Visa fler* shows up to 30. |
| Stop the API (Ctrl+C) and reload the website | Navbar and buttons still work with the last settings it saw (the opening hours in the footer show an error until the API is back — same as today). |

Also try the admin on your phone-sized browser window (DevTools → device toolbar): there is a bottom tab bar instead of the sidebar, and *Användare* and *Logga ut* are behind your initial top right.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Browser console says **CORS** | Run the admin on port 5174 and the website on 5173 (other ports aren't allowed by the API). |
| Admin says **Kunde inte nå servern** | The API isn't running, or `VITE_API_URL` in `.env.local` is wrong. Restart `npm run dev` after changing `.env.local`. |
| **401 / logged out** | The token expired (12 h) or `JWT_SECRET` changed. Log in again. |
| Login gives **429** | Too many attempts. Wait 15 minutes or restart the API. |
| **Upload fails** with a Cloudinary error | Check the three `CLOUDINARY_*` values in `.env`. |
| PDF **preview is blank / 401** | Cloudinary blocks PDF delivery by default on free accounts: Cloudinary → Settings → Security → enable **Allow delivery of PDF and ZIP files**. |
| Thumbnails show a PDF icon | Normal for local test files; with Cloudinary the first page is shown. |
