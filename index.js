require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ]
});

// 🧠 DATA
let sessions = {};
let data = loadData();

let mainMessageId = null;

// 📦 LOAD
function loadData() {
    if (fs.existsSync("data.json")) {
        try {
            return JSON.parse(fs.readFileSync("data.json", "utf8") || "{}");
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

// 🎮 GTA DETECT
function isGTA(activity) {
    if (!activity) return false;

    const name = (activity.name || "").toLowerCase();

    return (
        name.includes("fivem") ||
        name.includes("gta") ||
        name.includes("roleplay") ||
        name.includes("rp") ||
        name.includes("baylife")
    );
}

// 🧠 TRACK PRESENCE
client.on("presenceUpdate", (oldP, newP) => {

    const userId = newP.member.user.id;
    const userName = newP.member.displayName || newP.member.user.username;

    const oldGame = oldP?.activities?.find(isGTA);
    const newGame = newP?.activities?.find(isGTA);

    // 🟢 START
    if (!oldGame && newGame) {
        sessions[userId] = {
            name: userName,
            start: Date.now()
        };
    }

    // 🔴 STOP
    if (oldGame && !newGame) {

        const session = sessions[userId];
        if (!session) return;

        const duration = Date.now() - session.start;
        const hours = duration / (1000 * 60 * 60);

        if (!data[userId]) {
            data[userId] = {
                name: session.name,
                time: 0
            };
        }

        data[userId].name = session.name;
        data[userId].time += hours;

        saveData();

        delete sessions[userId];

        updateLeaderboard();
    }
});

// 📊 UPDATE GLOBAL MESSAGE
async function updateLeaderboard() {

    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) return;

    let text = "📊 **GTA RP TRACKER**\n\n";

    for (const id in data) {

        const h = Math.floor(data[id].time);
        const m = Math.floor((data[id].time - h) * 60);

        text += `👤 ${data[id].name} → ${h}h ${m}m\n`;
    }

    if (!mainMessageId) {
        const msg = await channel.send(text);
        mainMessageId = msg.id;
    } else {
        const msg = await channel.messages.fetch(mainMessageId).catch(() => null);

        if (msg) {
            await msg.edit(text);
        } else {
            const newMsg = await channel.send(text);
            mainMessageId = newMsg.id;
        }
    }
}

// 🔁 refresh auto (sécurité)
setInterval(updateLeaderboard, 60 * 1000);

// 🤖 READY
client.once("ready", () => {
    console.log(`Bot connecté : ${client.user.tag}`);
    updateLeaderboard();
});

// 🔑 LOGIN
client.login(process.env.TOKEN);