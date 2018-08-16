# Light Accessibility Crawler
Crawl a website, run through the google chrome lighthouse accessibility audits, then output as html file

```bash
npm install --save-dev lightaccessibilitycrawler

lightaccessibilitycrawler --url https://atom.io/ --config config.json
```

where `config.json` looks something like this:
```json
{
  "extends": "lighthouse:default",
  "settings": {
    "output": {
      "destination": "accessibility_results.html"
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
