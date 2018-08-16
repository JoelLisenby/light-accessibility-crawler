const async = require('async')
const cheerio = require('cheerio')
const spawn = require('child_process').spawn;
const Crawler = require('simplecrawler')
const Entities = require('html-entities').Html5Entities;
const entities = new Entities();
const fs = require('fs')
const nl2br  = require('nl2br');
const path = require('path')

const stats = {
  pageCount: 0,
  violationCounts: {},
  passedAuditsCount: 0,
  startTime: null,
  auditTimesByPageUrl: {}
}

module.exports = (options) => {
  stats.startTime = new Date()
  const configPath = path.resolve(options.config)
  const config = JSON.parse(fs.readFileSync(configPath))

  const output_destination = config.settings.output.destination || 'lightcrawler_output.html';

  const crawler = new Crawler(options.url)
  crawler.respectRobotsTxt = false
  crawler.parseHTMLComments = false
  crawler.parseScriptTags = false
  crawler.maxDepth = config.settings.crawler.maxDepth || 1

  crawler.discoverResources = (buffer, item) => {
    const page = cheerio.load(buffer.toString('utf8'))
    const links = page('a[href]').map(function () {
      return page(this).attr('href')
    }).get()

    return links
  }

  let totalErrorCount = 0

  let html_out_obj = {}

  let html_out = '<html lang="en_US"><head><title>Accessibility Scan Results</title>';
  html_out += '<style>body { font-family: roboto; font-size: 14px; } a { color: #1a6dd8; } a:hover { color: #0c4896 } a:visited { color: #1a6dd8; } h1,h2 { padding: 1em 0; } h1 { font-size: 1.5em; } h2 { font-size: 1.25em; } .audit { padding-bottom: 1em; } .audit-url-result { padding: 2em 0; border-bottom: 4px solid #b7b7b7; } .audit-node-messages ul li ul { margin: 0; padding: 0; list-style: none; } .audit-node-messages ul li ul li { list-style-type: none; margin: 2px 0; padding: 0; } code { display: inline-block; font-family: "droid sans mono"; font-size: 0.8em; padding: 5px; background-color: #efefef; }</style>';
  html_out += '</head><body>';
  html_out += '<h1>Accessibility Scan Results</h1>';

  const lighthouseQueue = async.queue((url, callback) => {
    runLighthouse(url, configPath, (errorCount, lh_html_out_obj) => {
      totalErrorCount += errorCount

      Object.keys(lh_html_out_obj).forEach(function(key) {
        html_out_obj[key] = lh_html_out_obj[key]
      })

      callback()
    })
  }, config.settings.crawler.maxChromeInstances)

  crawler.on('fetchcomplete', (queueItem, responseBuffer, response) => {
    lighthouseQueue.push(queueItem.url)
  })
  crawler.once('complete', () => {
    lighthouseQueue.drain = () => {
      printStats()
      
      // sort html_out_obj by key
      var html_out_obj_sorted = {};
      Object.keys(html_out_obj).sort().forEach(function(key) {
        html_out_obj_sorted[key] = html_out_obj[key];
      })
      
      html_out += '<div class="table-of-contents"><h2 id="table-of-contents">Table of Contents</h2><ul>';
      Object.keys(html_out_obj_sorted).forEach(function(key) {
        html_out += '<li><a href="#'+ key +'">'+ key +'</a></li>';
      })
      html_out += '</ul></div>';

      Object.keys(html_out_obj_sorted).forEach(function(key) {
        html_out += html_out_obj_sorted[key];
      })

      html_out += '</body></html>';
      
      fs.writeFileSync(output_destination, html_out);

      if (totalErrorCount > 0) {
        process.exit(1)
      }
    }
  })

  crawler.start()
}

