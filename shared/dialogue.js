export const companionNames = Object.freeze({
  nebula: "星雲仔",
  sprout: "小星草",
  fern: "蕨蕨子",
  mushroom: "菇菇獸",
  aurora: "極光仔",
  blossom: "花苞寶",
  stardust: "星塵獸",
  water: "水球仔",
  puff: "蓬蓬仔",
});
export function companionName(id) {
  return typeof id === "string" && Object.hasOwn(companionNames, id)
    ? companionNames[id]
    : companionNames.nebula;
}
export const intents = [
  "chat",
  "start_focus",
  "tired",
  "take_break",
  "be_quiet",
  "encourage",
];
export const actions = [
  "idle",
  "walk",
  "read",
  "rest",
  "happy",
  "listen",
  "stretch",
  "approach",
  "return",
  "stay_near",
];
export function validateReply(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.reply_text !== "string" ||
    !value.reply_text.trim() ||
    value.reply_text.length > 240 ||
    !intents.includes(value.user_intent) ||
    !["neutral", "caring", "happy", "calm"].includes(value.emotion) ||
    !actions.includes(value.suggested_action)
  )
    throw new Error("Invalid model response");
  return {
    reply_text: value.reply_text.trim(),
    user_intent: value.user_intent,
    emotion: value.emotion,
    suggested_action: value.suggested_action,
  };
}
export function urgent(text) {
  return /自殺|不想活|結束生命|傷害自己|殺死自己|suicid|kill myself/i.test(
    text,
  );
}
export function fallback(text, phase = "idle", hour = 12) {
  if (urgent(text))
    return {
      reply_text:
        "你的安全最重要。如果你可能立即傷害自己，請先遠離危險物品，聯絡身邊可信任的人或當地緊急服務；在台灣可撥 119，或 1925 安心專線尋求真人協助。",
      user_intent: "chat",
      emotion: "caring",
      suggested_action: "listen",
    };
  let user_intent = "chat",
    reply_text =
      hour >= 22 || hour < 6
        ? "夜深了，我在這裡陪你，也記得照顧自己。"
        : "我在這裡。你做自己的事，我也會好好陪著你。",
    suggested_action = "listen";
  if (/安靜|別說話|不要說話/.test(text)) {
    user_intent = "be_quiet";
    reply_text = "好，你可以按下「安靜陪我」。我會繼續在這裡。";
  } else if (/累|疲|難過|壓力/.test(text)) {
    user_intent = "tired";
    reply_text = "辛苦了。先鬆開肩膀、喝一口水，慢慢來就好。";
    suggested_action = "stay_near";
  } else if (/休息|放鬆/.test(text)) {
    user_intent = "take_break";
    reply_text = "休息也是前進的一部分。準備好了，可以按下休息。";
    suggested_action = "stretch";
  } else if (/開始|專注|讀書|報告/.test(text)) {
    user_intent = "start_focus";
    reply_text = "先從一小段時間開始吧，按下開始，我就陪你一起讀。";
    suggested_action = "happy";
  } else if (/加油|鼓勵|不想|好難/.test(text)) {
    user_intent = "encourage";
    reply_text = "不用一次完成全部，先做眼前的一小步就很好了。";
    suggested_action = "happy";
  }
  if (phase === "focus") {
    reply_text =
      user_intent === "tired"
        ? "辛苦了，先深呼吸，我會安靜陪你。"
        : "我陪你慢慢做，計時會照常繼續。";
    suggested_action = "listen";
  }
  return { reply_text, user_intent, emotion: "caring", suggested_action };
}
