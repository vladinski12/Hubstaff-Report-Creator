module.exports = {

  fromHubstaff: async (reportObj, currentDate, By, Key, until, webdriver, fs, path, csvtojson, promptUser, homeDir) => {
    try {
      const driver = await new webdriver.Builder().forBrowser("chrome").build();

      await driver.get(`https://app.hubstaff.com/organizations/80807/time_entries/daily?date=${currentDate}&date_end=${currentDate}`);
      driver.manage().setTimeouts({ implicit: 10000 });
      driver.manage().window().maximize();

      await driver.findElement(By.xpath("/html//input[@id='user_email']")).sendKeys(process.env.EMAIL);

      await driver.findElement(By.xpath("/html//input[@id='user_password']")).sendKeys(process.env.PASSWORD);

      await driver.findElement(By.xpath("//form[@id='new_user']//button[@name='button']")).click();

      await driver.findElement(By.xpath("//body/div[@class='main-wrapper']/div[@class='content-wrapper']/div[@class='container-fluid']/div//div[@class='page-header-actions pull-right']/div/a[@role='button']/i")).click();

      await driver.findElement(By.css(`div:nth-of-type(2) > .dropdown-menu.dropdown-menu-right > li:nth-of-type(2) > a`)).click();

      await driver.sleep(2000);

      await driver.quit();

      const getMostRecentFile = (dir) => {
        const files = orderReccentFiles(dir);
        return files.length ? files[0] : undefined;
      };

      const orderReccentFiles = (dir) => {
        return fs.readdirSync(dir)
          .filter((file) => fs.lstatSync(path.join(dir, file)).isFile())
          .map((file) => ({ file, mtime: fs.lstatSync(path.join(dir, file)).mtime }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      };

      const csvFilePath = `${homeDir}//Downloads//${getMostRecentFile(`C://Users//${process.env.USER}//Downloads`).file}`;

      function addTimes(t0, t1) {
        t0 = t0.split(':');
        t1 = t1.split(':');
        let hours = parseInt(t0[0]) + parseInt(t1[0]);
        let minutes = parseInt(t0[1]) + parseInt(t1[1]);
        let seconds = parseInt(t0[2]) + parseInt(t1[2]);
        if (seconds >= 60) {
          minutes += 1;
          seconds -= 60;
        }
        if (minutes >= 60) {
          hours += 1;
          minutes -= 60;
        }

        let lessThan10min = minutes < 10 ? '0' : '';
        let lessThan10sec = seconds < 10 ? '0' : '';

        return `${hours}:${lessThan10min}${minutes}:${lessThan10sec}${seconds}`;
      }

      await csvtojson()
        .fromFile(csvFilePath)
        .then(async (jsonObj) => {

          function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
          }

          jsonObj.map((item) => item['Project']).filter(onlyUnique).forEach((project) => { reportObj.push({ project: project, total: '0:00:00' }) })

          jsonObj.forEach((item) => {
            reportObj.forEach((project) => {
              if (item['Project'] === project.project) {
                project.total = addTimes(project.total, item['Duration'])
                if (item['Task Summmary'] in project) {
                  project[item['Task Summmary']]['time'] = addTimes(project[item['Task Summmary']]['time'], item['Duration']);

                  if (item['Notes'] !== '') {
                    project[item['Task Summmary']].notes.push(`${item['Notes']}`);
                  }
                } else {
                  project[item['Task Summmary']] = { time: item['Duration'], notes: [] }
                  if (item['Notes'] !== '') {
                    project[item['Task Summmary']].notes.push(`${item['Notes']}`);
                  }
                }
              }
            })
          });

          let total = '0:00:00';
          for (let i = 0; i < jsonObj.length; i++) {
            total = addTimes(total, jsonObj[i]['Duration'])
          }

          let missedTime = await promptUser("How much time was missed? (minutes) ")

          if (missedTime > 60) { missedTime = `${Math.floor(missedTime / 60)}:${missedTime % 60}` }

          function timeDiffrence(time, miss) {
            if (miss === '0') return time;
            else {
              let timeArr = time.split(':');
              let hours = parseInt(timeArr[0]);
              let minutes = parseInt(timeArr[1]);
              if (miss.split(':').length > 1) {
                if (miss.split(':')[0] !== '0') {
                  hours -= parseInt(miss.split(':')[0]);
                  minutes -= parseInt(miss.split(':')[1]);
                  if (minutes < 0) {
                    hours -= 1;
                    minutes += 60;
                  }
                } else {
                  minutes -= parseInt(miss.split(':')[1]);
                  if (minutes < 0) {
                    hours -= 1;
                    minutes += 60;
                  }
                }
                return `${hours}:${minutes}:${timeArr[2]}`
              } else {
                return `${hours}:${minutes - parseInt(miss)}:${timeArr[2]}`
              }
            }
          }

          let obj = {
            Start: jsonObj[0]['Start'].substring(jsonObj[0]['Start'].indexOf("T") + 1, jsonObj[0]['Start'].lastIndexOf("+")),
            End: jsonObj[jsonObj.length - 1]['Stop'].substring(jsonObj[jsonObj.length - 1]['Stop'].indexOf("T") + 1, jsonObj[jsonObj.length - 1]['Stop'].lastIndexOf("+")),
            Total: timeDiffrence(total, missedTime),
            Miss: `${missedTime}`
          }

          reportObj.push(obj);

          fs.unlinkSync(csvFilePath);

        });
    } catch (e) {
      if (driver) driver.close();
      console.error(e);
    }
  },
}