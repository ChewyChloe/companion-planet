import { companions, type CompanionId } from "./companions";
import { Icon } from "./Icon";
function Portrait({
  id,
  color,
  accent,
}: {
  id: CompanionId;
  color: string;
  accent: string;
}) {
  return (
    <svg viewBox="0 0 100 105" aria-hidden="true">
      <path
        d="M27 77C13 65 23 34 30 30Q50 17 70 30C80 42 86 69 74 78L69 87Q62 91 58 82H42Q36 92 29 85Z"
        fill={color}
      />
      <path d="M25 57q-14 12-6 16l12-7M75 57q15 13 6 17l-12-8" fill={color} />
      {id === "nebula" && (
        <path
          d="M39 28Q38 12 30 10M60 28Q61 10 69 8"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
      )}
      {id === "sprout" && (
        <>
          <path
            d="M50 26V7M50 20 38 12M50 20 62 13"
            stroke="#80975e"
            strokeWidth="4"
          />
          <path d="m50 1 4 6 7 1-5 5 1 7-7-4-7 4 1-7-5-5 7-1Z" fill={accent} />
        </>
      )}
      {id === "fern" && (
        <path
          d="M50 29V3M50 10 40 5m10 13-13-7m13 14-15-8m15-7 10-5M50 18l13-7M50 25l15-8"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {id === "mushroom" &&
        [34, 50, 66].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 29V${i === 1 ? 6 : 15}`}
              stroke={accent}
              strokeWidth="4"
            />
            <path
              d={`M${x - 10} ${i === 1 ? 11 : 20}q10 -20 20 0Z`}
              fill={accent}
            />
          </g>
        ))}
      {(id === "aurora" || id === "water") && (
        <>
          <path d="M49 28Q31 4 38 4Q61 4 49 28" fill={accent} />
          {id === "aurora" && (
            <path d="M49 28Q52 1 74 7Q79 19 49 28" fill={accent} />
          )}
        </>
      )}
      {id === "blossom" && (
        <>
          <ellipse cx="50" cy="16" rx="10" ry="17" fill={accent} />
          <ellipse cx="40" cy="19" rx="9" ry="13" fill={accent} />
          <ellipse cx="60" cy="19" rx="9" ry="13" fill={accent} />
        </>
      )}
      {id === "stardust" && (
        <>
          <path
            d="M35 27q-15-9-4-15t0-10M65 27q15-9 4-15t0-10"
            fill="none"
            stroke={accent}
            strokeWidth="6"
          />
          <g fill={accent}>
            <circle cx="36" cy="65" r="1.5" />
            <circle cx="58" cy="73" r="1" />
            <circle cx="65" cy="39" r="1.5" />
          </g>
        </>
      )}
      {id === "puff" && (
        <>
          <path d="M50 28V13" stroke="#b9a383" strokeWidth="3" />
          <circle cx="50" cy="10" r="14" fill={accent} />
        </>
      )}
      <ellipse
        cx="39"
        cy="49"
        rx="3"
        ry="4"
        fill={id === "stardust" ? accent : "#333b45"}
      />
      <ellipse
        cx="61"
        cy="49"
        rx="3"
        ry="4"
        fill={id === "stardust" ? accent : "#333b45"}
      />
      <path
        d="M47 58q3 3 6 0"
        fill="none"
        stroke="#8f6f73"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function CompanionPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: CompanionId;
  onSelect: (id: CompanionId) => void;
  onClose: () => void;
}) {
  return (
    <section
      className="companion-picker floating-panel"
      role="dialog"
      aria-label="選擇陪伴角色"
    >
      <header>
        <div>
          <h2>今天，和誰一起？</h2>
          <p>九位小星球居民</p>
        </div>
        <button
          className="icon-button"
          aria-label="關閉角色選擇"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="companion-grid">
        {companions.map((c) => (
          <button
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => onSelect(c.id)}
          >
            <Portrait {...c} />
            <span>{c.name}</span>
            {selected === c.id && <Icon name="check" />}
          </button>
        ))}
      </div>
      <p className="companion-hint">
        按一下打招呼 · 抓住後拖動，放到小島上的空地
      </p>
    </section>
  );
}
