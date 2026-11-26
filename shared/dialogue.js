import { fallbackLines } from "./fallback-lines.js";

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
    ...(["joy", "annoyed", "sad", "surprise", "curious", "sleepy"].includes(value.mood) ? { mood: value.mood } : {}),
  };
}
const selfHarm = /自殺|不想(再)?活|結束(自己的)?生命|傷害自己|殺死自己|想死|輕生|suicid|kill myself/i;
const immediateDanger = /(?:有人|他|她).{0,10}(?:正在|現在|要|拿刀).{0,8}(?:攻擊我|打我|殺我|追我|威脅我)|(?:有人|他|她)在(?:打我|追殺我|攻擊我)|現在被(?:攻擊|追殺)|我現在有危險|(?:吞|吃)了(?:很多|整瓶|過量的)(?:藥|安眠藥)|(?:我)?(?:被困在火場|被掐住脖子|完全不能呼吸|大量出血|現在無法呼吸)|(?:immediate danger|can't breathe)/i;

export function urgent(text) {
  return selfHarm.test(text) || immediateDanger.test(text);
}

function safetyReply(text) {
  return {
    reply_text: selfHarm.test(text)
      ? "你的安全最重要。如果你可能立即傷害自己，請先遠離危險物品，聯絡身邊可信任的人。若你可能會立即採取行動，請聯絡當地緊急服務，在台灣可撥 119。也可以撥 1925 安心專線找真人聊聊。"
      : "請先以安全為重。如果可以安全離開，先移到安全的地方，並立刻聯絡當地緊急服務。在台灣可撥 110 報警或 119 求援。也可以請附近的人幫你打電話。",
    user_intent: "chat",
    emotion: "caring",
    suggested_action: "listen",
    mood: null,
  };
}

const topicPatterns = {
  exam: /考試|期[中末]考|段考|大考|會考|學測|考前|考卷|小考|測驗|準備考/,
  work: /報告|工作|上班|加班|開會|簡報|交件|主管|客戶|截止|deadline/i,
  study: /讀書|念書|唸書|複習|背書|作業|功課|讀完|看完|題目/,
};
const topicOf = (text) => Object.entries(topicPatterns).find(([, pattern]) => pattern.test(text))?.[0] ?? null;
const followUp = /可是|但[是我還]|還沒|還有|還是|來不及|那個|那[題份科頁]|剩[下得]|怎麼辦|讀不完|做不完|交不出來|卡住/;
const priorities = [
  ["quiet", /^(?:安靜(?:陪我)?|別說話|不用回覆)[呀吧好嗎！!。]*$|(?:請|能|想|先|可以).{0,5}(?:安靜(?:一下|陪)|別說話|不要說話)|(?:別說話|不要說話|不用回覆|靜音模式)/],
  ["anxious", /焦慮|緊張|好慌|慌張|擔心|害怕|好怕|壓力|心跳好快|心很亂|坐立難安|來不及|怕來不及|怕[我考會做弄跟]/],
  ["lonely", /孤單|孤獨|寂寞|沒人陪|沒人理|沒人懂|一個人好|只有我一個|沒有人可以聊/],
  ["sad", /難過|傷心|不開心|不高興|想哭|哭了|委屈|失落|低落|沮喪|心情不好|好悶|好難受|失戀/],
  ["tired", /好累|很累|太累|^累[了欸耶！!。]*$|累爆|累死|累到|有點累|我累了|快累垮|疲[倦勞憊]|好睏|好困|想睡|睡不飽|沒力氣|沒電了|沒精神|撐不住/],
  ["break", /^(?:休息|放鬆)[吧呀！!。]*$|(?:想|要|開始|先|可以|幫我).{0,4}(?:休息|放鬆|歇一下)|喘口氣|休息一下/],
  ["start", /^(?:開始|專注)[吧呀！!。]*$|(?:開始|開啟|啟動).{0,6}(?:計時|番茄鐘|專注|讀書|念書)|(?:幫我|我要|我想).{0,4}(?:開始專注|開始念書|開始唸書|開始讀書|開番茄鐘|專注計時)/],
  ["affection", /抱抱|抱一下|摸摸|摸頭|貼貼|撒嬌|你[真好很]*可愛|喜歡你|想你了|愛你|擊掌|謝謝你|親親/],
  ["joy", /開心|高興|超爽|耶[！!]|好棒|太棒|成功了|做到了|過關了|考過了|好消息|得獎|完成了|好幸福|爽啦/],
  ["encourage", /加油|鼓勵|打氣|好難|不想(?:讀|做|上班)|提不起勁|想放棄|沒有動力/],
  ["study", /讀書|念書|唸書|複習|作業|工作|加班|報告|簡報|考試|測驗|交件|題目/],
  ["greeting", /^(?:嗨+|哈囉+|哈嘍+|嘿+|你好+|早安|午安|晚安|在嗎|哈+|hello|hey|hi|哈啰)(?:啊|呀|喔|嗎)?(?:[！!？?。～~\s]|$)/i],
];
const negated = /(?:一點也不|並不|沒有(?:很|在)?|不用|不必|不會|不太|不是|不想|不要|不|沒)(?:再|太|很|那麼|真的|幫我|替我)?(?:焦慮|緊張|慌張|擔心|害怕|難過|傷心|孤單|寂寞|孤獨|疲倦|疲勞|疲憊|覺得累|想哭|想睡|開心|高興|累|睏|困|休息|放鬆|開始(?:讀書|念書|專注|計時)?|專注(?:計時)?|安靜(?:陪我)?)/g;

export function classifyDialogue(text, history = []) {
  const normalized = text.normalize("NFKC").trim();
  const positive = normalized.replace(negated, (part) => /^(?:不|不太)(?:開心|高興)$/.test(part) ? "難過" : "");
  const direct = priorities.find(([, pattern]) => pattern.test(positive))?.[0] ?? "unknown";
  let topic = topicOf(positive);
  let continued = false;
  if ((direct === "unknown" || direct === "study" || direct === "anxious") && followUp.test(positive)) {
    // The current sentence can say “讀完” while the preceding topic is an exam.
    const recent = history.filter(turn => turn.role === "user").slice(-5).reverse();
    if (!topic && /還是|依然|仍然/.test(positive) && !/讀|念|寫|做|交/.test(positive) && direct === "unknown") {
      const prior = recent.map(turn => classifyDialogue(turn.content))
        .find(turn => ["anxious", "exam-worry", "lonely", "sad", "tired"].includes(turn.intent));
      if (prior) return { ...prior, continued: true };
    }
    const previousTopic = recent.map(turn => topicOf(turn.content)).find(Boolean);
    if (previousTopic && (!topic || topic === "study")) {
      topic = previousTopic;
      continued = true;
    }
  }
  const intent = topic === "exam" && direct === "anxious" ? "exam-worry"
    : topic === "exam" && (direct === "study" || direct === "unknown") ? "exam"
    : topic && continued && direct === "unknown" ? "study"
    : direct === "unknown" && topic ? "study"
    : direct;
  return { intent, topic, continued };
}

const controls = { quiet: "be_quiet", break: "take_break", start: "start_focus", tired: "tired", encourage: "encourage" };
const moods = { greeting: "joy", joy: "joy", affection: "joy", sad: "sad", lonely: "sad", anxious: "curious", "exam-worry": "curious", tired: "sleepy", encourage: "joy" };
const voices = {
  nebula: /星星|望遠鏡|天空|島|夜空/,
  fern: /風|嫩葉|肩膀|落腳|走|地毯/,
  sprout: /光|起點|頁|一步/,
  mushroom: /椅|歇|休息|靠|慢/,
  aurora: /天空|色|光|亮|夜/,
  blossom: /手帕|柔|暖|留白|心/,
  stardust: /星|路標|遠方|夜/,
  water: /水|鬆|輕|一口/,
  puff: /雲|靠|眯|軟/,
};
const responseText = (line) => line.kaomoji ? `${line.text} ${line.kaomoji}` : line.text;
const lineByText = new Map(fallbackLines.map(line => [responseText(line), line]));
/** @type {Map<string, typeof fallbackLines>} */
const byIntent = new Map();
for (const line of fallbackLines) {
  if (!byIntent.has(line.intent)) byIntent.set(line.intent, []);
  byIntent.get(line.intent).push(line);
}
// Compare the beginning of the first phrase even if punctuation varies.
const opening = (text) => text.split(/[，、。！？…～?!]/, 1)[0].replace(/\s/g, "").slice(0, 4);

/**
 * @returns {{id?: string, intent?: string, animation?: string, reply_text: string, user_intent: string, emotion: string, suggested_action: string, mood: string | null}}
 * @param {string} text
 * @param {string} [phase]
 * @param {number} [hour]
 * @param {{history?: {role: string, content: string}[], companionId?: string, random?: () => number}} [options]
 */
export function fallback(text, phase = "idle", hour = 12, { history = [], companionId = "nebula", random = Math.random } = {}) {
  if (urgent(text)) return safetyReply(text);

  const { intent } = classifyDialogue(text, history);
  const emotional = ["anxious", "exam-worry", "sad", "lonely", "tired"].includes(intent);
  const category = phase === "focus" && !emotional && !["quiet", "break"].includes(intent) ? "focus"
    : intent === "unknown" && phase === "break" ? "resting"
    : intent === "unknown" && (hour >= 22 || hour < 6) ? "night"
    : intent;
  const recent = history.filter(turn => turn.role === "assistant").slice(-5).map(turn => turn.content);
  const recentLines = recent.map(text => lineByText.get(text));
  const recentGlyphs = new Set(recentLines.map(line => line?.kaomoji).filter(Boolean));
  const recentOpenings = new Set(recent.map(opening));
  const fresh = byIntent.get(category).filter(line => !recent.includes(responseText(line)));
  const short = phase === "focus"
    ? fresh.filter(line => !/[？?]|[。！？].+$/.test(line.text) && line.text.length <= 42)
    : [];
  const unused = short.length ? short : fresh;
  const diversity = (line) => Number(recentOpenings.has(opening(line.text))) + Number(recentGlyphs.has(line.kaomoji));
  const minimum = Math.min(...unused.map(diversity));
  const candidates = unused.filter(line => diversity(line) === minimum);
  const voice = Object.hasOwn(voices, companionId) ? voices[companionId] : voices.nebula;
  const preferred = candidates.filter(line => voice.test(line.text));
  const pool = preferred.length && random() < .48 ? preferred : candidates;
  const line = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
  const animation = actions.includes(line.animation) ? line.animation : "idle";
  return {
    id: line.id,
    intent: line.intent,
    emotion: line.emotion,
    animation,
    reply_text: responseText(line),
    user_intent: phase === "focus" && intent === "start" ? "chat" : controls[intent] ?? "chat",
    suggested_action: phase === "focus" ? "listen" : animation,
    mood: phase === "focus" ? null : moods[intent] ?? null,
  };
}
