const fs = require("fs");
const path = require("path");
const readline = require("readline");
const textToSpeech = require("@google-cloud/text-to-speech");

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: "google-credentials.json",
});

const wordsFilePath = path.join(__dirname, "words.txt");
const outputDir = path.join(__dirname, "audioFiles");
const csvPath = path.join(__dirname, "audioList.txt");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Helper to sanitize filenames
function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zæøå0-9 ]/gi, "")
    .replace(/\s+/g, "_")
    .trim();
}

// Read lines from input file
async function readLines(filePath) {
  const lines = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  return lines;
}

async function generateAudioFiles() {
  const phrases = await readLines(wordsFilePath);
  const audioRefs = [];

  for (const phrase of phrases) {
    const fileSafeName = sanitizeFilename(phrase);
    const fileName = `${fileSafeName}.mp3`;
    const filePath = path.join(outputDir, fileName);

    const ssml = `<speak>${phrase} <break time="500ms"/></speak>`;

    const request = {
      input: { ssml },
      voice: {
        languageCode: "da-DK",
        name: "da-DK-Wavenet-A", // Higher-quality voice
        ssmlGender: "FEMALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    };

    try {
      const [response] = await client.synthesizeSpeech(request);
      await fs.promises.writeFile(filePath, response.audioContent, "binary");
      console.log(`Generated: ${filePath}`);
      audioRefs.push(`[sound:${fileName}]`);
    } catch (err) {
      console.error(`Error generating audio for "${phrase}":`, err);
    }
  }

  try {
    await fs.promises.writeFile(csvPath, audioRefs.join("\n"), "utf8");
    console.log(`Text list written to: ${csvPath}`);
  } catch (err) {
    console.error("Error writing audio list file:", err);
  }
}

generateAudioFiles();