function runLighthouse (url, configPath, callback) {
  stats.pageCount++
  const args = [
    url,
    '--output=json',
    '--output-path=stdout',
    '--disable-device-emulation',
    '--disable-cpu-throttling',
    '--disable-network-throttling',
    '--chrome-flags=--headless --disable-gpu',
    `--config-path=${configPath}`
  ]

  const lighthousePath = require.resolve('lighthouse/lighthouse-cli/index.js')
  const lighthouse = spawn(lighthousePath, args)
  let output = ''
  lighthouse.stdout.on('data', (data) => {
    output += data
  })

  stats.auditTimesByPageUrl[url] = {startTime: new Date()}
  lighthouse.once('close', () => {
    stats.auditTimesByPageUrl[url].endTime = new Date()
    let errorCount = 0
    let lh_html_out_obj = {}
    lh_html_out_obj[url] = '';

    let report
    try {
      report = JSON.parse(output)
    } catch (parseError) {
      console.error(`Parsing JSON report output failed: ${output}`)
      callback(1)
      return
    }
    
    lh_html_out_obj[url] += '<div class="audit-url-result"><h2 id="'+ url +'" class="audit-url"><a href="'+ url +'">'+ url +'</a></h2>';

    report.reportCategories.forEach((category) => {
      let displayedCategory = false

      category.audits.forEach((audit) => {

        if (audit.score === 100) {
          stats.passedAuditsCount++
        } else {

          lh_html_out_obj[url] += '<div class="audit">';

          if (!displayedCategory) {
            displayedCategory = true
          }
          errorCount++
          lh_html_out_obj[url] += '<div class="audit-description"><p><strong>'+ audit.id +'</strong> - '+ entities.encode( audit.result.description ) +'</p></div>';

          if (stats.violationCounts[category.name] === undefined) {
            stats.violationCounts[category.name] = 0
          }

          if (audit.result.extendedInfo) {
            const {value} = audit.result.extendedInfo
            if (Array.isArray(value)) {
              lh_html_out_obj[url] += '<div class="extended-info"><h3>Extended Info</h3>';
              lh_html_out_obj[url] += '<ul>';
              stats.violationCounts[category.name] += value.length
              value.forEach((result) => {
                if (result.url) {
                  lh_html_out_obj[url] += '<li>'+ result.url +'</li>';
                }
              })
              lh_html_out_obj[url] += '</ul></div>';
            } else if (Array.isArray(value.nodes)) {
              stats.violationCounts[category.name] += value.nodes.length
              const messagesToNodes = {}
              value.nodes.forEach((result) => {
                let message = result.failureSummary
                message = message.replace(/^Fix any of the following:/g, '').trim()
                if (messagesToNodes[message]) {
                  messagesToNodes[message].push(result.html)
                } else {
                  messagesToNodes[message] = [result.html]
                }
              })
              lh_html_out_obj[url] += '<div class="audit-node-messages"><ul>';
              Object.keys(messagesToNodes).forEach((message) => {
                lh_html_out_obj[url] += '<li><strong>'+ nl2br(message) +'.</strong>';
                lh_html_out_obj[url] += '<ul>';
                messagesToNodes[message].forEach(node => {
                  lh_html_out_obj[url] += '<li><code>'+ entities.encode(node) +'</code></li>';
                })
                lh_html_out_obj[url] += '</ul>'
                lh_html_out_obj[url] += '</li>';
              })
              lh_html_out_obj[url] += '</ul></div>';
            } else {
              stats.violationCounts[category.name]++
            }
          }
          
          lh_html_out_obj[url] += '</div>'; // .audit

        }
      })
    })

    lh_html_out_obj[url] += '</div>'; // .audit-url-result

    callback(errorCount, lh_html_out_obj)
  })
}

function printStats() {
  console.log();
  console.log();
  console.log('Lighthouse Summary'.bold.underline);
  console.log(`  Total Pages Scanned: ${stats.pageCount}`);
  console.log(`  Total Auditing Time: ${new Date() - stats.startTime} ms`);
  const totalTime = Object.keys(stats.auditTimesByPageUrl).reduce((sum, url) => {
    const {endTime, startTime} = stats.auditTimesByPageUrl[url]
    return (endTime - startTime) + sum
  }, 0)
  console.log(`  Average Page Audit Time: ${Math.round(totalTime/stats.pageCount)} ms`);
  console.log(`  Total Audits Passed: ${stats.passedAuditsCount}`, '\u2713'.green);
  if (Object.keys(stats.violationCounts).length === 0) {
    console.log(`  Total Violations: None! \\o/ 🎉`);
  } else {
    console.log(`  Total Violations:`);
    Object.keys(stats.violationCounts).forEach(category => {
      console.log(`    ${category}: ${stats.violationCounts[category]}`, '\u2717'.red);
    })
  }
}
