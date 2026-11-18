# Cenk Dönmez Research Website · V5

A fully static GitHub Pages research portfolio. This update keeps the same `data/content.json` schema and adds optional attachment/image fields; it is designed not to erase existing content.

## Install over your existing site

Upload/replace HTML pages in the repository root and files inside `assets/`, including **new `assets/background.js`**. The new persistent green design and animated topographic network require this new JavaScript file.

**Keep your existing `data/content.json`** if you have edited it! Do not upload the sample content file over your live file. The new optional fields are editable and will be written into your existing JSON when you publish.

## Manage content and upload a file

1. Open `admin.html` on your live site.
2. In **GitHub connection**, enter owner `cdonmez16`, repository `cenkdonmez.github.io`, branch `main`, and a fine-grained GitHub personal access token with **Contents: Read and write** permission for that repository. Click **Use these settings for this tab**. Token remains only in tab memory.
3. Go to Profile, Projects, Publications & talks, Presentations & talks, or Posts & news. Beside supported attachment or image fields, use **Choose image** or **Choose PDF / PPT / image**. Your system file chooser opens. File uploads go to `assets/media/` and the editor automatically links them to the entry.
4. Click **Publish & backup** → **Publish content to GitHub** to commit the updated `data/content.json`. Individual uploaded files are committed immediately; the entry will not link publicly until you publish the content file.
5. Refresh your public website after GitHub Pages redeploys.

Supported file types: JPG, JPEG, PNG, WEBP, GIF, PDF, PPT, PPTX; max 15 MB per file. Avoid uploading publisher PDFs that you are not permitted to redistribute. Prefer official DOI or publisher URLs for restricted papers, and link to repositories such as Zenodo for large files.

All uploaded files are **public** in GitHub history and on the website. Deleting a reference from the editor does not delete the underlying uploaded file. Never commit an access token to the repository.

## Troubleshooting

- If file buttons do not appear, check that `assets/admin.js` was replaced and hard-refresh with Cmd+Shift+R. GitHub Pages deployment may be in progress.
- If the background does not animate, check that `assets/background.js` exists in your GitHub repository. If Reduce Motion is enabled on your computer, the background is intentionally static.
- If an upload fails, verify token permissions, the repo name, selected file extension and 15 MB limit.
- Do not overwrite your personalized `data/content.json` with this ZIP's example data.
