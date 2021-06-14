const express = require('express');
const app = express();

// const pdf = require("pdf-creator-node");
const cors = require("cors");

app.use(cors());
app.use(express.json());


const fs = require('fs')
const path = require('path')
const utils = require('util')
const puppeteer = require('puppeteer')
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
        // we are using headless mode
        let browser;
        console.log('browser-path',puppeteer.executablePath());
        // if (!process.env.PORT) {
            browser = await puppeteer.launch();

        // }else {
        //     browser = await puppeteer.launch({
        //         executablePath: puppeteer.executablePath(),
		// 		args: ['--no-sandbox', "--disabled-setupid-sandbox"],
        //     })
        // }
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