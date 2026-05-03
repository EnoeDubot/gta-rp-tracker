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

// 📊 stockage
let sessions = {};
let data = loadData();
let mainMessageId = null;

// 📦 LOAD DATA
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

// 🔄 UPDATE MESSAGE UNIQUE
async function updateMessage(channel) {
    let text = "📊 **Temps GTA RP (semaine)**\n\n";

    const sorted = Object.values(data).sort((a, b) => b.time - a.time);

    for (const user of sorted) {
        const h = Math.floor(user.time);
        const m = Math.floor((user.time - h) * 60);
        text += `👤 ${user.name} → ${h}h ${m}m\n`;
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
client.on("presenceUpdate", async (oldP, newP) => {

    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) return;

    const userId = newP.member.user.id;
    const userName = newP.member.displayName || newP.member.user.username;

    const oldActivity = oldP?.activities?.find(a => a.type === 0);
    const newActivity = newP?.activities?.find(a => a.type === 0);

    // 🟢 START
    if (!oldActivity && newActivity && isGTA(newActivity)) {
        sessions[userId] = {
            start: Date.now(),
            name: userName
        };
    }

    // 🔴 STOP
    if (oldActivity && isGTA(oldActivity) && !newActivity) {

        const session = sessions[userId];
        if (!session) return;

        const duration = Date.now() - session.start;
        const hours = duration / (1000 * 60 * 60);

        if (!data[userId]) {
            data[userId] = {
                name: userName,
                time: 0
            };
        }

        data[userId].time += hours;
        data[userId].name = userName;

        saveData();

        delete sessions[userId];

        await updateMessage(channel);
    }
});

// 🔁 UPDATE AUTO toutes les 5 min
setInterval(async () => {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
        await updateMessage(channel);
    }
}, 5 * 60 * 1000);

// 🤖 READY
client.once("clientReady", () => {
    console.log(`Bot connecté : ${client.user.tag}`);
});

client.login(process.env.TOKEN);
