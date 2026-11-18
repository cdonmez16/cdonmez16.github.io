# Cenk Dönmez — Research Portfolio, Version 4

Static GitHub Pages site, with a greener palette, animated geospatial hero and an integrated image picker.

## Replace files on your existing GitHub site

Your current repo: https://github.com/cdonmez16/cenkdonmez.github.io

The existing URL is `https://cdonmez16.github.io/cenkdonmez.github.io/`.

1. Open the ZIP and upload the root files `index.html`, `admin.html`, `cv.html`, `posts.html`, `presentations.html` and `.nojekyll` to the **root** of your GitHub repo.
2. Open `assets` in GitHub and upload `style.css`, `site.js`, and `admin.js` **inside `assets/`**, overwriting the previous versions.
3. Keep your existing `data/content.json` if you have made edits since V3. The included content file is example content and replacing your live file could overwrite your entries.
4. Hard-refresh your website using Cmd+Shift+R. The animated panel now appears directly below your introduction on the homepage, with another large canvas farther down.

## Edit content and upload photos

1. Open `/admin.html` on your published site.
2. Select **GitHub connection** from the sidebar.
3. For username set `cdonmez16`, repository `cenkdonmez.github.io`, branch `main`.
4. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new. Set Repository access: Only select repositories → `cenkdonmez.github.io`; Repository permissions → Contents → Read and write. Set a suitable expiration, and copy the token. Do not put the token into a public repo or share it.
5. Paste the token into the GitHub connection panel and click **Use these settings for this tab**.
6. Go to Projects, Presentations & talks, Posts & news, or Profile & intro. Click **Choose photo from computer** beside an image field, select a JPG/PNG/WEBP/GIF (max 5 MB). The photo is uploaded directly to `assets/media/` and its URL is assigned to the entry.
7. Use **Save draft**, then **Publish & backup → Publish content to GitHub**. Fields are prefilled; the same tab's token is reused. You must commit the JSON change before your public page uses the new image.

Uploads become immediately public in the GitHub repo; don't use private or unlicensed photos. Token is stored only in JavaScript memory of the currently open tab, not in localStorage or JSON. Your browser and GitHub can still observe authenticated API traffic. The admin page itself is public; only authorized token holders can commit. **The admin is not a private account/password dashboard.**

## Troubleshooting

- No animation: hard refresh then inspect that the new `assets/site.js` is in the `/assets` folder; reduced-motion settings intentionally disable moving transitions.
- File picker doesn't upload: create a token with Contents read/write for the correct repository, connect it first, and ensure your image is <=5 MB.
- Published content not appearing: check GitHub Actions/Pages deployment and refresh. If the site works locally but not on GitHub, verify correct `assets` and `data` folder locations.
- The admin updates `data/content.json` only; uploading photographs creates separate public file commits.

## Shorter URL

To switch to `https://cdonmez16.github.io/`, rename this repo `cdonmez16.github.io` in repository Settings → General, and update the repository field in the admin GitHub connection panel after the rename. To use `cenkdonmez.github.io`, the GitHub account must be called `cenkdonmez` (if available); otherwise use a separately purchased custom domain.
