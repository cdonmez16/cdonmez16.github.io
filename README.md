# Cenk Dönmez — Research portfolio (v2)

A static academic website with an editable JSON content panel. No paid hosting, database, or build system required.

## Files
- `index.html` — homepage with portrait, research, selected talks and posts.
- `presentations.html` — dedicated presentation directory, filterable by type.
- `posts.html` — news and short expandable posts.
- `cv.html` — academic CV, printable as PDF.
- `admin.html` — content manager.
- `data/content.json` — single shared data source for all pages.
- `assets/style.css` — visual design; `assets/site.js` — rendering; `assets/admin.js` — editing.

## Important: add your real photo
There is **no fabricated portrait**. A typographic CD placeholder appears until you upload your own photo. Rename a portrait image `portrait.jpg`, upload it under GitHub's `assets/` folder, and keep the portrait path in Content Studio as `assets/portrait.jpg`. Alternatively, enter a public HTTPS image URL in Profile & intro.

## Publish on GitHub (replace the current version)
1. Download and unzip this package.
2. Open `https://github.com/cenkdonmez/cenkdonmez.github.io`.
3. Upload/replace `index.html`, `cv.html`, `admin.html`, `presentations.html`, `posts.html`, and `README.md` at the **root**, committing changes.
4. Enter `assets/` in GitHub and upload/replace all three files `style.css`, `site.js`, `admin.js`.
5. Enter `data/` and replace `content.json`.
6. Open `https://cenkdonmez.github.io/` and hard refresh (Cmd + Shift + R).
7. Visit `/presentations.html`, `/posts.html`, and `/admin.html`.

GitHub allows leaving any redundant files in root. The site uses the versions **inside** `assets/` and `data/`.

## Edit your content with the panel
Open `https://cenkdonmez.github.io/admin.html`, then:
- **Profile & intro**: change biography, contact email, portrait path, CV link, institutional links.
- **Presentations & talks**: add, edit, reorder or remove talks; enter optional presentation slide/recording URLs.
- **Posts & news**: add announcements, dates, teaser and full text, optional links.
- **Projects, research themes, publications, CV entries**: manage the other sections.
- **Display settings**: hide or show homepage preview sections.
- **Save draft**: browser-local preview only, NOT live.
- **Publish & backup**: download updated `content.json` and upload to the existing GitHub `data/` directory, or publish with a GitHub fine-grained personal access token (Contents read/write for this repository only). Never commit a token.

The `admin.html` page is public, not password-protected. Only GitHub account credentials/token can update the hosted content. The admin panel itself cannot upload images or PDFs: upload those files in GitHub first and paste their paths into the panel.

## Editorial care
The initial presentations, post text and publication labels are indicative summaries. Verify exact talk titles and bibliographic metadata before sharing widely. No personal email address has been guessed.

## Technical requirements
Static HTML/CSS/vanilla JavaScript and GitHub Pages. The browser's local draft cache uses key `cd_research_draft_v1` to preserve editing across versions.


## Version 3: images and interactive geospatial visualization

The homepage has a new interactive canvas-based conceptual evidence-network illustration. It is made with standard JavaScript (no external animation dependency). Pointer movement introduces gentle parallax, animated field points and evidence flows. Visitors who prefer reduced motion see a static drawing. The visualization is conceptual, not georeferenced research data.

### Add photos through the dashboard

1. Open `admin.html`, choose **Upload images**, select your image, and enter your GitHub username (`cdonmez16`), repository (`cenkdonmez.github.io`), branch (`main`), and a fine-grained GitHub token with Contents read/write access to this repository.
2. Upload a JPG, PNG, WEBP or GIF under 5 MB. The image is committed into `assets/media/`. Copy its resulting path. **Uploads are public and should be images you are permitted to share.**
3. Go to **Projects**, **Presentations**, **Posts**, or **Profile & intro** and paste that path into the image field.
4. Save locally, then use **Publish & backup** to commit `data/content.json` to GitHub. You can alternatively download it and upload through GitHub.

You may instead upload pictures into `assets/media/` through GitHub and manually enter paths like `assets/media/my-talk.jpg`. Do not put images in the repository root. The admin panel cannot automatically remove unused photo files when you delete an entry; remove those separately in GitHub.

### Important about your URL

The owner username is `cdonmez16`, whereas your repository is `cenkdonmez.github.io`. GitHub therefore treats it as a **project site**, with the URL `https://cdonmez16.github.io/cenkdonmez.github.io/`. To use the free root address `https://cdonmez16.github.io/`, rename the repository to `cdonmez16.github.io`. To use `https://cenkdonmez.github.io/` instead, the GitHub **account username** must be `cenkdonmez` and the repository must be `cenkdonmez.github.io` (subject to username availability and account policy). Alternatively, purchase a custom domain such as `cenkdonmez.com` and configure GitHub Pages' custom domain and DNS.

All links in this package are relative, so the site works in either a user-site or project-site path. If you rename your repository, update the owner/repository values in the admin publishing panel.
