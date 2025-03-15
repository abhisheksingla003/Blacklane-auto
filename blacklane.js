const fs = require('fs');
const puppeteer = require('puppeteer');

// Path to the config file
const CONFIG_FILE = 'config.txt';

// Check if the config file exists
if (!fs.existsSync(CONFIG_FILE)) {
    console.log('Error: config.txt file is missing.');
    process.exit();
}

// Read config file
const configData = fs.readFileSync(CONFIG_FILE, 'utf-8').trim().split("\n");

// Parse config values
const config = {};
configData.forEach(line => {
    let [key, value] = line.split("=");
    if (value) config[key.trim()] = value.trim();
});

// If config.txt contains "false", stop execution
if (config['true'] !== undefined && config['true'].toLowerCase() !== 'true') {
    console.log('Execution disabled.');
    process.exit();
}

// Extract values from config
const startTime = config['startTime'] || '';
const endTime = config['endTime'] || '';
const date = config['Date'] || '';
const serviceClass = config['Service'] || '';

console.log('Execution started...');
console.log(`Looking for offers on ${date} between ${startTime} - ${endTime} for Service Class: ${serviceClass}`);

const COOKIE_FILE = 'blacklane_cookies.json';
const LOGIN_URL = 'https://partner.blacklane.com/login';
const OFFERS_URL = 'https://partner.blacklane.com/offers';
const EMAIL = 'preetujjwal7@gmail.com';
const PASSWORD = '57e194e96972c01d3134';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Load cookies if available
    if (fs.existsSync(COOKIE_FILE)) {
        console.log('Loading cookies...');
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
        await page.setCookie(...cookies);
    }

    // Navigate to login page
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

    // Check if already logged in
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (page.url().includes('offers')) {
        console.log('Logged in using cookies.');
    } else {
        console.log('Logging in with credentials...');
        
        await page.type('#email', EMAIL);
        await page.type('#password', PASSWORD);
        
        await Promise.all([
            page.click("button[type='submit']"),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        console.log('Login successful. Saving cookies...');
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    }

    // Navigate to offers page
    await page.goto(OFFERS_URL, { waitUntil: 'networkidle2' });

    // Check if offers are available
    try {
        await page.waitForSelector('.Table-module__tableRow--3AB2t', { timeout: 5000 });
        const offers = await page.$$('.Table-module__tableRow--3AB2t');
        
        if (offers.length === 0) {
            console.log('No offers available.');
        } else {
            for (const offer of offers) {
                const dateElement = await offer.$('.Date-module__isHighlighted--1ZGgp');
                const dateText = dateElement ? await page.evaluate(el => el.textContent.trim(), dateElement) : 'Unknown';
                
                const serviceClassElement = await offer.$$('.Table-module__tableCell--3jQ2f');
                const serviceText = serviceClassElement.length > 3 ? await page.evaluate(el => el.textContent.trim(), serviceClassElement[3]) : 'Unknown';

                const timeElement = serviceClassElement.length > 2 ? await page.evaluate(el => el.textContent.trim(), serviceClassElement[2]) : 'Unknown';

                console.log(`Offer Found: ${dateText}, Time: ${timeElement}, Service Class: ${serviceText}`);

                // Check if the offer matches the stored config
                if (dateText === date && timeElement >= startTime && timeElement <= endTime && serviceText.toLowerCase() === serviceClass.toLowerCase()) {
                    console.log('✅ Matching Offer Found! Accepting...');
                    const acceptButton = await offer.$("button"); // Adjust selector based on actual button
                    if (acceptButton) {
                        await acceptButton.click();
                        console.log('✅ Offer Accepted Successfully!');
                    } else {
                        console.log('❌ Accept Button Not Found!');
                    }
                    break; // Stop checking once an offer is accepted
                }
            }
        }
    } catch (error) {
        console.log('No offers available.');
    }

    await browser.close();
})();
