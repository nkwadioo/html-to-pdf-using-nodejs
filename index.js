const express = require('express');
const app = express();

// const pdf = require("pdf-creator-node");
const cors = require("cors");

app.use(cors());
app.use(express.json());


const fs = require('fs')
const path = require('path')
const utils = require('util')
let puppeteer;
 
// const puppeteer = require('puppeteer');
/*
https://openbase.com/js/puppeteer-core/versions ---> FOR browserFetcher.download('[version]')

Chromium 92.0.4512.0 - Puppeteer v10.0.0  -- r 884014
Chromium 91.0.4469.0 - Puppeteer v9.0.0
Chromium 90.0.4427.0 - Puppeteer v8.0.0
Chromium 90.0.4403.0 - Puppeteer v7.0.0
Chromium 89.0.4389.0 - Puppeteer v6.0.0
Chromium 88.0.4298.0 - Puppeteer v5.5.0  -- r 818858
Chromium 87.0.4272.0 - Puppeteer v5.4.0
Chromium 86.0.4240.0 - Puppeteer v5.3.0
Chromium 85.0.4182.0 - Puppeteer v5.2.1
Chromium 84.0.4147.0 - Puppeteer v5.1.0
Chromium 83.0.4103.0 - Puppeteer v3.1.0
Chromium 81.0.4044.0 - Puppeteer v3.0.0
*/

let revisionInfo; // GLOBAL INSTALLED VERSION
console.log('INIT puppeteer')
if (process.env.PORT) {
    (async () => {

        try {
            puppeteer = require('puppeteer-core');
            console.log('TRYING TO FETCH BROWSER')
            const browserFetcher = puppeteer.createBrowserFetcher();
            revisionInfo = await browserFetcher.download('818858');
            console.log('BROWSER fetched successfully');
        }catch (error) {
            console.log(error)
        }
    })();
}else {
    puppeteer = require('puppeteer');
}


async function openBrowser() {
    
    if (!process.env.PORT) {
        var executablePath = puppeteer.executablePath()
    } else {
        var executablePath = puppeteer.executablePath().replace("app.asar", "app.asar.unpacked")
    }
    const browser = await puppeteer.launch({ executablePath: executablePath });

    return browser
}

const hb = require('handlebars')


const readFile = utils.promisify(fs.readFile)

async function getTemplateHtml() {
    console.log("Loading template file in memory")
    try {
        const invoicePath = path.resolve("./invoice.html");
        return await readFile(invoicePath, 'utf8');
    } catch (err) {
        return Promise.reject("Could not load html template");
    }
}


async function generatePdf(request, response) {
    let data = {};
    getTemplateHtml().then(
    async (res) => {
        // Now we have the html code of our template in res object
        // you can check by logging it on console
        // console.log(res)
        console.log("Compiling the template with handlebars")
        const template = hb.compile(res, { strict: true });
        // we have compile our code with handlebars
        const result = template(data);
        // We can use this to add dynamic data to our handlebar template at run time from database or API as per need. you can read the official doc to learn more https://handlebarsjs.com/
        const html = result;
        // configer browser 
        // let browser = await openBrowser();
        let browser;

        console.log('LOADING ... browser');
        if (!process.env.PORT) {
            browser = await puppeteer.launch();
            console.log('With sandbox')
            
        }else {
            browser = await puppeteer.launch({
                executablePath: '/usr/bin/google-chrome-stable',
				args: ['--no-sandbox', "--disabled-setupid-sandbox"],
            })
            console.log('With OUT sandbox')
        }
        const page = await browser.newPage()
        // We set the page content as the generated html by handlebars
        await page.setContent(html)
        // We use pdf function to generate the pdf in the same folder as this file.
        await page.pdf({ path: 'invoice.pdf', format: 'A4' })
        await browser.close();
        console.log("PDF Generated")

        // let document = fs.readFileSync(path.join(__dirname, '/invoice.pdf'), 'utf8').toString();
        let document = fs.createReadStream((path.join(__dirname, '/invoice.pdf')));
        var stat = fs.statSync(path.join(__dirname, '/invoice.pdf'));
		response.setHeader('Content-Length', stat.size);
		response.setHeader('Content-Type', 'application/pdf');
		response.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
        document.pipe(response);
        // return response.send(document).status(200)
    }).catch(err => {
        console.error(err)
        return response.send(err).status(400)
    });
}

app.get('/Create', (req, res) => {

    // res.send('Welcome..')

    generatePdf(req, res)
});
app.use('/', (req, res) => {

    return res.send('Welcome..')

    // generatePdf(req, res)
});
app.listen((process.env.PORT || 3200) /* '10.123.56.203', */, () => console.log(' Server is ready on :' + (process.env.PORT || 3200)));