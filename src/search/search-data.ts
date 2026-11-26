const entries = [
  { title: "同頻星球", description: "在星雲仔的星球上散步、讀書，或坐下來休息一下", url: "https://github.com/ChewyChloe/companion-planet", keywords: "星雲仔 主星球 散步 陪伴" },
  { title: "月光書原", description: "在柔和的桌燈下翻幾頁書，留一點時間給自己", url: "https://github.com/ChewyChloe/companion-planet#readme", keywords: "星球 月亮 夜晚 書桌 讀書 閱讀" },
  { title: "玫瑰花園", description: "走進玫瑰拱門，看看今天開了什麼花", url: "https://github.com/ChewyChloe/companion-planet#readme", keywords: "星球 玫瑰 花原 澆花 花開" },
  { title: "微風森林", description: "沿著森林小徑散步，聽瀑布流過岩石", url: "https://github.com/ChewyChloe/companion-planet#readme", keywords: "星球 蕨蕨子 自然 散步 瀑布" },
  { title: "星球鐘", description: "安排一段專注時間，再跟桌寵一起休息", url: "https://github.com/ChewyChloe/companion-planet#readme", keywords: "計時 專注 休息 番茄鐘 讀書 工作" },
];

export type SearchResult = Pick<(typeof entries)[number], "title" | "description" | "url">;

export async function searchPlanets(keyword: string): Promise<SearchResult[]> {
  const words = keyword.normalize("NFKC").trim().toLowerCase().split(/\s+/u);
  if (!words[0]) return [];
  return entries.filter(({ title, description, keywords }) => {
    const text = `${title} ${description} ${keywords}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
