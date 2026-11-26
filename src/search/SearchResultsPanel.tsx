import type { SearchResult } from "./search-data";

export function SearchResultsPanel({ results, failed }: { results: SearchResult[]; failed: boolean }) {
  return (
    <section className="search-planet-results" aria-label="搜尋結果" tabIndex={0}>
      <h2 role="status">{failed ? "搜尋暫時無法使用" : results.length ? `找到 ${results.length} 筆星球指南` : "沒有找到符合的結果"}</h2>
      {failed ? <p>可以再試一次</p> : results.length ? (
        <ul>
          {results.map(({ title, description, url }) => (
            <li key={title}>
              <a href={url} target="_blank" rel="noreferrer">{title}</a>
              <p>{description}</p>
            </li>
          ))}
        </ul>
      ) : <p>試試「森林」、「讀書」或「星球鐘」</p>}
    </section>
  );
}
