# Cenk Dönmez — academic website (version 2)

A multi-page academic website for GitHub Pages, with a built-in **Content Studio** for editing all text, buttons, images, files and publications.

```
index.html           Home: hero → achievements → research areas → featured contributions → research to practice → selected publications
about.html           About: biography, positions, education
publications.html    Full publication list: search, plus filters for year, type and research area
projects.html        Projects & Infrastructure
leadership.html      Academic Leadership
teaching.html        Teaching & Mentoring
talks.html           Talks & Outreach
css/style.css        Design
js/hero.js           Animated geospatial network and landscape contours (hero and page headers)
js/main.js           Builds every page from content/site.json
content/site.json    ALL content, including the 137 publications
admin/               Content Studio (unchanged way of working: token sign-in, uploads, media library, publish)
assets/uploads/      Your images, PDFs and slides
```

## Replacing the current website safely (about 5 minutes)

1. **Back up first.** On github.com/cdonmez16/cenkdonmez.github.io, click **Code → Download ZIP**. That gives you a copy of everything as it is today.
2. Click **Add file → Upload files**, then drag in **everything inside this folder** (including `.nojekyll` and the `admin`, `assets`, `content`, `css` and `js` folders). Files with the same name are replaced; your uploaded files in `assets/uploads/` are kept.
3. Write a commit message such as "Website version 2" and click **Commit changes**.
4. Wait about one minute, then open https://cdonmez16.github.io/cenkdonmez.github.io/ and reload once (Ctrl/⌘ + Shift + R).

> Your repository currently has no `index.html` at the top level (it was deleted in an earlier commit), so the homepage did not load. This package restores it.

**Optional cleanup:** these files belong to the very first version of the site. Nothing uses them any more, and you can delete them on GitHub if you like: `admin.html`, `content.json`, `cv.html`, `posts.html`, `presentations.html`, the `data/` folder, and in `assets/`: `admin.html`, `admin.js`, `background.js`, `cv.html`, `index.html`, `posts.html`, `presentations.html`, `site.js`, `style.css`, `placeholder.txt`, `README.md`, `Cenk.JPG`, `media/`.

**Your portrait:** the site uses `assets/uploads/2026/cenk-web.jpg`, a 130 KB copy of your uploaded photo for fast loading. The 1.9 MB original stays in the repository.

## Editing

Open **/admin/** (or click "Manage content" in the footer) and sign in with your GitHub token, exactly as before.

- **Publications:** search, filter, edit, add (new entries go to the top), attach PDFs, assign research areas, and tick **Show on homepage** to feature an entry under *Selected publications*.
- **Site, menu & contact:** every menu item (text, link, highlighted or normal) and the contact band shown at the bottom of every page.
- **Homepage hero:** headline, introduction, positions (one per line), portrait, buttons, profile links and networks.
- **Page headers:** title and introduction of each sub-page, plus an optional image.
- **Sections** (listed in the sidebar under each page): every section and item can have an image, files (PDF, PPT/PPTX, images or links) and buttons.
- **Add / move sections:** add new sections (such as Awards), move a section to another page, reorder, hide or delete.
- **Achievements:** a highlight value such as `{articles}` is counted automatically from your publication list. Available counts: `{articles}`, `{chapters}`, `{conferences}`, `{underreview}`, `{total}`, `{firstyear}`, `{firstconference}`.

Use **Preview** to check your changes, **Publish changes** to put them live, and **Download JSON** for a backup.

## Before sharing the site

Fill in or check these:
- **CV:** go to *Site, menu & contact → Top menu → CV*, click **Upload** and choose your CV PDF. (The About page's **Download CV** button also points to `assets/uploads/cv.pdf`.)
- **E-mail address:** under *Contact band*.
- **Academic Leadership → Service** and **Teaching & Mentoring → Supervision:** replace the [bracketed] placeholders, or hide those sections.
- **Projects:** the collaboration period for "BonaRes & EJP SOIL" is still a placeholder.
- **Images:** research maps, figures and photos (for example a screenshot of the LTE map) can be added to any card. Until then, cards show neutral contour placeholders.

## About the publication data

All 137 entries were taken from *4_1_CenkDonmez_Publications.docx* (as of November 2025), keeping titles, authors, years, venues and DOIs as written there. Works under review, submitted or in preparation are labelled as such, and never as published.

Please check these points:
- **Research areas:** each entry was assigned to its research areas from its title. Review and change them in Content Studio.
- **"inirrigated" (2026, Uzbekistan paper):** this appears in the source document and was kept exactly.
- **Incomplete DOI** `doi:10.14627/537690xxx` (2020, *Journal of Digital Landscape Architecture*): kept as text, not linked.
- **2005 symposium entry:** the source has an unclosed quotation mark, so the split between title and event is my reading of it.
- **Five entries in your peer-reviewed section are marked "under review" or "submitted" in the source.** These are the multi-covariate, hidden-attrition, green-spaces, rebound-effects and apple-suitability papers. They are shown under "Under review & in preparation" and are not counted as published.

## Local test

Run `python3 -m http.server` in this folder and open http://localhost:8000.
