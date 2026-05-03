require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ]
});

// 📊 DATA
let sessions = {};
let data = loadData();
let mainMessageId = null;

// 📦 LOAD
function loadData() {
    if (fs.existsSync("data.json")) {
        try {
            return JSON.parse(fs.readFileSync("data.json", "utf8"));
        } catch {
            return {};
        }
    }
    return {};
}

// 💾 SAVE
function saveData() {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

// 🎮 DETECT GTA / FIVEM
function isGTA(activity) {
    if (!activity) return false;

    const name = (activity.name || "").toLowerCase();
    const state = (activity.state || "").toLowerCase();
    const details = (activity.details || "").toLowerCase();

    return (
        name.includes("fivem") ||
        name.includes("gta") ||
        name.includes("roleplay") ||
        name.includes("rp") ||
        state.includes("baylife") ||
        details.includes("baylife")
    );
}

// 📊 UPDATE MESSAGE
async function updateMessage(channel) {
    let text = "📊 **Temps GTA RP (semaine)**\n\n";

    const sorted = Object.values(data).sort((a, b) => b.time - a.time);

    for (const user of sorted) {
        const h = Math.floor(user.time || 0);
        const m = Math.floor(((user.time || 0) - h) * 60);
        text += `👤 ${user.name || "Unknown"} → ${h}h ${m}m\n`;
    }

    if (!mainMessageId) {
        const msg = await channel.send(text);
        mainMessageId = msg.id;
    } else {
        try {
            const msg = await channel.messages.fetch(mainMessageId);
            await msg.edit(text);
        } catch {
            const msg = await channel.send(text);
            mainMessageId = msg.id;
        }
    }
}

// 🟢 / 🔴 DETECTION
client.on("presenceUpdate", (oldP, newP) => {

    const user = newP?.member?.user;
    if (!user) return;

    const userId = user.id;
    const userName =
        newP?.member?.displayName ||
        user.username ||
        "Unknown";

    const oldActivity = oldP?.activities?.find(a => a.type === 0);
    const newActivity = newP?.activities?.find(a => a.type === 0);

    // 🟢 START SESSION
    if (!oldActivity && newActivity && isGTA(newActivity)) {
        sessions[userId] = {
            start: Date.now(),
            name: userName
        };
        console.log(userName + " a lancé GTA");
    }

    // 🔴 STOP SESSION (sécurité, mais pas obligatoire)
    if (oldActivity && isGTA(oldActivity) && !newActivity) {
        delete sessions[userId];
        console.log(userName + " a quitté GTA");
    }
});

// 🔁 UPDATE CONTINU (LE PLUS IMPORTANT)
setInterval(async () => {

    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) return;

    const now = Date.now();

    for (const userId in sessions) {
        const session = sessions[userId];

        const duration = now - session.start;
        const hours = duration / (1000 * 60 * 60);

        if (!data[userId]) {
            data[userId] = {
                name: userName || "Unknown",
                time: 0
            };
        }

        data[userId].time += hours;
        data[userId].name = session.name;

        session.start = now; // reset pour éviter double comptage
    }

    saveData();
    await updateMessage(channel);

}, 60 * 1000); // toutes les 1 minute

// 🤖 READY
client.once("clientReady", () => {
    console.log(`Bot connecté : ${client.user.tag}`);
});

client.login(process.env.TOKEN);
