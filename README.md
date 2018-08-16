# light-accessibility-crawler
Crawl a website, run it through Google Chrome Lighthouse accessibility audits, then output results in html file.

Upon completion the output will be saved in a output.html file in the directory the command is run from.

```bash
npm install --save-dev lightcrawler

light-accessibility-crawler --url https://atom.io/ --config light-accessibility-crawler-config.json
```

where `light-accessibility-crawler-config.json` looks something like this:
```json
{
  "extends": "lighthouse:default",
  "settings": {
    "output": {
      "destination": "/home/username/accessibility_results.html"
    },
    "crawler": {
      "maxDepth": 2,
      "maxChromeInstances": 5
    },
    "onlyCategories": [
      "Accessibility"
    ],
    "onlyAudits": [
	"accesskeys",
	"aria-allowed-attr",
	"aria-required-attr",
	"aria-required-children",
	"aria-required-parent",
	"aria-roles",
	"aria-valid-attr-value",
	"aria-valid-attr",
	"audio-caption",
	"button-name",
	"bypass",
	"color-contrast",
	"definition-list",
	"dlitem",
	"document-title",
	"duplicate-id",
	"frame-title",
	"html-has-lang",
	"html-lang-valid",
	"image-alt",
	"input-image-alt",
	"label",
	"layout-table",
	"link-name",
	"list",
	"listitem",
	"meta-refresh",
	"meta-viewport",
	"object-alt",
	"tabindex",
	"td-headers-attr",
	"th-has-data-cells",
	"valid-lang",
	"video-caption",
	"video-description"
    ]
  }
}

```

Enjoy!
