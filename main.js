const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const fs = require('fs').promises;

// Path to the config file
const CONFIG_FILE = 'config.txt';

// Function to read the existing config file
async function readConfig() {
    try {
        return await fs.readFile(CONFIG_FILE, 'utf8');
    } catch (error) {
        return ''; // If file doesn't exist, return empty string
    }
}

// Function to set config.txt to "true"
async function setConfigTrue() {
    try {
        await fs.writeFile(CONFIG_FILE, 'true\n');
        console.log("✅ Config file updated to: true");
    } catch (error) {
        console.error("❌ Error writing to config file:", error);
    }
}

// Function to set config.txt to "false" (reset file)
async function setConfigFalse() {
    try {
        await fs.writeFile(CONFIG_FILE, 'false\n');
        console.log("❌ Config file reset to: false");
    } catch (error) {
        console.error("❌ Error writing to config file:", error);
    }
}

// Function to append a new line to config.txt
async function appendToConfig(newData) {
    try {
        let existingData = await readConfig();
        let updatedData = existingData.trim() + '\n' + newData;
        await fs.writeFile(CONFIG_FILE, updatedData);
        console.log(`✅ Added to config: ${newData}`);
    } catch (error) {
        console.error("❌ Error updating config file:", error);
    }
}

// Function to handle messages
async function handleMessage(client, message) {
    let msgBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    let num = message.key.remoteJid;
    let adminNumber = "919104270427@s.whatsapp.net";

    if (num !== adminNumber) {
        return;
    }

    console.log(msgBody);
    
    if (msgBody === "true") {
        await setConfigTrue();
        await sendMessage(client, num, "Time btao");
    } 
    else if (msgBody === "false") {
        await setConfigFalse();
    } 
    else if (msgBody.startsWith("startTime=")) {
        await appendToConfig(msgBody);
        await sendMessage(client, num, "End Time btao");
    } 
    else if (msgBody.startsWith("endTime=")) {
        await appendToConfig(msgBody);
        await sendMessage(client, num, "Date btao");
    } 
    else if (msgBody.startsWith("Date=")) {
        await appendToConfig(msgBody);
        await sendMessage(client, num, "Service Class btao");
    } 
    else if (msgBody.startsWith("Service=")) {
        await appendToConfig(msgBody);
        await sendMessage(client, num, "Successful");
    }
    else{
        await setConfigFalse();
        await sendMessage(client,num,"Try again") 
    }
}

// Function to send a WhatsApp message
async function sendMessage(client, jid, message) {
    await client.sendMessage(jid, { text: message });
    console.log(`📩 Message sent to ${jid}`);
}

// Function to connect to WhatsApp
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const client = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Baileys', 'Chrome', '10.0']
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Client is ready!');
        }
    });

    client.ev.on('messages.upsert', async (msg) => {
        const messages = msg.messages;
        for (const message of messages) {
            if (!message.key.fromMe) {
                await handleMessage(client, message);
            }
        }
    });
}

// Start WhatsApp bot
connectToWhatsApp().catch((err) => console.error(`❌ Failed to connect: ${err}`));
