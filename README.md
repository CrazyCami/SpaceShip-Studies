# Orbit Academy

A browser based space shooter that turns study notes into answer targets. The site is static and has no build step; uploaded files are read in the browser and are not sent to a server.

**Play the game:** [crazycami.github.io/SpaceShip-Studies](https://crazycami.github.io/SpaceShip-Studies/)

## Play locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Publish on GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. After the workflow finishes, the Pages URL appears in the repository's Pages settings and in the workflow deployment.

## Study files

Upload plain text, Markdown, or CSV files. The browser builds questions from `Question: ... | Answer: ...` lines, short definition lines (such as `Osmosis is ...`), and other complete study sentences. Add a preference such as “focus on definitions” or “make them hard” before uploading to choose supported formats and set the meteor speed for question difficulty. This lightweight first version does not parse PDF or Word documents or use an AI service; export those notes as text or Markdown first.
