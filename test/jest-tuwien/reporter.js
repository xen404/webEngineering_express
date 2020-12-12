const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const stripAnsi = require('strip-ansi');

class MyCustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.screenshotReportDir = this._options.screenshotReportDir || "jest-screenshot-report";
  }

  onRunComplete(contexts, results) {
    this.seed = contexts.values().next().value.config.globals.__SEED__;

    const templateFile = path.join(__dirname, 'report.mustache.html');
    const outputFile = this._options.outputFile || 'report.html';
    const report = this.generateReport(results);
    console.log(`\nYou have \u001b[1m${report.totalPoints} points\u001b[0m on ${report.title}.`)

    const template = fs.readFileSync(templateFile, 'utf-8');
    const html = mustache.render(template, report);
    fs.writeFileSync(outputFile, html, { encoding: 'utf-8' });
    console.log(`See \u001b[1m${outputFile}\u001b[0m for details.`);
  }

  generateReport(results) {
    var report = {
      title: this._options.title,
      maxPoints: this._options.maxPoints,
      minusPoints: 0,
      sections: [],
      startTime: new Date(results.startTime).toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' UTC',
      numTotalTests: results.numTotalTests,
      numFailedTests: results.numFailedTests,
      numPassedTests: results.numPassedTests,
      seed: this.seed
    };

    const screenshotReports = {}    
    const screenshotReportsDir = path.join(this.screenshotReportDir, 'reports');
    if (fs.existsSync(screenshotReportsDir)) {
      fs.readdirSync(screenshotReportsDir).map(testPath => {
        const infoFilePath = path.join(screenshotReportsDir, testPath, "info.json");
        const info = JSON.parse(fs.readFileSync(infoFilePath, "utf8"));
        info.receivedPath = path.join(this.screenshotReportDir, info.receivedPath);
        info.diffPath = path.join(this.screenshotReportDir, info.diffPath);
        info.snapshotPath = path.join(this.screenshotReportDir, info.snapshotPath);
        if (!screenshotReports[info.testFileName]) {
          screenshotReports[info.testFileName] = {};
        }
        screenshotReports[info.testFileName][info.testName] = info;
      });
    }

    for (const testFile of results.testResults) {
      var section = {
        testFileName: path.basename(testFile.testFilePath),
        tests: []
      }
      report.sections.push(section);

      for (const result of testFile.testResults) {
        const titleParts = result.title.split(' // ');
        const title = titleParts[0];
        const testType = titleParts[1] || 'other';
        const minusPoints = parseFloat(titleParts[2]) || this._options.defaultMinusPoints;

        var test = {
          fullName: (result.ancestorTitles.join(' ') + ' ' + title).trim(),
          status: result.status,
          minusPoints: 0
        }
        section.tests.push(test);
        
        if (result.status != 'failed') {
          continue;
        }
        const msg = stripAnsi(result.failureMessages[0]);

        if (msg.startsWith('Error: net::ERR_FILE_NOT_FOUND') || msg.startsWith('Error: ENOENT: no such file')) {
          test.errors = ['File not found'];
          test.minusPoints = minusPoints;
        }

        else if (testType == 'visual') {
          const screenshotReport = screenshotReports[section.testFileName][result.fullName];          
          const diffPer = screenshotReport.changedRelative * 100;
          test.visualError = {
            msg: `Your page is ${diffPer.toFixed(2)} % different from the reference screenshot.`,
            screenshotFile: screenshotReport.receivedPath,
            diffFile: screenshotReport.diffPath,
            referenceFile: screenshotReport.snapshotPath            
          }
          test.minusPoints = minusPoints;
        }

        else if (testType == 'validate') {
          test.errors = [];
          const lines = msg.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('[error]')) {
              test.errors.push(line.slice(8));
            }
          }
          test.minusPoints = test.errors.length * minusPoints;

        }

        else {
          test.errors = [msg];
          test.minusPoints = minusPoints;
        }

        report.minusPoints += test.minusPoints;
      }

      if (testFile.testExecError) {
        section.tests.push({
          fullName: testFile.testExecError.code,
          status: 'failed',
          minusPoints: this._options.maxPoints,
          errors: [stripAnsi(testFile.testExecError.message)]
        });
        report.minusPoints += report.maxPoints;
      }
    }
    report.totalPoints = Math.max(0, report.maxPoints - report.minusPoints);

    if (report.totalPoints >= report.maxPoints) {
      report.partyFace = '🥳';
    }

    report.sections.sort((a,b) => a.testFileName.localeCompare(b.testFileName));

    return report;
  }

}

module.exports = MyCustomReporter;
