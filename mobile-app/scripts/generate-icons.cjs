const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const resources = path.join(root, "resources");

async function render(name, output) {
  const svg = fs.readFileSync(path.join(resources, name));
  await sharp(svg).png().toFile(path.join(resources, output));
  console.log(`generated ${output}`);
}

(async () => {
  await render("icon.svg", "icon.png");
  await render("splash.svg", "splash.png");
  await render("splash-dark.svg", "splash-dark.png");
})();
