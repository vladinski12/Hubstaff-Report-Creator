const fs = require('fs');
const path = require('path');
const homeDir = require('os').homedir();
const { toXlsxFile } = require('./xlsx.js');
const { fromHubstaff } = require("./selenium.js");
const { promptUser } = require('./prompts.js');
const { By, Key, until } = require("selenium-webdriver");
const webdriver = require("selenium-webdriver");
const prompt = require('prompt-sync')({ sigint: true });
const csvtojson = require('csvtojson');
const xlsx = require('write-excel-file/node')
require('dotenv').config();

(async function getReport() {
  try {

    const envFilepath = './.env'

    if (!fs.existsSync(envFilepath)) {
      let email = await promptUser('Please enter your Hubstaff email: ');
      let password = await promptUser('Please enter your Hubstaff password: ', true);
      fs.appendFileSync('.env', `EMAIL=${email}\nPASSWORD=${password}`);
      console.log('Your credentials have been saved in .env file. Please run the script again.')
      process.exit();
    }

    let currentDate = new Date();

    currentDate = currentDate.toISOString().split('T')[0];

    let reportObj = [];

    await fromHubstaff(reportObj, currentDate, By, Key, until, webdriver, fs, path, csvtojson, promptUser, homeDir)

    toXlsxFile(reportObj, currentDate, homeDir, xlsx);

    console.log(`Report was created succesfully on Dekstop with the name : report - ${currentDate}.xlsx`);

  }
  catch (err) {
    console.error(err);
  }
})();

process.on('SIGINT', function () {
  console.log("Caught interrupt signal");
  process.exit();
});





