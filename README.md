# Cenk Dönmez — research portfolio

A complete responsive academic website, online CV and browser-based Content Studio. No build tools, database or paid hosting are required. Built with **HTML, CSS and vanilla JavaScript**, with data stored in `data/content.json`. Suitable for **GitHub Pages**.

## Pages

- `index.html` — public research portfolio, research themes, projects, searchable-by-type outputs and recent updates.
- `cv.html` — online CV; browser **Print / Save as PDF** works without additional tools.
- `admin.html` — Content Studio: add, edit, reorder and delete entries; import/export JSON; publish content directly to GitHub with a short-lived token.
- `data/content.json` — the single content file used throughout the website.

## Getting started: preview locally

Download/unzip the whole folder. Open a Terminal in this directory and run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` for the website, `http://localhost:8000/cv.html` for the CV, and `http://localhost:8000/admin.html` for the editor. **Do not open `index.html` with a `file://` URL**; browsers block loading the JSON content from files in that mode.

## Publish free on GitHub Pages (no command line required)

1. Sign in to GitHub (create an account if needed).
2. Create a **public repository** named exactly `YOURUSERNAME.github.io` (replace YOURUSERNAME with your actual GitHub username). If you already have a user site with that repository name, choose another repository name and your site will have an additional `/repository-name/` path.
3. Upload **the contents** of this folder to the root of the repository: `index.html`, `cv.html`, `admin.html`, `assets/`, `data/`, `.nojekyll`, etc. Use **Add file → Upload files** and commit.
4. In the repository go to **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
5. Your site should appear at `https://YOURUSERNAME.github.io/` after deployment. The website also works in a project subpath because it uses relative URLs.

More: https://docs.github.com/en/pages/quickstart

## Update without coding

1. Visit `https://YOURUSERNAME.github.io/admin.html`.
2. Edit items on Profile, Projects, Publications & talks, Updates & events, Appointments, etc. Click **Save draft**. Local previews in this browser immediately use your edits.
3. Choose **Publish & backup** and either:
   - Click **Download content.json**, go to your GitHub repository's `data/content.json`, click the Edit pencil and replace its content with the downloaded file's contents, then **Commit changes**. On GitHub the easiest route for a downloaded file is to upload a replacement through the repository UI (or copy/paste JSON using the editor).
   - Or **publish directly**: use a fine-grained GitHub personal access token granted *only* to this repository, permission **Contents: Read and write**. Enter GitHub username, repository name, branch, and token in the panel, then click **Publish content to GitHub**. The panel updates `data/content.json` with a GitHub API commit.
4. When GitHub Pages deploys the commit, everyone sees the new content.

**Security:** `admin.html` is openly accessible, but it cannot change your GitHub repository without an authenticated token. Tokens are intentionally *not stored* in the browser's local storage, cookies or exported JSON, and the token field is cleared on success. Never share a token, paste it into content fields, or commit it to GitHub. The editor draft does stay in this browser using `localStorage`. If using a shared computer, clear your draft before leaving. Avoid extensions or devices you do not trust. A token is a credential and using it in a browser always carries residual risk; if you prefer not to use a token, the manual upload path is safer.

**Note:** The editing panel is not a backend server and does not auto-sync between devices. Save/publish on one device before editing on another. It does not upload images or slide decks itself; to feature presentations, first upload the PDF/PPTX under an `uploads/` folder in GitHub (or to another trusted public hosting service) and paste the URL into the relevant entry. This is particularly useful for keeping PDFs, posters and talks linked to the activities feed. GitHub Pages has size and bandwidth limits, so avoid hosting large slide or video files directly.

## Before going public

- Review and verify every sample research entry, particularly provisional publication names and links. Initial content reflects the supplied research background, **not an independently verified full publication list**.
- Add the correct email address or leave it blank.
- Add your verified DOI links, ORCID, Google Scholar, LinkedIn or institutional profile under Profile & intro → External links.
- Place a prepared CV PDF in an `uploads/` folder or link to a public PDF in **Profile → CV PDF URL** (optional; printing the online CV already generates a PDF).
- Replace or refine project descriptions, including the status of pending proposals.

## Customize appearance

Edit `assets/style.css`: `:root` contains the main design colors. Site illustrations are CSS/SVG, so no paid images or attribution is needed. The animations respect `prefers-reduced-motion`.

## License

You may use and modify these website files for your personal academic portfolio.
