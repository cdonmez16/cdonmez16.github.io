# Cenk Dönmez — academic website

A fast, static academic website for GitHub Pages, with a built-in **Content Studio** (admin panel) for editing text, buttons, images and files, with no coding needed.

```
index.html            the public website (one page, all sections)
css/style.css         design: colours, typography, hover-enlarge, animations
js/hero.js            animated vector background (contours + experiment network)
js/main.js            builds the page from content/site.json
content/site.json     ALL text, buttons, links, image and file paths
assets/uploads/       your images, PDFs and slides (filled by the admin panel)
admin/                Content Studio (index.html, admin.js, admin.css, config.js)
```

---

## 1. Put the files on GitHub (one time)

1. Open your repository **github.com/cdonmez16/cenkdonmez.github.io**.
2. Optional but recommended: download a copy of your current files as a backup (**Code → Download ZIP**).
3. Delete the old site files (or keep anything you still need, such as images).
4. Click **Add file → Upload files** and drag in **everything inside this folder**, including the hidden `.nojekyll` file. Commit.
5. Go to **Settings → Pages**, and check that the source is **Deploy from a branch → main → / (root)**.

After about a minute the site is live at **https://cdonmez16.github.io/cenkdonmez.github.io/**.

> If your repository's branch is not called `main`, or you rename the repository, change `admin/config.js`.

## 2. Create your admin key (one time, about 1 minute)

The admin panel saves changes directly to GitHub, so it needs a personal access token that can write **only to this repository**.

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `Content Studio`. Expiration: choose what you like (for example 1 year).
3. **Repository access → Only select repositories →** `cenkdonmez.github.io`.
4. **Permissions → Repository permissions → Contents → Read and write.** (Metadata: read is added automatically.)
5. Generate the token and copy it (it starts with `github_pat_`).

Keep it private, like a password. If it is ever exposed, delete it on GitHub and create a new one.

## 3. Edit your site

Open **https://cdonmez16.github.io/cenkdonmez.github.io/admin/** (there is also a "Manage content" link in the footer) and paste the token.

- **Every section** (About, Research, Tools, Projects, Publications, Teaching, Talks, News, Contact) and **every item** has:
  - an **image** (upload, drag and drop, or choose from the library),
  - **files**: drop any number of PDF, PPT/PPTX or image files, or add a web link,
  - **buttons**: edit the text, the link (a web address, `#section`, or an uploaded file) and the style (filled or outline).
- **Hero**: headline, introduction, portrait photo, buttons, profile links, partner networks.
- **Site & menu**: name, browser title, footer, and the **CV** button in the top menu (click *Upload* next to its link to upload your CV PDF).
- **Add / reorder sections**: show, hide, reorder or delete sections, or add new ones (for example *Awards* or *Supervision*).
- **Media library**: see, copy or delete everything you have uploaded.

Buttons along the top of the admin panel:

| Button | What it does |
|---|---|
| **Preview** | Opens the website with your unpublished edits (only you see them) |
| **Publish changes** | Saves to GitHub. The site updates in about a minute. Shortcut: Ctrl/⌘ + S |
| **Download JSON** | Saves a backup copy of all content to your computer |

Uploads are saved to the repository straight away; text edits are saved when you press **Publish changes**. Your edits are also kept as a draft in the browser, so an accidentally closed tab can be restored.

**Text formatting:** in longer texts, a blank line starts a new paragraph, `**bold**` makes text bold, and `[link text](https://…)` makes a link.

**File sizes:** GitHub accepts up to 100 MB per file. For large slide decks, save them as PDF. For photos, keep them under about 1 MB (2000 px wide is plenty).

## 4. Things to fill in first

Everything in `[square brackets]` is a placeholder:

- Your position and institute (**Hero**), e-mail and address (**Contact**)
- Your portrait (**Hero → Portrait photo**) and CV (**Site & menu → CV button → Upload**)
- Your ORCID, Google Scholar, ResearchGate and LinkedIn addresses (**Hero → Profile links**)
- Real publications, courses, talks and news
- Check the BonaRes LTE Overview Map link in **Tools**

## Working without a token

On the login page, choose **Work offline**. You can edit and preview everything, then **Download JSON** and upload the file to `content/site.json` on GitHub yourself. You can't upload files in offline mode.

## Notes

- The site works in all modern browsers and on phones. Animations switch off for visitors who have asked their system for reduced motion.
- The admin page is marked `noindex` and does nothing without a valid token, so visitors who find it cannot change anything.
- For a local test on your computer, run `python3 -m http.server` in this folder and open http://localhost:8000.
