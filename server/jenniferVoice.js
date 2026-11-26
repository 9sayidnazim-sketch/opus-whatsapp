const spokenReplies = {
  linked: 'ഓക്കെ, ശരി ശരി. നിങ്ങളുടെ ഫുലൂസ് അക്കൗണ്ട് വാട്സാപ്പുമായി ബന്ധിപ്പിച്ചു.',
  already_linked: 'ഈ വാട്സാപ്പ് നമ്പർ നേരത്തേ ബന്ധിപ്പിച്ചിട്ടുണ്ട്.',
  invalid_code: 'ആ കോഡ് ഇപ്പോൾ പറ്റില്ല. ഫുലൂസിൽ നിന്ന് പുതിയൊരു കോഡ് എടുത്ത് അയച്ചോളൂ.',
  unlinked: 'ആദ്യം ഫുലൂസിൽ കയറി വാട്സാപ്പ് നമ്പർ ബന്ധിപ്പിക്കണേ.',
  recorded: 'ഓക്കെ, ശരി ശരി. ആ ചെലവ് ഞാൻ ഫുലൂസിൽ ചേർത്തിട്ടുണ്ട്.',
  invalid_transaction: 'തുകയും എന്തിനാണ് ചെലവായതെന്നും ഒന്നുകൂദി പറഞ്ഞോളൂ.',
};

/**
 * Generate Malayalam voice audio buffer/base64 for WhatsApp audio replies via ElevenLabs
 */
export async function createJenniferVoiceReply(status) {
  const text = spokenReplies[status];
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!text || !voiceId || !apiKey) return null;

  try {
    const speechUrl = new URL(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId)
    );
    speechUrl.searchParams.set('output_format', 'mp3_44100_128');
    const speech = await fetch(speechUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(6000),
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'ml' }),
    });
    if (!speech.ok) return null;

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    return audioBuffer.toString('base64');
  } catch (err) {
    console.warn('Voice reply generation skipped:', err.message);
    return null;
  }
}
